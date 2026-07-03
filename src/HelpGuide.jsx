import React, { useState, useMemo } from "react";

// ───── Nội dung hướng dẫn sử dụng ─────
const SECTIONS = [
  {
    icon: "📘", title: "1. Giới thiệu chung & vai trò",
    body: [
      { p: "Phần mềm Quản lý Giao việc (QLCV) giúp Trung tâm IOC theo dõi, phân công và đánh giá công việc của 3 phòng: HCTH, QL-KTDL, HT-NTS. Dùng được trên máy tính và điện thoại." },
      { table: {
        head: ["Vai trò", "Quyền hạn chính"],
        rows: [
          ["Quản trị viên (admin)", "Toàn quyền: mọi phòng ban, tài khoản, bảo mật"],
          ["Ban Giám đốc (director)", "Xem/duyệt toàn bộ đơn vị, không giới hạn phòng ban"],
          ["TP. HCTH (manager_hcth)", "Như Trưởng phòng + xem toàn đơn vị"],
          ["Trưởng phòng (manager)", "Giao việc, duyệt hoàn thành, đánh giá trong phòng mình"],
          ["Phó trưởng phòng (deputy_manager)", "Tương tự Trưởng phòng, trong phòng mình"],
          ["Nhân viên (staff)", "Xem việc được giao, cập nhật tiến độ, yêu cầu duyệt hoàn thành"],
        ]}},
      { note: "Trưởng phòng/Phó trưởng phòng chỉ thao tác trong phạm vi phòng ban của mình. Ban Giám đốc và Quản trị viên thao tác trên toàn bộ 3 phòng." },
    ]
  },
  {
    icon: "🔑", title: "2. Đăng nhập & bảo mật tài khoản",
    body: [
      { h: "Đăng nhập" },
      { ol: ["Truy cập địa chỉ web phần mềm (do quản trị viên cung cấp).", "Nhập Tên đăng nhập và Mật khẩu.", "Bấm Đăng nhập."] },
      { p: "Sau khi đăng nhập, nếu có việc đang trễ hạn, việc chưa xem hoặc bước chờ duyệt, hệ thống hiện popup nhắc nhở ngay — bấm vào từng việc trong popup để mở xem chi tiết." },
      { note: "Trạng thái \"Đã xem/Chưa xem\" của việc được giao lưu trên máy chủ (không phải trên trình duyệt), nên đăng nhập ở thiết bị khác vẫn thấy đúng việc nào bạn đã mở xem." },
      { h: "Đổi mật khẩu" },
      { p: "Bấm biểu tượng 🔑 (góc trên) → nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 6 ký tự)." },
      { h: "Quên mật khẩu" },
      { p: "Liên hệ Quản trị viên để được đặt lại mật khẩu về mặc định (abc123), sau đó tự đổi lại." },
    ]
  },
  {
    icon: "🖥️", title: "3. Giao diện chung",
    body: [
      { p: "Máy tính: menu dọc bên trái. Điện thoại: menu ngang cố định ở đáy màn hình, luôn hiển thị khi cuộn." },
      { table: {
        head: ["Biểu tượng", "Chức năng"],
        rows: [
          ["🌙 / ☀️", "Chuyển đổi giao diện Tối / Sáng"],
          ["Aa", "Phóng to/thu nhỏ cỡ chữ (80%–140%)"],
          ["🔔", "Thông báo: việc mới, trễ hạn, cần đánh giá, chờ duyệt hoàn thành"],
          ["📤 Xuất CSV", "Xuất danh sách nhiệm vụ (dành cho vai trò quản lý)"],
          ["🔑 / ⏏", "Đổi mật khẩu / Đăng xuất"],
        ]}},
    ]
  },
  {
    icon: "📊", title: "4. Tổng quan (Dashboard)",
    body: [
      { ul: [
        "Tổng hợp điều hành theo phòng ban: tỷ lệ hoàn thành, số việc quá hạn, cảnh báo quá tải.",
        "Thẻ thống kê nhanh — bấm vào từng thẻ để lọc danh sách chi tiết bên dưới.",
        "Biểu đồ theo phòng ban và Tỷ lệ trạng thái.",
        "Cảnh báo quá tải: nhân viên có số việc active vượt ngưỡng cho phép.",
        "Nhiệm vụ định kỳ và Việc của tôi / tiến bộ 6 tháng gần nhất.",
      ]},
    ]
  },
  {
    icon: "📋", title: "5. Nhiệm vụ",
    body: [
      { h: "Tạo nhiệm vụ mới" },
      { p: "Bấm + Tạo việc, điền: Tiêu đề/Mô tả, Phòng ban, Giao cho, Ưu tiên, Hạn chót, Phối hợp (người hỗ trợ), file đính kèm hoặc link tài liệu." },
      { h: "Tìm kiếm & lọc" },
      { p: "Ô tìm kiếm theo tên việc/mô tả/người thực hiện/số văn bản, cùng bộ lọc Trạng thái, Phòng ban, Nhân viên, Sắp xếp." },
      { h: "Cập nhật tiến độ" },
      { p: "Bấm vào thanh % tiến độ (hoặc nút % TĐ) để chọn nhanh mức 0–100%." },
      { h: "⭐ Quy trình hoàn thành — Yêu cầu duyệt" },
      { note: "Nhân viên KHÔNG tự đánh dấu hoàn thành được nữa. Mọi việc hoàn thành phải qua bước duyệt của cấp quản lý.", color: "1D4ED8", bg: "#EFF6FF" },
      { ol: [
        "Người thực hiện bấm 📨 Yêu cầu hoàn thành, mô tả kết quả (≥20 ký tự), Gửi yêu cầu duyệt.",
        "Nhiệm vụ chuyển sang trạng thái ⏳ Chờ duyệt.",
        "Trưởng/Phó phòng (đúng phòng ban) hoặc Ban Giám đốc thấy yêu cầu (danh sách, modal chi tiết, thông báo 🔔).",
        "Người duyệt bấm ✅ Duyệt & đánh giá: chọn mức (🏆 Xuất sắc/🌟 Tốt/⚡ Trung bình/❌ Kém), ghi nhận xét, xác nhận.",
        "Nhiệm vụ chuyển trạng thái Hoàn thành (đã đánh giá).",
      ]},
      { p: "Có thể ↩ Từ chối để trả về trạng thái đang thực hiện nếu kết quả chưa đạt." },
      { note: "Nếu nhiệm vụ đã quá hạn, phải khai báo nguyên nhân trễ hạn trước khi gửi yêu cầu duyệt." },
      { h: "Chuyển tiếp & Xóa" },
      { p: "Trưởng/Phó phòng (kể cả TP.HCTH) có thể ↪ Chuyển tiếp nhiệm vụ cho người khác trong phòng mình. Nhiệm vụ xóa sẽ vào Thùng rác, có thể khôi phục hoặc xóa vĩnh viễn." },
      { h: "Trạng thái Đã xem / Chưa xem" },
      { p: "BGĐ, Trưởng phòng, Phó phòng thấy biểu tượng 👁️ Đã xem hoặc 🔴 Chưa xem cạnh tên người được giao — biết ngay nhân viên đã mở xem việc hay chưa, kể cả khi họ đăng nhập từ thiết bị khác." },
      { h: "Cảnh báo duyệt chậm" },
      { p: "Nếu 1 yêu cầu duyệt hoàn thành bị treo từ 2 ngày trở lên chưa được xử lý, danh sách hiển thị badge ⏳ Chờ duyệt N ngày để BGĐ/Trưởng phòng biết ai đang duyệt chậm." },
    ]
  },
  {
    icon: "💰", title: "6. Nhiệm vụ ngân sách",
    body: [
      { p: "Quản lý dự án/gói việc liên quan ngân sách, đầu tư, mua sắm, sửa chữa theo từng bước quy trình." },
      { h: "3 nhóm phân loại" },
      { p: "Trang chia thành 3 tab, mỗi dự án thuộc đúng 1 nhóm (chọn ở trường Phân loại khi tạo/sửa dự án):" },
      { ul: [
        "🗂️ Chi Hoạt Động",
        "🛒 Chi Mua Sắm",
        "🔧 Chi Bảo Dưỡng Sửa Chữa TSC",
      ]},
      { note: "Chuyển 1 dự án sang tab khác: mở dự án → ✏️ Sửa dự án → đổi lại ô Phân loại → Lưu." },
      { h: "Tạo dự án" },
      { ul: [
        "Tên dự án, Phân loại, Lãnh đạo phụ trách, Nguồn vốn, Tổng mức đầu tư/Đã chi.",
        "Chọn mẫu quy trình có sẵn (Đầu tư công, 03 báo giá, Chỉ định thầu, Chào hàng cạnh tranh, Đấu thầu rộng rãi, Nghiệm thu–thanh toán…) hoặc tự tạo bước.",
        "Gán Phụ trách chính và Thành viên dự án.",
      ]},
      { h: "Yêu cầu hoàn thành bước — Duyệt" },
      { ol: [
        "Người chủ trì bước bấm 📨 Yêu cầu hoàn thành.",
        "Bước chuyển Chờ duyệt.",
        "Ban Giám đốc hoặc Trưởng/Phó phòng đúng đơn vị dự án (không phải người chủ trì) bấm ✅ Duyệt & đánh giá, chọn mức chất lượng (★ Đạt/★★ Tốt/★★★ Xuất sắc).",
        "Bước chuyển Hoàn thành (đã đánh giá), hiển thị người duyệt và ngày duyệt.",
      ]},
      { note: "Mỗi bước đã duyệt tính là 1 việc hoàn thành cho người chủ trì bước đó trong Báo cáo hiệu suất — không cần chờ cả dự án xong mới được cộng điểm." },
      { h: "Nghiệm thu tổng thể" },
      { p: "Khi tất cả bước hoàn thành, Ban Giám đốc thấy banner 📋 Nghiệm thu để đánh giá tổng thể: 1–5 sao, đúng tiến độ/trong ngân sách, nhận xét kết luận. Phụ trách chính được cộng thêm 1 việc riêng vào tháng nghiệm thu." },
    ]
  },
  {
    icon: "🎧", title: "7. Hỗ trợ người dùng/PAHT và vận hành DC",
    body: [
      { p: "Ghi nhanh từng trường hợp hỗ trợ/xử lý sự cố — không qua bước duyệt, vì bản chất đã xử lý xong ngay khi ghi nhận." },
      { h: "2 tab" },
      { ul: [
        "🎧 Hỗ trợ người dùng và xử lý PAHT — kênh: Điện thoại, Zalo, Email, Tiếp nhận qua HT PAHT. Người xử lý: nhân viên phòng HT-NTS và QL-KTDL.",
        "🖧 Xử lý lỗi Trung tâm dữ liệu — kênh: Điện thoại, Zalo. Người xử lý: chỉ nhân viên phòng HT-NTS.",
      ]},
      { h: "Ghi nhận 1 trường hợp" },
      { p: "Bấm + Ghi nhận, điền: Kênh tiếp nhận, Nội dung hỗ trợ/Mô tả lỗi, Kết quả giải quyết (bắt buộc), Người xử lý, Độ khó, Ngày xử lý." },
      { note: "Kết quả giải quyết là bắt buộc — nếu thiếu, danh sách sẽ hiện cảnh báo \"⚠️ Thiếu nội dung kết quả giải quyết\" để dễ rà soát bổ sung." },
      { h: "Tính điểm hiệu suất theo độ khó" },
      { ul: [
        "🔴 Khó = 1 việc",
        "🟡 Trung bình = 1/2 việc",
        "🟢 Nhanh = 1/4 việc",
      ]},
      { note: "Mỗi trường hợp cộng thẳng vào điểm hiệu suất tháng của người xử lý theo trọng số trên, tính vào tháng theo Ngày xử lý. Cần tải lại trang (F5) sau khi ghi nhận để mục Báo cáo cập nhật điểm mới." },
      { p: "Có thể sửa ✏️ hoặc xóa 🗑️ một trường hợp — người xử lý tự sửa/xóa được trường hợp của mình, BGĐ/Trưởng/Phó phòng sửa/xóa được mọi trường hợp." },
    ]
  },
  {
    icon: "📌", title: "8. Nhiệm vụ khác",
    body: [
      { p: "Dành cho nhiệm vụ theo tổ công tác, thành viên từ nhiều phòng ban, không thuộc luồng ngân sách." },
      { ul: [
        "Tên nhiệm vụ, Nội dung.",
        "Chọn thành viên thực hiện từ toàn bộ nhân viên, gán vai trò: ⭐ Tổ trưởng (1 người), 🔹 Tổ phó (1 người), 👤 Thành viên (nhiều người).",
        "Thêm Trình tự các bước: nội dung, hạn hoàn thành, chủ trì, phối hợp (chỉ trong số thành viên đã thêm).",
      ]},
      { p: "Yêu cầu/duyệt tương tự Nhiệm vụ ngân sách: người chủ trì yêu cầu → Tổ trưởng/Tổ phó của tổ đó duyệt & đánh giá → Hoàn thành (đã đánh giá)." },
    ]
  },
  {
    icon: "🗓️", title: "9. Lịch trực",
    body: [
      { ul: [
        "📅 Nhiệm vụ: xem việc theo ngày dạng lịch tháng, bấm 1 ngày để xem chi tiết.",
        "🗓️ Trực: xếp lịch trực (ca trực, người trực) theo ngày/tuần cho các phòng ban.",
      ]},
    ]
  },
  {
    icon: "📁", title: "10. Văn bản",
    body: [
      { p: "Quản lý văn bản đến/đi: số văn bản, trích yếu, nơi gửi/nhận, ngày văn bản, file đính kèm." },
      { ul: [
        "Tìm kiếm theo số văn bản, trích yếu, nơi gửi.",
        "Lọc theo loại: Văn bản đến / Văn bản đi.",
        "Có thể liên kết văn bản với một nhiệm vụ, hoặc tạo nhiệm vụ mới trực tiếp từ văn bản.",
      ]},
    ]
  },
  {
    icon: "📈", title: "11. Báo cáo",
    body: [
      { h: "Hiệu suất nhân viên & Bảng xếp hạng" },
      { p: "Điểm hiệu suất (0–100) gồm:" },
      { ul: [
        "Điểm thời hạn (tối đa 60đ): tỷ lệ việc đúng hạn/trễ hạn trong số việc đã đến hạn xử lý.",
        "Điểm chất lượng (tối đa 40đ): dựa trên mức đánh giá của các việc đã duyệt hoàn thành.",
        "Phạt trễ & quá hạn: trừ 2 điểm mỗi việc trễ/quá hạn.",
        "Thưởng khối lượng: +1đ mỗi việc vượt mốc 5 việc/tháng, tối đa +10.",
        "Thưởng phối hợp: cộng thêm khi hỗ trợ hoàn thành việc của người khác.",
      ]},
      { p: "Chỉ nhân viên có từ 5 việc trở lên trong tháng mới được tính điểm." },
      { note: "Việc \"trễ hạn\" được tính theo lúc bạn bấm Yêu cầu hoàn thành, không phải lúc người duyệt bấm duyệt — nếu bạn yêu cầu duyệt đúng hạn thì dù người duyệt xử lý chậm bao lâu, bạn vẫn không bị tính trễ." },
      { p: "Nhiệm vụ ngân sách cũng được cộng vào điểm hiệu suất: mỗi bước dự án đã duyệt+chấm chất lượng tính là 1 việc cho người chủ trì bước; khi cả dự án được BGĐ nghiệm thu (1–5 sao), phụ trách chính được cộng thêm 1 việc riêng." },
      { note: "Bấm ℹ️ cạnh điểm số để xem chi tiết \"Vì sao điểm này?\"." },
      { p: "Xuất báo cáo ra PDF (để in) hoặc CSV (Excel)." },
    ]
  },
  {
    icon: "👥", title: "12. Nhân viên",
    body: [
      { p: "Danh sách nhân viên theo phòng ban, số việc đang xử lý, số việc phối hợp. Thêm/sửa: họ tên, phòng ban, chức vụ." },
    ]
  },
  {
    icon: "💡", title: "13. Góp ý",
    body: [{ p: "Nơi gửi phản hồi, đề xuất cải tiến phần mềm hoặc quy trình làm việc trực tiếp trong ứng dụng." }]
  },
  {
    icon: "📜", title: "14. Nhật ký",
    body: [{ p: "Chỉ hiển thị với Ban Giám đốc/Quản trị viên/TP.HCTH. Ghi lại lịch sử thao tác trên các nhiệm vụ." }]
  },
  {
    icon: "🔐", title: "15. Bảo mật",
    body: [{ p: "Chỉ hiển thị với Quản trị viên. Theo dõi lịch sử đăng nhập thành công/thất bại của toàn bộ tài khoản." }]
  },
  {
    icon: "📑", title: "16. Bảng phân quyền tổng hợp",
    body: [{ table: {
      head: ["Chức năng", "Nhân viên", "Trưởng/Phó phòng", "TP.HCTH/BGĐ/Admin"],
      rows: [
        ["Xem việc của mình", "✅", "✅", "✅"],
        ["Xem việc cả phòng ban", "❌", "✅ (phòng mình)", "✅ (toàn đơn vị)"],
        ["Tạo/giao nhiệm vụ", "❌", "✅", "✅"],
        ["Yêu cầu hoàn thành việc", "✅", "✅", "✅"],
        ["Duyệt hoàn thành & đánh giá", "❌", "✅ (phòng mình)", "✅"],
        ["Chuyển tiếp nhiệm vụ", "❌", "✅", "✅"],
        ["Xóa nhiệm vụ", "❌", "✅ (phòng mình)", "✅"],
        ["Quản lý tài khoản", "❌", "❌", "✅ (Admin)"],
        ["Xem Nhật ký / Bảo mật", "❌", "❌", "✅"],
      ]
    }}]
  },
  {
    icon: "❓", title: "17. Mẹo sử dụng & Câu hỏi thường gặp",
    body: [
      { h: "Sử dụng trên điện thoại" },
      { ul: ["Menu chính cố định ở đáy màn hình, luôn hiển thị khi cuộn.", "Bấm Aa trên thanh tiêu đề để chỉnh cỡ chữ phù hợp."] },
      { h: "Vì sao tôi không hoàn thành được nhiệm vụ ngay?" },
      { p: "Mọi nhiệm vụ hoàn thành đều cần Trưởng/Phó phòng hoặc Ban Giám đốc duyệt và đánh giá chất lượng, đảm bảo minh bạch trong đánh giá hiệu suất." },
      { h: "Vì sao điểm hiệu suất của tôi trống hoặc thấp?" },
      { ul: [
        "Cần từ 5 việc trở lên trong tháng mới đủ điều kiện tính điểm.",
        "Điểm chỉ tính trên việc đã đến hạn xử lý — việc đang chờ duyệt hoặc chưa tới hạn chưa được tính vào tháng đó.",
        "Nếu chỉ làm ít nhiệm vụ thường, hãy để ý các bước bạn chủ trì trong Nhiệm vụ ngân sách đã được duyệt+chấm chất lượng hay chưa — mỗi bước cũng tính là 1 việc, giúp bạn dễ đạt mốc 5 việc/tháng hơn.",
        "Các trường hợp đã ghi nhận ở mục Hỗ trợ người dùng/PAHT và vận hành DC cũng cộng điểm theo độ khó (Khó=1, Trung bình=1/2, Nhanh=1/4 việc) — nhớ tải lại trang sau khi ghi nhận để điểm cập nhật.",
      ]},
      { h: "Cần hỗ trợ thêm?" },
      { p: "Liên hệ Quản trị viên hệ thống hoặc gửi phản hồi qua mục Góp ý." },
    ]
  },
];

function Block({ b }) {
  if (b.h) return <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1e1b4b", marginTop: 12, marginBottom: 4 }}>{b.h}</div>;
  if (b.p) return <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6, marginBottom: 8 }}>{b.p}</div>;
  if (b.note) return (
    <div style={{ margin: "8px 0 12px", padding: "8px 12px", background: b.bg || "#fffbeb", borderLeft: "3px solid " + (b.color || "#92400e"), borderRadius: 6, fontSize: 13, color: b.color || "#92400e", fontStyle: "italic" }}>
      💡 {b.note}
    </div>
  );
  if (b.ul) return (
    <ul style={{ margin: "0 0 10px", paddingLeft: 20 }}>
      {b.ul.map((li, i) => <li key={i} style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6, marginBottom: 3 }}>{li}</li>)}
    </ul>
  );
  if (b.ol) return (
    <ol style={{ margin: "0 0 10px", paddingLeft: 20 }}>
      {b.ol.map((li, i) => <li key={i} style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6, marginBottom: 4 }}>{li}</li>)}
    </ol>
  );
  if (b.table) return (
    <div style={{ overflowX: "auto", margin: "8px 0 14px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 480 }}>
        <thead><tr style={{ background: "#1e1b4b" }}>{b.table.head.map((h, i) => <th key={i} style={{ padding: "7px 10px", textAlign: "left", color: "#fff", fontWeight: 600 }}>{h}</th>)}</tr></thead>
        <tbody>{b.table.rows.map((r, ri) => (
          <tr key={ri} style={{ background: ri % 2 ? "#f8fafc" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
            {r.map((c, ci) => <td key={ci} style={{ padding: "7px 10px", color: "#374151" }}>{c}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
  return null;
}

export default function HelpGuide({ isMobile }) {
  const [open, setOpen] = useState(() => new Set([0]));
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return SECTIONS.map((s, i) => ({ ...s, i }));
    const query = q.toLowerCase();
    return SECTIONS.map((s, i) => ({ ...s, i })).filter(s =>
      s.title.toLowerCase().includes(query) ||
      JSON.stringify(s.body).toLowerCase().includes(query)
    );
  }, [q]);

  const toggle = i => setOpen(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", borderRadius: 12, padding: isMobile ? "16px" : "20px 24px", color: "#fff" }}>
        <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, marginBottom: 4 }}>📘 Hướng dẫn sử dụng QLCV</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>Hệ thống Quản lý Giao việc — Trung tâm Giám sát, Điều hành Đô thị thông minh tỉnh Đắk Lắk</div>
      </div>

      <input
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="🔍 Tìm nhanh trong hướng dẫn (VD: yêu cầu hoàn thành, đánh giá, phân quyền...)"
        style={{ padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 13.5, width: "100%", boxSizing: "border-box" }}
      />

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 30, fontSize: 13 }}>Không tìm thấy nội dung phù hợp</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(s => {
          const isOpen = open.has(s.i);
          return (
            <div key={s.i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <button onClick={() => toggle(s.i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: isOpen ? "#f5f3ff" : "#fff", border: "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, color: "#1e1b4b" }}><span>{s.icon}</span>{s.title}</span>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>{isOpen ? "▲ Thu gọn" : "▼ Xem"}</span>
              </button>
              {isOpen && <div style={{ padding: "6px 16px 16px", borderTop: "1px solid #f3f4f6" }}>{s.body.map((b, bi) => <Block key={bi} b={b} />)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
