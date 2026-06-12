#!/usr/bin/env python3
"""
Script tự động chỉnh sửa App.jsx để sắp xếp task theo thời hạn.
Cách dùng: đặt script này cùng thư mục với App.jsx, rồi chạy:
    python3 patch_app.py
"""

import os
import shutil

APP_FILE = "App.jsx"
BACKUP_FILE = "App.jsx.bak"

ORIGINAL = (
    "  const filtered=useMemo(()=>computed.filter(t=>{"
    "if(fStatus!==\"all\"&&t.status!==fStatus)return false;"
    "if(fDept!==\"all\"&&t.dept!==fDept)return false;"
    "if(fEid!==\"all\"&&t.eid!==fEid)return false;"
    "if(search&&!t.title.toLowerCase().includes(search.toLowerCase()))return false;"
    "return true;}),[computed,fStatus,fDept,fEid,search]);"
)

REPLACEMENT = (
    "  const STATUS_ORDER={overdue:0,nearly_due:1,on_time:2,completed:3};\n"
    "  const filtered=useMemo(()=>computed.filter(t=>{"
    "if(fStatus!==\"all\"&&t.status!==fStatus)return false;"
    "if(fDept!==\"all\"&&t.dept!==fDept)return false;"
    "if(fEid!==\"all\"&&t.eid!==fEid)return false;"
    "if(search&&!t.title.toLowerCase().includes(search.toLowerCase()))return false;"
    "return true;"
    "}).sort((a,b)=>{"
    "const orderDiff=(STATUS_ORDER[a.status]??4)-(STATUS_ORDER[b.status]??4);"
    "if(orderDiff!==0)return orderDiff;"
    "return new Date(a.deadline)-new Date(b.deadline);"
    "}),[computed,fStatus,fDept,fEid,search]);"
)

def main():
    if not os.path.exists(APP_FILE):
        print(f"❌ Không tìm thấy file '{APP_FILE}'. Hãy đặt script này cùng thư mục với App.jsx.")
        return

    with open(APP_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    if ORIGINAL not in content:
        print("⚠️  Không tìm thấy đoạn code cần thay thế.")
        print("   Có thể file đã được chỉnh sửa trước đó, hoặc format code khác.")
        return

    # Backup
    shutil.copy(APP_FILE, BACKUP_FILE)
    print(f"✅ Đã backup file gốc → {BACKUP_FILE}")

    # Apply patch
    new_content = content.replace(ORIGINAL, REPLACEMENT, 1)

    with open(APP_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)

    print("✅ Đã chỉnh sửa App.jsx thành công!")
    print()
    print("Thay đổi:")
    print("  + Thêm hằng STATUS_ORDER = {overdue:0, nearly_due:1, on_time:2, completed:3}")
    print("  + Danh sách nhiệm vụ tự động sắp xếp:")
    print("      1. 🔴 Quá hạn (deadline gần nhất lên đầu)")
    print("      2. 🟡 Sắp hết hạn")
    print("      3. 🟢 Trong hạn")
    print("      4. ✅ Hoàn thành (xuống cuối)")

if __name__ == "__main__":
    main()
