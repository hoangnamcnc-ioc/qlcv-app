// ── Proxy AI hiểu câu hỏi (Supabase Edge Function) ──────────────────────────────────────────────
// GIỮ API KEY Ở MÁY CHỦ — frontend chỉ gọi tới hàm này, không bao giờ thấy key.
// Nhiệm vụ: nhận câu hỏi (tiếng Việt) của người dùng, nhờ mô hình ngôn ngữ bóc thành "slots" có cấu trúc,
// KHÔNG truy vấn dữ liệu (dữ liệu do frontend tự chạy tại chỗ). Trả JSON { slots }.
//
// TRIỂN KHAI:
//   1. Cài Supabase CLI, đăng nhập, link project.
//   2. Đặt secret khoá API (một lần):  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   3. Deploy:  supabase functions deploy ai-intent --no-verify-jwt
//   4. Lấy URL hàm (dạng https://<ref>.functions.supabase.co/ai-intent) → đặt vào .env của frontend:
//        VITE_AI_PROXY_URL=https://<ref>.functions.supabase.co/ai-intent
//   5. Build lại frontend. Chưa làm bước 4 thì trợ lý vẫn chạy 100% bằng bộ nội bộ (không đổi gì).
//
// LƯU Ý RIÊNG TƯ: chỉ câu chữ người dùng gõ được gửi tới nhà cung cấp AI; không gửi dữ liệu nhiệm vụ/nhân sự.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYS = `Bạn là bộ PHÂN TÍCH Ý ĐỊNH cho một phần mềm quản lý giao việc tiếng Việt.
Nhiệm vụ: đọc câu hỏi của người dùng và trả về DUY NHẤT một object JSON mô tả ý định, KHÔNG giải thích, KHÔNG văn bản thừa.
Các trường (bỏ trống/để null nếu không có):
- status: "pending_approval" (chờ duyệt/chờ ký) | "overdue" (quá hạn/trễ) | "completed" (đã xong) | "in_progress" (đang làm) | null
- metric: "score" (điểm/xếp loại/hiệu suất) | "ontime" (đúng hạn/tin cậy) | "speed" (nhanh/tốc độ) | "load" (quá tải/ôm nhiều việc) | "free" (rảnh) | null
- order: "asc" (ít/thấp/kém nhất) | "desc" (nhiều/cao/tốt nhất) | null
- subject: "people" (hỏi AI/người nào) | "dept" (hỏi phòng nào) | "org" (toàn cơ quan) | null
- late: true nếu nhắc tới trễ/quá hạn/chậm
- wantList: true nếu muốn LIỆT KÊ danh sách việc
- countQ: true nếu hỏi SỐ LƯỢNG (bao nhiêu)
- totalQ, avg (trung bình), compare (so sánh 2 người), guide (hỏi cách dùng phần mềm),
  create (muốn tạo việc mới), search (tìm việc theo từ khoá), upcoming (việc sắp trễ), superl (có chữ "nhất")
- threshold: { "op": ">"|"<", "n": số } nếu có "hơn/dưới N việc", ngược lại null
- hasViec: true nếu câu nhắc "việc"/"nhiệm vụ"
Chỉ trả JSON, ví dụ: {"status":"overdue","subject":"people","order":"desc","late":true,"superl":true}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") return json({ slots: null }, 200);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ slots: null, error: "missing key" }, 200);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYS,
        messages: [{ role: "user", content: String(question).slice(0, 300) }],
      }),
    });
    if (!r.ok) return json({ slots: null }, 200);
    const data = await r.json();
    const text = (data?.content?.[0]?.text || "").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return json({ slots: null }, 200);
    let slots = null;
    try { slots = JSON.parse(m[0]); } catch { slots = null; }
    return json({ slots }, 200);
  } catch {
    return json({ slots: null }, 200);
  }
});

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });
}
