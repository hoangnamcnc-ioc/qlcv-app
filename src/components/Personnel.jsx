import React, { useMemo, useState, useEffect } from "react";
import { DEPTS, DEPT_COLOR, deptLabel } from "../constants";
import Employees from "./Employees";

// ── QL Nhân sự: gộp 3 mảng vào 1 mục có tab con ─────────────────────────────────
//  • Khối lượng việc  → giữ nguyên bảng thống kê cũ (component Employees).
//  • Hồ sơ nhân sự     → thông tin cá nhân + khen thưởng/kỷ luật + nghỉ phép (lưu trong cột employees.hr JSON).
//  • Cơ cấu nhân sự    → thống kê giới tính / độ tuổi / trình độ / thâm niên / phòng ban.
// Dữ liệu hồ sơ lưu ở 1 cột JSON "hr" (chạy supabase/10-hr-column.sql một lần).

const getHr = e => { const h = e && e.hr; if (!h) return {}; if (typeof h === "string") { try { return JSON.parse(h); } catch { return {}; } } return h; };
const yearsSince = s => { if (!s) return null; const d = new Date(s); if (isNaN(d)) return null; return (Date.now() - d.getTime()) / (365.25 * 864e5); };
const eduGroup = s => { const t = (s || "").toLowerCase(); if (!t.trim()) return "Chưa cập nhật"; if (/tiến sĩ|ts\b|phó gs|gs\b/.test(t)) return "Tiến sĩ"; if (/thạc sĩ|ths\b|cao học/.test(t)) return "Thạc sĩ"; if (/đại học|cử nhân|kỹ sư|đh\b/.test(t)) return "Đại học"; if (/cao đẳng|cđ\b/.test(t)) return "Cao đẳng"; if (/trung cấp|tc\b/.test(t)) return "Trung cấp"; return "Khác"; };

// Biểu đồ cột ngang đơn giản
function Bars({ data, color = "#6366f1" }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 120, fontSize: 12, color: "#374151", textAlign: "right", flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, height: 16, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: (d.value / max * 100) + "%", background: d.color || color, borderRadius: 4 }} /></div>
          <div style={{ width: 34, fontSize: 12, fontWeight: 700, color: "#4338ca" }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}

const lbl = { fontSize: 11.5, color: "#6b7280", display: "block", marginBottom: 3 };

export default function Personnel(props) {
  const { employees, computed, canManageHR, meId, isAdmin, canManageDept, canSeeAll, userDept, updateEmployee, transferDept, isMobile, empDeptTab, setEmpDeptTab, deptEmps, deptRows, addDept, updateDept, deleteDept } = props;
  // CHỈ Admin/Giám đốc được thêm–sửa–xóa & quản lý cơ cấu. Người khác chỉ XEM hồ sơ của CHÍNH MÌNH.
  const canDept = !!canManageHR; // quản lý phòng/ban
  const [tab, setTab] = useState(canManageHR ? "workload" : "profile");
  const canEditHr = !!canManageHR;

  const inp = { padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 13, background: "#fff", color: "#111", width: "100%", boxSizing: "border-box" };
  const card = { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 };
  // Người thường: chỉ 1 tab "Hồ sơ của tôi" (xem thông tin của chính mình). Admin/GĐ: đầy đủ.
  const TABS = canManageHR
    ? [["workload", "📋 Khối lượng việc"], ["profile", "👤 Hồ sơ nhân sự"], ["stats", "📊 Cơ cấu nhân sự"], ["depts", "🏢 Phòng/Ban"]]
    : [["profile", "👤 Hồ sơ của tôi"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 14px", border: "1px solid " + (tab === k ? "#4f46e5" : "#e5e7eb"), background: tab === k ? "#4f46e5" : "#fff", color: tab === k ? "#fff" : "#6b7280", fontWeight: 600, fontSize: 13, borderRadius: 8, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {tab === "workload" && canManageHR && <Employees {...props} canCreate={true} isAdmin={true} />}
      {tab === "profile" && <ProfileTab {...{ employees, computed, canEditHr, canManageHR, meId, canManageDept: canDept, isAdmin, canSeeAll, userDept, updateEmployee, transferDept, isMobile, empDeptTab, setEmpDeptTab, deptEmps, inp, card, meName: props.meName }} />}
      {tab === "stats" && canManageHR && <StatsTab employees={employees} canSeeAll={canSeeAll} userDept={userDept} card={card} />}
      {tab === "depts" && canDept && <DeptTab {...{ deptRows, addDept, updateDept, deleteDept, deptAudit: props.deptAudit, deptOversight: props.deptOversight, setDeptOverseer: props.setDeptOverseer, employees, isMobile, inp, card }} />}
    </div>
  );
}

// ── TAB PHÒNG/BAN (chỉ admin) ────────────────────────────────────────────────
const EXEC_ROLES = ["Giám đốc", "Phó Giám đốc"];
function DeptTab({ deptRows, addDept, updateDept, deleteDept, deptAudit = [], deptOversight = {}, setDeptOverseer, employees, isMobile, inp, card }) {
  const bgd = (employees || []).filter(e => EXEC_ROLES.includes(e.role)); // thành viên Ban Giám đốc để gán phụ trách
  const [nn, setNn] = useState("");
  const [ncode, setNcode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [nc, setNc] = useState("#6366f1");
  const rows = [...(deptRows || [])].sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));
  const countIn = code => (employees || []).filter(e => e.dept === code).length;
  // Gợi ý mã ngắn từ tên (viết tắt chữ cái đầu, bỏ dấu) nếu người dùng chưa tự gõ mã.
  const suggestCode = name => name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 8);
  const onName = v => { setNn(v); if (!codeTouched) setNcode(suggestCode(v)); };
  const create = () => { if (!nn.trim() || !ncode.trim()) return; addDept({ code: ncode.trim(), name: nn.trim(), color: nc }); setNn(""); setNcode(""); setCodeTouched(false); setNc("#6366f1"); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>➕ Thêm phòng / ban mới</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}><label style={lbl}>Tên đầy đủ (hiển thị)</label><input value={nn} onChange={e => onName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} placeholder="VD: Ban Giám đốc" style={inp} /></div>
          <div style={{ width: 110 }}><label style={lbl}>Mã ngắn</label><input value={ncode} onChange={e => { setCodeTouched(true); setNcode(e.target.value); }} onKeyDown={e => e.key === "Enter" && create()} placeholder="BGĐ" style={inp} /></div>
          <div><label style={lbl}>Màu</label><input type="color" value={nc} onChange={e => setNc(e.target.value)} style={{ width: 48, height: 38, border: "1px solid #d1d5db", borderRadius: 7, cursor: "pointer", background: "#fff", padding: 2 }} /></div>
          <button onClick={create} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Thêm</button>
        </div>
        <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 8 }}>Tên đầy đủ hiện ở tiêu đề/menu chọn; mã ngắn hiện ở bảng gọn (như "HCTH"). Mã cố định, không đổi sau khi tạo.</div>
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 13, fontWeight: 600 }}>Danh sách phòng / ban ({rows.length})</div>
        {rows.map(d => <DeptRow key={d.code} d={d} count={countIn(d.code)} onSave={updateDept} onDelete={deleteDept} inp={inp} isMobile={isMobile} bgd={bgd} overseerId={deptOversight[d.code] || ""} onSetOverseer={setDeptOverseer} />)}
        {!rows.length && <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>Chưa có phòng/ban.</div>}
      </div>
      {deptAudit.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 13, fontWeight: 600 }}>🕒 Nhật ký thay đổi phòng/ban</div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {[...deptAudit].reverse().slice(0, 30).map((a, i) => (
              <div key={i} style={{ padding: "8px 16px", borderBottom: "1px solid #f8fafc", fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ color: "#374151" }}>{a.action}</span>
                <span style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{a.by} · {a.at}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeptRow({ d, count, onSave, onDelete, inp, isMobile, bgd = [], overseerId = "", onSetOverseer }) {
  const [name, setName] = useState(d.name);
  const [color, setColor] = useState(d.color || "#6366f1");
  const dirty = name.trim() !== d.name || color !== (d.color || "#6366f1");
  const isBGDdept = bgd.some(e => e.dept === d.code); // phòng Ban Giám đốc thì không gán "BGĐ phụ trách"
  return (
    <div style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 34, height: 34, border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", background: "#fff", padding: 2, flexShrink: 0 }} />
        <input value={name} onChange={e => setName(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
        <span style={{ fontSize: 11.5, color: "#6b7280", whiteSpace: "nowrap" }}>{count} người</span>
        <button disabled={!dirty || !name.trim()} onClick={() => onSave(d.code, { name: name.trim(), color })} style={{ background: dirty ? "#16a34a" : "#e5e7eb", color: dirty ? "#fff" : "#9ca3af", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: dirty ? "pointer" : "default" }}>💾 Lưu</button>
        <button onClick={() => onDelete(d.code)} title={count > 0 ? "Còn người thuộc đơn vị này" : "Xóa"} style={{ border: "1px solid #fca5a5", background: "#fff0f0", color: "#dc2626", borderRadius: 7, padding: "6px 9px", fontSize: 12.5, cursor: "pointer" }}>🗑️</button>
      </div>
      {!isBGDdept && onSetOverseer && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, paddingLeft: 44, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>👔 BGĐ phụ trách:</span>
          <select value={overseerId} onChange={e => onSetOverseer(d.code, e.target.value)} style={{ ...inp, width: "auto", padding: "5px 8px", fontSize: 12.5 }}>
            <option value="">— Chưa gán —</option>
            {bgd.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

// ── TAB HỒ SƠ ───────────────────────────────────────────────────────────────
function ProfileTab({ employees, computed, canEditHr, canManageHR, meId, canManageDept, canSeeAll, userDept, updateEmployee, transferDept, isMobile, empDeptTab, setEmpDeptTab, deptEmps, inp, card, meName }) {
  const ownMode = !canManageHR; // Người thường: chỉ xem hồ sơ của CHÍNH MÌNH, chỉ đọc
  const [selId, setSelId] = useState(ownMode ? meId : null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [xfer, setXfer] = useState(null); // { toDept, moveTasks } khi đang mở form chuyển phòng

  const depts = ownMode ? [] : (canSeeAll ? DEPTS : userDept ? [userDept] : []);
  const list = ownMode ? (employees || []).filter(e => e.id === meId) : deptEmps(empDeptTab || depts[0]);
  const sel = employees.find(e => e.id === selId);
  useEffect(() => { if (ownMode && meId && selId !== meId) setSelId(meId); }, [ownMode, meId]);

  const open = emp => { setSelId(emp.id); const hr = getHr(emp); setDraft({ ...hr, rewards: hr.rewards || [], leaves: hr.leaves || [] }); setSaved(false); };
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const save = async () => {
    if (!sel) return; setSaving(true);
    // Ghi NHẬT KÝ cập nhật hồ sơ (ai sửa, lúc nào) ngay trong hr._audit — quy trách nhiệm với dữ liệu cán bộ.
    const audit = [...(draft._audit || []), { by: meName || "—", at: new Date().toLocaleString("vi-VN") }].slice(-20);
    const payload = { ...draft, _audit: audit };
    const ok = await updateEmployee(sel.id, { hr: payload });
    setSaving(false); if (ok === false) return;
    setDraft(payload); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const addReward = () => setDraft(d => ({ ...d, rewards: [...(d.rewards || []), { date: "", type: "reward", title: "", note: "" }] }));
  const setReward = (i, k, v) => setDraft(d => ({ ...d, rewards: d.rewards.map((r, j) => j === i ? { ...r, [k]: v } : r) }));
  const delReward = i => setDraft(d => ({ ...d, rewards: d.rewards.filter((_, j) => j !== i) }));
  const addLeave = () => setDraft(d => ({ ...d, leaves: [...(d.leaves || []), { from: "", to: "", days: "", type: "annual", reason: "" }] }));
  const setLeave = (i, k, v) => setDraft(d => ({ ...d, leaves: d.leaves.map((r, j) => j === i ? { ...r, [k]: v } : r) }));
  const delLeave = i => setDraft(d => ({ ...d, leaves: d.leaves.filter((_, j) => j !== i) }));

  // Gọi như HÀM ({F({...})}) — KHÔNG dùng <F/> để tránh React remount input làm mất focus mỗi lần gõ.
  const F = ({ k, label, type = "text", ph, opts }) => (
    <div key={k}>
      <label style={{ fontSize: 11.5, color: "#6b7280", display: "block", marginBottom: 3 }}>{label}</label>
      {opts
        ? <select value={draft[k] || ""} onChange={e => set(k, e.target.value)} disabled={!canEditHr} style={inp}>{opts.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}</select>
        : <input type={type} value={draft[k] || ""} onChange={e => set(k, e.target.value)} placeholder={ph} disabled={!canEditHr} style={inp} />}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 14, flexDirection: isMobile ? "column" : "row", alignItems: "flex-start" }}>
      {/* Danh sách chọn người */}
      <div style={{ ...card, width: isMobile ? "100%" : 240, flexShrink: 0, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 10, borderBottom: "1px solid #f1f5f9" }}>
          {depts.map(d => <button key={d} onClick={() => setEmpDeptTab(d)} style={{ padding: "4px 10px", border: "1px solid " + (empDeptTab === d ? DEPT_COLOR[d] : "#e5e7eb"), borderRadius: 6, background: empDeptTab === d ? DEPT_COLOR[d] + "18" : "#fff", color: empDeptTab === d ? DEPT_COLOR[d] : "#6b7280", fontSize: 12, cursor: "pointer" }}>{deptLabel(d)}</button>)}
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {list.map(e => { const hr = getHr(e); const done = hr.dob || hr.phone || hr.education; return (
            <div key={e.id} onClick={() => open(e)} style={{ padding: "9px 12px", borderBottom: "1px solid #f8fafc", cursor: "pointer", background: selId === e.id ? "#eef2ff" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 13, fontWeight: selId === e.id ? 600 : 400 }}>{e.name}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{e.role}</div></div>
              <span title={done ? "Đã có hồ sơ" : "Chưa cập nhật hồ sơ"} style={{ fontSize: 11 }}>{done ? "✅" : "◻️"}</span>
            </div>
          ); })}
          {!list.length && <div style={{ padding: 16, fontSize: 12.5, color: "#9ca3af" }}>Chưa có nhân viên.</div>}
        </div>
      </div>

      {/* Hồ sơ chi tiết */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14, width: isMobile ? "100%" : "auto" }}>
        {!sel || !draft ? (
          <div style={{ ...card, textAlign: "center", color: "#9ca3af", padding: 40 }}>👈 Chọn một nhân viên để xem / cập nhật hồ sơ.</div>
        ) : (<>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{sel.name} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>· {sel.role} · {deptLabel(sel.dept)}</span></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canManageDept && transferDept && <button onClick={() => setXfer({ toDept: (DEPTS.find(d => d !== sel.dept) || ""), moveTasks: false })} style={{ background: "#fff", color: "#0891b2", border: "1px solid #a5f3fc", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🔀 Chuyển phòng</button>}
                {canEditHr && <button onClick={save} disabled={saving} style={{ background: saved ? "#16a34a" : "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Đang lưu…" : saved ? "✓ Đã lưu" : "💾 Lưu hồ sơ"}</button>}
              </div>
            </div>
            {xfer && (() => {
              const openCount = (computed || []).filter(t => t.eid === sel.id && !["completed", "completed_late"].includes(t.status)).length;
              const doXfer = async () => { await transferDept(sel.id, xfer.toDept, xfer.moveTasks); setXfer(null); };
              return (
                <div style={{ marginBottom: 12, padding: 12, background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0e7490", marginBottom: 8 }}>🔀 Chuyển {sel.name} sang phòng khác</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>{deptLabel(sel.dept)} →</span>
                    <select value={xfer.toDept} onChange={e => setXfer(x => ({ ...x, toDept: e.target.value }))} style={{ ...inp, width: "auto" }}>{DEPTS.filter(d => d !== sel.dept).map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}</select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#374151", cursor: "pointer", marginBottom: 10 }}>
                    <input type="checkbox" checked={xfer.moveTasks} onChange={e => setXfer(x => ({ ...x, moveTasks: e.target.checked }))} style={{ width: 15, height: 15 }} />
                    Chuyển luôn <b>{openCount}</b> việc đang mở sang phòng mới <span style={{ color: "#9ca3af" }}>(việc đã xong giữ nguyên phòng cũ)</span>
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={doXfer} style={{ background: "#0891b2", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Xác nhận chuyển</button>
                    <button onClick={() => setXfer(null)} style={{ background: "none", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}>Hủy</button>
                  </div>
                </div>
              );
            })()}
            {(draft._audit || []).length > 0 && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }} title={(draft._audit || []).slice(-8).reverse().map(a => `${a.action ? a.action + " — " : ""}${a.by} · ${a.at}`).join("\n")}>🕒 Cập nhật gần nhất: <b style={{ color: "#6b7280" }}>{draft._audit[draft._audit.length - 1].by}</b> lúc {draft._audit[draft._audit.length - 1].at} <span style={{ opacity: 0.7 }}>· {draft._audit.length} lần chỉnh sửa (di chuột để xem)</span></div>}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
              {F({ k: "dob", label: "Ngày sinh", type: "date" })}
              {F({ k: "gender", label: "Giới tính", opts: [{ v: "", t: "—" }, { v: "nam", t: "Nam" }, { v: "nu", t: "Nữ" }] })}
              {F({ k: "ethnicity", label: "Dân tộc", ph: "Kinh" })}
              {F({ k: "cccd", label: "Số CCCD", ph: "0123…" })}
              {F({ k: "phone", label: "Điện thoại", ph: "09…" })}
              {F({ k: "email", label: "Email", ph: "@" })}
              <div style={{ gridColumn: isMobile ? "1 / -1" : "1 / 3" }}><label style={lbl}>Địa chỉ</label><input value={draft.address || ""} onChange={e => set("address", e.target.value)} disabled={!canEditHr} style={inp} /></div>
              {F({ k: "join_date", label: "Ngày vào cơ quan", type: "date" })}
              {F({ k: "rank", label: "Ngạch / bậc", ph: "Chuyên viên" })}
              {F({ k: "education", label: "Trình độ chuyên môn", ph: "Đại học CNTT" })}
              {F({ k: "politics", label: "Lý luận chính trị", ph: "Trung cấp" })}
              {F({ k: "party_date", label: "Ngày vào Đảng", type: "date" })}
              {F({ k: "salary_grade", label: "Bậc lương hiện hưởng", ph: "Bậc 3" })}
              {F({ k: "salary_coef", label: "Hệ số lương", ph: "3.00" })}
              {F({ k: "next_raise", label: "Nâng bậc lương tiếp theo", type: "date" })}
            </div>
          </div>

          {/* Khen thưởng - kỷ luật */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>🏅 Khen thưởng – Kỷ luật</div>
              {canEditHr && <button onClick={addReward} style={{ fontSize: 12, border: "1px solid #c7d2fe", background: "#eef2ff", color: "#4338ca", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>+ Thêm</button>}
            </div>
            {(draft.rewards || []).length === 0 && <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Chưa có ghi nhận.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(draft.rewards || []).map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "130px 130px 1fr 1fr auto", gap: 8, alignItems: "center", background: r.type === "discipline" ? "#fff1f2" : "#f0fdf4", padding: 8, borderRadius: 8 }}>
                  <input type="date" value={r.date || ""} onChange={e => setReward(i, "date", e.target.value)} disabled={!canEditHr} style={inp} />
                  <select value={r.type} onChange={e => setReward(i, "type", e.target.value)} disabled={!canEditHr} style={inp}><option value="reward">🏅 Khen thưởng</option><option value="discipline">⚠️ Kỷ luật</option></select>
                  <input value={r.title || ""} onChange={e => setReward(i, "title", e.target.value)} placeholder="Nội dung/danh hiệu" disabled={!canEditHr} style={inp} />
                  <input value={r.note || ""} onChange={e => setReward(i, "note", e.target.value)} placeholder="Ghi chú/quyết định" disabled={!canEditHr} style={inp} />
                  {canEditHr && <button onClick={() => delReward(i)} style={{ border: "1px solid #fca5a5", background: "#fff0f0", color: "#dc2626", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 12 }}>🗑️</button>}
                </div>
              ))}
            </div>
          </div>

          {/* Nghỉ phép */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>🌴 Nghỉ phép / Vắng <span style={{ fontSize: 11.5, fontWeight: 400, color: "#9ca3af" }}>· tổng {(draft.leaves || []).reduce((s, l) => s + (+l.days || 0), 0)} ngày</span></div>
              {canEditHr && <button onClick={addLeave} style={{ fontSize: 12, border: "1px solid #c7d2fe", background: "#eef2ff", color: "#4338ca", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>+ Thêm</button>}
            </div>
            {(draft.leaves || []).length === 0 && <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Chưa có ghi nhận.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(draft.leaves || []).map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "130px 130px 70px 120px 1fr auto", gap: 8, alignItems: "center", background: "#f8fafc", padding: 8, borderRadius: 8 }}>
                  <input type="date" value={l.from || ""} onChange={e => setLeave(i, "from", e.target.value)} disabled={!canEditHr} style={inp} />
                  <input type="date" value={l.to || ""} onChange={e => setLeave(i, "to", e.target.value)} disabled={!canEditHr} style={inp} />
                  <input type="number" min="0" value={l.days || ""} onChange={e => setLeave(i, "days", e.target.value)} placeholder="ngày" disabled={!canEditHr} style={inp} />
                  <select value={l.type} onChange={e => setLeave(i, "type", e.target.value)} disabled={!canEditHr} style={inp}><option value="annual">Phép năm</option><option value="sick">Ốm</option><option value="unpaid">Không lương</option><option value="other">Khác</option></select>
                  <input value={l.reason || ""} onChange={e => setLeave(i, "reason", e.target.value)} placeholder="Lý do" disabled={!canEditHr} style={inp} />
                  {canEditHr && <button onClick={() => delLeave(i)} style={{ border: "1px solid #fca5a5", background: "#fff0f0", color: "#dc2626", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 12 }}>🗑️</button>}
                </div>
              ))}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── TAB CƠ CẤU ──────────────────────────────────────────────────────────────
function StatsTab({ employees, canSeeAll, userDept, card }) {
  const emps = useMemo(() => (employees || []).filter(e => canSeeAll || e.dept === userDept), [employees, canSeeAll, userDept]);
  const total = emps.length;

  const stats = useMemo(() => {
    const gender = { Nam: 0, Nữ: 0, "Chưa rõ": 0 };
    const age = { "Dưới 30": 0, "30–40": 0, "40–50": 0, "Trên 50": 0, "Chưa rõ": 0 };
    const edu = {};
    const tenure = { "Dưới 5 năm": 0, "5–10 năm": 0, "10–20 năm": 0, "Trên 20 năm": 0, "Chưa rõ": 0 };
    const byDept = {};
    for (const e of emps) {
      const hr = getHr(e);
      gender[hr.gender === "nam" ? "Nam" : hr.gender === "nu" ? "Nữ" : "Chưa rõ"]++;
      const a = yearsSince(hr.dob);
      age[a == null ? "Chưa rõ" : a < 30 ? "Dưới 30" : a < 40 ? "30–40" : a < 50 ? "40–50" : "Trên 50"]++;
      const g = eduGroup(hr.education); edu[g] = (edu[g] || 0) + 1;
      const t = yearsSince(hr.join_date);
      tenure[t == null ? "Chưa rõ" : t < 5 ? "Dưới 5 năm" : t < 10 ? "5–10 năm" : t < 20 ? "10–20 năm" : "Trên 20 năm"]++;
      byDept[e.dept] = (byDept[e.dept] || 0) + 1;
    }
    const toArr = (o, order) => (order || Object.keys(o)).filter(k => o[k] != null).map(k => ({ label: k, value: o[k] })).filter(d => d.value > 0);
    const eduOrder = ["Tiến sĩ", "Thạc sĩ", "Đại học", "Cao đẳng", "Trung cấp", "Khác", "Chưa cập nhật"];
    return {
      gender: [{ label: "Nam", value: gender.Nam, color: "#3b82f6" }, { label: "Nữ", value: gender.Nữ, color: "#ec4899" }, { label: "Chưa rõ", value: gender["Chưa rõ"], color: "#cbd5e1" }].filter(d => d.value > 0),
      age: toArr(age, ["Dưới 30", "30–40", "40–50", "Trên 50", "Chưa rõ"]),
      edu: toArr(edu, eduOrder),
      tenure: toArr(tenure, ["Dưới 5 năm", "5–10 năm", "10–20 năm", "Trên 20 năm", "Chưa rõ"]),
      byDept: Object.entries(byDept).map(([k, v]) => ({ label: k, value: v, color: DEPT_COLOR[k] })),
    };
  }, [emps]);

  const filled = emps.filter(e => { const h = getHr(e); return h.dob || h.gender || h.education; }).length;
  const Block = ({ title, data, color }) => <div style={card}><div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>{title}</div>{data.length ? <Bars data={data} color={color} /> : <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Chưa có dữ liệu.</div>}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div><div style={{ fontSize: 26, fontWeight: 800, color: "#4338ca" }}>{total}</div><div style={{ fontSize: 12, color: "#6b7280" }}>Tổng nhân sự</div></div>
        <div><div style={{ fontSize: 26, fontWeight: 800, color: "#16a34a" }}>{filled}</div><div style={{ fontSize: 12, color: "#6b7280" }}>Đã có hồ sơ</div></div>
        <div><div style={{ fontSize: 26, fontWeight: 800, color: "#b45309" }}>{total - filled}</div><div style={{ fontSize: 12, color: "#6b7280" }}>Chưa cập nhật</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <Block title="👤 Giới tính" data={stats.gender} />
        <Block title="🎂 Độ tuổi" data={stats.age} color="#8b5cf6" />
        <Block title="🎓 Trình độ chuyên môn" data={stats.edu} color="#0891b2" />
        <Block title="📆 Thâm niên công tác" data={stats.tenure} color="#f59e0b" />
        <Block title="🏢 Theo phòng ban" data={stats.byDept} />
      </div>
    </div>
  );
}
