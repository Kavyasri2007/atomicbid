import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'jwt_secret_atomic_bid_123')
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'testuser')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '1234')
    MYSQL_DB = os.environ.get('MYSQL_DB', 'atomicbid_db')
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))
