// PHIẾU XẾP LOẠI CHẤT LƯỢNG VIÊN CHỨC (mẫu của đơn vị) — dựng từ dữ liệu QLCV. Hàm thuần: nhận dữ liệu, trả HTML.
import { COMMON_SECTIONS, sectionScore, roundTotal, commonFinal, gradeFor, GRADE_LABEL } from "./kpiFramework.js";

const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f1 = x => (x == null || Number.isNaN(x) ? "" : String(Math.round(x * 10) / 10).replace(".", ","));
const f2 = x => (x == null || Number.isNaN(x) ? "" : String(Math.round(x * 100) / 100).replace(".", ","));
const parse = v => { if (!v) return null; if (typeof v === "object") return v; try { return JSON.parse(v); } catch { return null; } };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

export const UNIT_NAME = "Trung tâm Giám sát, điều hành đô thị thông minh tỉnh Đắk Lắk";
export const TASK_SECTIONS = [
  { no: "I", title: "Về số lượng thể hiện mức độ hoàn thành sản phẩm, công việc thuộc nhiệm vụ được phân công", key: "qty" },
  { no: "II", title: "Về chất lượng thể hiện mức độ đáp ứng tiêu chuẩn, mục đích, yêu cầu, hiệu quả của sản phẩm", key: "quality" },
  { no: "III", title: "Về tiến độ thể hiện mức độ bảo đảm về thời gian trong quá trình thực hiện nhiệm vụ", key: "progress" },
];

// Gom điểm tiêu chí chung trong năm: trung bình theo từng tiêu chí của các tháng có dữ liệu.
export function aggregateCommon(rows, eid, year, round) {
  const items = {}, secs = {}, totals = [];
  const mine = (rows || []).filter(r => r.eid === eid && r.year === year);
  const src = mine.map(r => parse(r[round])).filter(Boolean);
  for (const s of COMMON_SECTIONS) {
    for (const it of s.items) {
      const v = src.map(x => x.items?.[it.id]).map(Number).filter(Number.isFinite);
      if (v.length) items[it.id] = mean(v.map(x => Math.max(0, Math.min(x, it.max))));
    }
    const sv = src.map(x => sectionScore(x, s)).filter(v => v != null);
    if (sv.length) secs[s.k] = mean(sv);
  }
  for (const x of src) { const t = roundTotal(x); if (t != null) totals.push(t); }
  return { items, secs, total: totals.length ? mean(totals) : null, months: src.length };
}

// Điểm chính thức (lượt cao nhất đã có mỗi tháng), trung bình trong năm
export function officialCommon(rows, eid, year) {
  const t = (rows || []).filter(r => r.eid === eid && r.year === year).map(r => commonFinal({ self: parse(r.self), dept: parse(r.dept), center: parse(r.center) })).filter(Boolean).map(c => c.total);
  return t.length ? mean(t) : null;
}

// perMonth: [{ month1, resolved, done, onTime, completedLate, over, breakdown:{qty,progress,quality} }] — các tháng có việc đến hạn
export function buildTaskSections(perMonth, evalWeight = 70) {
  const secMax = evalWeight / 3;
  const totalW = perMonth.reduce((s, m) => s + m.resolved, 0);
  const secs = TASK_SECTIONS.map(sec => {
    const subs = perMonth.map(m => {
      const max = totalW ? secMax * m.resolved / totalW : 0;
      const pct = m.breakdown?.[sec.key] ?? 0;
      return { label: subLabel(sec.key, m), max, pts: max * pct / 100 };
    });
    return { ...sec, max: secMax, pts: subs.reduce((s, x) => s + x.pts, 0), subs };
  });
  return { secs, total: secs.reduce((s, x) => s + x.pts, 0), max: evalWeight };
}
function subLabel(key, m) {
  const t = `Tháng ${m.month1}`;
  const d = f1(m.done), r = f1(m.resolved), b = m.breakdown || {};
  if (key === "qty") return `${t}: hoàn thành ${d}/${r} sản phẩm quy đổi (đạt ${f1(b.qty)}%)`;
  if (key === "progress") return `${t}: ${f1(m.onTime)} đúng hạn, ${f1(m.completedLate)} trễ hạn, ${f1(m.over)} quá hạn (đạt ${f1(b.progress)}%)`;
  return `${t}: chất lượng sản phẩm đạt ${f1(b.quality)}% (xét số lần làm lại và mức nghiệm thu)`;
}

// Nhận xét tự động từ số liệu (người dùng có thể sửa trong Word)
export function autoNotes(perMonth) {
  const sum = k => perMonth.reduce((s, m) => s + (m[k] || 0), 0);
  const res = sum("resolved"), ot = sum("onTime"), late = sum("completedLate"), over = sum("over");
  const wavg = k => (res ? perMonth.reduce((s, m) => s + (m.breakdown?.[k] || 0) * m.resolved, 0) / res : 0);
  const pros = [], cons = [], fix = [];
  if (!res) return { pros: ["- (Chưa có dữ liệu công việc đến hạn trong năm.)"], cons: [], fix: [] };
  pros.push(`- Hoàn thành ${f1(sum("done"))}/${f1(res)} sản phẩm/công việc quy đổi được giao trong năm (đạt ${f1(wavg("qty"))}%).`);
  if (ot / res >= 0.85) pros.push(`- Chủ động bảo đảm tiến độ: ${f1(ot / res * 100)}% khối lượng hoàn thành đúng hạn.`);
  if (wavg("quality") >= 90) pros.push("- Chất lượng sản phẩm ổn định, ít phải chỉnh sửa, làm lại.");
  if (perMonth.length >= 3) pros.push(`- Duy trì kết quả công việc đều đặn qua ${perMonth.length} tháng được theo dõi.`);
  if (late > 0) cons.push(`- Có ${f1(late)} sản phẩm/công việc quy đổi hoàn thành trễ hạn.`);
  if (over > 0) cons.push(`- Còn ${f1(over)} sản phẩm/công việc quy đổi quá hạn chưa hoàn thành.`);
  if (wavg("quality") < 85) cons.push("- Một số sản phẩm phải chỉnh sửa/làm lại hoặc chưa đạt mức nghiệm thu cao.");
  if (!cons.length) cons.push("- Chưa ghi nhận hạn chế đáng kể từ số liệu theo dõi trong năm.");
  if (late > 0 || over > 0) fix.push("- Lập kế hoạch và theo dõi tiến độ chặt chẽ hơn; chủ động báo cáo sớm khi có vướng mắc để được hỗ trợ.");
  if (wavg("quality") < 85) fix.push("- Rà soát kỹ nội dung trước khi trình duyệt, nâng cao chất lượng sản phẩm ngay từ lần đầu.");
  if (!fix.length) fix.push("- Tiếp tục phát huy; chủ động đề xuất sáng kiến, giải pháp nâng cao hiệu quả công việc.");
  return { pros, cons, fix };
}

const CSS = `body{font-family:"Times New Roman",serif;font-size:13pt;color:#000;line-height:1.3}
.page{page-break-after:always}.page:last-child{page-break-after:auto}
table{border-collapse:collapse;width:100%}td,th{vertical-align:top;padding:3px 5px}
.grid td,.grid th{border:1px solid #000}.c{text-align:center}.r{text-align:right}.b{font-weight:bold}
h4{font-size:14pt;margin:10px 0 4px}p{margin:2px 0}.sub td{font-size:12.5pt}
@page{size:A4;margin:2cm 2cm 2cm 3cm}`;

// data = { year, name, role, dept, common:{self,official}, task:{secs,total,max}, notes, evalWeight, mins }
export function buildPhieuBody(data) {
  const { year, name, role, dept, common, task, notes, mins } = data;
  const selfOK = common.self.total != null;
  const cTotal = selfOK ? common.self.total : (common.official ?? null);
  const grand = task && task.secs.length ? (cTotal ?? 0) + task.total : null;
  const grade = cTotal != null && grand != null ? gradeFor(grand, mins) : null;
  const box = g => (grade === g ? "☑" : "□");
  const head = `<table style="margin-bottom:6px"><tr>
    <td class="c" style="width:42%;font-size:13pt">SỞ KHOA HỌC VÀ CÔNG NGHỆ ĐẮK LẮK<br><b>TRUNG TÂM GIÁM SÁT, ĐIỀU HÀNH<br>ĐÔ THỊ THÔNG MINH</b></td>
    <td class="c" style="font-size:13pt"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>Độc lập - Tự do - Hạnh phúc</b></td></tr></table>`;
  let ct = `<table class="grid"><tr class="b c"><td style="width:6%">TT</td><td>Tiêu chí chấm điểm</td><td style="width:11%">Điểm tối đa</td><td style="width:14%">Điểm do cá nhân tự chấm</td></tr>`;
  for (const s of COMMON_SECTIONS) {
    ct += `<tr class="b"><td class="c">${s.label.split(".")[0]}</td><td>${esc(s.label.replace(/^[IVX]+\.\s*/, ""))}</td><td class="c">${f1(s.max)}</td><td class="c">${f1(common.self.secs[s.k])}</td></tr>`;
    for (const it of s.items) ct += `<tr class="sub"><td class="c">${it.id.split(".")[1]}</td><td>${esc(it.label)}</td><td class="c">${f1(it.max)}</td><td class="c">${f1(common.self.items[it.id])}</td></tr>`;
  }
  ct += `<tr class="b"><td colspan="2" class="c">Tổng cộng</td><td class="c">30</td><td class="c">${f1(common.self.total)}</td></tr></table>`;
  let tt = `<table class="grid"><tr class="b c"><td style="width:6%">TT</td><td>Tiêu chí chấm điểm</td><td style="width:11%">Điểm tối đa</td><td style="width:14%">Điểm do cá nhân tự chấm</td></tr>`;
  if (task && task.secs.length) {
    for (const s of task.secs) {
      tt += `<tr class="b"><td class="c">${s.no}</td><td>${esc(s.title)}</td><td class="c">${f2(s.max)}</td><td class="c">${f2(s.pts)}</td></tr>`;
      s.subs.forEach((x, i) => { tt += `<tr class="sub"><td class="c">${i + 1}</td><td>${esc(x.label)}</td><td class="c">${f2(x.max)}</td><td class="c">${f2(x.pts)}</td></tr>`; });
    }
    tt += `<tr class="b"><td colspan="2" class="c">Tổng cộng Mục 2</td><td class="c">${f1(task.max)}</td><td class="c">${f2(task.total)}</td></tr></table>`;
  } else tt += `<tr><td colspan="4" class="c">Chưa có dữ liệu công việc đến hạn trong năm ${year}.</td></tr></table>`;
  const list = a => (a || []).map(x => `<p style="text-align:justify">${esc(x)}</p>`).join("");
  const dots = Array.from({ length: 7 }, () => `<p>${".".repeat(110)}</p>`).join("");
  const totalLine = grand != null
    ? `Tổng điểm: ${f1(cTotal ?? 0)} điểm (tiêu chí chung) + ${f2(task.total)} điểm (kết quả thực hiện nhiệm vụ) = <b>${f2(grand)} điểm</b>.${cTotal == null ? " (Chưa có điểm tiêu chí chung.)" : ""}`
    : "Tổng điểm: chưa đủ dữ liệu.";
  const offLine = common.official != null && selfOK && Math.abs(common.official - common.self.total) > 0.05
    ? `<p style="font-size:12pt"><i>Điểm tiêu chí chung do lãnh đạo chấm (chính thức): ${f1(common.official)}/30.</i></p>` : "";
  return `<div class="page">${head}
<p class="c b" style="font-size:14pt;margin-top:10px">PHIẾU XẾP LOẠI CHẤT LƯỢNG VIÊN CHỨC<br>Năm ${year}</p>
<p style="font-size:14pt"><b>Họ và tên:</b> ${esc(name)}</p>
<p style="font-size:14pt"><b>Chức vụ, chức danh:</b> ${esc(role)}</p>
<p style="font-size:14pt"><b>Đơn vị công tác:</b> ${esc(dept ? dept + " — " + UNIT_NAME : UNIT_NAME)}</p>
<h4>I. TỔNG HỢP KẾT QUẢ THEO DÕI, ĐÁNH GIÁ</h4>
<h4>1. Kết quả theo dõi, đánh giá theo tiêu chí chung (tối đa 30 điểm):</h4>${ct}
<h4>2. Kết quả theo dõi, đánh giá theo tiêu chí kết quả thực hiện nhiệm vụ (tối đa 70 điểm):</h4>${tt}
<h4>3. Tổng điểm theo dõi, đánh giá trong năm:</h4><p>${totalLine}</p>${offLine}
<h4>4. Ưu điểm:</h4>${list(notes.pros)}
<h4>5. Hạn chế:</h4>${list(notes.cons)}
<h4>6. Hướng khắc phục:</h4>${list(notes.fix)}
<h4>II. VIÊN CHỨC TỰ ĐÁNH GIÁ, XẾP LOẠI CHẤT LƯỢNG</h4>
<p>${box("excellent")} ${GRADE_LABEL.excellent}.</p><p>${box("good")} ${GRADE_LABEL.good}</p><p>${box("pass")} ${GRADE_LABEL.pass}</p><p>${box("fail")} ${GRADE_LABEL.fail}</p>
<h4>III. KẾT QUẢ XẾP LOẠI CHẤT LƯỢNG VIÊN CHỨC CỦA CẤP CÓ THẨM QUYỀN</h4>
<p>□ ${GRADE_LABEL.excellent}</p><p>□ ${GRADE_LABEL.good}</p><p>□ ${GRADE_LABEL.pass}</p><p>□ ${GRADE_LABEL.fail}</p>
<h4>IV. Ý KIẾN NHẬN XÉT CỦA CẤP CÓ THẨM QUYỀN VÀ ĐỀ XUẤT PHƯƠNG ÁN XỬ LÝ</h4>${dots}
<table style="margin-top:14px"><tr>
<td class="c">....., ngày ....tháng....năm.....<br><b>VIÊN CHỨC TỰ XẾP LOẠI</b><br><i>(Ký tên, ghi rõ họ tên)</i></td>
<td class="c">....., ngày ....tháng....năm.....<br><b>LÃNH ĐẠO ĐƠN VỊ</b><br><i>(Ký tên, ghi rõ họ tên)</i></td></tr></table></div>`;
}

export const wrapHtml = (bodies, title = "Phiếu xếp loại") =>
  `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${bodies.join("")}</body></html>`;
