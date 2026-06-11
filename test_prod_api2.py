import requests

API_URL = "https://thread-space-red.vercel.app/api"
WORKSPACE_ID = "073c628e-4822-4b0a-8261-be016b72137d"

# Test OPTIONS to see what methods are allowed
r = requests.options(f"{API_URL}/workspaces/{WORKSPACE_ID}")
print("OPTIONS status:", r.status_code)
print("OPTIONS allow:", r.headers.get("Allow", ""))
print("OPTIONS access-control-allow-methods:", r.headers.get("Access-Control-Allow-Methods", ""))

# Test PUT
r2 = requests.put(f"{API_URL}/workspaces/{WORKSPACE_ID}", json={"name": "test_rename_put"})
print("PUT status:", r2.status_code)

# Test PATCH
r3 = requests.patch(f"{API_URL}/workspaces/{WORKSPACE_ID}", json={"name": "test_rename_patch"})
print("PATCH status:", r3.status_code)
