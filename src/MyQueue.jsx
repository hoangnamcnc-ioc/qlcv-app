import React from "react";
import { DEPT_COLOR } from "./constants";

// ── Màn "Việc chờ tôi xử lý": gộp mọi hạng mục cần CHÍNH người đang đăng nhập ra tay,
// từ cả 3 module (Nhiệm vụ, Nhiệm vụ khác, Nhiệm vụ ngân sách) vào 1 chỗ duy nhất,
// để không phải đi tìm rải rác ở nhiều nơi khi "dọn bàn" cuối tuần.
function Section({ icon, color, bg, border, title, count, children }) {
  if (count === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span>{title} <span style={{ background: bg, color, padding: "1px 9px", borderRadius: 10, fontSize: 12 }}>{count}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

const Card = ({ onClick, bg, border, title, sub, dept }) => (
  <div onClick={onClick} style={{ padding: "10px 14px", borderRadius: 8, background: bg, border: "1px solid " + border, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}
    onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.98)"} onMouseLeave={e => e.currentTarget.style.filter = "none"}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, wordBreak: "break-word" }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2 }}>{sub}</div>}
    </div>
    {dept && <span style={{ flexShrink: 0, fontSize: 11, background: DEPT_COLOR[dept] + "22", color: DEPT_COLOR[dept], padding: "2px 8px", borderRadius: 8 }}>{dept}</span>}
  </div>
);

export default function MyQueue({
  myPendingTaskApprovals, myPendingExtRequests, unratedTasks, unreadCommentTasks,
  myPendingApprovals, myPendingProjectSteps, myPendingProjectExt, myPendingProjectStepExt,
  onOpenTask, onOpenOtherTask, onOpenProject, getEmp,
}) {
  const total = myPendingTaskApprovals.length + myPendingExtRequests.length + unratedTasks.length + unreadCommentTasks.length
    + myPendingApprovals.length + myPendingProjectSteps.length + myPendingProjectExt.length + myPendingProjectStepExt.length;

  if (total === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Không còn việc gì chờ xử lý!</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Mọi yêu cầu duyệt, đề xuất gia hạn, đánh giá và bình luận đều đã được xử lý.</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 18 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Tổng hợp mọi thứ đang cần <b>bạn</b> ra tay — duyệt, đánh giá, gia hạn, phản hồi. Bấm vào từng mục để xử lý ngay, xử lý xong sẽ tự biến mất khỏi danh sách.</div>

      <Section icon="📨" color="#92400e" bg="#fde68a" title="Chờ duyệt hoàn thành nhiệm vụ" count={myPendingTaskApprovals.length}>
        {myPendingTaskApprovals.map(t => <Card key={t.id} bg="#fffbeb" border="#fde68a" title={t.title} sub={`${t.requested_by} yêu cầu duyệt lúc ${t.requested_at}`} dept={t.dept} onClick={() => onOpenTask(t)} />)}
      </Section>

      <Section icon="📅" color="#1d4ed8" bg="#bfdbfe" title="Chờ duyệt gia hạn nhiệm vụ" count={myPendingExtRequests.length}>
        {myPendingExtRequests.map(t => <Card key={t.id} bg="#eff6ff" border="#bfdbfe" title={t.title} sub={`${t.ext_requested_by} đề xuất gia hạn đến ${t.ext_proposed}`} dept={t.dept} onClick={() => onOpenTask(t)} />)}
      </Section>

      <Section icon="⭐" color="#92400e" bg="#fde68a" title="Nhiệm vụ chưa đánh giá" count={unratedTasks.length}>
        {unratedTasks.map(t => <Card key={t.id} bg="#fffbeb" border="#fde68a" title={t.title} sub={`${getEmp(t.eid)?.name || "–"} · Hoàn thành, chờ đánh giá`} dept={t.dept} onClick={() => onOpenTask(t)} />)}
      </Section>

      <Section icon="💬" color="#6d28d9" bg="#ddd6fe" title="Bình luận mới chưa xem" count={unreadCommentTasks.length}>
        {unreadCommentTasks.map(t => <Card key={t.id} bg="#f5f3ff" border="#ddd6fe" title={t.title} sub="Có bình luận mới chưa xem" dept={t.dept} onClick={() => onOpenTask(t)} />)}
      </Section>

      <Section icon="📨" color="#92400e" bg="#fde68a" title={'Bước "Nhiệm vụ khác" chờ duyệt'} count={myPendingApprovals.length}>
        {myPendingApprovals.map((a, i) => <Card key={i} bg="#fffbeb" border="#fde68a" title={a.taskName} sub={`Bước: ${a.content} · ${a.requested_by} yêu cầu duyệt`} onClick={() => onOpenOtherTask(a.taskId)} />)}
      </Section>

      <Section icon="📋" color="#92400e" bg="#fde68a" title="Bước dự án chờ duyệt hoàn thành" count={myPendingProjectSteps.length}>
        {myPendingProjectSteps.map((x, i) => <Card key={i} bg="#fffbeb" border="#fde68a" title={x.proj.name} sub={`Bước: ${x.step.content} · ${x.step.requested_by || ""} yêu cầu duyệt`} dept={x.proj.dept} onClick={() => onOpenProject(x.proj.id)} />)}
      </Section>

      <Section icon="📅" color="#1d4ed8" bg="#bfdbfe" title="Gia hạn dự án chờ duyệt" count={myPendingProjectExt.length}>
        {myPendingProjectExt.map(p => <Card key={p.id} bg="#eff6ff" border="#bfdbfe" title={p.name} sub={`${p.ext_requested_by} đề xuất gia hạn đến ${p.ext_proposed}`} dept={p.dept} onClick={() => onOpenProject(p.id)} />)}
      </Section>

      <Section icon="📅" color="#1d4ed8" bg="#bfdbfe" title="Gia hạn bước dự án chờ duyệt" count={myPendingProjectStepExt.length}>
        {myPendingProjectStepExt.map((x, i) => <Card key={i} bg="#eff6ff" border="#bfdbfe" title={x.proj.name} sub={`Bước: ${x.step.content} · ${x.step.ext_requested_by} đề xuất đến ${x.step.ext_proposed}`} dept={x.proj.dept} onClick={() => onOpenProject(x.proj.id)} />)}
      </Section>
    </div>
  );
}
