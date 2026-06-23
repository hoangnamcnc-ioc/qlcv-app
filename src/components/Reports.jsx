import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { DEPTS, DEPT_COLOR, VI_MONTHS, RATING } from "../constants";

export default function Reports({
  isMobile, inp,
  repTab, setRepTab,
  repMonth, setRepMonth, repYear, setRepYear,
  rankYear, setRankYear,
  repStats, repTasks, repDeptData, repEmpData, repMonthTrend,
  leaderboard,
  lateReasonStats,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 8 }}>
        {[["monthly","📅 Tháng"],["leaderboard","🏆 Xếp hạng"],["late_reasons","📊 Nguyên nhân trễ"]].map(([id, label]) => (
          <button key={id} onClick={() => setRepTab(id)} style={{ flex: 1, padding: "7px 8px", border: "none", borderRadius: 7, background: repTab === id ? "#4f46e5" : "transparent", color: repTab === id ? "#fff" : "#6b7280", cursor: "pointer", fontSize: isMobile ? 11 : 13, fontWeight: repTab === id ? 600 : 400 }}>{label}</button>
        ))}
      </div>

      {repTab === "monthly" && (<>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <select value={repMonth} onChange={e => setRepMonth(Number(e.target.value))} style={{ ...inp, width: "auto", padding: "6px 10px" }}>{VI_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
          <select value={repYear} onChange={e => setRepYear(Number(e.target.value))} style={{ ...inp, width: 90, padding: "6px 10px" }}>{[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <span style={{ fontSize: 13, color: "#6b7280" }}>{repTasks.length} nhiệm vụ</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 12 }}>
          {[{label:"Tổng",val:repStats.total,bg:"#eef2ff",col:"#4338ca",icon:"📋"},{label:"Hoàn thành",val:repStats.done,bg:"#dcfce7",col:"#15803d",icon:"✅"},{label:"Quá hạn",val:repStats.over,bg:"#fee2e2",col:"#b91c1c",icon:"❌"},{label:"HT quá hạn",val:repStats.completedLate,bg:"#fff1f2",col:"#991b1b",icon:"⏰"},{label:"Tỷ lệ HT",val:repStats.rate+"%",bg:"#fef9c3",col:"#92400e",icon:"⭐"}].map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.col }}>{c.val}</div>
              <div style={{ fontSize: 12, color: c.col, opacity: 0.8, marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Hiệu suất phòng ban</div>
            <ResponsiveContainer width="100%" height={180}><BarChart data={repDeptData} barSize={14}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="total" name="Tổng" fill="#e0e7ff" radius={[4,4,0,0]} /><Bar dataKey="done" name="Hoàn thành" fill="#6366f1" radius={[4,4,0,0]} /><Bar dataKey="over" name="Quá hạn" fill="#dc2626" radius={[4,4,0,0]} /><Bar dataKey="completedLate" name="HT quá hạn" fill="#991b1b" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
          </div>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Xu hướng 6 tháng</div>
            <ResponsiveContainer width="100%" height={180}><LineChart data={repMonthTrend}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="total" name="Tổng" stroke="#94a3b8" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="done" name="HT" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
          </div>
        </div>
        {repEmpData.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Hiệu suất nhân viên</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Điểm = (HT đúng hạn×1 + HT trễ×0.5) / Tổng × 100 · Chỉ tính cho người được giao ≥5 việc/tháng</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
                <thead><tr style={{ background: "#f9fafb" }}>{["","Nhân viên","Phòng","Tổng","HT","HT quá hạn","QH","Điểm hiệu suất"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{h}</th>)}</tr></thead>
                <tbody>{repEmpData.map(e => {
                  const eligibleRank = e.eligible ? repEmpData.filter(x => x.eligible).findIndex(x => x.id === e.id) : -1;
                  const medal = eligibleRank === 0 ? "🥇" : eligibleRank === 1 ? "🥈" : eligibleRank === 2 ? "🥉" : "";
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6", background: medal ? "#f0fdf4" : "#fff", opacity: e.eligible ? 1 : 0.6 }}>
                      <td style={{ padding: "9px 12px", fontSize: 16 }}>{medal}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 500 }}>{e.name}</td>
                      <td style={{ padding: "9px 12px" }}><span style={{ background: DEPT_COLOR[e.dept] + "22", color: DEPT_COLOR[e.dept], fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>{e.dept}</span></td>
                      <td style={{ padding: "9px 12px" }}>{e.total}</td>
                      <td style={{ padding: "9px 12px", color: "#15803d", fontWeight: 500 }}>{e.done - (e.completedLate || 0)}</td>
                      <td style={{ padding: "9px 12px", color: e.completedLate > 0 ? "#991b1b" : "#9ca3af", fontWeight: e.completedLate > 0 ? 700 : 400 }}>{e.completedLate || 0}</td>
                      <td style={{ padding: "9px 12px", color: e.over > 0 ? "#b91c1c" : "#6b7280", fontWeight: e.over > 0 ? 600 : 400 }}>{e.over}</td>
                      <td style={{ padding: "9px 12px" }}>
                        {!e.eligible ? <span style={{ fontSize: 12, color: "#9ca3af" }}>Chưa đủ ĐK <span style={{ fontSize: 10 }}>(cần ≥5 việc, hiện {e.total})</span></span> : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: e.perfScore + "%", background: e.perfScore >= 80 ? "#16a34a" : e.perfScore >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 6 }} /></div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: e.perfScore >= 80 ? "#15803d" : e.perfScore >= 50 ? "#92400e" : "#b91c1c" }}>{e.perfScore}đ</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
        )}
      </>)}

      {repTab === "leaderboard" && (<>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>🏆 Xếp hạng năm</span>
          <select value={rankYear} onChange={e => setRankYear(Number(e.target.value))} style={{ ...inp, width: 100, padding: "6px 10px" }}>{[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#9ca3af" }}>Điểm TB năm = trung bình điểm các tháng đủ điều kiện (≥5 việc/tháng) · Công thức: (HT đúng hạn×1 + HT trễ×0.5) / Tổng × 100</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead><tr style={{ background: "#f9fafb" }}>{["Hạng","Nhân viên","Phòng","Tổng","HT","HT quá hạn","QH","Số tháng có việc","Điểm TB năm","Tỷ lệ HT"].map(h => <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>
                {leaderboard.length === 0 && <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Chưa có dữ liệu</td></tr>}
                {leaderboard.map((e, i) => {
                  const ranked = e.score !== null;
                  const medal = ranked && i === 0 ? "🥇" : ranked && i === 1 ? "🥈" : ranked && i === 2 ? "🥉" : `${i + 1}`;
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6", background: ranked && i === 0 ? "#fefce8" : ranked && i === 1 ? "#f9fafb" : ranked && i === 2 ? "#fff7f0" : "#fff", opacity: ranked ? 1 : 0.6 }}>
                      <td style={{ padding: "10px 12px", fontSize: ranked && i < 3 ? 18 : 14, fontWeight: 700 }}>{medal}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{e.name}</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ background: DEPT_COLOR[e.dept] + "22", color: DEPT_COLOR[e.dept], fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>{e.dept}</span></td>
                      <td style={{ padding: "10px 12px" }}>{e.total}</td>
                      <td style={{ padding: "10px 12px", color: "#15803d", fontWeight: 500 }}>{e.done - (e.completedLate || 0)}</td>
                      <td style={{ padding: "10px 12px", color: e.completedLate > 0 ? "#991b1b" : "#9ca3af", fontWeight: e.completedLate > 0 ? 700 : 400 }}>{e.completedLate || 0}</td>
                      <td style={{ padding: "10px 12px", color: e.over > 0 ? "#b91c1c" : "#6b7280", fontWeight: e.over > 0 ? 600 : 400 }}>{e.over}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>{e.eligibleMonths}/12</td>
                      <td style={{ padding: "10px 12px" }}>{e.score === null ? <span style={{ fontSize: 12, color: "#9ca3af" }}>Chưa có dữ liệu</span> : <span style={{ fontSize: 15, fontWeight: 700, color: e.score >= 80 ? "#15803d" : e.score >= 50 ? "#92400e" : "#b91c1c" }}>{e.score}đ</span>}</td>
                      <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: e.rate + "%", background: e.rate >= 80 ? "#16a34a" : e.rate >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 6 }} /></div><span style={{ fontSize: 12, fontWeight: 700, color: e.rate >= 80 ? "#15803d" : e.rate >= 50 ? "#92400e" : "#b91c1c" }}>{e.rate}%</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {repTab === "late_reasons" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Phân bố nguyên nhân</div>
            {lateReasonStats.length === 0 ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>Chưa có dữ liệu</div> : (
              <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={lateReasonStats.map(r => ({ name: r.label, value: r.count }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 10 }}>{lateReasonStats.map((_, i) => <Cell key={i} fill={["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6"][i % 5]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Chi tiết</div>
            {lateReasonStats.length === 0 ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>Chưa có dữ liệu</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lateReasonStats.map((r, i) => (
                  <div key={r.value}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}><span>{r.label}</span><span style={{ fontWeight: 600, color: "#4f46e5" }}>{r.count} ({r.pct}%)</span></div>
                    <div style={{ height: 8, background: "#e5e7eb", borderRadius: 8, overflow: "hidden" }}><div style={{ height: "100%", width: r.pct + "%", background: ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6"][i % 5], borderRadius: 8 }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
