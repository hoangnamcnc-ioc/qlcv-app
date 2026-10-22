// Gợi ý hạn chót THỰC TẾ dựa trên lịch sử: các việc tương tự (theo tiêu đề) đã hoàn thành mất bao nhiêu ngày.
// Thuần (có test). Không dùng AI — chỉ thống kê từ dữ liệu của chính cơ quan.
const STOP = new Set(["và", "của", "cho", "về", "các", "việc", "thực", "hiện", "trong", "tại", "để", "với", "theo", "một", "những", "được", "này", "có", "là", "đến", "từ", "nhiệm", "vụ"]);

export const normTokens = title => new Set(
  (title || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(w => w.length >= 2 && !STOP.has(w))
);
export const similarity = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};
// Độ PHỦ: tỉ lệ từ chung so với tiêu đề NGẮN hơn — tiêu đề gốc rất dài (có đoạn "theo quy định đối với ...") không làm loãng
// kết quả khi người dùng gõ bản ngắn. Kèm yêu cầu tối thiểu `minInter` từ chung để không khớp bừa vì 1-2 từ chung chung.
export const overlap = (a, b) => {
  if (!a.size || !b.size) return { inter: 0, score: 0 };
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return { inter, score: inter / Math.min(a.size, b.size) };
};
const dayDiff = (fromYMD, toISO) => Math.round((Date.parse(String(toISO).slice(0, 10) + "T00:00:00Z") - Date.parse(fromYMD + "T00:00:00Z")) / 86400000);

// pool: các việc (KHÔNG định kỳ) đã hoàn thành có created + completed_at. Trả { days, n } hoặc null nếu chưa đủ dữ liệu.
export function suggestDuration(title, pool, { minSim = 0.6, minInter = 3, minN = 3, maxN = 20 } = {}) {
  const q = normTokens(title);
  if (q.size < minInter) return null;
  const sims = [];
  for (const t of pool || []) {
    if (!t.created || !t.completed_at) continue;
    const d = dayDiff(t.created, t.completed_at);
    if (!(d >= 0 && d <= 180)) continue;
    const { inter, score } = overlap(q, normTokens(t.title));
    if (inter >= minInter && score >= minSim) sims.push({ s: score, d: Math.max(1, d) });
  }
  if (sims.length < minN) return null;
  const top = sims.sort((a, b) => b.s - a.s).slice(0, maxN).map(x => x.d).sort((a, b) => a - b);
  const mid = top.length >> 1;
  const median = top.length % 2 ? top[mid] : (top[mid - 1] + top[mid]) / 2;
  return { days: Math.max(1, Math.ceil(median)), n: top.length };
}

// Hạn đề xuất = hôm nay + số ngày, dời sang thứ Hai nếu rơi vào thứ Bảy/Chủ nhật.
export function suggestDeadline(todayStr, days) {
  const d = new Date(todayStr + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
