import { useState, useMemo } from "react";
import { KPI_DEFAULT, KPI_SCHEMA, KPI_GROUPS, kpiCfgFor, normalizeKpiCfg, validateKpiCfg } from "../kpiConfig";
import { staffScore, managerScore } from "../scoring";

const mkItems = (n, status, rating = "tot") => Array.from({ length: n }, () => ({ status, rating, weight: 1 }));
const curMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const fmtYm = s => s.split("-").reverse().join("/");

// Tab "Cấu hình KPI": chỉnh hệ số điểm, áp dụng từ tháng chọn (các tháng trước giữ nguyên). Chỉ Admin/Giám đốc sửa.
export default function KpiConfig({ versions, canEdit, onSave, card, inp }) {
  const [from, setFrom] = useState(curMonth());
  const base = useMemo(() => { const [y, m] = from.split("-").map(Number); return kpiCfgFor(versions, y, m); }, [versions, from]);
  const [draft, setDraft] = useState(null); // null = chưa sửa → hiện hệ số đang áp dụng cho tháng chọn
  const cfg = draft || base;
  const num = c => Object.fromEntries(KPI_SCHEMA.map(f => [f.k, Number(c[f.k])]));
  const errs = validateKpiCfg(num(cfg));
  const changed = KPI_SCHEMA.some(f => Number(cfg[f.k]) !== base[f.k]);
  const [sample, setSample] = useState({ ok: 8, late: 3, over: 2, prio: 2 });
  const sampleItems = [
    ...mkItems(Math.max(0, sample.ok - sample.prio), "completed"),
    ...Array.from({ length: Math.min(sample.prio, sample.ok) }, () => ({ status: "completed", rating: "tot", weight: 1, prio: "high" })),
    ...mkItems(sample.late, "completed_late"), ...mkItems(sample.over, "overdue"),
  ];
  const next = errs.length ? null : normalizeKpiCfg(num(cfg));
  const before = staffScore(sampleItems, base), after = next && staffScore(sampleItems, next);
  const mBefore = managerScore(sampleItems, 1, null, base), mAfter = next && managerScore(sampleItems, 1, null, next);
  const nBox = { width: 64, padding: "5px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, textAlign: "right" };
  const hist = [...(versions || [])].reverse();
  const canSave = canEdit && !errs.length && changed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
          Chỉnh các <b>hệ số</b> của công thức điểm hiệu suất. Mỗi lần lưu có <b>"áp dụng từ tháng"</b>: các tháng trước đó giữ nguyên hệ số cũ nên điểm đã chốt không bị đổi.
        </div>
        <label style={{ fontSize: 12.5, color: "#374151" }}>Áp dụng từ tháng:{" "}
          <input type="month" value={from} disabled={!canEdit} onChange={e => { if (e.target.value) { setFrom(e.target.value); setDraft(null); } }} style={{ ...inp, width: 160, display: "inline-block" }} />
        </label>
        {Object.entries(KPI_GROUPS).map(([g, title]) => (
          <div key={g} style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#4338ca", marginBottom: 6 }}>{title}</div>
            {KPI_SCHEMA.filter(f => f.g === g).map(f => (
              <div key={f.k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13 }}>{f.label}</div>
                  {f.hint && <div style={{ fontSize: 11, color: "#9ca3af" }}>{f.hint}</div>}
                </div>
                <input type="number" min={f.min} max={f.max} step={f.step} value={cfg[f.k]} disabled={!canEdit}
                  onChange={e => setDraft({ ...cfg, [f.k]: e.target.value })} style={{ ...nBox, borderColor: Number(cfg[f.k]) !== KPI_DEFAULT[f.k] ? "#6366f1" : "#d1d5db" }} />
                <span style={{ fontSize: 11, color: "#9ca3af", width: 74 }}>mặc định {KPI_DEFAULT[f.k]}</span>
              </div>
            ))}
          </div>
        ))}
        {errs.length > 0 && <div style={{ marginTop: 10, fontSize: 12.5, color: "#b91c1c" }}>{errs.map((e, i) => <div key={i}>⚠ {e}</div>)}</div>}
        {canEdit ? (
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button disabled={!canSave} onClick={async () => { await onSave(from, next); setDraft(null); }}
              style={{ padding: "9px 16px", border: "none", borderRadius: 8, background: canSave ? "#4f46e5" : "#c7d2fe", color: "#fff", fontWeight: 600, fontSize: 13, cursor: canSave ? "pointer" : "default" }}>
              💾 Lưu, áp dụng từ {fmtYm(from)}
            </button>
            <button onClick={() => setDraft({ ...KPI_DEFAULT })} style={{ padding: "9px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f9fafb", fontSize: 13, cursor: "pointer" }}>↺ Khôi phục mặc định</button>
            {draft && <button onClick={() => setDraft(null)} style={{ padding: "9px 14px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer" }}>Bỏ thay đổi</button>}
          </div>
        ) : <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>Chỉ Admin/Giám đốc được thay đổi.</div>}
      </div>

      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🧪 Xem thử điểm (không lưu gì)</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12.5, alignItems: "center" }}>
          {[["ok", "Đúng hạn"], ["late", "Hoàn thành trễ"], ["over", "Quá hạn"], ["prio", "Trong đó ưu tiên cao"]].map(([k, l]) => (
            <label key={k}>{l}: <input type="number" min={0} max={60} value={sample[k]} onChange={e => setSample(s => ({ ...s, [k]: Math.max(0, Math.min(60, Number(e.target.value) || 0)) }))} style={{ ...nBox, width: 52 }} /></label>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 13 }}>
          Nhân viên: <b>{before.perfScore}</b> điểm → <b style={{ color: after && after.perfScore !== before.perfScore ? "#4338ca" : "inherit" }}>{after ? after.perfScore : "—"}</b>
          {"  ·  "}Trưởng/Phó phòng (phòng 1 người): <b>{mBefore.perfScore}</b> → <b>{mAfter ? mAfter.perfScore : "—"}</b>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Việc chất lượng "Tốt". Trái = hệ số đang áp dụng cho tháng đã chọn, phải = hệ số anh đang nhập.</div>
      </div>

      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🕘 Lịch sử thay đổi</div>
        {!hist.length && <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Chưa có thay đổi — đang dùng hệ số mặc định cho mọi tháng.</div>}
        {hist.map(v => {
          const diff = KPI_SCHEMA.filter(f => v.cfg?.[f.k] !== undefined && Number(v.cfg[f.k]) !== KPI_DEFAULT[f.k]).map(f => `${f.label}: ${v.cfg[f.k]}`);
          return (
            <div key={v.from} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12.5 }}>
              <b>Từ {fmtYm(v.from)}</b> <span style={{ color: "#9ca3af" }}>· {v.by || "?"} · {v.at ? new Date(v.at).toLocaleString("vi-VN") : ""}</span>
              <div style={{ color: "#6b7280", fontSize: 11.5 }}>{diff.length ? "Khác mặc định: " + diff.join("; ") : "= mặc định"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
