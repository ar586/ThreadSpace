import requests
import json
import time

API_URL = "https://thread-space-red.vercel.app/api"

# Login
login_data = {"username": "testuser123", "password": "password"}
r = requests.post(f"{API_URL}/auth/register", json=login_data)
if r.status_code == 400:
    r = requests.post(f"{API_URL}/auth/login", data=login_data)

cookies = r.cookies

# Get workspaces
r = requests.get(f"{API_URL}/workspaces", cookies=cookies)
workspaces = r.json()
print("Response status:", r.status_code)
print("Response text:", r.text)

if not workspaces:
    r = requests.post(f"{API_URL}/workspaces", json={"name": "test_ws1"}, cookies=cookies)
    time.sleep(1)
    r = requests.post(f"{API_URL}/workspaces", json={"name": "test_ws2"}, cookies=cookies)
    r = requests.get(f"{API_URL}/workspaces", cookies=cookies)
    workspaces = r.json()

ws2 = workspaces[0] # most recent
ws1 = workspaces[1] # older

print(f"Adding node to older workspace {ws1['name']} ({ws1['id']})")
r = requests.post(f"{API_URL}/nodes", json={"workspace_id": ws1["id"], "content": "hello"}, cookies=cookies)
print("Node created:", r.status_code)

time.sleep(1)

r = requests.get(f"{API_URL}/workspaces", cookies=cookies)
new_workspaces = r.json()
print("After update workspaces:", [(w["name"], w["updated_at"]) for w in new_workspaces])
