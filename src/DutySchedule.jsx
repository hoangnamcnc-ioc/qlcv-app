import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

const today=new Date();today.setHours(0,0,0,0);
const todayStr=today.toISOString().split("T")[0];
const parseJSON=(v,d=[])=>{try{return JSON.parse(v||JSON.stringify(d));}catch{return d;}};
const WD=["Chủ Nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isWeekendOrHoliday=(dateStr,holidays)=>{const d=new Date(dateStr);const dow=d.getDay();return dow===0||dow===6||(holidays||[]).includes(dateStr);};

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
  const lines=text.split("\n").map(l=>l.trim()).filter(Boolean);
  const days={}; let curDate=null;
  for(const line of lines){
    const cells=line.split(/\t|\|/).map(c=>c.trim()).filter(c=>c!=="");
    if(cells.length===0) continue;
    // dòng có ngày dạng d/m/yyyy
    const dm=cells[0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(dm){
      const dd=pad(dm[1]),mm=pad(dm[2]),yy=dm[3];
      curDate=`${yy}-${mm}-${dd}`;
      days[curDate]={date:curDate,leader:cells[2]||"",dc:[],ioc:[],note:cells[5]||""};
      if(cells[3]) days[curDate].dc.push(cells[3]);
      if(cells[4]) days[curDate].ioc.push(...cells[4].split(/\s{2,}|,/).map(x=>x.trim()).filter(Boolean));
    } else if(curDate&&cells.length>0){
      // dòng phụ: thêm người DC (thường ở cột DC)
      const name=cells.find(c=>c&&!/^(thứ|chủ)/i.test(c));
      if(name) days[curDate].dc.push(name);
    }
  }
  return Object.values(days);
}

export default function DutySchedule({ currentUser, isMobile, inp, showToast, canManage }){
  const [schedule,setSchedule]=useState({}); // {date: {leader,dc:[],ioc:[],note}}
  const [holidays,setHolidays]=useState([]);
  const [viewMode,setViewMode]=useState("day");
  const [cur,setCur]=useState(new Date());
  const [loading,setLoading]=useState(true);
  const [showImport,setShowImport]=useState(false);
  const [pasteText,setPasteText]=useState("");
  const [editDay,setEditDay]=useState(null);
  const [dayDraft,setDayDraft]=useState(null);

  useEffect(()=>{(async()=>{setLoading(true);try{const{data}=await supabase.from("duty_schedule").select("*");const map={};(data||[]).forEach(r=>{map[r.date]={date:r.date,leader:r.leader||"",dc:parseJSON(r.dc,[]),ioc:parseJSON(r.ioc,[]),note:r.note||""};});setSchedule(map);const{data:hd}=await supabase.from("app_config").select("*").eq("key","holidays");if(hd&&hd[0])setHolidays(parseJSON(hd[0].value,[]));}catch{}setLoading(false);})();},[]);

  const saveDay=async(d)=>{const row={date:d.date,leader:d.leader,dc:JSON.stringify(d.dc),ioc:JSON.stringify(d.ioc),note:d.note};const{error}=await supabase.from("duty_schedule").upsert(row,{onConflict:"date"});if(!error){setSchedule(p=>({...p,[d.date]:d}));showToast&&showToast("Đã lưu lịch trực");}else showToast&&showToast("Lỗi: "+(error.message||""),"error");};

  const doImport=async()=>{const parsed=parsePasted(pasteText);if(parsed.length===0){showToast&&showToast("Không đọc được dữ liệu. Kiểm tra định dạng dán.","error");return;}const rows=parsed.map(d=>({date:d.date,leader:d.leader,dc:JSON.stringify(d.dc),ioc:JSON.stringify(d.ioc),note:d.note}));const{error}=await supabase.from("duty_schedule").upsert(rows,{onConflict:"date"});if(!error){const map={...schedule};parsed.forEach(d=>map[d.date]=d);setSchedule(map);showToast&&showToast(`Đã nhập ${parsed.length} ngày trực`);setShowImport(false);setPasteText("");}else showToast&&showToast("Lỗi: "+(error.message||""),"error");};

  const monthDays=useMemo(()=>{const y=cur.getFullYear(),m=cur.getMonth();const first=new Date(y,m,1);const startDow=first.getDay();const daysInMonth=new Date(y,m+1,0).getDate();const cells=[];for(let i=0;i<startDow;i++)cells.push(null);for(let d=1;d<=daysInMonth;d++)cells.push(new Date(y,m,d));return cells;},[cur]);
  const weekDays=useMemo(()=>{const d=new Date(cur);const dow=d.getDay();const monday=new Date(d);monday.setDate(d.getDate()-dow);const arr=[];for(let i=0;i<7;i++){const x=new Date(monday);x.setDate(monday.getDate()+i);arr.push(x);}return arr;},[cur]);

  const openEditDay=(dateStr)=>{const ex=schedule[dateStr]||{date:dateStr,leader:"",dc:[],ioc:[],note:""};setDayDraft({...ex,dc:[...ex.dc],ioc:[...ex.ioc]});setEditDay(dateStr);};

  const COLORS={leader:{bg:"#fef3c7",col:"#92400e",label:"⭐ Trực lãnh đạo"},dc:{bg:"#dbeafe",col:"#1e40af",label:"🖥️ Trực DC"},ioc:{bg:"#dcfce7",col:"#15803d",label:"🏢 Trực IOC"}};

  const renderDayDetail=(dateStr)=>{const s=schedule[dateStr];const wknd=isWeekendOrHoliday(dateStr,holidays);const shifts=wknd?SHIFTS.weekend:SHIFTS.weekday;const d=new Date(dateStr);
    return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:700,fontSize:16}}>{WD[d.getDay()]}, {d.getDate()}/{d.getMonth()+1}/{d.getFullYear()}</span>{wknd&&<span style={{fontSize:11,background:"#fee2e2",color:"#b91c1c",padding:"2px 8px",borderRadius:8}}>Cuối tuần / Lễ</span>}</div>
      {!s?<div style={{padding:24,textAlign:"center",color:"#9ca3af",background:"#f9fafb",borderRadius:10}}>Chưa có lịch trực ngày này</div>:<>
        <div style={{background:COLORS.leader.bg,borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600,color:COLORS.leader.col,marginBottom:4}}>{COLORS.leader.label}</div><div style={{fontSize:14}}>{s.leader||"—"}</div></div>
        <div style={{background:COLORS.dc.bg,borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600,color:COLORS.dc.col,marginBottom:6}}>{COLORS.dc.label}</div>{s.dc.map((name,i)=><div key={i} style={{fontSize:13,marginBottom:4,display:"flex",justifyContent:"space-between"}}><span>{name}</span>{shifts.DC[i]&&<span style={{fontSize:11,color:"#6b7280"}}>{shifts.DC[i].label} ({shifts.DC[i].time})</span>}</div>)}</div>
        <div style={{background:COLORS.ioc.bg,borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600,color:COLORS.ioc.col,marginBottom:6}}>{COLORS.ioc.label}</div>{s.ioc.map((name,i)=><div key={i} style={{fontSize:13,marginBottom:4,display:"flex",justifyContent:"space-between"}}><span>{name}</span>{shifts.IOC[i]&&<span style={{fontSize:11,color:"#6b7280"}}>{shifts.IOC[i].label?shifts.IOC[i].label+" ":""}({shifts.IOC[i].time})</span>}</div>)}</div>
        {s.note&&<div style={{fontSize:12,color:"#6b7280",fontStyle:"italic"}}>📝 {s.note}</div>}
      </>}
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
          {s&&<div style={{display:"flex",flexDirection:"column",gap:2}}>{s.leader&&<div style={{fontSize:9,background:"#fef3c7",color:"#92400e",padding:"1px 4px",borderRadius:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>⭐{s.leader}</div>}{s.dc.length>0&&<div style={{fontSize:9,background:"#dbeafe",color:"#1e40af",padding:"1px 4px",borderRadius:4}}>🖥️ DC: {s.dc.length}</div>}{s.ioc.length>0&&<div style={{fontSize:9,background:"#dcfce7",color:"#15803d",padding:"1px 4px",borderRadius:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🏢{s.ioc.join(", ")}</div>}</div>}
        </div>);})}
      </div>
    </div>}

    {viewMode==="week"&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(7,1fr)",gap:8}}>
      {weekDays.map((d,i)=>{const ds=ymd(d);const s=schedule[ds];const isToday=ds===todayStr;const wknd=isWeekendOrHoliday(ds,holidays);return(<div key={i} onClick={()=>{setCur(d);setViewMode("day");}} style={{background:"#fff",borderRadius:10,border:"1px solid "+(isToday?"#3b82f6":"#e5e7eb"),padding:10,cursor:"pointer"}}>
        <div style={{fontSize:12,fontWeight:600,color:wknd?"#dc2626":"#374151",marginBottom:6,paddingBottom:6,borderBottom:"1px solid #f3f4f6"}}>{WD[d.getDay()]} {d.getDate()}/{d.getMonth()+1}</div>
        {s?<div style={{display:"flex",flexDirection:"column",gap:4}}>{s.leader&&<div style={{fontSize:11}}><span style={{color:"#92400e"}}>⭐ LĐ:</span> {s.leader}</div>}{s.dc.length>0&&<div style={{fontSize:11}}><span style={{color:"#1e40af"}}>🖥️ DC:</span> {s.dc.join(", ")}</div>}{s.ioc.length>0&&<div style={{fontSize:11}}><span style={{color:"#15803d"}}>🏢 IOC:</span> {s.ioc.join(", ")}</div>}</div>:<div style={{fontSize:11,color:"#9ca3af",textAlign:"center",padding:8}}>—</div>}
      </div>);})}
    </div>}

    {viewMode==="day"&&<div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:18}}>{renderDayDetail(ymd(cur))}</div>}
    </>}

    {showImport&&(<div onClick={()=>setShowImport(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>📥 Nhập lịch trực từ Word</span><button onClick={()=>setShowImport(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18}}>
        <div style={{fontSize:12,color:"#6b7280",marginBottom:10,lineHeight:1.6,background:"#f8fafc",padding:"10px 12px",borderRadius:8}}><b>Cách làm:</b><br/>1. Mở file Word lịch trực<br/>2. Bôi đen toàn bộ <b>bảng</b> (từ dòng ngày đầu đến cuối)<br/>3. Copy (Ctrl+C)<br/>4. Dán (Ctrl+V) vào ô dưới đây<br/>5. Bấm "Phân tích & Nhập"</div>
        <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} rows={10} placeholder="Dán nội dung bảng lịch trực vào đây…" style={{...inp,resize:"vertical",fontFamily:"monospace",fontSize:12}}/>
        {pasteText.trim()&&<div style={{fontSize:12,color:"#059669",marginTop:6}}>Phát hiện {parsePasted(pasteText).length} ngày trực</div>}
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setShowImport(false)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={doImport} style={{padding:"8px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Phân tích & Nhập</button></div>
    </div></div>)}

    {editDay&&dayDraft&&(<div onClick={()=>setEditDay(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:14}}>Sửa lịch trực {editDay.split("-").reverse().join("/")}</span><button onClick={()=>setEditDay(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:12,color:"#92400e",display:"block",marginBottom:4,fontWeight:600}}>⭐ Trực lãnh đạo</label><input value={dayDraft.leader} onChange={e=>setDayDraft(d=>({...d,leader:e.target.value}))} style={inp}/></div>
        <div><label style={{fontSize:12,color:"#1e40af",display:"block",marginBottom:4,fontWeight:600}}>🖥️ Trực DC (mỗi người 1 dòng)</label><textarea value={dayDraft.dc.join("\n")} onChange={e=>setDayDraft(d=>({...d,dc:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)}))} rows={3} style={{...inp,resize:"vertical"}}/></div>
        <div><label style={{fontSize:12,color:"#15803d",display:"block",marginBottom:4,fontWeight:600}}>🏢 Trực IOC (mỗi người 1 dòng)</label><textarea value={dayDraft.ioc.join("\n")} onChange={e=>setDayDraft(d=>({...d,ioc:e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
        <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú</label><input value={dayDraft.note} onChange={e=>setDayDraft(d=>({...d,note:e.target.value}))} style={inp}/></div>
      </div>
      <div style={{padding:"0 18px 18px",display:"flex",gap:10,justifyContent:"flex-end"}}><button onClick={()=>setEditDay(null)} style={{padding:"8px 16px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={async()=>{await saveDay(dayDraft);setEditDay(null);}} style={{padding:"8px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Lưu</button></div>
    </div></div>)}
  </div>);
}
