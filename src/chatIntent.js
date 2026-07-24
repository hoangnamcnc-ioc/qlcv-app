// Bộ PHÂN LOẠI Ý ĐỊNH cho trợ lý chat — THUẦN, không phụ thuộc React/dữ liệu, để kiểm thử offline.
// Thay cho lối "khớp nhánh đầu tiên": bóc tách câu thành các "slot" (trạng thái/chỉ số/đối tượng/kiểu/
// thứ tự/ngưỡng) rồi CHẤM ĐIỂM mọi ý định, chọn ý định mạnh nhất. Ambiguous -> để nơi gọi hỏi lại.
const strip = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const has = (q, ...a) => a.some(w => q.includes(w));

export function extractSlots(raw) {
  const qn = " " + strip(raw) + " ";
  const status = has(qn, "cho duyet", "cho phe duyet", "phe duyet", "cho xet duyet", "dang cho duyet") ? "pending_approval"
    : has(qn, "qua han", "tre han", "tre hen") ? "overdue"
    : has(qn, "hoan thanh", "da xong", "hoan tat", "da hoan thanh", "lam xong") ? "completed"
    : has(qn, "dang lam", "dang thuc hien", "chua xong", "chua hoan thanh", "dang xu ly", "dang mo") ? "in_progress"
    : null;
  const wantList = has(qn, "danh sach", "liet ke", "nhung viec", "cac viec", "viec nao", "nhung nhiem vu", "cho xem", "xem cac", "gom nhung", "cac nhiem vu", "nhung cong viec", "liet ");
  // Bỏ "bao nhiêu" trước khi dò hướng (vì chứa "nhiều" nhưng là câu ĐẾM, không phải xếp hạng nhiều→ít).
  // "nhất" chỉ là dấu hiệu SO SÁNH NHẤT (superl), KHÔNG quyết định hướng — hướng do ít/nhiều/cao/thấp/tốt/kém.
  const qc = qn.replace(/bao nhieu/g, " ").replace(/con may/g, " ");
  const orderAsc = has(qc, " it ", "it nhat", "it viec", "thap", " kem", "yeu", "roi rai");
  const orderDesc = has(qc, "nhieu", " cao", " tot", "gioi", " top", "hang dau", "dung dau");
  const order = orderAsc && !orderDesc ? "asc" : orderDesc && !orderAsc ? "desc" : null;
  const metric = has(qn, "diem", "hieu suat") ? "score"
    : has(qn, "dung han", "dung hen", "tin cay") ? "ontime"
    : has(qn, "nhanh", " som", "toc do") ? "speed"
    : has(qn, "qua tai", "ban nhat", "om nhieu", "gong ganh", "dang ganh", "tai nhat") ? "load"
    : has(qn, "ranh", "nhan roi", "roi rai") ? "free"
    : null;
  // "ai/người" = XẾP theo NGƯỜI (ưu tiên hơn "phòng", vì "phòng" khi đó chỉ là bộ lọc)
  const subject = has(qn, " ai ", " ai?", "nguoi nao", "nhan vien nao", "em nao", "ai co", "ai la", "ai dang", "ai lam", "ai nhieu", "ai it", "ai tre") ? "people"
    : has(qn, "phong") ? "dept"
    : has(qn, "toan co quan", "co quan", "toan bo", " chung", "tong the") ? "org"
    : null;
  const late = has(qn, "tre", "qua han", "cham");
  const threshold = (() => { let m; if ((m = qn.match(/(hon|tren|lon hon|>=?|nhieu hon)\s*(\d+)/))) return { op: ">", n: +m[2] }; if ((m = qn.match(/(duoi|it hon|nho hon|<=?)\s*(\d+)/))) return { op: "<", n: +m[2] }; return null; })();
  return {
    status, wantList, order, metric, subject, late, threshold,
    countQ: has(qn, "bao nhieu", "con may", "may viec", "con bao nhieu", "so luong"),
    totalQ: has(qn, "tong so", "tong cong"),
    avg: has(qn, "trung binh", "binh quan"),
    rateChung: has(qn, "ty le") && has(qn, "chung", "co quan", "toan", "tong"),
    compare: has(qn, "so sanh", " vs "),
    guide: has(qn, "cach ", "lam sao", "lam the nao", "huong dan", "su dung", "o dau", "bang cach", "cach de", "dung the nao", "thao tac", "the nao de"),
    create: has(qn, "tao viec moi", "tao nhiem vu moi", "giao viec moi", "them viec moi", "muon tao viec", "tao mot viec", "mo form tao", "tao giup toi viec"),
    search: has(qn, "tim viec", "tim nhiem vu", "tra cuu", "co viec nao", "viec ve", "nhiem vu ve", "tim ", "mo viec", "xem viec", "nhac viec"),
    upcoming: has(qn, "sap tre", "sap het han", "nguy co", "sap qua han", "gan den han", "sap toi han", "sap den han"),
    superl: has(qn, "nhat", " top", "hang dau", "dung dau"),
    hasViec: has(qn, "viec", "nhiem vu"),
  };
}

// ctx: { personCount, hasDept } — nơi gọi nhận diện tên người/phòng thật rồi truyền vào.
export function classify(raw, ctx = {}) {
  const { personCount = 0, hasDept = false } = ctx;
  const s = extractSlots(raw);
  const sc = {};
  const add = (k, v) => { if (v > 0) sc[k] = (sc[k] || 0) + v; };
  const ranky = s.superl || s.order;

  if (s.guide) add("guide", 12);
  if (s.create) add("create", 12);
  if (s.compare && personCount >= 2) add("compare", 12);

  // LIỆT KÊ theo trạng thái
  if (s.status === "pending_approval") add("list", 9);
  else if (s.status) {
    if (s.wantList) add("list", 8);
    else if (hasDept || personCount >= 1) add("list", 7);
    else if (!ranky && s.subject !== "people") add("list", 4); // "việc quá hạn"
  }
  if (s.wantList && !s.status && s.hasViec && !s.metric) add("list", 3);

  // ĐẾM / TỔNG
  if (s.countQ) add("count", 6);
  if (s.totalQ) add("count", 6);

  // TỔNG HỢP
  if (s.avg) add("aggregate", 9);
  if (s.rateChung) add("aggregate", 9);

  // NGƯỠNG
  if (s.threshold) add("threshold", 8);

  // SẮP TRỄ
  if (s.upcoming) add("upcoming", 9);

  // XẾP HẠNG PHÒNG (chỉ khi "phòng" chung + có từ so sánh; phòng cụ thể = bộ lọc, không phải xếp hạng)
  const rankBase = (s.superl ? 3 : 0) + (s.order ? 2 : 0);
  if (s.subject === "dept" && !hasDept && ranky) {
    if (s.late) add("rank_dept_overdue", rankBase + 6);
    else add("rank_dept_rate", rankBase + 4);
  }
  // XẾP HẠNG NGƯỜI theo chỉ số
  if (s.metric) add("rank_people", rankBase + (ranky || s.subject === "people" ? 6 : 2));
  else if (s.late && s.subject !== "dept") add("rank_people", rankBase + (s.subject === "people" || ranky ? 5 : 1));
  else if (s.subject === "people" && ranky) add("rank_people", rankBase + 5);

  // TÌM VIỆC
  if (s.search) add("search", 4);

  // HỒ SƠ 1 NGƯỜI / 1 PHÒNG
  if (personCount >= 1) add("person", 4 + (!ranky && s.subject !== "people" ? 3 : 0));
  if (hasDept) add("dept_profile", 2 + (!s.late && !s.metric && !ranky && !s.status ? 2 : 0));

  const entries = Object.entries(sc).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return { kind: "unknown", slots: s, score: 0, second: null, ambiguous: false };
  const [topK, topS] = entries[0];
  const second = entries[1] ? { kind: entries[1][0], score: entries[1][1] } : null;
  const margin = topS - (second ? second.score : 0);
  return { kind: topK, slots: s, score: topS, second, ambiguous: margin <= 1 && topS < 7 };
}
