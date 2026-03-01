
import os
import sys
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

# Get database credentials from environment variables
host = os.getenv("pgSQL_HOST")
port = os.getenv("pgSQL_HOST_PORT")
user = os.getenv("pgSQL_USERNAME")
password = os.getenv("pgSQL_PASSWORD")
dbname = os.getenv("pgSQL_DBNAME")

if not all([host, port, user, password, dbname]):
    print("Missing pgSQL environment variables. Checking DATABASE_URL...")
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("No database configuration found.")
        sys.exit(1)
else:
    # URL encode the password to handle special characters
    encoded_password = quote_plus(password)
    DATABASE_URL = f"postgresql://{user}:{encoded_password}@{host}:{port}/{dbname}"

# Mask password for logging
safe_url = DATABASE_URL.replace(encoded_password, "***") if 'encoded_password' in locals() else DATABASE_URL
print(f"Connecting to {safe_url}")

def apply_migration():
    engine = create_engine(DATABASE_URL)
    
    sql = """
    -- Datastore display preferences
    CREATE TABLE IF NOT EXISTS webapp.user_datastore_prefs (
        user_id INTEGER REFERENCES webapp.users(id) ON DELETE CASCADE,
        datastore_id VARCHAR(100) NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, datastore_id)
    );

    CREATE INDEX IF NOT EXISTS idx_datastore_prefs_user ON webapp.user_datastore_prefs(user_id);
    
    COMMENT ON TABLE webapp.user_datastore_prefs IS 'User preferences for datastore display order';
    """
    
    try:
        with engine.connect() as conn:
            print("Applying migration...")
            conn.execute(text(sql))
            conn.commit()
            print("Migration applied successfully!")
    except Exception as e:
        print(f"Error applying migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
