from flask import Blueprint, request, jsonify
from database import get_db_connection
from utils import token_required
from functools import wraps

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(current_user_id, *args, **kwargs):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT is_admin FROM users WHERE id = %s", (current_user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user or not user['is_admin']:
            return jsonify({'message': 'Admin access required'}), 403
            
        return f(current_user_id, *args, **kwargs)
    return decorated

@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as total FROM users")
    users_count = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as total FROM items")
    items_count = cursor.fetchone()['total']
    
    cursor.execute("SELECT COUNT(*) as total FROM bids")
    bids_count = cursor.fetchone()['total']
    
    cursor.execute("SELECT SUM(current_highest_bid) as total FROM items WHERE status = 'ended' AND highest_bidder_id IS NOT NULL")
    res = cursor.fetchone()
    revenue = res['total'] if res and res['total'] else 0
    
    conn.close()
    return jsonify({
        'total_users': users_count,
        'total_items': items_count,
        'total_bids': bids_count,
        'total_revenue': float(revenue)
    })

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, is_admin, is_banned, created_at FROM users ORDER BY created_at DESC")
    users = cursor.fetchall()
    conn.close()
    
    for u in users:
        u['created_at'] = u['created_at'].isoformat() + "Z"
    return jsonify(users)

@admin_bp.route('/users/<int:user_id>/ban', methods=['POST'])
@admin_required
def toggle_ban(current_user_id, user_id):
    if user_id == current_user_id:
        return jsonify({'message': 'Cannot ban yourself'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_banned FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        return jsonify({'message': 'User not found'}), 404
        
    new_status = not user['is_banned']
    cursor.execute("UPDATE users SET is_banned = %s WHERE id = %s", (new_status, user_id))
    conn.commit()
    conn.close()
    
    return jsonify({'message': f"User {'banned' if new_status else 'unbanned'} successfully", 'is_banned': new_status})

@admin_bp.route('/items', methods=['GET'])
@admin_required
def get_all_items(current_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.*, u.username as owner_username 
        FROM items i JOIN users u ON i.user_id = u.id 
        ORDER BY i.created_at DESC
    """)
    items = cursor.fetchall()
    conn.close()
    for item in items:
        item['start_time'] = item['start_time'].isoformat() + "Z"
        item['end_time'] = item['end_time'].isoformat() + "Z"
        item['created_at'] = item['created_at'].isoformat() + "Z"
    return jsonify(items)

@admin_bp.route('/items/<int:item_id>', methods=['DELETE'])
@admin_required
def delete_item(current_user_id, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM reviews WHERE auction_id = %s", (item_id,))
        cursor.execute("DELETE FROM watchlist WHERE item_id = %s", (item_id,))
        cursor.execute("DELETE FROM bids WHERE item_id = %s", (item_id,))
        cursor.execute("DELETE FROM proxy_bids WHERE item_id = %s", (item_id,))
        cursor.execute("DELETE FROM items WHERE id = %s", (item_id,))
        conn.commit()
        return jsonify({'message': 'Item and all associated data deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Error deleting item', 'error': str(e)}), 500
    finally:
        conn.close()
