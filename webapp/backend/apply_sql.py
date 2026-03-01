import sys
import os
from sqlalchemy import text

# Add parent directory to path to import app modules
sys.path.append('/opt/code/sangfor_scp/webapp/backend')

from app.database import SessionLocal

def apply_sql(file_path):
    print(f"Reading SQL from {file_path}")
    with open(file_path, 'r') as f:
        sql = f.read()
    
    db = SessionLocal()
    try:
        print("Executing SQL...")
        db.execute(text(sql))
        db.commit()
        print("SQL applied successfully.")
    except Exception as e:
        print(f"Error applying SQL: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    apply_sql('/opt/code/sangfor_scp/webapp/backend/update_view.sql')
