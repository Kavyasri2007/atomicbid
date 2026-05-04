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
    cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;")
    print("Added is_admin")
except Exception as e: print(e)

try:
    cursor.execute("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;")
    print("Added is_banned")
except Exception as e: print(e)

try:
    # Promote the first user (usually the one creating the app) to admin for testing
    cursor.execute("UPDATE users SET is_admin = TRUE ORDER BY id ASC LIMIT 1;")
    print("Promoted first user to admin")
except Exception as e: print(e)

try:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            auction_id INT NOT NULL,
            reviewer_id INT NOT NULL,
            seller_id INT NOT NULL,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY auction_review (auction_id),
            FOREIGN KEY (auction_id) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    print("Created reviews table")
except Exception as e: print(e)

conn.close()
