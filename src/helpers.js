import { FREQUENCIES } from "./constants";

export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().split("T")[0]; };
export const today = new Date(); today.setHours(0, 0, 0, 0);
export const todayStr = today.toISOString().split("T")[0];
export const nowStr = () => new Date().toLocaleString("vi-VN");
export const getNextDate = (from, freq) => { const d = new Date(from); if (freq === "monthly") d.setMonth(d.getMonth() + 1); else if (freq === "quarterly") d.setMonth(d.getMonth() + 3); else { const f = FREQUENCIES.find(x => x.value === freq); if (f) d.setDate(d.getDate() + f.days); } return d.toISOString().split("T")[0]; };
export const isCompletedLateByDate = t => { if (!t?.deadline || !t?.completed_at) return false; const dl = new Date(t.deadline); const ca = new Date(t.completed_at); if (isNaN(dl) || isNaN(ca)) return false; dl.setHours(0, 0, 0, 0); ca.setHours(0, 0, 0, 0); return ca > dl; };
export const getStatus = t => { const dl = new Date(t.deadline); dl.setHours(0, 0, 0, 0); const d = Math.ceil((dl - today) / 86400000); if (t.completed || t.progress === 100) { if (t.late_reason || isCompletedLateByDate(t)) return "completed_late"; return "completed"; } if (d < 0) return "overdue"; if (d <= 3) return "nearly_due"; return "on_time"; };
export const isCompletedStatus = s => s === "completed" || s === "completed_late";
export const isLateStatus = s => s === "overdue" || s === "completed_late";
export const parseJSON = (v, d = []) => { try { return JSON.parse(v || JSON.stringify(d)); } catch { return d; } };
export const hashPwd = async (pwd) => { const enc = new TextEncoder().encode(pwd); const buf = await crypto.subtle.digest("SHA-256", enc); return "h$" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""); };
export const isHashed = (s) => typeof s === "string" && s.startsWith("h$");
export const getFileIcon = n => { const e = n.split(".").pop().toLowerCase(); if (["jpg","jpeg","png","gif"].includes(e)) return "🖼️"; if (e === "pdf") return "📄"; if (["doc","docx"].includes(e)) return "📝"; if (["xls","xlsx"].includes(e)) return "📊"; return "📎"; };
