// CẤU HÌNH HỆ SỐ ĐIỂM KPI — chỉnh được ở Quản lý nhân sự. Công thức vẫn nằm ở scoring.js; ở đây chỉ là các HỆ SỐ.
// Lưu theo PHIÊN BẢN có "áp dụng từ tháng" (app_config key="kpi_formula"): tháng nào dùng bộ hệ số của phiên bản
// có from ≤ tháng đó → đổi hệ số KHÔNG làm đổi điểm các tháng trước. Mặc định = đúng công thức đang chạy.
export const KPI_DEFAULT = {
  timelinessMax: 60, qualityMax: 40, lateFactor: 0.5, overduePenaltyMax: 10, minResolved: 5,
  staffBonusFrom: 15, staffBonusPerTask: 1, staffBonusMax: 10, prioBonusPer: 0.5, prioBonusMax: 5,
  mgrBonusFrom: 10, mgrBonusMax: 10, slowPenaltyMax: 10,
  // Quy đổi 1 lần tạo nhiệm vụ định kỳ = bao nhiêu "việc" (gắn vào việc LÚC SINH RA → chỉ tác động việc sinh sau khi đổi)
  freq_daily: 0.25, freq_weekly: 1, freq_biweekly: 1.5, freq_monthly: 2.5, freq_quarterly: 3, freq_semiannual: 3, freq_yearly: 3,
};
// Cài đặt TOÀN CỤC (không theo phiên bản): mốc bắt đầu xếp loại + ngưỡng xếp loại cuối kỳ.
export const KPI_GLOBAL_DEFAULT = { gradingStart: "2026-07", excellent: 90, good: 75, pass: 50 };
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
  { k: "timelinessMax", g: "chung", label: "Điểm tối đa — Thời hạn", hint: "Việc hoàn thành đúng hạn được trọn số điểm này", min: 10, max: 90, step: 1 },
  { k: "qualityMax", g: "chung", label: "Điểm tối đa — Chất lượng", hint: "Theo mức nghiệm thu (Xuất sắc…Kém)", min: 10, max: 90, step: 1 },
  { k: "lateFactor", g: "chung", label: "Hệ số việc hoàn thành TRỄ", hint: "0 = như quá hạn · 0,5 = nửa điểm thời hạn · 1 = như đúng hạn", min: 0, max: 1, step: 0.05 },
  { k: "overduePenaltyMax", g: "chung", label: "Trừ tối đa vì quá hạn tồn đọng", hint: "Tính theo tỷ lệ việc quá hạn chưa xong", min: 0, max: 30, step: 1 },
  { k: "minResolved", g: "chung", label: "Số việc tối thiểu để được xếp hạng", hint: "Quy đổi theo trọng số, đã đến hạn trong tháng", min: 1, max: 30, step: 1 },
  { k: "staffBonusFrom", g: "staff", label: "Thưởng khối lượng — bắt đầu từ việc thứ", hint: "Chỉ việc vượt mốc này mới được thưởng", min: 1, max: 100, step: 1 },
  { k: "staffBonusPerTask", g: "staff", label: "Thưởng khối lượng — điểm mỗi việc vượt", hint: "", min: 0, max: 5, step: 0.1 },
  { k: "staffBonusMax", g: "staff", label: "Thưởng khối lượng — tối đa", hint: "", min: 0, max: 20, step: 1 },
  { k: "prioBonusPer", g: "staff", label: "Thưởng việc ưu tiên cao đúng hạn — mỗi việc", hint: "", min: 0, max: 5, step: 0.1 },
  { k: "prioBonusMax", g: "staff", label: "Thưởng việc ưu tiên cao — tối đa", hint: "", min: 0, max: 20, step: 1 },
  { k: "mgrBonusFrom", g: "mgr", label: "Thưởng điều hành — mốc việc bình quân/người", hint: "Vượt mốc mới được thưởng (1 điểm / việc vượt)", min: 1, max: 50, step: 1 },
  { k: "mgrBonusMax", g: "mgr", label: "Thưởng điều hành — tối đa", hint: "", min: 0, max: 20, step: 1 },
  { k: "slowPenaltyMax", g: "mgr", label: "Trừ tối đa vì CHẬM DUYỆT", hint: "Theo tỷ lệ lượt duyệt chậm hơn 1 ngày làm việc", min: 0, max: 30, step: 1 },
  { k: "freq_daily", g: "freq", label: "Hàng ngày", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_weekly", g: "freq", label: "Hàng tuần", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_biweekly", g: "freq", label: "2 tuần/lần", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_monthly", g: "freq", label: "Hàng tháng", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_quarterly", g: "freq", label: "Hàng quý", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_semiannual", g: "freq", label: "6 tháng/lần", hint: "", min: 0.05, max: 10, step: 0.05 },
  { k: "freq_yearly", g: "freq", label: "Hàng năm", hint: "", min: 0.05, max: 10, step: 0.05 },
];
export const KPI_GROUPS = { chung: "Chung (cá nhân & điều hành)", staff: "Điểm cá nhân (nhân viên/chuyên viên)", mgr: "Điểm điều hành (Trưởng/Phó phòng)", freq: "Hệ số quy đổi việc định kỳ (chỉ áp dụng cho việc sinh ra SAU khi đổi)" };

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
  if (c.timelinessMax + c.qualityMax > 100) errs.push("Điểm Thời hạn + Chất lượng không được vượt 100");
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
