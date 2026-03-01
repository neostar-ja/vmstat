#!/usr/bin/env python3
"""
Direct Database Query for VM Status
"""
from sqlalchemy import create_engine, text
import os
from urllib.parse import quote_plus

# Database connection from environment variables
DB_HOST = os.getenv('pgSQL_HOST', 'localhost')
DB_PORT = os.getenv('pgSQL_HOST_PORT', '5432')
DB_NAME = os.getenv('pgSQL_DBNAME', 'sangfor_scp')
DB_USER = os.getenv('pgSQL_USERNAME', 'postgres')
DB_PASSWORD = os.getenv('pgSQL_PASSWORD', '')

if not DB_PASSWORD:
    raise ValueError("pgSQL_PASSWORD environment variable is required")

password = quote_plus(DB_PASSWORD)
DB_URL = os.getenv('DATABASE_URL', f'postgresql://{DB_USER}:{password}@{DB_HOST}:{DB_PORT}/{DB_NAME}')

try:
    engine = create_engine(DB_URL)
    
    with engine.connect() as conn:
        # Query specific VM
        result = conn.execute(text('''
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'sangfor' AND table_name = 'vm_alarms'
        '''))
        
        print("="*80)
        print("🗄️  TABLE SCHEMA: sangfor.vm_alarms")
        print("="*80)
        
        for row in result:
            print(f"   {row[0]:<20} {row[1]:<20} {row[2]}")
            
        print("\n" + "="*80)

except Exception as e:
    print(f"❌ Error: {e}")
