import React from "react";
import { DEPTS, DEPT_COLOR } from "../constants";
import { isCompletedStatus } from "../helpers";
import { parseJSON } from "../helpers";

export default function Employees({
  isMobile, inp,
  canSeeAll, canCreate, isAdmin,
  userDept,
  empDeptTab, setEmpDeptTab,
  employees, computed,
  overloadThreshold, setOverloadThreshold,
  overloadedEmps,
  deptEmps,
  openCreateEmp, openEditEmp,
  deleteEmployee,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>⚠️ Ngưỡng quá tải:</span>
        <input type="number" min={2} max={20} value={overloadThreshold} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 50) { setOverloadThreshold(v); localStorage.setItem("qlcv_overload", v); } }} style={{ ...inp, width: 55, padding: "5px 8px", textAlign: "center" }} />
        <span style={{ fontSize: 13, color: "#374151" }}>nhiệm vụ</span>
        {overloadedEmps.length > 0 && <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>⚠️ {overloadedEmps.length} người quá tải</span>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(canSeeAll ? DEPTS : userDept ? [userDept] : []).map(d => (
          <button key={d} onClick={() => setEmpDeptTab(d)} style={{ padding: "7px 16px", border: "2px solid " + (empDeptTab === d ? DEPT_COLOR[d] : "#d1d5db"), borderRadius: 8, background: empDeptTab === d ? DEPT_COLOR[d] + "18" : "#fff", color: empDeptTab === d ? DEPT_COLOR[d] : "#6b7280", fontWeight: empDeptTab === d ? 600 : 400, cursor: "pointer", fontSize: 13 }}>Phòng {d} ({deptEmps(d).length})</button>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Phòng {empDeptTab} — {deptEmps(empDeptTab).length} nhân viên</span>
          {canCreate && <button onClick={() => openCreateEmp(empDeptTab)} style={{ background: DEPT_COLOR[empDeptTab], color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>+ Thêm</button>}
        </div>

        {isMobile ? (
          <div>
            {deptEmps(empDeptTab).map(emp => {
              const et = computed.filter(t => t.eid === emp.id);
              const ov = et.filter(t => t.status === "overdue").length;
              const cl = et.filter(t => t.status === "completed_late").length;
              const ac = et.filter(t => !isCompletedStatus(t.status)).length;
              const isOverload = ac >= overloadThreshold;
              const collabActiveMobile = computed.filter(t => !isCompletedStatus(t.status) && parseJSON(t.collab_eids, []).includes(emp.id)).length;
              return (
                <div key={emp.id} style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", background: isOverload ? "#fff5f5" : "#fff" }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{emp.name}{isOverload && <span style={{ marginLeft: 6, fontSize: 10, background: "#fee2e2", color: "#b91c1c", padding: "1px 6px", borderRadius: 8 }}>⚠️</span>}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{emp.role}{emp.no_kpi && <span title="Không giao việc / không tính KPI" style={{ marginLeft: 6, background: "#f1f5f9", color: "#64748b", padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>🚫 KPI</span>}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {ac > 0 && <span style={{ background: isOverload ? "#fee2e2" : "#e0e7ff", color: isOverload ? "#b91c1c" : "#4338ca", fontSize: 11, padding: "2px 6px", borderRadius: 8, fontWeight: isOverload ? 700 : 400 }}>{ac}</span>}
                    {ov > 0 && <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>!{ov}</span>}
                    {cl > 0 && <span style={{ background: "#fff1f2", color: "#991b1b", fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>⏰{cl}</span>}
                    {collabActiveMobile > 0 && <span style={{ background: "#ede9fe", color: "#7c3aed", fontSize: 11, padding: "2px 6px", borderRadius: 8 }}>🤝{collabActiveMobile}</span>}
                    {canCreate && <>
                      <button onClick={() => openEditEmp(emp)} style={{ padding: "3px 7px", border: "1px solid #d1d5db", borderRadius: 5, background: "#f9fafb", cursor: "pointer", fontSize: 12 }}>✏️</button>
                      {isAdmin && <button onClick={() => deleteEmployee(emp.id)} style={{ padding: "3px 7px", border: "1px solid #fca5a5", borderRadius: 5, background: "#fff0f0", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑️</button>}
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
            <thead><tr style={{ background: "#f9fafb" }}>{[["Họ và tên","22%"],["Chức vụ","13%"],["Đang TH","10%"],["Sắp HH","8%"],["Quá hạn","8%"],["HT quá hạn","9%"],["Phối hợp","10%"],["Tỷ lệ","10%"],["","10%"]].map(([h,w]) => <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", width: w }}>{h}</th>)}</tr></thead>
            <tbody>
              {deptEmps(empDeptTab).length === 0 && <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Chưa có nhân viên.</td></tr>}
              {deptEmps(empDeptTab).map(emp => {
                const et = computed.filter(t => t.eid === emp.id);
                const ov = et.filter(t => t.status === "overdue").length;
                const cl = et.filter(t => t.status === "completed_late").length;
                const nd = et.filter(t => t.status === "nearly_due").length;
                const ac = et.filter(t => !isCompletedStatus(t.status)).length;
                const done = et.filter(t => isCompletedStatus(t.status)).length;
                const rate = et.length ? Math.round(done / et.length * 100) : 0;
                const isOverload = ac >= overloadThreshold;
                const collabActive = computed.filter(t => !isCompletedStatus(t.status) && parseJSON(t.collab_eids, []).includes(emp.id)).length;
                return (
                  <tr key={emp.id} style={{ borderBottom: "1px solid #f3f4f6", background: isOverload ? "#fff5f5" : "#fff" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      {isOverload && <span style={{ fontSize: 10, background: "#fee2e2", color: "#b91c1c", padding: "1px 6px", borderRadius: 8 }}>⚠️ Quá tải</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>{emp.role}{emp.no_kpi && <span title="Không giao việc / không tính KPI" style={{ marginLeft: 6, background: "#f1f5f9", color: "#64748b", padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>🚫 KPI</span>}</td>
                    <td style={{ padding: "10px 14px" }}>{ac > 0 ? <span style={{ background: isOverload ? "#fee2e2" : "#e0e7ff", color: isOverload ? "#b91c1c" : "#4338ca", fontSize: 12, padding: "2px 8px", borderRadius: 8, fontWeight: isOverload ? 700 : 400 }}>{ac}{isOverload ? " ⚠" : ""}</span> : <span style={{ color: "#9ca3af", fontSize: 12 }}>0</span>}</td>
                    <td style={{ padding: "10px 14px" }}>{nd > 0 ? <span style={{ background: "#fef9c3", color: "#92400e", fontSize: 12, padding: "2px 8px", borderRadius: 8 }}>⚠ {nd}</span> : "–"}</td>
                    <td style={{ padding: "10px 14px" }}>{ov > 0 ? <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 12, padding: "2px 8px", borderRadius: 8 }}>! {ov}</span> : "–"}</td>
                    <td style={{ padding: "10px 14px" }}>{cl > 0 ? <span style={{ background: "#fff1f2", color: "#991b1b", fontSize: 12, padding: "2px 8px", borderRadius: 8 }}>⏰ {cl}</span> : "–"}</td>
                    <td style={{ padding: "10px 14px" }}>{collabActive > 0 ? <span style={{ background: "#ede9fe", color: "#7c3aed", fontSize: 12, padding: "2px 8px", borderRadius: 8 }}>🤝 {collabActive}</span> : <span style={{ color: "#9ca3af", fontSize: 12 }}>–</span>}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 50, height: 5, background: "#e5e7eb", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: rate + "%", background: rate >= 80 ? "#16a34a" : rate >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 5 }} /></div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: rate >= 80 ? "#15803d" : rate >= 50 ? "#92400e" : "#b91c1c" }}>{rate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {canCreate && <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => openEditEmp(emp)} style={{ padding: "3px 7px", border: "1px solid #d1d5db", borderRadius: 5, background: "#f9fafb", cursor: "pointer", fontSize: 12 }}>✏️</button>
                        {isAdmin && <button onClick={() => deleteEmployee(emp.id)} style={{ padding: "3px 7px", border: "1px solid #fca5a5", borderRadius: 5, background: "#fff0f0", cursor: "pointer", fontSize: 12, color: "#dc2626" }}>🗑️</button>}
                      </div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
