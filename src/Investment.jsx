import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const DEPTS = ["HCTH","QL-KTDL","HT-NTS"];
const DEPT_COLOR = {"HCTH":"#6366f1","QL-KTDL":"#0ea5e9","HT-NTS":"#10b981"};
const today=new Date();today.setHours(0,0,0,0);
const todayStr=today.toISOString().split("T")[0];
const parseJSON=(v,d=[])=>{try{return JSON.parse(v||JSON.stringify(d));}catch{return d;}};

// ───── ĐẦU TƯ: Quy trình & trạng thái ─────
const INV_STEP_STATUS = {pending:{label:"Chưa làm",bg:"#f1f5f9",col:"#64748b"},doing:{label:"Đang làm",bg:"#dbeafe",col:"#1d4ed8"},done:{label:"Hoàn thành",bg:"#dcfce7",col:"#15803d"},skipped:{label:"Bỏ qua",bg:"#f3f4f6",col:"#9ca3af"}};
const isStepOverdue=s=>{if(!s.end||s.status==="done"||s.status==="skipped")return false;const d=new Date(s.end);d.setHours(0,0,0,0);return d<today;};
const countOverdueSteps=stepsArr=>(stepsArr||[]).filter(isStepOverdue).length;
const FUND_SOURCES = ["Vốn đầu tư công","Chi thường xuyên","Vốn sự nghiệp","Nguồn khác"];
// 2 mẫu quy trình rút gọn theo giai đoạn chính (có thể sửa/thêm bước khi dùng)
const INV_TEMPLATES = {
  dautu:{name:"Đầu tư công",steps:[
    {phase:"I. CHUẨN BỊ ĐẦU TƯ",content:"Phê duyệt chủ trương đầu tư",lead:"Chủ đầu tư / STC"},
    {phase:"I. CHUẨN BỊ ĐẦU TƯ",content:"Lập, thẩm định, phê duyệt Báo cáo NCKT (BC KT-KT)",lead:"Đơn vị tư vấn / Hội đồng thẩm định"},
    {phase:"I. CHUẨN BỊ ĐẦU TƯ",content:"Khảo sát, lập nhiệm vụ và dự toán chuẩn bị đầu tư",lead:"Chủ đầu tư"},
    {phase:"I. CHUẨN BỊ ĐẦU TƯ",content:"Phê duyệt kế hoạch lựa chọn nhà thầu giai đoạn CBĐT",lead:"Chủ đầu tư"},
    {phase:"II. THỰC HIỆN DỰ ÁN",content:"Thành lập Ban quản lý dự án, mở tài khoản tại kho bạc",lead:"Chủ đầu tư"},
    {phase:"II. THỰC HIỆN DỰ ÁN",content:"Gói thầu tư vấn lập thiết kế chi tiết và dự toán",lead:"Chủ đầu tư / Nhà thầu TV"},
    {phase:"II. THỰC HIỆN DỰ ÁN",content:"Thẩm tra, thẩm định, phê duyệt TKCT và dự toán",lead:"Đơn vị thẩm định"},
    {phase:"II. THỰC HIỆN DỰ ÁN",content:"Đấu thầu các gói thầu thi công",lead:"Chủ đầu tư"},
    {phase:"II. THỰC HIỆN DỰ ÁN",content:"Triển khai thi công / cung cấp hàng hóa",lead:"Nhà thầu trúng thầu"},
    {phase:"III. KẾT THÚC",content:"Nghiệm thu, bàn giao đưa vào sử dụng",lead:"Chủ đầu tư + Nhà thầu"},
    {phase:"III. KẾT THÚC",content:"Thanh, quyết toán dự án",lead:"Chủ đầu tư"},
  ]},
  chitx:{name:"Chi thường xuyên",steps:[
    {phase:"I. CHUẨN BỊ",content:"Quyết định giao dự toán kinh phí",lead:"Chủ đầu tư"},
    {phase:"I. CHUẨN BỊ",content:"Phê duyệt dự toán & kế hoạch lựa chọn nhà thầu",lead:"Chủ đầu tư"},
    {phase:"I. CHUẨN BỊ",content:"Thuê tư vấn lập BC kinh tế kỹ thuật / kế hoạch thuê",lead:"Chủ đầu tư"},
    {phase:"I. CHUẨN BỊ",content:"Thẩm định, phê duyệt BC kinh tế kỹ thuật",lead:"STC / UBND tỉnh"},
    {phase:"II. THỰC HIỆN",content:"Thẩm định giá, phê duyệt dự toán",lead:"Chủ đầu tư + TV thẩm định giá"},
    {phase:"II. THỰC HIỆN",content:"Phê duyệt & đăng tải kế hoạch lựa chọn nhà thầu",lead:"Chủ đầu tư"},
    {phase:"II. THỰC HIỆN",content:"Lập, thẩm định E-HSMT và tổ chức đấu thầu",lead:"Tư vấn đấu thầu"},
    {phase:"II. THỰC HIỆN",content:"Đánh giá E-HSDT, phê duyệt kết quả lựa chọn nhà thầu",lead:"Chủ đầu tư"},
    {phase:"II. THỰC HIỆN",content:"Ký kết hợp đồng, triển khai thực hiện",lead:"Chủ đầu tư + Nhà thầu"},
    {phase:"II. THỰC HIỆN",content:"Hoàn thiện hệ thống, kiểm thử (nếu có)",lead:"Nhà thầu"},
    {phase:"III. KẾT THÚC",content:"Nghiệm thu, bàn giao đưa vào sử dụng",lead:"Chủ đầu tư + Nhà thầu"},
    {phase:"III. KẾT THÚC",content:"Thanh lý hợp đồng, quyết toán",lead:"Chủ đầu tư"},
  ]},
};
const fmtMoney=n=>{const v=Number(n)||0;return v.toLocaleString("vi-VN")+" đ";};

function ProjectDetail({proj,onClose,canManage,getEmp,employees,users,isMobile,onEdit,onDelete,onUpdateSteps,uploadFiles,uploadingFiles,inp,currentUser}){
  const steps=parseJSON(proj.steps,[]);
  const [editStep,setEditStep]=React.useState(null);
  const [stepDraft,setStepDraft]=React.useState(null);
  const doneCount=steps.filter(s=>s.status==="done").length;
  const pct=steps.length?Math.round(doneCount/steps.length*100):0;
  const remain=(Number(proj.total_budget)||0)-(Number(proj.spent)||0);
  const lead=getEmp(proj.lead_eid);
  // ── Phân quyền chi tiết ──
  const myEid=currentUser?.employee_id;
  const isBGD=["admin","director"].includes(currentUser?.role); // Ban Giám đốc
  const isProjLead=myEid&&myEid===proj.lead_eid; // Phụ trách chính dự án
  const isCreator=proj.created_by===currentUser?.full_name; // Người tạo dự án
  const canEditProject=isBGD||isProjLead; // Sửa dự án + thêm bước
  const canDeleteProject=isCreator; // Chỉ người tạo được xóa
  const canEditStep=(s)=>isBGD||isProjLead||(myEid&&s.lead_eid===myEid); // Sửa bước: BGĐ, PT chính, hoặc chủ trì bước đó
  const setStepStatus=async(idx,status)=>{const ns=steps.map((s,i)=>i===idx?{...s,status}:s);await onUpdateSteps(proj,ns);};
  const [openComment,setOpenComment]=React.useState(null);
  const [cmtText,setCmtText]=React.useState("");
  const [cmtFiles,setCmtFiles]=React.useState([]);
  const addStepComment=async(idx)=>{if(!cmtText.trim()&&cmtFiles.length===0)return;const c={by:currentUser.full_name,text:cmtText.trim(),files:cmtFiles,at:new Date().toLocaleString("vi-VN")};const ns=steps.map((s,i)=>i===idx?{...s,comments:[...(s.comments||[]),c]}:s);await onUpdateSteps(proj,ns);setCmtText("");setCmtFiles([]);};
  const openEditStep=(s,idx)=>{setEditStep(idx);setStepDraft({...s});};
  const saveStep=async()=>{const ns=steps.map((s,i)=>i===editStep?stepDraft:s);await onUpdateSteps(proj,ns);setEditStep(null);setStepDraft(null);};
  const deleteStep=async idx=>{if(!window.confirm("Xóa bước này?"))return;const ns=steps.filter((_,i)=>i!==idx).map((s,i)=>({...s,id:i+1}));await onUpdateSteps(proj,ns);};
  const addStep=async()=>{const ns=[...steps,{id:steps.length+1,phase:steps.length?steps[steps.length-1].phase:"",content:"Bước mới",lead:"",lead_eid:"",collab_eids:[],status:"pending",start:"",end:"",note:"",attachments:[]}].map((s,i)=>({...s,id:i+1}));await onUpdateSteps(proj,ns);setEditStep(ns.length-1);setStepDraft(ns[ns.length-1]);};
  const insertStepAfter=async(idx)=>{const newStep={phase:steps[idx]?.phase||"",content:"Bước mới",lead:"",lead_eid:"",collab_eids:[],status:"pending",start:"",end:"",note:"",attachments:[]};const ns=[...steps.slice(0,idx+1),newStep,...steps.slice(idx+1)].map((s,i)=>({...s,id:i+1}));await onUpdateSteps(proj,ns);setEditStep(idx+1);setStepDraft(ns[idx+1]);};
  const phases=[...new Set(steps.map(s=>s.phase))];
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:60,padding:isMobile?0:16}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:isMobile?"12px 12px 0 0":14,width:"100%",maxWidth:760,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"sticky",top:0,background:"#fff",zIndex:2}}>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{proj.name}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><span style={{fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:8}}>{proj.fund_source}</span>{proj.leader_id&&(users||[]).find(u=>u.id===proj.leader_id)&&<span style={{fontSize:11,background:"#fef3c7",color:"#92400e",padding:"2px 8px",borderRadius:8}}>⭐ LĐ: {(users||[]).find(u=>u.id===proj.leader_id)?.full_name}</span>}{lead&&<span style={{fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:8}}>👤 PT: {lead.name}</span>}</div>{parseJSON(proj.member_eids,[]).length>0&&<div style={{fontSize:11,color:"#15803d",marginTop:6}}>🤝 Thành viên: {parseJSON(proj.member_eids,[]).map(id=>getEmp(id)?.name).filter(Boolean).join(", ")}</div>}</div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af",marginLeft:8}}>✕</button>
      </div>
      <div style={{padding:20}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:16}}>
          <div style={{background:"#eff6ff",borderRadius:10,padding:12}}><div style={{fontSize:11,color:"#6b7280"}}>Tổng mức ĐT</div><div style={{fontSize:15,fontWeight:700,color:"#1e40af"}}>{fmtMoney(proj.total_budget)}</div></div>
          <div style={{background:"#fffbeb",borderRadius:10,padding:12}}><div style={{fontSize:11,color:"#6b7280"}}>Đã chi</div><div style={{fontSize:15,fontWeight:700,color:"#b45309"}}>{fmtMoney(proj.spent)}</div></div>
          <div style={{background:"#f0fdf4",borderRadius:10,padding:12}}><div style={{fontSize:11,color:"#6b7280"}}>Còn lại</div><div style={{fontSize:15,fontWeight:700,color:remain<0?"#dc2626":"#15803d"}}>{fmtMoney(remain)}</div></div>
          <div style={{background:"#f5f3ff",borderRadius:10,padding:12}}><div style={{fontSize:11,color:"#6b7280"}}>Tiến độ</div><div style={{fontSize:15,fontWeight:700,color:"#6d28d9"}}>{pct}%</div></div>
        </div>
        {proj.note&&<div style={{fontSize:13,color:"#475569",background:"#f8fafc",padding:"10px 14px",borderRadius:8,marginBottom:16}}>📝 {proj.note}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontWeight:600,fontSize:14}}>📋 Quy trình thực hiện ({doneCount}/{steps.length}){countOverdueSteps(steps)>0&&<span style={{marginLeft:8,fontSize:11,background:"#fee2e2",color:"#b91c1c",padding:"2px 8px",borderRadius:8,fontWeight:600}}>⚠ {countOverdueSteps(steps)} bước trễ hạn</span>}</div>
          {canEditProject&&<button onClick={addStep} style={{padding:"5px 12px",border:"1px solid #86efac",borderRadius:7,background:"#f0fdf4",cursor:"pointer",fontSize:12,color:"#15803d"}}>+ Thêm bước</button>}
        </div>
        <div style={{height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:pct+"%",background:pct===100?"#16a34a":"#3b82f6",borderRadius:6}}/></div>
        {phases.map(phase=>(<div key={phase} style={{marginBottom:16}}>
          {phase&&<div style={{fontSize:12,fontWeight:700,color:"#1e3a8a",background:"#eff6ff",padding:"6px 12px",borderRadius:6,marginBottom:8}}>{phase}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {steps.map((s,idx)=>s.phase===phase&&(<div key={idx} style={{border:"1px solid "+(isStepOverdue(s)?"#fca5a5":"#e5e7eb"),borderRadius:8,padding:"10px 12px",background:isStepOverdue(s)?"#fff5f5":(s.status==="done"?"#f0fdf4":"#fff")}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{s.id}. {s.content}</div>
                  {s.lead&&<div style={{fontSize:11,color:"#6b7280"}}>🏢 {s.lead}</div>}
                  {s.lead_eid&&getEmp(s.lead_eid)&&<div style={{fontSize:11,color:"#1d4ed8",marginTop:2}}>👤 Chủ trì: <b>{getEmp(s.lead_eid)?.name}</b></div>}
                  {(s.collab_eids||[]).length>0&&<div style={{fontSize:11,color:"#15803d",marginTop:2}}>🤝 Phối hợp: {(s.collab_eids||[]).map(id=>getEmp(id)?.name).filter(Boolean).join(", ")}</div>}
                  {(s.start||s.end)&&<div style={{fontSize:11,color:"#6b7280",marginTop:2}}>📅 {s.start||"?"} → {s.end||"?"}</div>}
                  {s.note&&<div style={{fontSize:11,color:"#475569",marginTop:2,fontStyle:"italic"}}>{s.note}</div>}
                  {(s.attachments||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{(s.attachments||[]).map((f,fi)=><a key={fi} href={f.url} target="_blank" rel="noreferrer" style={{fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:6,textDecoration:"none"}}>📎 {f.name}</a>)}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}><span style={{fontSize:10,background:INV_STEP_STATUS[s.status]?.bg,color:INV_STEP_STATUS[s.status]?.col,padding:"3px 8px",borderRadius:8,fontWeight:600}}>{INV_STEP_STATUS[s.status]?.label}</span>{isStepOverdue(s)&&<span style={{fontSize:10,background:"#fee2e2",color:"#b91c1c",padding:"3px 8px",borderRadius:8,fontWeight:600}}>⚠ Trễ hạn</span>}</div>
              </div>
              {canEditStep(s)&&<div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                {Object.entries(INV_STEP_STATUS).map(([k,v])=><button key={k} onClick={()=>setStepStatus(idx,k)} style={{padding:"3px 8px",border:"1px solid "+(s.status===k?v.col:"#e5e7eb"),borderRadius:6,background:s.status===k?v.bg:"#fff",color:s.status===k?v.col:"#9ca3af",cursor:"pointer",fontSize:11,fontWeight:s.status===k?600:400}}>{v.label}</button>)}
                <button onClick={()=>openEditStep(s,idx)} style={{padding:"3px 8px",border:"1px solid #d1d5db",borderRadius:6,background:"#f9fafb",cursor:"pointer",fontSize:11,marginLeft:"auto"}}>✏️ Sửa</button>
                {canEditProject&&<button onClick={()=>insertStepAfter(idx)} style={{padding:"3px 8px",border:"1px solid #93c5fd",borderRadius:6,background:"#eff6ff",cursor:"pointer",fontSize:11,color:"#1d4ed8"}}>⤵ Chèn dưới</button>}
                {canEditProject&&<button onClick={()=>deleteStep(idx)} style={{padding:"3px 8px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",cursor:"pointer",fontSize:11,color:"#dc2626"}}>🗑️</button>}
              </div>}
              <div style={{marginTop:8,borderTop:"1px solid #f3f4f6",paddingTop:8}}>
                <button onClick={()=>{setOpenComment(openComment===idx?null:idx);setCmtText("");setCmtFiles([]);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#4f46e5",padding:0,display:"flex",alignItems:"center",gap:4}}>💬 Trao đổi{(s.comments||[]).length>0&&<span style={{background:"#eef2ff",color:"#4338ca",fontSize:10,padding:"1px 7px",borderRadius:10,fontWeight:600}}>{(s.comments||[]).length}</span>}{openComment===idx?" ▲":" ▼"}</button>
                {openComment===idx&&<div style={{marginTop:8}}>
                  {(s.comments||[]).length>0&&<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>{(s.comments||[]).map((c,ci)=>(<div key={ci} style={{padding:"7px 10px",background:c.by===currentUser.full_name?"#eef2ff":"#f9fafb",borderRadius:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontWeight:600,fontSize:11,color:c.by===currentUser.full_name?"#4338ca":"#374151"}}>{c.by}</span><span style={{fontSize:10,color:"#9ca3af"}}>{c.at}</span></div>{c.text&&<div style={{fontSize:12}}>{c.text}</div>}{(c.files||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>{(c.files||[]).map((f,fi)=><a key={fi} href={f.url} target="_blank" rel="noreferrer" style={{fontSize:10,background:"#fff",border:"1px solid #d1d5db",color:"#4338ca",padding:"2px 7px",borderRadius:6,textDecoration:"none"}}>📎 {f.name}</a>)}</div>}</div>))}</div>}
                  {cmtFiles.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>{cmtFiles.map((f,fi)=><span key={fi} style={{fontSize:10,background:"#eef2ff",color:"#4338ca",padding:"2px 7px",borderRadius:6,display:"inline-flex",alignItems:"center",gap:3}}>📎 {f.name}<button onClick={()=>setCmtFiles(p=>p.filter((_,i)=>i!==fi))} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:11,padding:0}}>✕</button></span>)}</div>}
                  <div style={{display:"flex",gap:6}}>
                    <label style={{display:"flex",alignItems:"center",padding:"6px 9px",border:"1px solid #d1d5db",borderRadius:7,cursor:"pointer",background:"#f9fafb",fontSize:13,flexShrink:0}} title="Đính kèm file">📎<input type="file" multiple style={{display:"none"}} disabled={uploadingFiles} onChange={async e=>{const fl=Array.from(e.target.files);if(!fl.length)return;const up=await uploadFiles(fl,cmtFiles);setCmtFiles(up);e.target.value="";}}/></label>
                    <input value={cmtText} onChange={e=>setCmtText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addStepComment(idx)} placeholder={uploadingFiles?"Đang tải file...":"Nhập trao đổi… (Enter gửi)"} style={{...inp,flex:1,fontSize:12,padding:"6px 10px"}}/>
                    <button onClick={()=>addStepComment(idx)} style={{padding:"6px 12px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,flexShrink:0}}>Gửi</button>
                  </div>
                </div>}
              </div>
            </div>))}
          </div>
        </div>))}
      </div>
      {(canEditProject||canDeleteProject)&&<div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",position:"sticky",bottom:0,background:"#fff"}}>
        {canEditProject?<button onClick={onEdit} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>✏️ Sửa dự án</button>:<span/>}
        {canDeleteProject?<button onClick={onDelete} style={{padding:"8px 16px",border:"1px solid #fca5a5",borderRadius:8,background:"#fff0f0",cursor:"pointer",fontSize:13,color:"#dc2626"}}>🗑️ Xóa dự án</button>:<span/>}
      </div>}
    </div>
    {editStep!==null&&stepDraft&&(<div onClick={()=>setEditStep(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:70,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:14}}>Sửa bước {stepDraft.id}</span><button onClick={()=>setEditStep(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div>
        <div style={{padding:18,display:"flex",flexDirection:"column",gap:10}}>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Giai đoạn</label><input value={stepDraft.phase||""} onChange={e=>setStepDraft(d=>({...d,phase:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Nội dung công việc</label><textarea value={stepDraft.content||""} onChange={e=>setStepDraft(d=>({...d,content:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Chủ trì / Đơn vị thực hiện (gõ tự do)</label><input value={stepDraft.lead||""} onChange={e=>setStepDraft(d=>({...d,lead:e.target.value}))} placeholder="VD: Chủ đầu tư, STC..." style={inp}/></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>👤 Người chủ trì (chọn nhân viên)</label><select value={stepDraft.lead_eid||""} onChange={e=>setStepDraft(d=>({...d,lead_eid:e.target.value}))} style={inp}><option value="">— Không gán —</option>{(employees||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}</select></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>🤝 Thành viên phối hợp (chọn nhiều)</label><div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:110,overflowY:"auto",padding:"4px 0"}}>{(employees||[]).map(e=>{const sel=(stepDraft.collab_eids||[]).includes(e.id);const isLead=stepDraft.lead_eid===e.id;return(<button key={e.id} disabled={isLead} onClick={()=>{const c=stepDraft.collab_eids||[];const nc=sel?c.filter(x=>x!==e.id):[...c,e.id];setStepDraft(d=>({...d,collab_eids:nc}));}} style={{padding:"4px 10px",border:"1.5px solid "+(sel?"#16a34a":"#e5e7eb"),borderRadius:20,background:sel?"#dcfce7":"#fff",color:sel?"#15803d":"#6b7280",cursor:isLead?"default":"pointer",fontSize:11,fontWeight:sel?600:400,opacity:isLead?0.4:1}}>{sel&&"✓ "}{e.name}{isLead&&" (chủ trì)"}</button>);})}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Bắt đầu</label><input type="date" value={stepDraft.start||""} onChange={e=>setStepDraft(d=>({...d,start:e.target.value}))} style={inp}/></div>
            <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Kết thúc</label><input type="date" value={stepDraft.end||""} onChange={e=>setStepDraft(d=>({...d,end:e.target.value}))} style={inp}/></div>
          </div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Ghi chú</label><input value={stepDraft.note||""} onChange={e=>setStepDraft(d=>({...d,note:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>📎 Văn bản đính kèm</label>
            <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"1.5px dashed #d1d5db",borderRadius:8,cursor:"pointer",background:"#f9fafb",fontSize:12,color:"#6b7280"}}><span>🗂️</span><span>{uploadingFiles?"Đang upload...":"Chọn văn bản…"}</span><input type="file" multiple style={{display:"none"}} disabled={uploadingFiles} onChange={async e=>{const files=Array.from(e.target.files);if(!files.length)return;const up=await uploadFiles(files,stepDraft.attachments||[]);setStepDraft(d=>({...d,attachments:up}));e.target.value="";}}/></label>
            {(stepDraft.attachments||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{(stepDraft.attachments||[]).map((f,fi)=><span key={fi} style={{fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:6,display:"inline-flex",alignItems:"center",gap:4}}>📎 {f.name}<button onClick={()=>setStepDraft(d=>({...d,attachments:d.attachments.filter((_,i)=>i!==fi)}))} style={{background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:12,padding:0}}>✕</button></span>)}</div>}
          </div>
        </div>
        <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setEditStep(null)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={saveStep} style={{padding:"8px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Lưu bước</button></div>
      </div>
    </div>)}
  </div>);
}

// ───── COMPONENT CHÍNH: Tab Đầu tư ─────
export default function Investment({ currentUser, employees, users, getEmp, isMobile, inp, uploadFiles, uploadingFiles, showToast, headerSlot }) {
  const [projects,setProjects]=useState([]);
  const [projForm,setProjForm]=useState(null);
  const [projDetail,setProjDetail]=useState(null);
  const [showReport,setShowReport]=useState(false);
  const [statusFilter,setStatusFilter]=useState(null);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);

  const userDept=useMemo(()=>!currentUser||!employees?null:employees.find(e=>e.id===currentUser.employee_id)?.dept||null,[currentUser,employees]);
  const leaders=useMemo(()=>(users||[]).filter(u=>u.role==="director"||u.role==="admin"),[users]);
  const canSeeAll=["admin","director","manager_hcth"].includes(currentUser?.role);
  const canManageInvest=["admin","director","manager_hcth","manager","deputy_manager"].includes(currentUser?.role);
  const invStats=useMemo(()=>({budget:projects.reduce((s,p)=>s+(Number(p.total_budget)||0),0),spent:projects.reduce((s,p)=>s+(Number(p.spent)||0),0)}),[projects]);
  const projStatus=(p)=>{const steps=parseJSON(p.steps,[]);if(steps.length===0)return"pending";const done=steps.filter(s=>s.status==="done").length;if(countOverdueSteps(steps)>0)return"overdue";if(done===steps.length)return"done";return"doing";};
  const statusCounts=useMemo(()=>{let done=0,doing=0,overdue=0;projects.forEach(p=>{const st=projStatus(p);if(st==="done")done++;else if(st==="overdue")overdue++;else doing++;});return{done,doing,overdue};},[projects]);
  const filteredProjects=useMemo(()=>statusFilter?projects.filter(p=>projStatus(p)===statusFilter):projects,[projects,statusFilter]);
  const reportRows=useMemo(()=>projects.map(p=>{const steps=parseJSON(p.steps,[]);const done=steps.filter(s=>s.status==="done").length;const doing=steps.filter(s=>s.status==="doing").length;const pct=steps.length?Math.round(done/steps.length*100):0;const overdue=countOverdueSteps(steps);const budget=Number(p.total_budget)||0;const spent=Number(p.spent)||0;const ld=(users||[]).find(u=>u.id===p.leader_id);const members=parseJSON(p.member_eids,[]).length;return{id:p.id,name:p.name,dept:p.dept,fund:p.fund_source,leader:ld?ld.full_name:"—",lead:getEmp(p.lead_eid)?.name||"—",members,total:steps.length,done,doing,pct,overdue,budget,spent,remain:budget-spent};}),[projects,users]);
  const reportChart=useMemo(()=>reportRows.map(r=>({name:r.name.length>14?r.name.slice(0,14)+"…":r.name,"Tiến độ":r.pct,"Trễ hạn":r.overdue})),[reportRows]);
  const statusPie=useMemo(()=>{let pending=0,doing=0,done=0,skipped=0;projects.forEach(p=>parseJSON(p.steps,[]).forEach(s=>{if(s.status==="done")done++;else if(s.status==="doing")doing++;else if(s.status==="skipped")skipped++;else pending++;}));return[{name:"Hoàn thành",value:done,fill:"#16a34a"},{name:"Đang làm",value:doing,fill:"#3b82f6"},{name:"Chưa làm",value:pending,fill:"#94a3b8"},{name:"Bỏ qua",value:skipped,fill:"#d1d5db"}].filter(x=>x.value>0);},[projects]);
  const exportReportCSV=()=>{const head=["Tên dự án","Nguồn vốn","Lãnh đạo PT","Phụ trách chính","Số thành viên","Tổng bước","Hoàn thành","Tiến độ %","Bước trễ","Tổng mức (đ)","Đã chi (đ)","Còn lại (đ)"];const rows=reportRows.map(r=>[r.name,r.fund,r.leader,r.lead,r.members,r.total,r.done,r.pct,r.overdue,r.budget,r.spent,r.remain]);const csv="\uFEFF"+[head,...rows].map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`BaoCao_NhiemVuNganSach_${todayStr}.csv`;a.click();URL.revokeObjectURL(url);};
  const exportReportPDF=()=>{const w=window.open("","_blank");if(!w)return;const rowsHtml=reportRows.map(r=>`<tr><td>${r.name}</td><td>${r.fund}</td><td>${r.leader}</td><td>${r.lead}</td><td style="text-align:center">${r.members}</td><td style="text-align:center">${r.done}/${r.total} (${r.pct}%)</td><td style="text-align:center;color:${r.overdue>0?"#b91c1c":"#333"}">${r.overdue}</td><td style="text-align:right">${fmtMoney(r.budget)}</td><td style="text-align:right">${fmtMoney(r.spent)}</td><td style="text-align:right">${fmtMoney(r.remain)}</td></tr>`).join("");w.document.write(`<html><head><meta charset="utf-8"><title>Báo cáo Nhiệm vụ ngân sách</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:18px;text-align:center;color:#1e3a8a}h2{font-size:13px;text-align:center;color:#64748b;font-weight:400;margin-top:-8px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px 8px}th{background:#1d4ed8;color:#fff;font-size:11px}tr:nth-child(even){background:#f8fafc}.sum{margin-top:16px;font-size:12px}</style></head><body><h1>BÁO CÁO TIẾN ĐỘ NHIỆM VỤ NGÂN SÁCH</h1><h2>Trung tâm Giám sát, Điều hành Đô thị thông minh tỉnh Đắk Lắk · Ngày ${new Date().toLocaleDateString("vi-VN")}</h2><div class="sum">Tổng số dự án: <b>${reportRows.length}</b> · Tổng mức đầu tư: <b>${fmtMoney(invStats.budget)}</b> · Đã chi: <b>${fmtMoney(invStats.spent)}</b> · Còn lại: <b>${fmtMoney(invStats.budget-invStats.spent)}</b></div><table><thead><tr><th>Tên dự án</th><th>Nguồn vốn</th><th>Lãnh đạo PT</th><th>Phụ trách chính</th><th>TV</th><th>Tiến độ</th><th>Trễ</th><th>Tổng mức</th><th>Đã chi</th><th>Còn lại</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);w.document.close();setTimeout(()=>w.print(),400);};

  useEffect(()=>{(async()=>{setLoading(true);try{const{data}=await supabase.from("projects").select("*").order("created",{ascending:false});setProjects(data||[]);}catch{showToast&&showToast("Lỗi tải dự án","error");}setLoading(false);})();},[]);

  const openCreate=()=>setProjForm({name:"",dept:userDept||DEPTS[0],leader_id:"",fund_source:FUND_SOURCES[0],total_budget:0,spent:0,lead_eid:"",member_eids:"[]",deadline:"",note:"",steps:JSON.stringify(INV_TEMPLATES.dautu.steps.map((s,i)=>({...s,id:i+1,status:"pending",start:"",end:"",note:"",attachments:[],lead_eid:"",collab_eids:[]})))});

  const saveProject=async()=>{if(!projForm.name||!projForm.dept){showToast&&showToast("Nhập tên dự án và phòng ban","error");return;}setSaving(true);const f=projForm;if(f.id){const upd={name:f.name,dept:f.dept,leader_id:f.leader_id||"",fund_source:f.fund_source,total_budget:Number(f.total_budget)||0,spent:Number(f.spent)||0,lead_eid:f.lead_eid,member_eids:f.member_eids,deadline:f.deadline,note:f.note,steps:f.steps};const{error}=await supabase.from("projects").update(upd).eq("id",f.id);if(!error){setProjects(p=>p.map(x=>x.id===f.id?{...x,...upd}:x));showToast&&showToast("Đã cập nhật dự án");setProjForm(null);}else showToast&&showToast("Lỗi: "+(error.message||""),"error");}else{const proj={id:`pj${Date.now()}`,name:f.name,dept:f.dept,leader_id:f.leader_id||"",fund_source:f.fund_source,total_budget:Number(f.total_budget)||0,spent:Number(f.spent)||0,lead_eid:f.lead_eid,member_eids:f.member_eids,deadline:f.deadline,note:f.note,steps:f.steps,created:todayStr,created_by:currentUser.full_name};const{error}=await supabase.from("projects").insert(proj);if(!error){setProjects(p=>[proj,...p]);showToast&&showToast("Đã tạo dự án");setProjForm(null);}else showToast&&showToast("Lỗi: "+(error.message||""),"error");}setSaving(false);};
  const deleteProject=async id=>{if(!window.confirm("Xóa vĩnh viễn dự án này?"))return;setSaving(true);await supabase.from("projects").delete().eq("id",id);setProjects(p=>p.filter(x=>x.id!==id));setProjDetail(null);setSaving(false);showToast&&showToast("Đã xóa dự án");};
  const updateProjectSteps=async(proj,newSteps)=>{const stepsStr=JSON.stringify(newSteps);const{error}=await supabase.from("projects").update({steps:stepsStr}).eq("id",proj.id);if(!error){setProjects(p=>p.map(x=>x.id===proj.id?{...x,steps:stepsStr}:x));setProjDetail(d=>d&&d.id===proj.id?{...d,steps:stepsStr}:d);}else showToast&&showToast("Lỗi cập nhật bước","error");};

  return (<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setShowReport(true)} style={{background:"#fff",color:"#1d4ed8",border:"1px solid #bfdbfe",borderRadius:8,padding:isMobile?"6px 12px":"7px 16px",fontSize:isMobile?12:13,cursor:"pointer",fontWeight:500}}>📊 Báo cáo</button>{canManageInvest&&<button onClick={openCreate} style={{background:"#059669",color:"#fff",border:"none",borderRadius:8,padding:isMobile?"6px 12px":"7px 16px",fontSize:isMobile?12:13,cursor:"pointer",fontWeight:500}}>+ Dự án đầu tư</button>}</div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Số dự án</div><div style={{fontSize:22,fontWeight:700,color:"#059669"}}>{projects.length}</div></div>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Tổng mức ĐT</div><div style={{fontSize:16,fontWeight:700,color:"#1e40af"}}>{fmtMoney(invStats.budget)}</div></div>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Đã chi</div><div style={{fontSize:16,fontWeight:700,color:"#b45309"}}>{fmtMoney(invStats.spent)}</div></div>
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Còn lại</div><div style={{fontSize:16,fontWeight:700,color:"#15803d"}}>{fmtMoney(invStats.budget-invStats.spent)}</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
      <div onClick={()=>setStatusFilter(null)} style={{background:statusFilter===null?"#e0e7ff":"#eef2ff",borderRadius:10,border:"1.5px solid "+(statusFilter===null?"#6366f1":"#c7d2fe"),padding:14,cursor:"pointer"}}><div style={{fontSize:11,color:"#4f46e5",fontWeight:500}}>📁 Tất cả dự án</div><div style={{fontSize:22,fontWeight:700,color:"#4f46e5"}}>{projects.length}</div></div>
      <div onClick={()=>setStatusFilter(statusFilter==="done"?null:"done")} style={{background:statusFilter==="done"?"#bbf7d0":"#f0fdf4",borderRadius:10,border:"1.5px solid "+(statusFilter==="done"?"#16a34a":"#bbf7d0"),padding:14,cursor:"pointer"}}><div style={{fontSize:11,color:"#15803d",fontWeight:500}}>✅ Hoàn thành</div><div style={{fontSize:22,fontWeight:700,color:"#15803d"}}>{statusCounts.done}</div></div>
      <div onClick={()=>setStatusFilter(statusFilter==="doing"?null:"doing")} style={{background:statusFilter==="doing"?"#bfdbfe":"#eff6ff",borderRadius:10,border:"1.5px solid "+(statusFilter==="doing"?"#3b82f6":"#bfdbfe"),padding:14,cursor:"pointer"}}><div style={{fontSize:11,color:"#1d4ed8",fontWeight:500}}>🔄 Đang thực hiện</div><div style={{fontSize:22,fontWeight:700,color:"#1d4ed8"}}>{statusCounts.doing}</div></div>
      <div onClick={()=>setStatusFilter(statusFilter==="overdue"?null:"overdue")} style={{background:statusFilter==="overdue"?"#fecaca":"#fef2f2",borderRadius:10,border:"1.5px solid "+(statusFilter==="overdue"?"#dc2626":"#fecaca"),padding:14,cursor:"pointer"}}><div style={{fontSize:11,color:"#dc2626",fontWeight:500}}>⚠️ Có bước trễ</div><div style={{fontSize:22,fontWeight:700,color:"#dc2626"}}>{statusCounts.overdue}</div></div>
    </div>
    {loading?(<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Đang tải dự án…</div>):projects.length===0?(
      <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:40,marginBottom:8}}>💰</div><div style={{fontSize:14,marginBottom:4}}>Chưa có dự án đầu tư nào</div>{canManageInvest&&<div style={{fontSize:12}}>Bấm "+ Dự án đầu tư" ở góc trên để tạo mới</div>}</div>
    ):(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {statusFilter&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#6b7280"}}><span>Đang lọc: <b style={{color:statusFilter==="done"?"#15803d":statusFilter==="overdue"?"#dc2626":"#1d4ed8"}}>{statusFilter==="done"?"✅ Hoàn thành":statusFilter==="overdue"?"⚠️ Có bước trễ":"🔄 Đang thực hiện"}</b> ({filteredProjects.length} dự án)</span><button onClick={()=>setStatusFilter(null)} style={{padding:"2px 10px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✕ Bỏ lọc</button></div>}
        {filteredProjects.length===0?<div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:30,textAlign:"center",color:"#9ca3af",fontSize:13}}>Không có dự án nào ở trạng thái này</div>:
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:12}}>
        {filteredProjects.map(p=>{const steps=parseJSON(p.steps,[]);const doneSteps=steps.filter(s=>s.status==="done").length;const pct=steps.length?Math.round(doneSteps/steps.length*100):0;const remain=(Number(p.total_budget)||0)-(Number(p.spent)||0);const overdueN=countOverdueSteps(steps);return(
          <div key={p.id} onClick={()=>setProjDetail(p)} style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",borderLeft:"4px solid "+(projStatus(p)==="done"?"#16a34a":projStatus(p)==="overdue"?"#dc2626":projStatus(p)==="pending"?"#94a3b8":"#3b82f6"),padding:16,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}><div style={{fontWeight:600,fontSize:14,flex:1}}>{p.name}{overdueN>0&&<span style={{marginLeft:6,fontSize:10,background:"#fee2e2",color:"#b91c1c",padding:"1px 7px",borderRadius:8,fontWeight:600,whiteSpace:"nowrap"}}>⚠ {overdueN} trễ</span>}</div><div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}><span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:8,whiteSpace:"nowrap",background:projStatus(p)==="done"?"#dcfce7":projStatus(p)==="overdue"?"#fee2e2":projStatus(p)==="pending"?"#f1f5f9":"#dbeafe",color:projStatus(p)==="done"?"#15803d":projStatus(p)==="overdue"?"#b91c1c":projStatus(p)==="pending"?"#64748b":"#1d4ed8"}}>{projStatus(p)==="done"?"✅ Hoàn thành":projStatus(p)==="overdue"?"⚠️ Có bước trễ":projStatus(p)==="pending"?"⬜ Chưa bắt đầu":"🔄 Đang thực hiện"}</span><span style={{background:DEPT_COLOR[p.dept]+"22",color:DEPT_COLOR[p.dept],fontSize:11,padding:"2px 8px",borderRadius:8}}>{p.dept}</span></div></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}><span style={{fontSize:11,background:"#f1f5f9",color:"#475569",padding:"2px 8px",borderRadius:8}}>{p.fund_source}</span>{p.leader_id&&(users||[]).find(u=>u.id===p.leader_id)&&<span style={{fontSize:11,background:"#fef3c7",color:"#92400e",padding:"2px 8px",borderRadius:8}}>⭐ {(users||[]).find(u=>u.id===p.leader_id)?.full_name}</span>}{getEmp(p.lead_eid)&&<span style={{fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:8}}>👤 {getEmp(p.lead_eid)?.name}</span>}</div>
            <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span style={{color:"#6b7280"}}>Tiến độ quy trình</span><span style={{fontWeight:600,color:pct===100?"#15803d":"#1d4ed8"}}>{doneSteps}/{steps.length} bước · {pct}%</span></div><div style={{height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:pct===100?"#16a34a":"#3b82f6",borderRadius:6}}/></div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:11,paddingTop:10,borderTop:"1px solid #f3f4f6"}}><div><div style={{color:"#9ca3af"}}>Tổng mức</div><div style={{fontWeight:600,color:"#1e40af"}}>{fmtMoney(p.total_budget)}</div></div><div><div style={{color:"#9ca3af"}}>Đã chi</div><div style={{fontWeight:600,color:"#b45309"}}>{fmtMoney(p.spent)}</div></div><div><div style={{color:"#9ca3af"}}>Còn lại</div><div style={{fontWeight:600,color:remain<0?"#dc2626":"#15803d"}}>{fmtMoney(remain)}</div></div></div>
          </div>);})}
      </div>}
      </div>
    )}

    {projForm&&(<div onClick={()=>setProjForm(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:60,padding:isMobile?0:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:isMobile?"12px 12px 0 0":12,width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}><span style={{fontWeight:600,fontSize:15}}>{projForm.id?"Chỉnh sửa dự án":"Tạo dự án đầu tư"}</span><button onClick={()=>setProjForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tên dự án *</label><input value={projForm.name} onChange={e=>setProjForm(f=>({...f,name:e.target.value}))} placeholder="VD: Xây dựng hệ thống IOC giai đoạn 2" style={inp}/></div>
        {!projForm.id&&<div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Áp dụng mẫu quy trình</label><div style={{display:"flex",gap:8}}>{Object.entries(INV_TEMPLATES).map(([key,tpl])=><button key={key} onClick={()=>setProjForm(f=>({...f,steps:JSON.stringify(tpl.steps.map((s,i)=>({...s,id:i+1,status:"pending",start:"",end:"",note:"",attachments:[],lead_eid:"",collab_eids:[]})))}))} style={{flex:1,padding:"8px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:12,fontWeight:500}}>{tpl.name} ({tpl.steps.length} bước)</button>)}</div><div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Chọn mẫu để nạp các bước. Sau khi tạo, có thể sửa/thêm/xóa và phân công từng bước.</div></div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Lãnh đạo phụ trách</label><select value={projForm.leader_id} onChange={e=>setProjForm(f=>({...f,leader_id:e.target.value}))} style={inp}><option value="">— Chọn lãnh đạo —</option>{leaders.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Nguồn vốn</label><select value={projForm.fund_source} onChange={e=>setProjForm(f=>({...f,fund_source:e.target.value}))} style={inp}>{FUND_SOURCES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tổng mức đầu tư (đ)</label><input type="number" value={projForm.total_budget} onChange={e=>setProjForm(f=>({...f,total_budget:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Đã chi (đ)</label><input type="number" value={projForm.spent} onChange={e=>setProjForm(f=>({...f,spent:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phụ trách chính</label><select value={projForm.lead_eid} onChange={e=>setProjForm(f=>({...f,lead_eid:e.target.value}))} style={inp}><option value="">— Chọn —</option>{(employees||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept} - {e.role})</option>)}</select></div>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Hạn hoàn thành</label><input type="date" value={projForm.deadline} onChange={e=>setProjForm(f=>({...f,deadline:e.target.value}))} style={inp}/></div>
        </div>
        <div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}><div style={{padding:"8px 12px",background:"#f8fafc",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6}}><span>👥</span><span style={{fontWeight:500,fontSize:13}}>Thành viên dự án</span>{parseJSON(projForm.member_eids,[]).length>0&&<span style={{background:"#dcfce7",color:"#15803d",fontSize:11,padding:"1px 8px",borderRadius:10}}>{parseJSON(projForm.member_eids,[]).length}</span>}</div><div style={{padding:10,display:"flex",flexWrap:"wrap",gap:6,maxHeight:160,overflowY:"auto"}}>{(employees||[]).map(e=>{const sel=parseJSON(projForm.member_eids,[]).includes(e.id);const isLead=projForm.lead_eid===e.id;return(<button key={e.id} disabled={isLead} onClick={()=>{const m=parseJSON(projForm.member_eids,[]);const nm=sel?m.filter(x=>x!==e.id):[...m,e.id];setProjForm(f=>({...f,member_eids:JSON.stringify(nm)}));}} style={{padding:"4px 10px",border:"1.5px solid "+(sel?"#16a34a":"#e5e7eb"),borderRadius:20,background:sel?"#dcfce7":"#fff",color:sel?"#15803d":"#6b7280",cursor:isLead?"default":"pointer",fontSize:12,fontWeight:sel?600:400,opacity:isLead?0.4:1}}>{sel&&"✓ "}{e.name} <span style={{fontSize:10,opacity:0.7}}>({e.dept})</span>{isLead&&" (PT chính)"}</button>);})}</div></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú</label><textarea value={projForm.note} onChange={e=>setProjForm(f=>({...f,note:e.target.value}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
        {projForm.total_budget>0&&<div style={{fontSize:12,padding:"8px 12px",background:"#f0fdf4",borderRadius:8,color:"#15803d"}}>Còn lại: <b>{fmtMoney((Number(projForm.total_budget)||0)-(Number(projForm.spent)||0))}</b></div>}
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setProjForm(null)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={saveProject} disabled={saving} style={{padding:"8px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>{saving?"Đang lưu…":(projForm.id?"Cập nhật":"Tạo dự án")}</button></div>
    </div></div>)}

    {projDetail&&(<ProjectDetail proj={projDetail} onClose={()=>setProjDetail(null)} canManage={canManageInvest} getEmp={getEmp} employees={employees} users={users} isMobile={isMobile} onEdit={()=>{setProjForm({...projDetail,total_budget:projDetail.total_budget||0,spent:projDetail.spent||0,member_eids:projDetail.member_eids||"[]",leader_id:projDetail.leader_id||""});setProjDetail(null);}} onDelete={()=>deleteProject(projDetail.id)} onUpdateSteps={updateProjectSteps} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles} inp={inp} currentUser={currentUser}/>)}

    {showReport&&(<div onClick={()=>setShowReport(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:60,padding:isMobile?0:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:isMobile?"12px 12px 0 0":14,width:"100%",maxWidth:920,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:2}}><span style={{fontWeight:700,fontSize:16}}>📊 Báo cáo tiến độ Nhiệm vụ ngân sách</span><button onClick={()=>setShowReport(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:20}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:18}}>
          <div style={{background:"#f0fdf4",borderRadius:10,padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Số dự án</div><div style={{fontSize:20,fontWeight:700,color:"#059669"}}>{reportRows.length}</div></div>
          <div style={{background:"#eff6ff",borderRadius:10,padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Tổng mức ĐT</div><div style={{fontSize:14,fontWeight:700,color:"#1e40af"}}>{fmtMoney(invStats.budget)}</div></div>
          <div style={{background:"#fffbeb",borderRadius:10,padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Đã chi</div><div style={{fontSize:14,fontWeight:700,color:"#b45309"}}>{fmtMoney(invStats.spent)}</div></div>
          <div style={{background:"#fef2f2",borderRadius:10,padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Tổng bước trễ hạn</div><div style={{fontSize:20,fontWeight:700,color:"#dc2626"}}>{reportRows.reduce((s,r)=>s+r.overdue,0)}</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"3fr 2fr",gap:16,marginBottom:18}}>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:14}}><div style={{fontSize:12,fontWeight:600,marginBottom:10}}>Tiến độ từng dự án (%)</div><ResponsiveContainer width="100%" height={Math.max(180,reportChart.length*38)}><BarChart data={reportChart} layout="vertical" margin={{left:8,right:16}}><XAxis type="number" domain={[0,100]} tick={{fontSize:10}}/><YAxis type="category" dataKey="name" width={100} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="Tiến độ" fill="#3b82f6" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:14}}><div style={{fontSize:12,fontWeight:600,marginBottom:10}}>Trạng thái các bước</div>{statusPie.length>0?<ResponsiveContainer width="100%" height={200}><PieChart><Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,value})=>`${value}`}>{statusPie.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>:<div style={{textAlign:"center",color:"#9ca3af",padding:40,fontSize:13}}>Chưa có bước nào</div>}<div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginTop:8}}>{statusPie.map((e,i)=><span key={i} style={{fontSize:11,display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:e.fill,display:"inline-block"}}/>{e.name}: {e.value}</span>)}</div></div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontWeight:600,fontSize:14}}>Bảng chi tiết</div><div style={{display:"flex",gap:8}}><button onClick={exportReportCSV} style={{padding:"6px 12px",border:"1px solid #86efac",borderRadius:7,background:"#f0fdf4",cursor:"pointer",fontSize:12,color:"#15803d"}}>⬇ CSV (Excel)</button><button onClick={exportReportPDF} style={{padding:"6px 12px",border:"1px solid #fca5a5",borderRadius:7,background:"#fef2f2",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🖨 PDF / In</button></div></div>
        <div style={{overflowX:"auto",border:"1px solid #e5e7eb",borderRadius:10}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:720}}>
            <thead><tr style={{background:"#f8fafc"}}>{["Dự án","Nguồn vốn","Lãnh đạo PT","Phụ trách","TV","Tiến độ","Trễ","Tổng mức","Đã chi","Còn lại"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",borderBottom:"1px solid #e5e7eb",fontWeight:600,color:"#475569",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>{reportRows.length===0?<tr><td colSpan={10} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>Chưa có dự án</td></tr>:reportRows.map(r=>(<tr key={r.id} style={{borderBottom:"1px solid #f3f4f6"}}>
              <td style={{padding:"8px 10px",fontWeight:500}}>{r.name}</td>
              <td style={{padding:"8px 10px",color:"#6b7280"}}>{r.fund}</td>
              <td style={{padding:"8px 10px"}}>{r.leader}</td>
              <td style={{padding:"8px 10px"}}>{r.lead}</td>
              <td style={{padding:"8px 10px",textAlign:"center"}}>{r.members}</td>
              <td style={{padding:"8px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,minWidth:50,height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:r.pct+"%",background:r.pct===100?"#16a34a":"#3b82f6"}}/></div><span style={{fontSize:11,fontWeight:600,color:r.pct===100?"#15803d":"#1d4ed8"}}>{r.pct}%</span></div><div style={{fontSize:10,color:"#9ca3af"}}>{r.done}/{r.total} bước</div></td>
              <td style={{padding:"8px 10px",textAlign:"center"}}>{r.overdue>0?<span style={{background:"#fee2e2",color:"#b91c1c",padding:"1px 8px",borderRadius:8,fontWeight:600,fontSize:11}}>{r.overdue}</span>:<span style={{color:"#9ca3af"}}>0</span>}</td>
              <td style={{padding:"8px 10px",textAlign:"right",color:"#1e40af",fontWeight:500,whiteSpace:"nowrap"}}>{fmtMoney(r.budget)}</td>
              <td style={{padding:"8px 10px",textAlign:"right",color:"#b45309",whiteSpace:"nowrap"}}>{fmtMoney(r.spent)}</td>
              <td style={{padding:"8px 10px",textAlign:"right",color:r.remain<0?"#dc2626":"#15803d",fontWeight:500,whiteSpace:"nowrap"}}>{fmtMoney(r.remain)}</td>
            </tr>))}</tbody>
          </table>
        </div>
      </div>
    </div></div>)}
  </div>);
}
