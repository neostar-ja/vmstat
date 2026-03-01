"""
Sangfor SCP API Client
Handles authentication and data fetching from Sangfor SCP
"""

import requests
import urllib3
import logging
from typing import Optional, Dict, Any, List
from binascii import a2b_hex, b2a_hex
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from Crypto.Util.number import bytes_to_long
from dataclasses import dataclass
from datetime import datetime

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


@dataclass
class SangforCredentials:
    """Sangfor SCP connection credentials"""
    ip: str
    port: int = 443
    username: str = ""
    password: str = ""
    
    @property
    def base_url(self) -> str:
        return f"https://{self.ip}:{self.port}" if self.port != 443 else f"https://{self.ip}"


class SangforClient:
    """
    Client for interacting with Sangfor SCP API
    """
    
    def __init__(self, credentials: SangforCredentials, timeout: int = 30):
        self.credentials = credentials
        self.timeout = timeout
        self._token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
    
    def _get_public_key(self) -> str:
        """Get RSA public key from SCP server"""
        url = f"{self.credentials.base_url}/janus/public-key"
        
        try:
            response = requests.get(url, verify=False, timeout=self.timeout)
            response.raise_for_status()
            
            result = response.json()
            if 'data' in result and 'public_key' in result['data']:
                public_key = result['data']['public_key'].replace('\\n', '').strip()
                return public_key
            
            raise ValueError("Public key not found in response")
            
        except requests.RequestException as e:
            raise ConnectionError(f"Failed to get public key: {e}")
    
    def _encrypt_password(self, password: str, modulus: str) -> str:
        """Encrypt password using RSA public key"""
        password_bytes = password.encode('utf-8')
        e = int(0x10001)
        n = bytes_to_long(a2b_hex(modulus))
        rsa_key = RSA.construct((n, e))
        public_key = rsa_key.publickey()
        cipher = PKCS1_v1_5.new(public_key)
        encrypted = cipher.encrypt(password_bytes)
        return b2a_hex(encrypted).decode('utf-8')
    
    def authenticate(self) -> str:
        """
        Authenticate with Sangfor SCP and get token
        Returns the authentication token
        """
        logger.info(f"🔐 Authenticating with SCP at {self.credentials.ip}...")
        
        # Get public key and encrypt password
        modulus = self._get_public_key()
        encrypted_password = self._encrypt_password(self.credentials.password, modulus)
        
        # Request token
        url = f"{self.credentials.base_url}/janus/authenticate"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload = {
            "auth": {
                "passwordCredentials": {
                    "username": self.credentials.username,
                    "password": encrypted_password
                }
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, verify=False, timeout=self.timeout)
            
            if response.status_code == 200:
                result = response.json()
                
                # Try to extract token from various paths
                token_paths = [
                    ["data", "access", "token", "id"],
                    ["access", "token", "id"],
                    ["data", "token"],
                    ["token", "id"],
                    ["access_token"],
                    ["token"],
                ]
                
                for path in token_paths:
                    token = result
                    for key in path:
                        if isinstance(token, dict) and key in token:
                            token = token[key]
                        else:
                            token = None
                            break
                    
                    if token and isinstance(token, str):
                        self._token = token
                        logger.info("✅ Authentication successful")
                        return token
                
                raise ValueError("Token not found in authentication response")
            else:
                raise ConnectionError(f"Authentication failed: HTTP {response.status_code}")
                
        except requests.RequestException as e:
            raise ConnectionError(f"Authentication request failed: {e}")
    
    def fetch_servers(self, page_size: int = 100, max_pages: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch all servers from SCP API with pagination
        Returns list of server dictionaries
        """
        if not self._token:
            raise RuntimeError("Not authenticated. Call authenticate() first.")
        
        logger.info("📡 Fetching servers from SCP...")
        
        all_servers: List[Dict[str, Any]] = []
        page_num = 0
        
        # Try different API versions
        endpoints = [
            "/janus/20190725/servers",
            "/janus/20180725/servers"
        ]
        
        for endpoint in endpoints:
            all_servers = []
            page_num = 0
            
            while page_num < max_pages:
                url = f"{self.credentials.base_url}{endpoint}"
                headers = {
                    "Authorization": f"Token {self._token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                params = {
                    "page_num": page_num,
                    "page_size": page_size
                }
                
                try:
                    response = requests.get(url, headers=headers, params=params, verify=False, timeout=self.timeout)
                    
                    if response.status_code == 200:
                        result = response.json()
                        servers = self._extract_servers(result)
                        
                        if servers:
                            all_servers.extend(servers)
                            logger.debug(f"Page {page_num}: {len(servers)} servers")
                            
                            if len(servers) < page_size:
                                break  # Last page
                            
                            page_num += 1
                        else:
                            break  # No more servers
                            
                    elif response.status_code == 400:
                        # Try without pagination
                        response = requests.get(url, headers=headers, verify=False, timeout=self.timeout)
                        if response.status_code == 200:
                            result = response.json()
                            servers = self._extract_servers(result)
                            if servers:
                                all_servers = servers
                        break
                    else:
                        break
                        
                except requests.RequestException as e:
                    logger.error(f"Error fetching page {page_num}: {e}")
                    break
            
            if all_servers:
                logger.info(f"✅ Fetched {len(all_servers)} servers total")
                return all_servers
        
        raise RuntimeError("Failed to fetch servers from any endpoint")
    
    def _extract_servers(self, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract server list from API response"""
        # Try various response structures
        if "data" in result:
            data = result["data"]
            if "data" in data:
                return data["data"]
            elif isinstance(data, list):
                return data
        elif "servers" in result:
            return result["servers"]
        elif isinstance(result, list):
            return result
        
        return []
    
    def fetch_datastores(self) -> List[Dict[str, Any]]:
        """
        Fetch all datastores/storages from SCP API
        Returns list of datastore dictionaries
        """
        if not self._token:
            raise RuntimeError("Not authenticated. Call authenticate() first.")
        
        logger.info("📦 Fetching datastores from SCP...")
        
        endpoints = [
            "/janus/20190725/storages",
            "/janus/20180725/storages"
        ]
        
        for endpoint in endpoints:
            url = f"{self.credentials.base_url}{endpoint}"
            headers = {
                "Authorization": f"Token {self._token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            try:
                response = requests.get(url, headers=headers, verify=False, timeout=self.timeout)
                
                if response.status_code == 200:
                    result = response.json()
                    datastores = self._extract_data(result)
                    
                    if datastores:
                        logger.info(f"✅ Fetched {len(datastores)} datastores")
                        return datastores
                        
            except requests.RequestException as e:
                logger.error(f"Error fetching datastores from {endpoint}: {e}")
                continue
        
        logger.warning("⚠️ No datastores found from any endpoint")
        return []

    def get_active_alarms(self) -> List[Dict[str, Any]]:
        """
        Fetch active system alarms (status='open') from SCP API
        Returns list of alarm dictionaries
        """
        if not self._token:
            raise RuntimeError("Not authenticated. Call authenticate() first.")
        
        logger.info("🚨 Fetching system alarms from SCP...")
        
        endpoints = [
            "/janus/20190725/alarms",
            "/janus/20180725/alarms",
            "/janus/alarms"
        ]
        
        for endpoint in endpoints:
            url = f"{self.credentials.base_url}{endpoint}"
            headers = {
                "Authorization": f"Token {self._token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            params = {
                "status": "open",
                "page_size": 100,
                "page_num": 0
            }
            
            try:
                logger.debug(f"Trying alarm endpoint: {endpoint}")
                response = requests.get(url, headers=headers, params=params, verify=False, timeout=self.timeout)
                
                if response.status_code == 200:
                    result = response.json()
                    alarms = []
                    
                    if "data" in result:
                        data = result["data"]
                        if isinstance(data, dict):
                            if "data" in data:
                                alarms = data["data"]
                        elif isinstance(data, list):
                            alarms = data
                    
                    # Process alarms to ensure description is present
                    processed_alarms = []
                    for alarm in alarms:
                        processed_alarms.append({
                            "source": "system",
                            "severity": alarm.get("level") or alarm.get("severity"),
                            "title": alarm.get("title") or alarm.get("name") or "System Alarm",
                            "description": self._get_alarm_description(alarm),
                            "status": "open",
                            "begin_time": alarm.get("generate_time") or alarm.get("start_time"),
                            "object_type": "system",
                            "resource_id": alarm.get('resource_id') or alarm.get('resid'),
                            "resource_name": alarm.get('resource_name') or alarm.get('resname')
                        })
                    
                    logger.info(f"✅ Fetched {len(alarms)} active alarms from {endpoint}")
                    return processed_alarms
                    
                elif response.status_code == 404:
                    continue
                else:
                    logger.warning(f"Failed to fetch alarms from {endpoint}: {response.status_code}")
                    continue
                    
            except requests.RequestException as e:
                logger.error(f"Error fetching alarms from {endpoint}: {e}")
                continue
        
        logger.warning("⚠️ Failed to fetch alarms from any endpoint")
        return []

    def _get_alarm_description(self, alarm_obj: Dict[str, Any]) -> str:
        """
        Extract alarm description safely from various fields
        """
        return (
            alarm_obj.get("description")
            or alarm_obj.get("alarm_desc")
            or alarm_obj.get("desc")
            or alarm_obj.get("detail")
            or alarm_obj.get("content")
            or ""
        )


    
    def _extract_data(self, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract data list from API response"""
        if "data" in result:
            data = result["data"]
            if isinstance(data, dict) and "data" in data:
                return data["data"]
            elif isinstance(data, list):
                return data
        return []
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to SCP server
        Returns connection status and info
        """
        try:
            # Test basic connectivity
            url = f"{self.credentials.base_url}/janus/public-key"
            response = requests.get(url, verify=False, timeout=10)
            
            if response.status_code == 200:
                # Try authentication
                try:
                    self.authenticate()
                    return {
                        "success": True,
                        "message": "Connection successful",
                        "ip": self.credentials.ip,
                        "authenticated": True
                    }
                except Exception as e:
                    return {
                        "success": False,
                        "message": f"Authentication failed: {str(e)}",
                        "ip": self.credentials.ip,
                        "authenticated": False
                    }
            else:
                return {
                    "success": False,
                    "message": f"Server returned HTTP {response.status_code}",
                    "ip": self.credentials.ip
                }
                
        except requests.exceptions.ConnectTimeout:
            return {
                "success": False,
                "message": "Connection timeout",
                "ip": self.credentials.ip
            }
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "message": "Cannot connect to server",
                "ip": self.credentials.ip
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e),
                "ip": self.credentials.ip
            }
