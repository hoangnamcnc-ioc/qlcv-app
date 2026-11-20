import { useState, useMemo } from "react";
import { DIFFICULTY_CRITERIA, difficultyCoef, STANDARD_POINT } from "../kpiFramework";
import { DEPTS, deptLabel } from "../constants";

const GROUPS = ["N1", "N2", "N3", "N4", "N5"];
const norm = s => String(s || "").toLowerCase();

// Chọn SẢN PHẨM CHUẨN khi tạo việc: gắn hệ số quy đổi (tính điểm KPI theo khối lượng quy đổi).
export function CatalogPicker({ items, dept, value, onPick, inp }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => (items || []).filter(i => i.active !== false && (!i.dept || i.dept === dept) && (!q || norm(i.code + " " + i.name + " " + i.output).includes(norm(q)))).slice(0, 80), [items, dept, q]);
  if (!items?.length) return null;
  const cur = items.find(i => i.code === value);
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>📚 Sản phẩm chuẩn (tính hệ số quy đổi KPI) {cur && <b style={{ color: "#4338ca" }}>· hệ số {cur.coef}</b>}</div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Gõ để tìm sản phẩm chuẩn…" style={{ ...inp, marginBottom: 4 }} />
      <select value={value || ""} onChange={e => onPick(items.find(i => i.code === e.target.value) || null)} style={inp}>
        <option value="">— Không chọn (hệ số mặc định 1) —</option>
        {cur && !list.some(i => i.code === cur.code) && <option value={cur.code}>{cur.code} · {cur.name} (hệ số {cur.coef})</option>}
        {list.map(i => <option key={i.code} value={i.code}>{i.code} · {i.name.slice(0, 70)} (hệ số {i.coef})</option>)}
      </select>
    </div>
  );
}

// Tab "Danh mục sản phẩm": xem/tìm danh mục, công cụ tính hệ số quy đổi, thêm/sửa (Admin/Giám đốc).
export default function KpiCatalog({ items, canEdit, onSave, card, inp }) {
  const [q, setQ] = useState(""), [dept, setDept] = useState("all"), [form, setForm] = useState(null);
  const [hours, setHours] = useState(""), [sc, setSc] = useState([3, 3, 3, 3, 3]);
  const calc = difficultyCoef(hours, sc);
  const list = useMemo(() => (items || []).filter(i => (dept === "all" || (dept === "common" ? !i.dept : i.dept === dept)) && (!q || norm(i.code + " " + i.name + " " + i.output).includes(norm(q)))).sort((a, b) => a.code.localeCompare(b.code)), [items, q, dept]);
  const th = { padding: "7px 8px", textAlign: "left" }, td = { padding: "6px 8px", verticalAlign: "top" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🧮 Công cụ tính hệ số quy đổi</div>
        <div style={{ fontSize: 11.5, color: "#9ca3af", marginBottom: 8 }}>Tổng điểm = giờ công × hệ số độ khó (TB của 5 tiêu chí chấm 1,0–5,0). Hệ số quy đổi = tổng điểm ÷ {STANDARD_POINT}.</div>
        <label style={{ fontSize: 12.5 }}>Tổng giờ công: <input type="number" min={0} step={0.25} value={hours} onChange={e => setHours(e.target.value)} style={{ width: 80, padding: "5px 6px", border: "1px solid #d1d5db", borderRadius: 6 }} /></label>
        {DIFFICULTY_CRITERIA.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 12.5 }}>
            <span style={{ flex: 1 }}>{i + 1}. {c}</span>
            <input type="number" min={1} max={5} step={0.1} value={sc[i]} onChange={e => setSc(s => s.map((v, j) => (j === i ? e.target.value : v)))} style={{ width: 64, padding: "5px 6px", border: "1px solid #d1d5db", borderRadius: 6, textAlign: "right" }} />
          </div>
        ))}
        <div style={{ marginTop: 10, fontSize: 13 }}>
          {calc ? <>Độ khó TB <b>{calc.avg}</b> · Tổng điểm <b>{calc.points}</b> · <b style={{ color: "#4338ca" }}>Hệ số quy đổi {calc.coef}</b></> : <span style={{ color: "#9ca3af" }}>Nhập giờ công &gt; 0 và 5 điểm từ 1 đến 5.</span>}
          {canEdit && calc && <button onClick={() => setForm({ code: "", name: "", output: "", grp: "N3", points: calc.points, coef: calc.coef, dept: "", note: "", active: true })} style={{ marginLeft: 10, padding: "4px 10px", border: "1px solid #c7d2fe", borderRadius: 6, background: "#eef2ff", fontSize: 12, cursor: "pointer" }}>➕ Thêm vào danh mục</button>}
        </div>
      </div>

      {form && (
        <div style={{ ...card, padding: 16, border: "1px solid #c7d2fe" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{items.some(i => i.code === form.code) ? "Sửa sản phẩm" : "Thêm sản phẩm chuẩn"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input placeholder="Mã (vd HCTH-034)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.trim() })} style={inp} />
            <select value={form.dept || ""} onChange={e => setForm({ ...form, dept: e.target.value })} style={inp}><option value="">Dùng chung</option>{DEPTS.map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}</select>
            <input placeholder="Tên công việc/sản phẩm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inp, gridColumn: "1 / 3" }} />
            <input placeholder="Sản phẩm đầu ra" value={form.output || ""} onChange={e => setForm({ ...form, output: e.target.value })} style={inp} />
            <select value={form.grp || "N3"} onChange={e => setForm({ ...form, grp: e.target.value })} style={inp}>{GROUPS.map(g => <option key={g}>{g}</option>)}</select>
            <input type="number" placeholder="Điểm" value={form.points ?? ""} onChange={e => setForm({ ...form, points: e.target.value })} style={inp} />
            <input type="number" step={0.1} placeholder="Hệ số quy đổi" value={form.coef ?? ""} onChange={e => setForm({ ...form, coef: e.target.value })} style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button disabled={!form.code || !form.name || !(Number(form.coef) > 0)} onClick={async () => { if (await onSave({ ...form, points: form.points === "" || form.points == null ? null : Number(form.points), coef: Number(form.coef), dept: form.dept || null })) setForm(null); }} style={{ padding: "8px 14px", border: "none", borderRadius: 8, background: "#4f46e5", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>💾 Lưu</button>
            <button onClick={() => setForm(null)} style={{ padding: "8px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f9fafb", fontSize: 13, cursor: "pointer" }}>Hủy</button>
          </div>
        </div>
      )}

      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>📚 Danh mục sản phẩm chuẩn ({list.length}/{(items || []).length})</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm mã, tên, sản phẩm…" style={{ ...inp, width: 220 }} />
          <select value={dept} onChange={e => setDept(e.target.value)} style={{ ...inp, width: 160 }}><option value="all">Tất cả</option><option value="common">Dùng chung</option>{DEPTS.map(d => <option key={d} value={d}>{deptLabel(d)}</option>)}</select>
          {canEdit && <button onClick={() => setForm({ code: "", name: "", output: "", grp: "N3", points: "", coef: "", dept: "", note: "", active: true })} style={{ padding: "6px 12px", border: "1px solid #c7d2fe", borderRadius: 6, background: "#eef2ff", fontSize: 12.5, cursor: "pointer" }}>➕ Thêm</button>}
        </div>
        {!(items || []).length && <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Danh mục đang trống — chạy SQL 49 và 49b (supabase/) để nạp danh mục từ tài liệu KPI.</div>}
        <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead style={{ position: "sticky", top: 0, background: "#f9fafb" }}><tr style={{ color: "#6b7280" }}><th style={th}>Mã</th><th style={th}>Công việc / sản phẩm</th><th style={th}>Nhóm</th><th style={th}>Điểm</th><th style={th}>Hệ số</th><th style={th}>Phạm vi</th>{canEdit && <th style={th} />}</tr></thead>
            <tbody>{list.map(i => (
              <tr key={i.code} style={{ borderTop: "1px solid #f3f4f6", opacity: i.active === false ? 0.5 : 1 }}>
                <td style={{ ...td, whiteSpace: "nowrap", color: "#6b7280" }}>{i.code}</td>
                <td style={td}>{i.name}{i.output && <div style={{ fontSize: 11, color: "#9ca3af" }}>→ {i.output}</div>}</td>
                <td style={td}>{i.grp}</td><td style={td}>{i.points}</td><td style={{ ...td, fontWeight: 700, color: "#4338ca" }}>{i.coef}</td>
                <td style={{ ...td, fontSize: 11.5 }}>{i.dept ? deptLabel(i.dept) : "Chung"}</td>
                {canEdit && <td style={td}><button onClick={() => setForm({ ...i })} style={{ border: "none", background: "none", cursor: "pointer" }} title="Sửa">✏️</button></td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
