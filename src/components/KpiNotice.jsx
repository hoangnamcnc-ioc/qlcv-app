import { useState } from "react";

// Thông báo MỘT LẦN cho mỗi người (nhớ theo trình duyệt) khi đơn vị chuyển sang cách tính KPI theo khung mới.
// Đổi NOTICE_ID khi có thông báo mới để hiện lại cho mọi người.
export const NOTICE_ID = "kpi-khung-2026-11b"; // b: bổ sung việc ngoài danh mục/đột xuất/khối lượng/phiếu xếp loại
const KEY = "qlcv_notice_seen";
const seen = () => { try { return (localStorage.getItem(KEY) || "").split(",").includes(NOTICE_ID); } catch { return false; } };
const markSeen = () => { try { const a = (localStorage.getItem(KEY) || "").split(",").filter(Boolean); if (!a.includes(NOTICE_ID)) localStorage.setItem(KEY, [...a, NOTICE_ID].join(",")); } catch { /* bỏ qua */ } };

const Item = ({ children }) => <li style={{ marginBottom: 6, lineHeight: 1.5 }}>{children}</li>;

export default function KpiNotice({ role, canCreate, onGo }) {
  const [open, setOpen] = useState(() => !seen());
  if (!open) return null;
  const leader = ["manager", "deputy_manager", "manager_hcth", "admin", "director"].includes(role);
  const close = () => { markSeen(); setOpen(false); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 130, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, maxWidth: 540, width: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", fontWeight: 700, fontSize: 16 }}>📢 Thông báo: Cách tính KPI mới theo khung của đơn vị</div>
        <div style={{ padding: "14px 20px", fontSize: 13.5, color: "#1f2937" }}>
          <p style={{ margin: "0 0 8px" }}>Điểm KPI nay tính theo <b>khung KPI của đơn vị</b>: <b>Tiêu chí chung (tối đa 30 điểm) + 70% × Đánh giá nhiệm vụ</b>. Đánh giá nhiệm vụ gồm <b>số lượng, tiến độ, chất lượng</b> tính trên số lượng <b>quy đổi</b>. Xếp loại: Xuất sắc ≥ 90 · Tốt ≥ 70 · Hoàn thành ≥ 50.</p>
          <div style={{ fontWeight: 600, margin: "10px 0 4px" }}>👤 Với tất cả mọi người</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <Item><b>Chấm tiêu chí chung hằng tháng:</b> vào <i>Quản lý nhân sự → 📝 Tiêu chí chung</i>, tự chấm 3 phần (mỗi phần tối đa 10 điểm). Chưa có điểm này thì KPI chỉ là điểm tạm tính.</Item>
            <Item>Hoàn thành <b>đúng hạn</b>: mỗi ngày chậm trừ 25% giá trị sản phẩm đó.</Item>
            <Item><b>Mọi loại việc đều được tính điểm theo hệ số quy đổi:</b> việc thường, việc định kỳ, việc đột xuất, bước của việc khác/dự án đầu tư và các lượt hỗ trợ người dùng.</Item>
            <Item><b>Phiếu xếp loại chất lượng viên chức</b> (đúng mẫu của đơn vị) tự dựng sẵn ở <i>Quản lý nhân sự → 📄 Phiếu xếp loại</i>: tải Word để chỉnh sửa và ký.</Item>
          </ul>
          {leader && <>
            <div style={{ fontWeight: 600, margin: "12px 0 4px" }}>🧑‍💼 Với Trưởng/Phó phòng và Ban Giám đốc</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {canCreate && <Item><b>Chọn "Sản phẩm chuẩn" khi tạo việc</b> (ô 📚 ngay dưới Tiêu đề) để việc có hệ số quy đổi đúng. Việc không chọn được tính hệ số 1.</Item>}
              {canCreate && <Item><b>Việc chưa có trong danh mục:</b> chọn <b>nhóm N1–N5</b> để có hệ số tạm; Giám đốc sẽ xem xét đưa vào danh mục sản phẩm chuẩn. <b>Việc đột xuất:</b> tick ô "⚡ Việc đột xuất" và ưu tiên chọn nhóm CH.DX.</Item>}
              {canCreate && <Item><b>Mẫu việc định kỳ:</b> gắn "Sản phẩm chuẩn" cho từng mẫu (mỗi lượt tính theo hệ số của sản phẩm) — chiếm phần lớn khối lượng của phòng.</Item>}
              {canCreate && <Item><b>Khối lượng việc:</b> khi giao việc, xem dòng ⚖️ để biết người nhận đang gánh bao nhiêu so với trung vị phòng; báo cáo ở <i>Quản lý nhân sự → ⚖️ Cân bằng khối lượng</i>. Bảng xếp hạng cộng tối đa +5 điểm cho người gánh nhiều hơn trung vị (điểm KPI chính thức không đổi).</Item>}
              <Item><b>Dùng đủ các mức nghiệm thu</b> Xuất sắc / Tốt / Trung bình / Kém theo đúng chất lượng — không chấm "Tốt" cho mọi việc. Mức nghiệm thu chiếm 30% điểm chất lượng.</Item>
              <Item>Sản phẩm chưa đạt: bấm <b>"Từ chối, làm lại"</b> thay vì duyệt. Mỗi lần làm lại trừ 25% giá trị sản phẩm.</Item>
              <Item><b>Chấm tiêu chí chung</b> cho nhân viên trong phòng ở <i>Quản lý nhân sự → 📝 Tiêu chí chung</i> (lượt "Lãnh đạo phòng"; Ban Giám đốc chấm lượt "Lãnh đạo Trung tâm").</Item>
            </ul>
          </>}
          <div style={{ marginTop: 12, padding: "9px 12px", background: "#fffbeb", borderRadius: 8, fontSize: 12.5, color: "#92400e" }}>
            Nếu không thực hiện các bước trên, điểm KPI của mọi người sẽ vẫn rất cao và không phản ánh đúng chất lượng công việc.
          </div>
        </div>
        <div style={{ padding: "12px 20px 16px", display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button onClick={() => { close(); onGo(); }} style={{ padding: "9px 14px", border: "1px solid #c7d2fe", borderRadius: 8, background: "#eef2ff", fontSize: 13, cursor: "pointer" }}>📝 Đi tới chấm tiêu chí chung</button>
          <button onClick={close} style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: "#4f46e5", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Đã hiểu</button>
        </div>
      </div>
    </div>
  );
}
