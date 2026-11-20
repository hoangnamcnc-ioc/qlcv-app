// Giải thích điểm KPI theo khung đơn vị (dùng trong cửa sổ "Vì sao X đ?").
const Line = ({ icon, label, sub, val }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid #f3f4f6", gap: 10 }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{icon} {label}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, color: "#4338ca", whiteSpace: "nowrap" }}>{val}</div>
  </div>
);

export default function KpiBreakdown({ b }) {
  if (!b) return null;
  return (
    <div style={{ padding: "0 0 4px" }}>
      <Line icon="①" label="Số lượng" sub="Số lượng quy đổi hoàn thành ÷ số lượng quy đổi được giao (việc đã đến hạn trong tháng)" val={`${b.qty}%`} />
      <Line icon="②" label="Tiến độ" sub="Mỗi ngày chậm so với hạn trừ 25% giá trị sản phẩm đó" val={`${b.progress}%`} />
      <Line icon="③" label="Chất lượng" sub="Mỗi lần bị yêu cầu làm lại trừ 25% giá trị sản phẩm đó" val={`${b.quality}%`} />
      <Line icon="=" label="Điểm đánh giá nhiệm vụ" sub="Trung bình cộng 3 tỷ lệ trên" val={`${b.evalPct}%`} />
      {b.provisional
        ? <div style={{ margin: "8px 0", fontSize: 11.5, color: "#b45309", background: "#fffbeb", borderRadius: 8, padding: "8px 12px" }}>Chưa có điểm <b>tiêu chí chung</b> của tháng này (chấm ở Quản lý nhân sự → 📝 Tiêu chí chung) nên đây là <b>điểm tạm tính</b> quy từ phần nhiệm vụ về thang 100.</div>
        : <>
          <Line icon="④" label={`Tiêu chí chung (${b.commonFrom === "center" ? "lãnh đạo Trung tâm" : b.commonFrom === "dept" ? "lãnh đạo phòng" : "cá nhân tự chấm"})`} sub="Tối đa 30 điểm" val={`${b.common}/30`} />
          <div style={{ fontSize: 11.5, color: "#6b7280", padding: "6px 0" }}>KPI = {b.common} + {b.evalPct}% × {b.evalWeight} = <b>{Math.round((b.common + b.evalPct * b.evalWeight / 100) * 10) / 10}</b></div>
        </>}
      {b.reqCount > 0 && <div style={{ fontSize: 11, color: "#9ca3af" }}>Duyệt chậm: {b.slowCount}/{b.reqCount} lượt (chỉ để theo dõi, không trừ điểm).</div>}
    </div>
  );
}
