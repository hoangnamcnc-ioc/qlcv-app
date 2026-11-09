import { useMemo } from "react";
import { RATING, inGradingScope } from "../constants";

const ORDER = ["xuat_sac", "tot", "tb", "kem"];

// Thống kê PHÂN BỐ MỨC CHẤM theo từng người nghiệm thu: ai chấm quá đồng đều (gần như toàn "Tốt")
// thì điểm Chất lượng không phân biệt được người làm tốt/chưa tốt. Chỉ dùng việc có hạn trong năm đang xem, từ mốc xếp loại.
export function computeRaterStats(tasks, year) {
  const by = new Map(); let unrated = 0, doneAll = 0;
  for (const t of tasks || []) {
    if (t.deleted || !t.completed || !t.deadline) continue;
    const d = new Date(t.deadline);
    if (d.getFullYear() !== year || !inGradingScope(year, d.getMonth() + 1)) continue;
    doneAll++;
    const key = (t.rated_by || "").trim();
    if (!RATING[t.rating] || !key) { unrated++; continue; }
    if (!by.has(key)) by.set(key, { name: key, n: 0, xuat_sac: 0, tot: 0, tb: 0, kem: 0, sum: 0 });
    const r = by.get(key); r.n++; r[t.rating]++; r.sum += RATING[t.rating].score;
  }
  const rows = [...by.values()].map(r => {
    const top = Math.max(...ORDER.map(k => r[k]));
    const topKey = ORDER.find(k => r[k] === top);
    return { ...r, avg: r.n ? Math.round(r.sum / r.n / 4 * 100) : 0, topShare: r.n ? Math.round(top / r.n * 100) : 0, topKey, flat: r.n >= 15 && top / r.n >= 0.9 };
  }).sort((a, b) => b.n - a.n);
  return { rows, unrated, doneAll };
}

export default function RaterStats({ tasks, year, card }) {
  const { rows, unrated, doneAll } = useMemo(() => computeRaterStats(tasks, year), [tasks, year]);
  const pct = (r, k) => (r.n ? Math.round(r[k] / r.n * 100) : 0);
  return (
    <div style={{ ...card, padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🧭 Phân bố mức chấm theo người nghiệm thu — {year}</div>
      <div style={{ fontSize: 11.5, color: "#9ca3af", marginBottom: 10 }}>
        Điểm Chất lượng chỉ phân biệt được người làm tốt/chưa tốt khi người chấm dùng đủ các mức. Dòng ⚠ là người chấm gần như một mức cho mọi việc (từ 15 việc trở lên, ≥ 90% cùng một mức).
        {doneAll > 0 && <> Việc đã hoàn thành chưa có mức chấm/người chấm: <b>{unrated}/{doneAll}</b> ({Math.round(unrated / doneAll * 100)}%) — được tính mặc định "Trung bình".</>}
      </div>
      {!rows.length ? <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Chưa có dữ liệu chấm trong kỳ này.</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ background: "#f9fafb", textAlign: "left", color: "#6b7280" }}>
              <th style={{ padding: "7px 10px" }}>Người chấm</th><th style={{ padding: "7px 10px", textAlign: "center" }}>Số việc</th>
              {ORDER.map(k => <th key={k} style={{ padding: "7px 10px", textAlign: "center" }}>{RATING[k].icon} {RATING[k].label}</th>)}
              <th style={{ padding: "7px 10px", textAlign: "center" }}>Mức chấm TB</th><th style={{ padding: "7px 10px" }}>Nhận xét</th>
            </tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.name} style={{ borderTop: "1px solid #f3f4f6", background: r.flat ? "#fffbeb" : "#fff" }}>
                <td style={{ padding: "7px 10px", fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: "7px 10px", textAlign: "center" }}>{r.n}</td>
                {ORDER.map(k => <td key={k} style={{ padding: "7px 10px", textAlign: "center", fontWeight: r.topKey === k ? 700 : 400 }}>{pct(r, k)}%</td>)}
                <td style={{ padding: "7px 10px", textAlign: "center" }}>{r.avg}/100</td>
                <td style={{ padding: "7px 10px", fontSize: 11.5, color: r.flat ? "#b45309" : "#9ca3af" }}>{r.flat ? `⚠ ${r.topShare}% cùng mức "${RATING[r.topKey].label}"` : r.n < 15 ? "Ít dữ liệu" : "Phân bố ổn"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
