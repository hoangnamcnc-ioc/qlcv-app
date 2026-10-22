import test from "node:test";
import assert from "node:assert/strict";
import { buildDigests, scopeOf, vnToday, addDaysYMD, isWorkday, isValidEmail, esc } from "../api/_lib/digest.js";
import { buildDutyReminders, assignmentsOf, nameKey, sameName, stripWeekday } from "../api/_lib/duty.js";

const TODAY = "2026-10-22"; // Thứ Năm
const employees = [
  { id: "eS", name: "Nguyễn Văn Staff", dept: "HCTH", role: "Nhân viên" },
  { id: "eS2", name: "Trần Thị Hai", dept: "HCTH", role: "Nhân viên" },
  { id: "eM", name: "Lê Trưởng Phòng", dept: "HCTH", role: "Trưởng phòng" },
  { id: "eO", name: "Phạm Khác Phòng", dept: "HT-NTS", role: "Nhân viên" },
  { id: "eD", name: "Võ Giám Đốc", dept: "BGD", role: "Giám đốc", oversees_dept: "HCTH" },
  { id: "eD2", name: "Đỗ Phó GĐ", dept: "BGD", role: "Phó Giám đốc" }, // chưa được gán phòng
];
const users = [
  { id: "uS", username: "s", role: "staff", employee_id: "eS", email: "staff@x.vn", full_name: "Nguyễn Văn Staff" },
  { id: "uM", username: "m", role: "manager", employee_id: "eM", email: "tp@x.vn", full_name: "Lê Trưởng Phòng" },
  { id: "uD", username: "d", role: "director", employee_id: "eD", email: "gd@x.vn", full_name: "Võ Giám Đốc" },
  { id: "uD2", username: "d2", role: "director", employee_id: "eD2", email: "gd2@x.vn", full_name: "Đỗ Phó GĐ" },
  { id: "uA", username: "a", role: "admin", employee_id: null, email: "admin@x.vn", full_name: "Admin" },
  { id: "uNo", username: "n", role: "staff", employee_id: "eS2", email: "", full_name: "Không email" },
  { id: "uBad", username: "b", role: "staff", employee_id: "eO", email: "khong-hop-le", full_name: "Sai email" },
];
const T = (o) => ({ id: Math.random().toString(36).slice(2), title: "Việc", eid: "eS", dept: "HCTH", deadline: "2026-10-10", completed: false, ...o });
const tasks = [
  T({ title: "Quá hạn của staff", deadline: "2026-10-12" }),
  T({ title: "Hôm nay của staff", deadline: TODAY }),
  T({ title: "Sắp tới <b>staff</b>", deadline: "2026-10-24" }),
  T({ title: "Xa chưa tới", deadline: "2026-11-30" }),
  T({ title: "Việc người khác cùng phòng", eid: "eS2", deadline: "2026-10-01" }),
  T({ title: "Việc phòng khác", eid: "eO", dept: "HT-NTS", deadline: "2026-10-01" }),
  T({ title: "Đã xong", completed: true, deadline: "2026-10-01" }),
  T({ title: "Đã xoá", deleted: true, deadline: "2026-10-01" }),
  T({ title: "Hằng ngày", template_id: "rt", weight: 0.25, deadline: "2026-10-20" }),
  T({ title: "Chờ duyệt hoàn thành", eid: "eS2", deadline: "2026-10-05", completion_requested: true }),
  T({ title: "Nháp tự tạo", eid: "eS2", pending_create: true, deadline: "2026-10-30" }),
];
const run = (extra = {}) => buildDigests({ today: TODAY, users, employees, tasks, deptNames: { HCTH: "Hành chính tổng hợp" }, appUrl: "https://qlcv.example", ...extra });
const to = (out, email) => out.find(x => x.to === email);

test("tien ich ngay gio", () => {
  assert.equal(vnToday(Date.parse("2026-10-21T20:00:00Z")), "2026-10-22"); // 20h UTC = 3h sáng VN hôm sau
  assert.equal(addDaysYMD("2026-10-31", 1), "2026-11-01");
  assert.equal(isWorkday("2026-10-24"), false); // Thứ 7
  assert.equal(isWorkday("2026-10-22"), true);
  assert.equal(isWorkday("2026-10-22", ["2026-10-22"]), false); // ngày lễ
  assert.equal(isValidEmail("a@b.vn"), true); assert.equal(isValidEmail("a@b"), false);
  assert.equal(esc(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
});
test("scopeOf theo vai tro", () => {
  assert.deepEqual(scopeOf(users[0], employees[0]), { kind: "self", eid: "eS" });
  assert.deepEqual(scopeOf(users[1], employees[2]), { kind: "dept", depts: ["HCTH"] });
  assert.deepEqual(scopeOf(users[2], employees[4]), { kind: "dept", depts: ["HCTH"], overseer: true });
  assert.deepEqual(scopeOf(users[3], employees[5]), { kind: "none" }); // BGĐ chưa gán phòng
  assert.deepEqual(scopeOf(users[4], null), { kind: "none" });
});
test("nhan vien: chi viec cua minh, bo viec xong/xoa/hang ngay", () => {
  const d = to(run(), "staff@x.vn");
  assert.deepEqual(d.counts, { overdue: 1, escalated: 0, dueToday: 1, soon: 1, waiting: 0, pendingCreate: 0 });
  assert.ok(d.text.includes("Quá hạn của staff")); assert.ok(!d.text.includes("Xa chưa tới"));
  assert.ok(!d.text.includes("Việc người khác")); assert.ok(!d.text.includes("Hằng ngày")); assert.ok(!d.text.includes("Đã xong"));
  assert.match(d.subject, /1 việc quá hạn, 1 đến hạn hôm nay/);
});
test("HTML duoc escape (tieu de nguoi dung nhap)", () => {
  const d = to(run(), "staff@x.vn");
  assert.ok(d.html.includes("Sắp tới &lt;b&gt;staff&lt;/b&gt;")); assert.ok(!d.html.includes("<b>staff</b>"));
});
test("Truong phong: ca phong, co viec cho duyet + nhap tu tao, khong tinh phong khac", () => {
  const d = to(run(), "tp@x.vn");
  assert.equal(d.counts.overdue, 2);          // Quá hạn của staff + việc người khác cùng phòng (việc chờ duyệt không tính trễ)
  assert.equal(d.counts.waiting, 1); assert.equal(d.counts.pendingCreate, 1);
  assert.ok(!d.text.includes("Việc phòng khác"));
  assert.ok(d.text.includes("Trần Thị Hai"));  // hiện tên người thực hiện
  assert.match(d.subject, /Hành chính tổng hợp: 2 việc quá hạn, 1 đến hạn hôm nay, 2 chờ duyệt/);
});
test("Ban giam doc: phong duoc giao phu trach; chua gan phong thi khong nhan", () => {
  const out = run();
  const d = to(out, "gd@x.vn"); assert.equal(d.counts.overdue, 2); assert.ok(d.html.includes("Phòng bạn phụ trách"));
  assert.equal(to(out, "gd2@x.vn"), undefined);
});
test("khong email / email sai / admin khong co canh bao -> khong gui", () => {
  const out = run();
  assert.deepEqual(out.map(x => x.to).sort(), ["gd@x.vn", "staff@x.vn", "tp@x.vn"]);
});
test("admin + giam doc nhan canh bao lich truc sap het", () => {
  const out = run({ dutyLast: "2026-10-31" });
  const a = to(out, "admin@x.vn"); assert.ok(a); assert.match(a.subject, /lịch trực sắp hết/); assert.ok(a.text.includes("còn 9 ngày"));
  assert.ok(to(out, "gd2@x.vn")); // giám đốc chưa gán phòng vẫn nhận cảnh báo lịch trực
  assert.ok(to(out, "gd@x.vn").text.includes("Lịch trực chỉ còn đến 31/10"));
  assert.equal(run({ dutyLast: "2026-12-31" }).length, 3);
});
test("khong co viec nao -> khong gui email trong", () => {
  assert.deepEqual(buildDigests({ today: TODAY, users, employees, tasks: [], appUrl: "" }), []);
});
test("cat gioi han dong va nhac 'va N viec khac'", () => {
  const many = Array.from({ length: 14 }, (_, i) => T({ title: "Việc " + i, deadline: "2026-10-15" }));
  const d = to(buildDigests({ today: TODAY, users, employees, tasks: many }), "staff@x.vn");
  assert.equal(d.counts.overdue, 14); assert.ok(d.text.includes("… và 4 việc khác"));
});
test("viec tre >=14 ngay duoc nhan manh", () => {
  const d = to(buildDigests({ today: TODAY, users, employees, tasks: [T({ deadline: "2026-09-01" })] }), "staff@x.vn");
  assert.equal(d.counts.escalated, 1); assert.ok(d.html.includes("đã trễ từ 14 ngày"));
});

// ── Nhắc lịch trực ──
const duty = (date, o = {}) => ({ date, leader: "Võ Giám Đốc", dc: JSON.stringify([{ name: "Nguyễn Văn Staff", shiftIdx: 0 }, { name: "trần  thị hai", shiftIdx: 1 }]), ioc: JSON.stringify([{ name: "Lê Trưởng Phòng", shiftIdx: 0 }]), note: "", ...o });
test("lich truc ngay thuong: gio ca dung", () => {
  const a = assignmentsOf(duty("2026-10-23"), []);
  assert.ok(a.find(x => x.label === "Trực DC — Ca 1 (17h30 - 21h30)"));
  assert.ok(a.find(x => x.label === "Trực IOC — (17h30 - 21h30)"));
  assert.ok(a.find(x => x.label === "Trực lãnh đạo"));
});
test("lich truc cuoi tuan/le: gio ca khac", () => {
  assert.ok(assignmentsOf(duty("2026-10-24"), []).find(x => x.label === "Trực DC — Ca 1 (07h00 - 15h00)"));
  assert.ok(assignmentsOf(duty("2026-10-23"), ["2026-10-23"]).find(x => x.label === "Trực DC — Ca 1 (07h00 - 15h00)"));
});
test("nhac lich truc: khop ten (khong phan biet hoa/thuong/khoang trang), ca lanh dao", () => {
  const out = buildDutyReminders({ date: "2026-10-23", row: duty("2026-10-23"), users: [...users, { id: "uS2", role: "staff", employee_id: "eS2", email: "hai@x.vn", full_name: "Trần Thị Hai" }], employees });
  assert.deepEqual(out.map(x => x.to).sort(), ["gd@x.vn", "hai@x.vn", "staff@x.vn", "tp@x.vn"]);
  assert.deepEqual(out.find(x => x.to === "hai@x.vn").items, ["Trực DC — Ca 2 (21h30 - 01h30 (hôm sau))"]);
  assert.match(out[0].subject, /Ngày mai Thứ Sáu 23\/10/);
  assert.equal(nameKey("  Trần   THỊ Hai "), nameKey("trần thị hai"));
});
test("nhac lich truc: ngay khong co lich / khong co ai -> rong", () => {
  assert.deepEqual(buildDutyReminders({ date: "2026-10-23", row: null, users, employees }), []);
  assert.deepEqual(buildDutyReminders({ date: "2026-10-23", row: { date: "2026-10-23", leader: "", dc: "[]", ioc: "[]" }, users, employees }), []);
});

test("khop ten: bo dau, dau cau, viet tat, chu thu dinh o dau", () => {
  assert.ok(sameName("H'Lisa Bya", "H Lisa Byă"));
  assert.ok(sameName("Y Sơm Ê nuôl", "Y Sơm Êñuôl"));
  assert.ok(sameName("Phan Đ. V. Vinh Chuẩn", "Phan Đăng Việt Vinh Chuẩn"));
  assert.ok(sameName("Võ Nguyễn Hoàng Nam", stripWeekday("Bảy Võ Nguyễn Hoàng Nam")));
  assert.ok(sameName("Lê Xuân Quang", stripWeekday("Sáu Lê Xuân Quang")));
  assert.ok(!sameName("Lê Anh Tuấn", "Lê Quang Thanh"));         // khac nguoi
  assert.ok(!sameName("Nguyễn Vinh Quang", "Nguyễn Quang Tú"));
  assert.ok(!sameName("Phan Đ. V. Vinh Chuẩn", "Phan Văn Vinh Chuẩn")); // viet tat khong khop chu cai dau
  assert.equal(stripWeekday("Năm Nguyễn"), "Năm Nguyễn");            // ten ngan 2 tu: khong cat nham
  assert.equal(stripWeekday("Hai Võ Nguyễn Hoàng Nam"), "Võ Nguyễn Hoàng Nam");
});
test("nhac lich truc: nguoi bi ghi bien the ten van duoc nhac", () => {
  const emps = [{ id: "e1", name: "H'Lisa Bya", dept: "HCTH" }, { id: "e2", name: "Võ Nguyễn Hoàng Nam", dept: "BGD" }];
  const us = [{ id: "u1", role: "staff", employee_id: "e1", email: "h@x.vn", full_name: "H'Lisa Bya" }, { id: "u2", role: "director", employee_id: "e2", email: "n@x.vn", full_name: "Võ Nguyễn Hoàng Nam" }];
  const row = { date: "2026-10-24", leader: "Bảy Võ Nguyễn Hoàng Nam", dc: JSON.stringify([{ name: "H Lisa Byă", shiftIdx: 0 }]), ioc: "[]" };
  const out = buildDutyReminders({ date: "2026-10-24", row, users: us, employees: emps });
  assert.deepEqual(out.map(o => o.to).sort(), ["h@x.vn", "n@x.vn"]);
});
