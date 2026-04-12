from flask import Blueprint, request, jsonify
from database import get_db_connection
from utils import token_required
import datetime

items_bp = Blueprint('items', __name__)

@items_bp.route('/', methods=['GET'])
def get_items():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.*, u.username as owner_username, hb.username as highest_bidder_username
        FROM items i 
        JOIN users u ON i.user_id = u.id 
        LEFT JOIN users hb ON i.highest_bidder_id = hb.id
        ORDER BY i.end_time ASC
    """)
    items = cursor.fetchall()
    conn.close()
    
    # Convert datetime objects to string for JSON serialization
    for item in items:
        item['start_time'] = item['start_time'].isoformat()
        item['end_time'] = item['end_time'].isoformat()
        item['created_at'] = item['created_at'].isoformat()
        
    return jsonify(items)

@items_bp.route('/<int:item_id>', methods=['GET'])
def get_item(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.*, u.username as owner_username, hb.username as highest_bidder_username
        FROM items i 
        JOIN users u ON i.user_id = u.id 
        LEFT JOIN users hb ON i.highest_bidder_id = hb.id
        WHERE i.id = %s
    """, (item_id,))
    item = cursor.fetchone()
    conn.close()
    
    if not item:
        return jsonify({'message': 'Item not found'}), 404
        
    item['start_time'] = item['start_time'].isoformat()
    item['end_time'] = item['end_time'].isoformat()
    item['created_at'] = item['created_at'].isoformat()
    
    return jsonify(item)

@items_bp.route('/create', methods=['POST'])
@token_required
def create_item(current_user_id):
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    base_price = data.get('base_price')
    duration_hours = int(data.get('duration_hours', 24))
    
    if not title or not base_price:
        return jsonify({'message': 'Missing required fields'}), 400
        
    start_time = datetime.datetime.utcnow()
    end_time = start_time + datetime.timedelta(hours=duration_hours)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO items (user_id, title, description, base_price, current_highest_bid, start_time, end_time, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
        """, (current_user_id, title, description, base_price, base_price, start_time, end_time))
        conn.commit()
        return jsonify({'message': 'Item created successfully', 'item_id': cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Failed to create item', 'error': str(e)}), 500
    finally:
        conn.close()
