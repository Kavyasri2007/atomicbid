from database import get_db_connection


def column_exists(cursor, table, column):
    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = %s
          AND COLUMN_NAME = %s
    """, (table, column))
    return cursor.fetchone()["count"] > 0


def run():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_columns = [
            ("stripe_customer_id", "VARCHAR(255) DEFAULT NULL"),
            ("stripe_payment_method_id", "VARCHAR(255) DEFAULT NULL"),
            ("payment_verified", "BOOLEAN DEFAULT FALSE"),
            ("payment_verified_at", "DATETIME DEFAULT NULL"),
        ]
        for name, definition in user_columns:
            if not column_exists(cursor, "users", name):
                cursor.execute(f"ALTER TABLE users ADD COLUMN {name} {definition}")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auction_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_id INT UNIQUE NOT NULL,
                winner_id INT NOT NULL,
                seller_id INT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'usd',
                stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
                status ENUM('pending', 'requires_action', 'succeeded', 'failed', 'canceled') DEFAULT 'pending',
                failure_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES items(id),
                FOREIGN KEY (winner_id) REFERENCES users(id),
                FOREIGN KEY (seller_id) REFERENCES users(id)
            )
        """)

        conn.commit()
        print("Payment migration completed.")
    except Exception as exc:
        conn.rollback()
        raise exc
    finally:
        conn.close()


if __name__ == "__main__":
    run()
