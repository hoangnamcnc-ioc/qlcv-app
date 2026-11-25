import { useState, useEffect } from "react";

// Ô chọn NGÀY / THÁNG bằng tiếng Việt (thay <input type="date|month"> — ô gốc của trình duyệt hiện chữ theo
// ngôn ngữ trình duyệt, vd "October 2026", "mm/dd/yyyy"). Giữ cùng giao diện lập trình: value "YYYY-MM-DD" / "YYYY-MM",
// onChange({ target: { value } }) nên các nơi đang dùng e.target.value không phải sửa.
const pad = n => String(n).padStart(2, "0");
const sel = (style, extra) => ({ ...(style || {}), width: "auto", flex: "1 1 0", minWidth: 0, ...extra });

const yearsAround = (cur, min, max) => {
  const now = new Date().getFullYear();
  const lo = Math.min(min ? Number(String(min).slice(0, 4)) : now - 6, cur || now);
  const hi = Math.max(max ? Number(String(max).slice(0, 4)) : now + 6, cur || now);
  const out = []; for (let y = hi; y >= lo; y--) out.push(y);
  return out;
};
const wrap = style => ({ display: style?.width === "100%" ? "flex" : "inline-flex", gap: 4, width: style?.width === "auto" ? undefined : style?.width, alignItems: "center", verticalAlign: "middle" });

export function ViDate({ value, onChange, min, max, disabled, style, title }) {
  const [p, setP] = useState(() => { const [y, m, d] = (value || "").split("-"); return { y: y || "", m: m ? String(+m) : "", d: d ? String(+d) : "" }; });
  useEffect(() => { const [y, m, d] = (value || "").split("-"); setP({ y: y || "", m: m ? String(+m) : "", d: d ? String(+d) : "" }); }, [value]);
  const set = patch => {
    const n = { ...p, ...patch };
    if (n.y && n.m) { const dim = new Date(+n.y, +n.m, 0).getDate(); if (n.d && +n.d > dim) n.d = String(dim); }
    setP(n);
    if (n.y && n.m && n.d) onChange({ target: { value: `${n.y}-${pad(n.m)}-${pad(n.d)}` } });
    else if (!n.y && !n.m && !n.d) onChange({ target: { value: "" } });
  };
  const dim = p.y && p.m ? new Date(+p.y, +p.m, 0).getDate() : 31;
  return (
    <span style={wrap(style)} title={title}>
      <select disabled={disabled} value={p.d} onChange={e => set({ d: e.target.value })} style={sel(style)}><option value="">Ngày</option>{Array.from({ length: dim }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
      <select disabled={disabled} value={p.m} onChange={e => set({ m: e.target.value })} style={sel(style)}><option value="">Tháng</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}</select>
      <select disabled={disabled} value={p.y} onChange={e => set({ y: e.target.value })} style={sel(style)}><option value="">Năm</option>{yearsAround(+p.y, min, max).map(y => <option key={y} value={y}>{y}</option>)}</select>
    </span>
  );
}

export function ViMonth({ value, onChange, min, max, disabled, style, title }) {
  const [p, setP] = useState(() => { const [y, m] = (value || "").split("-"); return { y: y || "", m: m ? String(+m) : "" }; });
  useEffect(() => { const [y, m] = (value || "").split("-"); setP({ y: y || "", m: m ? String(+m) : "" }); }, [value]);
  const set = patch => {
    const n = { ...p, ...patch }; setP(n);
    if (n.y && n.m) onChange({ target: { value: `${n.y}-${pad(n.m)}` } });
    else if (!n.y && !n.m) onChange({ target: { value: "" } });
  };
  return (
    <span style={wrap(style)} title={title}>
      <select disabled={disabled} value={p.m} onChange={e => set({ m: e.target.value })} style={sel(style)}><option value="">Tháng</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}</select>
      <select disabled={disabled} value={p.y} onChange={e => set({ y: e.target.value })} style={sel(style)}><option value="">Năm</option>{yearsAround(+p.y, min, max).map(y => <option key={y} value={y}>{y}</option>)}</select>
    </span>
  );
}

export default ViDate;
