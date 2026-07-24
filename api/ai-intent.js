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

const SYS = `Bạn là trợ lý cho phần mềm quản lý giao việc (tiếng Việt) của một cơ quan nhà nước.
Đọc câu hỏi người dùng và trả về DUY NHẤT một object JSON, KHÔNG giải thích ngoài JSON.

CÓ 2 TRƯỜNG HỢP:

A) Nếu câu hỏi VỀ DỮ LIỆU công việc/nhân sự (việc quá hạn, ai điểm cao, phòng nào, ai quá tải, việc tôi giao...):
   trả về {"type":"slots","slots":{...}} — chỉ mô tả Ý ĐỊNH, KHÔNG bịa số liệu (phần mềm tự tra dữ liệu thật).
   Các trường trong slots (để null/bỏ nếu không có):
   - status: "pending_approval"|"overdue"|"completed"|"in_progress"|null
   - metric: "score"|"ontime"|"speed"|"load"|"free"|null
   - order: "asc"(ít/kém nhất)|"desc"(nhiều/tốt nhất)|null
   - subject: "people"|"dept"|"org"|null
   - late, wantList, countQ, totalQ, avg, compare, guide (hỏi cách dùng phần mềm), create, search, upcoming, superl, hasViec (đều bool)
   - myAssigned (bool: hỏi "việc TÔI đã giao")
   - threshold: {"op":">"|"<","n":số} hoặc null

B) Nếu câu hỏi NGOÀI phạm vi dữ liệu phần mềm (kiến thức chung, tư vấn cách làm việc, soạn thảo văn bản, giải thích
   khái niệm, chào hỏi, câu xã giao...): trả về {"type":"answer","answer":"<câu trả lời tiếng Việt>"}.
   QUAN TRỌNG: nếu người dùng YÊU CẦU SOẠN/VIẾT một văn bản (đơn xin nghỉ phép, email, tờ trình, công văn, báo cáo,
   thông báo...), hãy VIẾT ĐẦY ĐỦ văn bản hoàn chỉnh ngay trong "answer" — KHÔNG chỉ mô tả cách viết. Thông tin còn
   thiếu thì tự ĐIỀN MẪU (VD: họ tên "Nguyễn Văn A", ngày "…/…/…", phòng "…") để người dùng thay sau. Xuống dòng bằng \\n.
   Trả lời đúng mực, phù hợp môi trường công sở nhà nước. Nếu là câu không thể/không nên trả lời, lịch sự từ chối ngắn gọn.
   Dựa vào các lượt hội thoại trước (nếu có) để hiểu câu nối tiếp như "viết giúp đi", "làm tiếp đi".

Ví dụ A: {"type":"slots","slots":{"status":"overdue","subject":"people","order":"desc","superl":true}}
Ví dụ B: {"type":"answer","answer":"Để viết một email xin nghỉ phép, bạn nên nêu rõ lý do, thời gian nghỉ và người thay thế..."}`;

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ slots: null }); return; }
  try {
    // Đọc body chắc chắn: một số cấu hình Vercel KHÔNG tự parse JSON → req.body là chuỗi (hoặc rỗng).
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== "object") {
      // Đọc thủ công từ stream nếu vẫn chưa có
      body = await new Promise((resolve) => { let d = ""; req.on("data", c => (d += c)); req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } }); req.on("error", () => resolve({})); });
    }
    const question = (body && body.question) || "";
    if (!question || typeof question !== "string") { res.status(200).json({ slots: null, error: "empty question" }); return; }
    const key = process.env.GEMINI_API_KEY;
    if (!key) { res.status(200).json({ slots: null, error: "missing GEMINI_API_KEY" }); return; }

    // Model dùng gói FREE. Có thể đổi qua biến môi trường GEMINI_MODEL nếu 1 model bị hết hạn ngạch.
    const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    // Ghép vài lượt hội thoại trước (nếu có) để AI hiểu câu nối tiếp; role chỉ nhận "user"/"model".
    const hist = Array.isArray(body.history) ? body.history.filter(h => h && typeof h.text === "string" && h.text.trim()).slice(-6).map(h => ({ role: h.role === "model" ? "model" : "user", parts: [{ text: String(h.text).slice(0, 600) }] })) : [];
    const contents = [...hist, { role: "user", parts: [{ text: String(question).slice(0, 600) }] }];
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYS }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 1400, responseMimeType: "application/json" },
      }),
    });
    if (!r.ok) { const detail = await r.text().catch(() => ""); res.status(200).json({ slots: null, error: "gemini " + r.status, detail: detail.slice(0, 300) }); return; }
    const data = await r.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const m = text.match(/\{[\s\S]*\}/);
    let obj = null;
    if (m) { try { obj = JSON.parse(m[0]); } catch { obj = null; } }
    // Kết quả có thể là {type:"slots",slots:{...}} (câu về dữ liệu) hoặc {type:"answer",answer:"..."} (câu chung)
    if (obj && obj.type === "answer" && typeof obj.answer === "string") { res.status(200).json({ answer: obj.answer }); return; }
    const slots = obj && obj.slots ? obj.slots : obj; // chấp nhận cả dạng slots lồng hoặc phẳng (tương thích cũ)
    res.status(200).json({ slots });
  } catch {
    res.status(200).json({ slots: null });
  }
}
