// Tóm tắt RÚT TRÍCH (extractive) — thuần thuật toán, không dùng AI ngoài. Lấy sẵn các câu/ý quan trọng
// từ văn bản (không diễn giải lại). Phù hợp văn bản hành chính có bố cục rõ; văn bản phức tạp → kết quả thô.
const ACTION = ["yêu cầu", "đề nghị", "giao ", "kết luận", "chỉ đạo", "thực hiện", "phối hợp", "báo cáo", "hoàn thành", "triển khai", "chủ trì", "phê duyệt", "thống nhất", "đồng ý", "khẩn trương", "chịu trách nhiệm", "tham mưu", "quyết định", "ban hành"];

const normSpace = s => (s || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

export function extractiveSummary(text) {
  const t = normSpace(text);
  if (!t || t.replace(/\s/g, "").length < 30) return { ok: false };
  // Tách câu/dòng (văn bản hành chính hay dùng ";" để liệt kê)
  const raw = t.split(/(?<=[.;!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length >= 10 && s.length <= 500);
  // ── Ý chính: câu chứa từ khoá hành động, bỏ trùng, tối đa 8 ──
  const seen = new Set(); const keyPoints = [];
  for (const s of raw) {
    const ls = s.toLowerCase();
    if (ACTION.some(k => ls.includes(k))) { const key = ls.slice(0, 45); if (!seen.has(key)) { seen.add(key); keyPoints.push(s); } }
    if (keyPoints.length >= 8) break;
  }
  // ── Mốc thời gian / hạn ──
  const deadlines = []; const dseen = new Set();
  const dlRe = /(trước ngày|chậm nhất(?: là| ngày)?|hạn(?: chót| cuối)?|trong ngày|trước)\s*[:\-]?\s*([0-9]{1,2}[\/.\-][0-9]{1,2}[\/.\-][0-9]{2,4}|ngày\s*[0-9]{1,2}[^.;\n]{0,40})/gi;
  let m; while ((m = dlRe.exec(t))) { const d = m[0].trim().replace(/\s+/g, " "); const k = d.toLowerCase(); if (!dseen.has(k)) { dseen.add(k); deadlines.push(d); } if (deadlines.length >= 6) break; }
  // ── Mục đánh số / gạch đầu dòng ──
  const listItems = [];
  for (const l of raw) { if (/^\s*(?:[0-9]{1,2}[.)]|[-•▪–]|[a-đ][.)])\s+\S/.test(l)) { listItems.push(l.replace(/^\s+/, "")); } if (listItems.length >= 12) break; }
  // Nếu không bắt được câu hành động → lấy vài câu đầu làm tóm tắt tối thiểu
  const summarySentences = keyPoints.length ? keyPoints : raw.slice(0, 5);
  return { ok: true, keyPoints, summarySentences, deadlines, listItems, chars: t.replace(/\s/g, "").length };
}
