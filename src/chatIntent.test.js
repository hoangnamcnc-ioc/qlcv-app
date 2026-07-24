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
];

for (const [q, ctx, kind, slotCheck] of CASES) {
  test(`[${kind}] ${q}`, () => {
    const d = classify(q, ctx);
    assert.strictEqual(d.kind, kind, `"${q}" => ${d.kind} (điểm ${d.score}, nhì ${d.second ? d.second.kind + ":" + d.second.score : "-"})`);
    if (slotCheck) for (const [k, v] of Object.entries(slotCheck)) assert.strictEqual(d.slots[k], v, `slot ${k} của "${q}" = ${d.slots[k]}, mong ${v}`);
  });
}
