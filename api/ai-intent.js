// ── Proxy AI hiểu câu hỏi — Vercel Serverless Function (bản FREE dùng Google Gemini) ────────────
// GIỮ API KEY Ở MÁY CHỦ: key nằm trong biến môi trường Vercel (GEMINI_API_KEY), KHÔNG bao giờ lộ ra
// mã giao diện. Frontend gọi tới /api/ai-intent (cùng tên miền → không vướng CORS).
// Nhiệm vụ: nhận câu hỏi tiếng Việt, nhờ Gemini bóc thành "slots" có cấu trúc, KHÔNG truy vấn dữ liệu
// (dữ liệu do frontend tự chạy tại chỗ). Trả JSON { slots }.
//
// KÍCH HOẠT (bản free, làm 1 lần):
//   1. Lấy API key MIỄN PHÍ tại: https://aistudio.google.com/apikey  (đăng nhập Google → Create API key).
//   2. Vercel → Project qlcv-app → Settings → Environment Variables → thêm:
//        GEMINI_API_KEY = <key vừa lấy>   (Environment: Production)
//   3. Frontend: thêm biến  VITE_AI_PROXY_URL=/api/ai-intent  vào Environment Variables của Vercel.
//   4. Deploy lại (Vercel tự deploy khi push, hoặc bấm Redeploy). Xong!
//   Chưa làm bước 3 thì trợ lý vẫn chạy 100% bằng bộ nội bộ (không đổi gì).
//
// LƯU Ý RIÊNG TƯ: chỉ CÂU CHỮ người dùng gõ được gửi tới Google; không gửi dữ liệu nhiệm vụ/nhân sự.
// Câu hỏi có thể chứa TÊN nhân viên (VD "điểm của Trương Thanh Tài") — cơ quan cân nhắc trước khi bật.

const SYS = `Bạn là bộ PHÂN TÍCH Ý ĐỊNH cho phần mềm quản lý giao việc tiếng Việt.
Đọc câu hỏi người dùng, trả về DUY NHẤT một object JSON mô tả ý định, KHÔNG giải thích, KHÔNG văn bản thừa.
Các trường (để null/bỏ nếu không có):
- status: "pending_approval" (chờ duyệt/chờ ký) | "overdue" (quá hạn/trễ) | "completed" (đã xong) | "in_progress" (đang làm) | null
- metric: "score" (điểm/xếp loại/hiệu suất) | "ontime" (đúng hạn/tin cậy) | "speed" (nhanh/tốc độ) | "load" (quá tải/ôm nhiều việc) | "free" (rảnh) | null
- order: "asc" (ít/thấp/kém nhất) | "desc" (nhiều/cao/tốt nhất) | null
- subject: "people" (hỏi ai/người nào) | "dept" (hỏi phòng nào) | "org" (toàn cơ quan) | null
- late (bool), wantList (bool: muốn liệt kê danh sách việc), countQ (bool: hỏi số lượng), totalQ, avg (trung bình),
  compare (so sánh 2 người), guide (hỏi cách dùng phần mềm), create (muốn tạo việc), search (tìm việc theo từ khoá),
  upcoming (việc sắp trễ), superl (có chữ "nhất"), hasViec (nhắc "việc"/"nhiệm vụ")
- threshold: { "op": ">"|"<", "n": số } nếu có "hơn/dưới N việc", ngược lại null
Ví dụ: {"status":"overdue","subject":"people","order":"desc","late":true,"superl":true}`;

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ slots: null }); return; }
  try {
    const question = (req.body && req.body.question) || "";
    if (!question || typeof question !== "string") { res.status(200).json({ slots: null }); return; }
    const key = process.env.GEMINI_API_KEY;
    if (!key) { res.status(200).json({ slots: null, error: "missing key" }); return; }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYS }] },
        contents: [{ role: "user", parts: [{ text: String(question).slice(0, 300) }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 300, responseMimeType: "application/json" },
      }),
    });
    if (!r.ok) { res.status(200).json({ slots: null }); return; }
    const data = await r.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const m = text.match(/\{[\s\S]*\}/);
    let slots = null;
    if (m) { try { slots = JSON.parse(m[0]); } catch { slots = null; } }
    res.status(200).json({ slots });
  } catch {
    res.status(200).json({ slots: null });
  }
}
