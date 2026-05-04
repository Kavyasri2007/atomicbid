from flask import Blueprint, request, jsonify
from database import get_db_connection
from utils import token_required

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route('/', methods=['POST'])
@token_required
def submit_review(current_user_id):
    data = request.get_json()
    auction_id = data.get('auction_id')
    rating = data.get('rating')
    comment = data.get('comment', '')

    if not auction_id or not rating or rating < 1 or rating > 5:
        return jsonify({'message': 'Invalid review data'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM items WHERE id = %s", (auction_id,))
        item = cursor.fetchone()
        
        if not item:
            return jsonify({'message': 'Item not found'}), 404
            
        # check time logic
        import datetime
        now = datetime.datetime.utcnow()
        if now < item['end_time'] and item['status'] != 'ended':
            return jsonify({'message': 'Auction has not ended yet'}), 400
            
        if item['highest_bidder_id'] != current_user_id:
            return jsonify({'message': 'Only the winning bidder can review the seller'}), 403

        cursor.execute("SELECT id FROM reviews WHERE auction_id = %s", (auction_id,))
        if cursor.fetchone():
            return jsonify({'message': 'You have already reviewed this auction'}), 400

        cursor.execute("""
            INSERT INTO reviews (auction_id, reviewer_id, seller_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
        """, (auction_id, current_user_id, item['user_id'], rating, comment))
        conn.commit()
        
        return jsonify({'message': 'Review submitted successfully'}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Server error', 'error': str(e)}), 500
    finally:
        conn.close()

@reviews_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_reviews(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT r.*, u.username as reviewer_username, i.title as item_title
        FROM reviews r
        JOIN users u ON r.reviewer_id = u.id
        JOIN items i ON r.auction_id = i.id
        WHERE r.seller_id = %s
        ORDER BY r.created_at DESC
    """, (user_id,))
    reviews = cursor.fetchall()
    
    cursor.execute("SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE seller_id = %s", (user_id,))
    stats = cursor.fetchone()
    conn.close()
    
    for r in reviews:
        r['created_at'] = r['created_at'].isoformat() + "Z"
        
    avg = float(stats['avg_rating']) if stats['avg_rating'] else 0
    return jsonify({
        'reviews': reviews,
        'average_rating': round(avg, 1),
        'total_reviews': stats['review_count']
    })
