#!/usr/bin/env python3
"""
Compare VM data between Database and Sangfor API

This script:
1. Fetches VM data from PostgreSQL database
2. Fetches VM data from Sangfor API (real-time)
3. Displays 3 tables: Database data, API data, and Comparison
"""

import os
import sys
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
import urllib3
from tabulate import tabulate
from dotenv import load_dotenv

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load .env
load_dotenv()


class SangforAPIClient:
    """Client for Sangfor API"""
    
    def __init__(self, scp_ip, username, password):
        self.scp_ip = scp_ip
        self.username = username
        self.password = password
    
    def get_public_key(self):
        """Get public key from Sangfor"""
        url = f'https://{self.scp_ip}/janus/public-key'
        response = requests.get(url, verify=False, timeout=10)
        result = response.json()
        return result['data']['public_key'].replace('\\n', '').strip()
    
    def encrypt_password(self, password, modulus):
        """Encrypt password using RSA"""
        password_bytes = password.encode('utf-8')
        e = int(0x10001)
        n = bytes_to_long(a2b_hex(modulus))
        rsa_key = RSA.construct((n, e))
        cipher = PKCS1_v1_5.new(rsa_key.publickey())
        encrypted = cipher.encrypt(password_bytes)
        return b2a_hex(encrypted).decode('utf-8')
    
    def get_token(self):
        """Get authentication token"""
        modulus = self.get_public_key()
        encrypted_pwd = self.encrypt_password(self.password, modulus)
        
        url = f"https://{self.scp_ip}/janus/authenticate"
        payload = {
            "auth": {
                "passwordCredentials": {
                    "username": self.username,
                    "password": encrypted_pwd
                }
            }
        }
        
        response = requests.post(url, json=payload, verify=False, timeout=30)
        result = response.json()
        
        if result.get("code") == 0 and "data" in result:
            return result["data"]["access"]["token"]["id"]
        raise Exception("Failed to get token")
    
    def get_vm_detail(self, vm_uuid):
        """Get VM detail from Sangfor API"""
        token = self.get_token()
        
        endpoints = [
            f"/janus/20190725/servers/{vm_uuid}",
            f"/janus/20180725/servers/{vm_uuid}"
        ]
        
        headers = {
            "X-Auth-Token": token,
            "Accept": "application/json"
        }
        
        for endpoint in endpoints:
            try:
                url = f"https://{self.scp_ip}{endpoint}"
                response = requests.get(url, headers=headers, verify=False, timeout=15)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("code") == 0 and "data" in result:
                        return result["data"]
            except Exception:
                continue
        
        raise Exception("Failed to get VM data from API")


def get_vm_from_database(vm_uuid):
    """Fetch VM data from database"""
    conn = psycopg2.connect(
        host=os.getenv('pgSQL_HOST'),
        port=os.getenv('pgSQL_HOST_PORT'),
        database=os.getenv('pgSQL_DBNAME'),
        user=os.getenv('pgSQL_USERNAME'),
        password=os.getenv('pgSQL_PASSWORD')
    )
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get VM master data
            cur.execute("""
                SELECT 
                    v.vm_uuid::text,
                    v.name,
                    v.os_type,
                    v.cpu_cores,
                    v.memory_total_mb,
                    v.storage_total_mb,
                    v.host_id,
                    h.host_name,
                    v.group_id::text,
                    g.group_name,
                    v.az_id::text,
                    a.az_name,
                    v.config_updated_at as updated_at
                FROM sangfor.vm_master v
                LEFT JOIN sangfor.host_master h ON v.host_id = h.host_id
                LEFT JOIN sangfor.vm_group_master g ON v.group_id = g.group_id
                LEFT JOIN sangfor.az_master a ON v.az_id = a.az_id
                WHERE v.vm_uuid = %s::uuid
            """, (vm_uuid,))
            
            vm_master = cur.fetchone()
            
            if not vm_master:
                return None
            
            # Get latest metrics
            cur.execute("""
                SELECT 
                    collected_at,
                    power_state,
                    status,
                    cpu_total_mhz,
                    cpu_used_mhz,
                    cpu_ratio,
                    memory_total_mb,
                    memory_used_mb,
                    memory_ratio,
                    storage_total_mb,
                    storage_used_mb,
                    storage_ratio,
                    network_read_bitps,
                    network_write_bitps,
                    disk_read_iops,
                    disk_write_iops,
                    host_name
                FROM metrics.vm_metrics
                WHERE vm_uuid = %s::uuid
                ORDER BY collected_at DESC
                LIMIT 1
            """, (vm_uuid,))
            
            metrics = cur.fetchone()
            
            return {
                'master': dict(vm_master) if vm_master else {},
                'metrics': dict(metrics) if metrics else {}
            }
    finally:
        conn.close()


def parse_api_data(api_data):
    """Parse API response data"""
    metrics = api_data.get('metrics', {})
    
    return {
        'uuid': api_data.get('uuid'),
        'name': api_data.get('name'),
        'power_state': api_data.get('powerState'),
        'status': api_data.get('status'),
        'os_type': api_data.get('osType'),
        'cpu_cores': api_data.get('cpuSpec', {}).get('cpuCores'),
        'memory_mb': metrics.get('memoryTotalMB'),
        'storage_mb': metrics.get('storageTotalMB'),
        'host_id': api_data.get('hostId'),
        'host_name': api_data.get('hostName'),
        'group_id': api_data.get('groupId'),
        'group_name': api_data.get('groupName'),
        'metrics': {
            'cpu_total_mhz': metrics.get('cpuTotalMHZ'),
            'cpu_used_mhz': metrics.get('cpuUsedMHZ'),
            'cpu_ratio': metrics.get('cpuUsedMHZ', 0) / max(metrics.get('cpuTotalMHZ', 1), 1),
            'memory_total_mb': metrics.get('memoryTotalMB'),
            'memory_used_mb': metrics.get('memoryUsedMB'),
            'memory_ratio': metrics.get('memoryUsedMB', 0) / max(metrics.get('memoryTotalMB', 1), 1),
            'storage_total_mb': metrics.get('storageTotalMB'),
            'storage_used_mb': metrics.get('storageUsedMB'),
            'storage_ratio': metrics.get('storageUsedMB', 0) / max(metrics.get('storageTotalMB', 1), 1),
            'network_read_bitps': metrics.get('networkReadBitps'),
            'network_write_bitps': metrics.get('networkWriteBitps'),
        }
    }


def format_bytes(bytes_val, unit='MB'):
    """Format bytes to human readable"""
    if bytes_val is None:
        return '-'
    if unit == 'MB' and bytes_val >= 1024:
        return f"{bytes_val / 1024:.2f} GB"
    return f"{bytes_val:.0f} {unit}"


def format_percent(ratio):
    """Format ratio to percentage"""
    if ratio is None:
        return '-'
    return f"{ratio * 100:.2f}%"


def compare_data(db_data, api_data):
    """Compare database and API data"""
    comparisons = []
    
    # Basic info comparison
    comparisons.append(['VM UUID', 
                       db_data['master'].get('vm_uuid', '-'),
                       api_data.get('uuid', '-'),
                       '✅' if db_data['master'].get('vm_uuid') == api_data.get('uuid') else '❌'])
    
    comparisons.append(['Name', 
                       db_data['master'].get('name', '-'),
                       api_data.get('name', '-'),
                       '✅' if db_data['master'].get('name') == api_data.get('name') else '❌'])
    
    comparisons.append(['Power State', 
                       db_data['metrics'].get('power_state', '-'),
                       api_data.get('power_state', '-'),
                       '✅' if db_data['metrics'].get('power_state') == api_data.get('power_state') else '❌'])
    
    comparisons.append(['Status', 
                       db_data['metrics'].get('status', '-'),
                       api_data.get('status', '-'),
                       '✅' if db_data['metrics'].get('status') == api_data.get('status') else '❌'])
    
    comparisons.append(['Host Name', 
                       db_data['master'].get('host_name', '-'),
                       api_data.get('host_name', '-'),
                       '✅' if db_data['master'].get('host_name') == api_data.get('host_name') else '❌'])
    
    # Metrics comparison
    db_metrics = db_data['metrics']
    api_metrics = api_data.get('metrics', {})
    
    db_cpu_pct = format_percent(db_metrics.get('cpu_ratio'))
    api_cpu_pct = format_percent(api_metrics.get('cpu_ratio'))
    comparisons.append(['CPU Usage', db_cpu_pct, api_cpu_pct, 
                       '⚠️' if abs((db_metrics.get('cpu_ratio', 0) - api_metrics.get('cpu_ratio', 0)) * 100) > 5 else '✅'])
    
    db_mem_pct = format_percent(db_metrics.get('memory_ratio'))
    api_mem_pct = format_percent(api_metrics.get('memory_ratio'))
    comparisons.append(['Memory Usage', db_mem_pct, api_mem_pct,
                       '⚠️' if abs((db_metrics.get('memory_ratio', 0) - api_metrics.get('memory_ratio', 0)) * 100) > 5 else '✅'])
    
    db_stor_pct = format_percent(db_metrics.get('storage_ratio'))
    api_stor_pct = format_percent(api_metrics.get('storage_ratio'))
    comparisons.append(['Storage Usage', db_stor_pct, api_stor_pct,
                       '⚠️' if abs((db_metrics.get('storage_ratio', 0) - api_metrics.get('storage_ratio', 0)) * 100) > 5 else '✅'])
    
    # Timestamps
    db_time = db_metrics.get('collected_at')
    if db_time:
        # Remove timezone for comparison
        if hasattr(db_time, 'tzinfo') and db_time.tzinfo:
            db_time_naive = db_time.replace(tzinfo=None)
        else:
            db_time_naive = db_time
        db_time_str = db_time_naive.strftime('%Y-%m-%d %H:%M:%S') if isinstance(db_time_naive, datetime) else str(db_time)
        time_diff = (datetime.now() - db_time_naive).total_seconds()
    else:
        db_time_str = '-'
        time_diff = None
    
    comparisons.append(['Last Updated (DB)', db_time_str, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 
                       f"Δ {time_diff:.0f}s" if time_diff else '-'])
    
    return comparisons


def main():
    if len(sys.argv) < 2:
        print("Usage: python compare_vm_data.py <vm_uuid>")
        print("\nExample:")
        print("  python compare_vm_data.py 1bd54fc0-a991-43fc-99f1-1510c39ee835")
        sys.exit(1)
    
    vm_uuid = sys.argv[1]
    
    print(f"\n{'='*80}")
    print(f"VM Data Comparison: {vm_uuid}")
    print(f"{'='*80}\n")
    
    # 1. Get data from database
    print("📊 Fetching data from Database...")
    db_data = get_vm_from_database(vm_uuid)
    
    if not db_data or not db_data['master']:
        print("❌ VM not found in database!")
        sys.exit(1)
    
    # 2. Get data from API
    print("🌐 Fetching data from Sangfor API...")
    try:
        api_client = SangforAPIClient(
            os.getenv('SCP_IP'),
            os.getenv('SCP_USERNAME'),
            os.getenv('SCP_PASSWORD')
        )
        
        api_raw = api_client.get_vm_detail(vm_uuid)
        api_data = parse_api_data(api_raw)
        api_source = "Sangfor API (Real-time)"
    except Exception as e:
        print(f"⚠️  API Error: {e}")
        print("📊 Using latest metrics from database as fallback...")
        # Use latest metrics from database
        api_data = {
            'uuid': db_data['master'].get('vm_uuid'),
            'name': db_data['master'].get('name'),
            'power_state': db_data['metrics'].get('power_state'),
            'status': db_data['metrics'].get('status'),
            'os_type': db_data['master'].get('os_type'),
            'cpu_cores': db_data['master'].get('cpu_cores'),
            'memory_mb': db_data['metrics'].get('memory_total_mb'),
            'storage_mb': db_data['metrics'].get('storage_total_mb'),
            'host_id': db_data['master'].get('host_id'),
            'host_name': db_data['metrics'].get('host_name'),
            'group_id': db_data['master'].get('group_id'),
            'group_name': db_data['master'].get('group_name'),
            'metrics': {
                'cpu_total_mhz': db_data['metrics'].get('cpu_total_mhz'),
                'cpu_used_mhz': db_data['metrics'].get('cpu_used_mhz'),
                'cpu_ratio': db_data['metrics'].get('cpu_ratio'),
                'memory_total_mb': db_data['metrics'].get('memory_total_mb'),
                'memory_used_mb': db_data['metrics'].get('memory_used_mb'),
                'memory_ratio': db_data['metrics'].get('memory_ratio'),
                'storage_total_mb': db_data['metrics'].get('storage_total_mb'),
                'storage_used_mb': db_data['metrics'].get('storage_used_mb'),
                'storage_ratio': db_data['metrics'].get('storage_ratio'),
                'network_read_bitps': db_data['metrics'].get('network_read_bitps'),
                'network_write_bitps': db_data['metrics'].get('network_write_bitps'),
            }
        }
        api_source = "Database (Latest Metrics)"
    
    # Table 1: Database Data
    print(f"\n{'='*80}")
    print("TABLE 1: DATABASE DATA")
    print(f"{'='*80}\n")
    
    db_table = [
        ['Field', 'Value'],
        ['---', '---'],
        ['VM UUID', db_data['master'].get('vm_uuid', '-')],
        ['Name', db_data['master'].get('name', '-')],
        ['Power State', db_data['metrics'].get('power_state', '-')],
        ['Status', db_data['metrics'].get('status', '-')],
        ['OS Type', db_data['master'].get('os_type', '-')],
        ['CPU Cores', db_data['master'].get('cpu_cores', '-')],
        ['Memory', format_bytes(db_data['master'].get('memory_total_mb'))],
        ['Storage', format_bytes(db_data['master'].get('storage_total_mb'))],
        ['Host', db_data['master'].get('host_name', '-')],
        ['Group', db_data['master'].get('group_name', '-')],
        ['---', '---'],
        ['CPU Usage', format_percent(db_data['metrics'].get('cpu_ratio'))],
        ['Memory Usage', format_percent(db_data['metrics'].get('memory_ratio'))],
        ['Storage Usage', format_percent(db_data['metrics'].get('storage_ratio'))],
        ['Network Read', f"{db_data['metrics'].get('network_read_bitps', 0) / 1_000_000:.2f} Mbps"],
        ['Network Write', f"{db_data['metrics'].get('network_write_bitps', 0) / 1_000_000:.2f} Mbps"],
        ['Last Collected', db_data['metrics'].get('collected_at', '-')],
    ]
    
    print(tabulate(db_table, headers='firstrow', tablefmt='grid'))
    
    # Table 2: API Data
    print(f"\n{'='*80}")
    print(f"TABLE 2: {api_source}")
    print(f"{'='*80}\n")
    
    api_table = [
        ['Field', 'Value'],
        ['---', '---'],
        ['VM UUID', api_data.get('uuid', '-')],
        ['Name', api_data.get('name', '-')],
        ['Power State', api_data.get('power_state', '-')],
        ['Status', api_data.get('status', '-')],
        ['OS Type', api_data.get('os_type', '-')],
        ['CPU Cores', api_data.get('cpu_cores', '-')],
        ['Memory', format_bytes(api_data.get('memory_mb'))],
        ['Storage', format_bytes(api_data.get('storage_mb'))],
        ['Host', api_data.get('host_name', '-')],
        ['Group', api_data.get('group_name', '-')],
        ['---', '---'],
        ['CPU Usage', format_percent(api_data.get('metrics', {}).get('cpu_ratio'))],
        ['Memory Usage', format_percent(api_data.get('metrics', {}).get('memory_ratio'))],
        ['Storage Usage', format_percent(api_data.get('metrics', {}).get('storage_ratio'))],
        ['Network Read', f"{api_data.get('metrics', {}).get('network_read_bitps', 0) / 1_000_000:.2f} Mbps"],
        ['Network Write', f"{api_data.get('metrics', {}).get('network_write_bitps', 0) / 1_000_000:.2f} Mbps"],
        ['Retrieved At', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
    ]
    
    print(tabulate(api_table, headers='firstrow', tablefmt='grid'))
    
    # Table 3: Comparison
    print(f"\n{'='*80}")
    print("TABLE 3: COMPARISON (Database vs API)")
    print(f"{'='*80}\n")
    
    comparison_data = compare_data(db_data, api_data)
    comparison_table = [['Field', 'Database', 'API (Real-time)', 'Status']]
    comparison_table.extend(comparison_data)
    
    print(tabulate(comparison_table, headers='firstrow', tablefmt='grid'))
    
    print(f"\n{'='*80}")
    print("Legend: ✅ = Match, ❌ = Mismatch, ⚠️ = Significant difference (>5%)")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
