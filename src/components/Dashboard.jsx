import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { DEPTS, DEPT_COLOR, ROLE_COLORS, FULL_ACCESS, STATUS, STATUS_ORDER, FREQUENCIES, RATING } from "../constants";
import { isCompletedStatus, fmtDate } from "../helpers";
import { RoleBadge, OverloadPopup } from "./ui";

export default function Dashboard({
  currentUser, isMobile, userDept,
  execDeptSummary, stats, statsW, deptChart, myTasks, myTrend,
  computed, overloadedEmps, overloadThreshold, setOverloadThreshold,
  dateFrom, setDateFrom, dateTo, setDateTo,
  overloadPopup, setOverloadPopup,
  recurringTemplates, setShowRecurring,
  statFilter, setStatFilter,
  setView, setFDept,
  setModal, loadComments,
  getEmp, todayStr,
}) {
  // Nhân viên (staff) chỉ thấy việc của mình → ẩn các khối mang tính điều hành/toàn phòng
  // (thống kê tổng, biểu đồ phòng ban, cảnh báo quá tải, quản lý nhiệm vụ định kỳ) cho gọn và tránh trùng lặp.
  const isManagerView = FULL_ACCESS.includes(currentUser.role) || ["manager", "deputy_manager"].includes(currentUser.role);
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
            <span style={{ marginLeft: isMobile ? 0 : "auto", fontSize: 11.5, color: "#6b7280", lineHeight: 1.6, flex: isMobile ? "1 1 100%" : "0 1 auto" }}>
              💡 <b style={{ color: "#4338ca" }}>Quy đổi</b> = khối lượng thực sau khi nhân trọng số nhiệm vụ định kỳ:
              hàng ngày <b>0.25</b> · tuần <b>1</b> · 2 tuần <b>1.5</b> · tháng <b>2.5</b> · quý/6 tháng/năm <b>3</b> · nhiệm vụ thường <b>1</b>.
              Cột <b>Tổng việc</b> chỉ đếm số đầu việc nên phòng nhiều việc hàng ngày dễ trông "nhiều" hơn thực tế —
              hãy dùng cột <b>Quy đổi</b> khi so sánh tải giữa các phòng, và <b>Quy đổi/người</b> khi các phòng chênh lệch nhân sự.
              <br />⚠️ Bảng này chỉ tính <b>nhiệm vụ</b> (không gồm Hỗ trợ ND/Xử lý lỗi TTDL và dự án ngân sách), gom theo phòng của nhiệm vụ và trên <b>toàn bộ thời gian</b> —
              nên <b>không trùng</b> với cột "Tổng" ở bảng Hiệu suất nhân viên (bảng đó tính theo tháng và có cộng thêm việc phối hợp ½).
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
                      <div style={{ width: 40, height: 5, background: "#e5e7eb", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: d.rate + "%", background: d.rate >= 80 ? "#16a34a" : d.rate >= 50 ? "#f59e0b" : "#dc2626" }} /></div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: d.rate >= 80 ? "#15803d" : d.rate >= 50 ? "#92400e" : "#b91c1c" }}>{d.rate}%</span>
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
                    <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 50, height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: d.rate + "%", background: d.rate >= 80 ? "#16a34a" : d.rate >= 50 ? "#f59e0b" : "#dc2626" }} /></div><span style={{ fontSize: 12, fontWeight: 600 }}>{d.rate}%</span></div></td>
                    <td style={{ padding: "10px 12px" }}>{d.overloaded > 0 ? <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>⚠️ {d.overloaded} người</span> : <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div style={{ padding: "8px 16px", fontSize: 11, color: "#9ca3af", borderTop: "1px solid #f3f4f6" }}>💡 Bấm vào một phòng để xem chi tiết danh sách nhiệm vụ</div>
        </div>
      )}

      {currentUser.role !== "admin" && (
        <div style={{ background: ROLE_COLORS[currentUser.role]?.[1] || "#eef2ff", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: ROLE_COLORS[currentUser.role]?.[0] || "#4338ca", display: "flex", alignItems: "center", gap: 8, border: "1px solid " + (ROLE_COLORS[currentUser.role]?.[0] || "#4338ca") + "22" }}>
          <RoleBadge role={currentUser.role} />
          <span>{FULL_ACCESS.includes(currentUser.role) ? "Bạn đang xem toàn bộ nhiệm vụ." : ["manager","deputy_manager"].includes(currentUser.role) ? `Bạn đang xem nhiệm vụ phòng ${userDept}.` : "Bạn đang xem nhiệm vụ được giao và phối hợp."}</span>
        </div>
      )}

      {myTasks && !FULL_ACCESS.includes(currentUser.role) && (
        <div style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)", borderRadius: 12, padding: 16, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div><div style={{ fontWeight: 700, fontSize: 15 }}>👤 {currentUser.full_name}</div><div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{userDept ? `Phòng ${userDept}` : ""}</div></div>
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
              <span style={{ opacity: 0.75 }}> · (Quá hạn/Sắp hết hạn chỉ tính nhiệm vụ thường)</span>
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

      {isManagerView && (<>
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
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>Ngưỡng: <input type="number" min={2} max={20} value={overloadThreshold} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 50) { setOverloadThreshold(v); localStorage.setItem("qlcv_overload", v); } }} style={{ width: 44, padding: "2px 6px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12, textAlign: "center" }} /> việc</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)" }}>
            {overloadedEmps.map(emp => (
              <div key={emp.id} style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div><div style={{ fontWeight: 500, fontSize: 13 }}>{emp.name}</div><div style={{ fontSize: 11, color: "#6b7280" }}>{emp.dept} · {emp.role}</div></div>
                <span onClick={() => setOverloadPopup(overloadPopup === emp.id ? null : emp.id)} style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 14, padding: "4px 10px", borderRadius: 20, cursor: "pointer", userSelect: "none" }}>{emp.activeCount} việc</span>
              </div>
            ))}
          </div>
          <OverloadPopup emp={overloadedEmps.find(e => e.id === overloadPopup)} computed={computed} onClose={() => setOverloadPopup(null)} onOpen={t => { setModal(t); loadComments(t.id); }} isMobile={isMobile} />
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

      </>)}

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
    </div>
  );
}
