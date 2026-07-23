// Bộ "tự học" cho trợ lý chat — THUẦN THUẬT TOÁN, chạy trong trình duyệt (không dùng AI ngoài).
// Ý tưởng: mỗi lần người dùng bấm 👍/👎 (và "dạy lại" khi 👎) ta có 1 mẫu dữ liệu có nhãn.
// Từ kho mẫu đó dựng vector TF-IDF cho từng câu, rồi phân loại câu mới bằng k-lân-cận-gần-nhất (cosine).
// Câu mới GẦN một câu đã được "dạy lại" -> tự định tuyến sang câu đúng đó.
import { supabase } from "./supabase";

const strip = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const STOP = new Set(["la", "gi", "cho", "khi", "cua", "va", "voi", "co", "the", "nao", "o", "de", "cai", "nay", "toi", "minh", "muon", "ban", "hay", "di", "ma", "thi", "nhu", "cac", "nhung", "mot", "duoc", "khong", "cua"]);
const tokenize = q => strip(q).split(/[^a-z0-9]+/).filter(w => w.length >= 2 && !STOP.has(w));

// Dựng mô hình TF-IDF từ danh sách mẫu đã học.
// rows: [{ question, norm_q, corrected_q, feedback }]
export function buildModel(rows) {
  const docs = (rows || []).map(r => ({
    terms: tokenize(r.norm_q || r.question || ""),
    corrected: r.corrected_q || null,
    feedback: r.feedback || 0,
    raw: r.question || "",
  })).filter(d => d.terms.length);
  const df = new Map();
  for (const d of docs) for (const w of new Set(d.terms)) df.set(w, (df.get(w) || 0) + 1);
  const N = docs.length || 1;
  const idf = w => Math.log((N + 1) / ((df.get(w) || 0) + 1)) + 1;
  const vec = terms => {
    if (!terms.length) return new Map();
    const tf = new Map();
    for (const w of terms) tf.set(w, (tf.get(w) || 0) + 1);
    const v = new Map(); let norm = 0;
    for (const [w, c] of tf) { const val = (c / terms.length) * idf(w); v.set(w, val); norm += val * val; }
    norm = Math.sqrt(norm) || 1;
    for (const [w, val] of v) v.set(w, val / norm);
    return v;
  };
  const examples = docs.map(d => ({ ...d, v: vec(d.terms) }));
  return { examples, vec, size: docs.length };
}

function cosine(a, b) {
  let s = 0; const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [w, val] of small) { const o = big.get(w); if (o) s += val * o; }
  return s;
}

// Phân loại câu mới: trả về câu "dạy lại" gần nhất (nếu có) + điểm giống (0..1).
export function classify(model, question) {
  if (!model || !model.examples || !model.examples.length) return null;
  const qv = model.vec(tokenize(question));
  if (!qv.size) return null;
  let best = null, bs = 0;
  for (const ex of model.examples) { const s = cosine(qv, ex.v); if (s > bs) { bs = s; best = ex; } }
  if (!best) return null;
  return { score: bs, corrected: best.corrected, raw: best.raw, feedback: best.feedback };
}

export async function fetchLearning() {
  try {
    const { data, error } = await supabase
      .from("chat_learning")
      .select("question,norm_q,corrected_q,feedback")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function logInteraction({ username, question, intent, feedback, corrected }) {
  try {
    const row = {
      id: "cl" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      username: username || null,
      question,
      norm_q: strip(question),
      intent: intent || null,
      feedback: feedback || 0,
      corrected_q: corrected || null,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("chat_learning").insert(row);
    return !error;
  } catch { return false; }
}

export { strip as normQ, tokenize };
