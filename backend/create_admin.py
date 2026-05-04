import pymysql
from werkzeug.security import generate_password_hash
from config import Config

conn = pymysql.connect(
    host=Config.MYSQL_HOST,
    user=Config.MYSQL_USER,
    password=Config.MYSQL_PASSWORD,
    database=Config.MYSQL_DB,
    port=Config.MYSQL_PORT,
    autocommit=True
)
cursor = conn.cursor()

username = "admin"
password = "admin@123"
hashed = generate_password_hash(password)

try:
    cursor.execute("INSERT INTO users (username, password_hash, email, phone, is_admin) VALUES (%s, %s, %s, %s, %s)",
                   (username, hashed, "admin@atomicbid.local", "0000000000", True))
    print("Admin created successfully.")
except Exception as e:
    print("Error:", e)

conn.close()
