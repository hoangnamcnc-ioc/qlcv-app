import "dotenv/config";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const EXPORT_JSON = process.argv.includes("--json");
const INCLUDE_SUSPECTS = process.argv.includes("--include-suspects");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;
const writePin = process.env.VITE_WRITE_PIN;

if (!supabaseUrl || !supabaseKey) {
  console.error("Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_KEY trong file .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: writePin ? { "x-write-pin": writePin } : {}
  }
});

function parseJSON(value, fallback = []) {
  try {
    if (Array.isArray(value)) return value;
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function dateOnly(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDateTimeVN(d) {
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN");
}

function parseVietnameseDateTime(raw) {
  if (!raw) return null;

  const str = String(raw).trim();

  // Native parse fallback, useful if data accidentally saved as ISO.
  const native = new Date(str);
  if (!Number.isNaN(native.getTime())) return native;

  // Common browser vi-VN formats:
  // "20:31:12 23/06/2026"
  // "20:31 23/06/2026"
  let m = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, hh, mi, ss = "0", dd, mo, yyyy] = m;
    return new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
  }

  // Other possible vi-VN format:
  // "23/06/2026, 20:31:12"
  // "23/06/2026 20:31:12"
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    const [, dd, mo, yyyy, hh, mi, ss = "0"] = m;
    return new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
  }

  // Date only:
  // "23/06/2026"
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, dd, mo, yyyy] = m;
    return new Date(Number(yyyy), Number(mo) - 1, Number(dd), 0, 0, 0);
  }

  return null;
}

function findLastCompletedEvent(task) {
  const history = parseJSON(task.history, []);

  const completedEvents = history
    .filter(h => String(h?.action || "").includes("Đánh dấu hoàn thành"))
    .map(h => ({ ...h, parsedAt: parseVietnameseDateTime(h?.at) }))
    .filter(h => h.parsedAt && !Number.isNaN(h.parsedAt.getTime()));

  if (!completedEvents.length) return null;

  // Use the last matching event in history order, because a task may be reopened and completed again.
  return completedEvents[completedEvents.length - 1];
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(fileName, rows) {
  const headers = [
    "id",
    "title",
    "dept",
    "eid",
    "deadline",
    "completed_at",
    "late_days",
    "has_late_reason",
    "late_reason",
    "late_note",
    "created",
    "created_by_name"
  ];

  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => csvEscape(r[h])).join(","))
  ];

  fs.writeFileSync(fileName, "\uFEFF" + lines.join("\n"), "utf8");
}

async function main() {
  console.log(APPLY ? "CHẾ ĐỘ CẬP NHẬT THẬT (--apply)" : "CHẾ ĐỘ PREVIEW - chưa cập nhật dữ liệu");

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*");

  if (error) {
    console.error("Lỗi tải tasks:", error.message);
    process.exit(1);
  }

  const candidates = [];
  const alreadyMarkedLate = [];
  const suspectsNoHistory = [];
  const ignored = [];

  for (const task of tasks || []) {
    const isCompleted = task.completed === true || Number(task.progress || 0) === 100;
    if (!isCompleted || !task.deadline) continue;

    const deadline = dateOnly(task.deadline);
    if (!deadline) {
      ignored.push({ id: task.id, title: task.title, reason: "deadline không đọc được" });
      continue;
    }

    const completedEvent = findLastCompletedEvent(task);

    if (!completedEvent) {
      // Suspicious only: completed now + deadline before today, but no completion timestamp in history.
      const today = dateOnly(new Date());
      if (today && deadline < today) {
        suspectsNoHistory.push({
          id: task.id,
          title: task.title,
          dept: task.dept,
          eid: task.eid,
          deadline: task.deadline,
          reason: "Đã hoàn thành nhưng không tìm thấy lịch sử 'Đánh dấu hoàn thành' để so sánh",
          has_late_reason: Boolean(task.late_reason),
          late_reason: task.late_reason || "",
          late_note: task.late_note || ""
        });
      }
      continue;
    }

    const completedDate = dateOnly(completedEvent.parsedAt);
    if (!completedDate) continue;

    const lateDays = Math.round((completedDate - deadline) / 86400000);
    const isLate = lateDays > 0;

    if (!isLate) continue;

    const row = {
      id: task.id,
      title: task.title || "",
      dept: task.dept || "",
      eid: task.eid || "",
      deadline: task.deadline || "",
      completed_at: formatDateTimeVN(completedEvent.parsedAt),
      late_days: lateDays,
      has_late_reason: Boolean(task.late_reason),
      late_reason: task.late_reason || "",
      late_note: task.late_note || "",
      created: task.created || "",
      created_by_name: task.created_by_name || task.created_by || ""
    };

    if (task.late_reason) alreadyMarkedLate.push(row);
    else candidates.push(row);
  }

  writeCsv("completed-late-preview.csv", candidates);
  writeCsv("completed-late-already-marked.csv", alreadyMarkedLate);
  writeCsv("completed-late-suspects-no-history.csv", suspectsNoHistory);

  if (EXPORT_JSON) {
    fs.writeFileSync("completed-late-preview.json", JSON.stringify({ candidates, alreadyMarkedLate, suspectsNoHistory, ignored }, null, 2), "utf8");
  }

  console.log("\n===== KẾT QUẢ PREVIEW =====");
  console.log("Tổng số tasks tải về:", (tasks || []).length);
  console.log("Ứng viên hoàn thành quá hạn CHƯA có late_reason:", candidates.length);
  console.log("Đã có late_reason từ trước:", alreadyMarkedLate.length);
  console.log("Nghi ngờ nhưng thiếu history hoàn thành:", suspectsNoHistory.length);
  console.log("Bị bỏ qua do dữ liệu lỗi:", ignored.length);

  console.log("\nFile đã xuất:");
  console.log("- completed-late-preview.csv");
  console.log("- completed-late-already-marked.csv");
  console.log("- completed-late-suspects-no-history.csv");
  if (EXPORT_JSON) console.log("- completed-late-preview.json");

  if (candidates.length) {
    console.log("\nTop 20 ứng viên sẽ cập nhật nếu chạy --apply:");
    console.table(candidates.slice(0, 20).map(x => ({
      id: x.id,
      title: x.title?.slice(0, 45),
      deadline: x.deadline,
      completed_at: x.completed_at,
      late_days: x.late_days
    })));
  }

  if (!APPLY) {
    console.log("\nChưa cập nhật dữ liệu. Nếu đã kiểm tra CSV và đồng ý, chạy:");
    console.log("node fix-completed-late-preview.js --apply");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const row of candidates) {
    const lateNote =
      `Tự động rà soát: nhiệm vụ hoàn thành sau hạn ${row.late_days} ngày. ` +
      `Deadline: ${row.deadline}. ` +
      `Hoàn thành theo lịch sử: ${row.completed_at}.`;

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        late_reason: "other",
        late_note: lateNote
      })
      .eq("id", row.id)
      // Extra safety: do not overwrite if someone has already entered a late reason during the preview.
      .is("late_reason", null);

    if (updateError) {
      failed++;
      console.error(`Lỗi cập nhật ${row.id}:`, updateError.message);
    } else {
      updated++;
      console.log(`Đã cập nhật ${updated}/${candidates.length}: ${row.title}`);
    }
  }

  console.log("\n===== KẾT QUẢ CẬP NHẬT =====");
  console.log("Đã cập nhật:", updated);
  console.log("Lỗi:", failed);

  if (INCLUDE_SUSPECTS && suspectsNoHistory.length) {
    console.log("\nBạn bật --include-suspects nhưng script KHÔNG tự cập nhật nhóm thiếu history để tránh sai dữ liệu.");
    console.log("Hãy rà file completed-late-suspects-no-history.csv thủ công trước.");
  }
}

main().catch(err => {
  console.error("Lỗi không mong muốn:", err);
  process.exit(1);
});
