#!/usr/bin/env python3
import psycopg2
conn = psycopg2.connect(
    host='10.251.150.222',
    port=5210,
    dbname='sangfor_scp',
    user='apirak',
    password='Kanokwan@1987#neostar'
)
cur = conn.cursor()
cur.execute('ALTER TABLE sangfor.vm_master DROP CONSTRAINT IF EXISTS vm_master_storage_id_fkey;')
cur.execute('ALTER TABLE sangfor.vm_disk_config DROP CONSTRAINT IF EXISTS vm_disk_config_storage_id_fkey;')
conn.commit()
print('Foreign key constraints dropped successfully')
cur.close()
conn.close()
