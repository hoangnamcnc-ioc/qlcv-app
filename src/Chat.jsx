import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase";

const nowStr = () => new Date().toISOString();
const parseJSON = (v, d = []) => { try { return JSON.parse(v || JSON.stringify(d)); } catch { return d; } };
const fmtTime = iso => { try { return new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }); } catch { return ""; } };

// Chat nội bộ: 1 kênh "Chung" mặc định cho toàn cơ quan (ai cũng thấy), cộng các kênh tự lập
// do bất kỳ ai tạo và chọn thành viên. Dùng Supabase Realtime để tin nhắn cập nhật trực tiếp.
export default function Chat({ currentUser, users, isMobile, inp, showToast }) {
  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState("general");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMembers, setNewMembers] = useState(() => new Set());
  const [showMobileList, setShowMobileList] = useState(true);
  const scrollRef = useRef(null);

  const myVisibleChannels = useMemo(() => channels.filter(c =>
    c.is_general || parseJSON(c.members, []).includes(currentUser?.id)
  ), [channels, currentUser]);

  useEffect(() => { (async () => {
    setLoading(true);
    const { data } = await supabase.from("chat_channels").select("*").order("is_general", { ascending: false }).order("created_at", { ascending: true });
    setChannels(data || []);
    setLoading(false);
  })(); }, []);

  useEffect(() => {
    if (!activeId) return;
    // Cờ hủy: nếu người dùng chuyển kênh khác trước khi fetch này xong, bỏ kết quả cũ để không ghi đè
    // tin nhắn của kênh đang mở bằng dữ liệu kênh trước đó (chuyển kênh nhanh → hiển thị nhầm).
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("channel_id", activeId).order("created_at", { ascending: true }).limit(200);
      if (!cancelled) setMessages(data || []);
    })();
    return () => { cancelled = true; };
  }, [activeId]);

  // Realtime: tin nhắn mới trong kênh đang mở tự động hiện ra, không cần tải lại trang
  useEffect(() => {
    if (!activeId) return;
    const sub = supabase.channel(`chat_${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeId}` }, payload => {
        setMessages(p => p.some(m => m.id === payload.new.id) ? p : [...p, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || !activeId) return;
    setText("");
    const msg = { id: `cm${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, channel_id: activeId, sender_id: currentUser.id, sender_name: currentUser.full_name, content, created_at: nowStr() };
    setMessages(p => [...p, msg]); // hiện ngay cho người gửi, không chờ realtime vọng lại
    const { error } = await supabase.from("chat_messages").insert(msg);
    if (error) { showToast?.("Lỗi gửi tin: " + (error.message || ""), "error"); setMessages(p => p.filter(m => m.id !== msg.id)); }
  };

  const createChannel = async () => {
    const name = newName.trim();
    if (!name) { showToast?.("Nhập tên kênh", "error"); return; }
    const id = `ch${Date.now()}`;
    const members = [...newMembers, currentUser.id];
    const ch = { id, name, is_general: false, members: JSON.stringify(members), created_by: currentUser.full_name, created_at: nowStr() };
    const { error } = await supabase.from("chat_channels").insert(ch);
    if (error) { showToast?.("Lỗi: " + (error.message || ""), "error"); return; }
    setChannels(p => [...p, ch]);
    setActiveId(id);
    setShowCreate(false);
    setNewName("");
    setNewMembers(new Set());
    showToast?.("Đã tạo kênh");
  };

  const activeChannel = channels.find(c => c.id === activeId);

  return (
    <div style={{ display: "flex", gap: 12, height: isMobile ? "calc(100vh - 190px)" : "calc(100vh - 170px)" }}>
      {(!isMobile || showMobileList) && (
        <div style={{ width: isMobile ? "100%" : 240, flexShrink: 0, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>💬 Kênh chat</span>
            <button onClick={() => setShowCreate(true)} title="Tạo kênh mới" style={{ background: "#eef2ff", border: "none", borderRadius: 6, width: 24, height: 24, cursor: "pointer", color: "#4338ca", fontWeight: 700 }}>+</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? <div style={{ padding: 16, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>Đang tải…</div> :
              myVisibleChannels.map(c => (
                <div key={c.id} onClick={() => { setActiveId(c.id); setShowMobileList(false); }} style={{ padding: "10px 12px", cursor: "pointer", background: activeId === c.id ? "#eef2ff" : "transparent", borderLeft: "3px solid " + (activeId === c.id ? "#4338ca" : "transparent") }}>
                  <div style={{ fontSize: 13, fontWeight: activeId === c.id ? 600 : 500 }}>{c.is_general ? "📢 " : "# "}{c.name}</div>
                </div>
              ))}
          </div>
        </div>
      )}
      {(!isMobile || !showMobileList) && (
        <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
            {isMobile && <button onClick={() => setShowMobileList(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>←</button>}
            <span style={{ fontWeight: 600, fontSize: 13 }}>{activeChannel?.is_general ? "📢 " : "# "}{activeChannel?.name || ""}</span>
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 24 }}>Chưa có tin nhắn nào</div>}
            {messages.map(m => {
              const mine = m.sender_id === currentUser?.id;
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  {!mine && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2, marginLeft: 4 }}>{m.sender_name}</div>}
                  <div style={{ maxWidth: "75%", padding: "8px 12px", borderRadius: 12, background: mine ? "#4338ca" : "#f1f5f9", color: mine ? "#fff" : "#111", fontSize: 13.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{fmtTime(m.created_at)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: 10, borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Nhập tin nhắn…" style={{ ...inp, flex: 1 }} />
            <button onClick={send} disabled={!text.trim()} style={{ background: text.trim() ? "#4338ca" : "#e5e7eb", color: "#fff", border: "none", borderRadius: 8, padding: "0 18px", cursor: text.trim() ? "pointer" : "default", fontWeight: 600, fontSize: 13 }}>Gửi</button>
          </div>
        </div>
      )}

      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: isMobile ? "12px 8px" : 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Tạo kênh chat mới</span>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af" }}>✕</button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Tên kênh *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="VD: Dự án chuyển đổi số" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Thành viên (ngoài bạn)</label>
                <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 6 }}>
                  {(users || []).filter(u => u.id !== currentUser.id).map(u => (
                    <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={newMembers.has(u.id)} onChange={() => setNewMembers(p => { const n = new Set(p); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n; })} />
                      {u.full_name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "0 18px 18px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 8, background: "#f9fafb", cursor: "pointer", fontSize: 13 }}>Hủy</button>
              <button onClick={createChannel} style={{ padding: "8px 16px", background: "#4338ca", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Tạo kênh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
