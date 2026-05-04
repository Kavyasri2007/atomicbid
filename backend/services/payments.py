import datetime
from decimal import Decimal

import stripe
import razorpay
from config import Config

stripe.api_key = Config.STRIPE_SECRET_KEY
razorpay_client = razorpay.Client(auth=(Config.RAZORPAY_KEY_ID, Config.RAZORPAY_KEY_SECRET))


def stripe_enabled():
    return bool(Config.STRIPE_SECRET_KEY)


def razorpay_enabled():
    return bool(Config.RAZORPAY_KEY_ID)


def amount_to_cents(amount):
    return int((Decimal(str(amount)) * 100).quantize(Decimal("1")))


def get_or_create_customer(cursor, user):
    if user.get("stripe_customer_id"):
        return user["stripe_customer_id"]

    if not stripe_enabled():
        raise RuntimeError("Stripe is not configured")

    customer = stripe.Customer.create(
        email=user.get("email"),
        name=user.get("username"),
        metadata={"atomicbid_user_id": user["id"]},
    )
    cursor.execute(
        "UPDATE users SET stripe_customer_id = %s WHERE id = %s",
        (customer.id, user["id"]),
    )
    return customer.id


def create_setup_intent(cursor, user):
    customer_id = get_or_create_customer(cursor, user)
    setup_intent = stripe.SetupIntent.create(
        customer=customer_id,
        usage="off_session",
        payment_method_types=["card"],
        metadata={"atomicbid_user_id": user["id"]},
    )
    return setup_intent


def create_razorpay_order(amount, currency="INR"):
    if not razorpay_enabled():
        raise RuntimeError("Razorpay is not configured")
    
    data = {
        "amount": amount_to_cents(amount),
        "currency": currency,
        "payment_capture": 1 # Auto capture
    }
    order = razorpay_client.order.create(data=data)
    return order


def verify_razorpay_payment(cursor, user_id, payment_data):
    # payment_data contains razorpay_order_id, razorpay_payment_id, razorpay_signature
    if not razorpay_enabled():
        raise RuntimeError("Razorpay is not configured")

    try:
        razorpay_client.utility.verify_payment_signature(payment_data)
    except Exception:
        raise ValueError("Invalid Razorpay signature")

    cursor.execute("""
        UPDATE users
        SET payment_verified = TRUE,
            payment_verified_at = %s,
            stripe_payment_method_id = %s -- Repurposing this field for razorpay_payment_id
        WHERE id = %s
    """, (datetime.datetime.utcnow(), payment_data['razorpay_payment_id'], user_id))
    
    return True


def save_verified_payment_method(cursor, user_id, setup_intent_id):
    if not stripe_enabled():
        raise RuntimeError("Stripe is not configured")

    intent = stripe.SetupIntent.retrieve(setup_intent_id)
    if intent.status != "succeeded":
        raise ValueError(f"SetupIntent status is {intent.status}, expected succeeded")

    payment_method_id = intent.payment_method

    cursor.execute("""
        UPDATE users
        SET payment_verified = TRUE,
            payment_verified_at = %s,
            stripe_payment_method_id = %s
        WHERE id = %s
    """, (datetime.datetime.utcnow(), payment_method_id, user_id))
def create_winner_payment(cursor, item):
    if not item.get("highest_bidder_id"):
        return None

    cursor.execute("""
        SELECT *
        FROM auction_payments
        WHERE item_id = %s
        FOR UPDATE
    """, (item["id"],))
    existing_payment = cursor.fetchone()
    if existing_payment:
        return existing_payment

    cursor.execute("SELECT * FROM users WHERE id = %s FOR UPDATE", (item["highest_bidder_id"],))
    winner = cursor.fetchone()
    if not winner:
        raise ValueError("Winning bidder was not found")

    amount = item["current_highest_bid"]
    currency = Config.STRIPE_PAYMENT_CURRENCY.lower()
    status = "pending"
    payment_intent_id = None
    failure_reason = None

    if not winner.get("payment_verified") or not winner.get("stripe_payment_method_id"):
        status = "failed"
        failure_reason = "Winner does not have a verified payment method"
    elif not stripe_enabled():
        status = "failed"
        failure_reason = "Stripe is not configured"
    else:
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_to_cents(amount),
                currency=currency,
                customer=winner["stripe_customer_id"],
                payment_method=winner["stripe_payment_method_id"],
                off_session=True,
                confirm=True,
                description=f"Atomicbid auction payment for item #{item['id']}",
                metadata={
                    "atomicbid_item_id": item["id"],
                    "atomicbid_winner_id": winner["id"],
                    "atomicbid_seller_id": item["user_id"],
                },
            )
            payment_intent_id = intent.id
            if intent.status == "succeeded":
                status = "succeeded"
            elif intent.status in ("requires_action", "requires_payment_method"):
                status = "requires_action"
                failure_reason = "Winner must authenticate or update payment method"
            else:
                status = intent.status if intent.status in ("pending", "canceled") else "pending"
        except stripe.error.CardError as exc:
            status = "requires_action" if exc.code == "authentication_required" else "failed"
            payment_intent = getattr(exc, "payment_intent", None)
            payment_intent_id = getattr(payment_intent, "id", None)
            failure_reason = exc.user_message or str(exc)
        except stripe.error.StripeError as exc:
            status = "failed"
            failure_reason = str(exc)

    cursor.execute("""
        INSERT INTO auction_payments
            (item_id, winner_id, seller_id, amount, currency, stripe_payment_intent_id, status, failure_reason)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        item["id"],
        item["highest_bidder_id"],
        item["user_id"],
        amount,
        currency,
        payment_intent_id,
        status,
        failure_reason,
    ))

    cursor.execute("""
        SELECT *
        FROM auction_payments
        WHERE id = LAST_INSERT_ID()
    """)
    return cursor.fetchone()


def close_expired_auctions(cursor):
    now = datetime.datetime.utcnow()
    cursor.execute("""
        SELECT *
        FROM items
        WHERE status = 'active' AND end_time <= %s
        FOR UPDATE
    """, (now,))
    expired_items = cursor.fetchall()

    closed = []
    for item in expired_items:
        cursor.execute("UPDATE items SET status = 'ended' WHERE id = %s", (item["id"],))

        if item.get("highest_bidder_id"):
            cursor.execute("""
                INSERT INTO winners (item_id, user_id, winning_bid_amount)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    user_id = VALUES(user_id),
                    winning_bid_amount = VALUES(winning_bid_amount)
            """, (item["id"], item["highest_bidder_id"], item["current_highest_bid"]))
            payment = create_winner_payment(cursor, item)
        else:
            payment = None

        closed.append({"item": item, "payment": payment})

    return closed


def format_payment(payment):
    if not payment:
        return None

    return {
        "id": payment["id"],
        "item_id": payment["item_id"],
        "winner_id": payment["winner_id"],
        "seller_id": payment["seller_id"],
        "amount": float(payment["amount"]),
        "currency": payment["currency"],
        "status": payment["status"],
        "failure_reason": payment.get("failure_reason"),
        "stripe_payment_intent_id": payment.get("stripe_payment_intent_id"),
    }
