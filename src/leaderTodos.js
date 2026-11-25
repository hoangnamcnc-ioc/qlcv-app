// VIỆC LÃNH ĐẠO CẦN THỰC HIỆN — danh sách nhắc khi Trưởng/Phó phòng, Ban Giám đốc, Admin đăng nhập. Hàm thuần, có test.
import { roundTotal } from "./kpiFramework.js";

export const LEADER_ROLES_USER = ["admin", "director", "manager", "deputy_manager", "manager_hcth"];
export const isLeaderUser = role => LEADER_ROLES_USER.includes(role);
const parse = v => { if (!v) return null; if (typeof v === "object") return v; try { return JSON.parse(v); } catch { return null; } };
const hasRound = (rows, eid, y, m, round) => (rows || []).some(r => r.eid === eid && r.year === y && r.month === m && roundTotal(parse(r[round])) != null);
const wasActiveIn = (e, y, m1) => !e.left_at || e.left_at >= `${y}-${String(m1).padStart(2, "0")}-01`;

// p = { role, me (nhân viên của người đăng nhập), employees, kpiCommon, monthlyScores, now: Date,
//       counts: { approve, createApprove, ext, unrated, overdue }, proposals, templatesMissing, overloaded, inGradingScope }
// Trả về [{ key, icon, text, count, tone: "red"|"amber"|"blue", go: { view, personnelTab?, repTab? } }]
export function leaderTodos(p) {
  if (!isLeaderUser(p.role)) return [];
  const out = [];
  const full = p.role === "admin" || p.role === "director";
  const add = (key, icon, text, count, tone, go) => { if (count > 0) out.push({ key, icon, text, count, tone, go }); };
  const c = p.counts || {};
  add("approve", "📨", "nhiệm vụ nhân viên báo hoàn thành đang chờ bạn duyệt và chấm mức nghiệm thu", c.approve, "red", { view: "myqueue" });
  add("create", "🆕", "việc nhân viên tự tạo đang chờ bạn duyệt", c.createApprove, "red", { view: "myqueue" });
  add("ext", "⏳", "đề nghị gia hạn đang chờ bạn quyết định", c.ext, "amber", { view: "myqueue" });
  add("unrated", "⭐", "việc đã hoàn thành chưa được chấm mức nghiệm thu (ảnh hưởng điểm chất lượng KPI)", c.unrated, "amber", { view: "myqueue" });
  add("overdue", "🔴", "việc đang quá hạn trong phạm vi bạn quản lý — cần đôn đốc hoặc xử lý", c.overdue, "red", { view: "work" });

  // Tháng trước: chấm tiêu chí chung, chốt sổ điểm
  const now = p.now || new Date();
  const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const pm = now.getMonth() === 0 ? 12 : now.getMonth(); // tháng trước (1–12)
  const label = `T${pm}/${py}`;
  const people = (p.employees || []).filter(e => !e.no_kpi && wasActiveIn(e, py, pm));
  if (p.me && !hasRound(p.kpiCommon, p.me.id, py, pm, "self")) add("self", "📝", `bản thân chưa tự chấm tiêu chí chung ${label}`, 1, "blue", { view: "employees", personnelTab: "common" });
  if (p.role !== "admin" && p.me && p.role !== "director") {
    const mine = people.filter(e => e.dept === p.me.dept && e.id !== p.me.id && !hasRound(p.kpiCommon, e.id, py, pm, "dept"));
    add("dept", "📝", `nhân viên trong phòng chưa được bạn chấm tiêu chí chung ${label}`, mine.length, "amber", { view: "employees", personnelTab: "common" });
  }
  if (full) {
    const todo = people.filter(e => !hasRound(p.kpiCommon, e.id, py, pm, "center"));
    add("center", "📝", `người chưa có lượt chấm tiêu chí chung của lãnh đạo Trung tâm ${label}`, todo.length, "amber", { view: "employees", personnelTab: "common" });
    const sealed = (p.monthlyScores || []).some(r => r.year === py && r.month === pm);
    if (!sealed && (p.inGradingScope ? p.inGradingScope(py, pm) : true)) add("seal", "🔒", `tháng ${label} chưa chốt sổ điểm — nên chốt để điểm không đổi khi dữ liệu bị sửa`, 1, "amber", { view: "reports", repTab: "grading" });
    add("proposals", "📚", "đề xuất sản phẩm mới (việc ngoài danh mục) chờ bạn xem xét đưa vào danh mục", p.proposals, "blue", { view: "employees", personnelTab: "catalog" });
  }
  add("templates", "🔄", "mẫu việc định kỳ chưa gắn sản phẩm chuẩn (hệ số KPI đang tính tạm theo tần suất)", p.templatesMissing, "blue", { view: "work" });
  add("overload", "⚖️", "nhân viên đang gánh khối lượng tháng này từ ×1,5 trung vị phòng — cân nhắc cân bằng", p.overloaded, "amber", { view: "employees", personnelTab: "balance" });
  return out;
}
