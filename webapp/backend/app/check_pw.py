from app.utils.auth import verify_password, get_password_hash
from app.database import get_db
from sqlalchemy import text
import os

# Hash in schema.sql
schema_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKxcQguNwpjDxXG"
# Test password from environment or default for testing only
password = os.getenv('TEST_ADMIN_PASSWORD', 'admin123')

# Verify schema hash
is_valid_schema = verify_password(password, schema_hash)
print(f"Schema hash matches 'admin123': {is_valid_schema}")

# Connect to DB to get actual stored hash
db = next(get_db())
try:
    result = db.execute(text("SELECT password_hash FROM webapp.users WHERE username='admin'"))
    row = result.fetchone()
    if row:
        stored_hash = row[0]
        is_valid_stored = verify_password(password, stored_hash)
        print(f"Stored hash matches 'admin123': {is_valid_stored}")
        
        if not is_valid_stored:
            print("Updating password...")
            new_hash = get_password_hash(password)
            db.execute(text("UPDATE webapp.users SET password_hash = :hash WHERE username='admin'"), {"hash": new_hash})
            db.commit()
            print("✅ Password updated to correct hash.")
    else:
        print("❌ Admin user not found!")
finally:
    db.close()
