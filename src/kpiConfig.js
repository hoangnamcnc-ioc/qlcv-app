// CẤU HÌNH HỆ SỐ ĐIỂM KPI — chỉnh được ở Quản lý nhân sự. Công thức vẫn nằm ở scoring.js; ở đây chỉ là các HỆ SỐ.
// Lưu theo PHIÊN BẢN có "áp dụng từ tháng" (app_config key="kpi_formula"): tháng nào dùng bộ hệ số của phiên bản
// có from ≤ tháng đó → đổi hệ số KHÔNG làm đổi điểm các tháng trước. Mặc định = đúng công thức đang chạy.
export const KPI_DEFAULT = {
  timelinessMax: 60, qualityMax: 40, lateFactor: 0.5, overduePenaltyMax: 10, minResolved: 5,
  staffBonusFrom: 15, staffBonusPerTask: 1, staffBonusMax: 10, prioBonusPer: 0.5, prioBonusMax: 5,
  mgrBonusFrom: 10, mgrBonusMax: 10, slowPenaltyMax: 10,
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
];
export const KPI_GROUPS = { chung: "Chung (cá nhân & điều hành)", staff: "Điểm cá nhân (nhân viên/chuyên viên)", mgr: "Điểm điều hành (Trưởng/Phó phòng)" };

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
