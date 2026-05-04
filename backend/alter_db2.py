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
    cursor.execute("ALTER TABLE items ADD COLUMN category VARCHAR(100) DEFAULT 'Other';")
    print("Category column added.")
except Exception as e:
    print(f"Error adding category: {e}")

try:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            item_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY user_item_watchlist (user_id, item_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (item_id) REFERENCES items(id)
        );
    """)
    print("Watchlist table created.")
except Exception as e:
    print(f"Error creating watchlist: {e}")

conn.close()
