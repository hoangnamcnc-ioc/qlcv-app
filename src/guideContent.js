// Nội dung Hướng dẫn sử dụng (tách ra để cả trang Hướng dẫn lẫn Trợ lý chat cùng dùng).
export const GUIDE_SECTIONS = [
  {
    icon: "📘", title: "1. Giới thiệu chung & vai trò",
    body: [
      { p: "Phần mềm Quản lý Giao việc (QLCV) giúp Trung tâm IOC theo dõi, phân công và đánh giá công việc của 3 phòng: HCTH, QL-KTDL, HT-NTS. Dùng được trên máy tính và điện thoại." },
      { table: {
        head: ["Vai trò", "Quyền hạn chính"],
        rows: [
          ["Quản trị viên (admin)", "Toàn quyền: mọi phòng ban, tài khoản, bảo mật"],
          ["Ban Giám đốc (director)", "Xem/duyệt toàn bộ đơn vị, không giới hạn phòng ban"],
          ["TP. HCTH (manager_hcth)", "Như Trưởng phòng, chỉ trong phòng mình (HCTH)"],
          ["Trưởng phòng (manager)", "Giao việc, duyệt hoàn thành, đánh giá trong phòng mình"],
          ["Phó trưởng phòng (deputy_manager)", "Tương tự Trưởng phòng, trong phòng mình"],
          ["Nhân viên (staff)", "Xem việc được giao, tự tạo việc cá nhân, cập nhật tiến độ, yêu cầu duyệt hoàn thành"],
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
        "🔁 Bàn giao hàng loạt (chuyển nhiều việc của 1 người sang người khác)",
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
      { note: "Bảng Tổng hợp điều hành chỉ tính NHIỆM VỤ (không gồm Hỗ trợ ND/Xử lý lỗi TTDL và dự án ngân sách), gom theo phòng của nhiệm vụ. Vì vậy nó không trùng với cột \"Tổng\" ở bảng Hiệu suất nhân viên (bảng đó có cộng thêm việc phối hợp) — đừng cộng dồn hai bảng để đối chiếu." },
      { h: "📅 Chọn kỳ thống kê & 🎯 Chỉ tiêu KPI (Ban Giám đốc)" },
      { ul: [
        "Ô 📅 Kỳ ở đầu bảng: chọn tháng/năm muốn xem (mặc định THÁNG HIỆN HÀNH), hoặc \"Toàn bộ\" để tính mọi thời gian. Các cột Tổng/Quy đổi/Hoàn thành/Quá hạn/Tỷ lệ HT đổi theo kỳ đã chọn.",
        "Ô 🎯 Chỉ tiêu tỷ lệ HT: BGĐ đặt mức KPI (mặc định 85%). Cột Tỷ lệ HT của phòng đạt ≥ mức này hiện màu xanh kèm chip \"🎯 Đạt\", dưới mức hiện đỏ \"Chưa\". Chỉ tiêu này lưu chung toàn cơ quan (ai cũng thấy giống nhau).",
        "Cột Quá tải luôn theo thực tế HIỆN TẠI (không phụ thuộc kỳ đã chọn).",
      ]},
      { h: "🧭 Gợi ý điều phối nhân sự (Ban Giám đốc)" },
      { p: "Khi tải giữa các phòng chênh lệch rõ, hệ thống gợi ý: phòng 🔴 có dấu hiệu thiếu người (tải cao hơn hẳn mặt bằng và có người quá tải) hoặc 🟢 có thể đang dư người — dựa trên khối lượng đang mở quy đổi/người. Chỉ mang tính tham khảo điều phối." },
      { h: "🚨 Cảnh báo chủ động (phát hiện sớm)" },
      { ul: [
        "⚠️ Nguy cơ trễ: dự báo việc KHẢ NĂNG trễ cao dựa trên tiến độ so với thời gian đã trôi + lịch sử đúng hạn của người thực hiện — hiện mức 🔴 Cao / 🟡 TB. Nổi lên TRƯỚC khi thành quá hạn để can thiệp kịp.",
        "🚩 Cần chú ý (BGĐ): tự chỉ ra phòng có tỷ lệ hoàn thành giảm 3 tháng liên tiếp, và nhân viên rớt điểm mạnh (≥15đ) so với tháng trước.",
        "📊 Bản tin tuần (quản lý): 4 số nhanh — việc mới giao / đã hoàn thành trong 7 ngày qua / sắp hết hạn / đang quá hạn.",
        "🩺 Sức khỏe dữ liệu (quản lý/BGĐ): việc quá hạn chưa nêu lý do · chờ duyệt/chấm ≥2 ngày · việc bỏ hoang (0% quá 7 ngày). Dữ liệu sạch thì điểm & báo cáo mới đáng tin.",
      ]},
      { h: "🧠 Trợ lý thông minh (gợi ý & dự báo từ số liệu)" },
      { ul: [
        "🧠 Trợ lý điều hành (BGĐ): đoạn tóm tắt bằng lời tự sinh ở đầu Tổng quan — kết quả kỳ, điểm nóng, gợi ý điều phối, dữ liệu cần chấn chỉnh.",
        "🩻 Phân tích nguyên nhân trễ (quản lý/BGĐ): rút quy luật từ dữ liệu — lý do trễ phổ biến + khuyến nghị, tỷ lệ trễ dồn cuối tháng, người trễ nhiều nhất.",
        "🖨 Bản tự đánh giá (nhân viên): nút trong thẻ cá nhân để in 1 trang tổng kết (điểm, cấu thành, chủ động, xu hướng, nguyên nhân trễ, có chỗ ký).",
      ]},
      { note: "Các tính năng thông minh trên chạy bằng THUẬT TOÁN trên số liệu sẵn có (không dùng AI ngoài) — chỉ mang tính tham vấn, quyết định cuối vẫn do người quản lý." },
      { h: "👥 Bảng \"Nhân sự\" & Hồ sơ nhân viên (Trưởng phòng / BGĐ)" },
      { ul: [
        "Trưởng/Phó phòng thấy danh sách nhân sự phòng mình (BGĐ thấy toàn cơ quan): việc đang mở, điểm tháng, tỷ lệ đúng hạn — phân trang 8 người/trang.",
        "Bấm một người để mở HỒ SƠ đánh giá chi tiết: điểm & cấu thành điểm tháng, 🎯 năng lực theo loại việc (đúng hạn & chất lượng cho nhiệm vụ thường / định kỳ), ⚡ chỉ số Chủ động (hoàn thành sớm hạn + phối hợp — tham khảo), xu hướng điểm 6 tháng, nguyên nhân trễ riêng, và danh sách việc đang mở.",
      ]},
      { h: "🔀 Gợi ý điều việc (Trưởng phòng)" },
      { p: "Ở cảnh báo quá tải, bấm vào một người quá tải để xem việc của họ. Nếu trong phòng có đồng nghiệp đang rảnh hơn, hệ thống gợi ý chuyển bớt — mỗi việc có nút \"→ Chuyển\" mở sẵn hộp chuyển tiếp đã chọn người nhận, Trưởng phòng chỉ cần xác nhận." },
      { note: "Cảnh báo quá tải nay tính theo KHỐI LƯỢNG QUY ĐỔI đang mở (không đếm thô đầu việc): người ôm nhiều việc hàng ngày 0.25 không bị coi ngang người ôm nhiều dự án. Ngưỡng chỉnh được ngay tại khối cảnh báo." },
      { h: "👤 Khối cá nhân — \"Việc của tôi\" (nhân viên)" },
      { ul: [
        "Danh sách \"Công việc của tôi\" gộp MỌI loại (chủ trì + phối hợp), sắp xếp thông minh: việc quá hạn/gần hết hạn lên trước, việc ưu tiên Cao được kéo lên. Có phân trang.",
        "Thẻ \"Việc của tôi\" so sánh khối lượng quy đổi của bạn với trung bình phòng (cao/thấp hơn bao nhiêu %).",
        "Mục \"Đã hoàn thành tháng này\" (bấm mở) gộp mọi module để bạn tự soi lại trước kỳ đánh giá.",
      ]},
    ]
  },
  {
    icon: "📋", title: "6. Nhiệm vụ",
    body: [
      { h: "Tạo nhiệm vụ mới" },
      { p: "Bấm + Tạo việc, điền: Tiêu đề/Mô tả, Phòng ban, Giao cho, Ưu tiên, Hạn chót, Phối hợp (người hỗ trợ), file đính kèm hoặc link tài liệu." },
      { p: "Khi chọn người ở ô Giao cho, hệ thống hiện luôn khối lượng đang mở của từng người (\"— N việc\") và cảnh báo 🔥 nếu người đó đã quá tải — giúp Trưởng phòng không dồn việc vào một người." },
      { ul: [
        "💡 Gợi ý người nhận: hệ thống đề xuất người đang RẢNH nhất và có lịch sử đúng hạn tốt (\"Nên giao cho A — đang rảnh, đúng hạn 95%\"), bấm Chọn để áp dụng.",
        "⏱ Gợi ý deadline: dựa trên thời gian thực tế người đó thường hoàn thành việc, cảnh báo nếu hạn đang đặt quá gấp.",
        "⛓ Chờ việc hoàn thành trước (tùy chọn): đặt phụ thuộc — việc này chỉ hoàn thành được sau khi việc kia xong (tránh làm sai thứ tự nhiều khâu). Chi tiết việc hiện banner phụ thuộc, hệ thống chặn hoàn thành nếu việc chờ chưa xong.",
      ]},
      { h: "🙋 Nhân viên tự tạo việc của mình" },
      { note: "Nhân viên có nút + Tự tạo việc để ghi nhận việc tự phát/sáng kiến. Việc này chỉ giao cho CHÍNH MÌNH, đúng phòng của mình. Người tạo KHÔNG tự duyệt/tự chấm điểm — Trưởng/Phó phòng là người duyệt hoàn thành và đánh giá (đảm bảo công bằng). Nhân viên sửa lại được việc mình tự tạo khi CHƯA gửi duyệt.", color: "1D4ED8", bg: "#EFF6FF" },
      { h: "Tìm kiếm & lọc" },
      { p: "Ô tìm kiếm theo tên việc/mô tả/người thực hiện/số văn bản, cùng bộ lọc Trạng thái, Phòng ban, Nhân viên, Sắp xếp." },
      { note: "Nút 👤 Tôi giao (Trưởng/Phó phòng, TP.HCTH, BGĐ, Admin mới thấy) lọc riêng những việc CHÍNH bạn đã giao (tạo hoặc chuyển tiếp) — giúp theo dõi riêng phần việc mình phải chịu trách nhiệm duyệt, không lẫn với việc của người khác trong phòng." },
      { p: "Mỗi thẻ/dòng nhiệm vụ hiện thêm 📤 tên người giao việc (người tạo hoặc người chuyển tiếp gần nhất), giúp biết ngay ai là người cần liên hệ khi cần duyệt/hỏi thêm." },
      { h: "Cập nhật tiến độ" },
      { p: "Bấm vào thanh % tiến độ (hoặc nút % TĐ) để chọn nhanh mức 0–100%." },
      { h: "✅ Checklist con (chia nhỏ nhiệm vụ)" },
      { p: "Với việc nhiều đầu mục, mở chi tiết nhiệm vụ và thêm các Mục con (gõ nội dung rồi Enter). Tick/bỏ tick từng mục, phần trăm tiến độ TỰ cập nhật theo số mục đã xong. Người chủ trì, người phối hợp và quản lý đều thao tác được. Hoàn thành nhiệm vụ vẫn qua nút Yêu cầu hoàn thành như thường." },
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
      { h: "🔔 Nhắc việc (đôn đốc nhân viên)" },
      { p: "Trong chi tiết một nhiệm vụ chưa hoàn thành, Trưởng/Phó phòng (hoặc người giao) có nút 🔔 Nhắc việc để đôn đốc người thực hiện. Mỗi lần nhắc được ĐẾM và ghi vào lịch sử nhiệm vụ (làm bằng chứng đã đôn đốc), nhân viên thấy dòng \"đã được nhắc N lần\". Giới hạn 1 lần/4 giờ để tránh làm phiền." },
      { h: "✅ Miễn phạt trễ khách quan" },
      { p: "Ở khối Nguyên nhân trễ hạn của một việc, Trưởng/Phó phòng/BGĐ có ô tích \"Trễ khách quan — miễn phạt\". Dùng cho việc trễ vì lý do NGOÀI TẦM KIỂM SOÁT của người thực hiện (chờ ý kiến cấp trên, phụ thuộc đơn vị khác…):" },
      { ul: [
        "Việc hoàn thành trễ được đánh dấu → khi tính điểm coi như ĐÚNG HẠN, không trừ điểm phạt.",
        "Việc còn quá hạn được đánh dấu → loại khỏi mẫu số tính điểm (không tính là quá hạn).",
        "Mỗi lần đánh dấu/bỏ đánh dấu đều ghi vào lịch sử nhiệm vụ.",
      ]},
      { h: "📅 Đề xuất & duyệt gia hạn deadline" },
      { note: "Chỉ người giao việc (người tạo/chuyển tiếp gần nhất) hoặc Admin/BGĐ mới đổi Hạn chót trực tiếp được. Trưởng/Phó phòng khác trong phòng ban KHÔNG còn tự ý đổi hạn của nhiệm vụ không phải do mình giao." },
      { ol: [
        "Người được giao bấm 📅 Đề xuất gia hạn trong modal chi tiết, chọn ngày muốn gia hạn tới + nêu lý do.",
        "Người giao việc thấy đề xuất, bấm ✅ Duyệt gia hạn (chọn đúng ngày đề xuất hoặc ngắn hơn — nếu ngắn hơn phải nêu rõ lý do) hoặc ✖ Từ chối (phải nêu lý do).",
        "Duyệt xong, Hạn chót của nhiệm vụ cập nhật ngay theo ngày đã duyệt.",
      ]},
      { h: "🔄 Nhiệm vụ định kỳ" },
      { p: "Dành cho việc lặp lại theo chu kỳ (báo cáo tuần, kiểm tra hệ thống hàng ngày, chi lương hàng tháng...). Bạn tạo MẪU một lần, hệ thống tự sinh nhiệm vụ thật theo đúng tần suất — không phải gõ lại mỗi kỳ." },
      { p: "Vào 💼 Công việc → 🔄 Nhiệm vụ định kỳ → + Thêm mẫu. Trưởng/Phó phòng và TP.HCTH tạo mẫu cho phòng mình; BGĐ/Admin tạo cho mọi phòng." },
      { ul: [
        "Tiêu đề * và Mô tả — nội dung việc lặp lại (VD: \"Báo cáo tuần HCTH\").",
        "Phòng ban và Giao cho * — người thực hiện chính, chọn trong nhân viên của phòng đó.",
        "Tần suất — Hàng ngày · Hàng tuần · 2 tuần/lần · Hàng tháng · Hàng quý · 6 tháng/lần · Hàng năm.",
        "Deadline (ngày sau khi tạo) — số ngày được phép xử lý kể từ khi nhiệm vụ sinh ra (1–90 ngày).",
        "Ưu tiên — Cao / Trung bình / Thấp.",
        "Tạo đầu tiên vào ngày — mốc bắt đầu; từ đó hệ thống cộng dần theo tần suất.",
        "Người phối hợp — bấm chọn nhiều người (người được giao chính bị làm mờ và ghi \"(chính)\"), kèm ô Ghi chú phối hợp.",
      ]},
      { note: "Với tần suất Hàng ngày, ô Deadline tự khóa thành \"Ngày hôm sau 🔒\" — mỗi nhiệm vụ sinh ra có trọn 1 ngày để xử lý trước khi bị tính quá hạn." },
      { h: "Hệ thống tự sinh nhiệm vụ khi nào?" },
      { ul: [
        "Khi một người có quyền tạo việc (Trưởng/Phó phòng, TP.HCTH, BGĐ, Admin) đăng nhập, hệ thống rà các mẫu đang Hoạt động và sinh nhiệm vụ cho những mẫu đã đến ngày.",
        "Nhiệm vụ sinh ra có tiêu đề bắt đầu bằng 🔄 và trong lịch sử ghi \"Tạo tự động từ mẫu định kỳ\".",
        "Mẫu Hàng ngày KHÔNG sinh nhiệm vụ vào Thứ Bảy, Chủ nhật VÀ ngày lễ (theo danh sách ngày lễ trong cấu hình) — tự nhảy sang ngày làm việc kế tiếp.",
        "Mỗi mốc chỉ sinh 1 nhiệm vụ — nhiều người đăng nhập hoặc đăng nhập nhiều lần trong ngày cũng không tạo trùng.",
      ]},
      { h: "Quản lý mẫu đã tạo" },
      { ul: [
        "✏️ Sửa — đổi nội dung, người thực hiện, tần suất, deadline, người phối hợp...",
        "🔄 Tạm dừng / Kích hoạt — mẫu ở trạng thái Tạm dừng sẽ ngừng sinh nhiệm vụ mới, nhưng các nhiệm vụ đã sinh vẫn giữ nguyên. Dùng khi tạm ngưng một đầu việc mà chưa muốn xóa mẫu.",
        "🗑️ Xóa mẫu — chỉ xóa mẫu, không xóa những nhiệm vụ đã sinh trước đó.",
      ]},
      { note: "Nhiệm vụ sinh từ mẫu định kỳ vẫn chạy đầy đủ quy trình như nhiệm vụ thường: người thực hiện bấm Yêu cầu hoàn thành → Trưởng/Phó phòng của người đó duyệt và đánh giá chất lượng." },
      { note: "Về điểm: nhiệm vụ định kỳ KHÔNG tính đều = 1 việc mà quy đổi theo tần suất (hàng ngày 0.25 · tuần 1 · 2 tuần 1.5 · tháng 2.5 · quý/6 tháng/năm 3). Xem chi tiết ở mục 13. Báo cáo." },
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
      { h: "🔮 Dự báo cán đích" },
      { p: "Khi dự án đã hoàn thành từ 2 bước trở lên, hệ thống ước tính ngày về đích dựa trên NHỊP hoàn thành các bước (\"với nhịp ~X ngày/bước, còn N bước → dự kiến xong ~ngày...\") và cảnh báo nếu nhịp hiện tại có thể trễ hạn." },
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
    icon: "💬", title: "12. Chat",
    body: [
      { p: "Kênh trao đổi nhanh ngay trong phần mềm — bàn công việc mà không phải chuyển sang ứng dụng khác." },
      { ul: [
        "📢 Kênh chung — mọi người trong đơn vị đều thấy và nhắn được, luôn nằm đầu danh sách. Dùng cho thông báo chung.",
        "# Kênh riêng — chỉ những người được thêm làm thành viên mới nhìn thấy kênh và đọc được nội dung. Dùng cho từng nhóm việc/dự án.",
      ]},
      { h: "Tạo kênh riêng" },
      { p: "Bấm nút Tạo kênh mới, đặt Tên kênh (VD: \"Dự án chuyển đổi số\"), tích chọn Thành viên rồi bấm Tạo kênh. Người tạo mặc định là thành viên của kênh." },
      { h: "Nhắn tin" },
      { ul: [
        "Chọn kênh ở danh sách bên trái, gõ vào ô \"Nhập tin nhắn…\" rồi bấm Gửi.",
        "Trên điện thoại, bấm ← để quay lại danh sách kênh.",
      ]},
      { note: "Ai cũng tạo được kênh riêng, không giới hạn theo chức vụ. Nên đặt tên kênh rõ theo đầu việc để sau này dễ tìm." },
      { note: "Chat dùng để trao đổi, KHÔNG thay cho việc cập nhật nhiệm vụ. Các kết luận/kết quả quan trọng vẫn nên ghi vào phần Bình luận 💬 của chính nhiệm vụ để lưu vết đúng chỗ và người duyệt còn thấy." },
    ]
  },
  {
    icon: "📈", title: "13. Báo cáo",
    body: [
      { h: "Hiệu suất nhân viên & Bảng xếp hạng" },
      { p: "Điểm hiệu suất (0–100) gồm:" },
      { ul: [
        "Điểm thời hạn (tối đa 60đ): tỷ lệ việc đúng hạn/trễ hạn trong số việc đã đến hạn xử lý.",
        "Điểm chất lượng (tối đa 40đ): dựa trên mức đánh giá của các việc đã duyệt hoàn thành.",
        "Phạt trễ & quá hạn: trừ 2 điểm mỗi việc trễ/quá hạn.",
        "Thưởng khối lượng: +1đ mỗi việc vượt mốc 15 việc/tháng, tối đa +10.",
        "Thưởng ưu tiên: +0.5đ mỗi việc ưu tiên CAO hoàn thành đúng hạn, tối đa +5 (chỉ cộng thêm, không phạt).",
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
      { note: "Khi tạo mẫu định kỳ với tần suất Hàng ngày, ô Deadline tự khóa 🔒 — hạn của mỗi nhiệm vụ sinh ra là ngày làm việc kế tiếp. Nhiệm vụ hàng ngày TỰ NÉ Thứ 7/Chủ nhật VÀ ngày lễ (theo danh sách ngày lễ trong cấu hình) — không sinh và không đặt hạn vào ngày nghỉ. Ngoài ra, việc hàng ngày bỏ thanh % tiến độ, chỉ cần bấm \"✅ Đánh dấu đã làm\"." },
      { note: "Việc \"trễ hạn\" được tính theo lúc bạn bấm Yêu cầu hoàn thành, không phải lúc người duyệt bấm duyệt — nếu bạn yêu cầu duyệt đúng hạn thì dù người duyệt xử lý chậm bao lâu, bạn vẫn không bị tính trễ." },
      { p: "Nhiệm vụ ngân sách cũng được cộng vào điểm hiệu suất: mỗi bước dự án đã duyệt+chấm chất lượng tính là 1 việc cho người chủ trì bước; khi cả dự án được BGĐ nghiệm thu (1–5 sao), phụ trách chính được cộng thêm 1 việc riêng." },
      { note: "Bấm ℹ️ cạnh điểm số để xem chi tiết \"Vì sao điểm này?\"." },
      { h: "🏛️ Điểm điều hành — Trưởng/Phó phòng (bảng xếp hạng RIÊNG)" },
      { p: "Trưởng/Phó phòng KHÔNG chấm theo vài việc giao đích danh (vốn rất ít), mà theo KẾT QUẢ CẢ PHÒNG họ điều hành. Cấp quản lý được tách khỏi bảng Hiệu suất nhân viên và có bảng \"🏛️ Điểm điều hành\" riêng ở cả tab Tháng lẫn Xếp hạng năm — không so trực tiếp điểm với nhân viên." },
      { ul: [
        "① Đúng hạn phòng (tối đa 60đ): tỷ lệ việc phòng đúng hạn/trễ trong số việc đã đến hạn.",
        "② Chất lượng phòng (tối đa 40đ): trung bình mức nghiệm thu việc của phòng.",
        "③ − Tồn đọng quá hạn (tối đa −10đ): tỷ lệ việc phòng còn quá hạn chưa xong.",
        "④ + Thưởng khối lượng điều hành (tối đa +10đ): tính theo BÌNH QUÂN ĐẦU NGƯỜI của phòng — vượt 10 việc quy đổi/người mới thưởng, đạt tối đa khi ≥20/người (công bằng với phòng ít/nhiều nhân sự).",
      ]},
      { note: "Đủ điều kiện khi phòng có ≥5 việc quy đổi đã đến hạn/tháng. Bấm ℹ️ ở bảng điểm điều hành để xem popup \"Vì sao điểm này?\" với đủ 4 cấu phần, giống điểm nhân viên." },
      { h: "Số quy đổi ở tab Tháng" },
      { ul: [
        "5 ô thống kê đầu trang (Tổng, Hoàn thành, Quá hạn, HT quá hạn, Tỷ lệ HT) đều hiện thêm dòng \"≈ … quy đổi\" — riêng Tỷ lệ HT có thêm tỷ lệ tính theo quy đổi, có thể lệch khá nhiều so với tỷ lệ đếm thô.",
        "Mỗi ô còn hiện mũi tên ▲▼ % thay đổi so với THÁNG TRƯỚC (xanh = tốt lên, đỏ = xấu đi), và với ô Tỷ lệ HT còn hiện \"🎯 Chỉ tiêu N%: Đạt/Chưa đạt\" theo KPI đã đặt.",
        "Biểu đồ Hiệu suất phòng ban có nút chuyển [Đầu việc] / [Quy đổi] ở góc phải. Chuyển sang Quy đổi để so sánh phòng ban cho công bằng — phòng nhiều việc hàng ngày sẽ không còn bị vống lên.",
        "Nút này áp dụng chung cho cả biểu đồ Xu hướng 6 tháng (có nhãn cho biết đang xem chế độ nào).",
      ]},
      { note: "Vì sao cột \"Tổng\" ở bảng Hiệu suất nhân viên KHÔNG khớp với cột \"Quy đổi\" ở bảng Tổng hợp điều hành? Vì (1) hai bảng có thể đang xem kỳ khác nhau (bảng điều hành có ô 📅 Kỳ riêng); (2) bảng nhân viên còn cộng thêm Hỗ trợ ND/Xử lý lỗi TTDL và dự án ngân sách; (3) quan trọng nhất — một nhiệm vụ được tính cho CẢ người chủ trì lẫn người phối hợp (phối hợp = 1/2 trọng số), nên cộng dồn theo người sẽ luôn lớn hơn tổng theo nhiệm vụ. Đây là cố ý để ghi nhận công phối hợp, không phải sai số." },
      { p: "Xuất báo cáo ra PDF (để in) hoặc CSV (Excel)." },
      { h: "📑 Xếp loại (chốt sổ điểm) — mọi vai trò xem được; riêng nút Chốt sổ chỉ BGĐ/Admin" },
      { p: "Điểm hiệu suất được \"chốt sổ\" cố định vào đầu mỗi tháng cho tháng vừa kết thúc (tự động khi BGĐ/Admin đăng nhập, hoặc chốt thủ công). Điểm đã chốt KHÔNG thay đổi khi dữ liệu cũ bị sửa — dùng làm căn cứ bình xét." },
      { ul: [
        "Chọn kỳ (Quý 1–4 hoặc Cả năm) để xem điểm từng tháng, điểm trung bình và xếp loại của toàn bộ nhân viên.",
        "Ngưỡng xếp loại: ≥90 Hoàn thành xuất sắc · ≥75 Hoàn thành tốt · ≥50 Hoàn thành · dưới 50 Không hoàn thành.",
        "🖨 In phiếu xếp loại: xuất phiếu tổng hợp có chỗ ký, dùng cho họp bình xét thi đua.",
        "Có thể \"Chốt lại\" một tháng nếu dữ liệu tháng đó vừa được bổ sung/sửa — sổ sẽ ghi đè theo dữ liệu hiện tại.",
        "Trưởng/Phó phòng được chốt bằng ĐIỂM ĐIỀU HÀNH (có nhãn 🏛️ ĐH trong phiếu); nhân viên chốt bằng điểm hiệu suất cá nhân như thường.",
      ]},
      { note: "Nút 🏛️ Đồng bộ điểm điều hành: cập nhật lại điểm cho Trưởng/Phó phòng ở MỌI tháng đã chốt theo công thức điều hành mới, GIỮ NGUYÊN điểm nhân viên đã chốt. Dùng một lần cho các tháng chốt trước khi có điểm điều hành." },
      { h: "🏛️ Điều hành — mọi vai trò xem được" },
      { ul: [
        "Biểu đồ tỷ lệ hoàn thành của 3 phòng qua 6 tháng gần nhất — phát hiện phòng đang đi xuống.",
        "Top việc quá hạn lâu nhất toàn đơn vị (bấm mở xem chi tiết ngay).",
        "Bảng tốc độ duyệt: thời gian trung bình mỗi người duyệt xử lý yêu cầu + số việc đang treo — đo cả phía quản lý, không chỉ đo nhân viên.",
        "⏳ Sắp đến hạn trong 7 ngày tới: bấm vào ô số của một phòng để lọc danh sách bên dưới chỉ còn việc của phòng đó (bấm lại hoặc bấm ✕ Bỏ lọc để xem lại tất cả). Khi đang lọc, danh sách hiện tới 30 mục thay vì 8 nên xem được gần như trọn danh sách.",
      ]},
      { h: "📄 KQ nhiệm vụ — báo cáo kết quả thực hiện (mọi vai trò xem được)" },
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
    icon: "👥", title: "14. Nhân viên",
    body: [
      { p: "Danh sách nhân viên theo phòng ban, số việc đang xử lý, số việc phối hợp. Thêm/sửa: họ tên, phòng ban, chức vụ." },
      { h: "🚫 Không giao việc / không tính KPI (khoán lương)" },
      { p: "Trong form thêm/sửa nhân viên có ô tích \"Không giao việc / không tính KPI (khoán lương, bảo vệ…)\". Tích ô này cho những người làm nhiệm vụ riêng, hưởng khoán lương (VD: bảo vệ)." },
      { ul: [
        "Họ sẽ KHÔNG xuất hiện trong danh sách Giao cho / Phối hợp / Chuyển tiếp / gợi ý điều việc.",
        "KHÔNG bị tính vào bảng Hiệu suất, Xếp hạng, và KHÔNG tính vào đầu người của phòng (mẫu số điểm điều hành & tải bình quân) — nên không làm loãng chỉ số của Trưởng phòng.",
        "Vẫn là nhân viên trong danh mục (hiện nhãn 🚫 KPI) và vẫn dùng được ở Lịch trực nếu có tham gia trực.",
      ]},
    ]
  },
  {
    icon: "💡", title: "15. Góp ý",
    body: [{ p: "Nơi gửi phản hồi, đề xuất cải tiến phần mềm hoặc quy trình làm việc trực tiếp trong ứng dụng." }]
  },
  {
    icon: "📜", title: "16. Nhật ký",
    body: [
      { p: "Chỉ hiển thị với Ban Giám đốc/Quản trị viên. Nhật ký TOÀN DIỆN gộp lịch sử thao tác từ 5 module: Nhiệm vụ, Hỗ trợ ND/PAHT (ghi nhận), Ngân sách và Nhiệm vụ khác (duyệt bước, nghiệm thu), và Văn bản (thêm/chuyển văn bản)." },
      { ul: [
        "Ô tìm kiếm theo người / hành động / đối tượng.",
        "Bộ lọc: theo Người, theo Loại (Nhiệm vụ/Hỗ trợ/Ngân sách/NV khác/Văn bản), theo khoảng ngày (Từ – Đến).",
        "Phân trang 50 dòng/trang; nút ⬇ CSV để xuất ra Excel phục vụ tra cứu/kiểm tra.",
      ]},
      { note: "Nhật ký sắp theo mốc thời gian thật (mới nhất trên cùng) và KHÔNG tự xóa dữ liệu — toàn bộ lịch sử vẫn lưu đầy đủ trong hệ thống, phần hiển thị chỉ lọc/phân trang." },
    ]
  },
  {
    icon: "🔐", title: "17. Bảo mật",
    body: [
      { p: "Chỉ hiển thị với Quản trị viên. Theo dõi lịch sử đăng nhập thành công/thất bại của toàn bộ tài khoản." },
      { h: "💾 Sao lưu dữ liệu" },
      { p: "Quản trị viên bấm nút 💾 Sao lưu dữ liệu (menu trái) để tải toàn bộ dữ liệu về 1 file JSON — nên thực hiện ít nhất 1 lần/tuần và cất file vào nơi an toàn. Ngoài ra hệ thống có sao lưu tự động hàng tuần qua GitHub Actions (xem tài liệu vận hành TAI_LIEU_VAN_HANH.md)." },
    ]
  },
  {
    icon: "🤝", title: "18. Ủy quyền duyệt",
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
    icon: "📑", title: "19. Bảng phân quyền tổng hợp",
    body: [{ table: {
      head: ["Chức năng", "Nhân viên", "Trưởng/Phó phòng, TP.HCTH", "BGĐ/Admin"],
      rows: [
        ["Xem việc của mình", "✅", "✅", "✅"],
        ["Xem việc cả phòng ban", "❌", "✅ (phòng mình)", "✅ (toàn đơn vị)"],
        ["Tự tạo việc cho chính mình (TP duyệt/chấm)", "✅", "✅", "✅"],
        ["Tạo/giao nhiệm vụ cho người khác", "❌", "✅ (phòng mình)", "✅"],
        ["🔔 Nhắc việc / điều việc / hồ sơ nhân viên", "❌", "✅ (phòng mình)", "✅"],
        ["Miễn phạt trễ khách quan", "❌", "✅ (phòng mình)", "✅"],
        ["Yêu cầu hoàn thành việc", "✅ (người chủ trì)", "✅", "✅"],
        ["Cập nhật tiến độ (gồm người phối hợp)", "✅", "✅", "✅"],
        ["Duyệt hoàn thành & đánh giá", "❌", "✅ (phòng mình)", "✅"],
        ["Chuyển tiếp nhiệm vụ", "❌", "✅ (phòng mình)", "✅"],
        ["Xóa nhiệm vụ", "❌", "✅ (phòng mình)", "✅"],
        ["Xem Báo cáo (tất cả các tab)", "✅", "✅", "✅"],
        ["Đặt chỉ tiêu KPI & chọn kỳ (Tổng hợp điều hành)", "❌", "❌", "✅"],
        ["Chốt sổ điểm / Đồng bộ điểm điều hành", "❌", "❌", "✅"],
        ["Đánh dấu nhân sự không tính KPI (khoán lương)", "❌", "❌", "✅ (Admin)"],
        ["Quản lý tài khoản", "❌", "❌", "✅ (Admin)"],
        ["Xem Nhật ký / Bảo mật", "❌", "❌", "✅"],
      ]
    }}]
  },
  {
    icon: "❓", title: "20. Mẹo sử dụng & Câu hỏi thường gặp",
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
        "Nếu chưa đủ 5 việc đến hạn, bảng vẫn hiện \"~Nđ (tham khảo)\" để bạn biết mình đang ở mức nào — điểm này KHÔNG dùng để xếp hạng/chốt sổ.",
        "Nếu bị trễ vì lý do khách quan (ngoài tầm kiểm soát), báo Trưởng/Phó phòng đánh dấu \"Trễ khách quan — miễn phạt\" trong việc đó; khi được duyệt, việc sẽ không bị trừ điểm phạt.",
      ]},
      { h: "Hướng dẫn nhanh lần đầu" },
      { p: "Lần đầu đăng nhập, mỗi tài khoản thấy một popup gợi ý 3–5 việc nên làm theo đúng vai trò của mình. Xem xong bấm \"Bắt đầu\" (hoặc \"Xem hướng dẫn đầy đủ\" để mở trang này) — popup chỉ hiện một lần." },
      { h: "Cần hỗ trợ thêm?" },
      { p: "Liên hệ Quản trị viên hệ thống hoặc gửi phản hồi qua mục Góp ý." },
    ]
  },
];

// Trả về danh sách "dòng chữ" của một mục hướng dẫn (title + mọi đoạn/gạch đầu dòng/ghi chú/bảng) để tìm kiếm.
export const sectionText = s => {
  const parts = [s.title];
  for (const b of (s.body || [])) {
    if (b.p) parts.push(b.p);
    if (b.h) parts.push(b.h);
    if (b.note) parts.push(b.note);
    if (b.ul) parts.push(...b.ul);
    if (b.ol) parts.push(...b.ol);
    if (b.table) { parts.push(...(b.table.head || [])); (b.table.rows || []).forEach(r => parts.push(r.join(" — "))); }
  }
  return parts;
};
