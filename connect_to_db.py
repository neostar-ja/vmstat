# -*- coding: utf-8 -*-
"""
Sangfor SCP API to Database Integration Script

This script connects to the Sangfor SCP API, fetches VM data, 
and saves it directly to the PostgreSQL database.

Usage:
    python connect_to_db.py          # Fetch all VMs and save to database
    python connect_to_db.py --limit 10  # Fetch and save only 10 VMs
"""

import requests
import urllib3
import json
import os
import sys
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from datetime import datetime
from dotenv import load_dotenv

import psycopg2
from psycopg2.extras import RealDictCursor

# Import the ingester from database module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database.ingest import SangforDataIngester, DatabaseConnection

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables from .env file
load_dotenv()

# === CONFIGURATION ===
SCP_IP = os.getenv('SCP_IP')
# ใช้ SCP_USERNAME / SCP_PASSWORD ให้ตรงกับ .env และไฟล์อื่นในโปรเจค
USERNAME = os.getenv('SCP_USERNAME') or os.getenv('USERNAME')
PASSWORD = os.getenv('SCP_PASSWORD') or os.getenv('PASSWORD')

# Validate required environment variables
if not SCP_IP:
    raise ValueError("SCP_IP environment variable is required")
if not USERNAME:
    raise ValueError("SCP_USERNAME environment variable is required")
if not PASSWORD:
    raise ValueError("SCP_PASSWORD environment variable is required")


def get_public_key():
    """Get public key modulus from server"""
    print("🔑 Getting public key...")
    url = f'https://{SCP_IP}/janus/public-key'
    response = requests.get(url, verify=False, timeout=10)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get public key: HTTP {response.status_code}")
    
    result = response.json()
    if 'data' in result and 'public_key' in result['data']:
        public_key = result['data']['public_key'].replace('\\n', '').strip()
        print("✅ Public key obtained successfully")
        return public_key
    else:
        raise Exception("Public key not found in response")


def encrypt_password(password, modulus):
    """Encrypt password using RSA public key"""
    print("🔒 Encrypting password...")
    password = password.encode('utf-8')
    e = int(0x10001)
    n = bytes_to_long(a2b_hex(modulus))
    rsa_key = RSA.construct((n, e))
    public_key = rsa_key.publickey()
    cipher = PKCS1_v1_5.new(public_key)
    encrypted = cipher.encrypt(password)
    encrypted_hex = b2a_hex(encrypted).decode('utf-8')
    print("✅ Password encrypted successfully")
    return encrypted_hex


def get_token(username, encrypted_password):
    """Get authentication token using encrypted password"""
    print("🔐 Requesting token...")
    url = f"https://{SCP_IP}/janus/authenticate"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {
        "auth": {
            "passwordCredentials": {
                "username": username,
                "password": encrypted_password
            }
        }
    }
    
    response = requests.post(url, json=payload, headers=headers, verify=False, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        
        if result.get("code") == 0 and "data" in result:
            data = result["data"]
            if "access" in data and "token" in data["access"] and "id" in data["access"]["token"]:
                token = data["access"]["token"]["id"]
                print("✅ Token acquired successfully")
                return token
        
        # Try alternative token paths
        token_paths = [
            ["access", "token", "id"],
            ["token", "id"],
            ["access_token"],
            ["token"],
            ["id"]
        ]
        
        for path in token_paths:
            temp_token = result
            for key in path:
                if isinstance(temp_token, dict) and key in temp_token:
                    temp_token = temp_token[key]
                else:
                    temp_token = None
                    break
            
            if temp_token and isinstance(temp_token, str):
                print(f"✅ Token found at path: {' -> '.join(path)}")
                return temp_token
    
    raise Exception(f"Authentication failed: HTTP {response.status_code}")


def get_server_list(token, limit=None):
    """Get list of all servers with pagination support"""
    print("📡 Fetching server list...")
    
    all_servers = []
    page_size = 100
    page_num = 0
    
    endpoints = [
        "/janus/20190725/servers",
        "/janus/20180725/servers"
    ]
    
    for endpoint in endpoints:
        all_servers = []
        page_num = 0
        
        while True:
            url = f"https://{SCP_IP}{endpoint}"
            
            headers = {
                "Authorization": f"Token {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            params = {
                "page_num": page_num,
                "page_size": page_size
            }
            
            try:
                response = requests.get(url, headers=headers, params=params, verify=False, timeout=15)
                
                if response.status_code == 200:
                    try:
                        result = response.json()
                        
                        servers = []
                        total_count = 0
                        
                        if "data" in result:
                            data = result["data"]
                            if "data" in data:
                                servers = data["data"]
                                total_count = data.get("total", len(servers))
                            elif isinstance(data, list):
                                servers = data
                                total_count = len(servers)
                        elif "servers" in result:
                            servers = result["servers"]
                            total_count = result.get("total", len(servers))
                        elif isinstance(result, list):
                            servers = result
                            total_count = len(servers)
                        
                        current_count = len(servers)
                        print(f"📊 Found {current_count} servers on page {page_num}")
                        
                        if servers:
                            all_servers.extend(servers)
                            
                            if current_count < page_size:
                                break
                                
                            if limit and len(all_servers) >= limit:
                                all_servers = all_servers[:limit]
                                break
                                
                            page_num += 1
                            
                            if page_num > 100:
                                print("⚠️ Reached safety limit of 100 pages")
                                break
                        else:
                            break
                            
                    except json.JSONDecodeError as e:
                        print(f"❌ JSON decode error: {e}")
                        break
                        
                elif response.status_code == 400:
                    # Try without pagination
                    response = requests.get(url, headers=headers, verify=False, timeout=15)
                    
                    if response.status_code == 200:
                        result = response.json()
                        
                        servers = []
                        if "data" in result and "data" in result["data"]:
                            servers = result["data"]["data"]
                        elif "data" in result:
                            servers = result["data"]
                        elif isinstance(result, list):
                            servers = result
                        
                        print(f"📊 Found {len(servers)} servers (no pagination)")
                        return servers
                    break
                    
                else:
                    break
                    
            except Exception as e:
                print(f"❌ Error: {e}")
                break
        
        if all_servers:
            print(f"✅ Successfully retrieved {len(all_servers)} servers total")
            return all_servers
    
    raise Exception("Failed to get server list from all endpoints")


def save_to_database(servers):
    """Save servers data to PostgreSQL database using SangforDataIngester"""
    print("\n💾 Saving data to database...")
    
    # Prepare data in the format expected by the ingester
    data = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "total_servers": len(servers),
            "source": f"Sangfor SCP ({SCP_IP})",
            "generated_by": "connect_to_db.py"
        },
        "servers": servers
    }
    
    # Use the ingester to save data
    ingester = SangforDataIngester()
    stats = ingester.ingest_data(data)
    
    print(f"✅ Data saved to database!")
    print(f"   Batch ID: {stats['batch_id']}")
    print(f"   Total VMs: {stats['total_vms']}")
    print(f"   VMs Inserted: {stats['vms_inserted']}")
    print(f"   VMs Updated: {stats['vms_updated']}")
    print(f"   Metrics Inserted: {stats['metrics_inserted']}")
    
    if stats['errors']:
        print(f"   ⚠️ Errors: {len(stats['errors'])}")
        for error in stats['errors'][:3]:
            print(f"      - {error.get('vm_name', 'unknown')}: {error.get('error', 'unknown')}")
    
    return stats


def display_vm_from_database(vm_uuid=None):
    """Display complete data for 1 VM from database"""
    print("\n" + "=" * 60)
    print("📊 แสดงข้อมูล VM จากฐานข้อมูล")
    print("=" * 60)
    
    db = DatabaseConnection()
    
    with db as conn:
        cursor = conn.cursor()
        
        # If no UUID provided, get the first VM
        if vm_uuid is None:
            cursor.execute("SELECT vm_uuid FROM sangfor.vm_master LIMIT 1")
            result = cursor.fetchone()
            if result:
                vm_uuid = result['vm_uuid']
            else:
                print("❌ ไม่พบข้อมูล VM ในฐานข้อมูล")
                return
        
        # 1. Get VM Master data
        print("\n📋 1. ข้อมูล VM Master (sangfor.vm_master):")
        print("-" * 50)
        cursor.execute("""
            SELECT 
                vm_uuid, vm_id, name, vmtype, platform_type,
                az_id, host_id, group_id, storage_id,
                project_id, project_name, user_id, user_name,
                os_type, os_name, os_installed, os_arch, os_kernel, os_distribution,
                cpu_sockets, cpu_cores, cpu_cores_per_socket, cpu_total_mhz,
                memory_total_mb, storage_total_mb,
                has_gpu, vtool_installed, encrypted,
                balloon_memory, onboot, abnormal_recovery, vga_type,
                protection_id, protection_enabled, in_protection,
                backup_policy_enable, backup_file_count,
                template_id, image_id, image_name,
                expire_time, tags, description,
                first_seen_at, last_seen_at, config_updated_at, is_deleted
            FROM sangfor.vm_master WHERE vm_uuid = %s
        """, (str(vm_uuid),))
        
        vm_data = cursor.fetchone()
        if vm_data:
            for key, value in vm_data.items():
                if value is not None and value != '' and value != []:
                    print(f"   {key}: {value}")
        
        # 2. Get latest metrics
        print("\n📈 2. ข้อมูล Metrics ล่าสุด (metrics.vm_metrics):")
        print("-" * 50)
        cursor.execute("""
            SELECT 
                collected_at, batch_id,
                power_state, status, uptime_seconds, is_stopped,
                cpu_total_mhz, cpu_used_mhz, cpu_ratio,
                memory_total_mb, memory_used_mb, memory_ratio,
                storage_total_mb, storage_used_mb, storage_file_size_mb, storage_ratio,
                network_read_bitps, network_write_bitps,
                disk_read_byteps, disk_write_byteps, disk_read_iops, disk_write_iops,
                gpu_count, gpu_mem_total, gpu_mem_used, gpu_mem_ratio, gpu_ratio,
                host_id, host_name
            FROM metrics.vm_metrics 
            WHERE vm_uuid = %s 
            ORDER BY collected_at DESC 
            LIMIT 1
        """, (str(vm_uuid),))
        
        metrics_data = cursor.fetchone()
        if metrics_data:
            for key, value in metrics_data.items():
                if value is not None:
                    print(f"   {key}: {value}")
        else:
            print("   ไม่พบข้อมูล metrics")
        
        # 3. Get disk configuration
        print("\n💿 3. การตั้งค่า Disk (sangfor.vm_disk_config):")
        print("-" * 50)
        cursor.execute("""
            SELECT 
                disk_id, storage_id, storage_name, storage_file,
                size_mb, preallocate, eagerly_scrub, storage_tag_id, physical_disk_type,
                created_at, updated_at, is_active
            FROM sangfor.vm_disk_config 
            WHERE vm_uuid = %s
        """, (str(vm_uuid),))
        
        disks = cursor.fetchall()
        if disks:
            for i, disk in enumerate(disks, 1):
                print(f"   Disk {i}:")
                for key, value in disk.items():
                    if value is not None and value != '':
                        print(f"      {key}: {value}")
        else:
            print("   ไม่พบข้อมูล disk")
        
        # 4. Get network configuration
        print("\n🌐 4. การตั้งค่า Network (sangfor.vm_network_config):")
        print("-" * 50)
        cursor.execute("""
            SELECT 
                vif_id, port_id, network_name, mac_address,
                ip_address, ipv6_address, model, is_connected,
                vpc_id, vpc_name, subnet_id, subnet_name, device_id,
                created_at, updated_at, is_active
            FROM sangfor.vm_network_config 
            WHERE vm_uuid = %s
        """, (str(vm_uuid),))
        
        networks = cursor.fetchall()
        if networks:
            for i, net in enumerate(networks, 1):
                print(f"   Network {i}:")
                for key, value in net.items():
                    if value is not None and value != '':
                        print(f"      {key}: {value}")
        else:
            print("   ไม่พบข้อมูล network")
        
        # 5. Get related master data
        if vm_data:
            # Availability Zone
            if vm_data.get('az_id'):
                print("\n🏢 5. Availability Zone (sangfor.az_master):")
                print("-" * 50)
                cursor.execute("""
                    SELECT az_id, az_name, description, is_active
                    FROM sangfor.az_master WHERE az_id = %s
                """, (str(vm_data['az_id']),))
                az_data = cursor.fetchone()
                if az_data:
                    for key, value in az_data.items():
                        if value is not None:
                            print(f"   {key}: {value}")
            
            # Host
            if vm_data.get('host_id'):
                print("\n🖥️ 6. Host (sangfor.host_master):")
                print("-" * 50)
                cursor.execute("""
                    SELECT host_id, host_name, az_id, host_type, 
                           cpu_total_mhz, memory_total_mb, status, is_active
                    FROM sangfor.host_master WHERE host_id = %s
                """, (vm_data['host_id'],))
                host_data = cursor.fetchone()
                if host_data:
                    for key, value in host_data.items():
                        if value is not None:
                            print(f"   {key}: {value}")
            
            # Group
            if vm_data.get('group_id'):
                print("\n📁 7. VM Group (sangfor.vm_group_master):")
                print("-" * 50)
                cursor.execute("""
                    SELECT group_id, group_name, group_name_path, group_id_path, 
                           parent_group_id, az_id, is_active
                    FROM sangfor.vm_group_master WHERE group_id = %s
                """, (str(vm_data['group_id']),))
                group_data = cursor.fetchone()
                if group_data:
                    for key, value in group_data.items():
                        if value is not None:
                            print(f"   {key}: {value}")
            
            # Protection
            if vm_data.get('protection_id'):
                print("\n🛡️ 8. Protection Policy (sangfor.protection_master):")
                print("-" * 50)
                cursor.execute("""
                    SELECT protection_id, protection_name, protection_type, 
                           protection_enabled, is_active
                    FROM sangfor.protection_master WHERE protection_id = %s
                """, (str(vm_data['protection_id']),))
                protection_data = cursor.fetchone()
                if protection_data:
                    for key, value in protection_data.items():
                        if value is not None:
                            print(f"   {key}: {value}")
        
        print("\n" + "=" * 60)
        print("✅ แสดงข้อมูลครบถ้วนแล้ว")
        print("=" * 60)


def get_database_summary():
    """Get summary of data in database"""
    print("\n📊 สรุปข้อมูลในฐานข้อมูล:")
    print("-" * 50)
    
    db = DatabaseConnection()
    
    with db as conn:
        cursor = conn.cursor()
        
        # Count tables
        tables_to_check = [
            ('sangfor.vm_master', 'VMs'),
            ('sangfor.host_master', 'Hosts'),
            ('sangfor.az_master', 'Availability Zones'),
            ('sangfor.vm_group_master', 'VM Groups'),
            ('sangfor.storage_master', 'Storage'),
            ('sangfor.protection_master', 'Protection Policies'),
            ('sangfor.vm_disk_config', 'Disk Configs'),
            ('sangfor.vm_network_config', 'Network Configs'),
            ('metrics.vm_metrics', 'VM Metrics'),
            ('metrics.vm_alarm_snapshot', 'Alarm Snapshots'),
        ]
        
        for table, label in tables_to_check:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()['count']
                print(f"   {label}: {count}")
            except Exception as e:
                print(f"   {label}: Error - {e}")


def main():
    """Main execution function"""
    print("=" * 60)
    print("🚀 Sangfor SCP API - Database Integration")
    print("=" * 60)
    print(f"Server: {SCP_IP}")
    print(f"Username: {USERNAME}")
    print("=" * 60)
    
    # Parse command line arguments
    limit = None
    if len(sys.argv) > 1:
        if sys.argv[1] == '--limit' and len(sys.argv) > 2:
            limit = int(sys.argv[2])
            print(f"ℹ️ Limiting to {limit} VMs")
    
    try:
        # Step 1: Authentication
        print("\n📡 Step 1: Authentication")
        modulus = get_public_key()
        encrypted = encrypt_password(PASSWORD, modulus)
        token = get_token(USERNAME, encrypted)
        
        print(f"\n✅ Successfully authenticated!")
        
        # Step 2: Fetch servers from API
        print("\n📡 Step 2: Fetching servers from API")
        servers = get_server_list(token, limit=limit)
        
        if servers:
            print(f"\n📊 Server Summary:")
            print(f"   Total servers found: {len(servers)}")
            
            # Show first few servers as preview
            print(f"\n📝 Server Preview (first 3):")
            for i, server in enumerate(servers[:3]):
                name = server.get('name', 'Unknown')
                server_id = server.get('id', 'Unknown')
                status = server.get('status', 'Unknown')
                print(f"   {i+1}. {name} (ID: {server_id[:8]}..., Status: {status})")
            
            if len(servers) > 3:
                print(f"   ... and {len(servers) - 3} more servers")
            
            # Step 3: Save to database
            print("\n💾 Step 3: Saving to database")
            stats = save_to_database(servers)
            
            # Step 4: Get database summary
            print("\n📊 Step 4: Database Summary")
            get_database_summary()
            
            # Step 5: Display data for 1 VM
            print("\n📋 Step 5: Display complete data for 1 VM")
            display_vm_from_database()
            
            print(f"\n✅ Process completed successfully!")
            
        else:
            print("❌ No servers found")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        print(f"📝 Traceback: {traceback.format_exc()}")
        sys.exit(1)


if __name__ == '__main__':
    main()
