#!/usr/bin/env python3
"""
VM Deletion Status Checker
Check if a VM has been deleted from Sangfor SCP source
"""
import sys
import os
from sqlalchemy import create_engine, text
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Database connection
DB_HOST = os.getenv('DB_HOST', '10.251.150.222')
DB_PORT = os.getenv('DB_PORT', '5210')
DB_USER = os.getenv('DB_USER', 'apirak')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME', 'sangfor_scp')

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)

def check_vm_status(vm_uuid: str):
    """Check VM status in database"""
    with engine.connect() as conn:
        # Get VM details
        result = conn.execute(text("""
            SELECT 
                vm_uuid,
                vm_id,
                name,
                is_deleted,
                deleted_at,
                last_seen_at,
                first_seen_at,
                host_name,
                group_name,
                az_name,
                os_display_name,
                cpu_cores,
                memory_total_mb,
                storage_total_mb
            FROM sangfor.vm_master 
            WHERE vm_uuid = CAST(:uuid AS uuid)
        """), {"uuid": vm_uuid})
        
        vm = result.fetchone()
        
        if not vm:
            print(f"❌ VM with UUID {vm_uuid} not found in database")
            return
        
        print("\n" + "="*80)
        print("🔍 VM DELETION STATUS CHECK")
        print("="*80)
        print(f"\n📌 VM Information:")
        print(f"   UUID:        {vm.vm_uuid}")
        print(f"   Name:        {vm.name}")
        print(f"   VM ID:       {vm.vm_id}")
        print(f"   Host:        {vm.host_name}")
        print(f"   Group:       {vm.group_name}")
        print(f"   AZ:          {vm.az_name}")
        print(f"   OS:          {vm.os_display_name}")
        print(f"   Resources:   {vm.cpu_cores} vCPU, {vm.memory_total_mb/1024:.1f} GB RAM, {vm.storage_total_mb/1024:.1f} GB Storage")
        
        print(f"\n⏱️  Timeline:")
        print(f"   First Seen:  {vm.first_seen_at}")
        print(f"   Last Seen:   {vm.last_seen_at}")
        
        # Calculate time since last seen
        if vm.last_seen_at:
            time_diff = datetime.now() - vm.last_seen_at.replace(tzinfo=None)
            hours = time_diff.total_seconds() / 3600
            print(f"   Time Since:  {hours:.1f} hours ago")
        
        print(f"\n🗑️  Deletion Status:")
        if vm.is_deleted:
            print(f"   ⚠️  STATUS: DELETED FROM SOURCE")
            print(f"   Deleted At:  {vm.deleted_at}")
            if vm.deleted_at:
                del_time_diff = datetime.now() - vm.deleted_at.replace(tzinfo=None)
                del_hours = del_time_diff.total_seconds() / 3600
                print(f"   Time Since:  {del_hours:.1f} hours ago ({del_time_diff.days} days)")
        else:
            print(f"   ✅ STATUS: ACTIVE IN DATABASE")
            print(f"   This VM is currently tracked and appears in sync")
        
        # Check recent metrics
        metrics_result = conn.execute(text("""
            SELECT collected_at, power_state, cpu_ratio, memory_ratio
            FROM metrics.vm_metrics
            WHERE vm_uuid = CAST(:uuid AS uuid)
            ORDER BY collected_at DESC
            LIMIT 1
        """), {"uuid": vm_uuid})
        
        metric = metrics_result.fetchone()
        if metric:
            print(f"\n📊 Last Metric Collection:")
            print(f"   Collected:   {metric.collected_at}")
            print(f"   Power State: {metric.power_state}")
            print(f"   CPU Usage:   {metric.cpu_ratio*100:.1f}%")
            print(f"   Memory:      {metric.memory_ratio*100:.1f}%")
        else:
            print(f"\n⚠️  No metrics found for this VM")
        
        # Check recent sync jobs
        sync_result = conn.execute(text("""
            SELECT 
                job_id,
                source,
                status,
                started_at,
                finished_at,
                total_vms_fetched,
                vms_inserted,
                vms_updated
            FROM sync.jobs
            WHERE status = 'success'
            ORDER BY finished_at DESC
            LIMIT 3
        """))
        
        print(f"\n🔄 Recent Sync Jobs:")
        for job in sync_result:
            duration = (job.finished_at - job.started_at).total_seconds()
            print(f"   • {job.started_at} [{job.source}]: {job.total_vms_fetched} VMs ({duration:.1f}s)")
        
        print("\n" + "="*80)
        
        # Recommendations
        print("\n💡 Recommendations:")
        if vm.is_deleted:
            print("""
   ⚠️  This VM has been marked as DELETED from Sangfor SCP source.
   
   Actions you can take:
   
   1. 🔍 VERIFY DELETION:
      - Check Sangfor SCP console manually
      - Verify VM is really deleted (not just powered off)
   
   2. ♻️  RESTORE (if mistakenly marked):
      - Go to Admin Settings → Recycle Bin tab
      - Click Restore button for this VM
      - Note: Will be re-deleted in next sync if not in SCP
   
   3. 🗑️  PERMANENT DELETE:
      - Go to Admin Settings → Recycle Bin tab
      - Click Delete Permanently to remove from database
      - ⚠️  This cannot be undone!
   
   4. 📝 CHECK LOGS:
      - Review sync job details for deletion timestamp
      - Check if VM was visible in previous syncs
            """)
        else:
            print("""
   ✅ This VM is currently ACTIVE in the system.
   
   The deletion detection system works as follows:
   
   1. 🔄 AUTO SYNC (every 5 minutes):
      - Fetches all VMs from Sangfor SCP API
      - Compares with database records
      - Marks VMs as deleted if not found in API response
   
   2. 🏷️  VISUAL INDICATORS:
      - Deleted VMs show red "DELETED" badge in VM list
      - Visible in both card and table views
   
   3. ♻️  RECYCLE BIN:
      - Access via Admin Settings → Recycle Bin
      - Review, restore, or permanently delete
            """)
        
        print("="*80 + "\n")

if __name__ == "__main__":
    vm_uuid = "cb1745e7-1044-45d5-b6ee-51c0cbc5f455"  # WUH-Build_Deploy
    
    if len(sys.argv) > 1:
        vm_uuid = sys.argv[1]
    
    try:
        check_vm_status(vm_uuid)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
