import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
ip = "10.251.204.30"
vm = "b3ec526f-0bcd-450a-910c-b00beec7b682"
# using the credential logic from sync_v2 to get token
from webapp.backend.app.services.sync_v2.sangfor_client import SangforCredentials, SangforClient
creds = SangforCredentials(ip, "admin", "shci@WUH65;")
c = SangforClient(creds)
tok = c.authenticate()
headers = {"Authorization": f"Token {tok}"}
base = f"https://{ip}/janus/20180725/servers/{vm}"
for action in ["stop", "shutdown", "poweroff", "halt"]:
    r = requests.post(f"{base}/{action}", headers=headers, verify=False)
    print(action, r.status_code, r.text[:100])
