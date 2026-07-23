import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { DEPTS, DEPT_COLOR, ROLE_COLORS, FULL_ACCESS, STATUS, STATUS_ORDER, FREQUENCIES, RATING, PRIO, VI_MONTHS } from "../constants";
import { isCompletedStatus, fmtDate } from "../helpers";
import { RoleBadge, OverloadPopup } from "./ui";

export default function Dashboard({
  currentUser, isMobile, userDept,
  execDeptSummary, execMonth, setExecMonth, execYear, setExecYear, staffingAdvice, empProfile, employees,
  stats, statsW, deptChart, myTasks, myWorkList, myWorkloadCompare, myDoneList, myTrend,
  atRiskTasks, weeklyDigest, watchList, dataHealth, execNarrative, lateInsights,
  computed, overloadedEmps, overloadThreshold, setOverloadThreshold, kpiOnTime, setKpiOnTime,
  dateFrom, setDateFrom, dateTo, setDateTo,
  overloadPopup, setOverloadPopup,
  recurringTemplates, setShowRecurring,
  statFilter, setStatFilter,
  setView, setFDept,
  setModal, loadComments,
  getEmp, todayStr, onReassign, pendingProfileId, onProfileOpened,
}) {
  // Nhân viên (staff) chỉ thấy việc của mình → ẩn các khối mang tính điều hành/toàn phòng
  // (thống kê tổng, biểu đồ phòng ban, cảnh báo quá tải, quản lý nhiệm vụ định kỳ) cho gọn và tránh trùng lặp.
  const isManagerView = FULL_ACCESS.includes(currentUser.role) || ["manager", "deputy_manager", "manager_hcth"].includes(currentUser.role);
  // Phân trang cho danh sách "Công việc của tôi"
  const [wlPage, setWlPage] = useState(1);
  const [doneOpen, setDoneOpen] = useState(false); // mục "Đã hoàn thành tháng này"
  const [healthCat, setHealthCat] = useState(null); // nhóm Sức khỏe dữ liệu đang mở danh sách
  const [profileId, setProfileId] = useState(null); // hồ sơ nhân viên đang mở
  // Mở Hồ sơ nhân viên theo yêu cầu từ Trợ lý chat ("Xem chi tiết")
  useEffect(() => { if (pendingProfileId) { setProfileId(pendingProfileId); onProfileOpened && onProfileOpened(); } }, [pendingProfileId]);
  const [rosterPage, setRosterPage] = useState(1); // phân trang bảng nhân sự
  // Danh sách nhân sự trong tầm quản lý để lập "bảng nhân sự": TP/PP xem phòng mình, BGĐ xem tất cả
  const rosterEmps = isManagerView ? (employees || []).filter(e => (FULL_ACCESS.includes(currentUser.role) || e.dept === userDept) && !e.no_kpi).slice().sort((a, b) => a.dept === b.dept ? a.name.localeCompare(b.name) : a.dept.localeCompare(b.dept)) : [];
  const ROSTER_SIZE = 8;
  const rosterTotalPages = Math.max(1, Math.ceil(rosterEmps.length / ROSTER_SIZE));
  const rosterPageSafe = Math.min(rosterPage, rosterTotalPages);
  const rosterPaged = rosterEmps.slice((rosterPageSafe - 1) * ROSTER_SIZE, rosterPageSafe * ROSTER_SIZE);
  // GY4 — Bản tự đánh giá cá nhân (in ra giấy / PDF): một trang tóm tắt điểm, cấu thành, chủ động, xu hướng, trễ.
  const printSelfReview = () => {
    if (!empProfile || !currentUser.employee_id) return;
    const p = empProfile(currentUser.employee_id); if (!p) return;
    const now = new Date();
    const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const b = p.cur.breakdown;
    const trendHead = p.trend.map(t => `<th>${t.name}</th>`).join("");
    const trendRow = p.trend.map(t => `<td style="text-align:center">${t.score == null ? "—" : t.score}</td>`).join("");
    const lateRows = p.lateReasons.length ? p.lateReasons.map(r => `<li>${esc(r.label)}: ${r.count} lần</li>`).join("") : "<li>Không có việc bị ghi nhận trễ</li>";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ban tu danh gia</title><style>body{font-family:Arial,sans-serif;padding:26px;color:#111}h1{font-size:18px;margin:0 0 4px}h3{font-size:14px;margin:14px 0 4px}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px}.big{font-size:32px;font-weight:800;color:#1e3a8a}.sign td{border:none;text-align:center;padding-top:30px}</style></head><body>
      <h1>BẢN TỰ ĐÁNH GIÁ CÔNG VIỆC</h1>
      <div style="font-size:13px;color:#444">${esc(p.emp.name)} — Phòng ${esc(p.emp.dept)} · ${esc(p.emp.role)} · Kỳ: tháng ${now.getMonth() + 1}/${now.getFullYear()}</div>
      <p>Điểm hiệu suất tháng: <span class="big">${p.cur.resolved > 0 ? p.cur.perfScore : "—"}</span>${p.cur.resolved > 0 && !p.cur.eligible ? " (tham khảo — chưa đủ 5 việc đến hạn)" : ""} &nbsp;·&nbsp; Tỷ lệ đúng hạn: <b>${p.onTimeRate}%</b></div>
      ${b ? `<div style="font-size:13px">Cấu thành: Thời hạn ${b.timeliness} + Chất lượng ${b.quality}${b.penalty > 0 ? ` − Phạt ${b.penalty}` : ""}${b.workloadBonus > 0 ? ` + Thưởng KL ${b.workloadBonus}` : ""}${b.prioBonus > 0 ? ` + Thưởng ưu tiên ${b.prioBonus}` : ""}</div>` : ""}
      <div style="font-size:13px;margin-top:6px">Tính chủ động: hoàn thành sớm hạn <b>${p.proactive.earlyRate}%</b> (${p.proactive.early}/${p.proactive.doneOnTime} việc) · Khối lượng phối hợp: ${p.proactive.collabW}</div>
      <h3>Xu hướng điểm 6 tháng</h3><table><tr>${trendHead}</tr><tr>${trendRow}</tr></table>
      <h3>Nguyên nhân trễ (mọi thời gian)</h3><ul style="font-size:13px">${lateRows}</ul>
      <div style="font-size:13px">Việc đang mở: ${p.openCount} (≈${p.openW} quy đổi)</div>
      <table class="sign" style="margin-top:40px"><tr><td>Người tự đánh giá<br><br><br><b>${esc(p.emp.name)}</b></td><td>Trưởng phòng nhận xét & ký</td></tr></table>
      <script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  };
  const WL_SIZE = 8;
  const wlTotalPages = Math.max(1, Math.ceil((myWorkList?.length || 0) / WL_SIZE));
  const wlPageSafe = Math.min(wlPage, wlTotalPages);
  const wlPaged = (myWorkList || []).slice((wlPageSafe - 1) * WL_SIZE, wlPageSafe * WL_SIZE);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 12px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>📅 Lọc theo hạn chót:</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Từ ngày</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 12 }} />
        <span style={{ fontSize: 12, color: "#6b7280" }}>Đến ngày</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 12 }} />
        {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ padding: "5px 10px", border: "1px solid #d1d5db", borderRadius: 7, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#6b7280" }}>✕ Bỏ lọc</button>}
      </div>
      {["admin","director"].includes(currentUser.role) && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16 }}>📊</span><span style={{ fontWeight: 700, fontSize: 14 }}>Tổng hợp điều hành theo phòng ban</span>
            <span title="Chỉ tiêu tỷ lệ hoàn thành — phòng đạt ≥ mức này hiện xanh, dưới hiện đỏ trong cột Tỷ lệ HT" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "3px 8px" }}>🎯 Chỉ tiêu tỷ lệ HT: <input type="number" min={0} max={100} value={kpiOnTime} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 0 && v <= 100) { setKpiOnTime(v); localStorage.setItem("qlcv_kpi_ontime", v); } }} style={{ width: 46, padding: "2px 6px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12, textAlign: "center" }} />%</span>
            <span title="Chọn kỳ thống kê cho bảng này (mặc định tháng hiện hành). Cột Quá tải luôn theo hiện tại." style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "3px 8px" }}>📅 Kỳ:
              <select value={execMonth} onChange={e => setExecMonth(Number(e.target.value))} style={{ padding: "2px 6px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12 }}><option value={-1}>Toàn bộ</option>{VI_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
              {execMonth >= 0 && <select value={execYear} onChange={e => setExecYear(Number(e.target.value))} style={{ padding: "2px 6px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12 }}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>}
            </span>
            <span style={{ marginLeft: isMobile ? 0 : "auto", fontSize: 11.5, color: "#6b7280", lineHeight: 1.6, flex: isMobile ? "1 1 100%" : "0 1 auto" }}>
              💡 <b style={{ color: "#4338ca" }}>Quy đổi</b> = khối lượng thực sau khi nhân trọng số nhiệm vụ định kỳ:
              hàng ngày <b>0.25</b> · tuần <b>1</b> · 2 tuần <b>1.5</b> · tháng <b>2.5</b> · quý/6 tháng/năm <b>3</b> · nhiệm vụ thường <b>1</b>.
              Cột <b>Tổng việc</b> chỉ đếm số đầu việc nên phòng nhiều việc hàng ngày dễ trông "nhiều" hơn thực tế —
              hãy dùng cột <b>Quy đổi</b> khi so sánh tải giữa các phòng, và <b>Quy đổi/người</b> khi các phòng chênh lệch nhân sự.
              <br />⚠️ Bảng này chỉ tính <b>nhiệm vụ</b> (không gồm Hỗ trợ ND/Xử lý lỗi TTDL và dự án ngân sách), gom theo phòng của nhiệm vụ, kỳ thống kê <b>{execMonth < 0 ? "toàn bộ thời gian" : `${VI_MONTHS[execMonth]}/${execYear}`}</b> (đổi ở ô 📅 Kỳ) —
              nên <b>không trùng</b> với cột "Tổng" ở bảng Hiệu suất nhân viên (bảng đó có cộng thêm việc phối hợp ½). Cột <b>Quá tải</b> luôn theo thực tế hiện tại.
            </span>
          </div>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {execDeptSummary.map(d => (
                <div key={d.dept} onClick={() => { setView("tasks"); setFDept(d.dept); }} style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <span style={{ background: DEPT_COLOR[d.dept] + "22", color: DEPT_COLOR[d.dept], fontWeight: 700, padding: "3px 10px", borderRadius: 8, fontSize: 13 }}>{d.dept}</span>
                      <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{d.lead} · {d.empCount} NV</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 40, height: 5, background: "#e5e7eb", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: d.rate + "%", background: d.rate >= kpiOnTime ? "#16a34a" : d.rate >= kpiOnTime - 15 ? "#f59e0b" : "#dc2626" }} /></div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: d.rate >= kpiOnTime ? "#15803d" : d.rate >= kpiOnTime - 15 ? "#92400e" : "#b91c1c" }}>{d.rate}%</span>{d.total > 0 && <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 5px", borderRadius: 5, background: d.rate >= kpiOnTime ? "#dcfce7" : "#fee2e2", color: d.rate >= kpiOnTime ? "#15803d" : "#b91c1c" }}>{d.rate >= kpiOnTime ? "🎯" : "Chưa"}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ background: "#e0e7ff", color: "#4338ca", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>Tổng: {d.total} <span style={{ opacity: 0.7 }}>(≈{d.totalW} quy đổi)</span></span>
                    <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>Quy đổi/người: {d.perHead}</span>
                    <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>HT: {d.done} <span style={{ opacity: 0.7 }}>(≈{d.doneW})</span></span>
                    {d.overdue > 0 && <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>QH: {d.overdue}</span>}
                    {d.completedLate > 0 && <span style={{ background: "#fff1f2", color: "#991b1b", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>⏰ {d.completedLate}</span>}
                    {d.nd > 0 && <span style={{ background: "#fef9c3", color: "#92400e", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>⚠ {d.nd}</span>}
                    {d.overloaded > 0 && <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>🔥 {d.overloaded} quá tải</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#f9fafb" }}>{["Phòng ban","Trưởng phòng","Nhân sự","Tổng việc","Quy đổi","Quy đổi/người","Hoàn thành","Quá hạn","HT quá hạn","Sắp hết hạn","Tỷ lệ HT","Quá tải"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                <tbody>{execDeptSummary.map(d => (
                  <tr key={d.dept} onClick={() => { setView("tasks"); setFDept(d.dept); }} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 12px" }}><span style={{ background: DEPT_COLOR[d.dept] + "22", color: DEPT_COLOR[d.dept], fontWeight: 600, padding: "3px 10px", borderRadius: 8 }}>{d.dept}</span></td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>{d.lead}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{d.empCount}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{d.total}</td>
                    <td style={{ padding: "10px 12px" }} title="Số việc sau khi quy đổi theo trọng số nhiệm vụ định kỳ (ngày 0.25 · tuần 1 · 2 tuần 1.5 · tháng 2.5 · quý/6 tháng/năm 3)"><span style={{ background: "#eef2ff", color: "#4338ca", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 8 }}>≈ {d.totalW}</span></td>
                    <td style={{ padding: "10px 12px" }} title="Việc quy đổi chia cho số nhân sự của phòng — tải bình quân mỗi người, dùng để so sánh phòng có quy mô nhân sự khác nhau"><span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 8 }}>{d.perHead}</span></td>
                    <td style={{ padding: "10px 12px", color: "#15803d", fontWeight: 500 }}>{d.done}<span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 400 }}> (≈{d.doneW})</span></td>
                    <td style={{ padding: "10px 12px", color: d.overdue > 0 ? "#b91c1c" : "#9ca3af", fontWeight: d.overdue > 0 ? 700 : 400 }}>{d.overdue}</td>
                    <td style={{ padding: "10px 12px", color: d.completedLate > 0 ? "#991b1b" : "#9ca3af", fontWeight: d.completedLate > 0 ? 700 : 400 }}>{d.completedLate}</td>
                    <td style={{ padding: "10px 12px", color: d.nd > 0 ? "#a16207" : "#9ca3af", fontWeight: d.nd > 0 ? 600 : 400 }}>{d.nd}</td>
                    <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 50, height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: d.rate + "%", background: d.rate >= kpiOnTime ? "#16a34a" : d.rate >= kpiOnTime - 15 ? "#f59e0b" : "#dc2626" }} /></div><span style={{ fontSize: 12, fontWeight: 600, color: d.rate >= kpiOnTime ? "#15803d" : d.rate >= kpiOnTime - 15 ? "#92400e" : "#b91c1c" }}>{d.rate}%</span>{d.total > 0 && <span title={`Chỉ tiêu ${kpiOnTime}%`} style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: d.rate >= kpiOnTime ? "#dcfce7" : "#fee2e2", color: d.rate >= kpiOnTime ? "#15803d" : "#b91c1c" }}>{d.rate >= kpiOnTime ? "🎯 Đạt" : "Chưa"}</span>}</div></td>
                    <td style={{ padding: "10px 12px" }}>{d.overloaded > 0 ? <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>⚠️ {d.overloaded} người</span> : <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div style={{ padding: "8px 16px", fontSize: 11, color: "#9ca3af", borderTop: "1px solid #f3f4f6" }}>💡 Bấm vào một phòng để xem chi tiết danh sách nhiệm vụ</div>
        </div>
      )}

      {["admin","director"].includes(currentUser.role) && execNarrative && (
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: 12, padding: "14px 18px", color: "#e2e8f0", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🧠</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd", marginBottom: 3 }}>Trợ lý điều hành</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>{execNarrative}</div>
          </div>
        </div>
      )}

      {["admin","director"].includes(currentUser.role) && watchList && watchList.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "2px solid #fecaca", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #fecaca", background: "#fef2f2", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚩</span><span style={{ fontWeight: 700, fontSize: 14, color: "#b91c1c" }}>Cần chú ý ({watchList.length})</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>Dấu hiệu đi xuống — nên can thiệp sớm</span>
          </div>
          <div>
            {watchList.map((a, i) => (
              <div key={i} onClick={() => a.kind === "dept_down" ? (setView("tasks"), setFDept(a.dept)) : null} style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10, cursor: a.kind === "dept_down" ? "pointer" : "default" }}>
                <span style={{ fontSize: 18 }}>{a.kind === "dept_down" ? "📉" : "👤"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.kind === "dept_down" ? <>Phòng <span style={{ background: DEPT_COLOR[a.dept] + "22", color: DEPT_COLOR[a.dept], fontWeight: 700, padding: "1px 8px", borderRadius: 8 }}>{a.dept}</span></> : <>{a.name} <span style={{ color: "#9ca3af", fontSize: 11 }}>({a.dept})</span></>}</div>
                  <div style={{ fontSize: 11.5, color: "#b91c1c", marginTop: 2 }}>{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {staffingAdvice && staffingAdvice.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🧭</span><span style={{ fontWeight: 700, fontSize: 14 }}>Gợi ý điều phối nhân sự</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>So tải đang mở quy đổi/người với mặt bằng chung — chỉ mang tính tham khảo</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)" }}>
            {staffingAdvice.map(d => (
              <div key={d.dept} style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{d.level === "over" ? "🔴" : "🟢"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}><span style={{ background: DEPT_COLOR[d.dept] + "22", color: DEPT_COLOR[d.dept], fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>{d.dept}</span> <b style={{ color: d.level === "over" ? "#b91c1c" : "#15803d" }}>{d.level === "over" ? "có dấu hiệu thiếu người" : "có thể đang dư người"}</b></div>
                  <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3 }}>Tải đang mở: <b>{d.activePerHead}</b> quy đổi/người (TB chung {d.avgPerHead}) · {d.empCount} NV{d.overloaded > 0 ? ` · ${d.overloaded} người quá tải` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentUser.role !== "admin" && (
        <div style={{ background: ROLE_COLORS[currentUser.role]?.[1] || "#eef2ff", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: ROLE_COLORS[currentUser.role]?.[0] || "#4338ca", display: "flex", alignItems: "center", gap: 8, border: "1px solid " + (ROLE_COLORS[currentUser.role]?.[0] || "#4338ca") + "22" }}>
          <RoleBadge role={currentUser.role} />
          <span>{FULL_ACCESS.includes(currentUser.role) ? "Bạn đang xem toàn bộ nhiệm vụ." : ["manager","deputy_manager","manager_hcth"].includes(currentUser.role) ? `Bạn đang xem nhiệm vụ phòng ${userDept}.` : "Bạn đang xem nhiệm vụ được giao và phối hợp."}</span>
        </div>
      )}

      {isManagerView && weeklyDigest && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 8 }}>
          {[{ l: "Việc mới giao (7 ngày)", v: weeklyDigest.newly, bg: "#eef2ff", c: "#4338ca", i: "🆕" }, { l: "Hoàn thành (7 ngày)", v: weeklyDigest.done, bg: "#dcfce7", c: "#15803d", i: "✅" }, { l: "Sắp hết hạn", v: weeklyDigest.nearly, bg: "#fef9c3", c: "#92400e", i: "⏳" }, { l: "Đang quá hạn", v: weeklyDigest.overdue, bg: "#fee2e2", c: "#b91c1c", i: "❗" }].map(k => (
            <div key={k.l} style={{ background: k.bg, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 16 }}>{k.i}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.c, lineHeight: 1.2 }}>{k.v}</div>
              <div style={{ fontSize: 11, color: k.c, opacity: 0.85 }}>{k.l}</div>
            </div>
          ))}
        </div>
      )}

      {isManagerView && lateInsights && lateInsights.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🩻</span><span style={{ fontWeight: 700, fontSize: 14 }}>Phân tích nguyên nhân trễ</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>Rút ra từ dữ liệu · gợi ý cải tiến</span>
          </div>
          <div style={{ padding: "6px 8px" }}>
            {lateInsights.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 10px", fontSize: 13, color: "#374151", lineHeight: 1.55 }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{a.icon}</span><span>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isManagerView && dataHealth && dataHealth.total > 0 && (() => {
        const cats = [
          { key: "overdueNoReason", label: "Quá hạn chưa nêu lý do", list: dataHealth.overdueNoReason, c: "#b91c1c", bg: "#fee2e2", hint: "Nhân viên cần khai báo nguyên nhân trễ" },
          { key: "pendingLong", label: "Chờ duyệt/chấm ≥2 ngày", list: dataHealth.pendingLong, c: "#92400e", bg: "#fef3c7", hint: "Quản lý cần duyệt & đánh giá kịp thời" },
          { key: "stale", label: "Bỏ hoang (0% >7 ngày)", list: dataHealth.stale, c: "#6b7280", bg: "#f3f4f6", hint: "Việc đã giao nhưng chưa ai động tới" },
        ].filter(c => c.list.length > 0);
        const open = healthCat && cats.find(c => c.key === healthCat);
        return (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🩺</span><span style={{ fontWeight: 700, fontSize: 14 }}>Sức khỏe dữ liệu</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>Dữ liệu sạch thì điểm & báo cáo mới đáng tin</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${cats.length},1fr)`, gap: 0 }}>
              {cats.map(c => (
                <div key={c.key} onClick={() => setHealthCat(healthCat === c.key ? null : c.key)} style={{ padding: "12px 16px", borderRight: isMobile ? "none" : "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: healthCat === c.key ? c.bg : "#fff" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: c.c }}>{c.list.length}</div>
                  <div style={{ fontSize: 12, color: "#374151", fontWeight: 500, marginTop: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>{c.hint} · bấm xem</div>
                </div>
              ))}
            </div>
            {open && (
              <div style={{ maxHeight: 240, overflowY: "auto", borderTop: "1px solid #e5e7eb" }}>
                {open.list.map(t => (
                  <div key={t.id} onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "9px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div><div style={{ fontSize: 11, color: "#6b7280" }}>{t.dept} · {getEmp(t.eid)?.name || "–"} · Hạn {fmtDate(t.deadline)}</div></div>
                    <span style={{ background: open.bg, color: open.c, fontSize: 11, padding: "2px 8px", borderRadius: 8, flexShrink: 0, height: "fit-content" }}>{STATUS[t.status]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {atRiskTasks && atRiskTasks.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "2px solid #fed7aa", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #fed7aa", background: "#fff7ed", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span><span style={{ fontWeight: 700, fontSize: 14, color: "#9a3412" }}>Nguy cơ trễ ({atRiskTasks.length})</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>Dự báo theo tiến độ vs thời gian + lịch sử người thực hiện</span>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {atRiskTasks.slice(0, 12).map(t => { const dl = t.deadline; const dd = dl ? Math.ceil((new Date(new Date(dl).setHours(0,0,0,0)) - new Date(new Date().setHours(0,0,0,0))) / 86400000) : null; const hi = t.__risk?.level === "high"; return (
              <div key={t.id} onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "9px 16px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{t.dept} · {getEmp(t.eid)?.name || "–"} · TĐ {t.progress || 0}% · {dd === 0 ? "hết hạn hôm nay" : `còn ${dd} ngày`}</div>
                </div>
                <span title={`Điểm rủi ro ${t.__risk?.score}`} style={{ background: hi ? "#fee2e2" : "#fef3c7", color: hi ? "#b91c1c" : "#92400e", fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{hi ? "🔴 Cao" : "🟡 TB"}</span>
              </div>
            ); })}
          </div>
        </div>
      )}

      {myTasks && !FULL_ACCESS.includes(currentUser.role) && (
        <div style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)", borderRadius: 12, padding: 16, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div><div style={{ fontWeight: 700, fontSize: 15 }}>👤 {currentUser.full_name}</div><div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{userDept ? `Phòng ${userDept}` : ""}{currentUser.role === "staff" && empProfile && <button onClick={printSelfReview} style={{ marginLeft: 10, background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>🖨 Tự đánh giá</button>}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 28, fontWeight: 800, color: "#a5b4fc" }}>{myTasks.rate}%</div><div style={{ fontSize: 11, opacity: 0.7 }}>Tỷ lệ HT</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 8 }}>
            {[{v:myTasks.total,l:"Tổng việc",c:"#c7d2fe"},{v:myTasks.done,l:"Hoàn thành",c:"#86efac"},{v:myTasks.over,l:"Quá hạn",c:"#fca5a5"},{v:myTasks.completedLate,l:"HT quá hạn",c:"#fda4af"},{v:myTasks.nd,l:"Sắp hết hạn",c:"#fde68a"},{v:myTasks.rate+"%",l:"Tỷ lệ HT",c:"#a5f3fc"}].map(s => (
              <div key={s.l} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2, lineHeight: 1.3 }}>{s.l}</div>
              </div>
            ))}
          </div>
          {myTasks.breakdown && (myTasks.breakdown.support + myTasks.breakdown.proj + myTasks.breakdown.other) > 0 && (
            <div style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.6, marginBottom: myTasks.pending.length ? 12 : 0 }}>
              Gồm: 📋 {myTasks.breakdown.task} nhiệm vụ · 🎧 {myTasks.breakdown.support} hỗ trợ · 💰 {myTasks.breakdown.proj} bước ngân sách · 📌 {myTasks.breakdown.other} nhiệm vụ khác
              <span style={{ opacity: 0.75 }}> · (mọi chỉ số gồm cả bước dự án/nhiệm vụ khác)</span>
            </div>
          )}
          {myWorkloadCompare && myWorkloadCompare.n > 0 && (
            <div style={{ fontSize: 11.5, marginTop: 8, background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 10px", lineHeight: 1.5 }}>
              📊 Khối lượng quy đổi tháng này của bạn: <b>{myWorkloadCompare.mine}</b> · TB phòng {myWorkloadCompare.dept}: <b>{myWorkloadCompare.deptAvg}</b>
              {myWorkloadCompare.deptAvg > 0 && <> → bạn <b style={{ color: myWorkloadCompare.diffPct >= 0 ? "#86efac" : "#fca5a5" }}>{myWorkloadCompare.diffPct >= 0 ? "cao hơn" : "thấp hơn"} {Math.abs(myWorkloadCompare.diffPct)}%</b> trung bình phòng</>}
            </div>
          )}
          {myTasks.pending.length > 0 && (
            <div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>Việc cần làm:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {myTasks.pending.map(t => (
                  <div key={t.id} onClick={() => { setModal(t); loadComments(t.id); }} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>
                    <span style={{ fontSize: 12, flex: 1, whiteSpace: "normal", wordBreak: "break-word" }}>{t.title}</span>
                    <span style={{ fontSize: 10, marginLeft: 8, background: t.status === "overdue" ? "#dc2626" : "#ca8a04", padding: "1px 6px", borderRadius: 8, flexShrink: 0 }}>{STATUS[t.status]?.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {myTasks && !FULL_ACCESS.includes(currentUser.role) && myTrend.some(m => m["Tổng"] > 0) && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>📈 Tiến bộ của tôi (6 tháng)</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={myTrend}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="Tổng" stroke="#94a3b8" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="Hoàn thành" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {myWorkList && !FULL_ACCESS.includes(currentUser.role) && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15 }}>📋</span><span style={{ fontWeight: 700, fontSize: 14 }}>Công việc của tôi ({myWorkList.length})</span>
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: isMobile ? 0 : "auto", flex: isMobile ? "1 1 100%" : "0 1 auto" }}>Chủ trì + phối hợp · mọi loại nhiệm vụ · quá hạn/gần hết hạn xếp trên</span>
          </div>
          {myWorkList.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>🎉 Không còn việc nào đang chờ xử lý</div>
          ) : (<>
            <div>
              {wlPaged.map(it => {
                const sc = STATUS[it.status] || STATUS.on_time;
                const typeColor = it.kind === "task" ? "#4338ca" : it.kind === "proj" ? "#0d9488" : "#c2410c";
                const typeBg = it.kind === "task" ? "#eef2ff" : it.kind === "proj" ? "#ccfbf1" : "#ffedd5";
                const open = () => { if (it.kind === "task") { setModal(it.task); loadComments(it.task.id); } else if (it.kind === "proj") setView("investment"); else setView("othertasks"); };
                return (
                  <div key={it.key} onClick={open} style={{ padding: "9px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "normal", wordBreak: "break-word" }}>{it.title}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span style={{ background: typeBg, color: typeColor, padding: "1px 7px", borderRadius: 6, fontWeight: 600 }}>{it.typeLabel}</span>
                        <span style={{ background: it.role === "Chủ trì" ? "#e0e7ff" : "#f3e8ff", color: it.role === "Chủ trì" ? "#4338ca" : "#7c3aed", padding: "1px 7px", borderRadius: 6 }}>{it.role}</span>
                        {it.prio && it.prio !== "medium" && PRIO[it.prio] && <span style={{ background: PRIO[it.prio].bg, color: PRIO[it.prio].col, padding: "1px 7px", borderRadius: 6, fontWeight: 600 }}>⚡ {PRIO[it.prio].label}</span>}
                        {it.deadline && <span>Hạn: {fmtDate(it.deadline)}</span>}
                      </div>
                    </div>
                    <span style={{ background: sc.bg, color: sc.col, fontSize: 11, padding: "2px 8px", borderRadius: 8, flexShrink: 0, fontWeight: 600 }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
            {myWorkList.length > WL_SIZE && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid #f3f4f6" }}>
                <button disabled={wlPageSafe === 1} onClick={() => setWlPage(p => Math.max(1, p - 1))} style={{ padding: "5px 12px", border: "1px solid #d1d5db", borderRadius: 7, background: "#fff", cursor: wlPageSafe === 1 ? "default" : "pointer", opacity: wlPageSafe === 1 ? 0.5 : 1, fontSize: 13 }}>◀</button>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Trang {wlPageSafe}/{wlTotalPages}</span>
                <button disabled={wlPageSafe === wlTotalPages} onClick={() => setWlPage(p => Math.min(wlTotalPages, p + 1))} style={{ padding: "5px 12px", border: "1px solid #d1d5db", borderRadius: 7, background: "#fff", cursor: wlPageSafe === wlTotalPages ? "default" : "pointer", opacity: wlPageSafe === wlTotalPages ? 0.5 : 1, fontSize: 13 }}>▶</button>
              </div>
            )}
          </>)}
        </div>
      )}

      {myDoneList && !FULL_ACCESS.includes(currentUser.role) && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div onClick={() => setDoneOpen(o => !o)} style={{ padding: "10px 14px", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <span style={{ fontSize: 15 }}>✅</span><span style={{ fontWeight: 700, fontSize: 14 }}>Đã hoàn thành tháng này ({myDoneList.length})</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>{doneOpen ? "Thu gọn ▲" : "Xem ▼"}</span>
          </div>
          {doneOpen && (myDoneList.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Chưa có việc nào hoàn thành trong tháng này</div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {myDoneList.map(it => {
                const typeColor = it.kind === "task" ? "#4338ca" : it.kind === "proj" ? "#0d9488" : it.kind === "support" ? "#b45309" : "#c2410c";
                const typeBg = it.kind === "task" ? "#eef2ff" : it.kind === "proj" ? "#ccfbf1" : it.kind === "support" ? "#fef3c7" : "#ffedd5";
                const onClk = it.kind === "task" ? () => { setModal(it.task); loadComments(it.task.id); } : it.kind === "proj" ? () => setView("investment") : it.kind === "support" ? () => setView("supportcases") : () => setView("othertasks");
                return (
                  <div key={it.key} onClick={onClk} style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontSize: 13, color: "#16a34a", flexShrink: 0 }}>✓</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, whiteSpace: "normal", wordBreak: "break-word" }}>{it.title}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span style={{ background: typeBg, color: typeColor, padding: "1px 7px", borderRadius: 6, fontWeight: 600 }}>{it.typeLabel}</span>
                        <span style={{ background: it.role === "Chủ trì" ? "#e0e7ff" : "#f3e8ff", color: it.role === "Chủ trì" ? "#4338ca" : "#7c3aed", padding: "1px 7px", borderRadius: 6 }}>{it.role}</span>
                        {it.date && <span>{fmtDate(it.date)}</span>}
                      </div>
                    </div>
                    {it.status === "completed_late" && <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: 10.5, padding: "2px 7px", borderRadius: 8, flexShrink: 0 }}>HT trễ</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {isManagerView && (<>
      {rosterEmps.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16 }}>👥</span><span style={{ fontWeight: 700, fontSize: 14 }}>Nhân sự {FULL_ACCESS.includes(currentUser.role) ? "toàn cơ quan" : `phòng ${userDept}`} ({rosterEmps.length})</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>Bấm một người để xem hồ sơ đánh giá chi tiết</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f9fafb" }}>{[["Nhân viên", "left"], ["Việc đang mở", "center"], ["Điểm tháng", "center"], ["Đúng hạn", "center"], ["", "center"]].map(([h, al], i) => <th key={i} style={{ padding: "8px 12px", textAlign: al, fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{rosterPaged.map(e => { const p = empProfile(e.id); if (!p) return null; const over = p.openW >= overloadThreshold; return (
                <tr key={e.id} onClick={() => setProfileId(e.id)} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} onMouseEnter={ev => ev.currentTarget.style.background = "#f9fafb"} onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "9px 12px" }}><div style={{ fontWeight: 500 }}>{e.name}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{e.dept} · {e.role}</div></td>
                  <td style={{ padding: "9px 12px", textAlign: "center", whiteSpace: "nowrap" }}><span style={{ color: over ? "#b91c1c" : "#374151", fontWeight: over ? 700 : 500 }}>{p.openCount}</span> <span style={{ fontSize: 11, color: "#9ca3af" }}>(≈{p.openW})</span>{over && " 🔥"}</td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>{p.cur.resolved > 0 ? <span style={{ fontWeight: 700, color: p.cur.eligible ? "#111827" : "#9ca3af" }}>{p.cur.perfScore}{!p.cur.eligible && <span style={{ fontSize: 10, fontWeight: 400 }}> (tk)</span>}</span> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                  <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 500, color: p.cur.resolved === 0 ? "#d1d5db" : p.onTimeRate >= 80 ? "#15803d" : p.onTimeRate >= 50 ? "#92400e" : "#b91c1c" }}>{p.cur.resolved > 0 ? p.onTimeRate + "%" : "—"}</td>
                  <td style={{ padding: "9px 12px", textAlign: "center", color: "#6366f1", fontSize: 12, whiteSpace: "nowrap" }}>Xem ›</td>
                </tr>
              ); })}</tbody>
            </table>
          </div>
          <div style={{ padding: "8px 16px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>💡 "Điểm tháng" theo tháng đang chọn ở Báo cáo · (tk) = điểm tham khảo khi chưa đủ 5 việc đến hạn</span>
            {rosterTotalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button onClick={() => setRosterPage(p => Math.max(1, p - 1))} disabled={rosterPageSafe <= 1} style={{ padding: "3px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: rosterPageSafe <= 1 ? "#f3f4f6" : "#fff", color: rosterPageSafe <= 1 ? "#d1d5db" : "#374151", cursor: rosterPageSafe <= 1 ? "default" : "pointer", fontSize: 12 }}>‹</button>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{rosterPageSafe}/{rosterTotalPages}</span>
                <button onClick={() => setRosterPage(p => Math.min(rosterTotalPages, p + 1))} disabled={rosterPageSafe >= rosterTotalPages} style={{ padding: "3px 10px", border: "1px solid #d1d5db", borderRadius: 6, background: rosterPageSafe >= rosterTotalPages ? "#f3f4f6" : "#fff", color: rosterPageSafe >= rosterTotalPages ? "#d1d5db" : "#374151", cursor: rosterPageSafe >= rosterTotalPages ? "default" : "pointer", fontSize: 12 }}>›</button>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(7,minmax(0,1fr))", gap: isMobile ? 8 : 8 }}>
        {[{label:"Tổng",val:stats.total,bg:"#eef2ff",col:"#4338ca",key:"total"},{label:"Trong hạn",val:stats.on_time,bg:"#dcfce7",col:"#15803d",key:"on_time"},{label:"Sắp hết hạn",val:stats.nearly_due,bg:"#fef9c3",col:"#92400e",key:"nearly_due"},{label:"Quá hạn",val:stats.overdue,bg:"#fee2e2",col:"#b91c1c",key:"overdue"},{label:"Chờ duyệt",val:stats.pending_approval,bg:"#fef3c7",col:"#92400e",key:"pending_approval"},{label:"HT quá hạn",val:stats.completed_late,bg:"#fee2e2",col:"#991b1b",key:"completed_late"},{label:"Hoàn thành",val:stats.completed,bg:"#e0e7ff",col:"#4338ca",key:"completed"}].map(c => (
          <div key={c.label} onClick={() => setStatFilter(f => f === c.key ? null : c.key)} style={{ background: c.bg, borderRadius: 9, padding: isMobile ? 10 : "10px 12px", minHeight: isMobile ? 92 : 96, cursor: "pointer", border: "1.5px solid " + (statFilter === c.key ? c.col : "transparent"), transition: "border 0.15s", userSelect: "none", boxSizing: "border-box", overflow: "hidden" }}>
            <div style={{ fontSize: isMobile ? 22 : 24, lineHeight: 1.1, fontWeight: 700, color: c.col }}>{c.val}</div>
            {statsW && <div title="Đã quy đổi theo trọng số nhiệm vụ định kỳ (ngày 0.25 · tuần 1 · 2 tuần 1.5 · tháng 2.5 · quý/6 tháng/năm 3)" style={{ fontSize: isMobile ? 10 : 10.5, color: c.col, opacity: 0.65, lineHeight: 1.3, marginTop: 2, whiteSpace: "nowrap" }}>≈ {statsW[c.key]} quy đổi</div>}
            <div style={{ fontSize: isMobile ? 11 : 12, color: c.col, opacity: 0.85, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
            {statFilter === c.key && <div style={{ fontSize: 10, color: c.col, marginTop: 4, whiteSpace: "nowrap" }}>▲ đang lọc</div>}
          </div>
        ))}
        {statFilter && (() => {
          const list = statFilter === "total" ? computed : computed.filter(t => t.status === statFilter);
          const label = { total:"Tất cả",on_time:"Trong hạn",nearly_due:"Sắp hết hạn",overdue:"Quá hạn",pending_approval:"Chờ duyệt",completed_late:"Hoàn thành quá hạn",completed:"Hoàn thành" }[statFilter];
          return (
            <div style={{ gridColumn: "1 / -1", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden", marginTop: 4 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>📋 {label} ({list.length})</span>
                <button onClick={() => setStatFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af" }}>✕</button>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto", overflowX: "hidden", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)" }}>
                {list.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13, gridColumn: "1/-1" }}>Không có nhiệm vụ</div> : list.map(t => {
                  const sc = STATUS[t.status]; const emp = getEmp(t.eid);
                  return (
                    <div key={t.id} onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "normal", wordBreak: "break-word" }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, whiteSpace: "normal", wordBreak: "break-word" }}>{t.dept} · {emp?.name || "–"} · Hạn: {fmtDate(t.deadline)}</div>
                      </div>
                      <span style={{ background: sc.bg, color: sc.col, fontSize: 11, padding: "2px 8px", borderRadius: 8, flexShrink: 0 }}>{sc.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Theo phòng ban</div>
          <ResponsiveContainer width="100%" height={160}><BarChart data={deptChart} barSize={10}><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} allowDecimals={false} /><Tooltip /><Bar dataKey="Trong hạn" fill="#16a34a" radius={[3,3,0,0]} /><Bar dataKey="Sắp hết hạn" fill="#ca8a04" radius={[3,3,0,0]} /><Bar dataKey="Quá hạn" fill="#dc2626" radius={[3,3,0,0]} /><Bar dataKey="Chờ duyệt" fill="#f59e0b" radius={[3,3,0,0]} /><Bar dataKey="HT quá hạn" fill="#991b1b" radius={[3,3,0,0]} /><Bar dataKey="Hoàn thành" fill="#6366f1" radius={[3,3,0,0]} /></BarChart></ResponsiveContainer>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Tỷ lệ trạng thái</div>
          <ResponsiveContainer width="100%" height={160}><PieChart><Pie data={[{name:"Trong hạn",value:stats.on_time},{name:"Sắp hết hạn",value:stats.nearly_due},{name:"Quá hạn",value:stats.overdue},{name:"Chờ duyệt",value:stats.pending_approval},{name:"HT quá hạn",value:stats.completed_late},{name:"Hoàn thành",value:stats.completed}]} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,value}) => value > 0 ? `${name}(${value})` : ""} labelLine={false} style={{ fontSize: 9 }}>{["#16a34a","#ca8a04","#dc2626","#f59e0b","#991b1b","#6366f1"].map((c,i) => <Cell key={i} fill={c} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </div>
      </div>

      {overloadedEmps.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 10, border: "2px solid #fca5a5", overflow: "hidden" }}>
          <div style={{ background: "#fff5f5", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>⚠️</span><span style={{ fontWeight: 600, fontSize: 13, color: "#b91c1c" }}>Cảnh báo quá tải ({overloadedEmps.length} người)</span></div>
            <div title="Tính theo khối lượng QUY ĐỔI đang mở (nhiệm vụ định kỳ nhân trọng số), không đếm thô đầu việc" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>Ngưỡng: <input type="number" min={2} max={20} value={overloadThreshold} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 50) { setOverloadThreshold(v); localStorage.setItem("qlcv_overload", v); } }} style={{ width: 44, padding: "2px 6px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12, textAlign: "center" }} /> quy đổi</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)" }}>
            {overloadedEmps.map(emp => (
              <div key={emp.id} style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div><div style={{ fontWeight: 500, fontSize: 13 }}>{emp.name}</div><div style={{ fontSize: 11, color: "#6b7280" }}>{emp.dept} · {emp.role}</div></div>
                <span onClick={() => setOverloadPopup(overloadPopup === emp.id ? null : emp.id)} title={`${emp.activeCount} đầu việc · ${emp.activeW} việc quy đổi`} style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 13, padding: "4px 10px", borderRadius: 20, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>≈{emp.activeW} <span style={{ fontWeight: 400, fontSize: 11 }}>({emp.activeCount} việc)</span></span>
              </div>
            ))}
          </div>
          <OverloadPopup emp={overloadedEmps.find(e => e.id === overloadPopup)} computed={computed} employees={employees} onReassign={onReassign} onClose={() => setOverloadPopup(null)} onOpen={t => { setModal(t); loadComments(t.id); }} isMobile={isMobile} />
        </div>
      )}

      {recurringTemplates.filter(t => t.active).length > 0 && (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e0e7ff", overflow: "hidden" }}>
          <div style={{ background: "#eef2ff", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>🔄</span><span style={{ fontWeight: 600, fontSize: 13, color: "#4338ca" }}>Nhiệm vụ định kỳ ({recurringTemplates.filter(t => t.active).length})</span></div>
            <button onClick={() => setShowRecurring(true)} style={{ fontSize: 12, color: "#4f46e5", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Quản lý</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12 }}>
            {recurringTemplates.filter(t => t.active).slice(0, 6).map(t => (
              <div key={t.id} style={{ background: "#f1f5f9", borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                <span style={{ fontWeight: 500 }}>{t.title}</span>
                <span style={{ color: "#6b7280", marginLeft: 6 }}>{FREQUENCIES.find(f => f.value === t.frequency)?.label}</span>
                <span style={{ color: t.next_date <= todayStr ? "#b91c1c" : "#15803d", marginLeft: 6 }}>· {t.next_date <= todayStr ? "Đến hạn" : "Còn " + Math.ceil((new Date(t.next_date) - new Date(todayStr)) / 86400000) + " ngày"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        {[{s:"overdue",title:"Quá hạn",border:"#fca5a5",hdr:"#fef2f2"},{s:"nearly_due",title:"Sắp hết hạn",border:"#fde68a",hdr:"#fefce8"}].map(({s,title,border,hdr}) => {
          const list = computed.filter(t => t.status === s);
          return (
            <div key={s} style={{ background: "#fff", borderRadius: 10, border: "1px solid " + border, overflow: "hidden" }}>
              <div style={{ background: hdr, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS[s].dot }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: STATUS[s].col }}>{title} ({list.length})</span>
              </div>
              <div style={{ maxHeight: 150, overflowY: "auto" }}>
                {list.length === 0 ? <div style={{ padding: 14, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Không có</div> : list.map(t => (
                  <div key={t.id} onClick={() => { setModal(t); loadComments(t.id); }} style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "normal", wordBreak: "break-word" }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{t.dept} · {getEmp(t.eid)?.name || "–"} · {fmtDate(t.deadline)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </>)}

      {profileId && <EmpProfileModal profile={empProfile(profileId)} isMobile={isMobile} overloadThreshold={overloadThreshold} onClose={() => setProfileId(null)} onOpenTask={id => { const t = computed.find(x => x.id === id); if (t) { setModal(t); loadComments(t.id); setProfileId(null); } }} />}
    </div>
  );
}

// ── Hồ sơ đánh giá 1 nhân viên (mở từ bảng "Nhân sự") ──
function EmpProfileModal({ profile, isMobile, overloadThreshold, onClose, onOpenTask }) {
  if (!profile) return null;
  const { emp, cur, trend, open, openCount, openW, lateReasons, lateTotal, onTimeRate, proactive, skills } = profile;
  const over = openW >= overloadThreshold;
  const scoreTrend = trend.filter(t => t.score != null);
  const box = { background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", textAlign: "center" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: isMobile ? "12px 8px" : 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{emp.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}><span style={{ background: (DEPT_COLOR[emp.dept] || "#888") + "22", color: DEPT_COLOR[emp.dept] || "#555", fontWeight: 600, padding: "1px 8px", borderRadius: 8 }}>{emp.dept}</span> · {emp.role}</div>
          </div>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", cursor: "pointer", fontSize: 18, color: "#374151", width: 28, height: 28, borderRadius: "50%" }}>✕</button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Chỉ số tháng đang chọn */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>📊 Tháng đang chọn</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 8 }}>
              <div style={box}><div style={{ fontSize: 22, fontWeight: 800, color: cur.resolved === 0 ? "#d1d5db" : cur.eligible ? "#4338ca" : "#9ca3af" }}>{cur.resolved > 0 ? cur.perfScore : "—"}</div><div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 2 }}>Điểm{cur.resolved > 0 && !cur.eligible ? " (tham khảo)" : ""}</div></div>
              <div style={box}><div style={{ fontSize: 22, fontWeight: 800, color: onTimeRate >= 80 ? "#15803d" : onTimeRate >= 50 ? "#92400e" : "#b91c1c" }}>{cur.resolved > 0 ? onTimeRate + "%" : "—"}</div><div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 2 }}>Đúng hạn</div></div>
              <div style={box}><div style={{ fontSize: 22, fontWeight: 800, color: "#0f766e" }}>{cur.done}</div><div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 2 }}>Việc quy đổi HT</div></div>
              <div style={box}><div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed" }}>{cur.collabTotal || 0}</div><div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 2 }}>Phối hợp (½)</div></div>
            </div>
            {cur.breakdown && (
              <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 8, lineHeight: 1.6 }}>
                Cấu thành điểm: ⏱️ thời hạn <b>{cur.breakdown.timeliness}</b> + ⭐ chất lượng <b>{cur.breakdown.quality}</b>{cur.breakdown.penalty > 0 && <> − phạt trễ <b style={{ color: "#b91c1c" }}>{cur.breakdown.penalty}</b></>}{cur.breakdown.workloadBonus > 0 && <> + thưởng KL <b style={{ color: "#15803d" }}>{cur.breakdown.workloadBonus}</b></>}{cur.breakdown.prioBonus > 0 && <> + thưởng ưu tiên <b style={{ color: "#15803d" }}>{cur.breakdown.prioBonus}</b></>}
                {!cur.eligible && cur.resolved > 0 && <span style={{ fontStyle: "italic" }}> · chưa đủ 5 việc đến hạn nên chỉ là điểm tham khảo</span>}
              </div>
            )}
          </div>
          {/* Chân dung năng lực theo loại việc */}
          {skills && skills.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>🎯 Năng lực theo loại việc <span style={{ color: "#9ca3af", fontWeight: 400 }}>(lịch sử)</span></div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${skills.length},1fr)`, gap: 8 }}>
                {skills.map(s => (
                  <div key={s.label} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: "9px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{s.label} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({s.resolved})</span></div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>Đúng hạn <b style={{ color: s.onTimeRate >= 80 ? "#15803d" : s.onTimeRate >= 50 ? "#92400e" : "#b91c1c" }}>{s.onTimeRate}%</b>{s.avgRating != null && <> · Chất lượng TB <b>{s.avgRating}</b>/4</>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Chỉ số chủ động (tham khảo, không vào điểm) */}
          {proactive && (
            <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6d28d9", marginBottom: 4 }}>⚡ Tính chủ động <span style={{ color: "#9ca3af", fontWeight: 400 }}>(tham khảo, không tính vào điểm)</span></div>
              <div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.6 }}>
                Hoàn thành SỚM hạn: <b style={{ color: proactive.earlyRate >= 50 ? "#15803d" : "#6d28d9" }}>{proactive.earlyRate}%</b> ({proactive.early}/{proactive.doneOnTime} việc đúng hạn xong trước hạn ≥1 ngày) · Khối lượng phối hợp tháng: <b>{proactive.collabW}</b>
              </div>
            </div>
          )}
          {/* Xu hướng 6 tháng */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>📈 Xu hướng điểm 6 tháng</div>
            {scoreTrend.length >= 2 ? (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trend} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} /><Tooltip formatter={v => v == null ? "—" : v + "đ"} />
                  <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={{ fontSize: 12, color: "#9ca3af", padding: "8px 0" }}>Chưa đủ dữ liệu để vẽ xu hướng.</div>}
          </div>
          {/* Nguyên nhân trễ */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>⏰ Nguyên nhân trễ {lateTotal > 0 && <span style={{ color: "#9ca3af", fontWeight: 400 }}>({lateTotal} lần)</span>}</div>
            {lateReasons.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {lateReasons.map(r => <span key={r.value} style={{ background: "#fef2f2", color: "#b91c1c", fontSize: 12, padding: "3px 10px", borderRadius: 20, border: "1px solid #fecaca" }}>{r.label}: <b>{r.count}</b></span>)}
              </div>
            ) : <div style={{ fontSize: 12, color: "#15803d" }}>✅ Không có việc nào bị ghi nhận trễ hạn.</div>}
          </div>
          {/* Việc đang mở */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>📋 Việc đang mở: {openCount} <span style={{ color: over ? "#b91c1c" : "#9ca3af", fontWeight: over ? 700 : 400 }}>(≈{openW} quy đổi{over ? " · quá tải" : ""})</span></div>
            {open.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
                {open.map(t => (
                  <div key={t.id} onClick={() => onOpenTask(t.id)} style={{ padding: "7px 10px", background: "#f9fafb", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = "#f9fafb"}>
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div><div style={{ fontSize: 11, color: "#6b7280" }}>Hạn: {fmtDate(t.deadline)}{t.nudge_count > 0 && <span style={{ color: "#9a3412" }}> · 🔔 đã nhắc {t.nudge_count}</span>}</div></div>
                    <span style={{ background: STATUS[t.status]?.bg, color: STATUS[t.status]?.col, fontSize: 11, padding: "2px 8px", borderRadius: 8, flexShrink: 0, whiteSpace: "nowrap" }}>{STATUS[t.status]?.label}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize: 12, color: "#15803d" }}>✅ Không còn việc nào đang mở.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
