#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║  Đồng bộ Văn bản đến: iOffice → qlcv-app               ║
║  Tác giả: Claude (Anthropic)                            ║
╚══════════════════════════════════════════════════════════╝

Cách dùng:
  python sync_vanban.py                 # Chạy thật (kèm tải file đính kèm)
  python sync_vanban.py --dry-run       # Chỉ xem kết quả, không thay đổi (vẫn thử dò file đính kèm để kiểm tra)
  python sync_vanban.py --no-attachments  # Bỏ qua bước mở chi tiết/tải file đính kèm (nhanh hơn)

Lưu ý về file đính kèm: mỗi văn bản MỚI (chưa có trong qlcv-app) sẽ được mở trang chi
tiết trên iOffice, lấy danh sách file đính kèm qua API nội bộ của trang (NEORemoting)
rồi tải TỪNG file bằng 1 HTTP request riêng (giữ nguyên tên gốc, không gộp .zip) — cách
này không bấm nút/không bắt sự kiện download nên không còn rủi ro lẫn file giữa các văn
bản. File được upload lên cùng kho lưu trữ (Storage bucket "attachments") mà ứng dụng
đang dùng. File tạm lưu ở thư mục hệ thống (qlcv_sync_vanban_attachments) và tự xoá sau
khi upload xong.

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
import os
import sys
import json
import tempfile
from datetime import datetime

import requests
from playwright.async_api import async_playwright

# Thư mục tạm để lưu file đính kèm đã tải — cần tự tạo vì Playwright sẽ XOÁ file tạm
# của riêng nó ngay khi đóng trình duyệt (browser.close()), trong khi bước upload lên
# Supabase Storage chỉ chạy SAU khi đã đóng trình duyệt.
ATTACHMENT_TMP_DIR = os.path.join(tempfile.gettempdir(), "qlcv_sync_vanban_attachments")
os.makedirs(ATTACHMENT_TMP_DIR, exist_ok=True)


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
        self.context = page.context

    async def login(self):
        url = CONFIG["IOFFICE_URL"]
        print(f"Đang mở iOffice: {url}")
        # Trang iOffice rất nặng (nhiều JS/ảnh inline) — đợi "load" mặc định (mọi tài nguyên
        # xong hết) dễ vượt quá 30s trên mạng chậm/VPN. Chỉ cần đợi DOM dựng xong ở bước goto,
        # bước wait_for_load_state("networkidle") ngay sau mới là mốc "trang thực sự sẵn sàng".
        await self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
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
        # Đồng thời lấy href của link "Tải file" (a.btnDownloadAllFileVBDen) ngay trong mỗi dòng —
        # đây là link javascript:allFileDownload(id) tải toàn bộ file đính kèm của văn bản đó.
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
                        .map(r => {
                            const cells = Array.from(r.querySelectorAll('td')).map(c => (c.textContent||'').trim());
                            const dl = r.querySelector('a.btnDownloadAllFileVBDen');
                            return { cells, download_href: dl ? dl.getAttribute('href') : null };
                        })
                        .filter(r => r.cells.length > 10 && /^\\d+$/.test((r.cells[2]||'').trim()));
                }
            """)

        rows = await read_rows()
        total_in_page = len(rows)

        # Nếu DataTables không mở rộng được, phân trang thủ công
        if total_in_page > 0:
            for row in rows:
                doc = self._parse_row(row["cells"])
                if doc:
                    doc["_download_href"] = row.get("download_href")
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
                    doc = self._parse_row(row["cells"])
                    if doc:
                        doc["_download_href"] = row.get("download_href")
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

    async def open_detail_by_so_ky_hieu(self, frame, so_ky_hieu: str, max_pages: int = 20) -> bool:
        """Dò qua các trang tìm đúng dòng có số ký hiệu này, click vào dòng để mở trang chi tiết
        văn bản (nơi có nút "📥 Nén và tải tất cả")."""
        # LUÔN bấm về trang 1 trước khi dò — biến page_num bên dưới đếm TƯƠNG ĐỐI (cứ không thấy
        # là bấm sang trang kế), nhưng trang THỰC TẾ đang hiển thị có thể không phải trang 1 (ví
        # dụ ngay sau read_table_all_pages() đang dừng ở trang cuối, hoặc "Quay lại" không reset
        # về trang 1). Nếu không ép về trang 1 trước, thuật toán dò-tiến-only sẽ không bao giờ
        # quay lại được các trang nhỏ hơn trang hiện tại -> bỏ sót vĩnh viễn văn bản ở trang đó.
        for loc in [frame.locator('a.paginate_button:text-is("1")'), frame.locator('a:text-is("1")')]:
            try:
                if await loc.count() > 0:
                    await loc.first.click(force=True)
                    await asyncio.sleep(1.5)
                    break
            except Exception:
                continue

        page_num = 1
        while page_num <= max_pages:
            row_loc = frame.locator("tr").filter(has_text=so_ky_hieu)
            try:
                cnt = await row_loc.count()
            except Exception:
                cnt = 0
            if cnt > 0:
                row = row_loc.first
                try:
                    await row.click(force=True)
                    await self.page.wait_for_load_state("networkidle", timeout=15000)
                    await asyncio.sleep(1)
                    return True
                except Exception as e:
                    print(f"       ⚠ Không mở được chi tiết '{so_ky_hieu}': {e}")
                    return False
            next_page = page_num + 1
            clicked = False
            for loc in [
                frame.locator(f'a.paginate_button:text-is("{next_page}")'),
                frame.locator(f'a:text-is("{next_page}")'),
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
            page_num = next_page
        return False

    async def download_attachments_from_detail(self, so_ky_hieu: str) -> list[dict]:
        """Lấy danh sách file đính kèm của văn bản đang mở chi tiết TRỰC TIẾP qua hàm nội bộ
        của trang (NEORemoting.getRSet — API DWR mà chính trang dùng để vẽ danh sách file),
        rồi tải TỪNG file bằng 1 HTTP request độc lập (context.request, tự có cookie đăng
        nhập). Không bấm nút, không mở popup, không bắt sự kiện download — nên không còn rủi
        ro lẫn/mất file giữa các văn bản như cách bấm UI trước đây, và giữ nguyên tên file gốc
        thay vì gộp vào 1 file .zip."""
        try:
            raw = await self.page.evaluate("""
                () => new Promise((resolve) => {
                    try {
                        if (typeof current_id === 'undefined' || !current_id) { resolve([]); return; }
                        var url = 'qlvb.van_ban_den.getFileAttachLst("' + current_id + '","' + (typeof config_sort_file !== 'undefined' ? config_sort_file : '') + '")';
                        NEORemoting.getRSet(url, function(data) {
                            try { resolve(eval(data) || []); } catch (e) { resolve([]); }
                        });
                    } catch (e) { resolve([]); }
                })
            """)
        except Exception as e:
            print(f"       ⚠ Không lấy được danh sách file đính kèm cho {so_ky_hieu}: {e}")
            return []

        if not raw:
            print(f"       (không có file đính kèm cho {so_ky_hieu})")
            return []

        results = []
        for item in raw:
            hdd_file = item.get("hdd_file")
            name = item.get("name")
            if not hdd_file or not name:
                continue
            try:
                abs_url = await self.page.evaluate(
                    """([path, name]) => {
                        var type = 'vb';
                        if (!path.includes('upload/')) { path = Base64_Coder.encode(path); }
                        var rel = "smartoffice/jbm/download.jsp?5E1XCBS.=" + encodeURIComponent(Base64_Coder.encode(name))
                            + "&5FpXTEW.=" + path + "&TFbm5O..=" + Base64_Coder.encode(type);
                        return new URL(rel, document.baseURI).href;
                    }""",
                    [hdd_file, name],
                )
                resp = await self.context.request.get(abs_url, headers={"Referer": self.page.url})
                if not resp.ok:
                    print(f"       ⚠ Tải lỗi (HTTP {resp.status}) file '{name}' của {so_ky_hieu}")
                    continue
                body = await resp.body()
                dest = os.path.join(ATTACHMENT_TMP_DIR, f"{int(datetime.now().timestamp()*1000)}_{name}")
                with open(dest, "wb") as f:
                    f.write(body)
                results.append({"name": name, "path": dest})
            except Exception as e:
                print(f"       ⚠ Lỗi khi tải file '{name}' của {so_ky_hieu}: {e}")
                continue

        print(f"       📎 Tải được {len(results)}/{len(raw)} file đính kèm")
        return results

    async def back_to_list(self):
        """Bấm nút "< Quay lại" để về danh sách văn bản đến sau khi xem chi tiết 1 văn bản."""
        try:
            btn = self.page.get_by_text("Quay lại", exact=False)
            if await btn.count() > 0:
                await btn.first.click(force=True)
                await self.page.wait_for_load_state("networkidle", timeout=15000)
                await asyncio.sleep(1)
        except Exception as e:
            print(f"       ⚠ Không quay lại được danh sách: {e}")

    async def get_all_vanban_den(self, existing: set[str], missing_attachments: set[str] = frozenset(),
                                  fetch_attachments: bool = True) -> list[dict]:
        all_docs = []
        for section in CONFIG["SECTIONS"]:
            print(f"\n📂 Section: {section}")
            ok = await self.navigate_to_section(section)
            if not ok:
                continue
            docs = await self.read_table_all_pages()
            print(f"   → Tìm thấy {len(docs)} văn bản")

            if fetch_attachments:
                frame = await self._find_frame_with_table()
                for doc in docs:
                    is_new = doc["so_ky_hieu"] not in existing
                    needs_backfill = doc["so_ky_hieu"] in missing_attachments
                    if not is_new and not needs_backfill:
                        continue  # đã có sẵn và đã có file rồi, không cần tải lại
                    try:
                        opened = await self.open_detail_by_so_ky_hieu(frame, doc["so_ky_hieu"])
                        if opened:
                            print(f"     🔎 Mở chi tiết: {doc['so_ky_hieu']}")
                            doc["_attachment_files"] = await self.download_attachments_from_detail(doc["so_ky_hieu"])
                            await self.back_to_list()
                            frame = await self._find_frame_with_table()
                        else:
                            print(f"     ⚠ Không tìm thấy/mở được dòng '{doc['so_ky_hieu']}' trong danh sách — bỏ qua file đính kèm")
                    except Exception as e:
                        print(f"       ⚠ Lỗi lấy file đính kèm cho {doc['so_ky_hieu']}: {e}")

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

        # Xác thực qua RPC login (an toàn, không lộ password hash)
        resp = requests.post(
            f"{CONFIG['SUPABASE_URL']}/rest/v1/rpc/login",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {anon_key}",
                "Content-Type": "application/json",
            },
            json={"p_username": username, "p_password": password},
            timeout=10,
        )
        rows = resp.json() if resp.status_code == 200 else []
        if not rows:
            raise RuntimeError(
                f"Đăng nhập thất bại cho username '{username}'.\n"
                f"Kiểm tra lại QLCV_USERNAME / QLCV_PASSWORD trong CONFIG.\n"
                f"Lỗi: {resp.text[:120]}"
            )
        user = rows[0]

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

    def get_existing_missing_attachments(self) -> set[str]:
        """Số hiệu văn bản đã có trong qlcv-app nhưng CHƯA có file đính kèm (attachments rỗng/null) —
        dùng để bổ sung lại file cho các văn bản lỡ đồng bộ trước khi tính năng tải file được sửa đúng."""
        resp = requests.get(
            f"{self.base}/rest/v1/documents?select=doc_number,attachments&type=eq.incoming",
            headers=self.read_headers,
            timeout=15,
        )
        if resp.status_code != 200:
            return set()
        out = set()
        for d in resp.json():
            atts = d.get("attachments")
            if not d.get("doc_number"):
                continue
            if not atts or atts in ("[]", "null"):
                out.add(d["doc_number"])
        return out

    def update_attachments(self, doc_number: str, attachments: list[dict]) -> tuple[bool, str]:
        """Vá lại cột attachments cho 1 văn bản ĐÃ tồn tại (không tạo dòng mới)."""
        resp = requests.patch(
            f"{self.base}/rest/v1/documents?type=eq.incoming&doc_number=eq.{requests.utils.quote(doc_number)}",
            headers=self.write_headers,
            json={"attachments": json.dumps(attachments)},
            timeout=15,
        )
        if resp.status_code in (200, 204):
            return True, "OK"
        return False, f"HTTP {resp.status_code}: {resp.text[:120]}"

    @staticmethod
    def _safe_storage_key(filename: str) -> str:
        """Supabase Storage từ chối key có dấu tiếng Việt/khoảng trắng/dấu phẩy/ngoặc
        (lỗi 'InvalidKey') — chuẩn hoá lại key lưu trữ, tên gốc vẫn giữ nguyên để hiển thị."""
        import re
        import unicodedata
        base, ext = os.path.splitext(os.path.basename(filename))
        base = unicodedata.normalize("NFD", base)
        base = "".join(c for c in base if unicodedata.category(c) != "Mn")
        base = base.replace("đ", "d").replace("Đ", "D")
        base = re.sub(r"[^A-Za-z0-9_-]+", "_", base).strip("_") or "file"
        ext = re.sub(r"[^A-Za-z0-9.]+", "", ext)
        return f"{base}{ext}"

    _MIME_TYPES = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".zip": "application/zip", ".rar": "application/vnd.rar",
    }

    def upload_attachment(self, local_path: str, filename: str) -> dict | None:
        """Upload 1 file lên Supabase Storage bucket 'attachments' (cùng bucket app đang dùng),
        trả về {name, url} để gắn vào cột attachments của bảng documents."""
        safe_name = f"{int(datetime.now().timestamp()*1000)}_{self._safe_storage_key(filename)}"
        try:
            with open(local_path, "rb") as f:
                data = f.read()
        except OSError as e:
            print(f"       ⚠ Không đọc được file tạm '{local_path}': {e}")
            return None
        ext = os.path.splitext(filename)[1].lower()
        # Content-Type đúng theo đuôi file — nếu để mặc định application/octet-stream, trình duyệt
        # sẽ luôn bắt tải file về (kể cả PDF) thay vì hiển thị trực tiếp trên tab.
        content_type = self._MIME_TYPES.get(ext, "application/octet-stream")
        resp = requests.post(
            f"{self.base}/storage/v1/object/attachments/{safe_name}",
            headers={
                "apikey": CONFIG["SUPABASE_SERVICE_KEY"],
                "Authorization": f"Bearer {CONFIG['SUPABASE_SERVICE_KEY']}",
                "Content-Type": content_type,
            },
            data=data,
            timeout=30,
        )
        if resp.status_code in (200, 201):
            return {"name": filename, "url": f"{self.base}/storage/v1/object/public/attachments/{safe_name}"}
        if resp.status_code == 413 or "exceeded the maximum allowed size" in resp.text:
            print(f"       ⚠ File '{filename}' vượt quá dung lượng cho phép của Storage (bỏ qua, văn bản vẫn được đồng bộ, chỉ thiếu file này)")
        else:
            print(f"       ⚠ Upload file '{filename}' lỗi: HTTP {resp.status_code}: {resp.text[:120]}")
        return None

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
        # id, doc_number, type, title, sender, doc_date, note, created_by, attachments
        note_parts = []
        if doc.get("do_khan"):
            note_parts.append(f"Độ khẩn: {doc['do_khan']}")
        if doc.get("loai_van_ban"):
            note_parts.append(f"Loại VB: {doc['loai_van_ban']}")
        if doc.get("ngay_den"):
            note_parts.append(f"Ngày đến: {doc['ngay_den']}")

        # Sinh ID theo định dạng của qlcv-app: "d" + timestamp milliseconds
        doc_id = f"d{int(datetime.now().timestamp() * 1000)}"

        # Upload file đính kèm (nếu có tải được từ trang chi tiết iOffice) lên Storage,
        # rồi gắn vào cột attachments dạng JSON [{name,url}] giống Documents.jsx đang dùng
        attachments = []
        if not dry_run:
            for f in doc.get("_attachment_files", []):
                up = self.upload_attachment(f["path"], f["name"])
                if up:
                    attachments.append(up)
                try:
                    os.remove(f["path"])  # dọn file tạm sau khi đã upload (hoặc thử upload xong)
                except OSError:
                    pass

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
            "attachments": json.dumps(attachments) if attachments else None,
        }
        # Xóa các trường None
        payload = {k: v for k, v in payload.items() if v is not None}

        if dry_run:
            n_files = len(doc.get("_attachment_files", []))
            extra = f" (+{n_files} file đính kèm)" if n_files else ""
            print(f"     [DRY RUN] Sẽ thêm: {so_hieu} — {doc['trich_yeu'][:55]}{extra}")
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
    missing_attachments = qlcv.get_existing_missing_attachments()
    print(f"     → Đã có: {len(existing)} văn bản"
          f"{f' ({len(missing_attachments)} văn bản đang thiếu file đính kèm, sẽ bổ sung lại)' if missing_attachments else ''}")

    # ── Bước 3: Lấy dữ liệu từ iOffice ─────────────────────
    print("\n[3/4] Lấy văn bản đến từ iOffice...")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=CONFIG["HEADLESS"])
        page = await browser.new_page()
        extractor = IOfficeExtractor(page)

        await extractor.login()
        all_docs = await extractor.get_all_vanban_den(
            existing, missing_attachments, fetch_attachments="--no-attachments" not in sys.argv
        )
        await browser.close()

    # Loại trùng theo số hiệu
    unique: dict[str, dict] = {}
    for doc in all_docs:
        unique.setdefault(doc["so_ky_hieu"], doc)
    unique_docs = list(unique.values())
    print(f"\n     → Tổng văn bản duy nhất: {len(unique_docs)}")

    # ── Bước 4: Chèn vào qlcv-app (hoặc vá lại attachments cho văn bản đã có) ─
    print(f"\n[4/4] Đồng bộ vào qlcv-app{'  (DRY RUN)' if dry_run else ''}...")
    added = skipped = errors = patched = 0
    for doc in unique_docs:
        so_hieu = doc["so_ky_hieu"]
        if so_hieu in existing:
            # Văn bản đã có sẵn — chỉ vá lại attachments nếu vừa tải bổ sung được file
            files = doc.get("_attachment_files", [])
            if not files:
                skipped += 1
                continue
            if dry_run:
                print(f"     [DRY RUN] Sẽ vá attachments cho: {so_hieu} (+{len(files)} file)")
                patched += 1
                continue
            uploaded = []
            for f in files:
                up = qlcv.upload_attachment(f["path"], f["name"])
                if up:
                    uploaded.append(up)
                try:
                    os.remove(f["path"])
                except OSError:
                    pass
            if uploaded:
                ok, msg = qlcv.update_attachments(so_hieu, uploaded)
                if ok:
                    patched += 1
                    print(f"   🔧 Đã vá file đính kèm: {so_hieu}")
                else:
                    errors += 1
                    print(f"   ✗ {so_hieu} — LỖI vá attachments: {msg}")
            continue

        ok, msg = qlcv.insert(doc, existing, dry_run)
        if ok:
            added += 1
            if not dry_run:
                print(f"   ✓ {so_hieu} — {doc['trich_yeu'][:55]}")
        else:
            errors += 1
            print(f"   ✗ {so_hieu} — LỖI: {msg}")

    # ── Tổng kết ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"  ✓ Đã thêm mới : {added} văn bản")
    if patched:
        print(f"  🔧 Đã vá file đính kèm cho : {patched} văn bản đã tồn tại")
    print(f"  - Bỏ qua      : {skipped} (đã tồn tại, không cần vá)")
    if errors:
        print(f"  ✗ Lỗi         : {errors} văn bản")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
