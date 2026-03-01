import sys
import os

# Add /app to sys.path
sys.path.append('/app')

from app.utils.auth import create_access_token
from app.database import get_db, SessionLocal
from app.models.user import User
from sqlalchemy import text

db = SessionLocal()
# Find admin user
user = db.execute(text("SELECT * FROM webapp.users WHERE role='admin' LIMIT 1")).fetchone()

if not user:
    # Create temp admin
    print("No admin user found")
    sys.exit(1)

data = {
    "sub": user.username,
    "user_id": user.id,
    "role": user.role,
    "role_level": 100
}

token = create_access_token(data)
print(token)
