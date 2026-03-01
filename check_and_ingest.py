#!/usr/bin/env python3
"""Quick script to check DB and run ingestion"""
import psycopg2
from database.ingest import SangforDataIngester
import os

# Database credentials from environment variables
DB_HOST = os.getenv('pgSQL_HOST', 'localhost')
DB_PORT = int(os.getenv('pgSQL_HOST_PORT', '5432'))
DB_NAME = os.getenv('pgSQL_DBNAME', 'sangfor_scp')
DB_USER = os.getenv('pgSQL_USERNAME', 'postgres')
DB_PASSWORD = os.getenv('pgSQL_PASSWORD', '')

if not DB_PASSWORD:
    raise ValueError("pgSQL_PASSWORD environment variable is required")

# Check current VM count
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)
cur = conn.cursor()

print("=== Before Ingestion ===")
cur.execute("SELECT COUNT(*) FROM sangfor.vm_master")
print(f"VMs in vm_master: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM analytics.v_vm_overview")
print(f"VMs in view: {cur.fetchone()[0]}")

conn.close()

# Run ingestion
print("\n=== Running Ingestion ===")
ingester = SangforDataIngester()
result = ingester.ingest_from_file('sangfor_servers_20251120_144407.json')

print(f"\nTotal VMs in file: {result['total_vms']}")
print(f"VMs inserted: {result['vms_inserted']}")
print(f"VMs updated: {result['vms_updated']}")
print(f"Metrics inserted: {result['metrics_inserted']}")
print(f"Errors: {len(result['errors'])}")

if result['errors']:
    print(f"\nFirst error:")
    err = result['errors'][0]
    print(f"  VM: {err.get('vm_name')}")
    print(f"  Error: {err.get('error')[:200]}")

# Check after
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)
cur = conn.cursor()

print("\n=== After Ingestion ===")
cur.execute("SELECT COUNT(*) FROM sangfor.vm_master")
print(f"VMs in vm_master: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM analytics.v_vm_overview")
print(f"VMs in view: {cur.fetchone()[0]}")

conn.close()
