import os
import sys
from sqlalchemy import create_engine, text
from .config import get_settings

def apply_view():
    settings = get_settings()
    print(f"Connecting to database at {settings.DB_HOST}...")
    
    engine = create_engine(settings.DATABASE_URL)
    
    # Path to update_view.sql (in parent directory of app/)
    sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "update_view.sql")
    
    if not os.path.exists(sql_path):
        print(f"Error: {sql_path} not found")
        sys.exit(1)
        
    print(f"📄 Reading {sql_path}...")
    with open(sql_path, "r") as f:
        sql_content = f.read()
        
    print("🚀 Executing view update...")
    with engine.connect() as conn:
        try:
            conn.execute(text(sql_content))
            conn.commit()
            print("✅ View updated successfully!")
        except Exception as e:
            conn.rollback()
            print(f"❌ Error updating view: {e}")
            sys.exit(1)

if __name__ == "__main__":
    apply_view()
