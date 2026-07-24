// ── Ý 3 (Hướng B): DÙNG AI CHỈ ĐỂ HIỂU CÂU HỎI ──────────────────────────────────────────────────
// TẮT mặc định. Chỉ bật khi có VITE_AI_PROXY_URL (địa chỉ 1 proxy máy chủ do cơ quan tự dựng, GIỮ API key
// ở phía máy chủ — KHÔNG bao giờ để key trong mã giao diện). Nếu chưa cấu hình → parseWithAI() trả null,
// trợ lý chạy 100% bằng bộ phân loại nội bộ (chatIntent.js) như cũ, không gọi mạng ra ngoài.
//
// QUYỀN RIÊNG TƯ: chỉ gửi ĐÚNG CÂU CHỮ người dùng gõ (để AI hiểu ý), KHÔNG gửi dữ liệu nhiệm vụ/điểm
// nhân sự. Lưu ý: câu hỏi có thể chứa TÊN nhân viên (VD "điểm của Trương Thanh Tài") — cơ quan cân nhắc
// trước khi bật. Truy vấn dữ liệu thật vẫn chạy TẠI CHỖ trên máy, AI chỉ trả về "ý định + điều kiện".
//
// Proxy phải nhận POST {question} và trả JSON dạng slots giống chatIntent (status/metric/order/subject/...).
// Xem code proxy mẫu: supabase/functions/ai-intent/index.ts

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || "";
export const aiEnabled = !!PROXY_URL;

// Chuẩn hoá kết quả AI về đúng khung slots mà bộ chạy truy vấn đang dùng (bỏ field lạ, ép kiểu an toàn).
function normalizeSlots(x) {
  if (!x || typeof x !== "object") return null;
  const oneOf = (v, arr) => (arr.includes(v) ? v : null);
  return {
    status: oneOf(x.status, ["pending_approval", "overdue", "completed", "in_progress"]),
    metric: oneOf(x.metric, ["score", "ontime", "speed", "load", "free"]),
    order: oneOf(x.order, ["asc", "desc"]),
    subject: oneOf(x.subject, ["people", "dept", "org"]),
    late: !!x.late,
    wantList: !!x.wantList,
    countQ: !!x.countQ,
    totalQ: !!x.totalQ,
    avg: !!x.avg,
    compare: !!x.compare,
    guide: !!x.guide,
    create: !!x.create,
    search: !!x.search,
    upcoming: !!x.upcoming,
    superl: !!x.superl,
    hasViec: !!x.hasViec,
    threshold: (x.threshold && (x.threshold.op === ">" || x.threshold.op === "<") && Number.isFinite(+x.threshold.n)) ? { op: x.threshold.op, n: +x.threshold.n } : null,
    kind: typeof x.kind === "string" ? x.kind : null, // AI có thể gợi ý luôn "ý định", nơi gọi có thể dùng hoặc bỏ
  };
}

// Trả về { slots, kind } nếu AI hiểu được; null nếu tắt/lỗi/quá thời gian → nơi gọi tự quay về nội bộ.
export async function parseWithAI(question) {
  if (!aiEnabled || !question || !question.trim()) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500); // chậm quá thì bỏ, dùng bộ nội bộ cho mượt
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.slice(0, 300) }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    // Câu NGOÀI phạm vi dữ liệu → AI trả về câu trả lời tự do (không phải slots)
    if (data && typeof data.answer === "string" && data.answer.trim()) return { answer: data.answer.trim() };
    const slots = normalizeSlots(data.slots || data);
    if (!slots) return null;
    return { slots, kind: slots.kind };
  } catch {
    return null; // mọi lỗi (mạng/timeout/parse) → im lặng quay về bộ phân loại nội bộ
  }
}
