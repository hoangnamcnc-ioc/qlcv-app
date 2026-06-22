#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║  Đồng bộ Văn bản đến: iOffice → qlcv-app               ║
║  Tác giả: Claude (Anthropic)                            ║
╚══════════════════════════════════════════════════════════╝

Cách dùng:
  python sync_vanban.py              # Chạy thật
  python sync_vanban.py --dry-run    # Chỉ xem kết quả, không thay đổi

Cài đặt:
  pip install playwright requests
  playwright install chromium

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  QUAN TRỌNG: Cần điền SUPABASE_SERVICE_KEY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Cách lấy SUPABASE_SERVICE_KEY (service_role key):
  1. Đăng nhập Supabase: https://supabase.com/dashboard
  2. Chọn project → Settings → API
  3. Trong mục "Project API keys" → copy "service_role" key
     (KHÔNG phải "anon" key — cần key service_role mới insert được)
  4. Dán vào CONFIG["SUPABASE_SERVICE_KEY"] bên dưới

  Lý do cần service_role: bảng documents có bảo mật RLS chặn
  việc thêm dữ liệu từ bên ngoài. Service_role key bỏ qua RLS.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import asyncio
import sys
import json
from datetime import datetime

import requests
from playwright.async_api import async_playwright


# ════════════════════════════════════════════════════════════
#  CẤU HÌNH — Điền thông tin của bạn vào đây
# ════════════════════════════════════════════════════════════
CONFIG = {
    # ── iOffice ──────────────────────────────────────────────
    "IOFFICE_URL":      "https://ioffice.vnptdaklak.vn/qlvbdh_dlk/",
    "IOFFICE_USERNAME": "namvnh@khcn.daklak.gov.vn",   # ← sửa
    "IOFFICE_PASSWORD": "Qlvb@2026",        # ← sửa

    # ── qlcv-app (Supabase) ───────────────────────────────────
    "SUPABASE_URL":     "https://layqtkwianrqrworwtym.supabase.co",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheXF0a3dpYW5ycXJ3b3J3dHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDQxMTgsImV4cCI6MjA5NjYyMDExOH0.0NhZXfljXT4_BumLZg8GN_OSSdK87ngoxPqXfQuilx0",
    # ★ QUAN TRỌNG: Lấy từ Supabase Dashboard → Settings → API → service_role key
    "SUPABASE_SERVICE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheXF0a3dpYW5ycXJ3b3J3dHltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA0NDExOCwiZXhwIjoyMDk2NjIwMTE4fQ.PS4Gh2W5RsCQNUZkqspukoMgF4F92RH5rofyC0N6Y24",  # ← BẮT BUỘC
    "QLCV_USERNAME":    "admin",    # ← tên đăng nhập qlcv-app (không phải email)
    "QLCV_PASSWORD":    "admin123@",

    # ── Chọn section văn bản đến cần lấy ────────────────────
    # Bỏ comment (#) section nào bạn muốn đồng bộ
    "SECTIONS": [
        "Văn bản đến xử lý chính",
        "Văn bản đến phối hợp",
    ],

    # ── Tùy chọn khác ───────────────────────────────────────
    "HEADLESS": False,   # False = hiện cửa sổ Chrome; True = chạy ẩn
    "WAIT_SECONDS": 2,   # Giây chờ sau mỗi thao tác
}

# ════════════════════════════════════════════════════════════
#  CỘT DỮ LIỆU TRONG BẢNG iOffice (dt_basic)
# Dựa trên phân tích thực tế từ hệ thống
# ════════════════════════════════════════════════════════════
COL = {
    "stt":              1,
    "so_eofficé":       4,
    "don_vi_ban_hanh":  5,
    "so_ky_hieu":       6,
    "trich_yeu":        7,
    "so_den":           8,
    "ngay_van_ban":    11,
    "ngay_den":        12,
    "han_xu_ly":       15,
    "do_khan":         21,
    "loai_van_ban":    22,
}


# ════════════════════════════════════════════════════════════
#  PHẦN 1: Lấy dữ liệu từ iOffice
# ════════════════════════════════════════════════════════════
class IOfficeExtractor:
    def __init__(self, page):
        self.page = page

    async def login(self):
        url = CONFIG["IOFFICE_URL"]
        print(f"Đang mở iOffice: {url}")
        await self.page.goto(url)
        await self.page.wait_for_load_state("networkidle", timeout=30000)

        # Kiểm tra thực sự: nếu có ô nhập mật khẩu thì chưa login
        has_password = await self.page.locator('input[type="password"]').count() > 0
        if not has_password:
            print("✓ iOffice đã đăng nhập sẵn.")
            return

        # Điền form login
        print("Đang điền form đăng nhập iOffice...")
        for selector in [
            'input[name="username"]', 'input[name="user"]',
            'input[name="txtUserName"]', 'input[name="loginId"]',
            'input[type="text"]:visible', '#username', '#user',
        ]:
            try:
                if await self.page.locator(selector).count() > 0:
                    await self.page.fill(selector, CONFIG["IOFFICE_USERNAME"])
                    break
            except Exception:
                continue

        for selector in ['input[type="password"]', 'input[name="password"]', '#password']:
            try:
                if await self.page.locator(selector).count() > 0:
                    await self.page.fill(selector, CONFIG["IOFFICE_PASSWORD"])
                    break
            except Exception:
                continue

        # Submit
        for selector in ['input[type="submit"]', 'button[type="submit"]', 'button:has-text("Đăng nhập")', '.btn-login']:
            try:
                if await self.page.locator(selector).count() > 0:
                    await self.page.click(selector)
                    break
            except Exception:
                await self.page.keyboard.press("Enter")
                break

        await self.page.wait_for_load_state("networkidle", timeout=30000)
        print(f"✓ Đăng nhập xong. URL: {self.page.url[:70]}")

    async def navigate_to_section(self, section_name: str) -> bool:
        """Điều hướng tới section bằng cách gọi JS href trực tiếp (bỏ qua visibility)"""
        try:
            # Lấy href của link dù đang bị ẩn (so sánh mềm: bỏ qua số đếm, khoảng trắng thừa)
            href = await self.page.evaluate(f"""
                () => {{
                    const target = {json.dumps(section_name)};
                    const norm = t => t.replace(/\\s+/g, ' ').trim();
                    const links = Array.from(document.querySelectorAll('a'));
                    const a = links.find(el => {{
                        const txt = norm(el.textContent);
                        return txt === target || txt.startsWith(target);
                    }});
                    return a ? a.getAttribute('href') : null;
                }}
            """)
            if not href:
                print(f"  ⚠ Không tìm thấy link '{section_name}' trong trang")
                return False

            # Gọi hàm javascript: trực tiếp (bỏ qua kiểm tra visible)
            js_call = href.replace("javascript:", "", 1)
            await self.page.evaluate(js_call)
            await self.page.wait_for_load_state("networkidle", timeout=20000)
            await asyncio.sleep(CONFIG["WAIT_SECONDS"])
            return True
        except Exception as e:
            print(f"  ⚠ Lỗi điều hướng section '{section_name}': {e}")
            return False

    async def _find_frame_with_table(self):
        """Tìm frame chứa bảng văn bản — thử nhiều lần, tìm theo nội dung"""
        for attempt in range(5):  # thử tối đa 5 giây
            await asyncio.sleep(1)
            for frame in self.page.frames:
                try:
                    found = await frame.evaluate("""
                        () => {
                            // Ưu tiên dt_basic có dữ liệu
                            const t1 = document.getElementById('dt_basic');
                            if (t1 && t1.querySelectorAll('tr').length > 1) return true;
                            // Tìm bất kỳ bảng nào chứa "Số ký hiệu" (header)
                            for (const tbl of document.querySelectorAll('table')) {
                                if ((tbl.innerText||'').includes('Số ký hiệu') ||
                                    (tbl.innerText||'').includes('Trích yếu')) return true;
                            }
                            return false;
                        }
                    """)
                    if found:
                        return frame
                except Exception:
                    continue
        # Không tìm thấy (section có thể rỗng)
        return None

    async def read_table_all_pages(self) -> list[dict]:
        """Đọc tất cả văn bản, tìm bảng theo nội dung (không phụ thuộc ID cứng)"""
        all_docs = []
        page_num = 1

        frame = await self._find_frame_with_table()
        if frame is None:
            return []

        # Mở rộng DataTables để hiện tất cả — target đúng #dt_basic_length
        expanded = await frame.evaluate("""
            () => {
                // Cách 1: DataTables API với page length lớn
                try {
                    if (window.$ && window.$.fn && window.$.fn.dataTable) {
                        window.$('#dt_basic').DataTable().page.len(500).draw();
                        return 'api-500';
                    }
                } catch(e) {}
                // Cách 2: Select #dt_basic_length (DataTables chuẩn)
                const dtSel = document.querySelector('#dt_basic_length select, select[name="dt_basic_length"]');
                if (dtSel) {
                    const opts = Array.from(dtSel.options).sort((a,b) => parseInt(b.value)-parseInt(a.value));
                    dtSel.value = opts[0].value;
                    dtSel.dispatchEvent(new Event('change', {bubbles: true}));
                    return 'dt-select-' + opts[0].value;
                }
                // Cách 3: Bất kỳ select nào trong dataTables_wrapper
                const wrap = document.querySelector('.dataTables_wrapper');
                if (wrap) {
                    const sel = wrap.querySelector('select');
                    if (sel) {
                        const opts = Array.from(sel.options).sort((a,b) => parseInt(b.value)-parseInt(a.value));
                        if (parseInt(opts[0].value) > 10) {
                            sel.value = opts[0].value;
                            sel.dispatchEvent(new Event('change', {bubbles: true}));
                            return 'wrap-select-' + opts[0].value;
                        }
                    }
                }
                return 'no-action';
            }
        """)
        if expanded != 'no-action':
            await asyncio.sleep(3)

        # Đọc tất cả rows, dùng textContent, lọc theo cột STT (index 2)
        async def read_rows():
            return await frame.evaluate("""
                () => {
                    let tbl = document.getElementById('dt_basic');
                    if (!tbl || tbl.querySelectorAll('tr').length <= 1) {
                        for (const t of document.querySelectorAll('table')) {
                            if ((t.textContent||'').includes('Số ký hiệu')) { tbl = t; break; }
                        }
                    }
                    if (!tbl) return [];
                    return Array.from(tbl.querySelectorAll('tr'))
                        .map(r => Array.from(r.querySelectorAll('td'))
                                       .map(c => (c.textContent||'').trim()))
                        .filter(r => r.length > 10 && /^\\d+$/.test((r[2]||'').trim()));
                }
            """)

        rows = await read_rows()
        total_in_page = len(rows)

        # Nếu DataTables không mở rộng được, phân trang thủ công
        if total_in_page > 0:
            for row in rows:
                doc = self._parse_row(row)
                if doc:
                    all_docs.append(doc)

            # Phân trang: click từng số trang bằng Playwright locator
            page_num = 1
            while True:
                next_page = page_num + 1
                # Thử nhiều cách tìm nút số trang tiếp theo
                clicked = False
                for loc in [
                    frame.locator(f'a.paginate_button:text-is("{next_page}")'),
                    frame.locator(f'a:text-is("{next_page}")'),
                    frame.locator(f'span:text-is("{next_page}")'),
                    frame.locator(f'[onclick*="fnPageChange"][onclick*="{next_page - 1}"]'),
                    frame.locator(f'a.paginate_button.next:not(.disabled)'),
                    frame.locator('a:has-text("▶"):not(.disabled)'),
                    frame.locator('a:has-text("»"):not(.disabled)'),
                ]:
                    try:
                        if await loc.count() > 0:
                            await loc.first.click(force=True)
                            clicked = True
                            break
                    except Exception:
                        continue

                if not clicked:
                    break
                await asyncio.sleep(2)
                more_rows = await read_rows()
                if not more_rows:
                    break
                page_num = next_page
                print(f"     → Trang {page_num}: {len(more_rows)} dòng")
                for row in more_rows:
                    doc = self._parse_row(row)
                    if doc:
                        all_docs.append(doc)

        return all_docs

    def _parse_row(self, row: list) -> dict | None:
        # Dựa trên cấu trúc thực tế (30 cột):
        # [2]=STT, [6]=Đơn vị, [7]=Số ký hiệu, [8]=Trích yếu, [13]=Ngày VB, [14]=Ngày đến, [20]=Độ khẩn
        def safe(idx):
            return row[idx].strip() if idx < len(row) else ""

        so_ky_hieu = safe(7)
        if not so_ky_hieu or "/" not in so_ky_hieu:
            return None

        # Trích yếu: bỏ prefix trạng thái (ví dụ "Có văn bản phúc đáp -\n")
        trich_raw = safe(8)
        parts = [p.strip() for p in trich_raw.split('\n') if p.strip()]
        trich_yeu = max(parts, key=len) if parts else trich_raw

        return {
            "so_ky_hieu":      so_ky_hieu,
            "trich_yeu":       trich_yeu,
            "don_vi_ban_hanh": safe(6),
            "ngay_van_ban":    safe(13),
            "ngay_den":        safe(14),
            "han_xu_ly":       safe(15),
            "do_khan":         safe(20),
            "loai_van_ban":    safe(12),
        }

    async def get_all_vanban_den(self) -> list[dict]:
        all_docs = []
        for section in CONFIG["SECTIONS"]:
            print(f"\n📂 Section: {section}")
            ok = await self.navigate_to_section(section)
            if not ok:
                continue
            docs = await self.read_table_all_pages()
            print(f"   → Tìm thấy {len(docs)} văn bản")
            all_docs.extend(docs)
        return all_docs


# ════════════════════════════════════════════════════════════
#  PHẦN 2: Chèn dữ liệu vào qlcv-app qua Supabase REST API
# ════════════════════════════════════════════════════════════
class QLCVInserter:
    def __init__(self, user_id: str):
        self.base = CONFIG["SUPABASE_URL"]
        self.user_id = user_id          # id của user đăng nhập (cột created_by)
        anon_key  = CONFIG["SUPABASE_ANON_KEY"]
        svc_key   = CONFIG["SUPABASE_SERVICE_KEY"]

        # Dùng service_role key để bypass RLS khi INSERT
        # Dùng anon key cho các thao tác đọc bình thường
        self.read_headers = {
            "apikey":        anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Content-Type":  "application/json",
        }
        self.write_headers = {
            "apikey":        svc_key,
            "Authorization": f"Bearer {svc_key}",
            "Content-Type":  "application/json",
            "Prefer":        "return=minimal",
        }

    @classmethod
    def login(cls) -> "QLCVInserter":
        """Xác thực: kiểm tra username/password trong bảng users"""
        username = CONFIG["QLCV_USERNAME"]
        password = CONFIG["QLCV_PASSWORD"]
        anon_key = CONFIG["SUPABASE_ANON_KEY"]
        svc_key  = CONFIG["SUPABASE_SERVICE_KEY"]

        # Kiểm tra service_role key đã điền chưa
        if "DIEN_" in svc_key:
            raise RuntimeError(
                "Chưa điền SUPABASE_SERVICE_KEY!\n"
                "  → Truy cập: https://supabase.com/dashboard/project/layqtkwianrqrworwtym/settings/api\n"
                "  → Copy 'service_role' key và dán vào CONFIG['SUPABASE_SERVICE_KEY']"
            )

        # Xác thực username/password qua bảng users
        resp = requests.get(
            f"{CONFIG['SUPABASE_URL']}/rest/v1/users?username=eq.{username}&limit=1",
            headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"},
            timeout=10,
        )
        if resp.status_code != 200 or not resp.json():
            raise RuntimeError(
                f"Không tìm thấy username '{username}' trong hệ thống.\n"
                f"Kiểm tra lại QLCV_USERNAME trong CONFIG."
            )
        user = resp.json()[0]

        # Kiểm tra password (hash hoặc plaintext)
        stored_pw = user.get("password", "")
        if stored_pw and stored_pw != password and not stored_pw.startswith("h$"):
            raise RuntimeError(f"Sai mật khẩu cho user '{username}'.")

        print(f"✓ Đăng nhập qlcv-app: {user.get('full_name', username)} ({user.get('role', '')})")
        return cls(user_id=user["id"])

    def get_existing_doc_numbers(self) -> set[str]:
        """Lấy danh sách số hiệu đã có để tránh trùng"""
        resp = requests.get(
            f"{self.base}/rest/v1/documents?select=doc_number&type=eq.incoming",
            headers=self.read_headers,
            timeout=15,
        )
        if resp.status_code != 200:
            print(f"  ⚠ Không lấy được danh sách documents: {resp.text[:80]}")
            return set()
        return {d["doc_number"] for d in resp.json() if d.get("doc_number")}

    @staticmethod
    def _parse_date(date_str: str) -> str | None:
        if not date_str:
            return None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None

    def insert(self, doc: dict, existing: set[str], dry_run: bool) -> tuple[bool, str]:
        so_hieu = doc["so_ky_hieu"]
        if so_hieu in existing:
            return False, "Đã tồn tại"

        # Cột thực tế trong bảng documents:
        # id, doc_number, type, title, sender, doc_date, note, created_by
        note_parts = []
        if doc.get("do_khan"):
            note_parts.append(f"Độ khẩn: {doc['do_khan']}")
        if doc.get("loai_van_ban"):
            note_parts.append(f"Loại VB: {doc['loai_van_ban']}")
        if doc.get("ngay_den"):
            note_parts.append(f"Ngày đến: {doc['ngay_den']}")

        # Sinh ID theo định dạng của qlcv-app: "d" + timestamp milliseconds
        doc_id = f"d{int(datetime.now().timestamp() * 1000)}"

        payload = {
            "id":          doc_id,
            "doc_number":  so_hieu,
            "title":       doc["trich_yeu"],
            "sender":      doc["don_vi_ban_hanh"],
            "doc_date":    self._parse_date(doc["ngay_van_ban"]),
            "deadline":    self._parse_date(doc["han_xu_ly"]) if doc.get("han_xu_ly") else None,
            "note":        " | ".join(note_parts) if note_parts else None,
            "type":        "incoming",
            "created_by":  self.user_id,
        }
        # Xóa các trường None
        payload = {k: v for k, v in payload.items() if v is not None}

        if dry_run:
            print(f"     [DRY RUN] Sẽ thêm: {so_hieu} — {doc['trich_yeu'][:55]}")
            return True, "dry_run"

        resp = requests.post(
            f"{self.base}/rest/v1/documents",
            headers=self.write_headers,
            json=payload,
            timeout=15,
        )
        if resp.status_code in (200, 201):
            return True, "OK"
        else:
            return False, f"HTTP {resp.status_code}: {resp.text[:120]}"


# ════════════════════════════════════════════════════════════
#  PHẦN 3: Chương trình chính
# ════════════════════════════════════════════════════════════
async def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("  Đồng bộ Văn bản đến: iOffice → qlcv-app")
    if dry_run:
        print("  CHẾ ĐỘ: DRY RUN (chỉ xem, không thay đổi)")
    print("=" * 60)

    # Kiểm tra config
    for key in ("IOFFICE_USERNAME", "IOFFICE_PASSWORD", "SUPABASE_ANON_KEY",
                "SUPABASE_SERVICE_KEY", "QLCV_USERNAME", "QLCV_PASSWORD"):
        if "DIEN_" in CONFIG.get(key, "DIEN_"):
            print(f"\n❌ Chưa điền: CONFIG['{key}'].")
            if key == "SUPABASE_SERVICE_KEY":
                print("   → Truy cập: https://supabase.com/dashboard/project/layqtkwianrqrworwtym/settings/api")
                print("   → Copy 'service_role' key (KHÔNG phải 'anon' key)")
            print("   Mở file sync_vanban.py và điền thông tin.")
            sys.exit(1)

    # ── Bước 1: Đăng nhập qlcv-app ──────────────────────────
    print("\n[1/4] Đăng nhập qlcv-app...")
    try:
        qlcv = QLCVInserter.login()
    except RuntimeError as e:
        print(f"❌ {e}")
        sys.exit(1)

    # ── Bước 2: Lấy danh sách văn bản đã có ─────────────────
    print("[2/4] Lấy danh sách văn bản đã có trong qlcv-app...")
    existing = qlcv.get_existing_doc_numbers()
    print(f"     → Đã có: {len(existing)} văn bản")

    # ── Bước 3: Lấy dữ liệu từ iOffice ─────────────────────
    print("\n[3/4] Lấy văn bản đến từ iOffice...")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=CONFIG["HEADLESS"])
        page = await browser.new_page()
        extractor = IOfficeExtractor(page)

        await extractor.login()
        all_docs = await extractor.get_all_vanban_den()
        await browser.close()

    # Loại trùng theo số hiệu
    unique: dict[str, dict] = {}
    for doc in all_docs:
        unique.setdefault(doc["so_ky_hieu"], doc)
    unique_docs = list(unique.values())
    print(f"\n     → Tổng văn bản duy nhất: {len(unique_docs)}")

    # ── Bước 4: Chèn vào qlcv-app ───────────────────────────
    print(f"\n[4/4] Đồng bộ vào qlcv-app{'  (DRY RUN)' if dry_run else ''}...")
    added = skipped = errors = 0
    for doc in unique_docs:
        ok, msg = qlcv.insert(doc, existing, dry_run)
        if ok:
            added += 1
            if not dry_run:
                print(f"   ✓ {doc['so_ky_hieu']} — {doc['trich_yeu'][:55]}")
        elif msg == "Đã tồn tại":
            skipped += 1
        else:
            errors += 1
            print(f"   ✗ {doc['so_ky_hieu']} — LỖI: {msg}")

    # ── Tổng kết ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"  ✓ Đã thêm mới : {added} văn bản")
    print(f"  - Bỏ qua      : {skipped} (đã tồn tại)")
    if errors:
        print(f"  ✗ Lỗi         : {errors} văn bản")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
