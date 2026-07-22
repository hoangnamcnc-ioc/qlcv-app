import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { DEPTS, DEPT_COLOR, VI_MONTHS, RATING } from "../constants";
import { fmtDate } from "../helpers";
import { GradingTab, ExecTab, TaskResultReportTab } from "./ExecReports";

// Làm tròn 2 chữ số cho các cột "việc quy đổi" (trọng số 0.25/1.5/2.5…) — tránh hiển thị số lẻ float kiểu 12.379999999999
const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export default function Reports({
  isMobile, inp,
  repTab, setRepTab,
  repMonth, setRepMonth, repYear, setRepYear,
  rankYear, setRankYear,
  repStats, repStatsPrev, repTasks, repDeptData, repEmpData, repMonthTrend,
  leaderboard, managerBoard, managerLeaderboard,
  lateReasonStats,
  getEmp, setModal, loadComments,
  canExec, computed, monthlyScores, snapshotMonth, syncManagerSnapshots, currentUser, overloadThreshold, kpiOnTime,
}) {
  const [whyEmp, setWhyEmp] = useState(null); // nhân viên đang xem giải thích điểm (tháng)
  const [whyYear, setWhyYear] = useState(null); // nhân viên đang xem giải thích điểm (năm/xếp hạng)
  const [whyMgr, setWhyMgr] = useState(null); // quản lý đang xem giải thích điểm điều hành (tháng hoặc năm)
  const [lateReasonDetail, setLateReasonDetail] = useState(null); // nguyên nhân đang xem danh sách nhiệm vụ
  const [chartMode, setChartMode] = useState("raw"); // "raw" = số đầu việc | "w" = việc quy đổi theo trọng số
  const isW = chartMode === "w";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 8, overflowX: "auto" }}>
        {[["monthly","📅 Tháng"],["leaderboard","🏆 Xếp hạng"],["late_reasons","📊 Nguyên nhân trễ"],...(canExec?[["grading","📑 Xếp loại"],["exec","🏛️ Điều hành"],["kq_nv","📄 KQ nhiệm vụ"]]:[])].map(([id, label]) => (
          <button key={id} onClick={() => setRepTab(id)} style={{ flex: 1, padding: "7px 8px", border: "none", borderRadius: 7, background: repTab === id ? "#4f46e5" : "transparent", color: repTab === id ? "#fff" : "#6b7280", cursor: "pointer", fontSize: isMobile ? 11 : 13, fontWeight: repTab === id ? 600 : 400, whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      {repTab === "grading" && canExec && <GradingTab isMobile={isMobile} inp={inp} monthlyScores={monthlyScores} snapshotMonth={snapshotMonth} syncManagerSnapshots={syncManagerSnapshots} currentUser={currentUser} />}
      {repTab === "exec" && canExec && <ExecTab isMobile={isMobile} computed={computed} getEmp={getEmp} setModal={setModal} loadComments={loadComments} overloadThreshold={overloadThreshold} />}
      {repTab === "kq_nv" && canExec && <TaskResultReportTab inp={inp} computed={computed} getEmp={getEmp} currentUser={currentUser} />}

      {repTab === "monthly" && (<>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <select value={repMonth} onChange={e => setRepMonth(Number(e.target.value))} style={{ ...inp, width: "auto", padding: "6px 10px" }}>{VI_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
          <select value={repYear} onChange={e => setRepYear(Number(e.target.value))} style={{ ...inp, width: 90, padding: "6px 10px" }}>{[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          <span style={{ fontSize: 13, color: "#6b7280" }}>{repTasks.length} nhiệm vụ</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 12 }}>
          {[{label:"Tổng",val:repStats.total,sub:repStats.totalW,prev:repStatsPrev?.total,bg:"#eef2ff",col:"#4338ca",icon:"📋",goodUp:null},{label:"Hoàn thành",val:repStats.done,sub:repStats.doneW,prev:repStatsPrev?.done,bg:"#dcfce7",col:"#15803d",icon:"✅",goodUp:true},{label:"Quá hạn",val:repStats.over,sub:repStats.overW,prev:repStatsPrev?.over,bg:"#fee2e2",col:"#b91c1c",icon:"❌",goodUp:false},{label:"HT quá hạn",val:repStats.completedLate,sub:repStats.completedLateW,prev:repStatsPrev?.completedLate,bg:"#fff1f2",col:"#991b1b",icon:"⏰",goodUp:false},{label:"Tỷ lệ HT",val:repStats.rate+"%",sub:repStats.rateW+"%",prev:repStatsPrev?.rate,cur:repStats.rate,pct:true,bg:"#fef9c3",col:"#92400e",icon:"⭐",goodUp:true}].map(c => {
            const curN = c.pct ? c.cur : c.val;
            const hasPrev = repStatsPrev && c.prev != null;
            const diff = hasPrev ? curN - c.prev : 0;
            const diffPct = hasPrev && c.prev !== 0 ? Math.round(diff / c.prev * 100) : (hasPrev && diff !== 0 ? 100 : 0);
            const good = c.goodUp == null ? null : (diff === 0 ? null : (diff > 0) === c.goodUp);
            const arrowCol = good == null ? "#9ca3af" : good ? "#15803d" : "#b91c1c";
            return (
            <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.col }}>{c.val}</div>
              <div title="Đã quy đổi theo trọng số nhiệm vụ định kỳ (ngày 0.25 · tuần 1 · 2 tuần 1.5 · tháng 2.5 · quý/6 tháng/năm 3)" style={{ fontSize: 10.5, color: c.col, opacity: 0.65, marginTop: 2 }}>≈ {c.sub} quy đổi</div>
              <div style={{ fontSize: 12, color: c.col, opacity: 0.8, marginTop: 2 }}>{c.label}</div>
              {hasPrev && <div title={`Tháng trước (${repStatsPrev.label}): ${c.prev}${c.pct?"%":""}`} style={{ fontSize: 11, marginTop: 4, color: arrowCol, fontWeight: 600 }}>{diff === 0 ? "→ 0" : `${diff > 0 ? "▲" : "▼"} ${Math.abs(c.pct ? diff : diffPct)}${c.pct ? " điểm%" : "%"}`} <span style={{ color: c.col, opacity: 0.55, fontWeight: 400 }}>vs kỳ trước</span></div>}
              {c.pct && kpiOnTime != null && <div style={{ fontSize: 10.5, marginTop: 3, fontWeight: 700, color: repStats.rate >= kpiOnTime ? "#15803d" : "#b91c1c" }}>🎯 Chỉ tiêu {kpiOnTime}%: {repStats.rate >= kpiOnTime ? "Đạt" : "Chưa đạt"}</div>}
            </div>
          );})}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Hiệu suất phòng ban</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[["raw","Đầu việc"],["w","Quy đổi"]].map(([m, lb]) => (
                  <button key={m} onClick={() => setChartMode(m)} title={m === "w" ? "Nhân trọng số nhiệm vụ định kỳ (ngày 0.25 · tuần 1 · 2 tuần 1.5 · tháng 2.5 · quý/6 tháng/năm 3)" : "Đếm số đầu việc, mỗi nhiệm vụ = 1"} style={{ padding: "3px 10px", fontSize: 11, borderRadius: 7, cursor: "pointer", border: "1px solid " + (chartMode === m ? "#4f46e5" : "#e5e7eb"), background: chartMode === m ? "#eef2ff" : "#fff", color: chartMode === m ? "#4338ca" : "#9ca3af", fontWeight: chartMode === m ? 600 : 400 }}>{lb}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}><BarChart data={repDeptData} barSize={14}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey={isW?"totalW":"total"} name="Tổng" fill="#e0e7ff" radius={[4,4,0,0]} /><Bar dataKey={isW?"doneW":"done"} name="Hoàn thành" fill="#6366f1" radius={[4,4,0,0]} /><Bar dataKey={isW?"overW":"over"} name="Quá hạn" fill="#dc2626" radius={[4,4,0,0]} /><Bar dataKey={isW?"completedLateW":"completedLate"} name="HT quá hạn" fill="#991b1b" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
          </div>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Xu hướng 6 tháng</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{isW ? "đang xem: việc quy đổi" : "đang xem: số đầu việc"}</span>
            </div>
            <ResponsiveContainer width="100%" height={180}><LineChart data={repMonthTrend}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={isW} /><Tooltip /><Line type="monotone" dataKey={isW?"totalW":"total"} name="Tổng" stroke="#94a3b8" strokeWidth={2} dot={false} /><Line type="monotone" dataKey={isW?"doneW":"done"} name="HT" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
          </div>
        </div>
        {repEmpData.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Hiệu suất nhân viên</span>
              {!isMobile && <span style={{ fontSize: 11, color: "#9ca3af" }}>Điểm = Thời hạn(60%) + Chất lượng(40%) − Phạt + Thưởng KL + Thưởng ưu tiên + Thưởng PH · Phạt 2đ/việc trễ & quá hạn · Thưởng KL: +1đ/việc vượt 15, tối đa +10đ · Thưởng ưu tiên: +0.5đ/việc Cao đúng hạn, tối đa +5đ · Chỉ tính trên việc ĐÃ ĐẾN HẠN (≥5)</span>}
            </div>
            <div style={{ padding: "8px 16px", background: "#fffbeb", borderBottom: "1px solid #fde68a", fontSize: 11.5, color: "#92400e", lineHeight: 1.65 }}>
              ⚠️ Cột <b>Tổng</b> ở đây là <b>việc quy đổi của riêng tháng đang chọn</b>, đã cộng cả: việc <b>phối hợp</b> (mỗi việc = ½ trọng số),
              trường hợp <b>Hỗ trợ ND / Xử lý lỗi TTDL</b> và bước <b>dự án ngân sách</b>.
              Vì một nhiệm vụ được tính cho <i>cả</i> người chủ trì lẫn người phối hợp nên <b>đừng cộng dồn cột này để so với cột "Quy đổi" ở bảng Tổng hợp điều hành</b> —
              bảng đó chỉ tính nhiệm vụ, gom theo phòng và trên toàn bộ thời gian.
            </div>
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {repEmpData.map((e, idx) => {
                  const eligibleRank = e.eligible ? repEmpData.filter(x => x.eligible).findIndex(x => x.id === e.id) : -1;
                  const medal = eligibleRank === 0 ? "🥇" : eligibleRank === 1 ? "🥈" : eligibleRank === 2 ? "🥉" : "";
                  return (
                    <div key={e.id} style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6", opacity: e.eligible ? 1 : 0.65 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {medal && <span style={{ fontSize: 18 }}>{medal}</span>}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                            <span style={{ background: DEPT_COLOR[e.dept] + "22", color: DEPT_COLOR[e.dept], fontSize: 10, padding: "1px 6px", borderRadius: 6 }}>{e.dept}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {!e.eligible
                            ? <span style={{ fontSize: 11, color: "#9ca3af" }}>{e.resolved > 0 && <><b style={{ color: "#6b7280" }}>~{e.perfScore}đ</b> <span style={{ fontStyle: "italic" }}>(tham khảo)</span><br/></>}Chưa đủ ĐK <span style={{ fontSize: 10 }}>({e.resolved} việc đến hạn)</span></span>
                            : <span onClick={() => setWhyEmp(e)} style={{ cursor: "pointer", fontSize: 20, fontWeight: 800, color: e.perfScore >= 80 ? "#15803d" : e.perfScore >= 50 ? "#92400e" : "#b91c1c" }}>{e.perfScore}đ <span style={{ fontSize: 12 }}>ℹ️</span></span>
                          }
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ background: "#e0e7ff", color: "#4338ca", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>Tổng: {r2(e.total)}</span>
                        <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>HT: {r2(e.done - (e.completedLate || 0))}</span>
                        {e.completedLate > 0 && <span style={{ background: "#fff1f2", color: "#991b1b", fontSize: 11, padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>⏰ HT trễ: {e.completedLate}</span>}
                        {e.over > 0 && <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>QH: {e.over}</span>}
                        {Math.round((e.total - e.resolved) * 100) / 100 > 0 && <span style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>⏳ Chưa đến hạn: {Math.round((e.total - e.resolved) * 100) / 100}</span>}
                        {e.collabTotal > 0 && <span style={{ background: "#ede9fe", color: "#7c3aed", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>🤝 {r2(e.collabDone)}/{r2(e.collabTotal)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                  <thead><tr style={{ background: "#f9fafb" }}>{["","Nhân viên","Phòng","Tổng","HT","HT quá hạn","QH","Chưa đến hạn","Phối hợp","Điểm hiệu suất"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{h}</th>)}</tr></thead>
                  <tbody>{repEmpData.map(e => {
                    const eligibleRank = e.eligible ? repEmpData.filter(x => x.eligible).findIndex(x => x.id === e.id) : -1;
                    const medal = eligibleRank === 0 ? "🥇" : eligibleRank === 1 ? "🥈" : eligibleRank === 2 ? "🥉" : "";
                    return (
                      <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6", background: medal ? "#f0fdf4" : "#fff", opacity: e.eligible ? 1 : 0.6 }}>
                        <td style={{ padding: "9px 12px", fontSize: 16 }}>{medal}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 500 }}>{e.name}</td>
                        <td style={{ padding: "9px 12px" }}><span style={{ background: DEPT_COLOR[e.dept] + "22", color: DEPT_COLOR[e.dept], fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>{e.dept}</span></td>
                        <td style={{ padding: "9px 12px" }}>{r2(e.total)}</td>
                        <td style={{ padding: "9px 12px", color: "#15803d", fontWeight: 500 }}>{r2(e.done - (e.completedLate || 0))}</td>
                        <td style={{ padding: "9px 12px", color: e.completedLate > 0 ? "#991b1b" : "#9ca3af", fontWeight: e.completedLate > 0 ? 700 : 400 }}>{r2(e.completedLate || 0)}</td>
                        <td style={{ padding: "9px 12px", color: e.over > 0 ? "#b91c1c" : "#6b7280", fontWeight: e.over > 0 ? 600 : 400 }}>{r2(e.over)}</td>
                        <td style={{ padding: "9px 12px", color: "#9ca3af" }}>{Math.round((e.total - e.resolved) * 100) / 100 || 0}</td>
                        <td style={{ padding: "9px 12px" }}>{e.collabTotal > 0 ? <span style={{ fontSize: 12, background: "#ede9fe", color: "#7c3aed", padding: "2px 7px", borderRadius: 8 }}>🤝 {r2(e.collabDone)}/{r2(e.collabTotal)}</span> : <span style={{ color: "#9ca3af" }}>–</span>}</td>
                        <td style={{ padding: "9px 12px" }}>
                          {!e.eligible ? <span style={{ fontSize: 12, color: "#9ca3af" }}>{e.resolved > 0 && <b style={{ color: "#6b7280", marginRight: 6 }}>~{e.perfScore}đ (tham khảo)</b>}Chưa đủ ĐK <span style={{ fontSize: 10 }}>(cần ≥5, hiện {e.resolved})</span></span> : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: e.perfScore + "%", background: e.perfScore >= 80 ? "#16a34a" : e.perfScore >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 6 }} /></div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: e.perfScore >= 80 ? "#15803d" : e.perfScore >= 50 ? "#92400e" : "#b91c1c" }}>{e.perfScore}đ</span>
                              <button onClick={() => setWhyEmp(e)} title="Vì sao điểm này?" style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "1px 6px", cursor: "pointer", fontSize: 11, color: "#6b7280" }}>ℹ️</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <ManagerBoard data={managerBoard} isMobile={isMobile} onWhy={setWhyMgr} />
      </>)}

      {repTab === "leaderboard" && (<>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>🏆 Xếp hạng năm</span>
          <select value={rankYear} onChange={e => setRankYear(Number(e.target.value))} style={{ ...inp, width: 100, padding: "6px 10px" }}>{[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#9ca3af" }}>Điểm TB năm = trung bình có điều chỉnh theo số tháng đủ ĐK (≥5 việc đến hạn) — càng ít tháng dữ liệu, điểm càng được kéo gần về mức trung bình chung để tránh 1 tháng may mắn xếp trên người có nhiều tháng ổn định. Bấm ℹ️ để xem chi tiết.</div>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {leaderboard.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Chưa có dữ liệu</div>}
              {leaderboard.map((e, i) => {
                const ranked = e.score !== null;
                const medal = ranked && i === 0 ? "🥇" : ranked && i === 1 ? "🥈" : ranked && i === 2 ? "🥉" : null;
                const bg = ranked && i === 0 ? "#fefce8" : ranked && i === 1 ? "#f9fafb" : ranked && i === 2 ? "#fff7f0" : "#fff";
                return (
                  <div key={e.id} style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6", background: bg, opacity: ranked ? 1 : 0.6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: medal ? 20 : 13, fontWeight: 700, color: "#6b7280", minWidth: 24 }}>{medal || `${i+1}.`}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                          <span style={{ background: DEPT_COLOR[e.dept] + "22", color: DEPT_COLOR[e.dept], fontSize: 10, padding: "1px 6px", borderRadius: 6 }}>{e.dept}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {e.score === null
                          ? <span style={{ fontSize: 11, color: "#9ca3af" }}>Chưa đủ ĐK</span>
                          : <span onClick={() => setWhyYear(e)} style={{ cursor: "pointer", fontSize: 22, fontWeight: 800, color: e.score >= 80 ? "#15803d" : e.score >= 50 ? "#92400e" : "#b91c1c" }}>{e.score}đ <span style={{ fontSize: 12 }}>ℹ️</span></span>
                        }
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>{e.eligibleMonths} tháng · {e.rate}% HT</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <span style={{ background: "#e0e7ff", color: "#4338ca", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>Tổng: {r2(e.total)}</span>
                      <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>HT: {r2(e.done - (e.completedLate||0))}</span>
                      {e.completedLate > 0 && <span style={{ background: "#fff1f2", color: "#991b1b", fontSize: 11, padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>⏰ {e.completedLate}</span>}
                      {e.over > 0 && <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>QH: {e.over}</span>}
                      {Math.round((e.total - e.resolved) * 100) / 100 > 0 && <span style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>⏳ {Math.round((e.total - e.resolved) * 100) / 100}</span>}
                      {e.collabTotal > 0 && <span style={{ background: "#ede9fe", color: "#7c3aed", fontSize: 11, padding: "2px 7px", borderRadius: 8 }}>🤝 {r2(e.collabDone)}/{r2(e.collabTotal)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                <thead><tr style={{ background: "#f9fafb" }}>{["Hạng","Nhân viên","Phòng","Tổng","HT","HT quá hạn","QH","Chưa đến hạn","Phối hợp","Số tháng có việc","Điểm TB năm","Tỷ lệ HT"].map(h => <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {leaderboard.length === 0 && <tr><td colSpan={12} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Chưa có dữ liệu</td></tr>}
                  {leaderboard.map((e, i) => {
                    const ranked = e.score !== null;
                    const medal = ranked && i === 0 ? "🥇" : ranked && i === 1 ? "🥈" : ranked && i === 2 ? "🥉" : `${i + 1}`;
                    return (
                      <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6", background: ranked && i === 0 ? "#fefce8" : ranked && i === 1 ? "#f9fafb" : ranked && i === 2 ? "#fff7f0" : "#fff", opacity: ranked ? 1 : 0.6 }}>
                        <td style={{ padding: "10px 12px", fontSize: ranked && i < 3 ? 18 : 14, fontWeight: 700 }}>{medal}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{e.name}</td>
                        <td style={{ padding: "10px 12px" }}><span style={{ background: DEPT_COLOR[e.dept] + "22", color: DEPT_COLOR[e.dept], fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>{e.dept}</span></td>
                        <td style={{ padding: "10px 12px" }}>{r2(e.total)}</td>
                        <td style={{ padding: "10px 12px", color: "#15803d", fontWeight: 500 }}>{r2(e.done - (e.completedLate || 0))}</td>
                        <td style={{ padding: "10px 12px", color: e.completedLate > 0 ? "#991b1b" : "#9ca3af", fontWeight: e.completedLate > 0 ? 700 : 400 }}>{r2(e.completedLate || 0)}</td>
                        <td style={{ padding: "10px 12px", color: e.over > 0 ? "#b91c1c" : "#6b7280", fontWeight: e.over > 0 ? 600 : 400 }}>{r2(e.over)}</td>
                        <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{Math.round((e.total - e.resolved) * 100) / 100 || 0}</td>
                        <td style={{ padding: "10px 12px" }}>{e.collabTotal > 0 ? <span style={{ fontSize: 12, background: "#ede9fe", color: "#7c3aed", padding: "2px 7px", borderRadius: 8 }}>🤝 {r2(e.collabDone)}/{r2(e.collabTotal)}</span> : <span style={{ color: "#9ca3af" }}>–</span>}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>{e.eligibleMonths}/12</td>
                        <td style={{ padding: "10px 12px" }}>{e.score === null ? <span style={{ fontSize: 12, color: "#9ca3af" }}>Chưa có dữ liệu</span> : <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 15, fontWeight: 700, color: e.score >= 80 ? "#15803d" : e.score >= 50 ? "#92400e" : "#b91c1c" }}>{e.score}đ</span><button onClick={() => setWhyYear(e)} title="Vì sao điểm này?" style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "1px 6px", cursor: "pointer", fontSize: 11, color: "#6b7280" }}>ℹ️</button></span>}</td>
                        <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: e.rate + "%", background: e.rate >= 80 ? "#16a34a" : e.rate >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 6 }} /></div><span style={{ fontSize: 12, fontWeight: 700, color: e.rate >= 80 ? "#15803d" : e.rate >= 50 ? "#92400e" : "#b91c1c" }}>{e.rate}%</span></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <ManagerBoard data={managerLeaderboard} isMobile={isMobile} yearly onWhy={setWhyMgr} />
      </>)}

      {repTab === "late_reasons" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Phân bố nguyên nhân</div>
            {lateReasonStats.length === 0 ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>Chưa có dữ liệu</div> : (
              <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={lateReasonStats.map(r => ({ name: r.label, value: r.count }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 10, cursor: "pointer" }} onClick={(_, i) => setLateReasonDetail(lateReasonStats[i])}>{lateReasonStats.map((_, i) => <Cell key={i} fill={["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6"][i % 5]} style={{ cursor: "pointer" }} onClick={() => setLateReasonDetail(lateReasonStats[i])} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Chi tiết</div>
            {lateReasonStats.length === 0 ? <div style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>Chưa có dữ liệu</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lateReasonStats.map((r, i) => (
                  <div key={r.value} onClick={() => setLateReasonDetail(r)} style={{ cursor: "pointer", padding: 6, margin: -6, borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}><span>{r.label} <span style={{ color: "#9ca3af", fontSize: 11 }}>(bấm để xem việc)</span></span><span style={{ fontWeight: 600, color: "#4f46e5" }}>{r.count} ({r.pct}%)</span></div>
                    <div style={{ height: 8, background: "#e5e7eb", borderRadius: 8, overflow: "hidden" }}><div style={{ height: "100%", width: r.pct + "%", background: ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6"][i % 5], borderRadius: 8 }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Vì sao điểm này? */}
      {whyEmp && whyEmp.breakdown && (() => {
        const e = whyEmp, b = e.breakdown;
        const Row = ({ icon, label, sub, val, neg }) => (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid #f3f4f6", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{icon} {label}</div>
              {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: neg ? "#b91c1c" : val > 0 ? "#15803d" : "#9ca3af", whiteSpace: "nowrap" }}>{neg ? "−" : "+"}{Math.abs(val)}</div>
          </div>
        );
        return (
          <div onClick={() => setWhyEmp(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: isMobile ? "12px 8px" : 16 }}>
            <div onClick={ev => ev.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Vì sao {e.perfScore}đ?</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{e.name} · {e.dept} · {VI_MONTHS[repMonth]}/{repYear}</div>
                </div>
                <button onClick={() => setWhyEmp(null)} style={{ background: "#f3f4f6", border: "none", cursor: "pointer", fontSize: 16, color: "#374151", width: 28, height: 28, borderRadius: "50%" }}>✕</button>
              </div>
              <div style={{ padding: "8px 18px 0" }}>
                <Row icon="①" label="Điểm thời hạn" sub={`(${e.onTime} đúng hạn ×60 + ${e.completedLate} trễ ×30) ÷ ${e.resolved} việc đã đến hạn · tối đa 60`} val={b.timeliness} />
                <Row icon="②" label="Điểm chất lượng" sub={`Đánh giá kết quả ${e.onTime} việc đúng hạn (chưa ĐG = Trung bình) · tối đa 40`} val={b.quality} />
                <Row icon="③" label="Phạt trễ & quá hạn" sub={`(${e.completedLate} HT trễ + ${e.over} quá hạn) × 2đ`} val={b.penalty} neg />
                <Row icon="④" label="Thưởng khối lượng" sub={`Vượt ${Math.max(e.resolved - 15, 0)} việc so với mốc 15 · tối đa +10`} val={b.workloadBonus} />
                {b.prioBonus > 0 && <Row icon="⑤" label="Thưởng ưu tiên" sub="Việc ưu tiên Cao hoàn thành đúng hạn · +0.5đ/việc, tối đa +5" val={b.prioBonus} />}
              </div>
              {e.collabTotal > 0 && <div style={{ margin: "0 18px 10px", fontSize: 11.5, color: "#7c3aed", background: "#f5f3ff", borderRadius: 8, padding: "8px 12px" }}>🤝 Đã gồm {e.collabDone}/{e.collabTotal} việc phối hợp hoàn thành, mỗi việc tính = 1/2 việc chủ trì trong điểm ① và ② ở trên.</div>}
              <div style={{ margin: "10px 18px 18px", padding: "12px 14px", background: "#f8fafc", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tổng điểm <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>(giới hạn 0–100)</span></span>
                <span style={{ fontSize: 22, fontWeight: 800, color: e.perfScore >= 80 ? "#15803d" : e.perfScore >= 50 ? "#92400e" : "#b91c1c" }}>{e.perfScore}đ</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Vì sao điểm TB năm này? (Xếp hạng năm) */}
      {whyYear && (() => {
        const e = whyYear;
        const eligibleRows = e.monthly.map((m, idx) => ({ ...m, monthIdx: idx })).filter(m => m.eligible);
        return (
          <div onClick={() => setWhyYear(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: isMobile ? "12px 8px" : 16 }}>
            <div onClick={ev => ev.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Vì sao {e.score}đ?</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{e.name} · {e.dept} · Xếp hạng năm {rankYear}</div>
                </div>
                <button onClick={() => setWhyYear(null)} style={{ background: "#f3f4f6", border: "none", cursor: "pointer", fontSize: 16, color: "#374151", width: 28, height: 28, borderRadius: "50%" }}>✕</button>
              </div>
              <div style={{ padding: "10px 18px 0", fontSize: 11.5, color: "#9ca3af" }}>{eligibleRows.length} tháng đủ điều kiện (≥5 việc đến hạn) trong năm — các tháng còn lại không tính vào điểm.</div>
              <div style={{ padding: "8px 18px 0" }}>
                {eligibleRows.map(m => (
                  <div key={m.monthIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 13 }}>{VI_MONTHS[m.monthIdx]}/{rankYear} <span style={{ fontSize: 11, color: "#9ca3af" }}>({m.resolved} việc đến hạn)</span></div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: m.perfScore >= 80 ? "#15803d" : m.perfScore >= 50 ? "#92400e" : "#b91c1c" }}>{m.perfScore}đ</div>
                  </div>
                ))}
              </div>
              <div style={{ margin: "12px 18px", padding: "12px 14px", background: "#f8fafc", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}><span>Điểm trung bình thô ({eligibleRows.length} tháng)</span><span style={{ fontWeight: 600 }}>{e.rawScore}đ</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}><span>Mức trung bình chung toàn cơ quan</span><span style={{ fontWeight: 600 }}>{e.baseline}đ</span></div>
                <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>Vì chỉ có {eligibleRows.length} tháng dữ liệu (còn ít so với 12 tháng), điểm thô được kéo gần hơn về mức trung bình chung để công bằng — có càng nhiều tháng đủ điều kiện, điểm càng phản ánh đúng năng lực thật, ít bị ảnh hưởng bởi 1 tháng may/rủi.</div>
              </div>
              <div style={{ margin: "10px 18px 18px", padding: "12px 14px", background: "#eef2ff", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Điểm TB năm <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 400 }}>(đã điều chỉnh công bằng)</span></span>
                <span style={{ fontSize: 22, fontWeight: 800, color: e.score >= 80 ? "#15803d" : e.score >= 50 ? "#92400e" : "#b91c1c" }}>{e.score}đ</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Vì sao điểm ĐIỀU HÀNH này? (Trưởng/Phó phòng) */}
      {whyMgr && (() => {
        const e = whyMgr;
        const MRow = ({ icon, label, sub, val, neg }) => (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid #f3f4f6", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{icon} {label}</div>
              {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: neg ? "#b91c1c" : val > 0 ? "#15803d" : "#9ca3af", whiteSpace: "nowrap" }}>{neg ? "−" : "+"}{Math.abs(val)}</div>
          </div>
        );
        const scoreColor = s => s >= 80 ? "#15803d" : s >= 50 ? "#92400e" : "#b91c1c";
        return (
          <div onClick={() => setWhyMgr(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: isMobile ? "12px 8px" : 16 }}>
            <div onClick={ev => ev.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>🏛️ Vì sao {e.yearly ? e.score : e.perfScore}đ điều hành?</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{e.name} · {e.role} · Phòng {e.dept} · {e.yearly ? `Cả năm ${rankYear}` : `${VI_MONTHS[repMonth]}/${repYear}`}</div>
                </div>
                <button onClick={() => setWhyMgr(null)} style={{ background: "#f3f4f6", border: "none", cursor: "pointer", fontSize: 16, color: "#374151", width: 28, height: 28, borderRadius: "50%" }}>✕</button>
              </div>
              {!e.yearly && e.breakdown ? (<>
                <div style={{ padding: "10px 18px 0", fontSize: 11.5, color: "#6b7280", lineHeight: 1.5 }}>Điểm điều hành chấm theo <b>kết quả cả phòng {e.dept}</b> trong tháng (mọi số theo việc quy đổi), không phải vài việc giao riêng.</div>
                <div style={{ padding: "6px 18px 0" }}>
                  <MRow icon="①" label="Đúng hạn phòng" sub={`(${r2(e.onTimeW)} đúng hạn ×60 + ${r2(e.lateW)} trễ ×30) ÷ ${r2(e.resolvedW)} việc phòng đã đến hạn · tối đa 60`} val={e.breakdown.timeliness} />
                  <MRow icon="②" label="Chất lượng phòng" sub={`Trung bình nghiệm thu ${r2(e.onTimeW)} việc đúng hạn của phòng (chưa ĐG = Trung bình) · tối đa 40`} val={e.breakdown.quality} />
                  <MRow icon="③" label="Tồn đọng quá hạn" sub={`Tỷ lệ việc phòng còn quá hạn chưa xong: ${r2(e.overW)}/${r2(e.resolvedW)} · tối đa −10`} val={e.breakdown.penalty} neg />
                  <MRow icon="④" label="Thưởng khối lượng điều hành" sub={`Phòng ${e.empCount} người xử lý ${r2(e.resolvedW)} việc đã đến hạn → bình quân ${r2(e.perHead)}/người (thưởng khi >10, tối đa +10 khi ≥20/người)`} val={e.breakdown.mgmtBonus} />
                </div>
                <div style={{ margin: "10px 18px 18px", padding: "12px 14px", background: "#f0f9ff", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Tổng điểm điều hành <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>(giới hạn 0–100)</span></span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(e.perfScore) }}>{e.perfScore}đ</span>
                </div>
              </>) : (() => {
                const rows = (e.monthly || []).map((m, idx) => ({ ...m, monthIdx: idx })).filter(m => m.eligible);
                return (<>
                  <div style={{ padding: "10px 18px 0", fontSize: 11.5, color: "#9ca3af" }}>{rows.length} tháng phòng đủ điều kiện (≥5 việc quy đổi đến hạn) trong năm — các tháng còn lại không tính.</div>
                  <div style={{ padding: "8px 18px 0" }}>
                    {rows.map(m => (
                      <div key={m.monthIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                        <div style={{ fontSize: 13 }}>{VI_MONTHS[m.monthIdx]}/{rankYear} <span style={{ fontSize: 11, color: "#9ca3af" }}>({r2(m.resolvedW)} việc phòng đến hạn)</span></div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: scoreColor(m.perfScore) }}>{m.perfScore}đ</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ margin: "12px 18px", padding: "12px 14px", background: "#f8fafc", borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}><span>Điểm điều hành TB thô ({rows.length} tháng)</span><span style={{ fontWeight: 600 }}>{e.rawScore}đ</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}><span>Mức TB chung của các quản lý</span><span style={{ fontWeight: 600 }}>{e.baseline}đ</span></div>
                    <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>Ít tháng dữ liệu thì điểm thô được kéo gần mức trung bình chung cho công bằng — càng nhiều tháng đủ ĐK, điểm càng phản ánh đúng.</div>
                  </div>
                  <div style={{ margin: "10px 18px 18px", padding: "12px 14px", background: "#f0f9ff", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Điểm điều hành năm <span style={{ fontSize: 11, color: "#075985", fontWeight: 400 }}>(đã điều chỉnh)</span></span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(e.score) }}>{e.score}đ</span>
                  </div>
                </>);
              })()}
            </div>
          </div>
        );
      })()}

      {/* MODAL: Danh sách nhiệm vụ theo nguyên nhân trễ */}
      {lateReasonDetail && (
        <div onClick={() => setLateReasonDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: isMobile ? "12px 8px" : 16 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{lateReasonDetail.label}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{lateReasonDetail.count} nhiệm vụ ({lateReasonDetail.pct}%)</div>
              </div>
              <button onClick={() => setLateReasonDetail(null)} style={{ background: "#f3f4f6", border: "none", cursor: "pointer", fontSize: 16, color: "#374151", width: 28, height: 28, borderRadius: "50%" }}>✕</button>
            </div>
            <div style={{ padding: "8px 12px 14px" }}>
              {(lateReasonDetail.tasks || []).map(t => (
                <div key={t.id} onClick={() => { setLateReasonDetail(null); setModal(t); loadComments(t.id); }} style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", borderBottom: "1px solid #f3f4f6" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ background: DEPT_COLOR[t.dept] + "22", color: DEPT_COLOR[t.dept], padding: "1px 7px", borderRadius: 7 }}>{t.dept}</span>
                    <span>{getEmp?.(t.eid)?.name || "–"}</span>
                    <span>📅 Hạn: {fmtDate(t.deadline)}</span>
                    {t.late_note && <span style={{ fontStyle: "italic" }}>"{t.late_note}"</span>}
                  </div>
                </div>
              ))}
              {(!lateReasonDetail.tasks || lateReasonDetail.tasks.length === 0) && <div style={{ textAlign: "center", color: "#9ca3af", padding: 24, fontSize: 13 }}>Không có nhiệm vụ</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bảng ĐIỂM ĐIỀU HÀNH cho Trưởng/Phó phòng (xếp hạng riêng, dùng cho cả tab Tháng lẫn Xếp hạng năm) ──
function ManagerBoard({ data, isMobile, yearly, onWhy }) {
  if (!data || data.length === 0) return null;
  const okOf = e => yearly ? e.score !== null : e.eligible;
  const scoreOf = e => yearly ? e.score : e.perfScore;
  const ranked = data.filter(okOf);
  const rankOf = e => ranked.findIndex(x => x.id === e.id);
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #bae6fd", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f0f9ff" }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "#075985" }}>🏛️ Điểm điều hành — Trưởng/Phó phòng {yearly ? "(cả năm)" : "(tháng)"}</span>
        {!isMobile && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, lineHeight: 1.6 }}>Điểm theo <b>kết quả điều hành cả phòng</b>: Đúng hạn phòng (60%) + Chất lượng phòng (40%) − Tồn đọng quá hạn + Thưởng khối lượng (bình quân &gt;10 việc quy đổi/người). Đủ ĐK khi phòng có ≥5 việc quy đổi đã đến hạn/tháng. <b>Xếp hạng riêng, không so trực tiếp với nhân viên.</b></div>}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: isMobile ? 0 : 520 }}>
          <thead><tr style={{ background: "#f9fafb" }}>{["", "Cán bộ", "Phòng", yearly ? "Tháng đủ ĐK" : "Đúng hạn phòng", "Việc phòng (HT/đến hạn)", "Điểm điều hành"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
          <tbody>{data.map(e => {
            const rk = okOf(e) ? rankOf(e) : -1;
            const medal = rk === 0 ? "🥇" : rk === 1 ? "🥈" : rk === 2 ? "🥉" : "";
            const sc = scoreOf(e); const ok = okOf(e); const bd = e.breakdown;
            const refScore = yearly ? e.rawScore : (e.resolvedW > 0 ? e.perfScore : null);
            return (
              <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6", background: medal ? "#eff6ff" : "#fff", opacity: ok ? 1 : 0.6 }}>
                <td style={{ padding: "9px 12px", fontSize: 16 }}>{medal}</td>
                <td style={{ padding: "9px 12px" }}><div style={{ fontWeight: 500 }}>{e.name}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{e.role}</div></td>
                <td style={{ padding: "9px 12px" }}><span style={{ background: (DEPT_COLOR[e.dept] || "#888") + "22", color: DEPT_COLOR[e.dept] || "#555", fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>{e.dept}</span></td>
                <td style={{ padding: "9px 12px", color: "#6b7280" }}>{yearly ? `${e.eligibleMonths}/12` : (e.resolvedW > 0 ? e.onTimeRate + "%" : "–")}</td>
                <td style={{ padding: "9px 12px", color: "#6b7280" }}>{r2(e.doneW || 0)}/{r2(e.resolvedW || 0)}</td>
                <td style={{ padding: "9px 12px" }}>
                  {!ok ? <span style={{ fontSize: 12, color: "#9ca3af" }}>{refScore != null && <b style={{ color: "#6b7280", marginRight: 6 }}>~{refScore}đ (tham khảo)</b>}Chưa đủ ĐK</span> : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: sc + "%", background: sc >= 80 ? "#16a34a" : sc >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 6 }} /></div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sc >= 80 ? "#15803d" : sc >= 50 ? "#92400e" : "#b91c1c" }}>{sc}đ</span>
                      <button onClick={() => onWhy && onWhy({ ...e, yearly })} title="Vì sao điểm này?" style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "1px 6px", cursor: "pointer", fontSize: 11, color: "#6b7280" }}>ℹ️</button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
