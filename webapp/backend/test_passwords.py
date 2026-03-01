#!/usr/bin/env python3
"""Test password verification"""
import sys
sys.path.insert(0, '/app')

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Test passwords
test_data = [
    ("admin_user", "Admin@2026!", "$2b$12$TRP8B7mUBPMvCK6aMHC3MOCNqVl3HlkVJN5OQoNdI8ZqG8xYGP3hO"),
    ("manager_user", "Manager@2026!", "$2b$12$RzSBx1LthR1JpeHrsYQPfunM3PvQp3pn8fvxPW8TuPxKjVnJ5YYEK"),
    ("viewer_user", "Viewer@2026!", "$2b$12$thuEBA/Gc8qaRZTLhLM8Uu.oKxN5bWqN5xqLn0oJ9W.KvNZxPY8bW"),
]

print("Testing password verification:\n")
for username, password, hash_val in test_data:
    # Get full hash from DB
    from sqlalchemy import create_engine, text
    import os
    
    db_url = f"postgresql://{os.getenv('pgSQL_USERNAME', 'apirak')}:{os.getenv('pgSQL_PASSWORD', 'Kanokwan@1987#neostar')}@{os.getenv('pgSQL_HOST', '10.251.150.222')}:{os.getenv('pgSQL_HOST_PORT', '5210')}/{os.getenv('pgSQL_DBNAME', 'sangfor_scp')}"
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT password_hash FROM webapp.users WHERE username = :username"),
            {"username": username}
        )
        row = result.fetchone()
        if row:
            db_hash = row[0]
            is_valid = pwd_context.verify(password, db_hash)
            print(f"✓ {username:15} | Password: {password:20} | Valid: {is_valid}")
            if not is_valid:
                print(f"  ❌ ERROR: Password verification failed!")
                print(f"  Hash in DB: {db_hash[:50]}...")
        else:
            print(f"✗ {username:15} | User not found in database")
    
print("\nDone!")
