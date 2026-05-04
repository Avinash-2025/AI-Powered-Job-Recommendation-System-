import urllib.request
import json

# Test /api/recommend
data = json.dumps({"skills": "python, machine learning", "top_n": 3}).encode()
req = urllib.request.Request("http://localhost:5000/api/recommend", data=data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print("Recommend endpoint:")
print(f"  Jobs returned: {len(result['jobs'])}")
for j in result['jobs']:
    print(f"  - {j['title']} ({j['match']}% match)")

# Test /api/upload with a text file
import io
boundary = "----TestBoundary123"
body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="resume"; filename="test.txt"\r\n'
    f"Content-Type: text/plain\r\n\r\n"
    f"Python developer with experience in machine learning, data analysis, pandas, numpy, sql, react\r\n"
    f"--{boundary}--\r\n"
).encode()
req2 = urllib.request.Request(
    "http://localhost:5000/api/upload",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST",
)
try:
    resp2 = urllib.request.urlopen(req2)
    result2 = json.loads(resp2.read())
    print("\nUpload endpoint:")
    print(f"  Skills: {result2['resume']['skills']}")
    print(f"  Jobs: {len(result2['recommendations'])}")
    for j in result2['recommendations'][:3]:
        print(f"  - {j['title']}")
except Exception as e:
    print(f"\nUpload endpoint ERROR: {e}")
    if hasattr(e, 'read'):
        print(f"  Response: {e.read().decode()}")
