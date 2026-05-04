import os
from dotenv import load_dotenv

# Load .env file from the current directory
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'jwt_secret_atomic_bid_123')
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'testuser')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '1234')
    MYSQL_DB = os.environ.get('MYSQL_DB', 'atomicbid_db')
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))
    
    # Sensitive Stripe keys should ONLY be in .env
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
    STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    STRIPE_PAYMENT_CURRENCY = os.environ.get('STRIPE_PAYMENT_CURRENCY', 'inr')
    
    # Sensitive Razorpay keys should ONLY be in .env
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
