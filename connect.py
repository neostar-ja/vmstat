# -*- coding: utf-8 -*-
import requests
import urllib3
import json
import csv
import os
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from datetime import datetime
from dotenv import load_dotenv

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables from .env file
load_dotenv()

# === CONFIGURATION ===
SCP_IP = os.getenv('SCP_IP')
USERNAME = os.getenv('SCP_USERNAME')
PASSWORD = os.getenv('SCP_PASSWORD')

# Validate required environment variables
if not SCP_IP:
    raise ValueError("SCP_IP environment variable is required")
if not USERNAME:
    raise ValueError("SCP_USERNAME environment variable is required")
if not PASSWORD:
    raise ValueError("SCP_PASSWORD environment variable is required")

def get_public_key():
    """Get public key modulus from server"""
    print("๐” Getting public key...")
    url = f'https://{SCP_IP}/janus/public-key'
    response = requests.get(url, verify=False, timeout=10)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get public key: HTTP {response.status_code}")
    
    result = response.json()
    if 'data' in result and 'public_key' in result['data']:
        public_key = result['data']['public_key'].replace('\\n', '').strip()
        print("โ… Public key obtained successfully")
        return public_key
    else:
        raise Exception("Public key not found in response")

def encrypt_password(password, modulus):
    """Encrypt password using RSA public key"""
    print("๐”’ Encrypting password...")
    password = password.encode('utf-8')
    e = int(0x10001)
    n = bytes_to_long(a2b_hex(modulus))
    rsa_key = RSA.construct((n, e))
    public_key = rsa_key.publickey()
    cipher = PKCS1_v1_5.new(public_key)
    encrypted = cipher.encrypt(password)
    encrypted_hex = b2a_hex(encrypted).decode('utf-8')
    print("โ… Password encrypted successfully")
    return encrypted_hex

def get_token(username, encrypted_password):
    """Get authentication token using encrypted password"""
    print("๐“ฅ Requesting token...")
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
    
    print(f"๐ Connecting to: {url}")
    response = requests.post(url, json=payload, headers=headers, verify=False, timeout=30)
    
    print(f"๐“ก Response Status: {response.status_code}")
    print(f"๐“ Response Headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"๐“ Response Data: {json.dumps(result, indent=2)}")
        
        if result.get("code") == 0 and "data" in result:
            data = result["data"]
            if "access" in data and "token" in data["access"] and "id" in data["access"]["token"]:
                token = data["access"]["token"]["id"]
                print("โ… Token acquired successfully")
                return token
        
        # If standard path doesn't work, try alternative paths
        print("๐” Trying alternative token paths...")
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
                print(f"โ… Token found at path: {' -> '.join(path)}")
                return temp_token
    
    # Handle authentication errors
    try:
        error_data = response.json()
        error_msg = error_data.get('message', f'HTTP {response.status_code}')
        print(f"โ Authentication failed: {error_msg}")
    except:
        print(f"โ Authentication failed: HTTP {response.status_code}")
        print(f"Raw response: {response.text}")
    
    raise Exception(f"Authentication failed: HTTP {response.status_code}")

def get_server_list(token, limit=None, offset=0):
    """Get list of all servers with pagination support"""
    print("๐“ก Fetching server list...")
    
    all_servers = []
    page_size = 100  # Start with 100 servers per page
    page_num = 0
    
    # Try different API endpoints with proper pagination
    endpoints = [
        "/janus/20190725/servers",
        "/janus/20180725/servers"
    ]
    
    for endpoint in endpoints:
        print(f"๐” Trying endpoint: {endpoint}")
        
        # Reset for each endpoint
        all_servers = []
        page_num = 0
        
        while True:
            url = f"https://{SCP_IP}{endpoint}"
            
            headers = {
                "Authorization": f"Token {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            # Use pagination parameters from documentation
            params = {
                "page_num": page_num,
                "page_size": page_size
            }
            
            # Add project_id if we can get it from token response
            # params["project_id"] = "..." # We'll try without it first
            
            print(f"๐“ Requesting page {page_num} with page_size {page_size}")
            
            try:
                response = requests.get(url, headers=headers, params=params, verify=False, timeout=15)
                
                print(f"๐“ก Response Status: {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        result = response.json()
                        print(f"โ… Success with {endpoint}")
                        
                        # Handle response format
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
                        print(f"๐“ Found {current_count} servers on page {page_num}")
                        if total_count > 0 and total_count != current_count:
                            print(f"  Total available servers: {total_count}")
                        
                        if servers:
                            all_servers.extend(servers)
                            
                            # Check if we should continue to next page
                            if current_count < page_size:
                                # Last page (fewer servers than page size)
                                print(f"๐“ Reached last page (page {page_num})")
                                break
                                
                            if limit and len(all_servers) >= limit:
                                # We've reached the requested limit
                                all_servers = all_servers[:limit]
                                print(f"๐“ Limited to {len(all_servers)} servers as requested")
                                break
                                
                            # Continue to next page
                            page_num += 1
                            
                            # Safety check to prevent infinite loops
                            if page_num > 100:  # Max 100 pages (10,000 servers)
                                print("โ ๏ธ Reached safety limit of 100 pages")
                                break
                        else:
                            # No servers found on this page
                            print(f"๐“ No servers found on page {page_num}")
                            break
                            
                    except json.JSONDecodeError as e:
                        print(f"โ JSON decode error: {e}")
                        print(f"Raw response: {response.text[:200]}...")
                        break
                        
                elif response.status_code == 400:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('message', 'Unknown error')
                        print(f"โ Bad Request: {error_msg}")
                        
                        # If pagination parameters are not supported, try without them
                        if "argument" in error_msg.lower() or "parameter" in error_msg.lower():
                            print("๐” Trying without pagination parameters...")
                            response = requests.get(url, headers=headers, verify=False, timeout=15)
                            
                            if response.status_code == 200:
                                result = response.json()
                                print("โ… Success without pagination")
                                
                                # Handle response format
                                servers = []
                                if "data" in result and "data" in result["data"]:
                                    servers = result["data"]["data"]
                                elif "data" in result:
                                    servers = result["data"]
                                elif isinstance(result, list):
                                    servers = result
                                
                                print(f"๐“ Found {len(servers)} servers (no pagination)")
                                return servers
                        break
                    except:
                        print(f"โ Bad Request: {response.text[:200]}...")
                        break
                        
                elif response.status_code == 401:
                    print("โ Unauthorized - token may be invalid")
                    break
                    
                elif response.status_code == 403:
                    print("โ Forbidden - insufficient permissions")
                    break
                    
                elif response.status_code == 404:
                    print("โ Not Found - endpoint doesn't exist")
                    break
                    
                else:
                    print(f"โ HTTP {response.status_code}")
                    try:
                        error_data = response.json()
                        print(f"Error details: {error_data}")
                    except:
                        print(f"Raw response: {response.text[:200]}...")
                    break
                    
            except requests.exceptions.Timeout:
                print("โ Request timeout")
                break
            except requests.exceptions.ConnectionError as e:
                print(f"โ Connection error: {e}")
                break
            except Exception as e:
                print(f"โ Unexpected error: {e}")
                break
        
        # If we successfully got servers from this endpoint, return them
        if all_servers:
            print(f"โ… Successfully retrieved {len(all_servers)} servers total from {endpoint}")
            return all_servers
    
    # If we get here, no endpoint worked
    raise Exception("Failed to get server list from all endpoints")

def get_resource_pools(token):
    """Get resource pools/availability zones"""
    print("๐“ก Fetching resource pools...")
    url = f"https://{SCP_IP}/janus/20180725/azs"
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    response = requests.get(url, headers=headers, verify=False, timeout=10)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get resource pools: HTTP {response.status_code}")
    
    result = response.json()
    print("โ… Resource pools retrieved successfully")
    return result

def save_servers_to_json(servers, filename="server_list.json"):
    """Save server list to JSON file"""
    print(f"  Saving {len(servers)} servers to JSON...")
    
    if not servers:
        print("โ No servers to save")
        return False
    
    # Prepare data with timestamp and metadata
    data = {
        "metadata": {
            "timestamp": f"{json.dumps(None, default=str)}",
            "total_servers": len(servers),
            "source": f"Sangfor SCP ({SCP_IP})",
            "generated_by": "connect_simple.py"
        },
        "servers": servers
    }
    
    # Add actual timestamp
    from datetime import datetime
    data["metadata"]["timestamp"] = datetime.now().isoformat()
    
    # Write to JSON file
    try:
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            json.dump(data, jsonfile, indent=2, ensure_ascii=False)
        
        print(f"โ… Successfully saved to {filename}")
        return True
    except Exception as e:
        print(f"โ Error saving JSON: {e}")
        return False

def flatten_server_data(server):
    """Flatten nested server data for CSV export"""
    flat_data = {}
    
    # Basic information
    flat_data['id'] = server.get('id', '')
    flat_data['name'] = server.get('name', '')
    flat_data['status'] = server.get('status', '')
    flat_data['power_state'] = server.get('power_state', '')
    flat_data['vmtype'] = server.get('vmtype', '')
    flat_data['type'] = server.get('type', '')
    
    # Project and group information
    flat_data['project_name'] = server.get('project_name', '')
    flat_data['project_id'] = server.get('project_id', '')
    flat_data['group_name'] = server.get('group_name', '')
    flat_data['group_name_path'] = server.get('group_name_path', '')
    flat_data['group_id'] = server.get('group_id', '')
    
    # Availability zone
    flat_data['az_name'] = server.get('az_name', '')
    flat_data['az_id'] = server.get('az_id', '')
    
    # Host information
    flat_data['host_name'] = server.get('host_name', '')
    flat_data['host_id'] = server.get('host_id', '')
    
    # Operating system
    flat_data['os_name'] = server.get('os_name', '')
    flat_data['os_type'] = server.get('os_type', '')
    flat_data['os_installed'] = server.get('os_installed', '')
    
    # Hardware specifications
    flat_data['cores'] = server.get('cores', '')
    flat_data['cores_per_socket'] = server.get('cores_per_socket', '')
    flat_data['sockets'] = server.get('sockets', '')
    flat_data['memory_mb'] = server.get('memory_mb', '')
    flat_data['mhz'] = server.get('mhz', '')
    flat_data['storage_mb'] = server.get('storage_mb', '')
    
    # Status information
    cpu_status = server.get('cpu_status') or {}
    flat_data['cpu_total_mhz'] = cpu_status.get('total_mhz', '')
    flat_data['cpu_used_mhz'] = cpu_status.get('used_mhz', '')
    flat_data['cpu_ratio'] = cpu_status.get('ratio', '')
    
    memory_status = server.get('memory_status') or {}
    flat_data['memory_total_mb'] = memory_status.get('total_mb', '')
    flat_data['memory_used_mb'] = memory_status.get('used_mb', '')
    flat_data['memory_ratio'] = memory_status.get('ratio', '')
    
    storage_status = server.get('storage_status') or {}
    flat_data['storage_total_mb'] = storage_status.get('total_mb', '')
    flat_data['storage_used_mb'] = storage_status.get('used_mb', '')
    flat_data['storage_ratio'] = storage_status.get('ratio', '')
    
    network_status = server.get('network_status') or {}
    flat_data['network_read_speed_bitps'] = network_status.get('read_speed_bitps', '')
    flat_data['network_write_speed_bitps'] = network_status.get('write_speed_bitps', '')
    
    io_status = server.get('io_status') or {}
    flat_data['io_read_speed_byteps'] = io_status.get('read_speed_byteps', '')
    flat_data['io_write_speed_byteps'] = io_status.get('write_speed_byteps', '')
    flat_data['io_read_iops'] = io_status.get('read_iops', '')
    flat_data['io_write_iops'] = io_status.get('write_iops', '')
    
    gpu_status = server.get('gpu_status') or {}
    flat_data['gpu_graphics_count'] = gpu_status.get('graphics_count', '')
    flat_data['gpu_graphics_mem_total'] = gpu_status.get('graphics_mem_total', '')
    flat_data['gpu_graphics_mem_used'] = gpu_status.get('graphics_mem_used', '')
    flat_data['gpu_graphics_ratio'] = gpu_status.get('graphics_ratio', '')
    
    # Network information
    networks = server.get('networks', [])
    if networks and isinstance(networks, list) and len(networks) > 0:
        network = networks[0]
        if isinstance(network, dict):
            flat_data['network_name'] = network.get('name', '')
            flat_data['network_ip_address'] = network.get('ip_address', '')
            flat_data['network_ipv6_address'] = network.get('ipv6_address', '')
            flat_data['network_mac_address'] = network.get('mac_address', '')
            flat_data['network_vpc_name'] = network.get('vpc_name', '')
            flat_data['network_subnet_name'] = network.get('subnet_name', '')
    
    # IP addresses
    ips = server.get('ips', [])
    flat_data['ips'] = ', '.join(ips) if ips and isinstance(ips, list) else ''
    
    # Floating IP
    floatingip = server.get('floatingip') or {}
    flat_data['floating_ip_address'] = floatingip.get('floating_ip_address', '')
    flat_data['floating_ip_bind_status'] = floatingip.get('bind_status', '')
    flat_data['floating_ip_bandwidth'] = floatingip.get('bandwidth', '')
    
    # Storage information
    disks = server.get('disks', [])
    if disks and isinstance(disks, list) and len(disks) > 0:
        disk = disks[0]
        if isinstance(disk, dict):
            flat_data['disk_id'] = disk.get('id', '')
            flat_data['disk_size_mb'] = disk.get('size_mb', '')
            flat_data['disk_storage_name'] = disk.get('storage_name', '')
            flat_data['disk_storage_id'] = disk.get('storage_id', '')
    
    # Protection and backup
    flat_data['protection_enable'] = server.get('protection_enable', '')
    flat_data['protection_name'] = server.get('protection_name', '')
    flat_data['protection_id'] = server.get('protection_id', '')
    flat_data['protection_type'] = server.get('protection_type', '')
    flat_data['backup_policy_enable'] = server.get('backup_policy_enable', '')
    flat_data['backup_file_count'] = server.get('backup_file_count', '')
    
    # Other information
    flat_data['description'] = server.get('description', '')
    flat_data['user_name'] = server.get('user_name', '')
    flat_data['user_id'] = server.get('user_id', '')
    flat_data['image_name'] = server.get('image_name', '')
    flat_data['image_id'] = server.get('image_id', '')
    flat_data['template_id'] = server.get('template_id', '')
    flat_data['vm_id'] = server.get('vm_id', '')
    flat_data['dh_name'] = server.get('dh_name', '')
    flat_data['dh_id'] = server.get('dh_id', '')
    flat_data['instant_vm'] = server.get('instant_vm', '')
    flat_data['encrypted'] = server.get('encrypted', '')
    flat_data['has_gpu'] = server.get('has_gpu', '')
    flat_data['vtool_installed'] = server.get('vtool_installed', '')
    flat_data['is_stopped'] = server.get('is_stopped', '')
    flat_data['uptime'] = server.get('uptime', '')
    flat_data['shutdown_duration'] = server.get('shutdown_duration', '')
    flat_data['expire_time'] = server.get('expire_time', '')
    flat_data['location'] = server.get('location', '')
    flat_data['in_protection'] = server.get('in_protection', '')
    
    # OS option
    os_option = server.get('os_option') or {}
    flat_data['os_arch'] = os_option.get('arch', '')
    flat_data['os_kernel_name'] = os_option.get('kernel_name', '')
    flat_data['os_distribution_name'] = os_option.get('distribution_name', '')
    
    # Alarm and warning
    alarm = server.get('alarm') or {}
    flat_data['alarm_count'] = alarm.get('alarm', '')
    
    warning = server.get('warning') or {}
    flat_data['warning_count'] = warning.get('warning', '')
    
    return flat_data

def save_servers_to_csv(servers, filename="server_list.csv"):
    """Save server list to CSV file"""
    print(f"  Saving {len(servers)} servers to CSV...")
    
    if not servers:
        print("โ No servers to save")
        return False
    
    try:
        # Flatten all server data
        flattened_servers = [flatten_server_data(server) for server in servers]
        
        if not flattened_servers:
            print("โ No valid server data to save")
            return False
        
        # Get all possible field names
        fieldnames = set()
        for server in flattened_servers:
            fieldnames.update(server.keys())
        
        # Sort fieldnames for consistent column order
        fieldnames = sorted(fieldnames)
        
        # Write to CSV
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(flattened_servers)
        
        print(f"โ… Successfully saved to {filename}")
        print(f"   Columns: {len(fieldnames)}")
        return True
        
    except Exception as e:
        print(f"โ Error saving CSV: {e}")
        return False

def main():
    """Main execution function"""
    print("=== Sangfor SCP API - Server List Extractor ===")
    print(f"Server: {SCP_IP}")
    print(f"Username: {USERNAME}")
    print("=" * 50)
    
    try:
        # Authentication process
        modulus = get_public_key()
        encrypted = encrypt_password(PASSWORD, modulus)
        token = get_token(USERNAME, encrypted)
        
        print(f"\nโ… Successfully authenticated!")
        
        # Get all servers
        print("\n๐€ Starting server extraction...")
        servers = get_server_list(token)
        
        if servers:
            print(f"\n๐“ Server Summary:")
            print(f"   Total servers found: {len(servers)}")
            
            # Show first few servers as preview
            print(f"\n๐“ Server Preview (first 5):")
            for i, server in enumerate(servers[:5]):
                name = server.get('name', 'Unknown')
                server_id = server.get('id', 'Unknown')
                status = server.get('status', 'Unknown')
                print(f"   {i+1}. {name} (ID: {server_id}, Status: {status})")
            
            if len(servers) > 5:
                print(f"   ... and {len(servers) - 5} more servers")
            
            # Save to CSV
            csv_filename = f"sangfor_servers_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            save_servers_to_csv(servers, csv_filename)
            
            print(f"\nโ… Process completed successfully!")
            print(f"๐“ Data saved to: {csv_filename}")
            
        else:
            print("โ No servers found")
            
    except Exception as e:
        print(f"โ Error: {e}")
        import traceback
        print(f"๐“ Traceback: {traceback.format_exc()}")

if __name__ == '__main__':
    import sys
    
    # Command line support
    if len(sys.argv) > 1 and sys.argv[1] == '--json':
        print("=== Auto CSV Export Mode ===")
        try:
            modulus = get_public_key()
            encrypted = encrypt_password(PASSWORD, modulus)
            token = get_token(USERNAME, encrypted)
            servers = get_server_list(token)
            
            filename = sys.argv[2] if len(sys.argv) > 2 else f"sangfor_servers_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            save_servers_to_csv(servers, filename)
            
        except Exception as e:
            print(f"โ Export failed: {e}")
            sys.exit(1)
    else:
        main()
