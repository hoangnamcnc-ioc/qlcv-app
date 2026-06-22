import requests

URL = "https://layqtkwianrqrworwtym.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheXF0a3dpYW5ycXJ3b3J3dHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDQxMTgsImV4cCI6MjA5NjYyMDExOH0.0NhZXfljXT4_BumLZg8GN_OSSdK87ngoxPqXfQuilx0"
h = {"apikey": KEY, "Authorization": "Bearer " + KEY}

# Probe từng tên cột bằng GET (không bị RLS chặn)
COLS = [
    "id", "doc_number", "type", "title", "name", "subject",
    "sender", "issued_by", "from_org", "organization",
    "doc_date", "date", "issued_date", "receive_date", "received_at",
    "deadline", "due_date", "status", "urgent", "urgent_level", "priority",
    "doc_type", "category", "description", "note", "created_at", "updated_at",
    "user_id", "created_by", "assigned_to",
]

print("Kiểm tra cột bảng documents (200=tồn tại, 400=không có):")
exist = []
for col in COLS:
    r = requests.get(f"{URL}/rest/v1/documents?select={col}&limit=1", headers=h, timeout=8)
    status = "✓ TỒN TẠI" if r.status_code == 200 else f"✗ {r.status_code}"
    print(f"  {col:20s}: {status}")
    if r.status_code == 200:
        exist.append(col)

print(f"\n✓ Cột tồn tại: {exist}")
input("\nNhấn Enter để đóng...")
