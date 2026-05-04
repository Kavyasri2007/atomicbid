import stripe
from flask import Blueprint, jsonify, request

from config import Config
from database import get_db_connection
from services.payments import (
    create_setup_intent,
    create_razorpay_order,
    format_payment,
    save_verified_payment_method,
    stripe_enabled,
    razorpay_enabled,
    verify_razorpay_payment
)
from utils import token_required


payments_bp = Blueprint("payments", __name__)


@payments_bp.route("/config", methods=["GET"])
def payment_config():
    return jsonify({
        "publishable_key": Config.STRIPE_PUBLISHABLE_KEY,
        "razorpay_key_id": Config.RAZORPAY_KEY_ID,
        "stripe_enabled": stripe_enabled() and bool(Config.STRIPE_PUBLISHABLE_KEY),
        "razorpay_enabled": razorpay_enabled()
    })


@payments_bp.route("/status", methods=["GET"])
@token_required
def payment_status(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT payment_verified, payment_verified_at, stripe_payment_method_id
            FROM users
            WHERE id = %s
        """, (current_user_id,))
        user = cursor.fetchone()
        return jsonify({
            "payment_verified": bool(user and user.get("payment_verified")),
            "payment_verified_at": user["payment_verified_at"].isoformat() + "Z" if user and user.get("payment_verified_at") else None,
            "has_payment_method": bool(user and user.get("stripe_payment_method_id")),
        })
    finally:
        conn.close()


@payments_bp.route("/setup-intent", methods=["POST"])
@token_required
def setup_intent(current_user_id):
    # This route now handles both Stripe SetupIntent and Razorpay Order for verification
    if razorpay_enabled():
        try:
            # Verification amount: ₹1 (100 paise)
            order = create_razorpay_order(1, currency="INR")
            return jsonify({
                "provider": "razorpay",
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"]
            }), 201
        except Exception as exc:
            return jsonify({"message": "Failed to create Razorpay order", "error": str(exc)}), 500

    if not stripe_enabled() or not Config.STRIPE_PUBLISHABLE_KEY:
        return jsonify({"message": "Payments are not configured"}), 503

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE id = %s FOR UPDATE", (current_user_id,))
        user = cursor.fetchone()
        if not user:
            conn.rollback()
            return jsonify({"message": "User not found"}), 404

        intent = create_setup_intent(cursor, user)
        conn.commit()
        return jsonify({"provider": "stripe", "client_secret": intent.client_secret}), 201
    except Exception as exc:
        conn.rollback()
        return jsonify({"message": "Failed to start card verification", "error": str(exc)}), 500
    finally:
        conn.close()


@payments_bp.route("/confirm-setup", methods=["POST"])
@token_required
def confirm_setup(current_user_id):
    data = request.get_json() or {}
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if "razorpay_payment_id" in data:
            # Handle Razorpay confirmation
            verify_razorpay_payment(cursor, current_user_id, data)
            conn.commit()
            return jsonify({"message": "Payment verified via Razorpay", "payment_verified": True})
        
        setup_intent_id = data.get("setup_intent_id")
        if not setup_intent_id:
            return jsonify({"message": "Missing verification ID"}), 400

        save_verified_payment_method(cursor, current_user_id, setup_intent_id)
        conn.commit()
        return jsonify({"message": "Payment method verified", "payment_verified": True})
    except Exception as exc:
        conn.rollback()
        return jsonify({"message": "Verification failed", "error": str(exc)}), 400
    finally:
        conn.close()


@payments_bp.route("/auction/<int:item_id>", methods=["GET"])
@token_required
def auction_payment(current_user_id, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT *
            FROM auction_payments
            WHERE item_id = %s
        """, (item_id,))
        payment = cursor.fetchone()
        if not payment:
            return jsonify({"payment": None})

        if current_user_id not in (payment["winner_id"], payment["seller_id"]):
            cursor.execute("SELECT is_admin FROM users WHERE id = %s", (current_user_id,))
            user = cursor.fetchone()
            if not user or not user.get("is_admin"):
                return jsonify({"message": "Forbidden"}), 403

        return jsonify({"payment": format_payment(payment)})
    finally:
        conn.close()


@payments_bp.route("/webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    signature = request.headers.get("Stripe-Signature")

    try:
        if Config.STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, signature, Config.STRIPE_WEBHOOK_SECRET)
        else:
            event = request.get_json()
    except Exception as exc:
        return jsonify({"message": "Invalid webhook", "error": str(exc)}), 400

    event_type = event.get("type")
    obj = event.get("data", {}).get("object", {})

    if event_type in ("payment_intent.succeeded", "payment_intent.payment_failed", "payment_intent.canceled", "payment_intent.requires_action"):
        status_map = {
            "payment_intent.succeeded": "succeeded",
            "payment_intent.payment_failed": "failed",
            "payment_intent.canceled": "canceled",
            "payment_intent.requires_action": "requires_action",
        }
        payment_intent_id = obj.get("id")
        failure_reason = None
        if obj.get("last_payment_error"):
            failure_reason = obj["last_payment_error"].get("message")

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                UPDATE auction_payments
                SET status = %s, failure_reason = %s
                WHERE stripe_payment_intent_id = %s
            """, (status_map[event_type], failure_reason, payment_intent_id))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    return jsonify({"received": True})
