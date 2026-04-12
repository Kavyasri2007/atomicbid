from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.items import items_bp
from routes.bids import bids_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config.from_object('config.Config')

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(items_bp, url_prefix='/api/items')
    app.register_blueprint(bids_bp, url_prefix='/api/bids')

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
    app.run(debug=True, port=5000)