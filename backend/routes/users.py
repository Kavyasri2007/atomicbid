from flask import Blueprint, request, jsonify
from database import get_db_connection
from utils import token_required
from services.payments import close_expired_auctions

users_bp = Blueprint('users', __name__)

@users_bp.route('/dashboard', methods=['GET'])
@token_required
def get_user_dashboard(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        close_expired_auctions(cursor)
        conn.commit()

        # My Auctions
        cursor.execute("""
            SELECT i.*, u.username as owner_username, hb.username as highest_bidder_username
            FROM items i 
            JOIN users u ON i.user_id = u.id 
            LEFT JOIN users hb ON i.highest_bidder_id = hb.id
            WHERE i.user_id = %s
            ORDER BY i.created_at DESC
        """, (current_user_id,))
        my_auctions = cursor.fetchall()
        
        # Items I have bid on (Active)
        cursor.execute("""
            SELECT DISTINCT i.*, u.username as owner_username, hb.username as highest_bidder_username
            FROM items i 
            JOIN bids b ON i.id = b.item_id
            JOIN users u ON i.user_id = u.id 
            LEFT JOIN users hb ON i.highest_bidder_id = hb.id
            WHERE b.user_id = %s AND i.status = 'active' AND i.end_time > NOW()
            ORDER BY i.end_time ASC
        """, (current_user_id,))
        my_active_bids = cursor.fetchall()
        
        # Won Auctions (Ended, highest_bidder_id == current_user_id)
        cursor.execute("""
            SELECT i.*, u.username as owner_username, hb.username as highest_bidder_username
            FROM items i 
            JOIN users u ON i.user_id = u.id 
            LEFT JOIN users hb ON i.highest_bidder_id = hb.id
            WHERE (i.status = 'ended' OR i.end_time <= NOW()) AND i.highest_bidder_id = %s
            ORDER BY i.end_time DESC
        """, (current_user_id,))
        won_auctions = cursor.fetchall()
        
        # Lost Auctions (Ended, bid placed by user, but highest_bidder_id != current_user_id)
        cursor.execute("""
            SELECT DISTINCT i.*, u.username as owner_username, hb.username as highest_bidder_username
            FROM items i 
            JOIN bids b ON i.id = b.item_id
            JOIN users u ON i.user_id = u.id 
            LEFT JOIN users hb ON i.highest_bidder_id = hb.id
            WHERE (i.status = 'ended' OR i.end_time <= NOW()) 
              AND b.user_id = %s 
              AND (i.highest_bidder_id != %s OR i.highest_bidder_id IS NULL)
            ORDER BY i.end_time DESC
        """, (current_user_id, current_user_id))
        lost_auctions = cursor.fetchall()

        # Watchlist
        cursor.execute("""
            SELECT i.*, u.username as owner_username, hb.username as highest_bidder_username
            FROM items i 
            JOIN watchlist w ON i.id = w.item_id
            JOIN users u ON i.user_id = u.id 
            LEFT JOIN users hb ON i.highest_bidder_id = hb.id
            WHERE w.user_id = %s
            ORDER BY w.created_at DESC
        """, (current_user_id,))
        watchlist = cursor.fetchall()

        # Format dates
        def format_items(items_list):
            for item in items_list:
                item['start_time'] = item['start_time'].isoformat() + "Z"
                item['end_time'] = item['end_time'].isoformat() + "Z"
                item['created_at'] = item['created_at'].isoformat() + "Z"
            return items_list

        cursor.execute("""
            SELECT payment_verified, payment_verified_at
            FROM users
            WHERE id = %s
        """, (current_user_id,))
        payment_user = cursor.fetchone()

        return jsonify({
            'my_auctions': format_items(my_auctions),
            'my_bids': format_items(my_active_bids),
            'won_auctions': format_items(won_auctions),
            'lost_auctions': format_items(lost_auctions),
            'watchlist': format_items(watchlist),
            'payment_verified': bool(payment_user and payment_user.get('payment_verified')),
            'payment_verified_at': payment_user['payment_verified_at'].isoformat() + "Z" if payment_user and payment_user.get('payment_verified_at') else None
        })

    except Exception as e:
        return jsonify({'message': 'Server error', 'error': str(e)}), 500
    finally:
        conn.close()
