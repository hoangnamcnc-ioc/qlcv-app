import { useState, useMemo } from "react";
import { COMMON_SECTIONS, COMMON_ROUNDS, roundTotal, commonFinal } from "../kpiFramework";
import { parseJSON } from "../helpers";
import { isRankable, wasActiveIn, deptLabel } from "../constants";

const curMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const FULL = ["admin", "director"], LEADS = ["manager", "deputy_manager", "manager_hcth"];

// Chấm TIÊU CHÍ CHUNG (30 điểm) theo tháng, 3 lượt: cá nhân tự chấm → lãnh đạo phòng → lãnh đạo Trung tâm.
// Điểm chính thức = lượt cao nhất đã có. Quyền: ai cũng tự chấm mình; Trưởng/Phó phòng chấm người cùng phòng; Admin/Giám đốc chấm lượt Trung tâm (và các lượt khác nếu cần).
export default function KpiCommon({ employees, currentUser, kpiCommon, saveKpiCommon, card }) {
  const [ym, setYm] = useState(curMonth());
  const [draft, setDraft] = useState({});
  const [y, m] = ym.split("-").map(Number);
  const role = currentUser?.role, myEid = currentUser?.employee_id;
  const me = (employees || []).find(e => e.id === myEid);
  const isFull = FULL.includes(role), isLead = LEADS.includes(role);
  const rows = useMemo(() => (employees || []).filter(e => isRankable(e) && wasActiveIn(e, y, m) && (isFull || e.id === myEid || (isLead && me && e.dept === me.dept))), [employees, y, m, isFull, isLead, myEid, me]);
  const canRound = (e, r) => isFull || (r === "self" && e.id === myEid) || (r === "dept" && isLead && me && e.dept === me.dept);
  const rec = e => kpiCommon.find(k => k.eid === e.id && k.year === y && k.month === m);
  const val = (e, r) => draft[`${e.id}|${r}`] || parseJSON(rec(e)?.[r], null) || {};
  const set = (e, r, k, v) => setDraft(d => ({ ...d, [`${e.id}|${r}`]: { ...val(e, r), [k]: v } }));
  const inB = { width: 44, padding: "4px 4px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12.5, textAlign: "right" };

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📝 Chấm tiêu chí chung (tối đa 30 điểm)</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
        Mỗi lượt chấm 3 phần: {COMMON_SECTIONS.map(s => `${s.label.split(".")[0]} (≤${s.max})`).join(" · ")}. Điểm chính thức lấy theo lượt cao nhất đã có (Trung tâm &gt; Phòng &gt; Cá nhân). Chưa có điểm này thì KPI chỉ là điểm tạm tính từ phần nhiệm vụ.
      </div>
      <label style={{ fontSize: 12.5 }}>Tháng: <input type="month" value={ym} onChange={e => e.target.value && setYm(e.target.value)} style={{ padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead><tr style={{ background: "#f9fafb", color: "#6b7280", textAlign: "left" }}>
            <th style={{ padding: "7px 8px" }}>Nhân viên</th>
            {COMMON_ROUNDS.map(([k, l]) => <th key={k} style={{ padding: "7px 8px" }}>{l}</th>)}
            <th style={{ padding: "7px 8px" }}>Chính thức</th>
          </tr></thead>
          <tbody>{rows.map(e => {
            const fin = commonFinal({ self: parseJSON(rec(e)?.self, null), dept: parseJSON(rec(e)?.dept, null), center: parseJSON(rec(e)?.center, null) });
            return (
              <tr key={e.id} style={{ borderTop: "1px solid #f3f4f6", verticalAlign: "top" }}>
                <td style={{ padding: "7px 8px" }}><b>{e.name}</b><div style={{ fontSize: 11, color: "#9ca3af" }}>{deptLabel(e.dept)}</div></td>
                {COMMON_ROUNDS.map(([r]) => {
                  const v = val(e, r), editable = canRound(e, r), tot = roundTotal(v);
                  return (
                    <td key={r} style={{ padding: "7px 8px", background: editable ? "#fff" : "#fafafa" }}>
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        {COMMON_SECTIONS.map(s => (editable
                          ? <input key={s.k} type="number" min={0} max={s.max} step={0.5} value={v[s.k] ?? ""} onChange={ev => set(e, r, s.k, ev.target.value)} style={inB} title={s.label} />
                          : <span key={s.k} style={{ width: 30, textAlign: "right", color: "#6b7280" }}>{v[s.k] ?? "–"}</span>))}
                        <b style={{ marginLeft: 4, width: 36, color: "#4338ca" }}>{tot ?? "–"}</b>
                      </div>
                      {editable && draft[`${e.id}|${r}`] && <button onClick={async () => { if (await saveKpiCommon(e.id, y, m, r, v)) setDraft(d => { const n = { ...d }; delete n[`${e.id}|${r}`]; return n; }); }} style={{ marginTop: 4, padding: "3px 10px", border: "none", borderRadius: 6, background: "#4f46e5", color: "#fff", fontSize: 11.5, cursor: "pointer" }}>Lưu</button>}
                    </td>
                  );
                })}
                <td style={{ padding: "7px 8px", fontWeight: 700 }}>{fin ? `${fin.total}/30` : <span style={{ color: "#9ca3af", fontWeight: 400 }}>chưa có</span>}</td>
              </tr>
            );
          })}</tbody>
        </table>
        {!rows.length && <div style={{ padding: 14, fontSize: 12.5, color: "#9ca3af" }}>Không có nhân viên thuộc quyền chấm.</div>}
      </div>
    </div>
  );
}
