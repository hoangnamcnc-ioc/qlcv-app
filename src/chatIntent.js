// Bộ PHÂN LOẠI Ý ĐỊNH cho trợ lý chat — THUẦN, không phụ thuộc React/dữ liệu, để kiểm thử offline.
// Thay cho lối "khớp nhánh đầu tiên": bóc tách câu thành các "slot" (trạng thái/chỉ số/đối tượng/kiểu/
// thứ tự/ngưỡng) rồi CHẤM ĐIỂM mọi ý định, chọn ý định mạnh nhất. Ambiguous -> để nơi gọi hỏi lại.
const strip = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const has = (q, ...a) => a.some(w => q.includes(w));

// ── TỪ ĐIỂN ĐỒNG NGHĨA TẬP TRUNG (dạng đã bỏ dấu) ──────────────────────────────────────────────
// Gom mọi cách nói về 1 chỗ để dễ mở rộng: muốn trợ lý hiểu thêm cách diễn đạt → chỉ thêm từ vào đây,
// KHÔNG phải sửa logic bên dưới. Khi admin "dạy lại" 1 câu hỏi, có thể lấy từ mới bổ sung vào các mảng này.
const LEX = {
  pending: ["cho duyet", "cho phe duyet", "phe duyet", "cho xet duyet", "dang cho duyet", "cho ky", "cho thong qua", "cho lanh dao", "cho tp duyet", "cho truong phong", "cho duyet hoan thanh", "yeu cau duyet", "xin duyet", "cho chap thuan", "cho nghiem thu"],
  overdue: ["qua han", "tre han", "tre hen", "tre deadline", "qua deadline", "bi tre", "vuot han", "loi hen", "cham han", "qua hen", "tre mat", "het han", "tre hsan", "cham deadline"],
  completed: ["hoan thanh", "da xong", "hoan tat", "da hoan thanh", "lam xong", "xong roi", "da lam xong", "ket thuc", "chot xong", "hoan thanh xong", "da hoan tat", "lam het", "da chot"],
  inProgress: ["dang lam", "dang thuc hien", "chua xong", "chua hoan thanh", "dang xu ly", "dang mo", "dang trien khai", "dang chay", "con dang", "dang tien hanh", "chua lam xong", "dang giai quyet", "con do"],
  wantList: ["danh sach", "liet ke", "nhung viec", "cac viec", "viec nao", "nhung nhiem vu", "cho xem", "xem cac", "gom nhung", "cac nhiem vu", "nhung cong viec", "liet ", "cho toi xem", "xem het", "xem toan bo", "ke ra", "diem qua", "diem danh"],
  orderAsc: [" it ", "it nhat", "it viec", "thap", " kem", "yeu", "roi rai", "te nhat", "do nhat", "kem nhat", "thap nhat", "dung cuoi", "cuoi bang", "bet nhat", "yeu nhat", "chot bang", "bet bat", "sa sut", "yeu kem", "kem coi", "lam an kem", "te hai", "di xuong", "tut hau", "lang le"],
  orderDesc: ["nhieu", " cao", " tot", "gioi", " top", "hang dau", "dung dau", "manh nhat", "xuat sac", "vuot troi", "dan dau", "gioi nhat", "cao nhat", "tot nhat", "nhieu nhat", "lon nhat", "dinh nhat", "so mot", "so 1", "lam an tot", "khoi sac", "an nen"],
  score: ["diem", "hieu suat", "xep loai", "thanh tich", "danh gia", "nang suat", "ket qua lam viec"],
  ontime: ["dung han", "dung hen", "tin cay", "giu han", "dam bao tien do", "uy tin", "khong tre", "dung tien do", "dung deadline"],
  speed: ["nhanh", " som", "toc do", "xu ly nhanh", "giai quyet nhanh", "lam nhanh", "hoan thanh som", "mau chong"],
  load: ["qua tai", "ban nhat", "om nhieu", "gong ganh", "dang ganh", "tai nhat", "ngap viec", "om nang", "tai cao", "gong nhieu", "cong nhieu", "qua nhieu viec", "ganh nang", "het cong suat", "chat viec", "ngap dau"],
  free: ["ranh", "nhan roi", "roi rai", "ranh roi", "nhan nha", "khong co viec", "dang trong", "khong ban", "it viec nhat", "thong tha"],
  people: [" ai ", " ai?", "nguoi nao", "nhan vien nao", "em nao", "ai co", "ai la", "ai dang", "ai lam", "ai nhieu", "ai it", "ai tre", "thanh vien nao", "can bo nao", "cong chuc nao", "dong chi nao", "ai gioi", "ai kem", "ai xuat sac", "ai duoc"],
  org: ["toan co quan", "co quan", "toan bo", " chung", "tong the", "toan don vi", "ca don vi", "toan trung tam"],
  guide: ["cach ", "lam sao", "lam the nao", "huong dan", "su dung", "o dau", "bang cach", "cach de", "dung the nao", "thao tac", "the nao de", "chi cach", "chi toi", "chi giup", "toi phai lam gi", "buoc nao", "vao dau de", "tim o dau", "o muc nao", "muc nao", "chuc nang o dau", "lam cach nao", "cach thuc"],
  create: ["tao viec moi", "tao nhiem vu moi", "giao viec moi", "them viec moi", "muon tao viec", "tao mot viec", "mo form tao", "tao giup toi viec", "lap viec moi", "khoi tao viec", "giao them viec", "tao cong viec", "them nhiem vu", "tao task"],
  search: ["tim viec", "tim nhiem vu", "tra cuu", "co viec nao", "viec ve", "nhiem vu ve", "tim ", "mo viec", "xem viec", "nhac viec", "co viec gi ve", "nhiem vu lien quan", "tim task", "tra viec", "viec lien quan den", "co nhiem vu nao ve"],
  upcoming: ["sap tre", "sap het han", "nguy co", "sap qua han", "gan den han", "sap toi han", "sap den han", "sap deadline", "gan deadline", "con it ngay", "sap toi deadline", "gan het han", "sap dao han", "nguy co tre", "gan toi han"],
  countQ: ["bao nhieu", "con may", "may viec", "con bao nhieu", "so luong", "so viec", "dem so", "tong bao nhieu"],
  totalQ: ["tong so", "tong cong"],
  avg: ["trung binh", "binh quan"],
  superl: ["nhat", " top", "hang dau", "dung dau", "so mot", "so 1"],
};

export function extractSlots(raw) {
  const qn = " " + strip(raw) + " ";
  const status = has(qn, ...LEX.pending) ? "pending_approval"
    : has(qn, ...LEX.overdue) ? "overdue"
    : has(qn, ...LEX.completed) ? "completed"
    : has(qn, ...LEX.inProgress) ? "in_progress"
    : null;
  const wantList = has(qn, ...LEX.wantList);
  // Bỏ "bao nhiêu" trước khi dò hướng (vì chứa "nhiều" nhưng là câu ĐẾM, không phải xếp hạng nhiều→ít).
  // "nhất" chỉ là dấu hiệu SO SÁNH NHẤT (superl), KHÔNG quyết định hướng — hướng do ít/nhiều/cao/thấp/tốt/kém.
  const qc = qn.replace(/bao nhieu/g, " ").replace(/con may/g, " ");
  const orderAsc = has(qc, ...LEX.orderAsc);
  const orderDesc = has(qc, ...LEX.orderDesc);
  const order = orderAsc && !orderDesc ? "asc" : orderDesc && !orderAsc ? "desc" : null;
  const metric = has(qn, ...LEX.score) ? "score"
    : has(qn, ...LEX.ontime) ? "ontime"
    : has(qn, ...LEX.speed) ? "speed"
    : has(qn, ...LEX.load) ? "load"
    : has(qn, ...LEX.free) ? "free"
    : null;
  // "ai/người" = XẾP theo NGƯỜI (ưu tiên hơn "phòng", vì "phòng" khi đó chỉ là bộ lọc)
  const subject = has(qn, ...LEX.people) ? "people"
    : has(qn, "phong") ? "dept"
    : has(qn, ...LEX.org) ? "org"
    : null;
  const late = has(qn, "tre", "qua han", "cham");
  const threshold = (() => { let m; if ((m = qn.match(/(hon|tren|lon hon|>=?|nhieu hon|vuot|vuot qua)\s*(\d+)/))) return { op: ">", n: +m[2] }; if ((m = qn.match(/(duoi|it hon|nho hon|<=?|chua toi|chua den)\s*(\d+)/))) return { op: "<", n: +m[2] }; return null; })();
  return {
    status, wantList, order, metric, subject, late, threshold,
    countQ: has(qn, ...LEX.countQ),
    totalQ: has(qn, ...LEX.totalQ),
    avg: has(qn, ...LEX.avg),
    rateChung: has(qn, "ty le") && has(qn, "chung", "co quan", "toan", "tong"),
    compare: has(qn, "so sanh", " vs ", "hon hay", "ai hon", "ben nao hon"),
    guide: has(qn, ...LEX.guide),
    create: has(qn, ...LEX.create),
    search: has(qn, ...LEX.search),
    upcoming: has(qn, ...LEX.upcoming),
    superl: has(qn, ...LEX.superl),
    hasViec: has(qn, "viec", "nhiem vu"),
    // "việc DO TÔI giao" — hỏi mình đã giao việc cho những ai (khác với "ai giao cho tôi")
    myAssigned: has(qn, "toi giao", "toi co giao", "toi da giao", "viec toi giao", "minh giao", "minh da giao", "minh co giao", "do toi giao", "toi phan cong", "minh phan cong", "toi giao cho", "toi giao viec", "minh giao viec"),
  };
}

// ── Ý 1: TỰ KHAI THÁC TỪ MỚI ────────────────────────────────────────────────────────────────────
// Tập hợp MỌI từ/cụm đã biết (nằm trong LEX) + vài từ khung câu hỏi cố định, để trang Trợ lý học
// phát hiện câu người dùng hỏi chứa từ nào trợ lý CHƯA biết → gợi ý admin bổ sung vào LEX.
const KNOWN_WORDS = (() => {
  const set = new Set();
  for (const arr of Object.values(LEX)) for (const phrase of arr) for (const w of phrase.trim().split(/\s+/)) if (w.length >= 2) set.add(w);
  // Từ khung câu hỏi phổ biến (không mang ngữ nghĩa cần học)
  for (const w of ["viec", "nhiem", "vu", "cong", "phong", "thang", "quy", "nam", "cua", "trong", "phai", "lam", "ai", "nao", "la", "gi", "cho", "toi", "minh", "muon", "ban", "hay", "giup", "di", "ma", "thi", "nhu", "cac", "mot", "duoc", "khong", "tre", "cham", "ty", "le", "so", "sanh", "vs", "va", "voi", "phu", "trach", "thuc", "hien", "hoan", "thanh"]) set.add(w);
  return set;
})();

// Trả về danh sách "từ mới" (đã bỏ dấu) xuất hiện trong câu nhưng chưa có trong LEX/khung — ứng viên bổ sung.
export function unknownWords(raw) {
  const toks = strip(raw).split(/[^a-z0-9]+/).filter(w => w.length >= 2);
  return [...new Set(toks.filter(w => !KNOWN_WORDS.has(w) && !/^\d+$/.test(w)))];
}
export { LEX };

// Chấm điểm ý định TỪ SLOTS (tách riêng để dùng chung cho slots nội bộ lẫn slots do AI bóc — Ý 3).
// ctx: { personCount, hasDept }. Trả về kết quả xếp hạng ý định như classify().
export function scoreSlots(s, ctx = {}) {
  const { personCount = 0, hasDept = false } = ctx;
  const sc = {};
  const add = (k, v) => { if (v > 0) sc[k] = (sc[k] || 0) + v; };
  const ranky = s.superl || s.order;

  if (s.guide) add("guide", 12);
  if (s.create) add("create", 12);
  if (s.myAssigned) add("my_assigned", 12); // "việc tôi giao cho ai" — rất riêng, ưu tiên cao
  if (s.compare && personCount >= 2) add("compare", 12);

  // LIỆT KÊ theo trạng thái
  if (s.status === "pending_approval") add("list", 9);
  else if (s.status) {
    if (s.wantList) add("list", 8);
    // Hỏi "AI/người nào" + trạng thái = muốn XẾP THEO NGƯỜI (nhường cho rank_people), không phải liệt kê việc
    else if ((hasDept || personCount >= 1) && s.subject !== "people") add("list", 7);
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

// ctx: { personCount, hasDept } — nơi gọi nhận diện tên người/phòng thật rồi truyền vào.
export function classify(raw, ctx = {}) {
  return scoreSlots(extractSlots(raw), ctx);
}
