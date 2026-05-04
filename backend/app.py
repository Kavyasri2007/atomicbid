from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.items import items_bp
from routes.bids import bids_bp

def create_app():
    app = Flask(__name__)
    CORS(app)
    from extensions import socketio
    socketio.init_app(app)

    app.config.from_object('config.Config')

    import os
    from flask import send_from_directory

    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

    # Register blueprints
    from routes.users import users_bp
    from routes.admin import admin_bp
    from routes.reviews import reviews_bp
    from routes.payments import payments_bp
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(items_bp, url_prefix='/api/items')
    app.register_blueprint(bids_bp, url_prefix='/api/bids')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')

    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Home route
    @app.route('/')
    def index():
        return {"message": "Welcome to Atomicbid API"}

    # Error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        return {
            "message": "Server Error: " + str(e),
            "traceback": traceback.format_exc()
        }, 500

    return app


if __name__ == '__main__':
    app = create_app()
    from extensions import socketio
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
