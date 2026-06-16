import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

const nowStr=()=>new Date().toLocaleString("vi-VN");
const TYPES={
  bug:{label:"Báo lỗi",icon:"🐞",bg:"#fee2e2",col:"#b91c1c"},
  feedback:{label:"Góp ý",icon:"💬",bg:"#dbeafe",col:"#1d4ed8"},
  idea:{label:"Ý tưởng",icon:"💡",bg:"#fef9c3",col:"#92400e"}
};
const STATUS={
  new:{label:"Mới",bg:"#f1f5f9",col:"#475569"},
  viewing:{label:"Đang xem",bg:"#dbeafe",col:"#1d4ed8"},
  done:{label:"Đã xử lý",bg:"#dcfce7",col:"#15803d"}
};

export default function Feedback({ currentUser, isMobile, inp, showToast, canManage }){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({type:"feedback",content:"",anonymous:false});
  const [saving,setSaving]=useState(false);
  const [filter,setFilter]=useState("all");
  const [reply,setReply]=useState({});

  useEffect(()=>{(async()=>{setLoading(true);try{const{data}=await supabase.from("feedback").select("*").order("created",{ascending:false});setItems(data||[]);}catch{}setLoading(false);})();},[]);

  const submit=async()=>{if(!form.content.trim()){showToast&&showToast("Nhập nội dung góp ý","error");return;}setSaving(true);const item={id:`fb${Date.now()}`,type:form.type,content:form.content.trim(),author:form.anonymous?"":currentUser.full_name,anonymous:form.anonymous,status:"new",reply:"",created:nowStr()};const{error}=await supabase.from("feedback").insert(item);if(!error){setItems(p=>[item,...p]);showToast&&showToast("Cảm ơn góp ý của bạn!");setShowForm(false);setForm({type:"feedback",content:"",anonymous:false});}else showToast&&showToast("Lỗi: "+(error.message||""),"error");setSaving(false);};

  const updateStatus=async(id,status)=>{const{error}=await supabase.from("feedback").update({status}).eq("id",id);if(!error)setItems(p=>p.map(x=>x.id===id?{...x,status}:x));else showToast&&showToast("Lỗi cập nhật","error");};
  const sendReply=async(id)=>{const txt=(reply[id]||"").trim();if(!txt)return;const{error}=await supabase.from("feedback").update({reply:txt,status:"done"}).eq("id",id);if(!error){setItems(p=>p.map(x=>x.id===id?{...x,reply:txt,status:"done"}:x));setReply(r=>({...r,[id]:""}));showToast&&showToast("Đã phản hồi");}else showToast&&showToast("Lỗi","error");};
  const deleteItem=async(id)=>{if(!window.confirm("Xóa góp ý này?"))return;await supabase.from("feedback").delete().eq("id",id);setItems(p=>p.filter(x=>x.id!==id));};

  const filtered=useMemo(()=>filter==="all"?items:items.filter(i=>i.type===filter||i.status===filter),[items,filter]);
  const counts=useMemo(()=>({total:items.length,new:items.filter(i=>i.status==="new").length}),[items]);

  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <div style={{fontSize:13,color:"#6b7280"}}>{canManage?`Tổng ${counts.total} góp ý · ${counts.new} chưa xử lý`:`${counts.total} góp ý · Mọi ý kiến đều được trân trọng tiếp thu`}</div>
      <button onClick={()=>setShowForm(true)} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:13,cursor:"pointer",fontWeight:500}}>✏️ Gửi góp ý</button>
    </div>

    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["all","Tất cả"],["new","Mới"],["viewing","Đang xem"],["done","Đã xử lý"],["bug","🐞 Lỗi"],["feedback","💬 Góp ý"],["idea","💡 Ý tưởng"]].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} style={{padding:"5px 12px",border:"1px solid "+(filter===k?"#4f46e5":"#e5e7eb"),borderRadius:20,background:filter===k?"#eef2ff":"#fff",color:filter===k?"#4338ca":"#6b7280",cursor:"pointer",fontSize:12,fontWeight:filter===k?600:400}}>{l}</button>)}
    </div>

    {loading?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Đang tải…</div>:
    filtered.length===0?<div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:40,marginBottom:8}}>💬</div><div style={{fontSize:14}}>Chưa có góp ý nào</div></div>:
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {filtered.map(it=>{const T=TYPES[it.type]||TYPES.feedback;const S=STATUS[it.status]||STATUS.new;return(
        <div key={it.id} style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",borderLeft:"4px solid "+T.col,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,background:T.bg,color:T.col,padding:"2px 8px",borderRadius:8,fontWeight:600}}>{T.icon} {T.label}</span>
              <span style={{fontSize:11,background:S.bg,color:S.col,padding:"2px 8px",borderRadius:8,fontWeight:600}}>{S.label}</span>
              <span style={{fontSize:11,color:"#9ca3af"}}>{it.anonymous?"🕶️ Ẩn danh":"👤 "+(it.author||"—")} · {it.created}</span>
            </div>
            {canManage&&<button onClick={()=>deleteItem(it.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:14}}>🗑️</button>}
          </div>
          <div style={{fontSize:14,color:"#1e293b",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{it.content}</div>
          {it.reply&&<div style={{marginTop:10,padding:"8px 12px",background:"#f0fdf4",borderRadius:8,borderLeft:"3px solid #16a34a"}}><div style={{fontSize:11,fontWeight:600,color:"#15803d",marginBottom:2}}>↩ Phản hồi từ ban quản trị</div><div style={{fontSize:13,color:"#374151"}}>{it.reply}</div></div>}
          {canManage&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #f3f4f6"}}>
            <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>{Object.entries(STATUS).map(([k,v])=><button key={k} onClick={()=>updateStatus(it.id,k)} style={{padding:"3px 10px",border:"1px solid "+(it.status===k?v.col:"#e5e7eb"),borderRadius:6,background:it.status===k?v.bg:"#fff",color:it.status===k?v.col:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:it.status===k?600:400}}>{v.label}</button>)}</div>
            <div style={{display:"flex",gap:6}}><input value={reply[it.id]||""} onChange={e=>setReply(r=>({...r,[it.id]:e.target.value}))} placeholder="Nhập phản hồi…" style={{...inp,flex:1,fontSize:12,padding:"6px 10px"}}/><button onClick={()=>sendReply(it.id)} style={{padding:"6px 12px",background:"#16a34a",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,flexShrink:0}}>Gửi phản hồi</button></div>
          </div>}
        </div>);})}
    </div>}

    {showForm&&(<div onClick={()=>setShowForm(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:isMobile?"12px 8px":16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>✏️ Gửi góp ý</span><button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>Loại góp ý</label><div style={{display:"flex",gap:8}}>{Object.entries(TYPES).map(([k,v])=><button key={k} onClick={()=>setForm(f=>({...f,type:k}))} style={{flex:1,padding:"10px 6px",border:"2px solid "+(form.type===k?v.col:"#e5e7eb"),borderRadius:8,background:form.type===k?v.bg:"#fff",cursor:"pointer",fontSize:12,fontWeight:form.type===k?600:400,color:form.type===k?v.col:"#6b7280",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><span style={{fontSize:18}}>{v.icon}</span>{v.label}</button>)}</div></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Nội dung *</label><textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={5} placeholder="Mô tả vướng mắc, góp ý hoặc ý tưởng của bạn…" style={{...inp,resize:"vertical"}}/></div>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#374151"}}><input type="checkbox" checked={form.anonymous} onChange={e=>setForm(f=>({...f,anonymous:e.target.checked}))} style={{width:16,height:16,cursor:"pointer"}}/>🕶️ Gửi ẩn danh (không hiển thị tên tôi)</label>
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={submit} disabled={saving} style={{padding:"8px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>{saving?"Đang gửi…":"Gửi góp ý"}</button></div>
    </div></div>)}
  </div>);
}
