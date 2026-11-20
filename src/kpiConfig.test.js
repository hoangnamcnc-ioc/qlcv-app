import test from "node:test";
import assert from "node:assert/strict";
import { KPI_DEFAULT, kpiCfgFor, addKpiVersion, validateKpiCfg, normalizeKpiCfg, freqWeightCfg, validateKpiGlobal, normalizeKpiGlobal, KPI_GLOBAL_DEFAULT, rankMinMonths } from "./kpiConfig.js";
import { staffScore } from "./scoring.js";
import { FREQUENCIES } from "./constants.js";

const items = Array.from({ length: 10 }, (_, i) => ({ status: i < 8 ? "completed" : "overdue", weight: 1 }));

test("không có phiên bản → mặc định", () => { assert.deepEqual(kpiCfgFor([], 2026, 8), KPI_DEFAULT); });
test("phiên bản áp dụng từ tháng: tháng trước giữ hệ số cũ", () => {
  const v = addKpiVersion([], "2026-10", { ...KPI_DEFAULT, lateDayPenalty: 0.5 }, "x", "t");
  assert.equal(kpiCfgFor(v, 2026, 9).lateDayPenalty, 0.25);
  assert.equal(kpiCfgFor(v, 2026, 10).lateDayPenalty, 0.5);
  const v2 = addKpiVersion(v, "2026-12", { ...KPI_DEFAULT, lateDayPenalty: 1 }, "x", "t");
  assert.equal(kpiCfgFor(v2, 2026, 11).lateDayPenalty, 0.5);
  assert.equal(kpiCfgFor(v2, 2026, 12).lateDayPenalty, 1);
});
test("hệ số đổi → điểm đổi", () => {
  const late = [{ status: "completed_late", weight: 5, lateDays: 2 }];
  const a = staffScore(late, KPI_DEFAULT).perfScore, b = staffScore(late, { ...KPI_DEFAULT, lateDayPenalty: 0.1 }).perfScore;
  assert.ok(b > a);
  assert.equal(staffScore(items, { ...KPI_DEFAULT, minResolved: 20 }).eligible, false);
});
test("kiểm tra hợp lệ", () => {
  assert.deepEqual(validateKpiCfg(KPI_DEFAULT), []);
  assert.ok(validateKpiCfg({ ...KPI_DEFAULT, commonMax: 20 }).length > 0);
  assert.ok(validateKpiCfg({ ...KPI_DEFAULT, lateDayPenalty: 2 }).length > 0);
  assert.equal(normalizeKpiCfg({ lateDayPenalty: "abc" }).lateDayPenalty, 0.25);
  assert.equal(normalizeKpiCfg({ timelinessMax: 5 }).timelinessMax, undefined);
});
test("hệ số tần suất mặc định khớp FREQUENCIES", () => {
  for (const f of FREQUENCIES) assert.equal(freqWeightCfg(KPI_DEFAULT, f.value), f.weight);
});
test("kiểm tra mốc & ngưỡng xếp loại", () => {
  assert.deepEqual(validateKpiGlobal(KPI_GLOBAL_DEFAULT), []);
  assert.deepEqual([KPI_GLOBAL_DEFAULT.excellent, KPI_GLOBAL_DEFAULT.good, KPI_GLOBAL_DEFAULT.pass], [90, 70, 50]);
  assert.ok(validateKpiGlobal({ ...KPI_GLOBAL_DEFAULT, good: 95 }).length > 0);
  assert.ok(validateKpiGlobal({ ...KPI_GLOBAL_DEFAULT, gradingStart: "2026-13" }).length > 0);
  assert.equal(normalizeKpiGlobal({ excellent: "x" }).excellent, 90);
});
test("số tháng tối thiểu để xếp hạng năm", () => {
  const scope = (y, m) => y > 2026 || (y === 2026 && m >= 7);
  assert.equal(rankMinMonths(2026, new Date(2026, 10, 9), scope), 2);
  assert.equal(rankMinMonths(2026, new Date(2026, 6, 9), scope), 1);
  assert.equal(rankMinMonths(2026, new Date(2027, 0, 5), scope), 3);
});
