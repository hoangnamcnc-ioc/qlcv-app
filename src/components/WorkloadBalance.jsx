import { useState, useMemo } from "react";
import { isRankable, wasActiveIn, deptLabel, DEPTS, DEPT_COLOR } from "../constants";
import { ViMonth } from "./ViDate";

const FULL = ["admin", "director"], LEADS = ["manager", "deputy_manager", "manager_hcth"];
const MGR_EMP = ["Trưởng phòng", "Phó trưởng phòng", "TP. HCTH", "PP. HCTH"];
const vn = x => String(Math.round(x * 100) / 100).replace(".", ",");
const curYm = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

// Báo cáo CÂN BẰNG KHỐI LƯỢNG theo phòng: khối lượng quy đổi của từng người trong tháng so với TRUNG VỊ cùng phòng,
// kèm gợi ý chuyển bớt việc từ người gánh nhiều sang người gánh ít.
export default function WorkloadBalance({ employees, currentUser, loadInfo, card }) {
  const [ym, setYm] = useState(curYm());
  const [mode, setMode] = useState("all"); // all = mọi việc có hạn trong tháng; done = chỉ việc đã đến hạn/đã xong
  const [y, m] = ym.split("-").map(Number);
  const role = currentUser?.role;
  const me = (employees || []).find(e => e.id === currentUser?.employee_id);
  const isFull = FULL.includes(role), isLead = LEADS.includes(role);
  const depts = useMemo(() => (isFull ? DEPTS : isLead && me ? [me.dept] : []), [isFull, isLead, me]);
  const data = useMemo(() => depts.map(d => {
    const people = (employees || []).filter(e => e.dept === d && isRankable(e) && !MGR_EMP.includes(e.role) && wasActiveIn(e, y, m))
      .map(e => ({ e, ...loadInfo(e.id, y, m - 1, mode === "all") })).sort((a, b) => b.load - a.load);
    const med = people.find(p => p.median)?.median ?? null;
    const max = Math.max(1, ...people.map(p => p.load), med || 0);
    // Gợi ý: người từ ×1,3 trở lên → người dưới ×0,8; chuyển khoảng nửa phần chênh so với trung vị
    const hi = people.filter(p => p.ratio && p.ratio >= 1.3), lo = people.filter(p => p.ratio != null && p.ratio <= 0.8 || (p.load === 0));
    const tips = med ? hi.flatMap(h => lo.slice(0, 2).map(l => `Cân nhắc chuyển khoảng ${vn(Math.max(0.5, (h.load - med) / 2))} quy đổi từ ${h.e.name} (×${vn(h.ratio)}) sang ${l.e.name} (${l.load ? "×" + vn(l.ratio || l.load / med) : "chưa có việc"}).`)).slice(0, 6) : [];
    return { d, people, med, max, tips };
  }), [depts, employees, y, m, mode, loadInfo]);

  if (!depts.length) return <div style={{ ...card, padding: 16, fontSize: 13, color: "#6b7280" }}>Báo cáo này dành cho Trưởng/Phó phòng và Ban Giám đốc.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>⚖️ Cân bằng khối lượng việc theo phòng</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
          Khối lượng = tổng hệ số quy đổi của các việc có hạn trong tháng. Thanh màu là khối lượng từng người, vạch đứng là <b>trung vị</b> của phòng. ×1,3 trở lên là nhiều hơn rõ rệt, ×0,8 trở xuống là ít hơn rõ rệt. Phòng cần ít nhất 3 người có việc mới tính trung vị.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12.5 }}>Tháng: <ViMonth value={ym} onChange={e => e.target.value && setYm(e.target.value)} style={{ padding: "5px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12.5 }} /></label>
          <label style={{ fontSize: 12.5 }}>Tính: <select value={mode} onChange={e => setMode(e.target.value)} style={{ padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6 }}>
            <option value="all">Mọi việc có hạn trong tháng (kể cả chưa xong)</option><option value="done">Chỉ việc đã đến hạn (tính điểm)</option></select></label>
        </div>
      </div>
      {data.map(({ d, people, med, max, tips }) => (
        <div key={d} style={{ ...card, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: DEPT_COLOR[d], marginBottom: 8 }}>{deptLabel(d)} {med != null && <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 12 }}>· trung vị {vn(med)} quy đổi</span>}</div>
          {!people.length && <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Không có nhân viên có việc trong tháng này.</div>}
          {people.map(p => {
            const r = p.ratio, hi = r != null && r >= 1.3, lo = r != null && r <= 0.8;
            const col = hi ? "#d97706" : lo ? "#0ea5e9" : "#16a34a";
            return (
              <div key={p.e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <div style={{ width: 150, fontSize: 12.5, flexShrink: 0 }}>{p.e.name}</div>
                <div style={{ flex: 1, position: "relative", height: 16, background: "#f1f5f9", borderRadius: 5 }}>
                  <div style={{ width: (p.load / max * 100) + "%", height: "100%", background: col, borderRadius: 5 }} />
                  {med != null && <div title={`Trung vị ${vn(med)}`} style={{ position: "absolute", left: (med / max * 100) + "%", top: -2, bottom: -2, width: 2, background: "#111827" }} />}
                </div>
                <div style={{ width: 120, fontSize: 12, textAlign: "right", flexShrink: 0 }}><b>{vn(p.load)}</b>{r != null && <span style={{ color: col, fontWeight: 600 }}> · ×{vn(r)}</span>}</div>
              </div>
            );
          })}
          {tips.length > 0 && (
            <div style={{ marginTop: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: "#92400e" }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Gợi ý cân bằng</div>
              {tips.map((t, i) => <div key={i}>• {t}</div>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
