import sys
import os

# Add the parent directory to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import get_db
from sqlalchemy import text

db = next(get_db())

print("--- Checking Datastore Status ---")
result = db.execute(text("SELECT status, count(*) FROM sangfor.datastore_master GROUP BY status"))
for row in result:
    print(f"Status: {row[0]}, Count: {row[1]}")

print("\n--- Checking Specific Datastore ---")
ds_id = '004e097f_vs_vol_rep3'
result = db.execute(text("SELECT datastore_id, name, status FROM sangfor.datastore_master WHERE datastore_id = :id"), {"id": ds_id})
row = result.fetchone()
if row:
    print(f"ID: {row[0]}, Name: {row[1]}, Status: {row[2]}")
else:
    print("Datastore not found")

print("\n--- Checking Metrics Count ---")
result = db.execute(text("SELECT count(*) FROM metrics.datastore_metrics WHERE datastore_id = :id"), {"id": ds_id})
count = result.fetchone()[0]
print(f"Metrics count: {count}")
