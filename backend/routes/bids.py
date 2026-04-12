from flask import Blueprint, request, jsonify
from database import get_db_connection
from utils import token_required
import datetime
from decimal import Decimal

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
        bid['created_at'] = bid['created_at'].isoformat()
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
            
        # Optional: Proxy bidding logic updates
        if proxy_max:
            proxy_max_dec = Decimal(str(proxy_max))
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
            # If the proxy is higher than the new bid, they auto-outbid the current user
            if highest_proxy['max_amount'] >= bid_amount + Decimal('1.00'):
                winning_user_id = highest_proxy['user_id']
                winning_amount = min(bid_amount + Decimal('1.00'), highest_proxy['max_amount'])
                
                # We need to record BOTH bids (1. current user's bid, 2. proxy outbid)
                cursor.execute("INSERT INTO bids (item_id, user_id, amount) VALUES (%s, %s, %s)", (item_id, current_user_id, bid_amount))
            elif highest_proxy['max_amount'] > bid_amount:
                # Proxy slightly higher but not enough for full increment, proxy still wins
                winning_user_id = highest_proxy['user_id']
                winning_amount = highest_proxy['max_amount']
                cursor.execute("INSERT INTO bids (item_id, user_id, amount) VALUES (%s, %s, %s)", (item_id, current_user_id, bid_amount))
        
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
        return jsonify({'message': 'Bid placed successfully', 'new_highest_bid': float(winning_amount), 'winner': winning_user_id == current_user_id}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Server error', 'error': str(e)}), 500
    finally:
        conn.close()
