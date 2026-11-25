// CẤU HÌNH HỆ SỐ ĐIỂM KPI — chỉnh được ở Quản lý nhân sự. Công thức vẫn nằm ở scoring.js; ở đây chỉ là các HỆ SỐ.
// Lưu theo PHIÊN BẢN có "áp dụng từ tháng" (app_config key="kpi_formula"): tháng nào dùng bộ hệ số của phiên bản
// có from ≤ tháng đó → đổi hệ số KHÔNG làm đổi điểm các tháng trước. Mặc định = đúng công thức đang chạy.
export const KPI_DEFAULT = {
  commonMax: 30, evalWeight: 70, lateDayPenalty: 0.25, reworkPenalty: 0.25, ratingWeight: 0.3, minResolved: 5, minWeight: 1,
  // Quy đổi 1 lần tạo nhiệm vụ định kỳ = bao nhiêu "việc" (gắn vào việc LÚC SINH RA → chỉ tác động việc sinh sau khi đổi)
  freq_daily: 0.25, freq_weekly: 1, freq_biweekly: 1.5, freq_monthly: 2.5, freq_quarterly: 3, freq_semiannual: 3, freq_yearly: 3,
  // Hệ số quy đổi MẶC ĐỊNH theo nhóm N1–N5 cho việc KHÔNG có trong danh mục (lấy theo trung vị danh mục chung của đơn vị)
  grp_N1: 0.2, grp_N2: 2.4, grp_N3: 9.6, grp_N4: 19.2, grp_N5: 48,
  // Hỗ trợ người dùng: khó / trung bình / nhanh (cùng thang với danh mục)
  sup_hard: 2.4, sup_medium: 1.2, sup_easy: 0.2,
};
// Cài đặt TOÀN CỤC (không theo phiên bản): mốc bắt đầu xếp loại + ngưỡng xếp loại cuối kỳ.
export const KPI_GLOBAL_DEFAULT = { gradingStart: "2026-07", excellent: 90, good: 70, pass: 50 };
export const normalizeKpiGlobal = g => {
  const o = { ...KPI_GLOBAL_DEFAULT };
  if (g && /^\d{4}-\d{2}$/.test(g.gradingStart || "")) o.gradingStart = g.gradingStart;
  for (const k of ["excellent", "good", "pass"]) if (g && g[k] !== "" && g[k] != null && Number.isFinite(Number(g[k]))) o[k] = Number(g[k]);
  return o;
};
export const validateKpiGlobal = g => {
  const errs = [];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(g.gradingStart || "")) errs.push("Tháng bắt đầu xếp loại không hợp lệ");
  if (!(g.excellent <= 100 && g.excellent > g.good && g.good > g.pass && g.pass >= 0)) errs.push("Ngưỡng phải thỏa: 100 ≥ Xuất sắc > Tốt > Hoàn thành ≥ 0");
  return errs;
};
// group: chung | staff | mgr
export const KPI_SCHEMA = [
  { k: "commonMax", g: "chung", label: "Điểm tối đa — Tiêu chí chung", hint: "Khung đơn vị: 30 (3 phần × 10). Phần nhiệm vụ = 100 − số này", min: 0, max: 50, step: 1 },
  { k: "evalWeight", g: "chung", label: "Trọng số — Đánh giá nhiệm vụ (%)", hint: "Khung đơn vị: 70", min: 50, max: 100, step: 1 },
  { k: "lateDayPenalty", g: "chung", label: "Trừ tiến độ — mỗi ngày chậm (tỷ lệ giá trị sản phẩm)", hint: "Khung đơn vị: 0,25 (= 25%/ngày)", min: 0, max: 1, step: 0.05 },
  { k: "reworkPenalty", g: "chung", label: "Trừ chất lượng — mỗi lần phải làm lại", hint: "Khung đơn vị: 0,25 (= 25%/lần)", min: 0, max: 1, step: 0.05 },
  { k: "ratingWeight", g: "chung", label: "Chất lượng — trọng số mức nghiệm thu", hint: "0 = chỉ tính số lần làm lại (đúng khung) · 0,3 = 30% theo mức Xuất sắc/Tốt/TB/Kém (chưa chấm = Tốt)", min: 0, max: 1, step: 0.05 },
  { k: "minResolved", g: "chung", label: "Số việc tối thiểu để được xếp hạng", hint: "Đếm số việc/sản phẩm đã đến hạn trong tháng (không phụ thuộc hệ số)", min: 1, max: 30, step: 1 },
  { k: "minWeight", g: "chung", label: "Và tổng khối lượng quy đổi tối thiểu", hint: "Tránh người chỉ có vài việc rất nhỏ được xếp hạng", min: 0, max: 50, step: 0.5 },
  { k: "freq_daily", g: "freq", label: "Hàng ngày", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_weekly", g: "freq", label: "Hàng tuần", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_biweekly", g: "freq", label: "2 tuần/lần", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_monthly", g: "freq", label: "Hàng tháng", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_quarterly", g: "freq", label: "Hàng quý", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_semiannual", g: "freq", label: "6 tháng/lần", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_yearly", g: "freq", label: "Hàng năm", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "grp_N1", g: "grp", label: "Nhóm N1 — đơn giản, lặp lại, có biểu mẫu", hint: "Trung vị danh mục chung: 0,2", min: 0.05, max: 200, step: 0.05 },
  { k: "grp_N2", g: "grp", label: "Nhóm N2 — chuyên môn thường xuyên, có quy trình", hint: "Trung vị danh mục chung: 2,4", min: 0.05, max: 200, step: 0.05 },
  { k: "grp_N3", g: "grp", label: "Nhóm N3 — nghiên cứu, báo cáo chuyên đề", hint: "Trung vị danh mục chung: 9,6", min: 0.05, max: 200, step: 0.05 },
  { k: "grp_N4", g: "grp", label: "Nhóm N4 — xây dựng văn bản quy phạm, kế hoạch mới", hint: "Trung vị danh mục chung: 19,2", min: 0.05, max: 200, step: 0.05 },
  { k: "grp_N5", g: "grp", label: "Nhóm N5 — chiến lược, đề án lớn", hint: "Trung vị danh mục chung: 48", min: 0.05, max: 200, step: 0.05 },
  { k: "sup_hard", g: "sup", label: "Hỗ trợ — trường hợp KHÓ", hint: "Mỗi lượt hỗ trợ người dùng được ghi nhận = số này (luôn đúng hạn)", min: 0.05, max: 50, step: 0.05 },
  { k: "sup_medium", g: "sup", label: "Hỗ trợ — trường hợp TRUNG BÌNH", hint: "", min: 0.05, max: 50, step: 0.05 },
  { k: "sup_easy", g: "sup", label: "Hỗ trợ — trường hợp NHANH", hint: "", min: 0.05, max: 50, step: 0.05 },
];
export const KPI_GROUPS = { chung: "Công thức KPI (khung đơn vị)", freq: "Hệ số mặc định việc định kỳ chưa gắn sản phẩm chuẩn (chỉ áp dụng cho việc sinh ra SAU khi đổi)", grp: "Hệ số mặc định theo nhóm N1–N5 (việc ngoài danh mục, chờ đưa vào danh mục)", sup: "Hỗ trợ người dùng" };

// Hệ số mặc định của nhóm N1–N5 (việc ngoài danh mục) và của 1 lượt hỗ trợ người dùng.
export const groupCoefCfg = (cfg, grp) => { const v = cfg?.["grp_" + grp]; return Number.isFinite(v) ? v : cfg?.grp_N2 ?? 2.4; };
export const supportCoefCfg = (cfg, difficulty) => { const v = cfg?.["sup_" + difficulty]; return Number.isFinite(v) ? v : cfg?.sup_medium ?? 1.2; };
export const freqWeightCfg = (cfg, freq) => { const v = cfg?.["freq_" + freq]; return Number.isFinite(v) ? v : 1; };
// Hợp nhất với mặc định, bỏ khóa lạ / giá trị không phải số.
export const normalizeKpiCfg = c => {
  const out = { ...KPI_DEFAULT };
  for (const f of KPI_SCHEMA) { const v = Number(c?.[f.k]); if (c && c[f.k] !== "" && c[f.k] != null && Number.isFinite(v)) out[f.k] = v; }
  return out;
};
// Trả về danh sách lỗi (mảng chuỗi); rỗng = hợp lệ.
export const validateKpiCfg = c => {
  const errs = [];
  for (const f of KPI_SCHEMA) { const v = c[f.k]; if (!Number.isFinite(v) || v < f.min || v > f.max) errs.push(`"${f.label}" phải từ ${f.min} đến ${f.max}`); }
  if (Math.abs(c.commonMax + c.evalWeight - 100) > 0.001) errs.push("Điểm tiêu chí chung + trọng số đánh giá nhiệm vụ phải bằng 100");
  return errs;
};
// Số tháng đủ ĐK tối thiểu để được XẾP HẠNG NĂM chính thức = một nửa số tháng (đã kết thúc, từ mốc xếp loại) của năm đó, tối thiểu 1.
// Người ít tháng hơn ở nhóm "tạm tính" (không chen vào bảng, hết cảnh thiếu dữ liệu lại xếp trên người đủ dữ liệu).
export const rankMinMonths = (year, now = new Date(), inScope = () => true) => {
  const last = year < now.getFullYear() ? 12 : year === now.getFullYear() ? now.getMonth() : 0; // tháng đã kết thúc
  let n = 0; for (let m = 1; m <= last; m++) if (inScope(year, m)) n++;
  return Math.max(1, Math.ceil(n / 2));
};
const ym = (y, m1) => `${y}-${String(m1).padStart(2, "0")}`;
// versions = [{from:"YYYY-MM", cfg, by, at}]; trả hệ số áp dụng cho (năm, tháng 1-12).
export const kpiCfgFor = (versions, y, m1) => {
  const key = ym(y, m1); let best = null;
  for (const v of versions || []) if (v?.from && v.from <= key && (!best || v.from >= best.from)) best = v;
  return best ? normalizeKpiCfg(best.cfg) : KPI_DEFAULT;
};
// Thêm/ghi đè phiên bản có cùng tháng bắt đầu; giữ tối đa 60 bản.
export const addKpiVersion = (versions, from, cfg, by, at) => {
  const rest = (versions || []).filter(v => v.from !== from);
  return [...rest, { from, cfg: normalizeKpiCfg(cfg), by, at }].sort((a, b) => a.from.localeCompare(b.from)).slice(-60);
};
