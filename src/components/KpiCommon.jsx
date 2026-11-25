import { useState, useMemo, Fragment } from "react";
import { COMMON_SECTIONS, COMMON_ROUNDS, roundTotal, sectionScore, commonFinal } from "../kpiFramework";
import { parseJSON } from "../helpers";
import { wasActiveIn, deptLabel } from "../constants";
import { ViMonth } from "./ViDate";

const curMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const FULL = ["admin", "director"], LEADS = ["manager", "deputy_manager", "manager_hcth"];

// Chấm TIÊU CHÍ CHUNG (30 điểm) theo tháng, từng tiêu chí con như Phiếu xếp loại: 3 lượt — cá nhân tự chấm → lãnh đạo phòng → lãnh đạo Trung tâm.
// Điểm chính thức = lượt cao nhất đã có. Quyền: ai cũng tự chấm mình; Trưởng/Phó phòng chấm người cùng phòng; Admin/Giám đốc chấm mọi lượt.
export default function KpiCommon({ employees, currentUser, kpiCommon, saveKpiCommon, card }) {
  const [ym, setYm] = useState(curMonth());
  const [sel, setSel] = useState("");
  const [draft, setDraft] = useState({}); // { round: { items: {id: v} } }
  const [y, m] = ym.split("-").map(Number);
  const role = currentUser?.role, myEid = currentUser?.employee_id;
  const me = (employees || []).find(e => e.id === myEid);
  const isFull = FULL.includes(role), isLead = LEADS.includes(role);
  const rows = useMemo(() => (employees || []).filter(e => !e.no_kpi && wasActiveIn(e, y, m) && (isFull || e.id === myEid || (isLead && me && e.dept === me.dept))), [employees, y, m, isFull, isLead, myEid, me]);
  const empId = rows.some(e => e.id === sel) ? sel : (rows.find(e => e.id === myEid)?.id || rows[0]?.id || "");
  const emp = rows.find(e => e.id === empId);
  const rec = emp && kpiCommon.find(k => k.eid === emp.id && k.year === y && k.month === m);
  const canRound = r => !!emp && (isFull || (r === "self" && emp.id === myEid) || (r === "dept" && isLead && me && emp.dept === me.dept));
  const stored = r => parseJSON(rec?.[r], null) || {};
  const cur = r => draft[r] || stored(r);
  const setItem = (r, id, v) => setDraft(d => ({ ...d, [r]: { ...cur(r), items: { ...(cur(r).items || {}), [id]: v } } }));
  const inB = { width: 50, padding: "3px 4px", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12.5, textAlign: "right" };
  const fin = commonFinal({ self: stored("self"), dept: stored("dept"), center: stored("center") });
  const save = async r => {
    const v = cur(r);
    const scores = { items: v.items || {} };
    for (const s of COMMON_SECTIONS) scores[s.k] = sectionScore(v, s);
    if (await saveKpiCommon(emp.id, y, m, r, scores)) setDraft(d => { const n = { ...d }; delete n[r]; return n; });
  };
  const th = { padding: "7px 8px", textAlign: "left", background: "#f9fafb", color: "#6b7280", position: "sticky", top: 0 };

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📝 Chấm tiêu chí chung (tối đa 30 điểm)</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
        Chấm từng tiêu chí như trong <b>Phiếu xếp loại chất lượng viên chức</b>. Điểm chính thức lấy theo lượt cao nhất đã có (Trung tâm &gt; Phòng &gt; Cá nhân). Chưa có điểm này thì KPI chỉ là điểm tạm tính từ phần nhiệm vụ.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontSize: 12.5 }}>Tháng: <ViMonth value={ym} onChange={e => { if (e.target.value) { setYm(e.target.value); setDraft({}); } }} style={{ padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
        <label style={{ fontSize: 12.5 }}>Nhân viên: <select value={empId} onChange={e => { setSel(e.target.value); setDraft({}); }} style={{ padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6 }}>
          {rows.map(e => <option key={e.id} value={e.id}>{e.name} — {deptLabel(e.dept)}</option>)}
        </select></label>
        {fin && <span style={{ fontSize: 13 }}>Điểm chính thức: <b style={{ color: "#4338ca" }}>{fin.total}/30</b></span>}
      </div>
      {!emp ? <div style={{ padding: 14, fontSize: 12.5, color: "#9ca3af" }}>Không có nhân viên thuộc quyền chấm.</div> : (
        <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr><th style={th}>Tiêu chí</th><th style={th}>Tối đa</th>{COMMON_ROUNDS.map(([k, l]) => <th key={k} style={th}>{l}</th>)}</tr></thead>
            <tbody>
              {COMMON_SECTIONS.map(s => (
                <Fragment key={s.k}>
                  <tr style={{ background: "#eef2ff", fontWeight: 700 }}>
                    <td style={{ padding: "6px 8px" }}>{s.label}</td><td style={{ padding: "6px 8px" }}>{s.max}</td>
                    {COMMON_ROUNDS.map(([r]) => <td key={r} style={{ padding: "6px 8px" }}>{sectionScore(cur(r), s) ?? "–"}</td>)}
                  </tr>
                  {s.items.map(it => (
                    <tr key={it.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "5px 8px 5px 18px", color: "#374151" }}>{it.id.split(".")[1]}. {it.label}</td>
                      <td style={{ padding: "5px 8px" }}>{it.max}</td>
                      {COMMON_ROUNDS.map(([r]) => (
                        <td key={r} style={{ padding: "5px 8px", background: canRound(r) ? "#fff" : "#fafafa" }}>
                          {canRound(r)
                            ? <input type="number" min={0} max={it.max} step={0.25} value={cur(r).items?.[it.id] ?? ""} onChange={e => setItem(r, it.id, e.target.value)} style={inB} />
                            : <span style={{ color: "#6b7280" }}>{cur(r).items?.[it.id] ?? "–"}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 700 }}>
                <td style={{ padding: "7px 8px" }}>Tổng cộng</td><td style={{ padding: "7px 8px" }}>30</td>
                {COMMON_ROUNDS.map(([r]) => (
                  <td key={r} style={{ padding: "7px 8px", color: "#4338ca" }}>
                    {roundTotal(cur(r)) ?? "–"}
                    {canRound(r) && draft[r] && <button onClick={() => save(r)} style={{ marginLeft: 6, padding: "2px 8px", border: "none", borderRadius: 6, background: "#4f46e5", color: "#fff", fontSize: 11.5, cursor: "pointer" }}>Lưu</button>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
