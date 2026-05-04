import pymysql
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
try:
    cursor.execute("ALTER TABLE items ADD COLUMN image_url VARCHAR(255) DEFAULT NULL;")
    print("Column added successfully.")
except Exception as e:
    print(f"Error: {e}")
