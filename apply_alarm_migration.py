#!/usr/bin/env python3
"""
Apply Alarm System Migration
Creates sangfor.other_alarms table and sangfor.v_unified_alarms view
"""
import os
import sys
from sqlalchemy import create_engine, text
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

def apply_migration():
    try:
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            print("🔌 Connected to database")
            
            # 1. Create sangfor.other_alarms table
            print("🔨 Creating table sangfor.other_alarms...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS sangfor.other_alarms (
                    id SERIAL PRIMARY KEY,
                    source TEXT NOT NULL,
                    resource_id TEXT,
                    resource_name TEXT,
                    severity TEXT,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT 'open',
                    object_type TEXT,
                    begin_time TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    
                    CONSTRAINT unique_other_alarm UNIQUE (source, resource_id, title, begin_time)
                );
            """))
            print("✅ Table sangfor.other_alarms created/verified")
            
            # 2. Create sangfor.v_unified_alarms view
            print("🔨 Creating view sangfor.v_unified_alarms...")
            
            # Drop view if exists to ensure clean update
            conn.execute(text("DROP VIEW IF EXISTS sangfor.v_unified_alarms"))
            
            conn.execute(text("""
                CREATE OR REPLACE VIEW sangfor.v_unified_alarms AS
                SELECT
                    a.alarm_id,
                    a.source,
                    a.severity,
                    a.title,
                    a.description,
                    a.status,
                    a.object_type,
                    a.begin_time,
                    CAST(a.vm_uuid AS TEXT) as resource_id,
                    v.name as resource_name,
                    a.vm_uuid,
					a.created_at
                FROM sangfor.vm_alarms a
                LEFT JOIN sangfor.vm_master v ON a.vm_uuid = v.vm_uuid
                
                UNION ALL
                
                SELECT
                    -o.id as alarm_id, -- Negative ID to avoid collision with vm_alarms
                    o.source,
                    o.severity,
                    o.title,
                    o.description,
                    o.status,
                    o.object_type,
                    o.begin_time,
                    o.resource_id,
                    o.resource_name,
                    NULL::uuid as vm_uuid,
					o.created_at
                FROM sangfor.other_alarms o;
            """))
            print("✅ View sangfor.v_unified_alarms created")
            
            conn.commit()
            print("✨ Migration completed successfully")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
