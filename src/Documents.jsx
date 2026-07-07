import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import { getPreviewUrl, parseJSON } from "./helpers";

const nowStr=()=>new Date().toLocaleString("vi-VN");
const todayStr=new Date().toISOString().split("T")[0];
const TYPES={den:{label:"Văn bản đến",icon:"📥",bg:"#dbeafe",col:"#1d4ed8"},di:{label:"Văn bản đi",icon:"📤",bg:"#dcfce7",col:"#15803d"}};
const isIncoming=d=>d.type==="den"||d.type==="incoming";

export default function Documents({ currentUser, isMobile, inp, showToast, canManage, tasks, users, getTaskTitle, onOpenTask, onCreateTask, uploadFiles, uploadingFiles }){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState(null);
  const [filterType,setFilterType]=useState("all");
  const [search,setSearch]=useState("");
  const [saving,setSaving]=useState(false);
  const [selectMode,setSelectMode]=useState(false);
  const [selected,setSelected]=useState(()=>new Set());
  const [forwardModal,setForwardModal]=useState(null); // {doc, to_id, note}

  // Giám đốc (is_top_director) + Admin xem toàn bộ văn bản đến; còn lại chỉ thấy văn bản do chính mình
  // tạo hoặc đã được chuyển tới mình (nằm trong lịch sử "forwards") — đúng luồng chuyển văn bản nội bộ.
  const isTop = currentUser?.role==="admin" || currentUser?.is_top_director===true;
  const canForwardRole = isTop || currentUser?.role==="director"; // GĐ + PGĐ được chuyển tiếp; TP/PTP chỉ được giao việc
  const canSeeIncoming = d => { if (!isIncoming(d)) return true; if (isTop) return true; if (d.created_by===currentUser?.full_name) return true; return parseJSON(d.forwards,[]).some(f=>f.to_id===currentUser?.id); };
  // Người nhận hợp lệ khi chuyển tiếp: GĐ chuyển được cho PGĐ (director khác) + TP/PTP mọi phòng;
  // PGĐ chỉ chuyển được cho TP/PTP (không chuyển ngang cho PGĐ khác, không chuyển ngược lên GĐ).
  const forwardTargets = useMemo(()=>{
    if (!canForwardRole || !users) return [];
    if (isTop) return users.filter(u=>u.id!==currentUser.id && ["director","manager","deputy_manager","manager_hcth"].includes(u.role));
    return users.filter(u=>["manager","deputy_manager","manager_hcth"].includes(u.role));
  },[users,currentUser,isTop,canForwardRole]);

  useEffect(()=>{(async()=>{setLoading(true);try{const{data}=await supabase.from("documents").select("*").order("doc_date",{ascending:false});setItems((data||[]).filter(canSeeIncoming));}catch{}setLoading(false);})();},[]);

  const openForward=d=>setForwardModal({doc:d,to_id:"",note:""});
  const submitForward=async()=>{
    const {doc,to_id,note}=forwardModal;
    const target=(users||[]).find(u=>u.id===to_id);
    if(!target){showToast&&showToast("Chọn người nhận","error");return;}
    const chain=[...parseJSON(doc.forwards,[]),{to_id:target.id,to_name:target.full_name,to_role:target.role,by_id:currentUser.id,by_name:currentUser.full_name,at:nowStr(),note:note.trim()}];
    const{error}=await supabase.from("documents").update({forwards:JSON.stringify(chain)}).eq("id",doc.id);
    if(error){showToast&&showToast("Lỗi: "+(error.message||""),"error");return;}
    setItems(p=>p.map(x=>x.id===doc.id?{...x,forwards:JSON.stringify(chain)}:x));
    showToast&&showToast(`Đã chuyển văn bản cho ${target.full_name}`);
    setForwardModal(null);
  };

  const openCreate=()=>setForm({id:null,type:"den",doc_number:"",doc_date:todayStr,title:"",sender:"",task_id:"",note:"",attachments:[]});
  const openEdit=d=>setForm({...d,attachments:d.attachments||[]});

  const save=async()=>{if(!form.doc_number.trim()||!form.title.trim()){showToast&&showToast("Nhập số văn bản và trích yếu","error");return;}setSaving(true);
    const row={type:form.type,doc_number:form.doc_number.trim(),doc_date:form.doc_date,title:form.title.trim(),sender:form.sender.trim(),task_id:form.task_id||null,note:form.note,attachments:JSON.stringify(form.attachments||[])};
    if(form.id){const{error}=await supabase.from("documents").update(row).eq("id",form.id);if(!error){setItems(p=>p.map(x=>x.id===form.id?{...x,...row,attachments:row.attachments}:x));showToast&&showToast("Đã cập nhật văn bản");setForm(null);}else showToast&&showToast("Lỗi: "+(error.message||""),"error");}
    else{const doc={id:`doc${Date.now()}`,...row,created:nowStr(),created_by:currentUser.full_name};const{error}=await supabase.from("documents").insert(doc);if(!error){setItems(p=>[doc,...p]);showToast&&showToast("Đã thêm văn bản");setForm(null);}else showToast&&showToast("Lỗi: "+(error.message||""),"error");}
    setSaving(false);};

  const remove=async id=>{if(!window.confirm("Xóa văn bản này?"))return;await supabase.from("documents").delete().eq("id",id);setItems(p=>p.filter(x=>x.id!==id));};

  const toggleSelect=id=>setSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleSelectAll=()=>setSelected(p=>p.size===filtered.length?new Set():new Set(filtered.map(d=>d.id)));
  const exitSelectMode=()=>{setSelectMode(false);setSelected(new Set());};
  const removeSelected=async()=>{
    if(selected.size===0)return;
    if(!window.confirm(`Xóa ${selected.size} văn bản đã chọn?`))return;
    const ids=[...selected];
    const{error}=await supabase.from("documents").delete().in("id",ids);
    if(error){showToast&&showToast("Lỗi: "+(error.message||""),"error");return;}
    setItems(p=>p.filter(x=>!selected.has(x.id)));
    showToast&&showToast(`Đã xóa ${ids.length} văn bản`);
    exitSelectMode();
  };

  const filtered=useMemo(()=>items.filter(d=>{if(filterType==="den"&&!isIncoming(d))return false;if(filterType==="di"&&isIncoming(d))return false;if(search){const q=search.toLowerCase();if(!d.doc_number.toLowerCase().includes(q)&&!d.title.toLowerCase().includes(q)&&!(d.sender||"").toLowerCase().includes(q))return false;}return true;}),[items,filterType,search]);
  const counts=useMemo(()=>({den:items.filter(isIncoming).length,di:items.filter(d=>!isIncoming(d)).length}),[items]);

  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
      <div onClick={()=>setFilterType("all")} style={{background:filterType==="all"?"#e0e7ff":"#fff",borderRadius:10,border:"1.5px solid "+(filterType==="all"?"#6366f1":"#e5e7eb"),padding:14,cursor:"pointer"}}><div style={{fontSize:11,color:"#6b7280"}}>📁 Tất cả</div><div style={{fontSize:22,fontWeight:700,color:"#4f46e5"}}>{items.length}</div></div>
      <div onClick={()=>setFilterType("den")} style={{background:filterType==="den"?"#bfdbfe":"#eff6ff",borderRadius:10,border:"1.5px solid "+(filterType==="den"?"#1d4ed8":"#bfdbfe"),padding:14,cursor:"pointer"}}><div style={{fontSize:11,color:"#1d4ed8"}}>📥 Văn bản đến</div><div style={{fontSize:22,fontWeight:700,color:"#1d4ed8"}}>{counts.den}</div></div>
      <div onClick={()=>setFilterType("di")} style={{background:filterType==="di"?"#bbf7d0":"#f0fdf4",borderRadius:10,border:"1.5px solid "+(filterType==="di"?"#16a34a":"#bbf7d0"),padding:14,cursor:"pointer"}}><div style={{fontSize:11,color:"#15803d"}}>📤 Văn bản đi</div><div style={{fontSize:22,fontWeight:700,color:"#15803d"}}>{counts.di}</div></div>
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm theo số văn bản, trích yếu, nơi gửi..." style={{...inp,flex:1,minWidth:160}}/>
      {canManage&&!selectMode&&<button onClick={()=>setSelectMode(true)} style={{background:"#f9fafb",color:"#374151",border:"1px solid #d1d5db",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontWeight:500}}>☑️ Chọn</button>}
      {canManage&&<button onClick={openCreate} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontWeight:500}}>+ Thêm văn bản</button>}
    </div>
    {selectMode&&<div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:"#eef2ff",border:"1px solid #c7d2fe",borderRadius:8,padding:"8px 12px"}}>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={filtered.length>0&&selected.size===filtered.length} onChange={toggleSelectAll}/>Chọn tất cả ({filtered.length})</label>
      <span style={{fontSize:13,color:"#4338ca",fontWeight:500}}>Đã chọn: {selected.size}</span>
      <button onClick={removeSelected} disabled={selected.size===0} style={{marginLeft:"auto",background:selected.size===0?"#f3f4f6":"#fee2e2",color:selected.size===0?"#9ca3af":"#dc2626",border:"1px solid "+(selected.size===0?"#e5e7eb":"#fca5a5"),borderRadius:8,padding:"6px 14px",fontSize:13,cursor:selected.size===0?"default":"pointer",fontWeight:500}}>🗑️ Xóa đã chọn</button>
      <button onClick={exitSelectMode} style={{background:"#fff",border:"1px solid #d1d5db",borderRadius:8,padding:"6px 14px",fontSize:13,cursor:"pointer"}}>Hủy</button>
    </div>}
    {loading?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Đang tải…</div>:filtered.length===0?<div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:40,marginBottom:8}}>📁</div><div style={{fontSize:14}}>Chưa có văn bản nào</div></div>:
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {filtered.map(d=>{const T=isIncoming(d)?TYPES.den:TYPES.di;const linkedTask=d.task_id?(tasks||[]).find(t=>t.id===d.task_id):null;const atts=d.attachments?(typeof d.attachments==="string"?JSON.parse(d.attachments||"[]"):d.attachments):[];return(
        <div key={d.id} style={{background:"#fff",borderRadius:10,border:"1px solid "+(selectMode&&selected.has(d.id)?"#6366f1":"#e5e7eb"),borderLeft:"4px solid "+T.col,padding:14,display:"flex",gap:10}}>
          {selectMode&&<input type="checkbox" checked={selected.has(d.id)} onChange={()=>toggleSelect(d.id)} style={{marginTop:3,flexShrink:0,width:16,height:16,cursor:"pointer"}}/>}
          <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:11,background:T.bg,color:T.col,padding:"2px 8px",borderRadius:8,fontWeight:600}}>{T.icon} {T.label}</span>
              <span style={{fontWeight:700,fontSize:13}}>{d.doc_number}</span>
              <span style={{fontSize:11,color:"#9ca3af"}}>{d.doc_date}</span>
            </div>
            {canManage&&!selectMode&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {isIncoming(d)&&!d.task_id&&onCreateTask&&<button onClick={()=>onCreateTask(d)} style={{padding:"3px 9px",border:"1px solid #93c5fd",borderRadius:6,background:"#eff6ff",cursor:"pointer",fontSize:11,color:"#1d4ed8",fontWeight:500}}>📋 + Tạo nhiệm vụ</button>}
              {isIncoming(d)&&canForwardRole&&forwardTargets.length>0&&<button onClick={()=>openForward(d)} style={{padding:"3px 9px",border:"1px solid #c4b5fd",borderRadius:6,background:"#f5f3ff",cursor:"pointer",fontSize:11,color:"#6d28d9",fontWeight:500}}>↪️ Chuyển</button>}
              {(!isIncoming(d)||canForwardRole)&&<button onClick={()=>openEdit(d)} style={{padding:"3px 9px",border:"1px solid #d1d5db",borderRadius:6,background:"#f9fafb",cursor:"pointer",fontSize:11}}>✏️ Sửa</button>}
              {(!isIncoming(d)||canForwardRole)&&<button onClick={()=>remove(d.id)} style={{padding:"3px 9px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",cursor:"pointer",fontSize:11,color:"#dc2626"}}>🗑️</button>}
            </div>}
          </div>
          <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{d.title}</div>
          {d.sender&&<div style={{fontSize:12,color:"#6b7280",marginBottom:4}}>{isIncoming(d)?"Nơi gửi":"Nơi nhận"}: {d.sender}</div>}
          {d.note&&<div style={{fontSize:12,color:"#475569",fontStyle:"italic",marginBottom:4}}>📝 {d.note}</div>}
          {atts.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{atts.map((f,fi)=><a key={fi} href={getPreviewUrl(f.url,f.name)} target="_blank" rel="noreferrer" style={{fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:6,textDecoration:"none"}}>📎 {f.name}</a>)}</div>}
          {isIncoming(d)&&parseJSON(d.forwards,[]).length>0&&<div style={{fontSize:11,color:"#6d28d9",marginTop:6}}>↪️ Đã chuyển: {parseJSON(d.forwards,[]).map(f=>f.to_name).join(" → ")}</div>}
          {linkedTask&&<div onClick={()=>onOpenTask&&onOpenTask(linkedTask)} style={{marginTop:8,padding:"6px 10px",background:"#f8fafc",borderRadius:8,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#4338ca"}}>🔗 Liên kết nhiệm vụ: <b>{linkedTask.title}</b></div>}
          </div>
        </div>);})}
    </div>}

    {form&&(<div onClick={()=>setForm(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:isMobile?"12px 8px":16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}><span style={{fontWeight:600,fontSize:15}}>{form.id?"Sửa văn bản":"Thêm văn bản"}</span><button onClick={()=>setForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>Loại văn bản</label><div style={{display:"flex",gap:8}}>{Object.entries(TYPES).map(([k,v])=><button key={k} onClick={()=>setForm(f=>({...f,type:k}))} style={{flex:1,padding:"8px",border:"2px solid "+(form.type===k?v.col:"#e5e7eb"),borderRadius:8,background:form.type===k?v.bg:"#fff",cursor:"pointer",fontSize:12,fontWeight:form.type===k?600:400,color:form.type===k?v.col:"#6b7280"}}>{v.icon} {v.label}</button>)}</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Số văn bản *</label><input value={form.doc_number} onChange={e=>setForm(f=>({...f,doc_number:e.target.value}))} placeholder="VD: 2522/SKHCN-KHTC" style={inp}/></div>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ngày văn bản</label><input type="date" value={form.doc_date} onChange={e=>setForm(f=>({...f,doc_date:e.target.value}))} style={inp}/></div>
        </div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Trích yếu *</label><textarea value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>{form.type==="den"?"Nơi gửi":"Nơi nhận"}</label><input value={form.sender} onChange={e=>setForm(f=>({...f,sender:e.target.value}))} style={inp}/></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>🔗 Liên kết nhiệm vụ (tùy chọn)</label><select value={form.task_id||""} onChange={e=>setForm(f=>({...f,task_id:e.target.value}))} style={inp}><option value="">— Không liên kết —</option>{(tasks||[]).filter(t=>!t.deleted).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú</label><textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>📎 File đính kèm</label>
          <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"1.5px dashed #d1d5db",borderRadius:8,cursor:"pointer",background:"#f9fafb",fontSize:12,color:"#6b7280"}}><span>🗂️</span><span>{uploadingFiles?"Đang tải file...":"Chọn file…"}</span><input type="file" multiple style={{display:"none"}} disabled={uploadingFiles} onChange={async e=>{const fl=Array.from(e.target.files);if(!fl.length)return;const up=await uploadFiles(fl,form.attachments||[]);setForm(f=>({...f,attachments:up}));e.target.value="";}}/></label>
          {(form.attachments||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{(form.attachments||[]).map((f,fi)=><span key={fi} style={{fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:6,display:"inline-flex",alignItems:"center",gap:4}}>📎 {f.name}<button onClick={()=>setForm(d=>({...d,attachments:d.attachments.filter((_,i)=>i!==fi)}))} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:12,padding:0}}>✕</button></span>)}</div>}
        </div>
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setForm(null)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={save} disabled={saving} style={{padding:"8px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>{saving?"Đang lưu…":"Lưu"}</button></div>
    </div></div>)}

    {forwardModal&&(<div onClick={()=>setForwardModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:isMobile?"12px 8px":16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:420,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>↪️ Chuyển văn bản</span><button onClick={()=>setForwardModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:"#374151"}}><b>{forwardModal.doc.doc_number}</b> — {forwardModal.doc.title}</div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Chuyển cho *</label>
          <select value={forwardModal.to_id} onChange={e=>setForwardModal(f=>({...f,to_id:e.target.value}))} style={inp}>
            <option value="">— Chọn người nhận —</option>
            {forwardTargets.map(u=><option key={u.id} value={u.id}>{u.full_name} ({u.role==="director"?"Phó Giám đốc":u.role==="manager_hcth"?"TP.HCTH":u.role==="manager"?"Trưởng phòng":"Phó trưởng phòng"})</option>)}
          </select>
        </div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú chỉ đạo (tùy chọn)</label><textarea value={forwardModal.note} onChange={e=>setForwardModal(f=>({...f,note:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setForwardModal(null)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={submitForward} style={{padding:"8px 16px",background:"#6d28d9",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Chuyển</button></div>
    </div></div>)}
  </div>);
}
