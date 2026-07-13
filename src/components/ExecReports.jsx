import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DEPTS, DEPT_COLOR, VI_MONTHS, RATING } from "../constants";
import { isCompletedStatus, parseNowStr } from "../helpers";
const RATING_KEYS = ["xuat_sac", "tot", "tb", "kem"];

// ── Ngưỡng xếp loại quý/năm (điểm trung bình các tháng đủ điều kiện) ──
// Ngưỡng tham khảo, thống nhất với thang màu điểm đang dùng trong Báo cáo; có thể điều chỉnh theo quy chế cơ quan.
const GRADES = [
  { min: 90, label: "Hoàn thành xuất sắc", col: "#15803d", bg: "#dcfce7" },
  { min: 75, label: "Hoàn thành tốt", col: "#1d4ed8", bg: "#dbeafe" },
  { min: 50, label: "Hoàn thành", col: "#92400e", bg: "#fef9c3" },
  { min: 0, label: "Không hoàn thành", col: "#b91c1c", bg: "#fee2e2" },
];
const gradeOf = (score) => GRADES.find(g => score >= g.min);

// ═════════ TAB "XẾP LOẠI" — sổ điểm đã chốt theo tháng + phiếu xếp loại quý/năm ═════════
export function GradingTab({ isMobile, inp, monthlyScores, snapshotMonth, currentUser }) {
  const now = new Date();
  const [gYear, setGYear] = useState(now.getFullYear());
  const [gPeriod, setGPeriod] = useState("year"); // "q1".."q4" | "year"
  const [snapMonth, setSnapMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth()); // mặc định: tháng trước (1-12)
  const [snapYear, setSnapYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [snapping, setSnapping] = useState(false);

  const periodMonths = useMemo(() => gPeriod === "year" ? [1,2,3,4,5,6,7,8,9,10,11,12] : (() => { const q = Number(gPeriod[1]); return [q*3-2, q*3-1, q*3]; })(), [gPeriod]);
  const periodLabel = gPeriod === "year" ? `năm ${gYear}` : `quý ${gPeriod[1]}/${gYear}`;

  // Gom sổ điểm theo nhân viên trong kỳ đã chọn — dùng tên/phòng lưu tại thời điểm chốt
  const rows = useMemo(() => {
    const byEid = new Map();
    for (const r of monthlyScores) {
      if (r.year !== gYear || !periodMonths.includes(r.month)) continue;
      let e = byEid.get(r.eid);
      if (!e) { e = { eid: r.eid, name: r.name, dept: r.dept, months: {} }; byEid.set(r.eid, e); }
      e.months[r.month] = r;
    }
    return [...byEid.values()].map(e => {
      const scored = periodMonths.map(m => e.months[m]).filter(r => r && r.eligible && r.score !== null);
      const avg = scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : null;
      return { ...e, avg, eligibleMonths: scored.length, grade: avg !== null ? gradeOf(avg) : null };
    }).sort((a, b) => {
      if ((a.avg === null) !== (b.avg === null)) return a.avg === null ? 1 : -1;
      return (b.avg ?? 0) - (a.avg ?? 0);
    });
  }, [monthlyScores, gYear, periodMonths]);

  const snapshotStatus = useMemo(() => periodMonths.map(m => ({ month: m, count: monthlyScores.filter(r => r.year === gYear && r.month === m).length })), [monthlyScores, gYear, periodMonths]);

  const doSnapshot = async () => { setSnapping(true); await snapshotMonth(snapYear, snapMonth - 1); setSnapping(false); };

  const printSheet = () => {
    const rowsHtml = rows.map((e, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${e.name}</td><td style="text-align:center">${e.dept}</td>${periodMonths.map(m => { const r = e.months[m]; return `<td style="text-align:center">${r ? (r.eligible ? r.score : "KĐK") : "—"}</td>`; }).join("")}<td style="text-align:center;font-weight:700">${e.avg ?? "—"}</td><td style="text-align:center;font-weight:600">${e.grade ? e.grade.label : "Chưa đủ dữ liệu"}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu xếp loại ${periodLabel}</title><style>body{font-family:"Times New Roman",serif;padding:28px;color:#111}h1{font-size:17px;text-align:center;text-transform:uppercase;margin-bottom:2px}h2{font-size:13px;text-align:center;font-weight:400;color:#444;margin-top:0}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12.5px}th,td{border:1px solid #333;padding:6px 8px}th{background:#f0f0f0}.sign{display:flex;justify-content:space-between;margin-top:36px;font-size:13px;text-align:center}.sign div{width:45%}.note{font-size:11.5px;color:#555;margin-top:12px;font-style:italic}@media print{button{display:none}}</style></head><body><h1>Phiếu tổng hợp xếp loại hiệu suất công việc</h1><h2>Trung tâm Giám sát, Điều hành Đô thị thông minh tỉnh Đắk Lắk — Kỳ đánh giá: ${periodLabel}</h2><table><thead><tr><th>TT</th><th>Họ và tên</th><th>Phòng</th>${periodMonths.map(m => `<th>T${m}</th>`).join("")}<th>Điểm TB</th><th>Xếp loại</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="note">Điểm lấy từ sổ điểm đã chốt hàng tháng (KĐK = tháng đó chưa đủ điều kiện chấm điểm, không tính vào trung bình). Ngưỡng xếp loại: ≥90 Hoàn thành xuất sắc · ≥75 Hoàn thành tốt · ≥50 Hoàn thành · &lt;50 Không hoàn thành.</div><div class="sign"><div>NGƯỜI LẬP BIỂU<br/><br/><br/><br/>${currentUser?.full_name || ""}</div><div>GIÁM ĐỐC<br/><br/><br/><br/></div></div><script>window.onload=()=>window.print()<\/script></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  };

  return (<>
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>📑 Xếp loại</span>
      <select value={gPeriod} onChange={e => setGPeriod(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 10px" }}>
        <option value="q1">Quý 1</option><option value="q2">Quý 2</option><option value="q3">Quý 3</option><option value="q4">Quý 4</option><option value="year">Cả năm</option>
      </select>
      <select value={gYear} onChange={e => setGYear(Number(e.target.value))} style={{ ...inp, width: 90, padding: "6px 10px" }}>{[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
      {rows.length > 0 && <button onClick={printSheet} style={{ padding: "6px 14px", border: "1px solid #fca5a5", borderRadius: 7, background: "#fef2f2", cursor: "pointer", fontSize: 12, color: "#dc2626", fontWeight: 500 }}>🖨 In phiếu xếp loại</button>}
    </div>

    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 16px" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>📌 Tình trạng chốt sổ trong kỳ</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {snapshotStatus.map(s => <span key={s.month} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: s.count ? "#dcfce7" : "#f3f4f6", color: s.count ? "#15803d" : "#9ca3af" }}>T{s.month}: {s.count ? `✓ ${s.count} NV` : "chưa chốt"}</span>)}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderTop: "1px dashed #e5e7eb", paddingTop: 10 }}>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Chốt sổ / chốt lại:</span>
        <select value={snapMonth} onChange={e => setSnapMonth(Number(e.target.value))} style={{ ...inp, width: "auto", padding: "5px 8px", fontSize: 12 }}>{VI_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select>
        <select value={snapYear} onChange={e => setSnapYear(Number(e.target.value))} style={{ ...inp, width: 84, padding: "5px 8px", fontSize: 12 }}>{[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
        <button onClick={doSnapshot} disabled={snapping} style={{ padding: "5px 14px", border: "none", borderRadius: 7, background: snapping ? "#d1d5db" : "#4f46e5", color: "#fff", cursor: snapping ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}>{snapping ? "Đang chốt…" : "📌 Chốt sổ"}</button>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Tháng vừa kết thúc được tự chốt khi BGĐ/Admin đăng nhập; chốt lại sẽ ghi đè theo dữ liệu hiện tại.</span>
      </div>
    </div>

    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#9ca3af" }}>Điểm lấy từ sổ đã chốt (không đổi khi dữ liệu sống bị sửa) · Điểm TB = trung bình các tháng đủ điều kiện · Ngưỡng: ≥90 HTXS · ≥75 HT tốt · ≥50 HT · &lt;50 KHT</div>
      {rows.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Chưa có tháng nào trong {periodLabel} được chốt sổ — dùng nút "📌 Chốt sổ" ở trên.</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead><tr style={{ background: "#f9fafb" }}>{["TT","Nhân viên","Phòng",...periodMonths.map(m => `T${m}`),"Điểm TB","Xếp loại"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((e, i) => (
              <tr key={e.eid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 10px", color: "#9ca3af" }}>{i + 1}</td>
                <td style={{ padding: "8px 10px", fontWeight: 500, whiteSpace: "nowrap" }}>{e.name}</td>
                <td style={{ padding: "8px 10px" }}><span style={{ background: DEPT_COLOR[e.dept] + "22", color: DEPT_COLOR[e.dept], fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>{e.dept}</span></td>
                {periodMonths.map(m => { const r = e.months[m]; return <td key={m} style={{ padding: "8px 10px", textAlign: "center", color: r ? (r.eligible ? (r.score >= 80 ? "#15803d" : r.score >= 50 ? "#92400e" : "#b91c1c") : "#9ca3af") : "#d1d5db", fontWeight: r?.eligible ? 700 : 400, fontSize: r?.eligible ? 13 : 11 }} title={r && !r.eligible ? `Chưa đủ điều kiện (${r.total} việc)` : ""}>{r ? (r.eligible ? r.score : "KĐK") : "—"}</td>; })}
                <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 800, fontSize: 14, color: e.avg === null ? "#9ca3af" : e.avg >= 80 ? "#15803d" : e.avg >= 50 ? "#92400e" : "#b91c1c" }}>{e.avg ?? "—"}</td>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{e.grade ? <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: e.grade.bg, color: e.grade.col }}>{e.grade.label}</span> : <span style={{ fontSize: 11, color: "#9ca3af" }}>Chưa đủ dữ liệu ({e.eligibleMonths} tháng ĐK)</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  </>);
}

// ═════════ TAB "ĐIỀU HÀNH" — góc nhìn BGĐ toàn đơn vị ═════════
export function ExecTab({ isMobile, computed, getEmp, setModal, loadComments, overloadThreshold = 5 }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  // So sánh tỷ lệ hoàn thành liên tháng giữa các phòng (6 tháng gần nhất)
  const deptTrend = useMemo(() => {
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear(), m = d.getMonth();
      const row = { name: `T${m + 1}/${String(y).slice(2)}` };
      for (const dept of DEPTS) {
        const mt = computed.filter(t => { const td = new Date(t.deadline); return td.getFullYear() === y && td.getMonth() === m && t.dept === dept; });
        row[dept] = mt.length ? Math.round(mt.filter(t => isCompletedStatus(t.status)).length / mt.length * 100) : null;
      }
      out.push(row);
    }
    return out;
  }, [computed, today]);

  // Top việc quá hạn lâu nhất toàn đơn vị — deadline phải chuẩn hoá về 00:00 giờ ĐỊA PHƯƠNG
  // (new Date("YYYY-MM-DD") parse ra 07:00 sáng giờ VN do hiểu là UTC, làm số ngày lệch mất 1)
  const atMidnight = s => { const d = new Date(s); d.setHours(0, 0, 0, 0); return d; };
  const topOverdue = useMemo(() => computed.filter(t => t.status === "overdue").map(t => ({ ...t, daysOver: Math.floor((today - atMidnight(t.deadline)) / 86400000) })).sort((a, b) => b.daysOver - a.daysOver).slice(0, 10), [computed, today]);

  // Tốc độ duyệt của từng người duyệt: thời gian trung bình từ lúc nhân viên yêu cầu đến lúc duyệt xong,
  // + số yêu cầu đang treo — đo cả phía quản lý chứ không chỉ đo nhân viên chậm.
  const approvalSpeed = useMemo(() => {
    const map = {};
    const ensure = n => (map[n] ??= { name: n, count: 0, hours: 0, pending: 0 });
    for (const t of computed) {
      if ((t.status === "completed" || t.status === "completed_late") && t.requested_at && t.rated_at && t.rated_by) {
        const a = parseNowStr(t.requested_at), b = parseNowStr(t.rated_at);
        if (!a || !b || isNaN(a) || isNaN(b) || b < a) continue;
        const r = ensure(t.rated_by); r.count++; r.hours += (b - a) / 3600000;
      }
      if (t.status === "pending_approval") {
        const owner = t.forwarded_by || t.created_by_name;
        if (owner) ensure(owner).pending++;
      }
    }
    return Object.values(map).map(r => ({ ...r, avgH: r.count ? r.hours / r.count : null }))
      .sort((a, b) => b.pending - a.pending || (b.avgH ?? 0) - (a.avgH ?? 0));
  }, [computed]);
  const fmtDur = h => h === null ? "—" : h < 1 ? "< 1 giờ" : h < 48 ? `${Math.round(h)} giờ` : `${Math.round(h / 24 * 10) / 10} ngày`;

  // Phân bổ khối lượng đang xử lý theo người — ai đang ôm nhiều việc nhất toàn đơn vị, không cần
  // mở từng trang Nhân viên riêng lẻ mới thấy được.
  const workloadByEmp = useMemo(() => {
    const map = new Map();
    for (const t of computed) {
      if (isCompletedStatus(t.status)) continue;
      const emp = getEmp?.(t.eid);
      if (!emp) continue;
      let r = map.get(t.eid);
      if (!r) { r = { eid: t.eid, name: emp.name, dept: emp.dept, count: 0 }; map.set(t.eid, r); }
      r.count++;
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 12);
  }, [computed, getEmp]);
  const maxWorkload = workloadByEmp.length ? workloadByEmp[0].count : 1;

  // Chất lượng đánh giá theo phòng — % Xuất sắc/Tốt/TB/Kém trong số việc đã chấm, bổ sung góc nhìn
  // ngoài đúng/trễ hạn (1 phòng có thể đúng hạn cao nhưng chất lượng thấp mà biểu đồ trên không thấy được).
  const qualityByDept = useMemo(() => DEPTS.map(dept => {
    const rated = computed.filter(t => t.dept === dept && RATING[t.rating]);
    const byKey = RATING_KEYS.map(k => ({ key: k, count: rated.filter(t => t.rating === k).length }));
    return { dept, total: rated.length, byKey };
  }), [computed]);

  // Cảnh báo sớm: việc sắp đến hạn trong 7 ngày tới — nhìn về phía trước thay vì chỉ thấy khi đã quá hạn.
  const upcoming7d = useMemo(() => computed.filter(t => !isCompletedStatus(t.status) && t.status !== "overdue")
    .map(t => ({ ...t, daysLeft: Math.ceil((atMidnight(t.deadline) - today) / 86400000) }))
    .filter(t => t.daysLeft >= 0 && t.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft), [computed, today]);
  const upcoming7dByDept = useMemo(() => DEPTS.map(d => ({ dept: d, count: upcoming7d.filter(t => t.dept === d).length })), [upcoming7d]);

  return (<>
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>📈 Tỷ lệ hoàn thành theo phòng — 6 tháng gần nhất</div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>% việc hoàn thành trong số việc có hạn chót thuộc tháng đó — nhìn phòng nào đang đi xuống để chấn chỉnh sớm.</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={deptTrend}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" /><Tooltip formatter={v => v === null ? "Không có việc" : v + "%"} /><Legend wrapperStyle={{ fontSize: 12 }} />
          {DEPTS.map(d => <Line key={d} type="monotone" dataKey={d} stroke={DEPT_COLOR[d]} strokeWidth={2} dot={{ r: 3 }} connectNulls />)}
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>🔴 Việc quá hạn lâu nhất toàn đơn vị</div>
        {topOverdue.length === 0 ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 20, fontSize: 13 }}>🎉 Không có việc quá hạn</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topOverdue.map(t => (
              <div key={t.id} onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, wordBreak: "break-word" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}><span style={{ color: DEPT_COLOR[t.dept] }}>{t.dept}</span> · {getEmp?.(t.eid)?.name || "–"} · Hạn: {t.deadline}</div>
                </div>
                <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, background: "#dc2626", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>{t.daysOver} ngày</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>⏱️ Tốc độ duyệt của người duyệt</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>Thời gian trung bình từ lúc nhân viên yêu cầu đến lúc được duyệt — đo cả phía quản lý, không chỉ đo nhân viên.</div>
        {approvalSpeed.length === 0 ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 20, fontSize: 13 }}>Chưa có dữ liệu duyệt</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ background: "#f9fafb" }}>{["Người duyệt","Đã duyệt","TG duyệt TB","Đang treo"].map(h => <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{h}</th>)}</tr></thead>
            <tbody>{approvalSpeed.map(r => (
              <tr key={r.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "7px 10px", fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: "7px 10px", textAlign: "center" }}>{r.count}</td>
                <td style={{ padding: "7px 10px", color: r.avgH !== null && r.avgH > 48 ? "#b91c1c" : "#374151", fontWeight: r.avgH !== null && r.avgH > 48 ? 700 : 400 }}>{fmtDur(r.avgH)}</td>
                <td style={{ padding: "7px 10px" }}>{r.pending > 0 ? <span style={{ fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#92400e", padding: "2px 9px", borderRadius: 10 }}>{r.pending}</span> : <span style={{ color: "#9ca3af" }}>0</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>📊 Phân bổ khối lượng đang xử lý theo người</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>Số việc chưa hoàn thành đang ôm — đỏ = từ {overloadThreshold} việc trở lên (ngưỡng quá tải).</div>
        {workloadByEmp.length === 0 ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 20, fontSize: 13 }}>Không có việc đang xử lý</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {workloadByEmp.map(r => {
              const over = r.count >= overloadThreshold;
              return (
                <div key={r.eid} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 108, flexShrink: 0, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.name}>{r.name}</div>
                  <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 6, height: 16 }}>
                    <div style={{ width: `${Math.max(4, r.count / maxWorkload * 100)}%`, height: "100%", borderRadius: 6, background: over ? "#dc2626" : DEPT_COLOR[r.dept] }} />
                  </div>
                  <div style={{ width: 22, textAlign: "right", fontSize: 12, fontWeight: 700, color: over ? "#dc2626" : "#374151" }}>{r.count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>🌟 Chất lượng đánh giá theo phòng</div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>Tỷ lệ mức đánh giá trong số việc đã chấm — bổ sung góc nhìn ngoài đúng/trễ hạn.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {qualityByDept.map(d => (
            <div key={d.dept}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: DEPT_COLOR[d.dept] }}>{d.dept}</span>
                <span style={{ color: "#9ca3af" }}>{d.total} việc đã chấm</span>
              </div>
              {d.total === 0 ? <div style={{ fontSize: 11.5, color: "#d1d5db" }}>Chưa có việc nào được chấm điểm</div> : (
                <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden" }}>
                  {d.byKey.filter(k => k.count > 0).map(k => (
                    <div key={k.key} title={`${RATING[k.key].label}: ${k.count}`} style={{ width: `${k.count / d.total * 100}%`, background: RATING[k.key].col }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, borderTop: "1px dashed #e5e7eb", paddingTop: 10 }}>
          {RATING_KEYS.map(k => <span key={k} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "#6b7280" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: RATING[k].col, display: "inline-block" }} />{RATING[k].label}</span>)}
        </div>
      </div>
    </div>

    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>⏳ Sắp đến hạn trong 7 ngày tới</div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>Cảnh báo sớm để chủ động phân bổ lại, thay vì chỉ biết khi đã quá hạn.</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {upcoming7dByDept.map(d => (
          <div key={d.dept} style={{ flex: 1, textAlign: "center", padding: "8px 6px", borderRadius: 8, background: DEPT_COLOR[d.dept] + "15" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: DEPT_COLOR[d.dept] }}>{d.count}</div>
            <div style={{ fontSize: 11, color: DEPT_COLOR[d.dept] }}>{d.dept}</div>
          </div>
        ))}
      </div>
      {upcoming7d.length === 0 ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 12, fontSize: 13 }}>Không có việc nào sắp đến hạn trong 7 ngày tới</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {upcoming7d.slice(0, 8).map(t => (
            <div key={t.id} onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, wordBreak: "break-word" }}>{t.title}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}><span style={{ color: DEPT_COLOR[t.dept] }}>{t.dept}</span> · {getEmp?.(t.eid)?.name || "–"} · Hạn: {t.deadline}</div>
              </div>
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, background: "#f59e0b", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>{t.daysLeft === 0 ? "Hôm nay" : `${t.daysLeft} ngày`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </>);
}

// ═════════ TAB "KQ NHIỆM VỤ" — báo cáo kết quả thực hiện nhiệm vụ theo thể thức văn bản hành chính,
// phỏng theo mẫu báo cáo UBND tỉnh gửi cấp trên (Tổng số / HT đúng hạn / HT trễ hạn / Chưa HT trong hạn /
// Chưa HT trễ hạn + 3 tỷ lệ trên tổng số giao), chia theo Phòng (thay "cấp Sở") rồi drill-down Nhân viên
// (thay "cấp Xã") vì QLCV chỉ có 1 cấp tổ chức thay vì 2 cấp như mẫu gốc.
const ORG_NAME = "Trung tâm Giám sát, Điều hành Đô thị thông minh tỉnh Đắk Lắk";
const PARENT_ORG = "SỞ KHOA HỌC VÀ CÔNG NGHỆ ĐẮK LẮK";
const ORG_LINE1 = "TRUNG TÂM GIÁM SÁT,";
const ORG_LINE2 = "ĐIỀU HÀNH ĐÔ THỊ THÔNG MINH";

// Quy đổi trạng thái nhiệm vụ hiện có (đã tính sẵn theo ngày hôm nay) sang đúng 4 nhóm của mẫu báo cáo —
// "chưa hoàn thành trong hạn" gồm mọi trạng thái chưa xong mà cũng chưa quá hạn (on_time/nearly_due/pending_approval).
function computeRow(tasks) {
  const total = tasks.length;
  const onTime = tasks.filter(t => t.status === "completed").length;
  const late = tasks.filter(t => t.status === "completed_late").length;
  const overdueNotDone = tasks.filter(t => t.status === "overdue").length;
  const pendingNotDone = total - onTime - late - overdueNotDone;
  const pct = n => total ? Math.round(n / total * 1000) / 10 : 0;
  return { total, onTime, late, pendingNotDone, overdueNotDone, rOnTime: pct(onTime), rLate: pct(late), rOverdue: pct(overdueNotDone) };
}

export function TaskResultReportTab({ inp, computed, getEmp, currentUser }) {
  const now = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState("h1");
  const [year, setYear] = useState(now.getFullYear());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [expandedDept, setExpandedDept] = useState(null);

  const range = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    if (preset === "h1") return { from: `${year}-01-01`, to: `${year}-06-30` };
    if (preset === "h2") return { from: `${year}-07-01`, to: `${year}-12-31` };
    if (preset === "year") return { from: `${year}-01-01`, to: `${year}-12-31` };
    const q = Number(preset[1]);
    const startM = (q - 1) * 3 + 1, endM = q * 3;
    const endDay = new Date(year, endM, 0).getDate();
    return { from: `${year}-${String(startM).padStart(2, "0")}-01`, to: `${year}-${String(endM).padStart(2, "0")}-${endDay}` };
  }, [preset, year, customFrom, customTo]);

  const periodLabel = useMemo(() => {
    if (preset === "custom") return `từ ${customFrom || "…"} đến ${customTo || "…"}`;
    if (preset === "h1") return `6 tháng đầu năm ${year}`;
    if (preset === "h2") return `6 tháng cuối năm ${year}`;
    if (preset === "year") return `năm ${year}`;
    return `quý ${preset[1]}/${year}`;
  }, [preset, year, customFrom, customTo]);

  const tasksInRange = useMemo(() => {
    if (!range.from || !range.to) return [];
    return computed.filter(t => t.deadline && t.deadline >= range.from && t.deadline <= range.to);
  }, [computed, range]);

  const deptRows = useMemo(() => DEPTS.map(dept => {
    const deptTasks = tasksInRange.filter(t => t.dept === dept);
    const empIds = [...new Set(deptTasks.map(t => t.eid))];
    const empRows = empIds.map(eid => ({ eid, name: getEmp?.(eid)?.name || "—", ...computeRow(deptTasks.filter(t => t.eid === eid)) })).sort((a, b) => b.total - a.total);
    return { dept, empRows, ...computeRow(deptTasks) };
  }), [tasksInRange, getEmp]);

  const grandTotal = useMemo(() => computeRow(tasksInRange), [tasksInRange]);

  // Danh sách cá nhân trễ hạn nhiều nhất — cho đoạn nhận xét tự động trong bản in, giống mẫu gốc
  // có liệt kê "Các đơn vị có nhiều nhiệm vụ hoàn thành trễ hạn gồm: ...".
  const topBy = key => { const rows = []; for (const d of deptRows) for (const e of d.empRows) if (e[key] > 0) rows.push({ label: `${e.name} (${d.dept})`, count: e[key] }); return rows.sort((a, b) => b.count - a.count).slice(0, 5); };
  const topLate = useMemo(() => topBy("late"), [deptRows]);
  const topOverdueNotDone = useMemo(() => topBy("overdueNotDone"), [deptRows]);

  const fmtPct = v => v.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

  const printReport = () => {
    const rowHtml = (label, r, indent) => `<tr${indent ? "" : ' style="font-weight:700;background:#f3f4f6"'}><td style="text-align:center">${indent ? "" : ""}</td><td style="${indent ? "padding-left:20px" : ""}">${label}</td><td style="text-align:center">${r.total}</td><td style="text-align:center">${r.onTime}</td><td style="text-align:center">${r.late}</td><td style="text-align:center">${r.pendingNotDone}</td><td style="text-align:center">${r.overdueNotDone}</td><td style="text-align:center">${fmtPct(r.rOnTime)}</td><td style="text-align:center">${fmtPct(r.rLate)}</td><td style="text-align:center">${fmtPct(r.rOverdue)}</td><td></td></tr>`;
    const bodyHtml = deptRows.map((d, i) => rowHtml(`${i + 1}. ${d.dept}`, d, false) + d.empRows.map(e => rowHtml(e.name, e, true)).join("")).join("");
    const todayVN = now.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const [dd, mm, yyyy] = todayVN.split("/");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Báo cáo kết quả thực hiện nhiệm vụ</title><style>
      body{font-family:"Times New Roman",serif;padding:28px;color:#111;font-size:13.5px;line-height:1.5}
      .hd{display:flex;justify-content:space-between;text-align:center;margin-bottom:6px}
      .hd div{width:46%} .hd b{display:block} .u{text-decoration:underline}
      .unit-line{font-weight:700}
      .unit-rule{width:120px;height:0;border-top:1px solid #000;margin:2px auto 6px}
      h1{font-size:15px;text-align:center;text-transform:uppercase;margin:18px 0 2px}
      h2{font-size:14px;text-align:center;font-weight:400;margin:0 0 20px}
      p{margin:6px 0;text-align:justify}
      table{width:100%;border-collapse:collapse;margin:14px 0;font-size:11.5px}
      th,td{border:1px solid #333;padding:4px 6px}
      th{background:#f0f0f0;text-align:center;font-size:11px}
      .sign{display:flex;justify-content:space-between;margin-top:40px;font-size:13px;text-align:center}
      .sign div{width:45%}
      @media print{button{display:none}}
    </style></head><body>
    <div class="hd">
      <div><div>${PARENT_ORG}</div><div class="unit-line">${ORG_LINE1}</div><div class="unit-line">${ORG_LINE2}</div><div class="unit-rule"></div><div>Số: ${docNumber || "……"}/BC-TTGSĐH</div></div>
      <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><div class="u">Độc lập - Tự do - Hạnh phúc</div><div>—————————————</div><div>Đắk Lắk, ngày ${dd} tháng ${mm} năm ${yyyy}</div></div>
    </div>
    <h1>Báo cáo</h1>
    <h2>Kết quả thực hiện nhiệm vụ ${periodLabel}</h2>
    <p><b>1. Kết quả thực hiện nhiệm vụ ${periodLabel}</b></p>
    <p>Trong ${periodLabel}, ${ORG_NAME} đã triển khai thực hiện <b>${grandTotal.total}</b> nhiệm vụ. Kết quả thực hiện như sau:</p>
    <p>- Số nhiệm vụ hoàn thành đúng hạn: <b>${grandTotal.onTime}</b> nhiệm vụ, đạt <b>${fmtPct(grandTotal.rOnTime)}</b> tổng số nhiệm vụ được giao.</p>
    <p>- Số nhiệm vụ hoàn thành trễ hạn: <b>${grandTotal.late}</b> nhiệm vụ, chiếm <b>${fmtPct(grandTotal.rLate)}</b>.${topLate.length ? " Các cá nhân có nhiều nhiệm vụ hoàn thành trễ hạn: " + topLate.map(r => `${r.label}: ${r.count} nhiệm vụ`).join("; ") + "." : ""}</p>
    <p>- Số nhiệm vụ trễ hạn nhưng chưa hoàn thành: <b>${grandTotal.overdueNotDone}</b> nhiệm vụ, chiếm <b>${fmtPct(grandTotal.rOverdue)}</b>.${topOverdueNotDone.length ? " Các cá nhân có nhiều nhiệm vụ trễ hạn chưa hoàn thành: " + topOverdueNotDone.map(r => `${r.label}: ${r.count} nhiệm vụ`).join("; ") + "." : ""}</p>
    <p>- Số nhiệm vụ đang thực hiện trong hạn: <b>${grandTotal.pendingNotDone}</b> nhiệm vụ, chiếm <b>${fmtPct(100 - grandTotal.rOnTime - grandTotal.rLate - grandTotal.rOverdue)}</b>.</p>
    <p><b>2. Kiến nghị</b></p>
    <p>- Đề nghị các phòng, cá nhân có nhiệm vụ trễ hạn khẩn trương rà soát, xác định rõ nguyên nhân, trách nhiệm, tiến độ xử lý; kịp thời báo cáo Ban Giám đốc đối với các nhiệm vụ khó khăn, vướng mắc, vượt thẩm quyền.</p>
    <p>- Tiếp tục nâng cao vai trò, trách nhiệm của người đứng đầu phòng trong theo dõi, đôn đốc thực hiện nhiệm vụ được giao, không để phát sinh tình trạng chậm xử lý, kéo dài thời gian thực hiện.</p>
    <p>Trên đây là kết quả thực hiện nhiệm vụ ${periodLabel}; kính báo cáo Ban Giám đốc xem xét, chỉ đạo./.</p>
    <p style="font-style:italic">(Phụ lục kèm theo)</p>
    <div class="sign"><div>NGƯỜI LẬP BÁO CÁO<br/><br/><br/><br/>${currentUser?.full_name || ""}</div><div>GIÁM ĐỐC<br/><br/><br/><br/></div></div>
    <div style="page-break-before:always">
    <h1 style="margin-top:0">Phụ lục</h1>
    <h2>Kết quả thực hiện nhiệm vụ ${periodLabel}<br/><span style="font-style:italic;font-weight:400;font-size:12px">(Kèm theo Báo cáo số: ${docNumber || "……"}/BC-TTGSĐH ngày ${dd} tháng ${mm} năm ${yyyy})</span></h2>
    <table><thead><tr><th>TT</th><th>Tên đơn vị/cá nhân</th><th>Tổng số</th><th>HT trong hạn</th><th>HT trễ hạn</th><th>Chưa HT trong hạn</th><th>Chưa HT trễ hạn</th><th>Tỷ lệ HT đúng hạn</th><th>Tỷ lệ HT trễ hạn</th><th>Tỷ lệ chưa HT trễ hạn</th><th>Ghi chú</th></tr></thead>
    <tbody>${bodyHtml}<tr style="font-weight:800;background:#e5e7eb"><td colspan="2" style="text-align:center">Tổng cộng</td><td style="text-align:center">${grandTotal.total}</td><td style="text-align:center">${grandTotal.onTime}</td><td style="text-align:center">${grandTotal.late}</td><td style="text-align:center">${grandTotal.pendingNotDone}</td><td style="text-align:center">${grandTotal.overdueNotDone}</td><td style="text-align:center">${fmtPct(grandTotal.rOnTime)}</td><td style="text-align:center">${fmtPct(grandTotal.rLate)}</td><td style="text-align:center">${fmtPct(grandTotal.rOverdue)}</td><td></td></tr></tbody>
    </table></div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  };

  return (<>
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>📄 KQ nhiệm vụ</span>
      <select value={preset} onChange={e => setPreset(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 10px" }}>
        <option value="h1">6 tháng đầu năm</option><option value="h2">6 tháng cuối năm</option>
        <option value="q1">Quý 1</option><option value="q2">Quý 2</option><option value="q3">Quý 3</option><option value="q4">Quý 4</option>
        <option value="year">Cả năm</option><option value="custom">Tùy chọn khoảng ngày</option>
      </select>
      {preset !== "custom" ? (
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...inp, width: 90, padding: "6px 10px" }}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
      ) : (<>
        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 10px" }} />
        <span style={{ color: "#9ca3af" }}>→</span>
        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ ...inp, width: "auto", padding: "6px 10px" }} />
      </>)}
      <input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder="Số báo cáo (VD: 12)" style={{ ...inp, width: 150, padding: "6px 10px" }} />
      <button onClick={printReport} style={{ padding: "6px 14px", border: "1px solid #fca5a5", borderRadius: 7, background: "#fef2f2", cursor: "pointer", fontSize: 12, color: "#dc2626", fontWeight: 500 }}>🖨 In báo cáo</button>
    </div>

    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#9ca3af" }}>Kỳ báo cáo: {periodLabel} · Tổng {grandTotal.total} nhiệm vụ (tính theo hạn chót trong kỳ) · Bấm vào 1 phòng để xem chi tiết từng người</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 760 }}>
          <thead><tr style={{ background: "#f9fafb" }}>{["TT", "Đơn vị/Nhân viên", "Tổng số", "HT trong hạn", "HT trễ hạn", "Chưa HT trong hạn", "Chưa HT trễ hạn", "Tỷ lệ đúng hạn", "Tỷ lệ HT trễ", "Tỷ lệ chưa HT trễ"].map(h => <th key={h} style={{ padding: "8px 8px", textAlign: "left", fontSize: 10.5, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
          <tbody>
            {deptRows.map((d, i) => (<React.Fragment key={d.dept}>
              <tr onClick={() => setExpandedDept(expandedDept === d.dept ? null : d.dept)} style={{ cursor: "pointer", background: "#f3f4f6", fontWeight: 700 }}>
                <td style={{ padding: "8px" }}>{i + 1}</td>
                <td style={{ padding: "8px" }}>{expandedDept === d.dept ? "▾" : "▸"} <span style={{ color: DEPT_COLOR[d.dept] }}>{d.dept}</span></td>
                <td style={{ padding: "8px", textAlign: "center" }}>{d.total}</td>
                <td style={{ padding: "8px", textAlign: "center", color: "#15803d" }}>{d.onTime}</td>
                <td style={{ padding: "8px", textAlign: "center", color: "#b45309" }}>{d.late}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>{d.pendingNotDone}</td>
                <td style={{ padding: "8px", textAlign: "center", color: "#b91c1c" }}>{d.overdueNotDone}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>{d.rOnTime}%</td>
                <td style={{ padding: "8px", textAlign: "center" }}>{d.rLate}%</td>
                <td style={{ padding: "8px", textAlign: "center" }}>{d.rOverdue}%</td>
              </tr>
              {expandedDept === d.dept && d.empRows.map(e => (
                <tr key={e.eid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td></td>
                  <td style={{ padding: "6px 8px 6px 26px", color: "#374151" }}>{e.name}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{e.total}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{e.onTime}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{e.late}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{e.pendingNotDone}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{e.overdueNotDone}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{e.rOnTime}%</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{e.rLate}%</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{e.rOverdue}%</td>
                </tr>
              ))}
            </React.Fragment>))}
            <tr style={{ fontWeight: 800, background: "#eef2ff" }}>
              <td style={{ padding: "8px" }}></td>
              <td style={{ padding: "8px" }}>Tổng cộng</td>
              <td style={{ padding: "8px", textAlign: "center" }}>{grandTotal.total}</td>
              <td style={{ padding: "8px", textAlign: "center" }}>{grandTotal.onTime}</td>
              <td style={{ padding: "8px", textAlign: "center" }}>{grandTotal.late}</td>
              <td style={{ padding: "8px", textAlign: "center" }}>{grandTotal.pendingNotDone}</td>
              <td style={{ padding: "8px", textAlign: "center" }}>{grandTotal.overdueNotDone}</td>
              <td style={{ padding: "8px", textAlign: "center" }}>{grandTotal.rOnTime}%</td>
              <td style={{ padding: "8px", textAlign: "center" }}>{grandTotal.rLate}%</td>
              <td style={{ padding: "8px", textAlign: "center" }}>{grandTotal.rOverdue}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </>);
}
