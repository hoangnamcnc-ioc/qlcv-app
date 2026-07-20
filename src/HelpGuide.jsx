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
    icon: "🗂️", title: "2. Việc chờ tôi xử lý",
    body: [
      { p: "Màn hình tổng hợp MỌI thứ đang cần chính bạn ra tay — gộp từ cả 3 module (Nhiệm vụ, Nhiệm vụ khác, Nhiệm vụ ngân sách) vào 1 chỗ duy nhất, thay vì phải đi tìm rải rác ở nhiều nơi khi \"dọn bàn\" cuối tuần." },
      { p: "Bấm mục 🗂️ Việc chờ xử lý ở menu chính (có số đỏ báo tổng số việc đang chờ). Các nhóm hiển thị:" },
      { ul: [
        "📨 Chờ duyệt hoàn thành nhiệm vụ",
        "📅 Chờ duyệt gia hạn nhiệm vụ",
        "⭐ Nhiệm vụ chưa đánh giá",
        "💬 Bình luận mới chưa xem",
        "📨 Bước \"Nhiệm vụ khác\" chờ duyệt",
        "📋 Bước dự án (Nhiệm vụ ngân sách) chờ duyệt hoàn thành",
        "📅 Gia hạn dự án / gia hạn bước dự án chờ duyệt",
      ]},
      { note: "Bấm vào từng mục để mở thẳng đúng chỗ cần xử lý. Xử lý xong (duyệt/từ chối/đánh giá/xem bình luận), mục đó tự biến mất khỏi danh sách — không cần tải lại trang." },
    ]
  },
  {
    icon: "🔑", title: "3. Đăng nhập & bảo mật tài khoản",
    body: [
      { h: "Đăng nhập" },
      { ol: ["Truy cập địa chỉ web phần mềm (do quản trị viên cung cấp).", "Nhập Tên đăng nhập và Mật khẩu.", "Bấm Đăng nhập."] },
      { p: "Sau khi đăng nhập, nếu có việc đang trễ hạn, việc chưa xem hoặc bước chờ duyệt, hệ thống hiện popup nhắc nhở ngay — bấm vào từng việc trong popup để mở xem chi tiết." },
      { note: "Trạng thái \"Đã xem/Chưa xem\" của việc được giao lưu trên máy chủ (không phải trên trình duyệt), nên đăng nhập ở thiết bị khác vẫn thấy đúng việc nào bạn đã mở xem." },
      { h: "Đổi mật khẩu" },
      { p: "Bấm biểu tượng 🔑 (góc trên) → nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 6 ký tự)." },
      { h: "Quên mật khẩu" },
      { p: "Liên hệ Quản trị viên để được đặt lại mật khẩu về mặc định (abc123), sau đó tự đổi lại." },
      { h: "Tự động đăng xuất khi không thao tác" },
      { p: "Để bảo mật, nếu không thao tác gì (click, gõ phím, chạm, cuộn) trong 28 phút, hệ thống hiện popup cảnh báo đếm ngược 2 phút. Bấm \"Tiếp tục làm việc\" để ở lại phiên đăng nhập; nếu không phản hồi, hệ thống tự đăng xuất." },
    ]
  },
  {
    icon: "🖥️", title: "4. Giao diện chung",
    body: [
      { p: "Máy tính: menu dọc bên trái. Điện thoại: menu ngang cố định ở đáy màn hình, luôn hiển thị khi cuộn." },
      { h: "Mục 💼 Công việc" },
      { p: "Gom 4 mục liên quan công việc vào 1 chỗ để menu gọn hơn — bấm \"💼 Công việc\" sẽ mở thêm các tab con:" },
      { ul: [
        "📋 Nhiệm vụ",
        "💰 Nhiệm vụ ngân sách",
        "📌 Nhiệm vụ khác",
        "🎧 Hỗ trợ người dùng/PAHT và vận hành DC",
        "🔄 Nhiệm vụ định kỳ (mở bảng quản lý mẫu định kỳ)",
      ]},
      { note: "Máy tính: tab con hiện thụt lề ngay dưới \"Công việc\" trong menu trái. Điện thoại: hiện thành dải nút tròn ngay dưới thanh tiêu đề." },
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
    icon: "📊", title: "5. Tổng quan (Dashboard)",
    body: [
      { ul: [
        "Tổng hợp điều hành theo phòng ban: tỷ lệ hoàn thành, số việc quá hạn, cảnh báo quá tải.",
        "Thẻ thống kê nhanh — bấm vào từng thẻ để lọc danh sách chi tiết bên dưới.",
        "Biểu đồ theo phòng ban và Tỷ lệ trạng thái.",
        "Cảnh báo quá tải: nhân viên có số việc active vượt ngưỡng cho phép.",
        "Nhiệm vụ định kỳ và Việc của tôi / tiến bộ 6 tháng gần nhất.",
      ]},
      { h: "Đọc đúng cột \"Quy đổi\" và \"Quy đổi/người\"" },
      { p: "Cột Tổng việc chỉ ĐẾM số đầu việc (mỗi nhiệm vụ = 1), nên phòng có nhiều nhiệm vụ hàng ngày sẽ trông \"nhiều việc\" hơn thực tế. Hai cột bên cạnh cho biết khối lượng thực:" },
      { ul: [
        "Quy đổi — tổng số việc sau khi nhân trọng số nhiệm vụ định kỳ (hàng ngày 0.25 · tuần 1 · 2 tuần 1.5 · tháng 2.5 · quý/6 tháng/năm 3 · nhiệm vụ thường 1). Dùng cột này khi so sánh tải giữa các phòng.",
        "Quy đổi/người — lấy Quy đổi chia cho số nhân sự của phòng. Dùng khi các phòng chênh lệch quân số, để biết ai đang gánh nặng nhất trên đầu người.",
      ]},
      { p: "Mỗi thẻ thống kê nhanh cũng hiện thêm dòng \"≈ … quy đổi\" ngay dưới con số." },
      { note: "Bảng Tổng hợp điều hành chỉ tính NHIỆM VỤ (không gồm Hỗ trợ ND/Xử lý lỗi TTDL và dự án ngân sách), gom theo phòng của nhiệm vụ và trên TOÀN BỘ thời gian. Vì vậy nó không trùng với cột \"Tổng\" ở bảng Hiệu suất nhân viên (bảng đó tính theo từng tháng và có cộng thêm việc phối hợp) — đừng cộng dồn hai bảng để đối chiếu." },
    ]
  },
  {
    icon: "📋", title: "6. Nhiệm vụ",
    body: [
      { h: "Tạo nhiệm vụ mới" },
      { p: "Bấm + Tạo việc, điền: Tiêu đề/Mô tả, Phòng ban, Giao cho, Ưu tiên, Hạn chót, Phối hợp (người hỗ trợ), file đính kèm hoặc link tài liệu." },
      { h: "Tìm kiếm & lọc" },
      { p: "Ô tìm kiếm theo tên việc/mô tả/người thực hiện/số văn bản, cùng bộ lọc Trạng thái, Phòng ban, Nhân viên, Sắp xếp." },
      { note: "Nút 👤 Tôi giao (Trưởng/Phó phòng, TP.HCTH, BGĐ, Admin mới thấy) lọc riêng những việc CHÍNH bạn đã giao (tạo hoặc chuyển tiếp) — giúp theo dõi riêng phần việc mình phải chịu trách nhiệm duyệt, không lẫn với việc của người khác trong phòng." },
      { p: "Mỗi thẻ/dòng nhiệm vụ hiện thêm 📤 tên người giao việc (người tạo hoặc người chuyển tiếp gần nhất), giúp biết ngay ai là người cần liên hệ khi cần duyệt/hỏi thêm." },
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
      { h: "📅 Đề xuất & duyệt gia hạn deadline" },
      { note: "Chỉ người giao việc (người tạo/chuyển tiếp gần nhất) hoặc Admin/BGĐ mới đổi Hạn chót trực tiếp được. Trưởng/Phó phòng khác trong phòng ban KHÔNG còn tự ý đổi hạn của nhiệm vụ không phải do mình giao." },
      { ol: [
        "Người được giao bấm 📅 Đề xuất gia hạn trong modal chi tiết, chọn ngày muốn gia hạn tới + nêu lý do.",
        "Người giao việc thấy đề xuất, bấm ✅ Duyệt gia hạn (chọn đúng ngày đề xuất hoặc ngắn hơn — nếu ngắn hơn phải nêu rõ lý do) hoặc ✖ Từ chối (phải nêu lý do).",
        "Duyệt xong, Hạn chót của nhiệm vụ cập nhật ngay theo ngày đã duyệt.",
      ]},
      { h: "🔁 Bàn giao hàng loạt" },
      { p: "Khi 1 nhân viên nghỉ phép dài/nghỉ việc: vào 💼 Công việc → 🔁 Bàn giao hàng loạt, chọn nhân viên cần bàn giao, tick các việc muốn chuyển (mặc định chọn hết), chọn người nhận rồi xác nhận — chuyển 1 lần thay vì phải mở từng nhiệm vụ để ↪ Chuyển tiếp." },
      { h: "💬 Bình luận mới chưa xem" },
      { p: "Nếu có bình luận mới trong nhiệm vụ bạn đang giao/thực hiện/phối hợp mà bạn chưa mở xem, hệ thống báo ở chuông 🔔 và mục 🗂️ Việc chờ xử lý. Bấm vào để mở và tự động đánh dấu đã xem." },
    ]
  },
  {
    icon: "💰", title: "7. Nhiệm vụ ngân sách",
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
      { note: "Điểm hiệu suất ở mục Báo cáo cập nhật ngay sau khi lưu/duyệt bước hay nghiệm thu, không cần tải lại trang. Danh sách dự án phân trang 20 mục/trang." },
      { h: "📅 Gia hạn Hạn hoàn thành dự án" },
      { note: "Chỉ Ban Giám đốc mới đổi Hạn hoàn thành trực tiếp được. Phụ trách chính phải đề xuất gia hạn, BGĐ duyệt." },
      { p: "Phụ trách chính bấm 📅 Đề xuất gia hạn trong màn chi tiết dự án (nêu ngày + lý do). BGĐ bấm ✅ Duyệt gia hạn (đúng ngày hoặc ngắn hơn, ngắn hơn phải nêu lý do) hoặc ✖ Từ chối." },
      { h: "📅 Gia hạn ngày kết thúc 1 bước" },
      { p: "Người chủ trì bước bấm 📅 Đề xuất gia hạn ngay trên bước đó. Ban Giám đốc hoặc Trưởng/Phó phòng đúng đơn vị dự án duyệt/từ chối tương tự — quyền duyệt giống hệt quyền duyệt bước hoàn thành." },
      { h: "💰 Nhật ký thay đổi ngân sách" },
      { p: "Mỗi lần sửa \"Tổng mức đầu tư\" hoặc \"Đã chi\", hệ thống tự ghi lại ai sửa, lúc nào, từ bao nhiêu thành bao nhiêu — hiển thị ngay trong màn chi tiết dự án, không xóa/sửa được." },
    ]
  },
  {
    icon: "🎧", title: "8. Hỗ trợ người dùng/PAHT và vận hành DC",
    body: [
      { p: "Ghi nhanh từng trường hợp hỗ trợ/xử lý sự cố — không qua bước duyệt, vì bản chất đã xử lý xong ngay khi ghi nhận." },
      { h: "2 tab" },
      { ul: [
        "🎧 Hỗ trợ người dùng và xử lý PAHT — kênh: Điện thoại, Zalo, Email, Tiếp nhận qua HT PAHT. Người xử lý: nhân viên phòng HT-NTS và QL-KTDL.",
        "🖧 Xử lý lỗi Trung tâm dữ liệu — kênh: Điện thoại, Zalo. Người xử lý: chỉ nhân viên phòng HT-NTS.",
      ]},
      { h: "Ghi nhận 1 trường hợp" },
      { p: "Bấm + Ghi nhận, điền: Kênh tiếp nhận, Nội dung hỗ trợ/Mô tả lỗi, Kết quả giải quyết (bắt buộc), Người xử lý chính, Nhân viên phối hợp (tùy chọn — chọn nhiều người), Độ khó, Ngày xử lý, và có thể đính kèm 📎 file kết quả xử lý (ảnh chụp, log, tài liệu...) — áp dụng cho cả 2 tab." },
      { note: "Nhân viên phối hợp: bấm chọn nhiều người trong cùng phạm vi phòng ban của tab (người đã chọn làm xử lý chính sẽ tự loại khỏi danh sách). Thẻ trường hợp sẽ hiện 🤝 kèm tên những người phối hợp, và file CSV xuất ra có thêm cột \"Phối hợp\"." },
      { note: "Kết quả giải quyết là bắt buộc — nếu thiếu, danh sách sẽ hiện cảnh báo \"⚠️ Thiếu nội dung kết quả giải quyết\" để dễ rà soát bổ sung." },
      { h: "Tính điểm hiệu suất theo độ khó" },
      { ul: [
        "🔴 Khó = 1 việc",
        "🟡 Trung bình = 1/2 việc",
        "🟢 Nhanh = 1/4 việc",
      ]},
      { note: "Mỗi trường hợp cộng thẳng vào điểm hiệu suất tháng của người xử lý chính theo trọng số trên, tính vào tháng theo Ngày xử lý — mục Báo cáo cập nhật điểm ngay, không cần tải lại trang." },
      { note: "Nhân viên phối hợp được cộng 1/2 trọng số độ khó: phối hợp việc Khó = 0.5, Trung bình = 0.25, Nhanh = 0.125 — đồng bộ với cách tính phối hợp của nhiệm vụ thường." },
      { h: "Sửa, xóa, xác nhận" },
      { ul: [
        "✏️ Sửa — người xử lý tự sửa được trường hợp của mình; BGĐ/Trưởng/Phó phòng sửa được mọi trường hợp.",
        "🗑️ Xóa — chuyển vào Thùng rác (không mất ngay), có thể ↩️ khôi phục. Chỉ Admin/BGĐ mới xóa vĩnh viễn được từ Thùng rác.",
        "⏳ Xác nhận — BGĐ/Trưởng/Phó phòng rà soát và xác nhận từng trường hợp (hiện badge ✔️ Đã xác nhận), giúp kiểm soát việc tự ghi nhận.",
      ]},
      { p: "Nút 🗑️ Thùng rác (chỉ BGĐ/Trưởng/Phó phòng thấy) để xem lại các trường hợp đã xóa. Nút 📤 Xuất CSV để xuất danh sách đang lọc ra file Excel. Danh sách phân trang 20 mục/trang." },
    ]
  },
  {
    icon: "📌", title: "9. Nhiệm vụ khác",
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
    icon: "🗓️", title: "10. Lịch (Deadline/Trực)",
    body: [
      { ul: [
        "📅 Nhiệm vụ: xem hạn chót theo ngày dạng lịch tháng, bấm 1 ngày để xem chi tiết các việc đến hạn ngày đó.",
        "🗓️ Trực: xếp lịch trực (ca trực, người trực) theo ngày/tuần cho các phòng ban.",
      ]},
      { note: "Ở tab 📅 Nhiệm vụ có thêm bảng \"Hạn chót trong tháng theo nhân viên\" — bấm vào tên 1 người để lọc lịch chỉ hiện hạn chót của riêng người đó, giúp cân nhắc khối lượng trước khi giao thêm việc." },
    ]
  },
  {
    icon: "📁", title: "11. Văn bản",
    body: [
      { p: "Quản lý văn bản đến/đi: số văn bản, trích yếu, nơi gửi/nhận, ngày văn bản, file đính kèm." },
      { ul: [
        "Tìm kiếm theo số văn bản, trích yếu, nơi gửi.",
        "Lọc theo loại: Văn bản đến / Văn bản đi.",
        "Có thể liên kết văn bản với một nhiệm vụ, hoặc tạo nhiệm vụ mới trực tiếp từ văn bản.",
        "Văn bản đã liên kết nhiệm vụ sẽ hiện dòng 🔗 Liên kết nhiệm vụ kèm huy hiệu màu cho biết trạng thái nhiệm vụ đó (Trong hạn · Sắp hết hạn · Quá hạn · Chờ duyệt · Hoàn thành · HT quá hạn) — bấm vào để mở thẳng nhiệm vụ.",
      ]},
    ]
  },
  {
    icon: "📈", title: "12. Báo cáo",
    body: [
      { h: "Hiệu suất nhân viên & Bảng xếp hạng" },
      { p: "Điểm hiệu suất (0–100) gồm:" },
      { ul: [
        "Điểm thời hạn (tối đa 60đ): tỷ lệ việc đúng hạn/trễ hạn trong số việc đã đến hạn xử lý.",
        "Điểm chất lượng (tối đa 40đ): dựa trên mức đánh giá của các việc đã duyệt hoàn thành.",
        "Phạt trễ & quá hạn: trừ 2 điểm mỗi việc trễ/quá hạn.",
        "Thưởng khối lượng: +1đ mỗi việc vượt mốc 15 việc/tháng, tối đa +10.",
        "Thưởng phối hợp: cộng thêm khi hỗ trợ hoàn thành việc của người khác.",
      ]},
      { p: "Chỉ nhân viên có từ 5 việc ĐÃ ĐẾN HẠN trở lên trong tháng mới được tính điểm (việc chưa đến hạn chưa tính, vì chưa có kết quả để đánh giá)." },
      { h: "Trọng số nhiệm vụ định kỳ" },
      { p: "Nhiệm vụ tự động sinh từ mẫu định kỳ không tính đều = 1 việc như nhiệm vụ thường, mà quy đổi theo tần suất (tần suất càng dày, khối lượng mỗi lần càng nhỏ nên tính thấp hơn):" },
      { ul: [
        "Hàng ngày = 0.25 việc",
        "Hàng tuần = 1 việc",
        "2 tuần/lần = 1.5 việc",
        "Hàng tháng = 2.5 việc",
        "Hàng quý = 3 việc",
        "6 tháng/lần = 3 việc",
        "Hàng năm = 3 việc",
      ]},
      { note: "Người phối hợp trên MỌI nhiệm vụ (thường lẫn định kỳ) luôn được tính = 1/2 trọng số của nhiệm vụ chính, không phải cố định 0.5 việc — ví dụ phối hợp 1 việc hàng ngày (0.25) chỉ được cộng 0.125 việc, không phải 0.5." },
      { note: "Khi tạo mẫu định kỳ với tần suất Hàng ngày, ô Deadline tự khóa 🔒 (không chỉnh được số ngày) — hạn của mỗi nhiệm vụ sinh ra là ngày hôm sau, để có trọn 1 ngày xử lý trước khi bị tính quá hạn." },
      { note: "Việc \"trễ hạn\" được tính theo lúc bạn bấm Yêu cầu hoàn thành, không phải lúc người duyệt bấm duyệt — nếu bạn yêu cầu duyệt đúng hạn thì dù người duyệt xử lý chậm bao lâu, bạn vẫn không bị tính trễ." },
      { p: "Nhiệm vụ ngân sách cũng được cộng vào điểm hiệu suất: mỗi bước dự án đã duyệt+chấm chất lượng tính là 1 việc cho người chủ trì bước; khi cả dự án được BGĐ nghiệm thu (1–5 sao), phụ trách chính được cộng thêm 1 việc riêng." },
      { note: "Bấm ℹ️ cạnh điểm số để xem chi tiết \"Vì sao điểm này?\"." },
      { h: "Số quy đổi ở tab Tháng" },
      { ul: [
        "5 ô thống kê đầu trang (Tổng, Hoàn thành, Quá hạn, HT quá hạn, Tỷ lệ HT) đều hiện thêm dòng \"≈ … quy đổi\" — riêng Tỷ lệ HT có thêm tỷ lệ tính theo quy đổi, có thể lệch khá nhiều so với tỷ lệ đếm thô.",
        "Biểu đồ Hiệu suất phòng ban có nút chuyển [Đầu việc] / [Quy đổi] ở góc phải. Chuyển sang Quy đổi để so sánh phòng ban cho công bằng — phòng nhiều việc hàng ngày sẽ không còn bị vống lên.",
        "Nút này áp dụng chung cho cả biểu đồ Xu hướng 6 tháng (có nhãn cho biết đang xem chế độ nào).",
      ]},
      { note: "Vì sao cột \"Tổng\" ở bảng Hiệu suất nhân viên KHÔNG khớp với cột \"Quy đổi\" ở bảng Tổng hợp điều hành? Vì (1) bảng nhân viên chỉ tính THÁNG đang chọn, còn bảng điều hành tính toàn bộ thời gian; (2) bảng nhân viên còn cộng thêm Hỗ trợ ND/Xử lý lỗi TTDL và dự án ngân sách; (3) quan trọng nhất — một nhiệm vụ được tính cho CẢ người chủ trì lẫn người phối hợp (phối hợp = 1/2 trọng số), nên cộng dồn theo người sẽ luôn lớn hơn tổng theo nhiệm vụ. Đây là cố ý để ghi nhận công phối hợp, không phải sai số." },
      { p: "Xuất báo cáo ra PDF (để in) hoặc CSV (Excel)." },
      { h: "📑 Xếp loại (chốt sổ điểm) — dành cho BGĐ/TP.HCTH/Admin" },
      { p: "Điểm hiệu suất được \"chốt sổ\" cố định vào đầu mỗi tháng cho tháng vừa kết thúc (tự động khi BGĐ/Admin đăng nhập, hoặc chốt thủ công). Điểm đã chốt KHÔNG thay đổi khi dữ liệu cũ bị sửa — dùng làm căn cứ bình xét." },
      { ul: [
        "Chọn kỳ (Quý 1–4 hoặc Cả năm) để xem điểm từng tháng, điểm trung bình và xếp loại của toàn bộ nhân viên.",
        "Ngưỡng xếp loại: ≥90 Hoàn thành xuất sắc · ≥75 Hoàn thành tốt · ≥50 Hoàn thành · dưới 50 Không hoàn thành.",
        "🖨 In phiếu xếp loại: xuất phiếu tổng hợp có chỗ ký, dùng cho họp bình xét thi đua.",
        "Có thể \"Chốt lại\" một tháng nếu dữ liệu tháng đó vừa được bổ sung/sửa — sổ sẽ ghi đè theo dữ liệu hiện tại.",
      ]},
      { h: "🏛️ Điều hành — dành cho BGĐ/TP.HCTH/Admin" },
      { ul: [
        "Biểu đồ tỷ lệ hoàn thành của 3 phòng qua 6 tháng gần nhất — phát hiện phòng đang đi xuống.",
        "Top việc quá hạn lâu nhất toàn đơn vị (bấm mở xem chi tiết ngay).",
        "Bảng tốc độ duyệt: thời gian trung bình mỗi người duyệt xử lý yêu cầu + số việc đang treo — đo cả phía quản lý, không chỉ đo nhân viên.",
        "⏳ Sắp đến hạn trong 7 ngày tới: bấm vào ô số của một phòng để lọc danh sách bên dưới chỉ còn việc của phòng đó (bấm lại hoặc bấm ✕ Bỏ lọc để xem lại tất cả). Khi đang lọc, danh sách hiện tới 30 mục thay vì 8 nên xem được gần như trọn danh sách.",
      ]},
      { h: "📄 KQ nhiệm vụ — báo cáo kết quả thực hiện (BGĐ/TP.HCTH/Admin)" },
      { p: "Lập báo cáo kết quả thực hiện nhiệm vụ theo kỳ (quý, 6 tháng, cả năm hoặc khoảng ngày tự chọn) đúng mẫu để gửi cấp trên." },
      { ul: [
        "Bảng gom theo phòng: Tổng số · HT trong hạn · HT trễ hạn · Chưa HT trong hạn · Chưa HT trễ hạn và 3 cột tỷ lệ. Bấm vào 1 phòng để xem chi tiết từng nhân viên.",
        "Nút [Đầu việc] / [Quy đổi]: chuyển toàn bộ số liệu của bảng giữa đếm đầu việc và việc quy đổi theo trọng số nhiệm vụ định kỳ — kể cả các cột tỷ lệ.",
        "🖨 In báo cáo: xuất bản in đúng mẫu (có phần nhận xét, kiến nghị và chỗ ký). Bản in theo đúng chế độ Đầu việc/Quy đổi đang chọn, và khi ở chế độ Quy đổi sẽ tự ghi chú rõ cách quy đổi để người đọc không hiểu nhầm.",
        "Ô Số báo cáo để điền số hiệu văn bản in lên đầu báo cáo.",
      ]},
      { note: "Nhiệm vụ được tính vào kỳ theo HẠN CHÓT nằm trong kỳ, không phải theo ngày tạo." },
    ]
  },
  {
    icon: "👥", title: "13. Nhân viên",
    body: [
      { p: "Danh sách nhân viên theo phòng ban, số việc đang xử lý, số việc phối hợp. Thêm/sửa: họ tên, phòng ban, chức vụ." },
    ]
  },
  {
    icon: "💡", title: "14. Góp ý",
    body: [{ p: "Nơi gửi phản hồi, đề xuất cải tiến phần mềm hoặc quy trình làm việc trực tiếp trong ứng dụng." }]
  },
  {
    icon: "📜", title: "15. Nhật ký",
    body: [{ p: "Chỉ hiển thị với Ban Giám đốc/Quản trị viên/TP.HCTH. Ghi lại lịch sử thao tác trên các nhiệm vụ." }]
  },
  {
    icon: "🔐", title: "16. Bảo mật",
    body: [
      { p: "Chỉ hiển thị với Quản trị viên. Theo dõi lịch sử đăng nhập thành công/thất bại của toàn bộ tài khoản." },
      { h: "💾 Sao lưu dữ liệu" },
      { p: "Quản trị viên bấm nút 💾 Sao lưu dữ liệu (menu trái) để tải toàn bộ dữ liệu về 1 file JSON — nên thực hiện ít nhất 1 lần/tuần và cất file vào nơi an toàn. Ngoài ra hệ thống có sao lưu tự động hàng tuần qua GitHub Actions (xem tài liệu vận hành TAI_LIEU_VAN_HANH.md)." },
    ]
  },
  {
    icon: "🤝", title: "17. Ủy quyền duyệt",
    body: [
      { p: "Dùng khi Trưởng phòng đi công tác/nghỉ phép dài ngày — ủy quyền tạm thời cho Phó phòng cùng đơn vị duyệt hoàn thành/gia hạn thay trong 1 khoảng ngày cụ thể." },
      { p: "Bấm 🤝 Ủy quyền duyệt ở cuối menu chính (Trưởng/Phó phòng, TP.HCTH, BGĐ, Admin mới thấy)." },
      { ol: [
        "Chọn Người được ủy quyền (chỉ hiện Phó phòng cùng đơn vị), Từ ngày – Đến ngày.",
        "Bấm + Tạo ủy quyền.",
        "Trong khoảng ngày đó, Phó phòng được ủy quyền sẽ thấy và duyệt được mọi yêu cầu duyệt hoàn thành/gia hạn của các nhiệm vụ do Trưởng phòng đó giao — y như chính mình là người giao việc.",
      ]},
      { note: "Hết ngày kết thúc, ủy quyền tự động hết hiệu lực, không cần thao tác gì thêm. Có thể bấm Thu hồi để hủy sớm bất cứ lúc nào. Admin/BGĐ có thể tạo/xem ủy quyền cho bất kỳ Trưởng phòng nào; Trưởng phòng chỉ tạo/xem được ủy quyền của chính mình." },
    ]
  },
  {
    icon: "📑", title: "18. Bảng phân quyền tổng hợp",
    body: [{ table: {
      head: ["Chức năng", "Nhân viên", "Trưởng/Phó phòng", "TP.HCTH/BGĐ/Admin"],
      rows: [
        ["Xem việc của mình", "✅", "✅", "✅"],
        ["Xem việc cả phòng ban", "❌", "✅ (phòng mình)", "✅ (toàn đơn vị)"],
        ["Tạo/giao nhiệm vụ", "❌", "✅", "✅"],
        ["Yêu cầu hoàn thành việc", "✅ (người chủ trì)", "✅", "✅"],
        ["Cập nhật tiến độ (gồm người phối hợp)", "✅", "✅", "✅"],
        ["Duyệt hoàn thành & đánh giá", "❌", "✅ (phòng mình)", "✅"],
        ["Chuyển tiếp nhiệm vụ", "❌", "✅", "✅"],
        ["Xóa nhiệm vụ", "❌", "✅ (phòng mình)", "✅"],
        ["Quản lý tài khoản", "❌", "❌", "✅ (Admin)"],
        ["Xem Nhật ký / Bảo mật", "❌", "❌", "✅"],
      ]
    }}]
  },
  {
    icon: "❓", title: "19. Mẹo sử dụng & Câu hỏi thường gặp",
    body: [
      { h: "Sử dụng trên điện thoại" },
      { ul: ["Menu chính cố định ở đáy màn hình, luôn hiển thị khi cuộn.", "Bấm Aa trên thanh tiêu đề để chỉnh cỡ chữ phù hợp."] },
      { h: "Vì sao tôi không hoàn thành được nhiệm vụ ngay?" },
      { p: "Mọi nhiệm vụ hoàn thành đều cần Trưởng/Phó phòng hoặc Ban Giám đốc duyệt và đánh giá chất lượng, đảm bảo minh bạch trong đánh giá hiệu suất." },
      { h: "Vì sao điểm hiệu suất của tôi trống hoặc thấp?" },
      { ul: [
        "Cần từ 5 việc đã đến hạn trở lên trong tháng mới đủ điều kiện tính điểm.",
        "Điểm chỉ tính trên việc đã đến hạn xử lý — việc đang chờ duyệt hoặc chưa tới hạn chưa được tính vào tháng đó.",
        "Nếu chỉ làm ít nhiệm vụ thường, hãy để ý các bước bạn chủ trì trong Nhiệm vụ ngân sách đã được duyệt+chấm chất lượng hay chưa — mỗi bước cũng tính là 1 việc, giúp bạn dễ đạt mốc 5 việc/tháng hơn.",
        "Các trường hợp đã ghi nhận ở mục Hỗ trợ người dùng/PAHT và vận hành DC cũng cộng điểm theo độ khó (Khó=1, Trung bình=1/2, Nhanh=1/4 việc) — điểm cập nhật ngay, không cần tải lại trang.",
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
