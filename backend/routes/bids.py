from flask import Blueprint, request, jsonify
from database import get_db_connection
from utils import token_required
import datetime
from decimal import Decimal
from services.payments import close_expired_auctions

bids_bp = Blueprint('bids', __name__)

@bids_bp.route('/<int:item_id>', methods=['GET'])
def get_bids(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT b.*, u.username 
        FROM bids b 
        JOIN users u ON b.user_id = u.id 
        WHERE b.item_id = %s 
        ORDER BY b.amount DESC, b.created_at DESC
    """, (item_id,))
    bids = cursor.fetchall()
    conn.close()
    
    for bid in bids:
        bid['created_at'] = bid['created_at'].isoformat() + 'Z'
        bid['amount'] = float(bid['amount'])
        
    return jsonify(bids)

@bids_bp.route('/place', methods=['POST'])
@token_required
def place_bid(current_user_id):
    data = request.get_json()
    item_id = data.get('item_id')
    bid_amount = Decimal(str(data.get('amount')))
    proxy_max = data.get('proxy_max')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        close_expired_auctions(cursor)

        cursor.execute("SELECT payment_verified, stripe_payment_method_id, is_banned FROM users WHERE id = %s FOR UPDATE", (current_user_id,))
        bidder = cursor.fetchone()
        if not bidder or bidder.get('is_banned'):
            conn.rollback()
            return jsonify({'message': 'Your account cannot place bids'}), 403

        if not bidder.get('payment_verified') or not bidder.get('stripe_payment_method_id'):
            conn.rollback()
            return jsonify({
                'message': 'Verify a payment card before bidding. Winners are charged automatically when the auction ends.',
                'requires_payment_verification': True
            }), 402

        # Start transaction and lock the item row (Concurrency Control)
        cursor.execute("SELECT * FROM items WHERE id = %s FOR UPDATE", (item_id,))
        item = cursor.fetchone()
        
        if not item:
            conn.rollback()
            return jsonify({'message': 'Item not found'}), 404
            
        if item['status'] != 'active':
            conn.rollback()
            return jsonify({'message': 'Auction is already ended'}), 400
            
        now = datetime.datetime.utcnow()
        if now >= item['end_time']:
            cursor.execute("UPDATE items SET status = 'ended' WHERE id = %s", (item_id,))
            conn.commit()
            return jsonify({'message': 'Auction is already ended'}), 400
            
        if item['user_id'] == current_user_id:
            conn.rollback()
            return jsonify({'message': 'You cannot bid on your own item'}), 400
            
        if bid_amount <= item['current_highest_bid'] and item['highest_bidder_id'] is not None:
            conn.rollback()
            return jsonify({'message': 'Bid amount must be greater than current highest bid'}), 400
            
        if bid_amount < item['base_price']:
            conn.rollback()
            return jsonify({'message': 'Bid amount must be at least the base price'}), 400
            
        if proxy_max is not None and str(proxy_max).strip() != "":
            proxy_max_dec = Decimal(str(proxy_max))
            if proxy_max_dec <= bid_amount:
                conn.rollback()
                return jsonify({'message': 'Maximum proxy bid must be greater than your bid amount'}), 400
            
        # Optional: Proxy bidding logic updates
        if proxy_max is not None and str(proxy_max).strip() != "":
            cursor.execute("""
                INSERT INTO proxy_bids (item_id, user_id, max_amount) 
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE max_amount = %s
            """, (item_id, current_user_id, proxy_max_dec, proxy_max_dec))
            
        # Determine actual new bid amount
        winning_user_id = current_user_id
        winning_amount = bid_amount
        
        # Check against existing proxy bids from OTHER users
        cursor.execute("""
            SELECT user_id, max_amount FROM proxy_bids 
            WHERE item_id = %s AND user_id != %s 
            ORDER BY max_amount DESC LIMIT 1
        """, (item_id, current_user_id))
        highest_proxy = cursor.fetchone()
        
        if highest_proxy:
            other_proxy_max = highest_proxy['max_amount']
            other_user_id = highest_proxy['user_id']
            
            # The highest the current user is willing to go
            current_max = proxy_max_dec if (proxy_max and Decimal(str(proxy_max)) > bid_amount) else bid_amount
            
            if other_proxy_max >= current_max:
                # The other user's proxy beats or ties our max bid
                winning_user_id = other_user_id
                winning_amount = min(current_max + Decimal('1.00'), other_proxy_max)
                
                # Record the current user's highest attempt
                cursor.execute("INSERT INTO bids (item_id, user_id, amount) VALUES (%s, %s, %s)", (item_id, current_user_id, current_max))
            else:
                # The current user's max outbids the other user's proxy
                winning_user_id = current_user_id
                
                # We need to minimally beat their proxy max by 1, but we can't go lower than our initial bid amount
                desired_win = other_proxy_max + Decimal('1.00')
                winning_amount = max(bid_amount, desired_win)
                winning_amount = min(winning_amount, current_max)
                
                # Record the other user's proxy max that was defeated
                cursor.execute("INSERT INTO bids (item_id, user_id, amount) VALUES (%s, %s, %s)", (item_id, other_user_id, other_proxy_max))
        
        # Insert the winning bid
        cursor.execute("INSERT INTO bids (item_id, user_id, amount) VALUES (%s, %s, %s)", (item_id, winning_user_id, winning_amount))
        
        # Anti-Sniping logic
        time_left = (item['end_time'] - now).total_seconds()
        new_end_time = item['end_time']
        if time_left < 60:
            new_end_time = new_end_time + datetime.timedelta(seconds=60)
            
        # Update item
        cursor.execute("""
            UPDATE items 
            SET current_highest_bid = %s, highest_bidder_id = %s, end_time = %s 
            WHERE id = %s
        """, (winning_amount, winning_user_id, new_end_time, item_id))
        
        conn.commit()

        # Emit real-time events
        from extensions import socketio
        cursor.execute("SELECT username FROM users WHERE id = %s", (winning_user_id,))
        res = cursor.fetchone()
        winning_username = res['username'] if res else "Unknown"

        socketio.emit('bid_update', {
            'item_id': item_id,
            'new_amount': float(winning_amount),
            'highest_bidder_username': winning_username,
            'end_time': new_end_time.isoformat() + "Z",
            'message': f"{winning_username} just placed a bid!"
        })

        outbid_user_id = item['highest_bidder_id']
        if outbid_user_id and outbid_user_id != winning_user_id:
            socketio.emit('notification', {
                'type': 'outbid',
                'user_id': outbid_user_id,
                'item_id': item_id,
                'item_title': item['title'],
                'message': f"You were outbid on '{item['title']}'!"
            })

        # Notify the current user if they lost instantly to an existing proxy bid
        if current_user_id != winning_user_id:
            socketio.emit('notification', {
                'type': 'outbid',
                'user_id': current_user_id,
                'item_id': item_id,
                'item_title': item['title'],
                'message': f"Your bid on '{item['title']}' was instantly outbid by an auto-bidder!"
            })

        # Watchlist notifications
        cursor.execute("SELECT user_id FROM watchlist WHERE item_id = %s", (item_id,))
        watchers = cursor.fetchall()
        for w in watchers:
            if w['user_id'] != current_user_id and w['user_id'] != outbid_user_id:
                socketio.emit('notification', {
                    'type': 'watchlist_update',
                    'user_id': w['user_id'],
                    'item_id': item_id,
                    'item_title': item['title'],
                    'message': f"Price increased to ${winning_amount} for watched item '{item['title']}'!"
                })

        return jsonify({'message': 'Bid placed successfully', 'new_highest_bid': float(winning_amount), 'winner': winning_user_id == current_user_id}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Server error', 'error': str(e)}), 500
    finally:
        conn.close()
