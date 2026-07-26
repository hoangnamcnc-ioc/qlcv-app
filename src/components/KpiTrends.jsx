import React, { useMemo, useState } from "react";
import { DEPTS, DEPT_COLOR, deptLabel } from "../constants";
import { MANAGER_EMP_ROLES } from "../hooks/useReports";

// ── Trang "KPI & Xu hướng": theo dõi điểm nhân viên/phòng qua nhiều tháng, nhân viên tăng/giảm nổi bật,
// và xuất báo cáo định kỳ (PDF) cho lãnh đạo. Dùng lại calcMonthPerf/managerPerf (nguồn điểm duy nhất).
const strip = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

// Lấy điểm mới nhất + chênh lệch so với tháng CÓ ĐIỂM liền trước (bỏ qua tháng trống).
function latestDelta(series) {
  let last = -1; for (let i = series.length - 1; i >= 0; i--) if (series[i] != null) { last = i; break; }
  if (last < 0) return { latest: null, delta: null };
  let prev = -1; for (let i = last - 1; i >= 0; i--) if (series[i] != null) { prev = i; break; }
  return { latest: series[last], delta: prev >= 0 ? series[last] - series[prev] : null };
}

// Sparkline nhỏ: chấm nối các tháng có điểm (thang 0..100).
function Spark({ pts, w = 130, h = 30 }) {
  const vals = pts.map((v, i) => ({ v, i })).filter(p => p.v != null);
  if (vals.length < 2) return <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>;
  const pad = 3, n = pts.length;
  const x = i => pad + (n === 1 ? 0 : i * (w - 2 * pad) / (n - 1));
  const y = v => h - pad - (v / 100) * (h - 2 * pad);
  const d = vals.map(p => `${x(p.i)},${y(p.v)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline fill="none" stroke="#6366f1" strokeWidth="1.8" points={d} />
      {vals.map(p => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="2" fill="#4338ca" />)}
    </svg>
  );
}

const Delta = ({ d }) => {
  if (d == null) return <span style={{ fontSize: 11, color: "#9ca3af" }}>mới</span>;
  const up = d > 0, flat = d === 0;
  const col = flat ? "#9ca3af" : up ? "#15803d" : "#b91c1c";
  return <span style={{ fontSize: 12, fontWeight: 700, color: col, whiteSpace: "nowrap" }}>{flat ? "—" : (up ? "▲" : "▼") + " " + Math.abs(Math.round(d))}</span>;
};

const scoreColor = v => v == null ? "#9ca3af" : v >= 85 ? "#15803d" : v >= 70 ? "#4338ca" : v >= 50 ? "#b45309" : "#b91c1c";

export default function KpiTrends({ employees, calcMonthPerf, managerPerf, isMobile }) {
  const [nMonths, setNMonths] = useState(6);
  const [q, setQ] = useState("");
  const today = new Date();

  // Danh sách tháng gần nhất (cũ → mới), gồm tháng hiện tại.
  const months = useMemo(() => {
    const arr = [];
    for (let i = nMonths - 1; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); arr.push({ y: d.getFullYear(), m: d.getMonth(), label: `T${d.getMonth() + 1}` }); }
    return arr;
  }, [nMonths]);

  const isMgr = e => MANAGER_EMP_ROLES.includes(e.role);

  // Điểm từng tháng cho mỗi nhân viên (null nếu tháng đó chưa có việc đến hạn).
  const rows = useMemo(() => {
    return (employees || []).filter(e => !e.no_kpi).map(e => {
      const mgr = isMgr(e);
      const series = months.map(({ y, m }) => {
        const p = mgr ? managerPerf(e.id, y, m) : calcMonthPerf(e.id, y, m);
        const rslv = mgr ? p.resolvedW : p.resolved;
        return rslv > 0 ? p.perfScore : null;
      });
      const { latest, delta } = latestDelta(series);
      return { id: e.id, name: e.name, dept: e.dept, mgr, series, latest, delta };
    });
  }, [employees, months, calcMonthPerf, managerPerf]);

  // Xu hướng theo phòng = trung bình điểm nhân viên ĐỦ ĐIỀU KIỆN trong phòng mỗi tháng.
  const deptRows = useMemo(() => {
    return DEPTS.map(d => {
      const emps = (employees || []).filter(e => !e.no_kpi && e.dept === d && !isMgr(e));
      const series = months.map(({ y, m }) => {
        const vals = emps.map(e => calcMonthPerf(e.id, y, m)).filter(p => p.eligible).map(p => p.perfScore);
        return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
      });
      const { latest, delta } = latestDelta(series);
      return { dept: d, empCount: emps.length, series, latest, delta };
    }).filter(r => r.series.some(v => v != null));
  }, [employees, months, calcMonthPerf]);

  // Nhân viên tăng/giảm nổi bật (có đủ 2 tháng để so).
  const movers = useMemo(() => {
    const withDelta = rows.filter(r => r.delta != null);
    const up = [...withDelta].sort((a, b) => b.delta - a.delta).filter(r => r.delta > 0).slice(0, 3);
    const down = [...withDelta].sort((a, b) => a.delta - b.delta).filter(r => r.delta < 0).slice(0, 3);
    return { up, down };
  }, [rows]);

  const shownRows = useMemo(() => {
    const f = q.trim() ? rows.filter(r => strip(r.name).includes(strip(q)) || strip(r.dept).includes(strip(q))) : rows;
    return [...f].sort((a, b) => (b.latest ?? -1) - (a.latest ?? -1));
  }, [rows, q]);

  const exportPDF = () => {
    const head = `<tr><th>Nhân viên</th><th>Phòng</th>${months.map(mo => `<th>${mo.label}</th>`).join("")}<th>Δ</th></tr>`;
    const body = shownRows.map(r => `<tr><td>${r.name}${r.mgr ? " 👑" : ""}</td><td>${deptLabel(r.dept)}</td>${r.series.map(v => `<td style="text-align:center;color:${scoreColor(v)}">${v == null ? "–" : v}</td>`).join("")}<td style="text-align:center">${r.delta == null ? "mới" : (r.delta > 0 ? "+" : "") + Math.round(r.delta)}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Báo cáo KPI & Xu hướng</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{color:#1e1b4b;font-size:20px;margin-bottom:2px}.meta{color:#6b7280;font-size:12px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f5f9;padding:6px 8px;border:1px solid #e5e7eb;font-size:11px}td{padding:5px 8px;border:1px solid #e5e7eb}tr:nth-child(even){background:#fafafa}@media print{body{padding:0}}</style></head><body><h1>📈 Báo cáo KPI & Xu hướng</h1><div class="meta">Xuất ngày ${today.toLocaleDateString("vi-VN")} · ${nMonths} tháng gần nhất · 👑 = tính theo điểm điều hành</div><table><thead>${head}</thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); }
  };

  const card = { background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16, marginBottom: 16 };
  const th = { fontSize: 11, color: "#6b7280", fontWeight: 600, textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
  const td = { fontSize: 13, padding: "8px", borderBottom: "1px solid #f1f5f9" };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1e1b4b" }}>📈 KPI & Xu hướng</div>
          <div style={{ fontSize: 12.5, color: "#6b7280" }}>Điểm nhân viên & phòng qua các tháng · 👑 người quản lý tính theo điểm điều hành.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", background: "#eef2ff", borderRadius: 8, overflow: "hidden" }}>
            {[6, 12].map(n => <button key={n} onClick={() => setNMonths(n)} style={{ border: "none", padding: "6px 12px", fontSize: 12.5, cursor: "pointer", fontWeight: 600, background: nMonths === n ? "#4f46e5" : "transparent", color: nMonths === n ? "#fff" : "#4338ca" }}>{n} tháng</button>)}
          </div>
          <button onClick={exportPDF} style={{ border: "1px solid #c7d2fe", background: "#fff", color: "#4338ca", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>⬇ Xuất PDF</button>
        </div>
      </div>

      {/* Xu hướng theo phòng */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🏢 Xu hướng theo phòng <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af" }}>(trung bình điểm nhân viên đủ điều kiện)</span></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
            <thead><tr><th style={th}>Phòng</th><th style={th}>Xu hướng {nMonths} tháng</th><th style={{ ...th, textAlign: "right" }}>Điểm mới nhất</th><th style={{ ...th, textAlign: "right" }}>So tháng trước</th></tr></thead>
            <tbody>
              {deptRows.map(r => (
                <tr key={r.dept}>
                  <td style={td}><span style={{ background: (DEPT_COLOR[r.dept] || "#999") + "22", color: DEPT_COLOR[r.dept] || "#555", padding: "2px 8px", borderRadius: 8, fontSize: 12 }}>{deptLabel(r.dept)}</span> <span style={{ fontSize: 11, color: "#9ca3af" }}>· {r.empCount} NV</span></td>
                  <td style={td}><Spark pts={r.series} /></td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: scoreColor(r.latest) }}>{r.latest ?? "–"}</td>
                  <td style={{ ...td, textAlign: "right" }}><Delta d={r.delta} /></td>
                </tr>
              ))}
              {!deptRows.length && <tr><td style={td} colSpan={4}><span style={{ color: "#9ca3af" }}>Chưa đủ dữ liệu để vẽ xu hướng.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nhân viên nổi bật */}
      {(movers.up.length > 0 || movers.down.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ ...card, marginBottom: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d", marginBottom: 8 }}>🚀 Tiến bộ nổi bật</div>
            {movers.up.length ? movers.up.map(r => <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}><div style={{ fontSize: 13 }}>{r.name}{r.mgr ? " 👑" : ""} <span style={{ fontSize: 11, color: "#9ca3af" }}>· {r.dept}</span></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontWeight: 700, color: scoreColor(r.latest) }}>{r.latest}</span><Delta d={r.delta} /></div></div>) : <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Chưa có.</div>}
          </div>
          <div style={{ ...card, marginBottom: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>⚠️ Cần chú ý (giảm điểm)</div>
            {movers.down.length ? movers.down.map(r => <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}><div style={{ fontSize: 13 }}>{r.name}{r.mgr ? " 👑" : ""} <span style={{ fontSize: 11, color: "#9ca3af" }}>· {r.dept}</span></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontWeight: 700, color: scoreColor(r.latest) }}>{r.latest}</span><Delta d={r.delta} /></div></div>) : <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Chưa có.</div>}
          </div>
        </div>
      )}

      {/* Tất cả nhân viên */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>👥 Tất cả nhân viên</div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tên / phòng…" style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, minWidth: 180 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
            <thead><tr><th style={th}>Nhân viên</th><th style={th}>Phòng</th><th style={th}>Xu hướng</th><th style={{ ...th, textAlign: "right" }}>Điểm</th><th style={{ ...th, textAlign: "right" }}>Δ</th></tr></thead>
            <tbody>
              {shownRows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.name}{r.mgr ? <span title="Tính theo điểm điều hành"> 👑</span> : ""}</td>
                  <td style={td}><span style={{ fontSize: 11.5, color: DEPT_COLOR[r.dept] || "#555" }}>{r.dept}</span></td>
                  <td style={td}><Spark pts={r.series} w={110} h={26} /></td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: scoreColor(r.latest) }}>{r.latest ?? "–"}</td>
                  <td style={{ ...td, textAlign: "right" }}><Delta d={r.delta} /></td>
                </tr>
              ))}
              {!shownRows.length && <tr><td style={td} colSpan={5}><span style={{ color: "#9ca3af" }}>Không có nhân viên khớp.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
