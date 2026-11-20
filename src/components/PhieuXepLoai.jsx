import { useState, useMemo } from "react";
import { GRADE_MINS, inGradingScope, deptLabel, wasActiveIn } from "../constants";
import { aggregateCommon, officialCommon, buildTaskSections, autoNotes, buildPhieuBody, wrapHtml } from "../phieuXepLoai";

const FULL = ["admin", "director"], LEADS = ["manager", "deputy_manager", "manager_hcth"];
const MGR_EMP = ["Trưởng phòng", "Phó trưởng phòng"];
const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");

// Tab "Phiếu xếp loại": dựng Phiếu xếp loại chất lượng viên chức (mẫu của đơn vị) từ dữ liệu QLCV; tải .doc để chỉnh/ký, hoặc in/PDF.
export default function PhieuXepLoai({ employees, currentUser, kpiCommon, calcMonthPerf, managerPerf, card, inp }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [scope, setScope] = useState("one"); // one | dept | all
  const [sel, setSel] = useState("");
  const role = currentUser?.role, myEid = currentUser?.employee_id;
  const me = (employees || []).find(e => e.id === myEid);
  const isFull = FULL.includes(role), isLead = LEADS.includes(role);
  const people = useMemo(() => (employees || []).filter(e => !e.no_kpi && wasActiveIn(e, year, 1) && (isFull || e.id === myEid || (isLead && me && e.dept === me.dept))), [employees, year, isFull, isLead, myEid, me]);
  const empId = people.some(e => e.id === sel) ? sel : (people.find(e => e.id === myEid)?.id || people[0]?.id || "");
  const targets = scope === "one" ? people.filter(e => e.id === empId) : scope === "dept" ? people.filter(e => me && e.dept === (people.find(p => p.id === empId)?.dept || me.dept)) : people;

  const dataFor = emp => {
    const perMonth = [];
    for (let m0 = 0; m0 < 12; m0++) {
      if (!inGradingScope(year, m0 + 1) || (year === now.getFullYear() && m0 > now.getMonth()) || year > now.getFullYear()) continue;
      const mgr = MGR_EMP.includes(emp.role);
      const p = mgr ? managerPerf(emp.id, year, m0) : calcMonthPerf(emp.id, year, m0);
      const resolved = mgr ? p.resolvedW : p.resolved;
      if (!(resolved > 0) || !p.breakdown) continue;
      perMonth.push({ month1: m0 + 1, resolved, done: mgr ? p.doneW : p.done, onTime: mgr ? p.onTimeW : p.onTime, completedLate: mgr ? p.lateW : p.completedLate, over: mgr ? p.overW : p.over, breakdown: p.breakdown });
    }
    return {
      year, name: emp.name, role: emp.role, dept: deptLabel(emp.dept), mins: GRADE_MINS,
      common: { self: aggregateCommon(kpiCommon, emp.id, year, "self"), official: officialCommon(kpiCommon, emp.id, year) },
      task: perMonth.length ? buildTaskSections(perMonth, 70) : null, notes: autoNotes(perMonth),
    };
  };
  const html = useMemo(() => wrapHtml(targets.map(e => buildPhieuBody(dataFor(e))), `Phieu xep loai ${year}`), [targets, year, kpiCommon]); // eslint-disable-line react-hooks/exhaustive-deps
  const fname = scope === "one" ? `Phieu_xep_loai_${slug(targets[0]?.name)}_${year}` : `Phieu_xep_loai_${scope === "dept" ? slug(deptLabel(targets[0]?.dept)) : "toan_don_vi"}_${year}`;
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿", html], { type: "application/msword" })); a.download = fname + ".doc"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const print = () => { const w = window.open("", "_blank"); if (!w) return; w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400); };

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📄 Phiếu xếp loại chất lượng viên chức</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
        Tự dựng theo mẫu của đơn vị từ dữ liệu trong phần mềm: tiêu chí chung (điểm đã chấm), kết quả nhiệm vụ (số lượng/chất lượng/tiến độ từng tháng), ưu điểm – hạn chế – hướng khắc phục gợi ý từ số liệu. Tải file Word để chỉnh sửa, ký tên.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontSize: 12.5 }}>Năm: <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...inp, width: 90, display: "inline-block" }}>{[2026, 2027, 2028].map(y => <option key={y}>{y}</option>)}</select></label>
        <label style={{ fontSize: 12.5 }}>Phạm vi: <select value={scope} onChange={e => setScope(e.target.value)} style={{ ...inp, width: 150, display: "inline-block" }}>
          <option value="one">Một người</option>{(isLead || isFull) && <option value="dept">Cả phòng</option>}{isFull && <option value="all">Toàn đơn vị</option>}
        </select></label>
        {(scope === "one" || scope === "dept") && <label style={{ fontSize: 12.5 }}>{scope === "one" ? "Nhân viên" : "Thuộc phòng của"}: <select value={empId} onChange={e => setSel(e.target.value)} style={{ ...inp, width: 230, display: "inline-block" }}>{people.map(e => <option key={e.id} value={e.id}>{e.name} — {deptLabel(e.dept)}</option>)}</select></label>}
        <button onClick={download} disabled={!targets.length} style={{ padding: "8px 14px", border: "none", borderRadius: 8, background: "#4f46e5", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>⬇ Tải Word ({targets.length} phiếu)</button>
        <button onClick={print} disabled={!targets.length} style={{ padding: "8px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f9fafb", fontSize: 13, cursor: "pointer" }}>🖨 In / PDF</button>
      </div>
      {targets.length ? <iframe title="Xem trước phiếu xếp loại" srcDoc={html} style={{ width: "100%", height: 560, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }} /> : <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Không có nhân viên thuộc quyền xem.</div>}
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>Lưu ý: Ban Giám đốc không có điểm nhiệm vụ tự động (không chấm KPI như nhân viên) — phiếu sẽ có phần nhiệm vụ trống để tự điền.</div>
    </div>
  );
}
