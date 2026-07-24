import { test } from "node:test";
import assert from "node:assert";
import { classify, extractSlots } from "./chatIntent.js";

// [câu hỏi, ctx, kind mong đợi, (tùy chọn) kiểm tra slot]
const CASES = [
  // How-to / tạo việc / tìm kiếm
  ["cách giao việc cho nhân viên", {}, "guide"],
  ["làm sao để yêu cầu hoàn thành", {}, "guide"],
  ["tôi muốn tạo việc mới", {}, "create"],
  ["tìm việc báo cáo ngân sách", {}, "search"],

  // Liệt kê theo trạng thái (3 ca người dùng báo sai)
  ["danh sách việc chờ duyệt", {}, "list", { status: "pending_approval" }],
  ["những việc chờ duyệt", {}, "list", { status: "pending_approval" }],
  ["việc chờ duyệt của phòng HCTH", { hasDept: true }, "list", { status: "pending_approval" }],
  ["danh sách việc quá hạn", {}, "list", { status: "overdue" }],
  ["liệt kê việc đang thực hiện", {}, "list", { status: "in_progress" }],
  ["các việc đã hoàn thành tháng 7", {}, "list", { status: "completed" }],
  ["việc quá hạn của phòng HCTH", { hasDept: true }, "list", { status: "overdue" }],
  ["việc quá hạn", {}, "list", { status: "overdue" }],

  // Đếm / tổng / trung bình / tỷ lệ
  ["có bao nhiêu việc quá hạn", {}, "count"],
  ["tổng số nhiệm vụ", {}, "count"],
  ["trung bình mỗi người bao nhiêu việc", {}, "aggregate"],
  ["tỷ lệ hoàn thành chung của cơ quan", {}, "aggregate"],

  // Ngưỡng
  ["ai có hơn 10 việc", {}, "threshold"],
  ["ai dưới 3 việc", {}, "threshold"],

  // Sắp trễ
  ["việc nào sắp trễ", {}, "upcoming"],
  ["các nhiệm vụ nguy cơ trễ hạn", {}, "upcoming"],

  // Xếp hạng phòng
  ["phòng nào nhiều việc quá hạn nhất", {}, "rank_dept_overdue"],
  ["phòng nào nhiều hoàn thành quá hạn nhất", {}, "rank_dept_overdue"],
  ["phòng nào tốt nhất", {}, "rank_dept_rate"],
  ["phòng nào hoàn thành kém nhất", {}, "rank_dept_rate"],

  // Xếp hạng người theo chỉ số
  ["ai trễ nhiều nhất", {}, "rank_people", { metric: null, late: true }],
  ["ai trễ nhiều nhất phòng HCTH", { hasDept: true }, "rank_people"],
  ["ai điểm cao nhất tháng 7", {}, "rank_people", { metric: "score" }],
  ["ai đúng hạn cao nhất", {}, "rank_people", { metric: "ontime" }],
  ["ai làm nhanh nhất", {}, "rank_people", { metric: "speed" }],
  ["ai đang quá tải nhất", {}, "rank_people", { metric: "load" }],
  ["ai đang rảnh", {}, "rank_people", { metric: "free" }],
  ["ai nhiều việc nhất", {}, "rank_people"],
  ["ai ít việc nhất", {}, "rank_people", { order: "asc" }],
  ["điểm tháng 7", {}, "rank_people", { metric: "score" }],

  // Hồ sơ 1 người / 1 phòng (khi nhận diện được tên)
  ["Trương Thanh Tài", { personCount: 1 }, "person"],
  ["điểm của Tài", { personCount: 1 }, "person"],
  ["số việc của Quyền tháng này", { personCount: 1 }, "person"],
  ["phòng HCTH", { hasDept: true }, "dept_profile"],

  // So sánh
  ["so sánh Tài với Quyền", { personCount: 2 }, "compare"],

  // Không hiểu
  ["hôm nay trời đẹp quá", {}, "unknown"],

  // ══ CÁCH DIỄN ĐẠT MỞ RỘNG (trước đây trợ lý hay không hiểu) ══
  // Quá tải — nhiều cách nói
  ["ai đang ngập việc nhất", {}, "rank_people", { metric: "load" }],
  ["ai ôm nặng nhất", {}, "rank_people", { metric: "load" }],
  ["nhân viên nào tải cao nhất", {}, "rank_people", { metric: "load" }],
  ["ai gánh nặng nhất", {}, "rank_people", { metric: "load" }],
  // Rảnh
  ["ai đang nhàn nhã", {}, "rank_people", { metric: "free" }],
  ["ai đang thong thả", {}, "rank_people", { metric: "free" }],
  // Điểm / xếp loại
  ["ai xếp loại cao nhất tháng 7", {}, "rank_people", { metric: "score" }],
  ["ai thành tích tốt nhất", {}, "rank_people", { metric: "score" }],
  ["ai năng suất cao nhất", {}, "rank_people", { metric: "score" }],
  // Đúng hạn / tốc độ
  ["ai giữ hạn tốt nhất", {}, "rank_people", { metric: "ontime" }],
  ["ai uy tín nhất về tiến độ", {}, "rank_people", { metric: "ontime" }],
  ["ai xử lý nhanh nhất", {}, "rank_people", { metric: "speed" }],
  // Trạng thái — cách nói khác
  ["việc bị trễ deadline", {}, "list", { status: "overdue" }],
  ["việc vượt hạn", {}, "list", { status: "overdue" }],
  ["danh sách việc đang triển khai", {}, "list", { status: "in_progress" }],
  ["việc đã chốt xong", {}, "list", { status: "completed" }],
  ["việc chờ lãnh đạo duyệt", {}, "list", { status: "pending_approval" }],
  ["việc chờ ký", {}, "list", { status: "pending_approval" }],
  // Sắp trễ
  ["việc nào gần deadline", {}, "upcoming"],
  ["nhiệm vụ sắp đáo hạn", {}, "upcoming"],
  // Ngưỡng — từ mới
  ["ai vượt 10 việc", {}, "threshold"],
  ["ai chưa tới 3 việc", {}, "threshold"],
  // Tạo / tìm
  ["lập việc mới giúp tôi", {}, "create"],
  ["khởi tạo việc", {}, "create"],
  ["có nhiệm vụ nào về ngân sách", {}, "search"],
  // Hướng dẫn — cách hỏi khác
  ["chỉ tôi cách chốt sổ điểm", {}, "guide"],
  ["chuyển văn bản ở mục nào", {}, "guide"],
  ["tôi phải làm gì để giao việc", {}, "guide"],
  // Xếp hạng phòng — từ mới
  ["phòng nào xuất sắc nhất", {}, "rank_dept_rate"],
  ["phòng nào dạo này làm ăn bết bát nhất", {}, "rank_dept_rate", { order: "asc" }],
  ["phòng nào yếu kém nhất", {}, "rank_dept_rate", { order: "asc" }],
  ["ai đang sa sút nhất", {}, "rank_people", { order: "asc" }],

  // ══ GHÉP ĐIỀU KIỆN (trạng thái + xếp hạng người) ══
  ["ai nhiều việc chờ duyệt nhất", {}, "rank_people", { status: "pending_approval" }],
  ["ai có nhiều việc quá hạn nhất", {}, "rank_people", { status: "overdue" }],
  ["việc quá hạn phòng HCTH do ai phụ trách", { hasDept: true }, "rank_people", { status: "overdue" }],
  ["ai đang làm nhiều việc nhất", {}, "rank_people", { status: "in_progress" }],
];

for (const [q, ctx, kind, slotCheck] of CASES) {
  test(`[${kind}] ${q}`, () => {
    const d = classify(q, ctx);
    assert.strictEqual(d.kind, kind, `"${q}" => ${d.kind} (điểm ${d.score}, nhì ${d.second ? d.second.kind + ":" + d.second.score : "-"})`);
    if (slotCheck) for (const [k, v] of Object.entries(slotCheck)) assert.strictEqual(d.slots[k], v, `slot ${k} của "${q}" = ${d.slots[k]}, mong ${v}`);
  });
}
