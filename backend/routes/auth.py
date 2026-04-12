from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from config import Config
from database import get_db_connection

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        if not username or not password: return jsonify({'message': 'Missing data'}), 400
        hashed_password = generate_password_hash(password)
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, hashed_password))
            conn.commit()
            return jsonify({'message': 'User created successfully'}), 201
        except Exception as e:
            if conn:
                try: conn.rollback()
                except: pass
            import traceback, sys
            print(traceback.format_exc(), file=sys.stderr)
            return jsonify({'message': 'Registration failed', 'error': str(e)}), 400
        finally:
            if conn:
                try: conn.close()
                except: pass
    except Exception as e:
        import traceback, sys
        print(traceback.format_exc(), file=sys.stderr)
        return {"message": str(e), "traceback": traceback.format_exc()}, 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'message': 'Invalid credentials'}), 401
        
    token = jwt.encode({
        'user_id': user['id'],
        'username': user['username'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, Config.SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username']
        }
    })
