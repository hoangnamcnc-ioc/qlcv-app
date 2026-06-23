import "dotenv/config";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

/**
 * Script: update-completed-at.js
 *
 * Mục đích:
 * - Rà soát bảng tasks.
 * - Với nhiệm vụ đã hoàn thành nhưng chưa có completed_at,
 *   đọc history để tìm lần "Đánh dấu hoàn thành" cuối cùng.
 * - Preview trước, chỉ cập nhật khi chạy kèm --apply.
 *
 * Cách chạy preview:
 *   node update-completed-at.js
 *
 * Cách cập nhật thật:
 *   node update-completed-at.js --apply
 *
 * Xuất thêm JSON:
 *   node update-completed-at.js --json
 */

const APPLY = process.argv.includes("--apply");
const EXPORT_JSON = process.argv.includes("--json");
const OVERWRITE = process.argv.includes("--overwrite");

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

function parseVietnameseDateTime(raw) {
  if (!raw) return null;

  const str = String(raw).trim();

  // Nếu dữ liệu là ISO hoặc dạng Date parse được trực tiếp.
  const native = new Date(str);
  if (!Number.isNaN(native.getTime())) return native;

  // Dạng thường gặp từ nowStr(): "20:31:12 23/06/2026" hoặc "20:31 23/06/2026"
  let m = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, hh, mi, ss = "0", dd, mo, yyyy] = m;
    return new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
  }

  // Dạng có dấu phẩy: "23/06/2026, 20:31:12" hoặc "23/06/2026 20:31:12"
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    const [, dd, mo, yyyy, hh, mi, ss = "0"] = m;
    return new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
  }

  // Dạng chỉ có ngày: "23/06/2026"
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
    .map(h => ({
      action: h?.action || "",
      by: h?.by || "",
      at: h?.at || "",
      parsedAt: parseVietnameseDateTime(h?.at)
    }))
    .filter(h => h.parsedAt && !Number.isNaN(h.parsedAt.getTime()));

  if (!completedEvents.length) return null;

  // Lấy lần hoàn thành cuối cùng, phòng trường hợp nhiệm vụ từng bỏ hoàn thành rồi hoàn thành lại.
  return completedEvents[completedEvents.length - 1];
}

function toISO(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatVN(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN");
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
    "current_completed_at",
    "new_completed_at_iso",
    "new_completed_at_vn",
    "completed_by",
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
  if (OVERWRITE) console.log("Có bật --overwrite: sẽ ghi đè completed_at cũ nếu chạy --apply.");

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*");

  if (error) {
    console.error("Lỗi tải tasks:", error.message);
    process.exit(1);
  }

  const candidates = [];
  const skippedAlreadyHasCompletedAt = [];
  const skippedNoHistory = [];
  const skippedNotCompleted = [];

  for (const task of tasks || []) {
    const isCompleted = task.completed === true || Number(task.progress || 0) === 100;

    if (!isCompleted) {
      skippedNotCompleted.push({ id: task.id, title: task.title || "" });
      continue;
    }

    if (task.completed_at && !OVERWRITE) {
      skippedAlreadyHasCompletedAt.push({
        id: task.id,
        title: task.title || "",
        completed_at: task.completed_at
      });
      continue;
    }

    const completedEvent = findLastCompletedEvent(task);

    if (!completedEvent) {
      skippedNoHistory.push({
        id: task.id,
        title: task.title || "",
        deadline: task.deadline || "",
        current_completed_at: task.completed_at || "",
        reason: "Không tìm thấy action 'Đánh dấu hoàn thành' trong history"
      });
      continue;
    }

    candidates.push({
      id: task.id,
      title: task.title || "",
      dept: task.dept || "",
      eid: task.eid || "",
      deadline: task.deadline || "",
      current_completed_at: task.completed_at || "",
      new_completed_at_iso: toISO(completedEvent.parsedAt),
      new_completed_at_vn: formatVN(completedEvent.parsedAt),
      completed_by: completedEvent.by || "",
      created: task.created || "",
      created_by_name: task.created_by_name || task.created_by || ""
    });
  }

  writeCsv("completed-at-preview.csv", candidates);
  writeCsv("completed-at-skipped-already-has-value.csv", skippedAlreadyHasCompletedAt);
  writeCsv("completed-at-skipped-no-history.csv", skippedNoHistory);

  if (EXPORT_JSON) {
    fs.writeFileSync(
      "completed-at-preview.json",
      JSON.stringify({
        candidates,
        skippedAlreadyHasCompletedAt,
        skippedNoHistory,
        skippedNotCompleted
      }, null, 2),
      "utf8"
    );
  }

  console.log("\n===== KẾT QUẢ PREVIEW =====");
  console.log("Tổng số tasks tải về:", (tasks || []).length);
  console.log("Có thể cập nhật completed_at:", candidates.length);
  console.log("Bỏ qua vì đã có completed_at:", skippedAlreadyHasCompletedAt.length);
  console.log("Bỏ qua vì không tìm thấy history hoàn thành:", skippedNoHistory.length);
  console.log("Bỏ qua vì chưa hoàn thành:", skippedNotCompleted.length);

  console.log("\nFile đã xuất:");
  console.log("- completed-at-preview.csv");
  console.log("- completed-at-skipped-already-has-value.csv");
  console.log("- completed-at-skipped-no-history.csv");
  if (EXPORT_JSON) console.log("- completed-at-preview.json");

  if (candidates.length) {
    console.log("\nTop 20 dòng sẽ cập nhật nếu chạy --apply:");
    console.table(candidates.slice(0, 20).map(x => ({
      id: x.id,
      title: x.title.slice(0, 45),
      deadline: x.deadline,
      completed_at: x.new_completed_at_vn,
      by: x.completed_by
    })));
  }

  if (!APPLY) {
    console.log("\nChưa cập nhật dữ liệu. Nếu đã kiểm tra CSV và đồng ý, chạy:");
    console.log("node update-completed-at.js --apply");
    console.log("\nNếu muốn ghi đè completed_at cũ, chạy:");
    console.log("node update-completed-at.js --apply --overwrite");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const row of candidates) {
    let query = supabase
      .from("tasks")
      .update({ completed_at: row.new_completed_at_iso })
      .eq("id", row.id);

    // An toàn: không ghi đè nếu completed_at đã được nhập sau lúc preview.
    if (!OVERWRITE) query = query.is("completed_at", null);

    const { error: updateError } = await query;

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
}

main().catch(err => {
  console.error("Lỗi không mong muốn:", err);
  process.exit(1);
});
