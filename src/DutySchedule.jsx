import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

const today=new Date();today.setHours(0,0,0,0);
const todayStr=today.toISOString().split("T")[0];
const parseJSON=(v,d=[])=>{try{return JSON.parse(v||JSON.stringify(d));}catch{return d;}};
const WD=["Chủ Nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isWeekendOrHoliday=(dateStr,holidays)=>{const d=new Date(dateStr);const dow=d.getDay();return dow===0||dow===6||(holidays||[]).includes(dateStr);};
// Chuẩn hóa người trực: hỗ trợ dữ liệu cũ (chuỗi tên) -> {name, shiftIdx theo vị trí}; dữ liệu mới đã là {name, shiftIdx} thì giữ nguyên
const normPeople=(arr)=>(arr||[]).map((p,i)=>typeof p==="string"?{name:p,shiftIdx:i}:{name:p.name||"",shiftIdx:p.shiftIdx??i});

// Ca trực theo quy định
const SHIFTS={
  weekend:{ // T7, CN, Lễ Tết
    DC:[{label:"Ca 1",time:"07h00 - 15h00"},{label:"Ca 2",time:"15h00 - 23h00"},{label:"Ca 3",time:"23h00 - 07h00 (hôm sau)"}],
    IOC:[{label:"Ca 1",time:"07h30 - 11h30"},{label:"Ca 2",time:"13h30 - 17h30"}]
  },
  weekday:{ // T2 - T6
    DC:[{label:"Ca 1",time:"17h30 - 21h30"},{label:"Ca 2",time:"21h30 - 01h30 (hôm sau)"},{label:"Ca 3",time:"01h30 - 07h30"}],
    IOC:[{label:"",time:"17h30 - 21h30"}]
  }
};

// Phân tích văn bản dán từ Word: mỗi dòng dạng "ngày | thứ | LĐ | DC | IOC | ghi chú"
function parsePasted(text){
  const lines=text.split("\n");
  const days={}; let curDate=null;
  for(const rawLine of lines){
    const line=rawLine.replace(/\r/g,"");
    if(!line.trim()) continue;
    // Giữ nguyên cấu trúc cột bằng tab; nếu dòng dùng | thì split theo |
    const rawCells=line.includes("\t")?line.split("\t"):line.split("|");
    const cells=rawCells.map(c=>c.trim());
    if(cells.every(c=>c==="")) continue;
    const firstNonEmpty=cells.findIndex(c=>c!=="");
    const dm=(cells[0]||"").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(dm){
      const dd=pad(dm[1]),mm=pad(dm[2]),yy=dm[3];
      curDate=`${yy}-${mm}-${dd}`;
      const c=cells.map(x=>x.trim());
      days[curDate]={date:curDate,leader:c[2]||"",dc:[],ioc:[],note:c[5]||""};
      if(c[3]) days[curDate].dc.push(c[3]);
      if(c[4]) days[curDate].ioc.push(...c[4].split(/\s{2,}|,/).map(x=>x.trim()).filter(Boolean));
    } else if(curDate){
      // Dòng phụ (không có ngày): xác định cột theo VỊ TRÍ ô có giá trị, không gộp về DC mặc định
      // Cấu trúc cột chuẩn: [0]Ngày [1]Thứ [2]LĐ [3]DC [4]IOC [5]Ghi chú
      if(cells[3]&&cells[3].trim()) days[curDate].dc.push(cells[3].trim());
      if(cells[4]&&cells[4].trim()) days[curDate].ioc.push(...cells[4].split(/\s{2,}|,/).map(x=>x.trim()).filter(Boolean));
      // Trường hợp dòng phụ chỉ có 1 cột duy nhất có dữ liệu (mất canh cột khi dán) → fallback theo cột gần nhất từng có dữ liệu ở dòng ngày
      if(!cells[3]&&!cells[4]&&firstNonEmpty>=0){
        const val=cells[firstNonEmpty].trim();
        if(val) days[curDate].dc.push(val); // fallback an toàn: vẫn đẩy DC như cũ nếu không xác định được cột
      }
    }
  }
  return Object.values(days);
}

export default function DutySchedule({ currentUser, employees, userDept, isMobile, inp, showToast, canManage }){
  const [schedule,setSchedule]=useState({}); // {date: {leader,dc:[],ioc:[],note}}
  const [holidays,setHolidays]=useState([]);
  const [viewMode,setViewMode]=useState("day");
  const [cur,setCur]=useState(new Date());
  const [loading,setLoading]=useState(true);
  const [showImport,setShowImport]=useState(false);
  const [pasteText,setPasteText]=useState("");
  const [editDay,setEditDay]=useState(null);
  const [dayDraft,setDayDraft]=useState(null);

  useEffect(()=>{(async()=>{setLoading(true);try{const{data}=await supabase.from("duty_schedule").select("*");const map={};(data||[]).forEach(r=>{map[r.date]={date:r.date,leader:r.leader||"",dc:normPeople(parseJSON(r.dc,[])),ioc:normPeople(parseJSON(r.ioc,[])),note:r.note||"",swaps:parseJSON(r.swaps,[])};});setSchedule(map);const{data:hd}=await supabase.from("app_config").select("*").eq("key","holidays");if(hd&&hd[0])setHolidays(parseJSON(hd[0].value,[]));}catch{}setLoading(false);})();},[]);

  const saveDay=async(d)=>{const row={date:d.date,leader:d.leader,dc:JSON.stringify(d.dc),ioc:JSON.stringify(d.ioc),note:d.note,swaps:JSON.stringify(d.swaps||[])};const{error}=await supabase.from("duty_schedule").upsert(row,{onConflict:"date"});if(!error){setSchedule(p=>({...p,[d.date]:d}));showToast&&showToast("Đã lưu lịch trực");}else showToast&&showToast("Lỗi: "+(error.message||""),"error");};
  const [swapModal,setSwapModal]=useState(null);
  const [swapForm,setSwapForm]=useState({block:"dc",absent:"",substitute:"",shift:"",reason:""});
  const persistSwaps=async(dateStr,swaps)=>{const ex=schedule[dateStr]||{date:dateStr,leader:"",dc:[],ioc:[],note:"",swaps:[]};const row={date:dateStr,leader:ex.leader,dc:JSON.stringify(ex.dc),ioc:JSON.stringify(ex.ioc),note:ex.note,swaps:JSON.stringify(swaps)};const{error}=await supabase.from("duty_schedule").upsert(row,{onConflict:"date"});if(!error)setSchedule(p=>({...p,[dateStr]:{...ex,swaps}}));else showToast&&showToast("Lỗi: "+(error.message||""),"error");return!error;};
  const submitSwap=async()=>{if(!swapForm.substitute.trim()||!swapForm.reason.trim()){showToast&&showToast("Nhập người trực thay và lý do","error");return;}const dateStr=swapModal;const ex=schedule[dateStr];const swaps=[...(ex?.swaps||[]),{id:`sw${Date.now()}`,block:swapForm.block,absent:swapForm.absent.trim(),substitute:swapForm.substitute.trim(),shift:swapForm.shift.trim(),reason:swapForm.reason.trim(),by:currentUser.full_name,at:new Date().toLocaleString("vi-VN"),status:"pending"}];const ok=await persistSwaps(dateStr,swaps);if(ok){showToast&&showToast("Đã gửi đăng ký trực thay");setSwapModal(null);setSwapForm({block:"dc",absent:"",substitute:"",shift:"",reason:""});}};
  const reviewSwap=async(dateStr,swapId,status)=>{const ex=schedule[dateStr];const swaps=(ex?.swaps||[]).map(s=>s.id===swapId?{...s,status,reviewedBy:currentUser.full_name}:s);await persistSwaps(dateStr,swaps);showToast&&showToast(status==="approved"?"Đã duyệt":"Đã từ chối");};
  const deleteSwap=async(dateStr,swapId)=>{const ex=schedule[dateStr];const swaps=(ex?.swaps||[]).filter(s=>s.id!==swapId);await persistSwaps(dateStr,swaps);};
  // Tìm phòng của 1 người theo tên (trong danh sách nhân viên)
  const findDept=(name)=>{if(!name)return null;const emp=(employees||[]).find(e=>e.name&&e.name.trim().toLowerCase()===name.trim().toLowerCase());return emp?emp.dept:null;};
  // Quyền duyệt 1 swap: Admin/BGĐ toàn quyền; TP/PP chỉ duyệt swap của nhân viên phòng mình
  const canApproveSwap=(sw)=>{if(["admin","director"].includes(currentUser?.role))return true;if(["manager_hcth","manager","deputy_manager"].includes(currentUser?.role)){const d1=findDept(sw.substitute),d2=findDept(sw.absent);return (d1&&d1===userDept)||(d2&&d2===userDept);}return false;};

  const doImport=async()=>{const parsed=parsePasted(pasteText);if(parsed.length===0){showToast&&showToast("Không đọc được dữ liệu. Kiểm tra định dạng dán.","error");return;}const rows=parsed.map(d=>({date:d.date,leader:d.leader,dc:JSON.stringify(d.dc),ioc:JSON.stringify(d.ioc),note:d.note}));const{error}=await supabase.from("duty_schedule").upsert(rows,{onConflict:"date"});if(!error){const map={...schedule};parsed.forEach(d=>map[d.date]=d);setSchedule(map);showToast&&showToast(`Đã nhập ${parsed.length} ngày trực`);setShowImport(false);setPasteText("");}else showToast&&showToast("Lỗi: "+(error.message||""),"error");};

  const monthDays=useMemo(()=>{const y=cur.getFullYear(),m=cur.getMonth();const first=new Date(y,m,1);const startDow=first.getDay();const daysInMonth=new Date(y,m+1,0).getDate();const cells=[];for(let i=0;i<startDow;i++)cells.push(null);for(let d=1;d<=daysInMonth;d++)cells.push(new Date(y,m,d));return cells;},[cur]);
  const weekDays=useMemo(()=>{const d=new Date(cur);const dow=d.getDay();const monday=new Date(d);monday.setDate(d.getDate()-dow);const arr=[];for(let i=0;i<7;i++){const x=new Date(monday);x.setDate(monday.getDate()+i);arr.push(x);}return arr;},[cur]);

  const openEditDay=(dateStr)=>{const ex=schedule[dateStr]||{date:dateStr,leader:"",dc:[],ioc:[],note:""};setDayDraft({...ex,dc:ex.dc.map(p=>({...p})),ioc:ex.ioc.map(p=>({...p}))});setEditDay(dateStr);};

  const COLORS={leader:{bg:"#fef3c7",col:"#92400e",label:"⭐ Trực lãnh đạo"},dc:{bg:"#dbeafe",col:"#1e40af",label:"🖥️ Trực DC"},ioc:{bg:"#dcfce7",col:"#15803d",label:"🏢 Trực IOC"}};

  const renderDayDetail=(dateStr)=>{const s=schedule[dateStr];const wknd=isWeekendOrHoliday(dateStr,holidays);const shifts=wknd?SHIFTS.weekend:SHIFTS.weekday;const d=new Date(dateStr);
    return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:700,fontSize:16}}>{WD[d.getDay()]}, {d.getDate()}/{d.getMonth()+1}/{d.getFullYear()}</span>{wknd&&<span style={{fontSize:11,background:"#fee2e2",color:"#b91c1c",padding:"2px 8px",borderRadius:8}}>Cuối tuần / Lễ</span>}</div>
      {!s?<div style={{padding:24,textAlign:"center",color:"#9ca3af",background:"#f9fafb",borderRadius:10}}>Chưa có lịch trực ngày này</div>:<>
        <div style={{background:COLORS.leader.bg,borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600,color:COLORS.leader.col,marginBottom:4}}>{COLORS.leader.label}</div><div style={{fontSize:14}}>{s.leader||"—"}</div></div>
        <div style={{background:COLORS.dc.bg,borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600,color:COLORS.dc.col,marginBottom:6}}>{COLORS.dc.label}</div>{s.dc.map((p,i)=><div key={i} style={{fontSize:13,marginBottom:4,display:"flex",justifyContent:"space-between"}}><span>{p.name}</span>{shifts.DC[p.shiftIdx]&&<span style={{fontSize:11,color:"#6b7280"}}>{shifts.DC[p.shiftIdx].label} ({shifts.DC[p.shiftIdx].time})</span>}</div>)}</div>
        <div style={{background:COLORS.ioc.bg,borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600,color:COLORS.ioc.col,marginBottom:6}}>{COLORS.ioc.label}</div>{s.ioc.map((p,i)=><div key={i} style={{fontSize:13,marginBottom:4,display:"flex",justifyContent:"space-between"}}><span>{p.name}</span>{shifts.IOC[p.shiftIdx]&&<span style={{fontSize:11,color:"#6b7280"}}>{shifts.IOC[p.shiftIdx].label?shifts.IOC[p.shiftIdx].label+" ":""}({shifts.IOC[p.shiftIdx].time})</span>}</div>)}</div>
        {s.note&&<div style={{fontSize:12,color:"#6b7280",fontStyle:"italic"}}>📝 {s.note}</div>}
      </>}
      <div style={{borderTop:"1px solid #f3f4f6",paddingTop:12,marginTop:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:600,color:"#7c3aed"}}>🔄 Trực thay {(schedule[dateStr]?.swaps||[]).length>0&&<span style={{fontSize:11,background:"#f3e8ff",color:"#6d28d9",padding:"1px 8px",borderRadius:10}}>{(schedule[dateStr]?.swaps||[]).length}</span>}</span>
          <button onClick={()=>{setSwapModal(dateStr);setSwapForm({block:"dc",absent:"",substitute:"",shift:"",reason:""});}} style={{padding:"5px 12px",border:"1px solid #c4b5fd",borderRadius:7,background:"#f5f3ff",cursor:"pointer",fontSize:12,color:"#6d28d9"}}>+ Đăng ký trực thay</button>
        </div>
        {(schedule[dateStr]?.swaps||[]).length===0?<div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic"}}>Chưa có đăng ký trực thay</div>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>{(schedule[dateStr]?.swaps||[]).map(sw=>{const ST={pending:{l:"Chờ duyệt",bg:"#fef9c3",c:"#92400e"},approved:{l:"Đã duyệt",bg:"#dcfce7",c:"#15803d"},rejected:{l:"Từ chối",bg:"#fee2e2",c:"#b91c1c"}}[sw.status]||{l:"?",bg:"#f1f5f9",c:"#475569"};const BL={dc:"🖥️ Trực DC",ioc:"🏢 Trực IOC",leader:"⭐ Trực lãnh đạo"}[sw.block]||sw.block;return(
          <div key={sw.id} style={{padding:"10px 12px",background:"#faf5ff",borderRadius:8,border:"1px solid #e9d5ff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
              <span style={{fontSize:11,background:"#ede9fe",color:"#6d28d9",padding:"1px 8px",borderRadius:8,fontWeight:600}}>{BL}{sw.shift?" · "+sw.shift:""}</span>
              <span style={{fontSize:10,background:ST.bg,color:ST.c,padding:"2px 8px",borderRadius:8,fontWeight:600,flexShrink:0}}>{ST.l}</span>
            </div>
            <div style={{fontSize:13,marginBottom:2}}>{sw.absent&&<><b>{sw.absent}</b> → </>}<b style={{color:"#6d28d9"}}>{sw.substitute}</b> trực thay</div>
            <div style={{fontSize:12,color:"#6b7280"}}>Lý do: {sw.reason}</div>
            <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>Đăng ký bởi {sw.by} · {sw.at}{sw.reviewedBy?` · duyệt: ${sw.reviewedBy}`:""}</div>
            {canApproveSwap(sw)&&<div style={{display:"flex",gap:6,marginTop:8}}>{sw.status!=="approved"&&<button onClick={()=>reviewSwap(dateStr,sw.id,"approved")} style={{padding:"3px 10px",border:"1px solid #86efac",borderRadius:6,background:"#f0fdf4",cursor:"pointer",fontSize:11,color:"#15803d"}}>✓ Duyệt</button>}{sw.status!=="rejected"&&<button onClick={()=>reviewSwap(dateStr,sw.id,"rejected")} style={{padding:"3px 10px",border:"1px solid #fca5a5",borderRadius:6,background:"#fef2f2",cursor:"pointer",fontSize:11,color:"#dc2626"}}>✕ Từ chối</button>}<button onClick={()=>deleteSwap(dateStr,sw.id)} style={{padding:"3px 10px",border:"1px solid #d1d5db",borderRadius:6,background:"#f9fafb",cursor:"pointer",fontSize:11,color:"#6b7280",marginLeft:"auto"}}>🗑️</button></div>}
          </div>);})}</div>}
      </div>
      {canManage&&<button onClick={()=>openEditDay(dateStr)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,alignSelf:"flex-start"}}>✏️ Sửa ngày này</button>}
    </div>);
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",gap:6,background:"#f1f5f9",borderRadius:8,padding:3}}>
        {[["month","Tháng"],["week","Tuần"],["day","Ngày"]].map(([k,l])=><button key={k} onClick={()=>setViewMode(k)} style={{padding:"6px 14px",border:"none",borderRadius:6,background:viewMode===k?"#fff":"transparent",color:viewMode===k?"#1d4ed8":"#6b7280",cursor:"pointer",fontSize:13,fontWeight:viewMode===k?600:400,boxShadow:viewMode===k?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>{l}</button>)}
      </div>
      {canManage&&<button onClick={()=>setShowImport(true)} style={{background:"#059669",color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:13,cursor:"pointer",fontWeight:500}}>📥 Nhập lịch từ Word</button>}
    </div>

    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
      <button onClick={()=>{const d=new Date(cur);if(viewMode==="month")d.setMonth(d.getMonth()-1);else if(viewMode==="week")d.setDate(d.getDate()-7);else d.setDate(d.getDate()-1);setCur(d);}} style={{padding:"6px 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer"}}>←</button>
      <span style={{fontWeight:600,fontSize:15,minWidth:160,textAlign:"center"}}>{viewMode==="month"?`Tháng ${cur.getMonth()+1}/${cur.getFullYear()}`:viewMode==="week"?`Tuần ${weekDays[0].getDate()}/${weekDays[0].getMonth()+1} - ${weekDays[6].getDate()}/${weekDays[6].getMonth()+1}`:`${cur.getDate()}/${cur.getMonth()+1}/${cur.getFullYear()}`}</span>
      <button onClick={()=>{const d=new Date(cur);if(viewMode==="month")d.setMonth(d.getMonth()+1);else if(viewMode==="week")d.setDate(d.getDate()+7);else d.setDate(d.getDate()+1);setCur(d);}} style={{padding:"6px 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",cursor:"pointer"}}>→</button>
      <button onClick={()=>setCur(new Date())} style={{padding:"6px 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#eff6ff",color:"#1d4ed8",cursor:"pointer",fontSize:12}}>Hôm nay</button>
    </div>

    {loading?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Đang tải lịch trực…</div>:<>
    {viewMode==="month"&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:isMobile?6:12,overflowX:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:isMobile?2:6,minWidth:isMobile?600:0}}>
        {["CN","T2","T3","T4","T5","T6","T7"].map(d=><div key={d} style={{textAlign:"center",fontWeight:600,fontSize:12,color:"#6b7280",padding:"4px 0"}}>{d}</div>)}
        {monthDays.map((d,i)=>{if(!d)return<div key={i}/>;const ds=ymd(d);const s=schedule[ds];const isToday=ds===todayStr;const wknd=isWeekendOrHoliday(ds,holidays);return(<div key={i} onClick={()=>{setCur(d);setViewMode("day");}} style={{minHeight:isMobile?60:84,border:"1px solid "+(isToday?"#3b82f6":"#f3f4f6"),borderRadius:8,padding:5,cursor:"pointer",background:wknd?"#fef9f9":"#fff"}} onMouseEnter={e=>e.currentTarget.style.background="#f0f9ff"} onMouseLeave={e=>e.currentTarget.style.background=wknd?"#fef9f9":"#fff"}>
          <div style={{fontSize:12,fontWeight:isToday?700:500,color:isToday?"#1d4ed8":wknd?"#dc2626":"#374151",marginBottom:3}}>{d.getDate()}</div>
          {s&&<div style={{display:"flex",flexDirection:"column",gap:2}}>{s.leader&&<div style={{fontSize:9,background:"#fef3c7",color:"#92400e",padding:"1px 4px",borderRadius:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>⭐{s.leader}</div>}{s.dc.length>0&&<div style={{fontSize:9,background:"#dbeafe",color:"#1e40af",padding:"1px 4px",borderRadius:4}}>🖥️ DC: {s.dc.length}</div>}{s.ioc.length>0&&<div style={{fontSize:9,background:"#dcfce7",color:"#15803d",padding:"1px 4px",borderRadius:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🏢{s.ioc.map(p=>p.name).join(", ")}</div>}</div>}
        </div>);})}
      </div>
    </div>}

    {viewMode==="week"&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(7,1fr)",gap:8}}>
      {weekDays.map((d,i)=>{const ds=ymd(d);const s=schedule[ds];const isToday=ds===todayStr;const wknd=isWeekendOrHoliday(ds,holidays);return(<div key={i} onClick={()=>{setCur(d);setViewMode("day");}} style={{background:"#fff",borderRadius:10,border:"1px solid "+(isToday?"#3b82f6":"#e5e7eb"),padding:10,cursor:"pointer"}}>
        <div style={{fontSize:12,fontWeight:600,color:wknd?"#dc2626":"#374151",marginBottom:6,paddingBottom:6,borderBottom:"1px solid #f3f4f6"}}>{WD[d.getDay()]} {d.getDate()}/{d.getMonth()+1}</div>
        {s?<div style={{display:"flex",flexDirection:"column",gap:4}}>{s.leader&&<div style={{fontSize:11}}><span style={{color:"#92400e"}}>⭐ LĐ:</span> {s.leader}</div>}{s.dc.length>0&&<div style={{fontSize:11}}><span style={{color:"#1e40af"}}>🖥️ DC:</span> {s.dc.map(p=>p.name).join(", ")}</div>}{s.ioc.length>0&&<div style={{fontSize:11}}><span style={{color:"#15803d"}}>🏢 IOC:</span> {s.ioc.map(p=>p.name).join(", ")}</div>}</div>:<div style={{fontSize:11,color:"#9ca3af",textAlign:"center",padding:8}}>—</div>}
      </div>);})}
    </div>}

    {viewMode==="day"&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:18}}>{renderDayDetail(ymd(cur))}</div>}
    </>}

    {showImport&&(<div onClick={()=>setShowImport(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:600,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>📥 Nhập lịch trực từ Word</span><button onClick={()=>setShowImport(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18}}>
        <div style={{fontSize:12,color:"#6b7280",marginBottom:10,lineHeight:1.6,background:"#f8fafc",padding:"10px 12px",borderRadius:8}}><b>Cách làm:</b><br/>1. Mở file Word lịch trực<br/>2. Bôi đen toàn bộ <b>bảng</b> (từ dòng ngày đầu đến cuối)<br/>3. Copy (Ctrl+C)<br/>4. Dán (Ctrl+V) vào ô dưới đây<br/>5. Bấm "Phân tích & Nhập"</div>
        <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={10} placeholder="Dán nội dung bảng lịch trực vào đây…" style={{...inp,resize:"vertical",fontFamily:"monospace",fontSize:12}}/>
        {pasteText.trim()&&<div style={{fontSize:12,color:"#059669",marginTop:6}}>Phát hiện {parsePasted(pasteText).length} ngày trực</div>}
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setShowImport(false)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={doImport} style={{padding:"8px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Phân tích & Nhập</button></div>
    </div></div>)}

    {swapModal&&(<div onClick={()=>setSwapModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:65,padding:isMobile?"12px 8px":16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>🔄 Đăng ký trực thay {swapModal.split("-").reverse().join("/")}</span><button onClick={()=>setSwapModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>Khối trực</label><div style={{display:"flex",gap:8}}>{[["leader","⭐ Lãnh đạo"],["dc","🖥️ DC"],["ioc","🏢 IOC"]].map(([k,l])=><button key={k} onClick={()=>setSwapForm(f=>({...f,block:k}))} style={{flex:1,padding:"8px 6px",border:"2px solid "+(swapForm.block===k?"#7c3aed":"#e5e7eb"),borderRadius:8,background:swapForm.block===k?"#f5f3ff":"#fff",cursor:"pointer",fontSize:12,fontWeight:swapForm.block===k?600:400,color:swapForm.block===k?"#6d28d9":"#6b7280"}}>{l}</button>)}</div></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Người vắng (được trực thay)</label><input value={swapForm.absent} onChange={e=>setSwapForm(f=>({...f,absent:e.target.value}))} placeholder="Tên người vắng…" style={inp}/></div>
        <div><label style={{fontSize:12,color:"#6d28d9",display:"block",marginBottom:4,fontWeight:600}}>Người trực thay *</label><input value={swapForm.substitute} onChange={e=>setSwapForm(f=>({...f,substitute:e.target.value}))} placeholder="Tên người trực thay…" style={inp}/></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ca trực (nếu có)</label><input value={swapForm.shift} onChange={e=>setSwapForm(f=>({...f,shift:e.target.value}))} placeholder="VD: Ca 1 (07h00-15h00)" style={inp}/></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Lý do *</label><textarea value={swapForm.reason} onChange={e=>setSwapForm(f=>({...f,reason:e.target.value}))} rows={2} placeholder="VD: Đi công tác, đau ốm…" style={{...inp,resize:"vertical"}}/></div>
        <div style={{fontSize:11,color:"#9ca3af",background:"#f8fafc",padding:"8px 12px",borderRadius:8}}>Đăng ký sẽ ở trạng thái "Chờ duyệt". Quản lý sẽ duyệt sau.</div>
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setSwapModal(null)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={submitSwap} style={{padding:"8px 16px",background:"#7c3aed",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Gửi đăng ký</button></div>
    </div></div>)}
    {editDay&&dayDraft&&(<div onClick={()=>setEditDay(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:14}}>Sửa lịch trực {editDay.split("-").reverse().join("/")}</span><button onClick={()=>setEditDay(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:12,color:"#92400e",display:"block",marginBottom:4,fontWeight:600}}>⭐ Trực lãnh đạo</label><input value={dayDraft.leader} onChange={e=>setDayDraft(d=>({...d,leader:e.target.value}))} style={inp}/></div>
        {(()=>{const wknd=isWeekendOrHoliday(editDay,holidays);const shifts=wknd?SHIFTS.weekend:SHIFTS.weekday;return(<>
        <div><label style={{fontSize:12,color:"#1e40af",display:"block",marginBottom:6,fontWeight:600}}>🖥️ Trực DC</label>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {dayDraft.dc.map((p,i)=>(<div key={i} style={{display:"flex",gap:6,alignItems:"center"}}>
              <input value={p.name} onChange={e=>setDayDraft(d=>({...d,dc:d.dc.map((x,xi)=>xi===i?{...x,name:e.target.value}:x)}))} placeholder="Tên người trực" style={{...inp,flex:1}}/>
              <select value={p.shiftIdx} onChange={e=>setDayDraft(d=>({...d,dc:d.dc.map((x,xi)=>xi===i?{...x,shiftIdx:Number(e.target.value)}:x)}))} style={{...inp,width:isMobile?110:160,flexShrink:0,fontSize:12}}>{shifts.DC.map((sh,si)=><option key={si} value={si}>{sh.label} ({sh.time})</option>)}</select>
              <button onClick={()=>setDayDraft(d=>({...d,dc:d.dc.filter((_,xi)=>xi!==i)}))} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:16,flexShrink:0,padding:"0 4px"}}>✕</button>
            </div>))}
          </div>
          <button onClick={()=>setDayDraft(d=>({...d,dc:[...d.dc,{name:"",shiftIdx:d.dc.length%shifts.DC.length}]}))} style={{marginTop:6,padding:"4px 10px",border:"1px solid #93c5fd",borderRadius:6,background:"#eff6ff",color:"#1d4ed8",cursor:"pointer",fontSize:12}}>+ Thêm người DC</button>
        </div>
        <div><label style={{fontSize:12,color:"#15803d",display:"block",marginBottom:6,fontWeight:600}}>🏢 Trực IOC</label>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {dayDraft.ioc.map((p,i)=>(<div key={i} style={{display:"flex",gap:6,alignItems:"center"}}>
              <input value={p.name} onChange={e=>setDayDraft(d=>({...d,ioc:d.ioc.map((x,xi)=>xi===i?{...x,name:e.target.value}:x)}))} placeholder="Tên người trực" style={{...inp,flex:1}}/>
              <select value={p.shiftIdx} onChange={e=>setDayDraft(d=>({...d,ioc:d.ioc.map((x,xi)=>xi===i?{...x,shiftIdx:Number(e.target.value)}:x)}))} style={{...inp,width:isMobile?110:160,flexShrink:0,fontSize:12}}>{shifts.IOC.map((sh,si)=><option key={si} value={si}>{sh.label?sh.label+" ":""}({sh.time})</option>)}</select>
              <button onClick={()=>setDayDraft(d=>({...d,ioc:d.ioc.filter((_,xi)=>xi!==i)}))} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:16,flexShrink:0,padding:"0 4px"}}>✕</button>
            </div>))}
          </div>
          <button onClick={()=>setDayDraft(d=>({...d,ioc:[...d.ioc,{name:"",shiftIdx:d.ioc.length%shifts.IOC.length}]}))} style={{marginTop:6,padding:"4px 10px",border:"1px solid #86efac",borderRadius:6,background:"#f0fdf4",color:"#15803d",cursor:"pointer",fontSize:12}}>+ Thêm người IOC</button>
        </div>
        </>);})()}
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú</label><input value={dayDraft.note} onChange={e=>setDayDraft(d=>({...d,note:e.target.value}))} style={inp}/></div>
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setEditDay(null)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={async()=>{const final={...dayDraft,dc:dayDraft.dc.filter(p=>p.name.trim()).map(p=>({name:p.name.trim(),shiftIdx:p.shiftIdx})),ioc:dayDraft.ioc.filter(p=>p.name.trim()).map(p=>({name:p.name.trim(),shiftIdx:p.shiftIdx}))};await saveDay(final);setEditDay(null);}} style={{padding:"8px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Lưu</button></div>
    </div></div>)}
  </div>);
}
