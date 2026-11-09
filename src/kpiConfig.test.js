import test from "node:test";
import assert from "node:assert/strict";
import { KPI_DEFAULT, kpiCfgFor, addKpiVersion, validateKpiCfg, normalizeKpiCfg } from "./kpiConfig.js";
import { staffScore, managerScore } from "./scoring.js";

const mk = (n, status, rating = "tot") => Array.from({ length: n }, () => ({ status, rating, weight: 1 }));
const items = [...mk(8, "completed"), ...mk(3, "completed_late"), ...mk(2, "overdue")];

test("không có phiên bản → dùng mặc định; cfg mặc định cho kết quả như cũ", () => {
  assert.deepEqual(kpiCfgFor([], 2026, 8), KPI_DEFAULT);
  assert.equal(staffScore(items).perfScore, staffScore(items, KPI_DEFAULT).perfScore);
});
test("phiên bản áp dụng từ tháng: tháng trước giữ hệ số cũ", () => {
  const v = addKpiVersion([], "2026-10", { ...KPI_DEFAULT, lateFactor: 0 }, "x", "t");
  assert.equal(kpiCfgFor(v, 2026, 9).lateFactor, 0.5);
  assert.equal(kpiCfgFor(v, 2026, 10).lateFactor, 0);
  assert.equal(kpiCfgFor(v, 2027, 1).lateFactor, 0);
  const v2 = addKpiVersion(v, "2026-12", { ...KPI_DEFAULT, lateFactor: 1 }, "x", "t");
  assert.equal(kpiCfgFor(v2, 2026, 11).lateFactor, 0);
  assert.equal(kpiCfgFor(v2, 2026, 12).lateFactor, 1);
});
test("hệ số đổi → điểm đổi đúng hướng", () => {
  const base = staffScore(items).perfScore;
  assert.ok(staffScore(items, { ...KPI_DEFAULT, lateFactor: 0 }).perfScore < base);
  assert.ok(staffScore(items, { ...KPI_DEFAULT, lateFactor: 1 }).perfScore > base);
  assert.equal(staffScore(items, { ...KPI_DEFAULT, minResolved: 20 }).eligible, false);
  assert.ok(managerScore(items, 1, null, { ...KPI_DEFAULT, overduePenaltyMax: 30 }).perfScore < managerScore(items, 1).perfScore);
});
test("kiểm tra hợp lệ", () => {
  assert.deepEqual(validateKpiCfg(KPI_DEFAULT), []);
  assert.ok(validateKpiCfg({ ...KPI_DEFAULT, timelinessMax: 80, qualityMax: 40 }).length > 0);
  assert.ok(validateKpiCfg({ ...KPI_DEFAULT, lateFactor: 2 }).length > 0);
  assert.equal(normalizeKpiCfg({ lateFactor: "abc", qualityMax: 30 }).lateFactor, 0.5);
  assert.equal(normalizeKpiCfg({ qualityMax: 30 }).qualityMax, 30);
});

import { freqWeightCfg, validateKpiGlobal, normalizeKpiGlobal, KPI_GLOBAL_DEFAULT } from "./kpiConfig.js";
import { FREQUENCIES } from "./constants.js";
test("hệ số tần suất mặc định khớp FREQUENCIES hiện tại", () => {
  for (const f of FREQUENCIES) assert.equal(freqWeightCfg(KPI_DEFAULT, f.value), f.weight);
  assert.equal(freqWeightCfg({ ...KPI_DEFAULT, freq_daily: 0.5 }, "daily"), 0.5);
});
test("kiểm tra mốc & ngưỡng xếp loại", () => {
  assert.deepEqual(validateKpiGlobal(KPI_GLOBAL_DEFAULT), []);
  assert.ok(validateKpiGlobal({ ...KPI_GLOBAL_DEFAULT, good: 95 }).length > 0);
  assert.ok(validateKpiGlobal({ ...KPI_GLOBAL_DEFAULT, gradingStart: "2026-13" }).length > 0);
  assert.equal(normalizeKpiGlobal({ excellent: "x" }).excellent, 90);
});
