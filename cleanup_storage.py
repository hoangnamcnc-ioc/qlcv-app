#!/usr/bin/env python3
"""
Dọn file MỒ CÔI trong Supabase Storage bucket "attachments" của qlcv-app.
File mồ côi = không bản ghi nào (tasks/documents/comments/support_cases/other_tasks/projects) trỏ tới.

Cách dùng:
  python cleanup_storage.py              # DRY-RUN: chỉ liệt kê, ghi danh sách ra file, KHÔNG xóa
  python cleanup_storage.py --delete     # Xóa thật các file mồ côi (hỏi xác nhận trước)
  python cleanup_storage.py --backup DIR # Tải sao lưu file mồ côi về DIR rồi mới cho xóa

Cần biến môi trường SUPABASE_SERVICE_KEY (đọc tự động từ .env.sync nếu có) — service_role key,
bỏ qua RLS để liệt kê/xóa storage. SUPABASE_URL mặc định project qlcv.
"""
import os, sys, json, time, urllib.request, urllib.parse, collections
try: sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
except Exception: pass

def _load_env_sync():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.sync")
    if os.path.isfile(p):
        try:
            for line in open(p, encoding="utf-8-sig"):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        except OSError: pass
_load_env_sync()

URL = (os.environ.get("SUPABASE_URL") or "https://layqtkwianrqrworwtym.supabase.co").rstrip("/")
SVC = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
BUCKET = "attachments"
if not SVC:
    print("❌ Chưa có SUPABASE_SERVICE_KEY (đặt biến môi trường hoặc trong .env.sync)"); sys.exit(1)

H = {"apikey": SVC, "Authorization": "Bearer " + SVC, "Content-Type": "application/json"}
def _req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(URL + path, data=data, headers=H, method=method)
    with urllib.request.urlopen(r) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None

def list_objects():
    objs, off = [], 0
    while True:
        pg = _req("POST", f"/storage/v1/object/list/{BUCKET}",
                  {"prefix": "", "limit": 1000, "offset": off, "sortBy": {"column": "name", "order": "asc"}})
        if not pg: break
        objs += pg; off += len(pg)
        if len(pg) < 1000: break
    return {o["name"]: {"size": (o.get("metadata") or {}).get("size") or 0, "created": o.get("created_at") or ""} for o in objs}

def key_from_url(u):
    if not isinstance(u, str) or "/" + BUCKET + "/" not in u: return None
    k = u.split("/" + BUCKET + "/", 1)[1].split("?", 1)[0]
    return urllib.parse.unquote(k)

def _atts(val):
    """attachments có thể là list, hoặc chuỗi JSON (JSON.stringify), hoặc None."""
    if not val: return []
    if isinstance(val, str):
        try: val = json.loads(val)
        except Exception: return []
    return val if isinstance(val, list) else []

def _get_all(tbl, sel):
    """Đọc TẤT CẢ dòng — PostgREST mặc định chỉ trả 1000/lần nên BẮT BUỘC phân trang, nếu không sẽ bỏ
    sót tham chiếu ở các dòng sau và XÓA NHẦM file đang dùng (đã từng gây mất 93 file đính kèm việc)."""
    out, off = [], 0
    while True:
        pg = _req("GET", f"/rest/v1/{tbl}?select={sel}&limit=1000&offset={off}")
        if not pg: break
        out += pg; off += len(pg)
        if len(pg) < 1000: break
    return out

def referenced_keys():
    refs = set()
    def add_list(lst):
        for a in _atts(lst):
            if isinstance(a, dict):
                k = key_from_url(a.get("url"));
                if k: refs.add(k)
    # bảng có cột attachments trực tiếp
    for tbl, col in [("tasks", "attachments"), ("documents", "attachments"),
                     ("comments", "attachments"), ("support_cases", "attachments")]:
        try:
            for row in _get_all(tbl, col): add_list(row.get(col))
        except Exception as e: print(f"  ⚠ bỏ qua {tbl}: {e}")
    # bảng có steps[].attachments
    for tbl in ["other_tasks", "projects"]:
        try:
            for row in _get_all(tbl, "steps"):
                for st in _atts(row.get("steps")):
                    if isinstance(st, dict): add_list(st.get("attachments"))
        except Exception as e: print(f"  ⚠ bỏ qua {tbl}: {e}")
    return refs

def download(name, dest_dir):
    os.makedirs(dest_dir, exist_ok=True)
    u = f"{URL}/storage/v1/object/{BUCKET}/{urllib.parse.quote(name)}"
    r = urllib.request.Request(u, headers={"apikey": SVC, "Authorization": "Bearer " + SVC})
    with urllib.request.urlopen(r) as resp, open(os.path.join(dest_dir, name), "wb") as f:
        f.write(resp.read())

def delete_batch(names):
    # Storage xóa nhiều file: DELETE /object/<bucket> với body {"prefixes":[...]}
    _req("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": names})

def _arg_val(flag, default=None):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv and sys.argv.index(flag) + 1 < len(sys.argv) else default

def main():
    do_delete = "--delete" in sys.argv
    auto_yes = "--yes" in sys.argv          # bỏ qua hỏi xác nhận (dùng cho chạy tự động theo lịch)
    older_days = float(_arg_val("--older-than", 0) or 0)  # chỉ xóa file mồ côi CŨ hơn N ngày (an toàn với file vừa tải)
    backup_dir = _arg_val("--backup", "backup_orphans") if "--backup" in sys.argv else None

    print("📦 Đang liệt kê storage…")
    info = list_objects()
    print("🔗 Đang thu thập link đính kèm được tham chiếu…")
    refs = referenced_keys()
    orphans = [n for n in info if n not in refs]
    # Lọc theo tuổi: chỉ giữ file đủ cũ để xóa (tránh xóa nhầm file vừa upload chưa kịp gắn vào bản ghi)
    skipped_young = 0
    if older_days > 0:
        import datetime as _dt
        cutoff = _dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=older_days)
        def old_enough(n):
            c = info[n]["created"]
            if not c: return True
            try: return _dt.datetime.fromisoformat(c.replace("Z", "+00:00")) < cutoff
            except Exception: return True
        before = len(orphans); orphans = [n for n in orphans if old_enough(n)]; skipped_young = before - len(orphans)
    orphans.sort(key=lambda n: -info[n]["size"])
    osz = sum(info[n]["size"] for n in orphans)
    tot = sum(v["size"] for v in info.values())
    print("\n" + "=" * 56)
    print(f"  Tổng: {len(info)} file / {tot/1e9:.2f} GB")
    print(f"  Được dùng: {len(info)-len([n for n in info if n not in refs])} file")
    print(f"  MỒ CÔI sẽ dọn: {len(orphans)} file / {osz/1e9:.2f} GB" + (f"  (bỏ qua {skipped_young} file < {older_days:g} ngày)" if skipped_young else ""))
    print("=" * 56)
    with open("orphan_list.txt", "w", encoding="utf-8") as f:
        for n in orphans: f.write(f"{info[n]['size']}\t{n}\n")
    print(f"→ Đã ghi danh sách {len(orphans)} file vào orphan_list.txt")
    for n in orphans[:15]: print(f"    {info[n]['size']/1e6:7.1f} MB  {n[:70]}")

    if not do_delete:
        print("\n(DRY-RUN) Chưa xóa gì. Chạy lại với --delete để xóa (thêm --yes để không hỏi, --older-than N để chỉ xóa file cũ).")
        return
    if not orphans:
        print("\nKhông có file mồ côi để xóa."); return
    # CHỐT CHẶN: nếu bảng nguồn tham chiếu bỗng TRỐNG thì danh sách "mồ côi" không đáng tin (file của bảng đó bị coi
    # là rác) → từ chối xóa trừ khi có --force. (Bài học: lỗi phân trang từng làm mất 93 file; bảng documents từng trống.)
    empty = [t for t in ("tasks", "documents") if len(_get_all(t, "id")) == 0]
    if empty and "--force" not in sys.argv:
        print(f"\n⛔ TỪ CHỐI XÓA: bảng {', '.join(empty)} đang TRỐNG nên danh sách mồ côi không đáng tin (có thể xóa nhầm file đang dùng).")
        print("   Kiểm tra dữ liệu trước; chỉ khi chắc chắn mới chạy lại với --force."); return
    if backup_dir:
        print(f"\n💾 Sao lưu {len(orphans)} file về {backup_dir}/ …")
        for i, n in enumerate(orphans, 1):
            try: download(n, backup_dir)
            except Exception as e: print(f"  ⚠ lỗi tải {n}: {e}")
            if i % 100 == 0: print(f"    …{i}/{len(orphans)}")
    if not auto_yes:
        ans = input(f"\n⚠️ Xóa VĨNH VIỄN {len(orphans)} file ({osz/1e9:.2f} GB)? Gõ 'xoa' để xác nhận: ").strip()
        if ans != "xoa":
            print("Đã hủy."); return
    print("🗑️  Đang xóa…")
    for i in range(0, len(orphans), 500):
        batch = orphans[i:i + 500]
        try: delete_batch(batch); print(f"    đã xóa {min(i+500,len(orphans))}/{len(orphans)}")
        except Exception as e: print(f"  ⚠ lỗi xóa batch {i}: {e}")
        time.sleep(0.2)
    print("✅ Xong.")

if __name__ == "__main__":
    main()
