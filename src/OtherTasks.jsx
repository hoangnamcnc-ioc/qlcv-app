import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

const DEPT_COLOR = {"HCTH":"#6366f1","QL-KTDL":"#0ea5e9","HT-NTS":"#10b981"};
const today=new Date();today.setHours(0,0,0,0);
const todayStr=today.toISOString().split("T")[0];
const parseJSON=(v,d=[])=>{try{return JSON.parse(v||JSON.stringify(d));}catch{return d;}};

// ───── Vai trò trong tổ nhiệm vụ ─────
const TEAM_ROLES = {leader:{label:"Tổ trưởng",bg:"#fef3c7",col:"#92400e",icon:"⭐"},deputy:{label:"Tổ phó",bg:"#e0e7ff",col:"#4338ca",icon:"🔹"},member:{label:"Thành viên",bg:"#f1f5f9",col:"#475569",icon:"👤"}};
const ROLE_ORDER=["leader","deputy","member"];

// ───── Trạng thái bước ─────
const STEP_STATUS = {pending:{label:"Chưa làm",bg:"#f1f5f9",col:"#64748b"},doing:{label:"Đang làm",bg:"#dbeafe",col:"#1d4ed8"},pending_approval:{label:"Chờ duyệt",bg:"#fef3c7",col:"#92400e"},done:{label:"Hoàn thành (đã đánh giá)",bg:"#dcfce7",col:"#15803d"},skipped:{label:"Bỏ qua",bg:"#f3f4f6",col:"#9ca3af"}};
const STEP_QUALITY = {1:{label:"Đạt",bg:"#f0fdf4",col:"#15803d",star:"★"},2:{label:"Tốt",bg:"#eff6ff",col:"#1d4ed8",star:"★★"},3:{label:"Xuất sắc",bg:"#fef9c3",col:"#92400e",star:"★★★"}};
const isStepOverdue=s=>{if(!s.deadline||s.status==="done"||s.status==="skipped")return false;const d=new Date(s.deadline);d.setHours(0,0,0,0);return d<today;};
const countOverdueSteps=stepsArr=>(stepsArr||[]).filter(isStepOverdue).length;

// ───── Chi tiết nhiệm vụ ─────
function TaskDetail({task,onClose,getEmp,employees,isMobile,onEdit,onDelete,onUpdateSteps,inp,currentUser,canManage}){
  const steps=parseJSON(task.steps,[]);
  const team=parseJSON(task.team,[]);
  const [editStep,setEditStep]=useState(null);
  const [stepDraft,setStepDraft]=useState(null);
  const doneCount=steps.filter(s=>s.status==="done").length;
  const pct=steps.length?Math.round(doneCount/steps.length*100):0;
  const myEid=currentUser?.employee_id;
  const isCreator=task.created_by===currentUser?.full_name;
  const isLeaderOfTask=myEid&&team.some(m=>m.eid===myEid&&(m.role==="leader"||m.role==="deputy"));
  const canEditTask=canManage||isLeaderOfTask;
  const canDeleteTask=isCreator||canManage;
  const canEditStep=(s)=>canEditTask||(myEid&&s.lead_eid===myEid);
  const canApprove=canEditTask; // Tổ trưởng, Tổ phó hoặc quản lý mới được duyệt

  const setStepStatus=async(idx,status)=>{const ns=steps.map((s,i)=>i===idx?{...s,status}:s);await onUpdateSteps(task,ns);};
  const requestStepDone=async(idx)=>{const ns=steps.map((s,i)=>i===idx?{...s,status:"pending_approval",requested_by:currentUser.full_name,requested_at:new Date().toLocaleDateString("vi-VN")}:s);await onUpdateSteps(task,ns);};
  const rejectStep=async(idx)=>{const ns=steps.map((s,i)=>i===idx?{...s,status:"doing"}:s);await onUpdateSteps(task,ns);};
  const [approvalPopup,setApprovalPopup]=useState(null); // {idx,quality,note}
  const confirmApproval=async()=>{const{idx,quality,note}=approvalPopup;const ns=steps.map((s,i)=>i===idx?{...s,status:"done",quality,quality_note:note,approved_by:currentUser.full_name,approved_at:new Date().toLocaleDateString("vi-VN")}:s);await onUpdateSteps(task,ns);setApprovalPopup(null);};
  const openEditStep=(s,idx)=>{setEditStep(idx);setStepDraft({...s});};
  const saveStep=async()=>{const ns=steps.map((s,i)=>i===editStep?stepDraft:s);await onUpdateSteps(task,ns);setEditStep(null);setStepDraft(null);};
  const deleteStep=async idx=>{if(!window.confirm("Xóa bước này?"))return;const ns=steps.filter((_,i)=>i!==idx).map((s,i)=>({...s,id:i+1}));await onUpdateSteps(task,ns);};
  const addStep=async()=>{const ns=[...steps,{id:steps.length+1,content:"Bước mới",deadline:"",lead_eid:"",collab_eids:[],status:"pending",note:""}];await onUpdateSteps(task,ns);setEditStep(ns.length-1);setStepDraft(ns[ns.length-1]);};
  const insertStepAfter=async(idx)=>{const newStep={content:"Bước mới",deadline:"",lead_eid:"",collab_eids:[],status:"pending",note:""};const ns=[...steps.slice(0,idx+1),newStep,...steps.slice(idx+1)].map((s,i)=>({...s,id:i+1}));await onUpdateSteps(task,ns);setEditStep(idx+1);setStepDraft(ns[idx+1]);};

  const sortedTeam=[...team].sort((a,b)=>ROLE_ORDER.indexOf(a.role)-ROLE_ORDER.indexOf(b.role));
  const teamEmps=team.map(m=>getEmp(m.eid)).filter(Boolean);

  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:isMobile?"12px 8px":16}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:760,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"sticky",top:0,background:"#fff",zIndex:2}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>{task.name}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{sortedTeam.map((m,i)=>{const e=getEmp(m.eid);if(!e)return null;const r=TEAM_ROLES[m.role];return(<span key={i} style={{fontSize:11,background:r.bg,color:r.col,padding:"2px 8px",borderRadius:8,fontWeight:m.role!=="member"?600:400}}>{r.icon} {e.name}{r.label!=="Thành viên"&&<span style={{opacity:0.7}}> ({r.label})</span>}</span>);})}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af",marginLeft:8}}>✕</button>
      </div>
      <div style={{padding:20}}>
        {task.content&&<div style={{fontSize:13,color:"#374151",background:"#f8fafc",padding:"12px 14px",borderRadius:8,marginBottom:16,whiteSpace:"pre-wrap"}}>{task.content}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:600,fontSize:14}}>📋 Trình tự thực hiện ({doneCount}/{steps.length}){countOverdueSteps(steps)>0&&<span style={{marginLeft:8,fontSize:11,background:"#fee2e2",color:"#b91c1c",padding:"2px 8px",borderRadius:8,fontWeight:600}}>⚠ {countOverdueSteps(steps)} bước trễ hạn</span>}</div>
          {canEditTask&&<button onClick={addStep} style={{padding:"5px 12px",border:"1px solid #86efac",borderRadius:7,background:"#f0fdf4",cursor:"pointer",fontSize:12,color:"#15803d"}}>+ Thêm bước</button>}
        </div>
        <div style={{height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:pct+"%",background:pct===100?"#16a34a":"#3b82f6",borderRadius:6}}/></div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {steps.length===0&&<div style={{textAlign:"center",color:"#9ca3af",padding:24,fontSize:13}}>Chưa có bước nào. {canEditTask&&"Bấm \"+ Thêm bước\" để bắt đầu."}</div>}
          {steps.map((s,idx)=>(<div key={idx} style={{border:"1px solid "+(isStepOverdue(s)?"#fca5a5":"#e5e7eb"),borderRadius:8,padding:"10px 12px",background:isStepOverdue(s)?"#fff5f5":(s.status==="done"?"#f0fdf4":"#fff")}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>{idx+1}. {s.content}</div>
                {s.lead_eid&&getEmp(s.lead_eid)&&<div style={{fontSize:13,color:"#1d4ed8",marginTop:3}}>👤 Chủ trì: <b>{getEmp(s.lead_eid)?.name}</b></div>}
                {(s.collab_eids||[]).length>0&&<div style={{fontSize:13,color:"#15803d",marginTop:3}}>🤝 Phối hợp: {(s.collab_eids||[]).map(id=>getEmp(id)?.name).filter(Boolean).join(", ")}</div>}
                {s.deadline&&<div style={{fontSize:13,color:"#6b7280",marginTop:3}}>📅 Hạn hoàn thành: <b>{s.deadline}</b></div>}
                {s.note&&<div style={{fontSize:13,color:"#475569",marginTop:3,fontStyle:"italic"}}>{s.note}</div>}
                {s.status==="pending_approval"&&s.requested_by&&<div style={{fontSize:12,color:"#92400e",marginTop:3,background:"#fffbeb",padding:"4px 10px",borderRadius:6}}>📨 {s.requested_by} đã yêu cầu hoàn thành · {s.requested_at}</div>}
                {s.status==="done"&&s.quality&&<div style={{fontSize:12,color:STEP_QUALITY[s.quality]?.col,marginTop:3,background:STEP_QUALITY[s.quality]?.bg,padding:"4px 10px",borderRadius:6}}>{STEP_QUALITY[s.quality]?.star} {STEP_QUALITY[s.quality]?.label}{s.quality_note&&` — ${s.quality_note}`}<div style={{fontSize:11,opacity:0.75,marginTop:2}}>Duyệt bởi {s.approved_by} · {s.approved_at}</div></div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
                <span style={{fontSize:12,background:STEP_STATUS[s.status]?.bg,color:STEP_STATUS[s.status]?.col,padding:"3px 8px",borderRadius:8,fontWeight:600}}>{STEP_STATUS[s.status]?.label}</span>
                {isStepOverdue(s)&&<span style={{fontSize:12,background:"#fee2e2",color:"#b91c1c",padding:"3px 8px",borderRadius:8,fontWeight:600}}>⚠ Trễ hạn</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
              {/* Chủ trì: chuyển trạng thái thường + yêu cầu hoàn thành */}
              {canEditStep(s)&&s.status!=="done"&&s.status!=="pending_approval"&&["pending","doing","skipped"].map(k=>{const v=STEP_STATUS[k];return(<button key={k} onClick={()=>setStepStatus(idx,k)} style={{padding:"3px 8px",border:"1px solid "+(s.status===k?v.col:"#e5e7eb"),borderRadius:6,background:s.status===k?v.bg:"#fff",color:s.status===k?v.col:"#9ca3af",cursor:"pointer",fontSize:12.5,fontWeight:s.status===k?600:400}}>{v.label}</button>);})}
              {canEditStep(s)&&(s.status==="pending"||s.status==="doing")&&<button onClick={()=>requestStepDone(idx)} style={{padding:"3px 10px",border:"1px solid #fbbf24",borderRadius:6,background:"#fffbeb",color:"#92400e",cursor:"pointer",fontSize:12.5,fontWeight:600}}>📨 Yêu cầu hoàn thành</button>}
              {/* Tổ trưởng/Tổ phó: duyệt hoặc từ chối yêu cầu */}
              {s.status==="pending_approval"&&canApprove&&<>
                <button onClick={()=>setApprovalPopup({idx,quality:1,note:""})} style={{padding:"3px 10px",border:"1px solid #16a34a",borderRadius:6,background:"#f0fdf4",color:"#15803d",cursor:"pointer",fontSize:12.5,fontWeight:600}}>✅ Duyệt & đánh giá</button>
                <button onClick={()=>rejectStep(idx)} style={{padding:"3px 10px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",color:"#dc2626",cursor:"pointer",fontSize:12.5}}>↩ Từ chối, làm lại</button>
              </>}
              <button onClick={()=>openEditStep(s,idx)} style={{padding:"3px 8px",border:"1px solid #d1d5db",borderRadius:6,background:"#f9fafb",cursor:"pointer",fontSize:12.5,marginLeft:"auto"}}>✏️ Sửa</button>
              {canEditTask&&<button onClick={()=>insertStepAfter(idx)} style={{padding:"3px 8px",border:"1px solid #93c5fd",borderRadius:6,background:"#eff6ff",cursor:"pointer",fontSize:12.5,color:"#1d4ed8"}}>⤵ Chèn dưới</button>}
              {canEditTask&&<button onClick={()=>deleteStep(idx)} style={{padding:"3px 8px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",cursor:"pointer",fontSize:11,color:"#dc2626"}}>🗑️</button>}
            </div>
          </div>))}
        </div>
      </div>
      {(canEditTask||canDeleteTask)&&<div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",position:"sticky",bottom:0,background:"#fff"}}>
        {canEditTask?<button onClick={onEdit} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>✏️ Sửa nhiệm vụ</button>:<span/>}
        {canDeleteTask?<button onClick={onDelete} style={{padding:"8px 16px",border:"1px solid #fca5a5",borderRadius:8,background:"#fff0f0",cursor:"pointer",fontSize:13,color:"#dc2626"}}>🗑️ Xóa nhiệm vụ</button>:<span/>}
      </div>}
    </div>
    {/* ── Popup duyệt & đánh giá bước ── */}
    {approvalPopup&&(<div onClick={()=>setApprovalPopup(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:80,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:380,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb"}}><div style={{fontWeight:600,fontSize:15}}>✅ Duyệt hoàn thành bước</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{steps[approvalPopup.idx]?.content}</div></div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:8,fontWeight:500}}>Đánh giá chất lượng kết quả</div>
            <div style={{display:"flex",gap:8}}>
              {Object.entries(STEP_QUALITY).map(([k,v])=><button key={k} onClick={()=>setApprovalPopup(p=>({...p,quality:Number(k)}))} style={{flex:1,padding:"10px 6px",border:"2px solid "+(approvalPopup.quality===Number(k)?v.col:"#e5e7eb"),borderRadius:10,background:approvalPopup.quality===Number(k)?v.bg:"#fff",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{fontSize:18,color:v.col}}>{v.star}</span>
                <span style={{fontSize:12,fontWeight:600,color:v.col}}>{v.label}</span>
              </button>)}
            </div>
          </div>
          <div>
            <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Nhận xét (không bắt buộc)</label>
            <input value={approvalPopup.note} onChange={e=>setApprovalPopup(p=>({...p,note:e.target.value}))} placeholder="VD: Kết quả đầy đủ, đúng yêu cầu..." style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13,boxSizing:"border-box"}}/>
          </div>
        </div>
        <div style={{padding:"0 20px 18px",display:"flex",gap:10}}>
          <button onClick={()=>setApprovalPopup(null)} style={{flex:1,padding:"9px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button>
          <button onClick={confirmApproval} style={{flex:2,padding:"9px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Xác nhận duyệt</button>
        </div>
      </div>
    </div>)}
    {editStep!==null&&stepDraft&&(<div onClick={()=>setEditStep(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:70,padding:"12px 8px",overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:14}}>Sửa bước {editStep+1}</span><button onClick={()=>setEditStep(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div>
        <div style={{padding:18,display:"flex",flexDirection:"column",gap:10}}>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Nội dung công việc</label><textarea value={stepDraft.content||""} onChange={e=>setStepDraft(d=>({...d,content:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Hạn hoàn thành</label><input type="date" value={stepDraft.deadline||""} onChange={e=>setStepDraft(d=>({...d,deadline:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>👤 Người chủ trì</label><select value={stepDraft.lead_eid||""} onChange={e=>setStepDraft(d=>({...d,lead_eid:e.target.value}))} style={inp}><option value="">— Không gán —</option>{teamEmps.map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}</select></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>🤝 Người phối hợp (chọn nhiều)</label><div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:140,overflowY:"auto",padding:"4px 0"}}>{teamEmps.map(e=>{const sel=(stepDraft.collab_eids||[]).includes(e.id);const isLead=stepDraft.lead_eid===e.id;return(<button key={e.id} disabled={isLead} onClick={()=>{const c=stepDraft.collab_eids||[];const nc=sel?c.filter(x=>x!==e.id):[...c,e.id];setStepDraft(d=>({...d,collab_eids:nc}));}} style={{padding:"4px 10px",border:"1.5px solid "+(sel?"#16a34a":"#e5e7eb"),borderRadius:20,background:sel?"#dcfce7":"#fff",color:sel?"#15803d":"#6b7280",cursor:isLead?"default":"pointer",fontSize:11,fontWeight:sel?600:400,opacity:isLead?0.4:1}}>{sel&&"✓ "}{e.name}{isLead&&" (chủ trì)"}</button>);})}</div></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Ghi chú</label><input value={stepDraft.note||""} onChange={e=>setStepDraft(d=>({...d,note:e.target.value}))} style={inp}/></div>
        </div>
        <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setEditStep(null)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={saveStep} style={{padding:"8px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Lưu bước</button></div>
      </div>
    </div>)}
  </div>);
}

// ───── Form tạo/sửa nhiệm vụ ─────
function TaskForm({form,setForm,onClose,onSave,employees,isMobile,inp,saving}){
  const team=parseJSON(form.team,[]);
  const setRole=(eid,role)=>{
    let t=team.filter(m=>m.eid!==eid); // bỏ gán cũ của người này
    if(role==="leader"||role==="deputy")t=t.filter(m=>m.role!==role); // chỉ 1 người giữ vai trò leader/deputy
    if(role)t=[...t,{eid,role}];
    setForm(f=>({...f,team:JSON.stringify(t)}));
  };
  const getRole=eid=>team.find(m=>m.eid===eid)?.role||"";
  const empsByDept=useMemo(()=>{const g={};(employees||[]).forEach(e=>{(g[e.dept]=g[e.dept]||[]).push(e);});return g;},[employees]);

  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:isMobile?"12px 8px":16}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:600,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}><span style={{fontWeight:600,fontSize:15}}>{form.id?"Chỉnh sửa nhiệm vụ":"Tạo nhiệm vụ khác"}</span><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tên nhiệm vụ *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="VD: Tổ rà soát quy trình nội bộ" style={inp}/></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Nội dung nhiệm vụ</label><textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={3} style={{...inp,resize:"vertical"}}/></div>
        <div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",background:"#f8fafc",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6}}><span>👥</span><span style={{fontWeight:500,fontSize:13}}>Thành viên thực hiện</span>{team.length>0&&<span style={{background:"#dcfce7",color:"#15803d",fontSize:11,padding:"1px 8px",borderRadius:10}}>{team.length}</span>}</div>
          <div style={{padding:12,maxHeight:320,overflowY:"auto"}}>
            {Object.entries(empsByDept).map(([dept,emps])=>(<div key={dept} style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:600,color:DEPT_COLOR[dept]||"#6b7280",marginBottom:6}}>{dept}</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {emps.map(e=>{const r=getRole(e.id);return(
                  <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"5px 8px",background:r?"#f8fafc":"transparent",borderRadius:6}}>
                    <span style={{fontSize:13,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</span>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      {ROLE_ORDER.map(role=>{const active=r===role;const info=TEAM_ROLES[role];return(
                        <button key={role} onClick={()=>setRole(e.id,active?"":role)} title={info.label} style={{padding:"3px 8px",border:"1.5px solid "+(active?info.col:"#e5e7eb"),borderRadius:14,background:active?info.bg:"#fff",color:active?info.col:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:active?600:400}}>{info.icon}</button>
                      );})}
                    </div>
                  </div>
                );})}
              </div>
            </div>))}
          </div>
        </div>
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={onClose} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={onSave} disabled={saving} style={{padding:"8px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>{saving?"Đang lưu…":(form.id?"Cập nhật":"Tạo nhiệm vụ")}</button></div>
    </div>
  </div>);
}

// ───── COMPONENT CHÍNH ─────
export default function OtherTasks({ currentUser, employees, getEmp, isMobile, inp, showToast, tasksData, setTasksData }) {
  // Dùng state chung từ App.jsx nếu được truyền vào (để thông báo chờ duyệt cập nhật ngay lập tức),
  // ngược lại tự tải và quản lý state riêng.
  const [localTasks,setLocalTasks]=useState([]);
  const [loading,setLoading]=useState(!tasksData);
  const tasks=tasksData||localTasks;
  const setTasks=setTasksData||setLocalTasks;
  const [form,setForm]=useState(null);
  const [detail,setDetail]=useState(null);
  const [saving,setSaving]=useState(false);
  const [dateFrom,setDateFrom]=useState(""); const [dateTo,setDateTo]=useState("");

  const canManage=["admin","director","manager_hcth","manager","deputy_manager"].includes(currentUser?.role);

  const taskStatus=(t)=>{const steps=parseJSON(t.steps,[]);if(steps.length===0)return"pending";const done=steps.filter(s=>s.status==="done").length;if(countOverdueSteps(steps)>0)return"overdue";if(done===steps.length)return"done";return"doing";};

  const filteredTasks=useMemo(()=>tasks.filter(t=>{if(dateFrom&&(!t.created||t.created<dateFrom))return false;if(dateTo&&(!t.created||t.created>dateTo))return false;return true;}),[tasks,dateFrom,dateTo]);

  useEffect(()=>{
    if(tasksData){setLoading(false);return;} // đã có dữ liệu từ App.jsx
    (async()=>{setLoading(true);try{const{data}=await supabase.from("other_tasks").select("*").order("created",{ascending:false});setLocalTasks(data||[]);}catch{showToast&&showToast("Lỗi tải nhiệm vụ","error");}setLoading(false);})();
  },[]);

  const openCreate=()=>setForm({name:"",content:"",team:"[]",steps:"[]"});
  const openEdit=(t)=>{setForm({...t});setDetail(null);};

  const saveTask=async()=>{
    if(!form.name?.trim()){showToast&&showToast("Nhập tên nhiệm vụ","error");return;}
    setSaving(true);
    if(form.id){
      const upd={name:form.name,content:form.content,team:form.team};
      const{error}=await supabase.from("other_tasks").update(upd).eq("id",form.id);
      if(!error){setTasks(p=>p.map(x=>x.id===form.id?{...x,...upd}:x));showToast&&showToast("Đã cập nhật nhiệm vụ");setForm(null);}
      else showToast&&showToast("Lỗi: "+(error.message||""),"error");
    }else{
      const t={id:`ot${Date.now()}`,name:form.name,content:form.content,team:form.team,steps:form.steps||"[]",created:todayStr,created_by:currentUser.full_name};
      const{error}=await supabase.from("other_tasks").insert(t);
      if(!error){setTasks(p=>[t,...p]);showToast&&showToast("Đã tạo nhiệm vụ");setForm(null);}
      else showToast&&showToast("Lỗi: "+(error.message||""),"error");
    }
    setSaving(false);
  };

  const deleteTask=async id=>{if(!window.confirm("Xóa vĩnh viễn nhiệm vụ này?"))return;await supabase.from("other_tasks").delete().eq("id",id);setTasks(p=>p.filter(x=>x.id!==id));setDetail(null);showToast&&showToast("Đã xóa nhiệm vụ");};
  const updateSteps=async(task,newSteps)=>{const stepsStr=JSON.stringify(newSteps);const{error}=await supabase.from("other_tasks").update({steps:stepsStr}).eq("id",task.id);if(!error){setTasks(p=>p.map(x=>x.id===task.id?{...x,steps:stepsStr}:x));setDetail(d=>d&&d.id===task.id?{...d,steps:stepsStr}:d);}else showToast&&showToast("Lỗi cập nhật bước","error");};

  return (<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"flex-end"}}>{canManage&&<button onClick={openCreate} style={{background:"#059669",color:"#fff",border:"none",borderRadius:8,padding:isMobile?"6px 12px":"7px 16px",fontSize:isMobile?12:13,cursor:"pointer",fontWeight:500}}>+ Nhiệm vụ khác</button>}</div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"10px 12px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:12,color:"#6b7280",fontWeight:500}}>📅 Ngày tạo:</span>
      <span style={{fontSize:12,color:"#6b7280"}}>Từ ngày</span>
      <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:"6px 8px",border:"1px solid #d1d5db",borderRadius:7,fontSize:12}}/>
      <span style={{fontSize:12,color:"#6b7280"}}>Đến ngày</span>
      <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:"6px 8px",border:"1px solid #d1d5db",borderRadius:7,fontSize:12}}/>
      {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("");}} style={{padding:"5px 10px",border:"1px solid #d1d5db",borderRadius:7,background:"#f9fafb",cursor:"pointer",fontSize:12,color:"#6b7280"}}>✕ Bỏ lọc ngày</button>}
    </div>

    {loading?(<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Đang tải…</div>):filteredTasks.length===0?(
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:40,marginBottom:8}}>📌</div><div style={{fontSize:14,marginBottom:4}}>{tasks.length===0?"Chưa có nhiệm vụ nào":"Không có nhiệm vụ trong khoảng thời gian này"}</div>{canManage&&tasks.length===0&&<div style={{fontSize:12}}>Bấm "+ Nhiệm vụ khác" ở góc trên để tạo mới</div>}</div>
    ):(
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:12}}>
        {filteredTasks.map(t=>{
          const steps=parseJSON(t.steps,[]);
          const team=parseJSON(t.team,[]);
          const doneSteps=steps.filter(s=>s.status==="done").length;
          const pct=steps.length?Math.round(doneSteps/steps.length*100):0;
          const overdueN=countOverdueSteps(steps);
          const st=taskStatus(t);
          const leader=team.find(m=>m.role==="leader");
          const deputy=team.find(m=>m.role==="deputy");
          const memberCount=team.filter(m=>m.role==="member").length;
          return(<div key={t.id} onClick={()=>setDetail(t)} style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",borderLeft:"4px solid "+(st==="done"?"#16a34a":st==="overdue"?"#dc2626":st==="pending"?"#94a3b8":"#3b82f6"),padding:16,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
              <div style={{fontWeight:600,fontSize:14,flex:1}}>{t.name}{overdueN>0&&<span style={{marginLeft:6,fontSize:10,background:"#fee2e2",color:"#b91c1c",padding:"1px 7px",borderRadius:8,fontWeight:600,whiteSpace:"nowrap"}}>⚠ {overdueN} trễ</span>}</div>
              <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:8,whiteSpace:"nowrap",background:st==="done"?"#dcfce7":st==="overdue"?"#fee2e2":st==="pending"?"#f1f5f9":"#dbeafe",color:st==="done"?"#15803d":st==="overdue"?"#b91c1c":st==="pending"?"#64748b":"#1d4ed8"}}>{st==="done"?"✅ Hoàn thành":st==="overdue"?"⚠️ Có bước trễ":st==="pending"?"⬜ Chưa bắt đầu":"🔄 Đang thực hiện"}</span>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {leader&&getEmp(leader.eid)&&<span style={{fontSize:11,background:TEAM_ROLES.leader.bg,color:TEAM_ROLES.leader.col,padding:"2px 8px",borderRadius:8}}>⭐ {getEmp(leader.eid)?.name}</span>}
              {deputy&&getEmp(deputy.eid)&&<span style={{fontSize:11,background:TEAM_ROLES.deputy.bg,color:TEAM_ROLES.deputy.col,padding:"2px 8px",borderRadius:8}}>🔹 {getEmp(deputy.eid)?.name}</span>}
              {memberCount>0&&<span style={{fontSize:11,background:"#f1f5f9",color:"#475569",padding:"2px 8px",borderRadius:8}}>👤 +{memberCount} thành viên</span>}
            </div>
            <div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span style={{color:"#6b7280"}}>Tiến độ</span><span style={{fontWeight:600,color:pct===100?"#15803d":"#1d4ed8"}}>{doneSteps}/{steps.length} bước · {pct}%</span></div><div style={{height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:pct===100?"#16a34a":"#3b82f6",borderRadius:6}}/></div></div>
          </div>);
        })}
      </div>
    )}

    {form&&<TaskForm form={form} setForm={setForm} onClose={()=>setForm(null)} onSave={saveTask} employees={employees} isMobile={isMobile} inp={inp} saving={saving}/>}
    {detail&&<TaskDetail task={detail} onClose={()=>setDetail(null)} getEmp={getEmp} employees={employees} isMobile={isMobile} onEdit={()=>openEdit(detail)} onDelete={()=>deleteTask(detail.id)} onUpdateSteps={updateSteps} inp={inp} currentUser={currentUser} canManage={canManage}/>}
  </div>);
}
