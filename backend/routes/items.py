from flask import Blueprint, request, jsonify
from database import get_db_connection
from utils import token_required
import datetime
from services.payments import close_expired_auctions, format_payment

items_bp = Blueprint('items', __name__)

@items_bp.route('/', methods=['GET'])
def get_items():
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    min_price = request.args.get('min_price', '')
    max_price = request.args.get('max_price', '')
    ending_soon = request.args.get('ending_soon', 'false') == 'true'

    query = """
        SELECT i.*, u.username as owner_username, hb.username as highest_bidder_username
        FROM items i 
        JOIN users u ON i.user_id = u.id 
        LEFT JOIN users hb ON i.highest_bidder_id = hb.id
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND i.title LIKE %s"
        params.append(f"%{search}%")
    if category and category != 'All':
        query += " AND i.category = %s"
        params.append(category)
    if min_price:
        query += " AND i.current_highest_bid >= %s"
        params.append(min_price)
    if max_price:
        query += " AND i.current_highest_bid <= %s"
        params.append(max_price)
    if ending_soon:
        # Items ending within 24 hours
        query += " AND i.end_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR) AND i.status = 'active'"
        
    query += " ORDER BY i.end_time ASC"

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        close_expired_auctions(cursor)
        conn.commit()

        cursor.execute(query, tuple(params))
        items = cursor.fetchall()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    
    for item in items:
        item['start_time'] = item['start_time'].isoformat() + "Z"
        item['end_time'] = item['end_time'].isoformat() + "Z"
        item['created_at'] = item['created_at'].isoformat() + "Z"
        
    return jsonify(items)

@items_bp.route('/<int:item_id>', methods=['GET'])
def get_item(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        close_expired_auctions(cursor)
        conn.commit()

        cursor.execute("""
            SELECT i.*, u.username as owner_username, hb.username as highest_bidder_username
            FROM items i 
            JOIN users u ON i.user_id = u.id 
            LEFT JOIN users hb ON i.highest_bidder_id = hb.id
            WHERE i.id = %s
        """, (item_id,))
        item = cursor.fetchone()

        cursor.execute("SELECT * FROM auction_payments WHERE item_id = %s", (item_id,))
        payment = cursor.fetchone()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    
    if not item:
        return jsonify({'message': 'Item not found'}), 404
        
    item['start_time'] = item['start_time'].isoformat() + "Z"
    item['end_time'] = item['end_time'].isoformat() + "Z"
    item['created_at'] = item['created_at'].isoformat() + "Z"
    item['payment'] = format_payment(payment)
    
    return jsonify(item)

@items_bp.route('/create', methods=['POST'])
@token_required
def create_item(current_user_id):
    import os
    import uuid
    from werkzeug.utils import secure_filename
    from flask import current_app

    if request.content_type.startswith('multipart/form-data'):
        data = request.form
    else:
        data = request.get_json()

    title = data.get('title')
    description = data.get('description')
    base_price = data.get('base_price')
    category = data.get('category', 'Other')
    duration_hours = int(data.get('duration_hours', 24))
    
    if not title or not base_price:
        return jsonify({'message': 'Missing required fields'}), 400

    image_url = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '':
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            image_url = f"/uploads/{unique_filename}"
        
    start_time = datetime.datetime.utcnow()
    end_time = start_time + datetime.timedelta(hours=duration_hours)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO items (user_id, title, description, base_price, current_highest_bid, start_time, end_time, status, image_url, category)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'active', %s, %s)
        """, (current_user_id, title, description, base_price, base_price, start_time, end_time, image_url, category))
        conn.commit()
        return jsonify({'message': 'Item created successfully', 'item_id': cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Failed to create item', 'error': str(e)}), 500
    finally:
        conn.close()

@items_bp.route('/<int:item_id>/watchlist', methods=['POST', 'GET'])
@token_required
def toggle_watchlist(current_user_id, item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    if request.method == 'GET':
        cursor.execute("SELECT * FROM watchlist WHERE user_id = %s AND item_id = %s", (current_user_id, item_id))
        is_watching = cursor.fetchone() is not None
        conn.close()
        return jsonify({'is_watching': is_watching})

    try:
        cursor.execute("SELECT * FROM watchlist WHERE user_id = %s AND item_id = %s", (current_user_id, item_id))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("DELETE FROM watchlist WHERE user_id = %s AND item_id = %s", (current_user_id, item_id))
            message = 'Removed from watchlist'
            is_watching = False
        else:
            cursor.execute("INSERT INTO watchlist (user_id, item_id) VALUES (%s, %s)", (current_user_id, item_id))
            message = 'Added to watchlist'
            is_watching = True
            
        conn.commit()
        return jsonify({'message': message, 'is_watching': is_watching})
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Server error', 'error': str(e)}), 500
    finally:
        conn.close()
