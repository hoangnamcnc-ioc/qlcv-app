// Lịch trực còn phủ bao lâu? Cảnh báo khi lịch sắp hết để nhập lịch tháng sau kịp thời (module thuần, có test).
export const DUTY_WARN_DAYS = 10;
const diffDays = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);

// dateKeys: mảng 'YYYY-MM-DD' đã có lịch trực. Trả { last, daysLeft, warn }.
//  daysLeft = số ngày từ hôm nay tới ngày cuối cùng có lịch (<0 = lịch đã hết từ trước).
export function dutyCoverage(dateKeys, todayStr, warnDays = DUTY_WARN_DAYS) {
  const keys = (dateKeys || []).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
  if (!keys.length) return { last: null, daysLeft: null, warn: false };
  const last = keys.reduce((m, k) => (k > m ? k : m));
  const daysLeft = diffDays(last, todayStr);
  return { last, daysLeft, warn: daysLeft <= warnDays };
}
