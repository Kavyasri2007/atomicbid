import pymysql
from pymysql.cursors import DictCursor
from config import Config

def get_db_connection(database=Config.MYSQL_DB):
    return pymysql.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=database,
        port=Config.MYSQL_PORT,
        cursorclass=DictCursor,
        autocommit=False  # Required for manual transaction handling
    )

def init_db():
    # Connect without specifying database to create it if it doesn't exist
    conn = pymysql.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        port=Config.MYSQL_PORT,
        autocommit=True
    )
    cursor = conn.cursor()
    
    with open('../schema.sql', 'r') as f:
        schema = f.read()

    # PyMySQL executes multiple statements if properly parsed
    # We will just execute CREATE DATABASE and then use it
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.MYSQL_DB}")
    cursor.execute(f"USE {Config.MYSQL_DB}")
    
    # Simple manual split by semicolon for multiple statements
    statements = schema.split(';')
    for statement in statements:
        if statement.strip():
            cursor.execute(statement)

    try:
        with open('../seed.sql', 'r') as f:
            seed = f.read()
        seed_statements = seed.split(';')
        for stmt in seed_statements:
            if stmt.strip():
                cursor.execute(stmt)
        print("Database seeded.")
    except Exception as e:
        print(f"Error seeding db: {e}")

    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
