// Đọc CHỮ từ tệp (PDF/Word .docx/.txt) — chạy hoàn toàn trên trình duyệt, thư viện nạp ĐỘNG khi cần.
// Nhận File (từ máy, không CORS) hoặc { url, name } (tệp đã lưu). Trả về text thô để tóm tắt/tra cứu.
export async function extractFileText(src) {
  let buf, rawName;
  if (typeof File !== "undefined" && src instanceof File) { buf = await src.arrayBuffer(); rawName = src.name; }
  else { const resp = await fetch(src.url); if (!resp.ok) throw new Error("Không tải được tệp (có thể do quyền truy cập)."); buf = await resp.arrayBuffer(); rawName = src.name; }
  const name = (rawName || "").toLowerCase();
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const pdf = await pdfjs.getDocument({ data: buf }).promise; let text = ""; const max = Math.min(pdf.numPages, 25);
    for (let i = 1; i <= max; i++) { const p = await pdf.getPage(i); const c = await p.getTextContent(); text += c.items.map(it => it.str).join(" ") + "\n"; }
    return text;
  }
  if (name.endsWith(".docx")) { const mammoth = await import("mammoth"); const { value } = await mammoth.extractRawText({ arrayBuffer: buf }); return value; }
  if (name.endsWith(".txt")) return new TextDecoder("utf-8").decode(buf);
  if (name.endsWith(".doc")) throw new Error("File Word cũ (.doc) chưa hỗ trợ — hãy lưu lại thành .docx.");
  throw new Error("Chỉ đọc được PDF, Word (.docx) hoặc .txt.");
}
