import test from "node:test";
import assert from "node:assert/strict";
import { normTokens, similarity, overlap, suggestDuration, suggestDeadline } from "./deadlineSuggest.js";
import { sanitizeDraft } from "./aiDraft.js";

const mk = (title, created, completed_at) => ({ title, created, completed_at });
test("similarity: giong nhau cao, khac nhau thap", () => {
  const a = normTokens("Báo cáo tình hình sử dụng điện tại IOC"), b = normTokens("Báo cáo tình hình điện IOC tháng 9");
  assert.ok(similarity(a, b) > 0.4);
  assert.ok(similarity(a, normTokens("Mua sắm camera phòng máy chủ")) < 0.1);
});
test("suggestDuration: trung vi thoi gian lam cac viec tuong tu", () => {
  const pool = [
    mk("Báo cáo tình hình sử dụng điện IOC", "2026-09-01", "2026-09-05T08:00:00+00:00"),  // 4
    mk("Báo cáo tình hình điện IOC tháng 8", "2026-08-01", "2026-08-07T08:00:00+00:00"),  // 6
    mk("Báo cáo sử dụng điện tại IOC", "2026-07-01", "2026-07-06T08:00:00+00:00"),        // 5
    mk("Mua sắm camera", "2026-07-01", "2026-07-30T08:00:00+00:00"),                       // khac chu de
  ];
  assert.deepEqual(suggestDuration("Báo cáo tình hình điện IOC tháng 10", pool), { days: 5, n: 3 });
});
test("suggestDuration: khong du du lieu -> null", () => {
  assert.equal(suggestDuration("Báo cáo điện IOC", [mk("Báo cáo điện IOC", "2026-09-01", "2026-09-04T00:00:00Z")]), null);
  assert.equal(suggestDuration("ab", []), null);
});
test("suggestDeadline: bo qua cuoi tuan", () => {
  assert.equal(suggestDeadline("2026-10-22", 3), "2026-10-26"); // T5 + 3 = T Bay -> Thu Hai
  assert.equal(suggestDeadline("2026-10-22", 1), "2026-10-23");
});
test("sanitizeDraft: lam sach nhap AI", () => {
  const d = sanitizeDraft({ title: " Báo cáo X ", description: "mô tả", deadline: "2026-10-30", prio: "high", subtasks: ["a", "", "b", 5] }, "2026-10-22");
  assert.deepEqual(d, { title: "Báo cáo X", description: "mô tả", deadline: "2026-10-30", prio: "high", subtasks: ["a", "b"] });
  assert.equal(sanitizeDraft({ title: "x", deadline: "2026-10-01" }, "2026-10-22").deadline, "");     // da qua -> bo
  assert.equal(sanitizeDraft({ title: "x", deadline: "khong phai ngay" }, "2026-10-22").deadline, ""); // sai dinh dang
  assert.equal(sanitizeDraft({ title: "x", prio: "urgent" }, "2026-10-22").prio, "medium");
  assert.equal(sanitizeDraft({}, "2026-10-22"), null);
  assert.equal(sanitizeDraft(null, "2026-10-22"), null);
  assert.equal(sanitizeDraft({ title: "x", subtasks: Array(20).fill("b") }, "2026-10-22").subtasks.length, 8);
});

test("overlap: tieu de gan ngan khong bi loang boi tieu de goc dai", () => {
  const q = normTokens("Hoàn thiện hồ sơ thủ tục thanh lý hợp đồng năm 2025 theo quy định");
  const longT = normTokens("Hoàn thiện hồ sơ thủ tục thanh lý hợp đồng năm 2025 theo quy định đối với 02 nhiệm vụ: Thuê dịch vụ công nghệ thông tin: Phân hệ công khai kế hoạch, quy hoạch tích hợp vào ứng dụng Đắk Lắk trực tuyến");
  assert.ok(similarity(q, longT) < 0.5);          // Jaccard thap vi tieu de goc dai
  assert.ok(overlap(q, longT).score > 0.9);        // do phu cao
  assert.equal(overlap(normTokens("Báo cáo"), normTokens("Báo cáo tháng")).inter, 2); // it tu chung -> khong du minInter
});
test("suggestDuration: tieu de ngan khong khop bua", () => {
  const pool = [mk("Báo cáo tuần", "2026-09-01", "2026-09-03T00:00:00Z"), mk("Báo cáo tháng", "2026-09-01", "2026-09-03T00:00:00Z"), mk("Báo cáo năm", "2026-09-01", "2026-09-03T00:00:00Z")];
  assert.equal(suggestDuration("Báo cáo", pool), null);
});
