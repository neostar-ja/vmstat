import os
import glob
from sqlalchemy import create_engine, text
from .config import get_settings

def init_db():
    settings = get_settings()
    print(f"Connecting to database at {settings.DB_HOST}...")
    
    engine = create_engine(settings.DATABASE_URL)
    
    # Collect all SQL files to execute
    sql_files = []
    
    # 1. Main schema.sql (webapp schema)
    schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "schema.sql")
    if os.path.exists(schema_path):
        sql_files.append(("schema.sql", schema_path))
    
    # 2. All SQL files in app/sql/ directory (sorted by filename)
    sql_dir = os.path.join(os.path.dirname(__file__), "sql")
    if os.path.isdir(sql_dir):
        for sql_file in sorted(glob.glob(os.path.join(sql_dir, "*.sql"))):
            sql_files.append((os.path.basename(sql_file), sql_file))
    
    print(f"Found {len(sql_files)} SQL files to execute")
    
    with engine.connect() as conn:
        for filename, filepath in sql_files:
            print(f"📄 Executing {filename}...")
            try:
                with open(filepath, "r") as f:
                    sql_content = f.read()
                conn.execute(text(sql_content))
                conn.commit()
                print(f"   ✅ {filename} completed")
            except Exception as e:
                print(f"   ⚠️ {filename} error: {e}")
                # Continue with other files instead of failing completely
                conn.rollback()
    
    print("✅ Database initialization completed!")

if __name__ == "__main__":
    init_db()

