import sys
import os
import asyncio
from datetime import datetime, timedelta

# Add the parent directory to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import text
from app.database import get_db
from app.routers.sync import get_datastore_metrics

async def test_metrics():
    db = next(get_db())
    try:
        # Check view definition
        print("--- View Definition ---")
        view_def = db.execute(text("SELECT pg_get_viewdef('analytics.v_vm_overview', true)")).scalar()
        print(view_def)
        print("-----------------------")

        query = "SELECT name, storage_total_mb, storage_usage, storage_used_mb FROM analytics.v_vm_overview WHERE name = 'WUH-Epson'"
        result = db.execute(text(query))
        rows = result.fetchall()
        
        print(f"Found {len(rows)} VMs.")
        for row in rows:
            print(f"VM: {row.name}")
            print(f"  Total: {row.storage_total_mb}")
            print(f"  Usage %: {row.storage_usage}")
            print(f"  Used MB: {row.storage_used_mb}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(test_metrics())
