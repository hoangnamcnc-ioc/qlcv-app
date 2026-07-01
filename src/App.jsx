import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { supabase } from "./supabase";
import LOGO from "./logo.jpg";
// Code-split: các view ít dùng chỉ tải khi mở (giảm dung lượng tải lần đầu)
const Investment = lazy(()=>import("./Investment"));
const OtherTasks = lazy(()=>import("./OtherTasks"));
const HelpGuide = lazy(()=>import("./HelpGuide"));
const DutySchedule = lazy(()=>import("./DutySchedule"));
const Feedback = lazy(()=>import("./Feedback"));
const Documents = lazy(()=>import("./Documents"));
import { DEPTS, DEPT_COLOR, ROLES_EMP, VI_MONTHS, VI_DAYS, ROLE_LABELS, ROLE_COLORS, FULL_ACCESS, CAN_CREATE, RATING, LATE_REASONS, OVERLOAD_DEFAULT, FREQUENCIES, STATUS, PRIO, STATUS_ORDER, LATE_COMPLETION_PENALTY } from "./constants";
import { addDays, today, todayStr, nowStr, getNextDate, isCompletedLateByDate, getStatus, isCompletedStatus, isLateStatus, parseJSON, hashPwd, getFileIcon } from "./helpers";
import { ProgressBar, RoleBadge, RatingBadge, Chip, PChip } from "./components/ui";
import Dashboard from "./components/Dashboard";
import TaskList from "./components/TaskList";
const Reports = lazy(()=>import("./components/Reports"));
import Employees from "./components/Employees";
import TaskModal from "./components/TaskModal";


const DEFAULT_EMPLOYEES = [
  {id:"e1",name:"Nguyễn Thị Hoa",dept:"HCTH",role:"Trưởng phòng"},{id:"e2",name:"Trần Văn An",dept:"HCTH",role:"Chuyên viên"},{id:"e3",name:"Lê Thị Mai",dept:"HCTH",role:"Chuyên viên"},{id:"e4",name:"Phạm Văn Bình",dept:"HCTH",role:"Chuyên viên"},{id:"e5",name:"Hoàng Thị Lan",dept:"HCTH",role:"Chuyên viên"},{id:"e6",name:"Đỗ Văn Cường",dept:"HCTH",role:"Nhân viên"},{id:"e7",name:"Vũ Thị Thu",dept:"HCTH",role:"Nhân viên"},{id:"e8",name:"Ngô Văn Đức",dept:"HCTH",role:"Nhân viên"},{id:"e9",name:"Bùi Thị Hạnh",dept:"HCTH",role:"Nhân viên"},{id:"e10",name:"Đinh Văn Hùng",dept:"HCTH",role:"Nhân viên"},{id:"e11",name:"Lý Thị Hương",dept:"HCTH",role:"Nhân viên"},{id:"e12",name:"Trịnh Văn Khoa",dept:"HCTH",role:"Nhân viên"},{id:"e13",name:"Phan Thị Linh",dept:"HCTH",role:"Nhân viên"},
  {id:"e14",name:"Nguyễn Văn Minh",dept:"QL-KTDL",role:"Trưởng phòng"},{id:"e15",name:"Trần Thị Nga",dept:"QL-KTDL",role:"Phó trưởng phòng"},{id:"e16",name:"Lê Văn Nam",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e17",name:"Phạm Thị Oanh",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e18",name:"Hoàng Văn Phong",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e19",name:"Đỗ Thị Quỳnh",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e20",name:"Vũ Văn Sơn",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e21",name:"Ngô Thị Tâm",dept:"QL-KTDL",role:"Nhân viên"},{id:"e22",name:"Bùi Văn Thắng",dept:"QL-KTDL",role:"Nhân viên"},{id:"e23",name:"Đinh Thị Thủy",dept:"QL-KTDL",role:"Nhân viên"},{id:"e24",name:"Lý Văn Tiến",dept:"QL-KTDL",role:"Nhân viên"},{id:"e25",name:"Trịnh Thị Trang",dept:"QL-KTDL",role:"Nhân viên"},{id:"e26",name:"Phan Văn Trung",dept:"QL-KTDL",role:"Nhân viên"},{id:"e27",name:"Cao Thị Tuyết",dept:"QL-KTDL",role:"Nhân viên"},
  {id:"e28",name:"Nguyễn Thị Út",dept:"HT-NTS",role:"Trưởng phòng"},{id:"e29",name:"Trần Văn Việt",dept:"HT-NTS",role:"Phó trưởng phòng"},{id:"e30",name:"Lê Thị Xuân",dept:"HT-NTS",role:"Chuyên viên"},{id:"e31",name:"Phạm Văn Yên",dept:"HT-NTS",role:"Chuyên viên"},{id:"e32",name:"Hoàng Thị Yến",dept:"HT-NTS",role:"Chuyên viên"},{id:"e33",name:"Đỗ Văn Dũng",dept:"HT-NTS",role:"Chuyên viên"},{id:"e34",name:"Vũ Thị Diệu",dept:"HT-NTS",role:"Chuyên viên"},{id:"e35",name:"Ngô Văn Hiếu",dept:"HT-NTS",role:"Nhân viên"},{id:"e36",name:"Bùi Thị Hiền",dept:"HT-NTS",role:"Nhân viên"},{id:"e37",name:"Đinh Văn Lộc",dept:"HT-NTS",role:"Nhân viên"},{id:"e38",name:"Lý Thị Lụa",dept:"HT-NTS",role:"Nhân viên"},{id:"e39",name:"Trịnh Văn Mạnh",dept:"HT-NTS",role:"Nhân viên"},{id:"e40",name:"Phan Thị Nhung",dept:"HT-NTS",role:"Nhân viên"},
];

const emptyTemplate=(emps,dept)=>{const d=dept||DEPTS[0];const f=emps.find(e=>e.dept===d);return{title:"",description:"",dept:d,eid:f?.id||"",prio:"medium",frequency:"monthly",deadline_days:7,active:true,next_date:todayStr,collab_eids:"[]",collab_note:""};};


export default function App() {
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  const [currentUser,setCurrentUser]=useState(null);
  const [loginForm,setLoginForm]=useState({username:"",password:""});
  const [loginError,setLoginError]=useState(""); const [loginLoading,setLoginLoading]=useState(false);
  const [view,setView]=useState("dashboard");
  const [tasks,setTasks]=useState(null); const [employees,setEmployees]=useState(null);
  const [otherTasks,setOtherTasks]=useState([]);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  const [modal,setModal]=useState(null); const [taskForm,setTaskForm]=useState(null);
  const [empForm,setEmpForm]=useState(null); const [empDeptTab,setEmpDeptTab]=useState("HCTH");
  const [fStatus,setFStatus]=useState("all"); const [fDept,setFDept]=useState("all");
  const [fEid,setFEid]=useState("all"); const [search,setSearch]=useState(""); const [fSort,setFSort]=useState("urgency");
  const [page,setPage]=useState(1); const PAGE_SIZE=20;
  const [showTrash,setShowTrash]=useState(false);
  const [exModal,setExModal]=useState(false); const [exStatus,setExStatus]=useState("all"); const [exDept,setExDept]=useState("all");
  const [toast,setToast]=useState(null); const [uploadingFiles,setUploadingFiles]=useState(false);
  const [comments,setComments]=useState({}); const [commentText,setCommentText]=useState(""); const [commentLoading,setCommentLoading]=useState(false); const [commentFiles,setCommentFiles]=useState([]);
  const [userModal,setUserModal]=useState(false); const [users,setUsers]=useState([]);
  const [userForm,setUserForm]=useState({username:"",password:"",full_name:"",role:"staff",employee_id:""}); const [userEditId,setUserEditId]=useState(null);
  const [calYear,setCalYear]=useState(today.getFullYear()); const [calMonth,setCalMonth]=useState(today.getMonth()); const [calDay,setCalDay]=useState(null);
  const [repMonth,setRepMonth]=useState(today.getMonth()); const [repYear,setRepYear]=useState(today.getFullYear()); const [repTab,setRepTab]=useState("monthly");
  const [rankYear,setRankYear]=useState(today.getFullYear());
  const [overloadThreshold,setOverloadThreshold]=useState(()=>parseInt(localStorage.getItem("qlcv_overload")||"5"));
  const [ratingNote,setRatingNote]=useState(""); const [lateNote,setLateNote]=useState("");
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [showNotif,setShowNotif]=useState(false);
  const [showZoom,setShowZoom]=useState(false);
  const [quickRate,setQuickRate]=useState(null);
  const [quickProgress,setQuickProgress]=useState(null);
  const [zoom,setZoom]=useState(()=>parseFloat(localStorage.getItem("qlcv_zoom")||"1"));
  const [darkMode,setDarkMode]=useState(()=>localStorage.getItem("qlcv_dark")==="1");
  const [calSubTab,setCalSubTab]=useState("duty"); // "tasks" | "duty" — gộp Lịch + Lịch trực, mặc định mở Trực
  const toggleDark=()=>{const v=!darkMode;setDarkMode(v);localStorage.setItem("qlcv_dark",v?"1":"0");};
  const [loginHistory,setLoginHistory]=useState([]);
  const [loginHistoryLoaded,setLoginHistoryLoaded]=useState(false);
  const loadLoginHistory=async()=>{if(loginHistoryLoaded)return;const{data}=await supabase.from("login_history").select("*").order("at",{ascending:false}).limit(300);setLoginHistory(data||[]);setLoginHistoryLoaded(true);};
  const changeZoom=v=>{const z=Math.min(1.4,Math.max(0.8,v));setZoom(z);localStorage.setItem("qlcv_zoom",z);};
  const [statFilter,setStatFilter]=useState(null);
  const [overloadPopup,setOverloadPopup]=useState(null);
  const [linkInput,setLinkInput]=useState({name:"",url:""});
  const [forwardModal,setForwardModal]=useState(null);
  const [forwardEid,setForwardEid]=useState("");
  const [recurringTemplates,setRecurringTemplates]=useState([]);
  const [showRecurring,setShowRecurring]=useState(false); const [templateForm,setTemplateForm]=useState(null);
  const recurringChecked=useRef(false);
  // ── Đổi mật khẩu ──
  const [showChangePwd,setShowChangePwd]=useState(false);
  const [changePwdForm,setChangePwdForm]=useState({current:"",next:"",confirm:""});
  const [changePwdError,setChangePwdError]=useState("");
  // ── Ghi chú hoàn thành ──
  const [completionNoteModal,setCompletionNoteModal]=useState(null);
  const [completionNote,setCompletionNote]=useState("");
  const [completionFiles,setCompletionFiles]=useState([]);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  const userDept=useMemo(()=>!currentUser||!employees?null:employees.find(e=>e.id===currentUser.employee_id)?.dept||null,[currentUser,employees]);
  const canSeeAll=useMemo(()=>FULL_ACCESS.includes(currentUser?.role),[currentUser]);
  const canAssignAllDepts=useMemo(()=>["admin","director"].includes(currentUser?.role),[currentUser]);
  const canCreate=useMemo(()=>CAN_CREATE.includes(currentUser?.role),[currentUser]);
  const isAdmin=currentUser?.role==="admin";
  const availableDepts=useMemo(()=>canAssignAllDepts?DEPTS:userDept?[userDept]:DEPTS,[canAssignAllDepts,userDept]);
  const canSeeTask=useMemo(()=>(t)=>{if(!currentUser)return false;if(canSeeAll)return true;if(["manager","deputy_manager"].includes(currentUser.role))return t.dept===userDept;if(t.eid===currentUser.employee_id)return true;return parseJSON(t.collab_eids,[]).includes(currentUser.employee_id);},[currentUser,canSeeAll,userDept]);
  const canEditTask=useMemo(()=>(t)=>{if(!currentUser)return false;if(["admin","director"].includes(currentUser.role))return true;if(["manager","deputy_manager","manager_hcth"].includes(currentUser.role))return t.dept===userDept;return false;},[currentUser,userDept]);
  const canDeleteTask=useMemo(()=>(t)=>{if(!currentUser)return false;if(["admin","director"].includes(currentUser.role))return true;if(["manager","manager_hcth"].includes(currentUser.role))return t.dept===userDept;return false;},[currentUser,userDept]);
  const canUpdateProgress=useMemo(()=>(t)=>canEditTask(t)||currentUser?.employee_id===t.eid||parseJSON(t.collab_eids,[]).includes(currentUser?.employee_id),[canEditTask,currentUser]);
  const canRate=(t)=>{const st=t.status||getStatus(t);if(st==="completed_late")return false;if(!t.completed&&st!=="completed")return false;if(t.created_by_id){if(currentUser.id===t.created_by_id)return true;if(t.forwarded_by&&t.forwarded_by===currentUser.full_name)return true;return FULL_ACCESS.includes(currentUser.role)&&false;}return canCreate;};
  const canForward=(t)=>{if(!currentUser)return false;if(t.completed||isCompletedStatus(t.status))return false;return ["manager","deputy_manager"].includes(currentUser.role)&&t.dept===userDept;};
  const canSetLateReason=(t)=>isLateStatus(t.status)&&(currentUser?.employee_id===t.eid||parseJSON(t.collab_eids,[]).includes(currentUser?.employee_id)||canCreate);

  const logLogin=async(username,success,fullName)=>{try{await supabase.from("login_history").insert({id:`lg${Date.now()}${Math.random().toString(36).slice(2,6)}`,username,full_name:fullName||"",success,at:nowStr()});}catch{}};
  const handleLogin=async()=>{if(!loginForm.username||!loginForm.password){setLoginError("Vui lòng nhập đầy đủ");return;}setLoginLoading(true);setLoginError("");
    // Đăng nhập qua RPC server-side: hash được so sánh trong Postgres, password không bao giờ rời server
    const{data,error}=await supabase.rpc("login",{p_username:loginForm.username,p_password:loginForm.password});
    const user=Array.isArray(data)?data[0]:data;
    if(error||!user){setLoginError("Sai tên đăng nhập hoặc mật khẩu");setLoginLoading(false);logLogin(loginForm.username,false,"");return;}
    setCurrentUser(user);sessionStorage.setItem("qlcv_user",JSON.stringify(user));setLoginLoading(false);logLogin(user.username,true,user.full_name);};
  const handleLogout=()=>{setCurrentUser(null);sessionStorage.removeItem("qlcv_user");setLoginNotifShown(false);};
  useEffect(()=>{const s=sessionStorage.getItem("qlcv_user");if(s)try{setCurrentUser(JSON.parse(s));}catch{};},[]);

  // ── Đổi mật khẩu ──
  const handleChangePwd=async()=>{
    const{current,next,confirm}=changePwdForm;
    if(!current||!next||!confirm){setChangePwdError("Vui lòng điền đầy đủ cả 3 ô");return;}
    if(next.length<6){setChangePwdError("Mật khẩu mới phải có ít nhất 6 ký tự");return;}
    if(next!==confirm){setChangePwdError("Mật khẩu xác nhận không khớp");return;}
    // Đổi mật khẩu qua RPC: server tự kiểm tra mật khẩu hiện tại, trả về true/false
    const{data:ok,error}=await supabase.rpc("change_password",{p_username:currentUser.username,p_current:current,p_new:next});
    if(error){showToast("Lỗi khi đổi mật khẩu","error");return;}
    if(!ok){setChangePwdError("Mật khẩu hiện tại không đúng");return;}
    showToast("Đổi mật khẩu thành công ✓");
    setShowChangePwd(false);
    setChangePwdForm({current:"",next:"",confirm:""});
    setChangePwdError("");
  };

  useEffect(()=>{
    if(!currentUser)return;
    (async()=>{
      setLoading(true);
      try{
        const[{data:ed},{data:td},{data:ud},{data:rtd},{data:otd}]=await Promise.all([supabase.from("employees").select("*").order("dept"),supabase.from("tasks").select("*").order("created",{ascending:false}),supabase.from("users").select("id,username,full_name,role,employee_id"),supabase.from("recurring_templates").select("*").order("title"),supabase.from("other_tasks").select("*").order("created",{ascending:false})]);
        if(!ed||ed.length===0){await supabase.from("employees").insert(DEFAULT_EMPLOYEES);setEmployees(DEFAULT_EMPLOYEES);}else setEmployees(ed);
        setTasks(td||[]);setUsers(ud||[]);setRecurringTemplates(rtd||[]);setOtherTasks(otd||[]);
      }catch{showToast("Lỗi kết nối database","error");setEmployees(DEFAULT_EMPLOYEES);setTasks([]);}
      setLoading(false);
    })();
  },[currentUser]);

  useEffect(()=>{
    if(!tasks||!recurringTemplates.length||!canCreate||recurringChecked.current)return;
    recurringChecked.current=true;
    (async()=>{
      const due=recurringTemplates.filter(t=>t.active&&t.next_date<=todayStr&&t.last_created!==todayStr);
      if(!due.length)return;
      let created=0;
      for(const tpl of due){
        const deadline=addDays(today,tpl.deadline_days||7);
        const newTask={id:`t${Date.now()}_${Math.random().toString(36).slice(2,6)}`,title:`🔄 ${tpl.title}`,description:tpl.description||"",dept:tpl.dept,eid:tpl.eid,prio:tpl.prio,deadline,completed:false,created:todayStr,progress:0,attachments:"[]",collab_eids:tpl.collab_eids||"[]",collab_note:tpl.collab_note||"",template_id:tpl.id,history:JSON.stringify([{action:`Tạo tự động từ mẫu định kỳ "${tpl.title}"`,by:"Hệ thống",at:nowStr()}]),rating:"",rating_note:"",rated_by:"",rated_at:"",late_reason:"",late_note:""};
        const{error}=await supabase.from("tasks").insert(newTask);
        if(!error){setTasks(p=>[newTask,...p]);const nextDate=getNextDate(tpl.next_date,tpl.frequency);await supabase.from("recurring_templates").update({next_date:nextDate,last_created:todayStr}).eq("id",tpl.id);setRecurringTemplates(p=>p.map(r=>r.id===tpl.id?{...r,next_date:nextDate,last_created:todayStr}:r));created++;}
      }
      if(created>0)showToast(`🔄 Đã tạo ${created} nhiệm vụ định kỳ tự động`);
    })();
  },[tasks,recurringTemplates,canCreate]);

  const loadComments=async id=>{setCommentLoading(true);const{data}=await supabase.from("comments").select("*").eq("task_id",id).order("created_at");setComments(p=>({...p,[id]:data||[]}));setCommentLoading(false);};
  const addComment=async id=>{if(!commentText.trim()&&commentFiles.length===0)return;const c={id:`c${Date.now()}`,task_id:id,user_name:currentUser.full_name,content:commentText.trim(),attachments:JSON.stringify(commentFiles),created_at:nowStr()};await supabase.from("comments").insert(c);setComments(p=>({...p,[id]:[...(p[id]||[]),c]}));const task=tasks.find(t=>t.id===id);if(task){const h=parseJSON(task.history,[]);h.push({action:`Bình luận: "${commentText.trim()||"(đính kèm file)"}"`,by:currentUser.full_name,at:nowStr()});await supabase.from("tasks").update({history:JSON.stringify(h)}).eq("id",id);setTasks(p=>p.map(t=>t.id===id?{...t,history:JSON.stringify(h)}:t));}setCommentText("");setCommentFiles([]);};
  const uploadFiles=async(files,existing=[])=>{setUploadingFiles(true);const results=[...existing];for(const file of files){const fn=`${Date.now()}_${file.name.replace(/\s/g,"_")}`;const{error}=await supabase.storage.from("attachments").upload(fn,file);if(!error){const{data:{publicUrl}}=supabase.storage.from("attachments").getPublicUrl(fn);results.push({name:file.name,url:publicUrl});}else showToast(`Lỗi upload: ${file.name}`,"error");}setUploadingFiles(false);return results;};
  const addTask=async data=>{setSaving(true);const h=[{action:"Tạo nhiệm vụ",by:currentUser.full_name,at:nowStr()}];const t={...data,id:`t${Date.now()}`,completed:data.progress===100,created:todayStr,created_by_id:currentUser.id,created_by_name:currentUser.full_name,forwarded_by:"",deleted:false,history:JSON.stringify(h),rating:"",rating_note:"",rated_by:"",rated_at:"",late_reason:"",late_note:""};const{error}=await supabase.from("tasks").insert(t);if(!error){setTasks(p=>[t,...p]);showToast("Đã tạo nhiệm vụ");}else{console.error("Lỗi tạo nhiệm vụ:",error);showToast("Lỗi: "+(error.message||"không tạo được"),"error");}setSaving(false);return error?null:t;};
  const updateTask=async(id,updates,note)=>{const task=tasks.find(t=>t.id===id);if(updates.progress===100&&task&&getStatus(task)==="overdue"&&!task.late_reason){showToast("Nhiệm vụ đã quá hạn. Vui lòng nhập nguyên nhân trễ hạn trước khi hoàn thành.","error");setModal({...task,status:"overdue"});return;}setSaving(true);if(note&&task){const h=parseJSON(task.history,[]);h.push({action:note,by:currentUser.full_name,at:nowStr()});updates.history=JSON.stringify(h);}if(updates.progress===100){updates.completed=true;if(!updates.completed_at)updates.completed_at=new Date().toISOString();}if(updates.completed===false)updates.completed_at=null;const{error}=await supabase.from("tasks").update(updates).eq("id",id);if(!error){setTasks(p=>p.map(t=>t.id===id?{...t,...updates}:t));showToast("Đã cập nhật");}else showToast("Lỗi","error");setSaving(false);};
  const forwardTask=async()=>{if(!forwardModal||!forwardEid)return;setSaving(true);const task=forwardModal;const newEmp=getEmp(forwardEid);const oldEmp=getEmp(task.eid);const h=parseJSON(task.history,[]);h.push({action:`Chuyển tiếp cho ${newEmp?.name||"?"} thực hiện (phụ trách: ${oldEmp?.name||currentUser.full_name})`,by:currentUser.full_name,at:nowStr()});
    // người cũ (TP) thành phụ trách -> đưa vào collab; người mới thành người thực hiện chính
    const collab=parseJSON(task.collab_eids,[]);if(task.eid&&!collab.includes(task.eid))collab.push(task.eid);const newCollab=collab.filter(id=>id!==forwardEid);
    const updates={eid:forwardEid,collab_eids:JSON.stringify(newCollab),forwarded_by:currentUser.full_name,history:JSON.stringify(h)};
    const{error}=await supabase.from("tasks").update(updates).eq("id",task.id);if(!error){setTasks(p=>p.map(t=>t.id===task.id?{...t,...updates}:t));showToast(`Đã chuyển tiếp cho ${newEmp?.name}`);setForwardModal(null);setForwardEid("");}else{showToast("Lỗi: "+(error.message||"không chuyển được"),"error");}setSaving(false);};
  const deleteTaskFn=async id=>{setSaving(true);const task=tasks.find(t=>t.id===id);const h=task?parseJSON(task.history,[]):[];h.push({action:"Xóa nhiệm vụ",by:currentUser.full_name,at:nowStr()});await supabase.from("tasks").update({deleted:true,history:JSON.stringify(h)}).eq("id",id);setTasks(p=>p.map(t=>t.id===id?{...t,deleted:true}:t));setModal(null);setSaving(false);showToast("Đã chuyển vào thùng rác");};
  const restoreTaskFn=async id=>{setSaving(true);await supabase.from("tasks").update({deleted:false}).eq("id",id);setTasks(p=>p.map(t=>t.id===id?{...t,deleted:false}:t));setSaving(false);showToast("Đã khôi phục");};
  const purgeTaskFn=async id=>{setSaving(true);await supabase.from("tasks").delete().eq("id",id);setTasks(p=>p.filter(t=>t.id!==id));setSaving(false);showToast("Đã xóa vĩnh viễn");};
  const isSuspiciousCompletion=t=>{
    if((t.progress||0)>=80)return false;
    const dl=new Date(t.deadline);dl.setHours(23,59,59,999);
    const hoursLeft=(dl-new Date())/3600000;
    return hoursLeft>=0&&hoursLeft<=24;
  };
  // ── Nhân viên không tự hoàn thành được nữa: bấm "Yêu cầu hoàn thành" → chờ duyệt → TP/PP/BGĐ duyệt + đánh giá ──
  const toggleDone=t=>{
    const st=t.status||getStatus(t);
    if(t.completed){
      if(!canEditTask(t)){showToast("Chỉ Trưởng phòng/Phó phòng/Ban Giám đốc mới được bỏ hoàn thành","error");return;}
      updateTask(t.id,{completed:false,completion_requested:false,progress:t.progress>=100?90:t.progress,completed_at:null,rating:"",rating_note:"",rated_by:"",rated_at:"",completion_note:"",suspicious_completion:false},"Bỏ hoàn thành");
      return;
    }
    if(t.completion_requested){showToast("Nhiệm vụ đang chờ duyệt hoàn thành","error");return;}
    if(st==="overdue"&&!t.late_reason){showToast("Nhiệm vụ đã quá hạn. Vui lòng nhập nguyên nhân trễ hạn trước khi yêu cầu hoàn thành.","error");setModal({...t,status:"overdue"});return;}
    setCompletionNoteModal(t);setCompletionNote("");setCompletionFiles(parseJSON(t.attachments,[]));
  };
  const confirmCompletion=async(task)=>{
    if(!completionNote||completionNote.trim().length<20){showToast("Vui lòng mô tả kết quả (ít nhất 20 ký tự)","error");return;}
    const suspicious=isSuspiciousCompletion(task);
    await updateTask(task.id,{completion_requested:true,requested_by:currentUser.full_name,requested_at:nowStr(),progress:100,completion_note:completionNote.trim(),suspicious_completion:suspicious,attachments:JSON.stringify(completionFiles)},`Yêu cầu duyệt hoàn thành: "${completionNote.trim().slice(0,50)}"`);
    showToast(suspicious?"⚠️ Yêu cầu hoàn thành đột ngột — trưởng phòng sẽ thấy cảnh báo":"Đã gửi yêu cầu duyệt hoàn thành","success");
    setCompletionNoteModal(null);setCompletionNote("");setCompletionFiles([]);
  };
  // ── Duyệt yêu cầu hoàn thành + đánh giá (TP/PP/BGĐ) ──
  const [approveModal,setApproveModal]=useState(null); // task đang chờ duyệt
  const [approveRating,setApproveRating]=useState("");
  const [approveNote,setApproveNote]=useState("");
  const openApproveModal=t=>{setApproveModal(t);setApproveRating("");setApproveNote("");};
  const confirmApproveCompletion=async()=>{
    if(!approveRating){showToast("Vui lòng chọn mức đánh giá","error");return;}
    const task=approveModal;
    await updateTask(task.id,{completed:true,completion_requested:false,completed_at:task.completed_at||new Date().toISOString(),rating:approveRating,rating_note:approveNote,rated_by:currentUser.full_name,rated_at:nowStr()},`Duyệt hoàn thành & đánh giá: ${RATING[approveRating]?.label}`);
    showToast("Đã duyệt hoàn thành nhiệm vụ");
    setApproveModal(null);setApproveRating("");setApproveNote("");
  };
  const rejectCompletionRequest=async(task)=>{
    if(!window.confirm("Từ chối yêu cầu hoàn thành và trả nhiệm vụ về cho người thực hiện làm lại?"))return;
    await updateTask(task.id,{completion_requested:false},"Từ chối yêu cầu hoàn thành, yêu cầu làm lại");
    showToast("Đã từ chối, nhiệm vụ trở lại trạng thái thực hiện");
  };
  const rateTask=async(id,rating)=>{const up={rating,rating_note:ratingNote,rated_by:currentUser.full_name,rated_at:nowStr()};await updateTask(id,up,`Đánh giá: ${RATING[rating]?.label}`);setModal(m=>m?{...m,...up}:m);setRatingNote("");};
  const setLateReasonFn=async(id,reason)=>{const up={late_reason:reason,late_note:lateNote};await updateTask(id,up,`Nguyên nhân trễ: ${LATE_REASONS.find(r=>r.value===reason)?.label||reason}`);setModal(m=>m?{...m,...up}:m);setLateNote("");};
  const addEmployee=async d=>{setSaving(true);const e={...d,id:`e${Date.now()}`};await supabase.from("employees").insert(e);setEmployees(p=>[...p,e]);showToast("Đã thêm");setSaving(false);};
  const updateEmployee=async(id,d)=>{setSaving(true);await supabase.from("employees").update(d).eq("id",id);setEmployees(p=>p.map(e=>e.id===id?{...e,...d}:e));setSaving(false);};
  const deleteEmployee=async id=>{setSaving(true);await supabase.from("employees").delete().eq("id",id);setEmployees(p=>p.filter(e=>e.id!==id));setSaving(false);};
  const submitUser=async()=>{if(!userForm.username||!userForm.full_name){return;}if(!userEditId&&!userForm.password)return;setSaving(true);if(userEditId){const cur=users.find(u=>u.id===userEditId);const pwd=userForm.password?await hashPwd(userForm.password):cur.password;const uf={...userForm,password:pwd};await supabase.from("users").update(uf).eq("id",userEditId);setUsers(p=>p.map(u=>u.id===userEditId?{...u,...uf}:u));}else{const u={...userForm,password:await hashPwd(userForm.password),id:`u${Date.now()}`};await supabase.from("users").insert(u);setUsers(p=>[...p,u]);}setUserForm({username:"",password:"",full_name:"",role:"staff",employee_id:""});setUserEditId(null);showToast("Đã lưu");setSaving(false);};
  const deleteUser=async id=>{await supabase.from("users").delete().eq("id",id);setUsers(p=>p.filter(u=>u.id!==id));};
  const resetUserPwd=async u=>{if(!window.confirm(`Đặt lại mật khẩu của "${u.full_name}" về mặc định (abc123)?`))return;const h=await hashPwd("abc123");await supabase.from("users").update({password:h}).eq("id",u.id);setUsers(p=>p.map(x=>x.id===u.id?{...x,password:h}:x));showToast(`Đã đặt lại mật khẩu của ${u.full_name} → abc123`);};
  const submitTemplate=async()=>{const{data,editId}=templateForm;if(!data.title||!data.eid)return;setSaving(true);if(editId){await supabase.from("recurring_templates").update(data).eq("id",editId);setRecurringTemplates(p=>p.map(t=>t.id===editId?{...t,...data}:t));}else{const nt={...data,id:`rt${Date.now()}`,created_by:currentUser.full_name,last_created:""};await supabase.from("recurring_templates").insert(nt);setRecurringTemplates(p=>[...p,nt]);}showToast("Đã lưu mẫu định kỳ");setTemplateForm(null);setSaving(false);};
  const deleteTemplate=async id=>{await supabase.from("recurring_templates").delete().eq("id",id);setRecurringTemplates(p=>p.filter(t=>t.id!==id));};
  const toggleTemplate=async(id,active)=>{await supabase.from("recurring_templates").update({active}).eq("id",id);setRecurringTemplates(p=>p.map(t=>t.id===id?{...t,active}:t));showToast(active?"Đã kích hoạt":"Đã tạm dừng");};
  const getEmp=id=>(employees||[]).find(e=>e.id===id);

  const visibleTasks=useMemo(()=>(tasks||[]).filter(t=>!t.deleted&&canSeeTask(t)),[tasks,canSeeTask]);
  const trashedTasks=useMemo(()=>(tasks||[]).filter(t=>t.deleted&&canSeeTask(t)),[tasks,canSeeTask]);
  const computed=useMemo(()=>visibleTasks.map(t=>({...t,status:getStatus(t)})),[visibleTasks]);
  const stats=useMemo(()=>computed.reduce((a,t)=>{a.total+=1;a[t.status]=(a[t.status]||0)+1;return a;},{total:0,on_time:0,nearly_due:0,overdue:0,pending_approval:0,completed_late:0,completed:0}),[computed]);
  const deptChart=useMemo(()=>DEPTS.map(d=>{const dt=computed.filter(t=>t.dept===d);return{name:d,"Trong hạn":dt.filter(t=>t.status==="on_time").length,"Sắp hết hạn":dt.filter(t=>t.status==="nearly_due").length,"Quá hạn":dt.filter(t=>t.status==="overdue").length,"Chờ duyệt":dt.filter(t=>t.status==="pending_approval").length,"HT quá hạn":dt.filter(t=>t.status==="completed_late").length,"Hoàn thành":dt.filter(t=>t.status==="completed").length};}), [computed]);
  // ── Tổng hợp điều hành theo phòng ban (cho BGĐ) ──
  const execDeptSummary=useMemo(()=>DEPTS.map(d=>{
    const dt=computed.filter(t=>t.dept===d);
    const overdue=dt.filter(t=>t.status==="overdue").length;
    const completedLate=dt.filter(t=>t.status==="completed_late").length;
    const over=overdue+completedLate;
    const nd=dt.filter(t=>t.status==="nearly_due").length;
    const done=dt.filter(t=>isCompletedStatus(t.status)).length;
    const rate=dt.length?Math.round(done/dt.length*100):0;
    const deptEmpsList=(employees||[]).filter(e=>e.dept===d);
    const overloaded=deptEmpsList.filter(e=>computed.filter(t=>t.eid===e.id&&!isCompletedStatus(t.status)).length>=overloadThreshold).length;
    const lead=deptEmpsList.find(e=>["Trưởng phòng","TP. HCTH"].includes(e.role));
    return{dept:d,total:dt.length,over,overdue,completedLate,nd,done,rate,empCount:deptEmpsList.length,overloaded,lead:lead?.name||"—"};
  }),[computed,employees,overloadThreshold]);
  const filtered=useMemo(()=>{const f=computed.filter(t=>{if(fStatus!=="all"&&t.status!==fStatus)return false;if(fDept!=="all"&&t.dept!==fDept)return false;if(fEid!=="all"&&t.eid!==fEid)return false;if(search){const q=search.toLowerCase();const empName=(getEmp(t.eid)?.name||"").toLowerCase();const hit=t.title.toLowerCase().includes(q)||(t.description||"").toLowerCase().includes(q)||empName.includes(q);if(!hit)return false;}return true;});if(fSort==="urgency")return[...f].sort((a,b)=>(STATUS_ORDER[a.status]??9)-(STATUS_ORDER[b.status]??9));if(fSort==="deadline_asc")return[...f].sort((a,b)=>a.deadline.localeCompare(b.deadline));if(fSort==="deadline_desc")return[...f].sort((a,b)=>b.deadline.localeCompare(a.deadline));if(fSort==="newest")return[...f].sort((a,b)=>(b.created||"").localeCompare(a.created||""));return f;},[computed,fStatus,fDept,fEid,search,fSort]);
  const totalPages=useMemo(()=>Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),[filtered]);
  const paged=useMemo(()=>filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),[filtered,page]);
  const calTasks=useMemo(()=>computed.filter(t=>{const d=new Date(t.deadline);return d.getFullYear()===calYear&&d.getMonth()===calMonth;}),[computed,calYear,calMonth]);
  const calTasksByDay=useMemo(()=>{const m={};calTasks.forEach(t=>{const day=new Date(t.deadline).getDate();if(!m[day])m[day]=[];m[day].push(t);});return m;},[calTasks]);
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const repTasks=useMemo(()=>computed.filter(t=>{const d=new Date(t.deadline);return d.getFullYear()===repYear&&d.getMonth()===repMonth;}),[computed,repYear,repMonth]);
  const repStats=useMemo(()=>{const total=repTasks.length,done=repTasks.filter(t=>isCompletedStatus(t.status)).length,over=repTasks.filter(t=>t.status==="overdue").length,completedLate=repTasks.filter(t=>t.status==="completed_late").length;return{total,done,over,completedLate,rate:total?Math.round(done/total*100):0};},[repTasks]);
  const repDeptData=useMemo(()=>DEPTS.map(d=>{const dt=repTasks.filter(t=>t.dept===d);const done=dt.filter(t=>isCompletedStatus(t.status)).length;const over=dt.filter(t=>t.status==="overdue").length;const completedLate=dt.filter(t=>t.status==="completed_late").length;return{name:d,total:dt.length,done,over,completedLate,rate:dt.length?Math.round(done/dt.length*100):0};}), [repTasks]);
  // ── Index theo (nhân viên | năm | tháng) — dựng MỘT lần, tra cứu O(1) thay vì quét toàn bộ mỗi lần ──
  // byEid: việc mình chủ trì ; byCollab: việc mình phối hợp
  const perfIndex=useMemo(()=>{
    const byEid=new Map(),byCollab=new Map();
    const push=(map,key,t)=>{let a=map.get(key);if(!a){a=[];map.set(key,a);}a.push(t);};
    for(const t of computed){
      if(!t.deadline)continue;
      const d=new Date(t.deadline);if(isNaN(d))continue;
      const ym=`${d.getFullYear()}|${d.getMonth()}`;
      push(byEid,`${t.eid}|${ym}`,t);
      for(const cid of parseJSON(t.collab_eids,[]))push(byCollab,`${cid}|${ym}`,t);
    }
    return{byEid,byCollab};
  },[computed]);
  // ── Công thức tính điểm hiệu suất 1 THÁNG (dùng chung cho bảng "Hiệu suất tháng" và "Xếp hạng năm") ──
  const calcMonthPerf=(empId,year,month)=>{
    const ym=`${year}|${month}`;
    const et=perfIndex.byEid.get(`${empId}|${ym}`)||[];
    // Phân loại theo trạng thái
    const onTimeTasks=et.filter(t=>t.status==="completed");   // HT đúng hạn (Đ)
    const onTime=onTimeTasks.length;
    const completedLate=et.filter(t=>t.status==="completed_late").length; // HT trễ (T)
    const over=et.filter(t=>t.status==="overdue").length;                 // Quá hạn chưa xong (Q)
    const done=onTime+completedLate;
    const resolved=onTime+completedLate+over; // Mẫu số N = việc đã đến hạn
    const completionRate=et.length?Math.round(done/et.length*100):0;
    const eligible=et.length>=5;
    // Task phối hợp trong tháng
    const collabTasks=perfIndex.byCollab.get(`${empId}|${ym}`)||[];
    const collabDone=collabTasks.filter(t=>isCompletedStatus(t.status)).length;
    const collabTotal=collabTasks.length;
    let perfScore=0,breakdown=null;
    if(eligible){
      // ① Điểm thời hạn (tối đa 60) — chưa có việc nào đến hạn xử lý xong thì tạm tính 0, tránh chia cho 0
      const timeliness=resolved>0?(onTime*60+completedLate*30)/resolved:0;
      // ② Điểm chất lượng (tối đa 40)
      const qualitySum=onTimeTasks.reduce((s,t)=>s+(RATING[t.rating]?RATING[t.rating].score:2),0);
      const quality=resolved>0?qualitySum/(resolved*4)*40:0;
      // ③ Phạt trễ/quá hạn
      const penalty=(over+completedLate)*LATE_COMPLETION_PENALTY;
      // ④ Thưởng khối lượng
      const workloadBonus=Math.max(0,Math.min((resolved-5)*1,10));
      // ⑤ Điểm phối hợp (×0.5 so với chủ trì)
      const collabBonus=collabTotal>0?Math.round((collabDone/collabTotal)*100*0.5*0.1):0; // tối đa ~5đ
      perfScore=Math.max(0,Math.min(100,Math.round(timeliness+quality-penalty+workloadBonus+collabBonus)));
      // Lưu chi tiết để hiển thị "Vì sao điểm này?"
      breakdown={timeliness:Math.round(timeliness*10)/10,quality:Math.round(quality*10)/10,penalty,workloadBonus,collabBonus};
    }
    return{total:et.length,done,onTime,completedLate,over,resolved,completionRate,collabTotal,collabDone,perfScore,eligible,breakdown};
  };
  const repEmpData=useMemo(()=>(employees||[]).map(emp=>{
    const m=calcMonthPerf(emp.id,repYear,repMonth);
    return{...emp,...m,perfScore:m.perfScore};
  }).filter(e=>e.total>0).sort((a,b)=>{
    if(a.eligible!==b.eligible)return a.eligible?-1:1; // người đủ điều kiện hiện trước
    if(b.perfScore!==a.perfScore)return b.perfScore-a.perfScore;
    return b.done-a.done; // cùng điểm -> ai hoàn thành nhiều việc hơn xếp trên
  }),[employees,repYear,repMonth,computed]);
  const repMonthTrend=useMemo(()=>{const months=[];for(let i=5;i>=0;i--){const d=new Date(repYear,repMonth-i,1);const m=d.getMonth(),y=d.getFullYear();const mt=computed.filter(t=>{const td=new Date(t.deadline);return td.getFullYear()===y&&td.getMonth()===m;});months.push({name:`T${m+1}`,done:mt.filter(t=>isCompletedStatus(t.status)).length,total:mt.length});}return months;},[computed,repYear,repMonth]);
  const leaderboard=useMemo(()=>(employees||[]).map(emp=>{
    const monthly=[...Array(12)].map((_,m)=>calcMonthPerf(emp.id,rankYear,m));
    const eligibleMonths=monthly.filter(m=>m.eligible);
    const total=monthly.reduce((s,m)=>s+m.total,0);
    const done=monthly.reduce((s,m)=>s+m.done,0);
    const over=monthly.reduce((s,m)=>s+(m.over||0),0);
    const completedLate=monthly.reduce((s,m)=>s+(m.completedLate||0),0);
    const avgScore=eligibleMonths.length?Math.round(eligibleMonths.reduce((s,m)=>s+m.perfScore,0)/eligibleMonths.length):null;
    const collabTotal=monthly.reduce((s,m)=>s+(m.collabTotal||0),0);
    const collabDone=monthly.reduce((s,m)=>s+(m.collabDone||0),0);
    return{...emp,total,done,completedLate,over,collabTotal,collabDone,eligibleMonths:eligibleMonths.length,score:avgScore,rate:total?Math.round(done/total*100):0};
  }).filter(e=>e.total>0).sort((a,b)=>{
    const aHas=a.score!==null,bHas=b.score!==null;
    if(aHas!==bHas)return aHas?-1:1;
    if(aHas&&bHas&&b.score!==a.score)return b.score-a.score;
    return b.rate-a.rate;
  }),[computed,employees,rankYear]);
  const lateReasonStats=useMemo(()=>{const lt=computed.filter(t=>t.late_reason);const total=lt.length;return LATE_REASONS.map(r=>({...r,count:lt.filter(t=>t.late_reason===r.value).length,pct:total?Math.round(lt.filter(t=>t.late_reason===r.value).length/total*100):0})).filter(r=>r.count>0).sort((a,b)=>b.count-a.count);},[computed]);
  const overloadedEmps=useMemo(()=>(employees||[]).map(emp=>{const active=computed.filter(t=>t.eid===emp.id&&!isCompletedStatus(t.status));return{...emp,activeCount:active.length};}).filter(e=>e.activeCount>=overloadThreshold),[employees,computed,overloadThreshold]);
  const notifications=useMemo(()=>computed.filter(t=>t.status==="overdue"||t.status==="nearly_due").sort((a,b)=>(STATUS_ORDER[a.status]??9)-(STATUS_ORDER[b.status]??9)),[computed]);
  const unratedTasks=useMemo(()=>computed.filter(t=>t.status==="completed"&&!t.rating&&t.created_by_id===currentUser?.id),[computed,currentUser]);
  const suspiciousTasks=useMemo(()=>canCreate?computed.filter(t=>t.suspicious_completion&&!t.rating):[],[computed,canCreate]);
  // ── Việc mới giao / việc trễ hạn của TÔI (người được giao) — dùng cho popup khi đăng nhập ──
  const seenKey=currentUser?`qlcv_seen_${currentUser.username}`:null;
  const getSeenIds=()=>{if(!seenKey)return[];try{return JSON.parse(localStorage.getItem(seenKey)||"[]");}catch{return[];}};
  const markSeen=(id)=>{if(!seenKey)return;const s=new Set(getSeenIds());s.add(id);localStorage.setItem(seenKey,JSON.stringify([...s]));};
  const myAssignedTasks=useMemo(()=>currentUser?.employee_id?computed.filter(t=>t.eid===currentUser.employee_id&&!t.deleted):[],[computed,currentUser]);
  const myNewTasks=useMemo(()=>{const seen=new Set(getSeenIds());return myAssignedTasks.filter(t=>!seen.has(t.id));},[myAssignedTasks,currentUser]);
  const myOverdueTasks=useMemo(()=>myAssignedTasks.filter(t=>t.status==="overdue"),[myAssignedTasks]);
  const myNewTaskIds=useMemo(()=>new Set(myNewTasks.map(t=>t.id)),[myNewTasks]);
  // ── Các bước "Nhiệm vụ khác" đang chờ Tổ trưởng/Tổ phó duyệt ──
  const myPendingApprovals=useMemo(()=>{
    const myEid=currentUser?.employee_id;
    if(!myEid)return[];
    const isAdminLike=["admin","director"].includes(currentUser?.role);
    const out=[];
    (otherTasks||[]).forEach(ot=>{
      const team=parseJSON(ot.team,[]);
      const isLeaderOrDeputy=team.some(m=>m.eid===myEid&&(m.role==="leader"||m.role==="deputy"));
      if(!isLeaderOrDeputy&&!isAdminLike)return;
      parseJSON(ot.steps,[]).forEach((s,idx)=>{
        if(s.status==="pending_approval")out.push({taskId:ot.id,taskName:ot.name,stepIdx:idx,content:s.content,requested_by:s.requested_by,requested_at:s.requested_at});
      });
    });
    return out;
  },[otherTasks,currentUser]);
  useEffect(()=>{if(modal&&seenKey){markSeen(modal.id);}},[modal]);
  const [loginNotifShown,setLoginNotifShown]=useState(false);
  const [showLoginPopup,setShowLoginPopup]=useState(false);
  useEffect(()=>{
    if(!currentUser||loading||loginNotifShown)return;
    if(myNewTasks.length>0||myOverdueTasks.length>0||myPendingApprovals.length>0)setShowLoginPopup(true);
    setLoginNotifShown(true);
  },[currentUser,loading,loginNotifShown,myNewTasks.length,myOverdueTasks.length,myPendingApprovals.length]);
  const totalNotif=notifications.length+unratedTasks.length+myNewTasks.length+suspiciousTasks.length+myPendingApprovals.length;
  const activityLog=useMemo(()=>{if(!canSeeAll)return[];const logs=[];(tasks||[]).forEach(t=>{parseJSON(t.history,[]).forEach((h,i)=>{logs.push({id:t.id+"_"+i,task:t.title,action:h.action,by:h.by,at:h.at});});});return logs.sort((a,b)=>{const pa=a.at.split(" ");const pb=b.at.split(" ");const da=pa[1]?pa[1].split("/").reverse().join("")+pa[0]:"";const db=pb[1]?pb[1].split("/").reverse().join("")+pb[0]:"";return db.localeCompare(da);}).slice(0,200);},[tasks,canSeeAll]);
  const myTrend=useMemo(()=>{if(!currentUser?.employee_id)return[];const months=[];for(let i=5;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth()-i,1);const m=d.getMonth(),y=d.getFullYear();const mt=computed.filter(t=>{const td=new Date(t.deadline);return td.getFullYear()===y&&td.getMonth()===m&&(t.eid===currentUser.employee_id||parseJSON(t.collab_eids,[]).includes(currentUser.employee_id));});months.push({name:`T${m+1}`,"Hoàn thành":mt.filter(t=>isCompletedStatus(t.status)).length,"Tổng":mt.length});}return months;},[computed,currentUser]);
  const myTasks=useMemo(()=>{if(!currentUser?.employee_id)return null;const my=computed.filter(t=>t.eid===currentUser.employee_id||parseJSON(t.collab_eids,[]).includes(currentUser.employee_id));const done=my.filter(t=>isCompletedStatus(t.status)).length,over=my.filter(t=>t.status==="overdue").length,completedLate=my.filter(t=>t.status==="completed_late").length,nd=my.filter(t=>t.status==="nearly_due").length,active=my.filter(t=>!isCompletedStatus(t.status));return{total:my.length,done,over,completedLate,nd,rate:my.length?Math.round(done/my.length*100):0,pending:active.sort((a,b)=>(STATUS_ORDER[a.status]??9)-(STATUS_ORDER[b.status]??9)).slice(0,3)};},[computed,currentUser]);
  useEffect(()=>{setPage(1);},[fStatus,fDept,fEid,search,fSort]);
  const ROLE_RANK={"Trưởng phòng":0,"TP. HCTH":0,"Phó trưởng phòng":1,"Phó phòng":1,"Chuyên viên":2,"Nhân viên":3};
  const deptEmps=dept=>(employees||[]).filter(e=>e.dept===dept).sort((a,b)=>{const ra=ROLE_RANK[a.role]??2,rb=ROLE_RANK[b.role]??2;if(ra!==rb)return ra-rb;const fa=(a.name||"").trim().split(" ").pop();const fb=(b.name||"").trim().split(" ").pop();const c=fa.localeCompare(fb,"vi");return c!==0?c:(a.name||"").localeCompare(b.name||"","vi");});
  const emptyTaskData=()=>{const dept=availableDepts[0];const first=(employees||[]).find(e=>e.dept===dept);return{title:"",description:"",dept,eid:first?.id||"",prio:"medium",deadline:addDays(today,7),attachments:"[]",progress:0,collab_eids:"[]",collab_note:""};};
  const [rateReminderModal,setRateReminderModal]=useState(false);
  const openCreateTask=()=>{if(unratedTasks.length>0){setRateReminderModal(true);return;}setTaskForm({data:emptyTaskData(),editId:null});};
  const [pendingDocLink,setPendingDocLink]=useState(null); // văn bản đang chờ gán nhiệm vụ vừa tạo
  const openCreateTaskFromDoc=(doc)=>{if(unratedTasks.length>0){setRateReminderModal(true);return;}const base=emptyTaskData();setTaskForm({data:{...base,title:`[${doc.doc_number}] ${doc.title}`,description:doc.note||""},editId:null});setPendingDocLink(doc.id);};
  const openEditTask=t=>setTaskForm({data:{title:t.title,description:t.description||"",dept:t.dept,eid:t.eid,prio:t.prio,deadline:t.deadline,attachments:t.attachments||"[]",progress:t.progress||0,collab_eids:t.collab_eids||"[]",collab_note:t.collab_note||""},editId:t.id});
  const changeTaskDept=v=>{const f=(employees||[]).find(e=>e.dept===v);setTaskForm(tf=>({...tf,data:{...tf.data,dept:v,eid:f?f.id:""}}));};
  const toggleCollab=empId=>{const cur=parseJSON(taskForm.data.collab_eids,[]);const next=cur.includes(empId)?cur.filter(i=>i!==empId):[...cur,empId];setTaskForm(f=>({...f,data:{...f.data,collab_eids:JSON.stringify(next)}}));};
  const submitTask=async()=>{const{data,editId}=taskForm;if(!data.title||!data.deadline)return;if(editId)await updateTask(editId,data,"Cập nhật nhiệm vụ");else{const created=await addTask(data);if(created&&pendingDocLink){await supabase.from("documents").update({task_id:created.id}).eq("id",pendingDocLink);showToast("Đã liên kết nhiệm vụ với văn bản");}}setPendingDocLink(null);setTaskForm(null);};
  const openCreateEmp=dept=>setEmpForm({data:{name:"",dept:dept||"HCTH",role:"Nhân viên"},editId:null});
  const openEditEmp=emp=>setEmpForm({data:{name:emp.name,dept:emp.dept,role:emp.role},editId:emp.id});
  const submitEmp=async()=>{const{data,editId}=empForm;if(!data.name.trim())return;if(editId)await updateEmployee(editId,data);else await addEmployee(data);setEmpForm(null);};
  const exportCSV=()=>{const rows=computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept));const header=["Tiêu đề","Phòng ban","Nhân viên","Ưu tiên","Hạn chót","Tiến độ","Trạng thái","Đánh giá","Nguyên nhân trễ","Định kỳ","Ngày tạo"];const lines=rows.map(t=>{const emp=getEmp(t.eid);return[`"${(t.title||"").replace(/"/g,'""')}"`,t.dept,`"${emp?.name||""}"`,PRIO[t.prio]?.label,t.deadline,`${t.progress||0}%`,STATUS[t.status]?.label,t.rating?RATING[t.rating]?.label:"",t.late_reason?LATE_REASONS.find(r=>r.value===t.late_reason)?.label:"",t.template_id?"Có":"",t.created||""].join(",");});const csv="\uFEFF"+[header.join(","),...lines].join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download=`bao-cao-${todayStr}.csv`;a.click();URL.revokeObjectURL(url);setExModal(false);};
  const exportPDF=()=>{const rows=computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept));const total=rows.length,done=rows.filter(t=>t.status==="completed").length,over=rows.filter(t=>t.status==="overdue").length,nd=rows.filter(t=>t.status==="nearly_due").length;const rows_html=rows.map(t=>{const emp=getEmp(t.eid);const sc=STATUS[t.status];return`<tr><td>${t.title||""}</td><td>${t.dept}</td><td>${emp?.name||"–"}</td><td>${PRIO[t.prio]?.label||""}</td><td style="color:${t.status==="overdue"?"#b91c1c":"inherit"}">${t.deadline}</td><td>${t.progress||0}%</td><td style="color:${sc?.col}">${sc?.label||""}</td><td>${t.rating?RATING[t.rating]?.label:"–"}</td></tr>`;}).join("");const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Báo cáo nhiệm vụ</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{color:#1e1b4b;font-size:20px;margin-bottom:4px}.meta{color:#6b7280;font-size:13px;margin-bottom:20px}.stats{display:flex;gap:16px;margin-bottom:20px}.stat{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px 20px;text-align:center}.stat .val{font-size:26px;font-weight:700;color:#4338ca}.stat .lbl{font-size:12px;color:#6b7280;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f1f5f9;padding:8px 10px;text-align:left;border:1px solid #e5e7eb;font-size:12px;color:#374151}td{padding:7px 10px;border:1px solid #e5e7eb}tr:nth-child(even){background:#fafafa}@media print{body{padding:0}button{display:none}}</style></head><body><h1>📋 Báo cáo Nhiệm vụ</h1><div class="meta">Xuất ngày: ${new Date().toLocaleDateString("vi-VN")} · Bộ lọc: ${exStatus==="all"?"Tất cả":STATUS[exStatus]?.label} · Phòng: ${exDept==="all"?"Tất cả":exDept}</div><div class="stats"><div class="stat"><div class="val">${total}</div><div class="lbl">Tổng</div></div><div class="stat"><div class="val" style="color:#15803d">${done}</div><div class="lbl">Hoàn thành</div></div><div class="stat"><div class="val" style="color:#b91c1c">${over}</div><div class="lbl">Quá hạn</div></div><div class="stat"><div class="val" style="color:#92400e">${nd}</div><div class="lbl">Sắp hết hạn</div></div><div class="stat"><div class="val" style="color:#4338ca">${total?Math.round(done/total*100):0}%</div><div class="lbl">Tỷ lệ HT</div></div></div><table><thead><tr><th>Tiêu đề</th><th>Phòng</th><th>Nhân viên</th><th>Ưu tiên</th><th>Hạn chót</th><th>Tiến độ</th><th>Trạng thái</th><th>Đánh giá</th></tr></thead><tbody>${rows_html}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`;const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}setExModal(false);};

  const inp={padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:7,fontSize:13,background:"#fff",color:"#111",width:"100%",boxSizing:"border-box"};
  const navItems=[{id:"dashboard",icon:"📊",label:"Tổng quan"},{id:"tasks",icon:"📋",label:"Nhiệm vụ"},{id:"investment",icon:"💰",label:"Nhiệm vụ ngân sách"},{id:"othertasks",icon:"📌",label:"Nhiệm vụ khác"},{id:"calendar",icon:"🗓️",label:"Lịch trực"},{id:"documents",icon:"📁",label:"Văn bản"},{id:"reports",icon:"📈",label:"Báo cáo"},{id:"employees",icon:"👥",label:"Nhân viên"},{id:"feedback",icon:"💡",label:"Góp ý"},{id:"help",icon:"📘",label:"Hướng dẫn"},...(canSeeAll?[{id:"activity",icon:"📜",label:"Nhật ký"}]:[]),...(currentUser?.role==="admin"?[{id:"security",icon:"🔐",label:"Bảo mật"}]:[])];

  if(!currentUser)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f0f4ff",fontFamily:"system-ui,sans-serif",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:isMobile?24:36,width:"100%",maxWidth:360,boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
        <div style={{textAlign:"center",marginBottom:28}}><img src={LOGO} alt="DAK LAK IOC" style={{width:100,height:100,objectFit:"contain",marginBottom:12,borderRadius:"50%"}}/><div style={{fontWeight:800,fontSize:17,color:"#1e1b4b",lineHeight:1.3}}>HỆ THỐNG QUẢN LÝ GIAO VIỆC</div><div style={{fontWeight:700,fontSize:15,color:"#2563eb",marginTop:2}}>DAK LAK IOC</div><div style={{fontSize:12,color:"#6b7280",marginTop:6}}>Đăng nhập để tiếp tục</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tên đăng nhập</label><input value={loginForm.username} onChange={e=>setLoginForm(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="admin" style={inp}/></div>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Mật khẩu</label><input type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••••" style={inp}/></div>
          {loginError&&<div style={{fontSize:12,color:"#b91c1c",background:"#fee2e2",padding:"8px 12px",borderRadius:7}}>{loginError}</div>}
          <button onClick={handleLogin} disabled={loginLoading} style={{padding:10,background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600,marginTop:4}}>{loginLoading?"Đang đăng nhập…":"Đăng nhập"}</button>
        </div>
      </div>
    </div>
  );

  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#6b7280"}}>Đang tải dữ liệu…</div>;

  return(<>
    <div className={darkMode?"qlcv-dark":""} style={{display:"flex",flexDirection:isMobile?"column":"row",height:"100dvh",fontFamily:"system-ui,sans-serif",background:darkMode?"#0f172a":"#f8fafc",overflow:"hidden",zoom:zoom}}>
      <style>{`
        .qlcv-dark { filter: invert(1) hue-rotate(180deg); }
        .qlcv-dark img, .qlcv-dark svg { filter: invert(1) hue-rotate(180deg); }
      `}</style>
      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:200,background:toast.type==="error"?"#fee2e2":"#dcfce7",color:toast.type==="error"?"#b91c1c":"#15803d",padding:"10px 18px",borderRadius:8,fontSize:13,boxShadow:"0 2px 8px rgba(0,0,0,0.12)",maxWidth:320}}>{toast.msg}</div>}

      {/* SIDEBAR */}
      {!isMobile&&(
        <div style={{width:220,background:"#1e1b4b",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"14px",borderBottom:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:10}}><img src={LOGO} alt="logo" style={{width:40,height:40,objectFit:"contain",borderRadius:"50%",flexShrink:0}}/><div><div style={{color:"#fff",fontWeight:700,fontSize:13,lineHeight:1.3}}>QUẢN LÝ GIAO VIỆC</div><div style={{color:"#a5b4fc",fontSize:11,marginTop:1}}>DAK LAK IOC</div></div></div>
          <nav style={{flex:1,padding:"8px 0",overflowY:"auto",minHeight:0}}>
            {navItems.map(n=><button key={n.id} onClick={()=>{setView(n.id);if(n.id==="security")loadLoginHistory();}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:view===n.id?"rgba(165,180,252,0.15)":"transparent",border:"none",cursor:"pointer",color:view===n.id?"#c7d2fe":"#94a3b8",textAlign:"left",fontSize:13}}><span>{n.icon}</span>{n.label}</button>)}
            {canCreate&&<button onClick={()=>setShowRecurring(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8",textAlign:"left",fontSize:13}}>🔄 Nhiệm vụ định kỳ{recurringTemplates.filter(t=>t.active).length>0&&<span style={{background:"#6366f1",color:"#fff",fontSize:10,padding:"1px 6px",borderRadius:10,marginLeft:"auto"}}>{recurringTemplates.filter(t=>t.active).length}</span>}</button>}
            {isAdmin&&<button onClick={()=>setUserModal(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8",textAlign:"left",fontSize:13}}>🔐 Tài khoản</button>}
          </nav>
          <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
            {canSeeAll&&<button onClick={()=>setExModal(true)} style={{background:"rgba(99,102,241,0.25)",border:"none",borderRadius:7,padding:"8px 10px",cursor:"pointer",color:"#c7d2fe",fontSize:13,textAlign:"left"}}>📤 Xuất CSV</button>}
            {/* User info + actions */}
            <div style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:"8px 10px"}}>
              <div style={{color:"#e0e7ff",fontSize:12,fontWeight:500,marginBottom:2}}>{currentUser.full_name}</div>
              <div style={{marginBottom:8}}><RoleBadge role={currentUser.role}/></div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setChangePwdForm({current:"",next:"",confirm:""});setChangePwdError("");setShowChangePwd(true);}} style={{flex:1,background:"rgba(99,102,241,0.3)",border:"none",borderRadius:6,padding:"5px 0",cursor:"pointer",color:"#c7d2fe",fontSize:12}}>🔑 Đổi MK</button>
                <button onClick={handleLogout} style={{flex:1,background:"rgba(255,255,255,0.08)",border:"none",borderRadius:6,padding:"5px 0",cursor:"pointer",color:"#94a3b8",fontSize:12}}>⏏ Đăng xuất</button>
              </div>
            </div>
            {saving&&<div style={{color:"#64748b",fontSize:11,textAlign:"center"}}>Đang lưu…</div>}
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:isMobile?"10px 12px":"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isMobile&&<div style={{display:"flex",alignItems:"center",gap:8}}><img src={LOGO} alt="logo" style={{width:30,height:30,objectFit:"contain",borderRadius:"50%"}}/><span style={{fontWeight:700,fontSize:13,color:"#1e1b4b"}}>DAK LAK IOC</span></div>}
            <span style={{fontWeight:600,fontSize:isMobile?14:15,color:"#111827"}}>{navItems.find(n=>n.id===view)?.label}</span>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {isMobile&&<RoleBadge role={currentUser.role}/>}
            {/* Font size controls */}
            <button onClick={toggleDark} title={darkMode?"Chuyển sang nền sáng":"Chuyển sang nền tối"} style={{padding:"6px 10px",background:darkMode?"#374151":"#f1f5f9",border:"1px solid "+(darkMode?"#4b5563":"#e5e7eb"),borderRadius:8,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center"}}>{darkMode?"☀️":"🌙"}</button>
            {!isMobile&&<div style={{display:"flex",alignItems:"center",border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
              <button onClick={()=>changeZoom(zoom-0.1)} disabled={zoom<=0.8} style={{padding:"5px 8px",background:"none",border:"none",cursor:zoom<=0.8?"not-allowed":"pointer",fontSize:13,color:zoom<=0.8?"#d1d5db":"#374151",fontWeight:600}}>A−</button>
              <span style={{padding:"0 4px",fontSize:11,color:"#9ca3af",borderLeft:"1px solid #e5e7eb",borderRight:"1px solid #e5e7eb"}}>{Math.round(zoom*100)}%</span>
              <button onClick={()=>changeZoom(zoom+0.1)} disabled={zoom>=1.4} style={{padding:"5px 8px",background:"none",border:"none",cursor:zoom>=1.4?"not-allowed":"pointer",fontSize:13,color:zoom>=1.4?"#d1d5db":"#374151",fontWeight:700}}>A+</button>
            </div>}
            {isMobile&&<div style={{position:"relative"}}>
              <button onClick={()=>setShowZoom(v=>!v)} style={{padding:"5px 9px",background:"#f1f5f9",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,color:"#374151",lineHeight:1}}>Aa</button>
              {showZoom&&<div style={{position:"fixed",top:54,right:8,background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",zIndex:300,padding:"12px 16px",minWidth:180}}>
                <div style={{fontSize:12,color:"#6b7280",marginBottom:10,fontWeight:500}}>Cỡ chữ</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <button onClick={()=>changeZoom(zoom-0.1)} disabled={zoom<=0.8} style={{width:36,height:36,border:"1px solid #e5e7eb",borderRadius:8,background:zoom<=0.8?"#f9fafb":"#fff",cursor:zoom<=0.8?"not-allowed":"pointer",fontSize:16,fontWeight:700,color:zoom<=0.8?"#d1d5db":"#374151",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                  <div style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:700,color:"#111"}}>{Math.round(zoom*100)}%</div>
                    <div style={{fontSize:10,color:"#9ca3af"}}>mặc định 100%</div>
                  </div>
                  <button onClick={()=>changeZoom(zoom+0.1)} disabled={zoom>=1.4} style={{width:36,height:36,border:"1px solid #e5e7eb",borderRadius:8,background:zoom>=1.4?"#f9fafb":"#fff",cursor:zoom>=1.4?"not-allowed":"pointer",fontSize:16,fontWeight:700,color:zoom>=1.4?"#d1d5db":"#374151",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
                {zoom!==1&&<button onClick={()=>changeZoom(1)} style={{width:"100%",marginTop:10,padding:"6px",border:"1px solid #e5e7eb",borderRadius:7,background:"#f8fafc",cursor:"pointer",fontSize:12,color:"#6b7280"}}>Về mặc định</button>}
                <button onClick={()=>setShowZoom(false)} style={{position:"absolute",top:8,right:10,background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af"}}>✕</button>
              </div>}
            </div>}
            {/* Bell notification */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowNotif(v=>!v)} style={{position:"relative",background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 8px",cursor:"pointer",fontSize:16}}>
                🔔{totalNotif>0&&<span style={{position:"absolute",top:-4,right:-4,background:unratedTasks.length>0?"#f59e0b":"#dc2626",color:"#fff",fontSize:10,fontWeight:700,minWidth:16,height:16,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{totalNotif}</span>}
              </button>
              {showNotif&&<div style={{position:"absolute",top:36,right:0,width:320,maxHeight:420,overflowY:"auto",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:100}}>
                <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7eb",fontWeight:600,fontSize:13,display:"flex",justifyContent:"space-between"}}><span>🔔 Thông báo ({totalNotif})</span><button onClick={()=>setShowNotif(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af"}}>✕</button></div>
                {myPendingApprovals.length>0&&<div><div style={{padding:"8px 14px",background:"#fffbeb",fontSize:11,fontWeight:600,color:"#92400e",borderBottom:"1px solid #fde68a"}}>📨 CHỜ DUYỆT HOÀN THÀNH ({myPendingApprovals.length})</div>{myPendingApprovals.map((a,i)=><div key={i} onClick={()=>{setView("othertasks");setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#fffef5"}} onMouseEnter={e=>e.currentTarget.style.background="#fffbeb"} onMouseLeave={e=>e.currentTarget.style.background="#fffef5"}><span style={{fontSize:18,flexShrink:0}}>📨</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{a.taskName}</div><div style={{fontSize:11,color:"#92400e"}}>Bước: {a.content} · {a.requested_by} yêu cầu duyệt</div></div></div>)}</div>}
                {myNewTasks.length>0&&<div><div style={{padding:"8px 14px",background:"#eff6ff",fontSize:11,fontWeight:600,color:"#1d4ed8",borderBottom:"1px solid #bfdbfe"}}>📥 VIỆC MỚI GIAO ({myNewTasks.length})</div>{myNewTasks.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#f8fafc"}} onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}><span style={{fontSize:18,flexShrink:0}}>📥</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#1d4ed8"}}>{t.dept} · Hạn: {t.deadline}</div></div></div>)}</div>}
                {unratedTasks.length>0&&<div><div style={{padding:"8px 14px",background:"#fffbeb",fontSize:11,fontWeight:600,color:"#92400e",borderBottom:"1px solid #fde68a"}}>⭐ CẦN ĐÁNH GIÁ ({unratedTasks.length})</div>{unratedTasks.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#fffef0"}} onMouseEnter={e=>e.currentTarget.style.background="#fef9c3"} onMouseLeave={e=>e.currentTarget.style.background="#fffef0"}><span style={{fontSize:18,flexShrink:0}}>⭐</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#92400e"}}>Hoàn thành — chờ đánh giá · {t.dept}</div></div></div>)}</div>}
                {suspiciousTasks.length>0&&<div><div style={{padding:"8px 14px",background:"#fff7ed",fontSize:11,fontWeight:600,color:"#c2410c",borderBottom:"1px solid #fed7aa"}}>🚨 HOÀN THÀNH ĐỘT NGỘT — CẦN KIỂM TRA ({suspiciousTasks.length})</div>{suspiciousTasks.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#fff7ed"}} onMouseEnter={e=>e.currentTarget.style.background="#ffedd5"} onMouseLeave={e=>e.currentTarget.style.background="#fff7ed"}><span style={{fontSize:18,flexShrink:0}}>🚨</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#c2410c"}}>{getEmp(t.eid)?.name||"–"} · {t.dept} · Tiến độ thấp → hoàn thành sát deadline</div></div></div>)}</div>}
                {notifications.length>0&&<div><div style={{padding:"8px 14px",background:"#f9fafb",fontSize:11,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>⚠️ DEADLINE ({notifications.length})</div>{notifications.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}} onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontSize:18,flexShrink:0}}>{t.status==="overdue"?"🔴":"🟡"}</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#6b7280"}}>{getEmp(t.eid)?.name||"–"} · {t.dept} · Hạn: {t.deadline}</div></div></div>)}</div>}
                {totalNotif===0&&<div style={{padding:20,textAlign:"center",color:"#9ca3af",fontSize:13}}>Không có thông báo</div>}
              </div>}
            </div>
            {view==="tasks"&&canCreate&&<button onClick={()=>setShowRecurring(true)} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 8px",fontSize:12,cursor:"pointer"}}>🔄</button>}
            {view==="tasks"&&canDeleteTask({dept:userDept})&&trashedTasks.length>0&&<button onClick={()=>setShowTrash(true)} style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:8,padding:"5px 8px",fontSize:12,cursor:"pointer"}}>🗑️ {trashedTasks.length}</button>}
            {view==="employees"&&canCreate&&<button onClick={()=>openCreateEmp(empDeptTab)} style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:8,padding:isMobile?"5px 10px":"6px 14px",fontSize:isMobile?12:13,cursor:"pointer"}}>+ NV</button>}
            {["dashboard","tasks","calendar"].includes(view)&&canCreate&&<button onClick={openCreateTask} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:isMobile?"5px 10px":"6px 14px",fontSize:isMobile?12:13,cursor:"pointer"}}>+ Tạo việc</button>}
            {/* Mobile: đổi MK + đăng xuất */}
            {isMobile&&<button onClick={()=>{setChangePwdForm({current:"",next:"",confirm:""});setChangePwdError("");setShowChangePwd(true);}} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:13}} title="Đổi mật khẩu">🔑</button>}
            {isMobile&&<button onClick={handleLogout} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:13,color:"#6b7280"}}>⏏</button>}
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:isMobile?12:20,paddingBottom:isMobile?"72px":20}}>
        <Suspense fallback={<div style={{padding:40,textAlign:"center",color:"#9ca3af",fontSize:13}}>Đang tải…</div>}>

          {/* DASHBOARD */}
          {view==="dashboard"&&(
            <Dashboard
              currentUser={currentUser} isMobile={isMobile} userDept={userDept}
              execDeptSummary={execDeptSummary} stats={stats} deptChart={deptChart}
              myTasks={myTasks} myTrend={myTrend}
              computed={computed} overloadedEmps={overloadedEmps}
              overloadThreshold={overloadThreshold} setOverloadThreshold={setOverloadThreshold}
              overloadPopup={overloadPopup} setOverloadPopup={setOverloadPopup}
              recurringTemplates={recurringTemplates} setShowRecurring={setShowRecurring}
              statFilter={statFilter} setStatFilter={setStatFilter}
              setView={setView} setFDept={setFDept}
              setModal={setModal} loadComments={loadComments}
              getEmp={getEmp} todayStr={todayStr}
            />
          )}

          {/* TASKS */}
          {view==="tasks"&&(
            <TaskList
              isMobile={isMobile} inp={inp}
              search={search} setSearch={setSearch}
              fStatus={fStatus} setFStatus={setFStatus}
              fDept={fDept} setFDept={setFDept}
              fEid={fEid} setFEid={setFEid}
              fSort={fSort} setFSort={setFSort}
              filtered={filtered} paged={paged} page={page} setPage={setPage} totalPages={totalPages}
              canSeeAll={canSeeAll} canCreate={canCreate} canEditTask={canEditTask} canDeleteTask={canDeleteTask} canUpdateProgress={canUpdateProgress} canRate={canRate}
              employees={employees} userDept={userDept}
              getEmp={getEmp}
              setModal={setModal} loadComments={loadComments}
              openEditTask={openEditTask} toggleDone={toggleDone}
              setDeleteConfirm={setDeleteConfirm}
              rateTask={rateTask} ratingNote={ratingNote}
              quickRate={quickRate} setQuickRate={setQuickRate}
              quickProgress={quickProgress} setQuickProgress={setQuickProgress}
              updateTask={updateTask}
              myNewTaskIds={myNewTaskIds}
              onCompleteRequest={t=>{setCompletionNoteModal(t);setCompletionNote("");setCompletionFiles(parseJSON(t.attachments,[]));}}
              openApproveModal={openApproveModal} rejectCompletionRequest={rejectCompletionRequest}
            />
          )}

          {/* CALENDAR */}
          {view==="calendar"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",gap:6,background:"#f1f5f9",borderRadius:8,padding:3,width:isMobile?"100%":"fit-content"}}>
                <button onClick={()=>setCalSubTab("tasks")} style={{flex:isMobile?1:"none",padding:"7px 18px",border:"none",borderRadius:6,background:calSubTab==="tasks"?"#fff":"transparent",color:calSubTab==="tasks"?"#4f46e5":"#6b7280",cursor:"pointer",fontSize:13,fontWeight:calSubTab==="tasks"?600:400,boxShadow:calSubTab==="tasks"?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>📅 Nhiệm vụ</button>
                <button onClick={()=>setCalSubTab("duty")} style={{flex:isMobile?1:"none",padding:"7px 18px",border:"none",borderRadius:6,background:calSubTab==="duty"?"#fff":"transparent",color:calSubTab==="duty"?"#7c3aed":"#6b7280",cursor:"pointer",fontSize:13,fontWeight:calSubTab==="duty"?600:400,boxShadow:calSubTab==="duty"?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>🗓️ Trực</button>
              </div>
              {calSubTab==="tasks"&&(<>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><button onClick={()=>{let m=calMonth-1,y=calYear;if(m<0){m=11;y--;}setCalMonth(m);setCalYear(y);}} style={{padding:"6px 12px",border:"1px solid #d1d5db",borderRadius:7,background:"#f9fafb",cursor:"pointer",fontSize:14}}>‹</button><div style={{fontWeight:600,fontSize:16}}>{VI_MONTHS[calMonth]} {calYear}</div><button onClick={()=>{let m=calMonth+1,y=calYear;if(m>11){m=0;y++;}setCalMonth(m);setCalYear(y);}} style={{padding:"6px 12px",border:"1px solid #d1d5db",borderRadius:7,background:"#f9fafb",cursor:"pointer",fontSize:14}}>›</button></div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid #e5e7eb"}}>{VI_DAYS.map(d=><div key={d} style={{padding:"8px 4px",textAlign:"center",fontSize:12,fontWeight:600,color:d==="CN"?"#dc2626":"#6b7280",background:"#f9fafb"}}>{d}</div>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>{Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} style={{minHeight:isMobile?60:80,border:"0.5px solid #f3f4f6",background:"#fafafa"}}/>)}{Array.from({length:daysInMonth}).map((_,i)=>{const day=i+1;const dayTasks=calTasksByDay[day]||[];const isToday=day===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();return(<div key={day} style={{minHeight:isMobile?60:80,border:"0.5px solid #f3f4f6",padding:4,background:isToday?"#f0f4ff":"#fff",cursor:dayTasks.length?"pointer":"default"}} onClick={()=>dayTasks.length&&setCalDay({day,tasks:dayTasks})}><div style={{fontSize:12,fontWeight:isToday?700:400,width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isToday?"#4f46e5":"transparent",color:isToday?"#fff":"#374151",marginBottom:2}}>{day}</div>{dayTasks.slice(0,isMobile?1:2).map(t=><div key={t.id} style={{fontSize:10,padding:"2px 4px",borderRadius:4,marginBottom:2,background:STATUS[t.status].bg,color:STATUS[t.status].col,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.template_id&&"🔄"}{t.title}</div>)}{dayTasks.length>(isMobile?1:2)&&<div style={{fontSize:10,color:"#6b7280"}}>+{dayTasks.length-(isMobile?1:2)}</div>}</div>);})}</div></div>
              </>)}
              {calSubTab==="duty"&&(
                <DutySchedule currentUser={currentUser} employees={employees} userDept={userDept} isMobile={isMobile} inp={inp} showToast={showToast} canManage={["admin","director","manager_hcth","manager","deputy_manager"].includes(currentUser?.role)}/>
              )}
            </div>
          )}

          {/* REPORTS */}
          {view==="reports"&&(
            <Reports
              isMobile={isMobile} inp={inp}
              repTab={repTab} setRepTab={setRepTab}
              repMonth={repMonth} setRepMonth={setRepMonth} repYear={repYear} setRepYear={setRepYear}
              rankYear={rankYear} setRankYear={setRankYear}
              repStats={repStats} repTasks={repTasks} repDeptData={repDeptData} repEmpData={repEmpData} repMonthTrend={repMonthTrend}
              leaderboard={leaderboard}
              lateReasonStats={lateReasonStats}
            />
          )}

          {/* EMPLOYEES */}
          {view==="employees"&&(
            <Employees
              isMobile={isMobile} inp={inp}
              canSeeAll={canSeeAll} canCreate={canCreate} isAdmin={isAdmin}
              userDept={userDept}
              empDeptTab={empDeptTab} setEmpDeptTab={setEmpDeptTab}
              employees={employees} computed={computed}
              overloadThreshold={overloadThreshold} setOverloadThreshold={setOverloadThreshold}
              overloadedEmps={overloadedEmps}
              deptEmps={deptEmps}
              openCreateEmp={openCreateEmp} openEditEmp={openEditEmp}
              deleteEmployee={deleteEmployee}
            />
          )}
          {view==="activity"&&canSeeAll&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"10px 16px",fontSize:13,color:"#6b7280"}}>📜 Nhật ký hoạt động — 200 thao tác gần nhất trên toàn hệ thống</div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                {activityLog.length===0?<div style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>Chưa có hoạt động</div>:activityLog.map(l=>(<div key={l.id} style={{padding:"10px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:12,alignItems:"flex-start"}}><div style={{width:32,height:32,borderRadius:"50%",background:"#eef2ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>{l.by==="Hệ thống"?"⚙️":"👤"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13}}><span style={{fontWeight:600,color:"#4338ca"}}>{l.by}</span> <span style={{color:"#374151"}}>{l.action}</span></div><div style={{fontSize:11,color:"#9ca3af",marginTop:2,whiteSpace:"normal",wordBreak:"break-word"}}>📋 {l.task} · {l.at}</div></div></div>))}
              </div>
            </div>
          )}
          {view==="investment"&&(
            <Investment currentUser={currentUser} employees={employees} users={users} getEmp={getEmp} isMobile={isMobile} inp={inp} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles} showToast={showToast}/>
          )}
          {view==="othertasks"&&(
            <OtherTasks currentUser={currentUser} employees={employees} getEmp={getEmp} isMobile={isMobile} inp={inp} showToast={showToast} tasksData={otherTasks} setTasksData={setOtherTasks}/>
          )}
          {view==="feedback"&&(
            <Feedback currentUser={currentUser} isMobile={isMobile} inp={inp} showToast={showToast} canManage={["admin","director"].includes(currentUser?.role)}/>
          )}
          {view==="help"&&(
            <HelpGuide isMobile={isMobile}/>
          )}
          {view==="documents"&&(
            <Documents currentUser={currentUser} isMobile={isMobile} inp={inp} showToast={showToast} canManage={["admin","director","manager_hcth","manager","deputy_manager"].includes(currentUser?.role)} tasks={tasks} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles} onOpenTask={(t)=>{setView("tasks");setModal(t);loadComments(t.id);}} onCreateTask={openCreateTaskFromDoc}/>
          )}
          {view==="security"&&currentUser?.role==="admin"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Tổng lượt đăng nhập</div><div style={{fontSize:22,fontWeight:700,color:"#4f46e5"}}>{loginHistory.length}</div></div>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Thành công</div><div style={{fontSize:22,fontWeight:700,color:"#15803d"}}>{loginHistory.filter(l=>l.success).length}</div></div>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}><div style={{fontSize:11,color:"#6b7280"}}>Thất bại (sai mật khẩu)</div><div style={{fontSize:22,fontWeight:700,color:"#dc2626"}}>{loginHistory.filter(l=>!l.success).length}</div></div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #e5e7eb",fontWeight:600,fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>🔐 Lịch sử đăng nhập (300 lượt gần nhất)</span><button onClick={()=>{setLoginHistoryLoaded(false);loadLoginHistory();}} style={{fontSize:12,color:"#4f46e5",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>↻ Tải lại</button></div>
                <div style={{maxHeight:480,overflowY:"auto"}}>
                  {loginHistory.length===0?<div style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>Chưa có dữ liệu</div>:loginHistory.map(l=>(
                    <div key={l.id} style={{padding:"9px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:16,flexShrink:0}}>{l.success?"✅":"❌"}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:500}}>{l.full_name||l.username}<span style={{color:"#9ca3af",fontWeight:400}}> ({l.username})</span></div>
                        <div style={{fontSize:11,color:l.success?"#15803d":"#dc2626"}}>{l.success?"Đăng nhập thành công":"Đăng nhập thất bại — sai mật khẩu"}</div>
                      </div>
                      <span style={{fontSize:11,color:"#9ca3af",flexShrink:0}}>{l.at}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Suspense>
      </div>


      {/* Popup thông báo khi đăng nhập: việc mới + việc trễ hạn */}
      {showLoginPopup&&(<div onClick={()=>setShowLoginPopup(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:isMobile?"12px 8px":16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"20px 20px 12px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:6}}>👋</div><div style={{fontWeight:700,fontSize:16}}>Chào {currentUser?.full_name}!</div><div style={{fontSize:13,color:"#6b7280",marginTop:4}}>Đây là các việc bạn cần lưu ý</div></div>
        <div style={{padding:"0 16px 8px"}}>
          {myOverdueTasks.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#b91c1c",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>🔴 Việc đang trễ hạn ({myOverdueTasks.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myOverdueTasks.map(t=><div key={t.id} onClick={()=>{setShowLoginPopup(false);setModal(t);loadComments(t.id);}} style={{padding:"9px 12px",borderRadius:8,background:"#fef2f2",border:"1px solid #fecaca",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"} onMouseLeave={e=>e.currentTarget.style.background="#fef2f2"}><div style={{fontSize:13,fontWeight:500}}>{t.title}</div><div style={{fontSize:11,color:"#b91c1c",marginTop:1}}>Hạn: {t.deadline} · {t.dept}</div></div>)}</div>
          </div>}
          {myNewTasks.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>📥 Việc mới được giao ({myNewTasks.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myNewTasks.map(t=><div key={t.id} onClick={()=>{setShowLoginPopup(false);setModal(t);loadComments(t.id);}} style={{padding:"9px 12px",borderRadius:8,background:"#eff6ff",border:"1px solid #bfdbfe",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#dbeafe"} onMouseLeave={e=>e.currentTarget.style.background="#eff6ff"}><div style={{fontSize:13,fontWeight:500}}>{t.title}</div><div style={{fontSize:11,color:"#1d4ed8",marginTop:1}}>{STATUS[t.status]?.label} · Hạn: {t.deadline} · {t.dept}</div></div>)}</div>
          </div>}
          {myPendingApprovals.length>0&&<div style={{marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:"#92400e",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>📨 Bước chờ bạn duyệt hoàn thành ({myPendingApprovals.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myPendingApprovals.map((a,i)=><div key={i} onClick={()=>{setShowLoginPopup(false);setView("othertasks");}} style={{padding:"9px 12px",borderRadius:8,background:"#fffbeb",border:"1px solid #fde68a",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#fef3c7"} onMouseLeave={e=>e.currentTarget.style.background="#fffbeb"}><div style={{fontSize:13,fontWeight:500}}>{a.taskName}</div><div style={{fontSize:11,color:"#92400e",marginTop:1}}>Bước: {a.content} · {a.requested_by} yêu cầu duyệt</div></div>)}</div>
          </div>}
        </div>
        <div style={{padding:"12px 20px 18px"}}><button onClick={()=>setShowLoginPopup(false)} style={{width:"100%",padding:"10px",border:"none",borderRadius:8,background:"#4f46e5",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>Đã xem, đóng lại</button></div>
      </div></div>)}

      {/* ── MODAL GHI CHÚ HOÀN THÀNH ── */}
      {completionNoteModal&&(
        <div onClick={()=>setCompletionNoteModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontWeight:700,fontSize:15}}>📨 Yêu cầu duyệt hoàn thành</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{completionNoteModal.title}</div></div>
              <button onClick={()=>setCompletionNoteModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{margin:"12px 20px 0",padding:"10px 14px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,fontSize:12,color:"#1d4ed8"}}>Yêu cầu sẽ được gửi tới Trưởng phòng/Phó phòng/Ban Giám đốc để duyệt và đánh giá. Nhiệm vụ chỉ chính thức "Hoàn thành" sau khi được duyệt.</div>
            {isSuspiciousCompletion(completionNoteModal)&&(
              <div style={{margin:"12px 20px 0",padding:"10px 14px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:8,fontSize:13,color:"#c2410c",display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>🚨</span>
                <div><div style={{fontWeight:600,marginBottom:2}}>Cảnh báo hoàn thành đột ngột</div><div style={{fontSize:12}}>Tiến độ hiện tại {completionNoteModal.progress||0}% nhưng deadline hôm nay. Trưởng phòng sẽ được thông báo để kiểm tra.</div></div>
              </div>
            )}
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:12,color:"#374151",fontWeight:600,display:"block",marginBottom:6}}>Mô tả kết quả công việc <span style={{color:"#dc2626"}}>*</span></label>
                <textarea value={completionNote} onChange={e=>setCompletionNote(e.target.value)} placeholder="Mô tả những gì đã hoàn thành, kết quả đạt được... (ít nhất 20 ký tự)" rows={4} style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
                <div style={{fontSize:11,color:completionNote.length<20?"#dc2626":"#15803d",marginTop:4}}>{completionNote.length}/20 ký tự tối thiểu</div>
              </div>
              <div>
                <label style={{fontSize:12,color:"#374151",fontWeight:600,display:"block",marginBottom:6}}>📎 File minh chứng (không bắt buộc)</label>
                <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"1.5px dashed #d1d5db",borderRadius:8,cursor:"pointer",background:"#f9fafb",fontSize:13,color:"#6b7280"}}>
                  <span>🗂️</span><span>{uploadingFiles?"Đang upload...":"Chọn file… (chọn được nhiều file cùng lúc)"}</span>
                  <input type="file" multiple style={{display:"none"}} disabled={uploadingFiles} onChange={async e=>{const files=Array.from(e.target.files);if(!files.length)return;const up=await uploadFiles(files,completionFiles);setCompletionFiles(up);e.target.value="";}}/>
                </label>
                {completionFiles.length>0&&<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>{completionFiles.map((f,i)=>(<div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"#f1f5f9",borderRadius:6,fontSize:12}}><span>{getFileIcon(f.name)} {f.name}</span><button onClick={()=>setCompletionFiles(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14}}>✕</button></div>))}</div>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setCompletionNoteModal(null)} style={{flex:1,padding:10,border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,color:"#374151"}}>Hủy</button>
                <button onClick={()=>confirmCompletion(completionNoteModal)} disabled={completionNote.trim().length<20} style={{flex:2,padding:10,border:"none",borderRadius:8,background:completionNote.trim().length>=20?"#16a34a":"#d1d5db",color:"#fff",cursor:completionNote.trim().length>=20?"pointer":"not-allowed",fontSize:13,fontWeight:600}}>Gửi yêu cầu duyệt</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── DUYỆT HOÀN THÀNH & ĐÁNH GIÁ (TP/PP/BGĐ) ── */}
      {approveModal&&(
        <div onClick={()=>setApproveModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontWeight:700,fontSize:15}}>✅ Duyệt hoàn thành & đánh giá</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{approveModal.title}</div></div>
              <button onClick={()=>setApproveModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"10px 14px",background:"#f8fafc",borderRadius:8,fontSize:12,color:"#374151"}}>
                <div style={{marginBottom:4}}><b>{approveModal.requested_by}</b> yêu cầu lúc {approveModal.requested_at}</div>
                {approveModal.completion_note&&<div style={{fontStyle:"italic",color:"#6b7280"}}>"{approveModal.completion_note}"</div>}
              </div>
              <div>
                <div style={{fontSize:12,color:"#6b7280",marginBottom:8,fontWeight:500}}>Đánh giá kết quả <span style={{color:"#dc2626"}}>*</span></div>
                <div style={{display:"flex",gap:8}}>
                  {Object.entries(RATING).map(([key,r])=><button key={key} onClick={()=>setApproveRating(key)} style={{flex:1,padding:"8px 4px",border:"2px solid "+(approveRating===key?r.col:"#e5e7eb"),borderRadius:8,background:approveRating===key?r.bg:"#fff",cursor:"pointer",fontSize:12,fontWeight:approveRating===key?700:400,color:approveRating===key?r.col:"#6b7280",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:17}}>{r.icon}</span>{r.label}</button>)}
                </div>
              </div>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Nhận xét (không bắt buộc)</label>
                <input value={approveNote} onChange={e=>setApproveNote(e.target.value)} placeholder="Nhận xét về kết quả công việc..." style={inp}/>
              </div>
            </div>
            <div style={{padding:"0 20px 18px",display:"flex",gap:8}}>
              <button onClick={()=>setApproveModal(null)} style={{flex:1,padding:10,border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,color:"#374151"}}>Hủy</button>
              <button onClick={confirmApproveCompletion} disabled={!approveRating} style={{flex:2,padding:10,border:"none",borderRadius:8,background:approveRating?"#16a34a":"#d1d5db",color:"#fff",cursor:approveRating?"pointer":"not-allowed",fontSize:13,fontWeight:600}}>Xác nhận duyệt hoàn thành</button>
            </div>
          </div>
        </div>
      )}
      {/* ── ĐỔI MẬT KHẨU MODAL ── */}
      {showChangePwd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:380,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:16}}>🔑 Đổi mật khẩu</div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{currentUser.full_name}</div>
              </div>
              <button onClick={()=>setShowChangePwd(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#9ca3af",lineHeight:1}}>✕</button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:5,fontWeight:500}}>Mật khẩu hiện tại</label>
                <input type="password" value={changePwdForm.current} onChange={e=>setChangePwdForm(f=>({...f,current:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleChangePwd()} placeholder="Nhập mật khẩu hiện tại..." style={inp} autoFocus/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:5,fontWeight:500}}>Mật khẩu mới <span style={{color:"#9ca3af",fontWeight:400}}>(ít nhất 6 ký tự)</span></label>
                <input type="password" value={changePwdForm.next} onChange={e=>setChangePwdForm(f=>({...f,next:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleChangePwd()} placeholder="Nhập mật khẩu mới..." style={inp}/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:5,fontWeight:500}}>Xác nhận mật khẩu mới</label>
                <input type="password" value={changePwdForm.confirm} onChange={e=>setChangePwdForm(f=>({...f,confirm:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleChangePwd()} placeholder="Nhập lại mật khẩu mới..." style={inp}/>
              </div>
              {changePwdError&&(
                <div style={{background:"#fee2e2",color:"#b91c1c",padding:"10px 14px",borderRadius:8,fontSize:13,display:"flex",alignItems:"center",gap:8}}>
                  <span>⚠️</span>{changePwdError}
                </div>
              )}
              {/* Strength indicator */}
              {changePwdForm.next&&(
                <div>
                  <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Độ mạnh mật khẩu:</div>
                  <div style={{height:4,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:changePwdForm.next.length>=10?"100%":changePwdForm.next.length>=8?"66%":changePwdForm.next.length>=6?"33%":"10%",background:changePwdForm.next.length>=10?"#16a34a":changePwdForm.next.length>=8?"#f59e0b":"#dc2626",borderRadius:4,transition:"width 0.3s"}}/>
                  </div>
                  <div style={{fontSize:11,color:changePwdForm.next.length>=10?"#15803d":changePwdForm.next.length>=8?"#92400e":"#b91c1c",marginTop:3}}>{changePwdForm.next.length>=10?"Mạnh":changePwdForm.next.length>=8?"Trung bình":changePwdForm.next.length>=6?"Yếu":"Quá ngắn"}</div>
                </div>
              )}
            </div>
            <div style={{padding:"14px 20px",borderTop:"1px solid #e5e7eb",display:"flex",gap:10}}>
              <button onClick={()=>setShowChangePwd(false)} style={{flex:1,padding:"9px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,color:"#374151"}}>Hủy</button>
              <button onClick={handleChangePwd} style={{flex:2,padding:"9px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Xác nhận đổi mật khẩu</button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar day popup */}
      {calDay&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:420,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}><span style={{fontWeight:600,fontSize:15}}>📅 {calDay.day}/{calMonth+1}/{calYear}</span><button onClick={()=>setCalDay(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:16,display:"flex",flexDirection:"column",gap:8}}>{calDay.tasks.map(t=>(<div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setCalDay(null);}} style={{padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",borderLeft:"4px solid "+STATUS[t.status].dot}}><div style={{fontWeight:500,fontSize:13,marginBottom:4}}>{t.template_id&&"🔄 "}{t.title}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Chip s={t.status}/><PChip p={t.prio}/><span style={{fontSize:12,color:"#6b7280"}}>{getEmp(t.eid)?.name||"–"}</span>{t.rating&&<RatingBadge r={t.rating}/>}</div><div style={{marginTop:8}}><ProgressBar value={t.progress||0}/></div></div>))}</div></div></div>)}

      {/* Recurring modal */}
      {showRecurring&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}>
          <div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:600,maxHeight:isMobile?"95vh":"88vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
              <div><div style={{fontWeight:600,fontSize:15}}>🔄 Nhiệm vụ định kỳ</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Tự động tạo khi mở app đến ngày</div></div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}><button onClick={()=>setTemplateForm({data:emptyTemplate(employees||[],availableDepts[0]),editId:null})} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>+ Thêm mẫu</button><button onClick={()=>setShowRecurring(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div>
            </div>
            <div style={{padding:18}}>
              {templateForm&&(
                <div style={{background:"#f8fafc",borderRadius:10,border:"1px solid #e5e7eb",padding:16,marginBottom:16}}>
                  <div style={{fontWeight:500,fontSize:13,marginBottom:12}}>{templateForm.editId?"Chỉnh sửa mẫu":"Tạo mẫu mới"}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Tiêu đề *</label><input value={templateForm.data.title} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,title:e.target.value}}))} placeholder="vd: Báo cáo tuần HCTH" style={inp}/></div>
                    <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Mô tả</label><input value={templateForm.data.description||""} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,description:e.target.value}}))} placeholder="Mô tả nội dung..." style={inp}/></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Phòng ban</label>{canSeeAll?<select value={templateForm.data.dept} onChange={e=>{const f=(employees||[]).find(emp=>emp.dept===e.target.value);setTemplateForm(tf=>({...tf,data:{...tf.data,dept:e.target.value,eid:f?.id||""}}));}} style={inp}>{DEPTS.map(d=><option key={d} value={d}>{d}</option>)}</select>:<div style={{...inp,background:"#f9fafb"}}>{templateForm.data.dept}</div>}</div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Giao cho *</label><select value={templateForm.data.eid} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,eid:e.target.value}}))} style={inp}>{(employees||[]).filter(e=>e.dept===templateForm.data.dept).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Tần suất</label><select value={templateForm.data.frequency} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,frequency:e.target.value}}))} style={inp}>{FREQUENCIES.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Deadline (ngày sau khi tạo)</label><input type="number" min={1} max={90} value={templateForm.data.deadline_days} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,deadline_days:Number(e.target.value)}}))} style={inp}/></div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Ưu tiên</label><select value={templateForm.data.prio} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,prio:e.target.value}}))} style={inp}><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Tạo đầu tiên vào ngày</label><input type="date" value={templateForm.data.next_date} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,next_date:e.target.value}}))} style={inp}/></div>
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button onClick={()=>setTemplateForm(null)} style={{padding:"6px 14px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:12}}>Hủy</button><button onClick={submitTemplate} disabled={saving} style={{padding:"6px 14px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12}}>{saving?"Đang lưu…":templateForm.editId?"Cập nhật":"Tạo mẫu"}</button></div>
                  </div>
                </div>
              )}
              {recurringTemplates.length===0?(<div style={{textAlign:"center",padding:32,color:"#9ca3af"}}><div style={{fontSize:40,marginBottom:8}}>🔄</div><div style={{fontSize:14}}>Chưa có mẫu định kỳ nào</div></div>):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>{recurringTemplates.map(tpl=>{const daysUntil=Math.ceil((new Date(tpl.next_date)-today)/86400000);const isDue=tpl.next_date<=todayStr;return(
                  <div key={tpl.id} style={{border:"1px solid "+(tpl.active?"#e5e7eb":"#f3f4f6"),borderRadius:10,padding:14,background:tpl.active?"#fff":"#f9fafb",opacity:tpl.active?1:0.65}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                      <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,display:"flex",alignItems:"center",gap:6}}>{tpl.title}{tpl.active?<span style={{background:"#dcfce7",color:"#15803d",fontSize:10,padding:"1px 6px",borderRadius:8}}>Hoạt động</span>:<span style={{background:"#f1f5f9",color:"#6b7280",fontSize:10,padding:"1px 6px",borderRadius:8}}>Tạm dừng</span>}</div>{tpl.description&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{tpl.description}</div>}</div>
                      <div style={{display:"flex",gap:4,flexShrink:0}}><button onClick={()=>toggleTemplate(tpl.id,!tpl.active)} style={{padding:"3px 8px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:11,color:tpl.active?"#b91c1c":"#15803d"}}>{tpl.active?"⏸":"▶"}</button><button onClick={()=>setTemplateForm({data:{title:tpl.title,description:tpl.description||"",dept:tpl.dept,eid:tpl.eid,prio:tpl.prio,frequency:tpl.frequency,deadline_days:tpl.deadline_days,active:tpl.active,next_date:tpl.next_date,collab_eids:tpl.collab_eids||"[]",collab_note:tpl.collab_note||""},editId:tpl.id})} style={{padding:"3px 8px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:11}}>✏️</button><button onClick={()=>deleteTemplate(tpl.id)} style={{padding:"3px 8px",border:"1px solid #fca5a5",borderRadius:5,background:"#fff0f0",cursor:"pointer",fontSize:11,color:"#dc2626"}}>🗑️</button></div>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,fontSize:12}}><span style={{background:DEPT_COLOR[tpl.dept]+"22",color:DEPT_COLOR[tpl.dept],padding:"2px 8px",borderRadius:8}}>{tpl.dept}</span><span style={{background:"#f1f5f9",color:"#475569",padding:"2px 8px",borderRadius:8}}>{getEmp(tpl.eid)?.name||"–"}</span><span style={{background:"#e0e7ff",color:"#4338ca",padding:"2px 8px",borderRadius:8}}>{FREQUENCIES.find(f=>f.value===tpl.frequency)?.label}</span><span style={{background:"#fef9c3",color:"#92400e",padding:"2px 8px",borderRadius:8}}>Deadline: {tpl.deadline_days} ngày</span><span style={{background:isDue?"#fee2e2":"#f0fdf4",color:isDue?"#b91c1c":"#15803d",padding:"2px 8px",borderRadius:8,fontWeight:500}}>{isDue?"⚡ Đến hạn tạo":`📅 ${tpl.next_date} (${daysUntil} ngày nữa)`}</span>{tpl.last_created&&<span style={{color:"#9ca3af",padding:"2px 4px"}}>Lần cuối: {tpl.last_created}</span>}</div>
                  </div>
                );})}
              </div>)}
            </div>
          </div>
        </div>
      )}

      {/* Task form */}
      {taskForm&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}><span style={{fontWeight:600,fontSize:15}}>{taskForm.editId?"Chỉnh sửa":"Tạo nhiệm vụ mới"}{pendingDocLink&&<span style={{marginLeft:8,fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:8,fontWeight:500}}>🔗 Từ văn bản</span>}</span><button onClick={()=>setTaskForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tiêu đề *</label><input value={taskForm.data.title} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,title:e.target.value}}))} placeholder="Nhập tiêu đề..." style={inp}/></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Mô tả</label><textarea value={taskForm.data.description} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,description:e.target.value}}))} rows={2} style={{...inp,resize:"vertical"}}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label>{canAssignAllDepts?<select value={taskForm.data.dept} onChange={e=>changeTaskDept(e.target.value)} style={inp}>{DEPTS.map(d=><option key={d} value={d}>{d}</option>)}</select>:<div style={{...inp,background:"#f9fafb"}}>{taskForm.data.dept}</div>}</div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Giao cho</label><select value={taskForm.data.eid} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,eid:e.target.value}}))} style={inp}>{(employees||[]).filter(e=>e.dept===taskForm.data.dept).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ưu tiên</label><select value={taskForm.data.prio} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,prio:e.target.value}}))} style={inp}><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Hạn chót *</label><input type="date" value={taskForm.data.deadline} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,deadline:e.target.value}}))} style={inp}/></div></div><ProgressBar value={taskForm.data.progress||0} editable onChange={v=>setTaskForm(f=>({...f,data:{...f.data,progress:v}}))}/><div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}><div style={{padding:"10px 14px",background:"#f8fafc",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6}}><span>👥</span><span style={{fontWeight:500,fontSize:13}}>Phối hợp</span>{parseJSON(taskForm.data.collab_eids,[]).length>0&&<span style={{background:"#dcfce7",color:"#15803d",fontSize:11,padding:"1px 8px",borderRadius:10}}>{parseJSON(taskForm.data.collab_eids,[]).length}</span>}</div><div style={{padding:12}}>{(canAssignAllDepts?DEPTS:[userDept].filter(Boolean)).map(dept=>(<div key={dept} style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:DEPT_COLOR[dept],marginBottom:6}}>{dept}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{deptEmps(dept).map(emp=>{const sel=parseJSON(taskForm.data.collab_eids,[]).includes(emp.id);const isAss=taskForm.data.eid===emp.id;return(<button key={emp.id} disabled={isAss} onClick={()=>toggleCollab(emp.id)} style={{padding:"4px 10px",border:"1.5px solid "+(sel?DEPT_COLOR[dept]:"#e5e7eb"),borderRadius:20,background:sel?DEPT_COLOR[dept]+"18":"#fff",color:sel?DEPT_COLOR[dept]:"#6b7280",cursor:isAss?"default":"pointer",fontSize:12,fontWeight:sel?600:400,opacity:isAss?0.4:1}}>{sel&&"✓ "}{emp.name}{isAss&&" (chính)"}</button>);})}</div></div>))}{parseJSON(taskForm.data.collab_eids,[]).length>0&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #e5e7eb"}}><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú</label><input value={taskForm.data.collab_note||""} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,collab_note:e.target.value}}))} placeholder="Nội dung phối hợp..." style={inp}/></div>}</div></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>📎 Đính kèm file</label><label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"1.5px dashed #d1d5db",borderRadius:8,cursor:"pointer",background:"#f9fafb",fontSize:13,color:"#6b7280"}}><span>🗂️</span><span>{uploadingFiles?"Đang upload...":"Chọn file…"}</span><input type="file" multiple style={{display:"none"}} disabled={uploadingFiles} onChange={async e=>{const files=Array.from(e.target.files);if(!files.length)return;const ex=parseJSON(taskForm.data.attachments,[]);const up=await uploadFiles(files,ex);setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(up)}}));e.target.value="";}}/>
              </label>{parseJSON(taskForm.data.attachments,[]).length>0&&<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>{parseJSON(taskForm.data.attachments,[]).map((att,i)=>(<div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"#f1f5f9",borderRadius:6,fontSize:12}}><span>{att.url&&att.url.startsWith("http")&&!att.url.includes("supabase")?"🔗":getFileIcon(att.name)} {att.name}</span><button onClick={()=>{const a=parseJSON(taskForm.data.attachments,[]);a.splice(i,1);setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(a)}}));}} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14}}>✕</button></div>))}</div>}
              <div style={{marginTop:10,padding:"10px 12px",background:"#f8fafc",border:"1px solid #e5e7eb",borderRadius:8}}><div style={{fontSize:12,color:"#6b7280",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>🔗 Hoặc dán link tài liệu (iDesk, Drive…)</div><div style={{display:"flex",gap:6,flexDirection:isMobile?"column":"row"}}><input value={linkInput.name} onChange={e=>setLinkInput(p=>({...p,name:e.target.value}))} placeholder="Tên tài liệu" style={{...inp,flex:1}}/><input value={linkInput.url} onChange={e=>setLinkInput(p=>({...p,url:e.target.value}))} placeholder="https://idesk..." style={{...inp,flex:2}}/><button onClick={()=>{if(!linkInput.url.trim())return;const url=linkInput.url.trim();const name=linkInput.name.trim()||url.split("/").pop()||"Tài liệu";const a=parseJSON(taskForm.data.attachments,[]);a.push({name,url});setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(a)}}));setLinkInput({name:"",url:""});}} style={{padding:"8px 14px",background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,flexShrink:0}}>+ Thêm link</button></div></div></div></div><div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}><button onClick={()=>{setTaskForm(null);setPendingDocLink(null);}} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={submitTask} disabled={saving||uploadingFiles} style={{padding:"7px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>{saving?"Đang lưu…":taskForm.editId?"Cập nhật":"Tạo nhiệm vụ"}</button></div></div></div>)}

      {/* Employee form */}
      {empForm&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:380,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>{empForm.editId?"Chỉnh sửa":"Thêm nhân viên"}</span><button onClick={()=>setEmpForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Họ và tên *</label><input value={empForm.data.name} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,name:e.target.value}}))} placeholder="Nguyễn Văn A..." style={inp}/></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label><select value={empForm.data.dept} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,dept:e.target.value}}))} style={inp}>{DEPTS.map(d=><option key={d} value={d}>Phòng {d}</option>)}</select></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Chức vụ</label><select value={empForm.data.role} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,role:e.target.value}}))} style={inp}>{ROLES_EMP.map(r=><option key={r} value={r}>{r}</option>)}</select></div></div><div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setEmpForm(null)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={submitEmp} disabled={saving} style={{padding:"7px 16px",background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>{empForm.editId?"Cập nhật":"Thêm"}</button></div></div></div>)}

      {/* Task detail */}
      <TaskModal
        modal={modal} setModal={setModal}
        isMobile={isMobile} inp={inp}
        currentUser={currentUser}
        getEmp={getEmp}
        canEditTask={canEditTask} canDeleteTask={canDeleteTask} canRate={canRate} canForward={canForward} canSetLateReason={canSetLateReason} canUpdateProgress={canUpdateProgress}
        canCreate={canCreate}
        comments={comments} commentText={commentText} setCommentText={setCommentText} commentFiles={commentFiles} setCommentFiles={setCommentFiles} commentLoading={commentLoading}
        addComment={addComment} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles}
        updateTask={updateTask}
        toggleDone={toggleDone}
        openApproveModal={openApproveModal} rejectCompletionRequest={rejectCompletionRequest}
        rateTask={rateTask} ratingNote={ratingNote} setRatingNote={setRatingNote}
        setLateReasonFn={setLateReasonFn} lateNote={lateNote} setLateNote={setLateNote}
        openEditTask={openEditTask}
        setDeleteConfirm={setDeleteConfirm}
        setForwardModal={setForwardModal} setForwardEid={setForwardEid}
        loadComments={loadComments}
      />
      {/* User modal */}
      {userModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:560,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}><span style={{fontWeight:600,fontSize:15}}>🔐 Quản lý tài khoản</span><button onClick={()=>setUserModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:18}}><div style={{background:"#f8fafc",borderRadius:10,padding:14,marginBottom:16}}><div style={{fontWeight:500,fontSize:13,marginBottom:10}}>{userEditId?"Chỉnh sửa":"Thêm tài khoản"}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Họ tên *</label><input value={userForm.full_name} onChange={e=>setUserForm(f=>({...f,full_name:e.target.value}))} placeholder="Nguyễn Văn A" style={inp}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Tên đăng nhập *</label><input value={userForm.username} onChange={e=>setUserForm(f=>({...f,username:e.target.value}))} placeholder="nguyenvana" style={inp}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Mật khẩu {userEditId?"(để trống nếu không đổi)":"*"}</label><input value={userForm.password} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))} placeholder={userEditId?"Giữ nguyên...":"••••••"} style={inp}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Vai trò</label><select value={userForm.role} onChange={e=>setUserForm(f=>({...f,role:e.target.value}))} style={inp}><option value="admin">Quản trị viên</option><option value="director">Ban Giám đốc</option><option value="manager_hcth">TP. HCTH</option><option value="manager">Trưởng phòng</option><option value="deputy_manager">Phó trưởng phòng</option><option value="staff">Nhân viên</option></select></div><div style={{gridColumn:"span 2"}}><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Liên kết nhân viên</label><select value={userForm.employee_id} onChange={e=>setUserForm(f=>({...f,employee_id:e.target.value}))} style={inp}><option value="">-- Không liên kết --</option>{(employees||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept} - {e.role})</option>)}</select></div></div><div style={{display:"flex",gap:8,marginTop:10,justifyContent:"flex-end"}}>{userEditId&&<button onClick={()=>{setUserEditId(null);setUserForm({username:"",password:"",full_name:"",role:"staff",employee_id:""});}} style={{padding:"6px 14px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:12}}>Hủy</button>}<button onClick={submitUser} disabled={saving} style={{padding:"6px 14px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12}}>{userEditId?"Cập nhật":"Thêm"}</button></div></div><div style={{display:"flex",flexDirection:"column",gap:6}}>{users.map(u=>(<div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:8}}><div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontWeight:500,fontSize:13}}>{u.full_name}</span><RoleBadge role={u.role}/></div><div style={{fontSize:12,color:"#9ca3af"}}>@{u.username}{u.employee_id&&` · ${getEmp(u.employee_id)?.name||""}`}</div></div><div style={{display:"flex",gap:6}}><button onClick={()=>resetUserPwd(u)} title="Đặt lại mật khẩu về abc123" style={{padding:"4px 10px",border:"1px solid #fde68a",borderRadius:6,background:"#fffbeb",cursor:"pointer",fontSize:12,color:"#92400e"}}>🔑</button><button onClick={()=>{setUserEditId(u.id);setUserForm({username:u.username,password:"",full_name:u.full_name,role:u.role,employee_id:u.employee_id||""});}} style={{padding:"4px 10px",border:"1px solid #d1d5db",borderRadius:6,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️</button>{u.id!=="admin001"&&<button onClick={()=>deleteUser(u.id)} style={{padding:"4px 10px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>}</div></div>))}</div></div></div></div>)}

      {/* Export */}
      {exModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:380,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>📤 Xuất báo cáo</span><button onClick={()=>setExModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Trạng thái</label><select value={exStatus} onChange={e=>setExStatus(e.target.value)} style={inp}><option value="all">Tất cả</option><option value="on_time">Trong hạn</option><option value="nearly_due">Sắp hết hạn</option><option value="overdue">Quá hạn</option><option value="pending_approval">Chờ duyệt</option><option value="completed_late">HT quá hạn</option><option value="completed">Hoàn thành</option></select></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label><select value={exDept} onChange={e=>setExDept(e.target.value)} style={inp}><option value="all">Tất cả</option>{DEPTS.map(d=><option key={d} value={d}>Phòng {d}</option>)}</select></div><div style={{background:"#f9fafb",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#6b7280"}}>Sẽ xuất <strong style={{color:"#111"}}>{computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept)).length}</strong> nhiệm vụ</div></div><div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setExModal(false)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={exportPDF} style={{padding:"7px 16px",background:"#dc2626",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>📄 PDF</button><button onClick={exportCSV} style={{padding:"7px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>⬇️ CSV</button></div></div></div>)}
      {/* Chuyển tiếp nhiệm vụ */}
      {forwardModal&&(<div onClick={()=>setForwardModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:110,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>↪ Chuyển tiếp nhiệm vụ</span><button onClick={()=>setForwardModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div><div style={{padding:18}}><div style={{fontSize:13,color:"#374151",marginBottom:6,fontWeight:500}}>{forwardModal.title}</div><div style={{fontSize:12,color:"#6b7280",marginBottom:16,padding:"8px 12px",background:"#eff6ff",borderRadius:8,lineHeight:1.5}}>Bạn sẽ trở thành <b>người phụ trách</b>, nhân viên được chọn là <b>người thực hiện</b>. Nhiệm vụ không bị nhân đôi.</div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>Chọn nhân viên thực hiện *</label><select value={forwardEid} onChange={e=>setForwardEid(e.target.value)} style={inp}><option value="">— Chọn nhân viên —</option>{(employees||[]).filter(e=>e.dept===forwardModal.dept&&e.id!==forwardModal.eid).map(e=><option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}</select></div><div style={{padding:"0 18px 18px",display:"flex",gap:10}}><button onClick={()=>setForwardModal(null)} style={{flex:1,padding:"10px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:14}}>Hủy</button><button onClick={forwardTask} disabled={!forwardEid||saving} style={{flex:1,padding:"10px",border:"none",borderRadius:8,background:!forwardEid||saving?"#cbd5e1":"#2563eb",color:"#fff",cursor:!forwardEid||saving?"not-allowed":"pointer",fontSize:14,fontWeight:600}}>{saving?"Đang chuyển…":"Chuyển tiếp"}</button></div></div></div>)}
      {/* Thùng rác */}
      {showTrash&&(<div onClick={()=>setShowTrash(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,maxHeight:"85vh",boxShadow:"0 12px 40px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column",overflow:"hidden"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>🗑️ Thùng rác ({trashedTasks.length})</span><button onClick={()=>setShowTrash(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div><div style={{overflowY:"auto",padding:"8px 0"}}>{trashedTasks.length===0?<div style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>Thùng rác trống</div>:trashedTasks.map(t=>(<div key={t.id} style={{padding:"10px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,whiteSpace:"normal",wordBreak:"break-word"}}>{t.title}</div><div style={{fontSize:11,color:"#6b7280",marginTop:1}}>{t.dept} · {getEmp(t.eid)?.name||"–"} · Hạn: {t.deadline}</div></div><div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={()=>restoreTaskFn(t.id)} style={{padding:"5px 10px",border:"1px solid #86efac",borderRadius:6,background:"#f0fdf4",cursor:"pointer",fontSize:12,color:"#15803d"}}>↩ Khôi phục</button><button onClick={()=>{if(window.confirm("Xóa vĩnh viễn nhiệm vụ này? Không thể hoàn tác."))purgeTaskFn(t.id);}} style={{padding:"5px 10px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>Xóa hẳn</button></div></div>))}</div></div></div>)}
      {/* Nhắc đánh giá trước khi giao việc mới */}
      {rateReminderModal&&(<div onClick={()=>setRateReminderModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:110,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        <div style={{padding:"24px 20px 12px",textAlign:"center"}}><div style={{fontSize:44,marginBottom:8}}>⭐</div><div style={{fontWeight:700,fontSize:17,marginBottom:6,color:"#92400e"}}>Cần đánh giá trước khi giao việc mới</div><div style={{fontSize:13,color:"#6b7280",lineHeight:1.5}}>Bạn còn <b style={{color:"#dc2626"}}>{unratedTasks.length} nhiệm vụ</b> đã hoàn thành nhưng chưa đánh giá. Vui lòng đánh giá hết trước khi giao việc mới.</div></div>
        <div style={{padding:"0 16px",maxHeight:240,overflowY:"auto"}}>{unratedTasks.map(t=><div key={t.id} onClick={()=>{setRateReminderModal(false);setModal(t);loadComments(t.id);}} style={{padding:"10px 12px",borderRadius:8,background:"#fffbeb",border:"1px solid #fde68a",marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}} onMouseEnter={e=>e.currentTarget.style.background="#fef3c7"} onMouseLeave={e=>e.currentTarget.style.background="#fffbeb"}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,whiteSpace:"normal",wordBreak:"break-word"}}>{t.title}</div><div style={{fontSize:11,color:"#92400e"}}>{getEmp(t.eid)?.name||"–"} · {t.dept}</div></div><span style={{fontSize:11,color:"#b45309",flexShrink:0,fontWeight:600}}>⭐ Đánh giá →</span></div>)}</div>
        <div style={{padding:"12px 20px 18px"}}><button onClick={()=>setRateReminderModal(false)} style={{width:"100%",padding:"10px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:14,fontWeight:500}}>Đóng</button></div>
      </div></div>)}
      {/* Delete confirm modal */}
      {deleteConfirm&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}><div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:360,boxShadow:"0 12px 40px rgba(0,0,0,0.2)",overflow:"hidden"}}><div style={{padding:"24px 20px 0",textAlign:"center"}}><div style={{fontSize:44,marginBottom:8}}>🗑️</div><div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Xóa nhiệm vụ?</div><div style={{fontSize:13,color:"#6b7280",marginBottom:20,lineHeight:1.5}}>Nhiệm vụ sẽ được chuyển vào Thùng rác.<br/>Bạn có thể khôi phục lại sau nếu cần.</div></div><div style={{padding:"0 20px 20px",display:"flex",gap:10}}><button onClick={()=>setDeleteConfirm(null)} style={{flex:1,padding:"10px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:14,fontWeight:500}}>Hủy</button><button onClick={()=>{deleteTaskFn(deleteConfirm);setDeleteConfirm(null);}} style={{flex:1,padding:"10px",border:"none",borderRadius:8,background:"#dc2626",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>Xóa</button></div></div></div>)}
    </div>
    </div>
    {/* MOBILE BOTTOM NAV — ngoài div zoom để position:fixed không bị scale */}
    {isMobile&&(
      <div className="qlcv-bottomnav" style={{position:"fixed",bottom:0,left:0,right:0,background:"#1e1b4b",display:"flex",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",borderTop:"1px solid rgba(255,255,255,0.1)",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        <style>{`.qlcv-bottomnav::-webkit-scrollbar{display:none}`}</style>
        {navItems.map(n=><button key={n.id} onClick={()=>{setView(n.id);if(n.id==="security")loadLoginHistory();}} style={{flex:"0 0 auto",minWidth:60,padding:"10px 8px",background:"transparent",border:"none",cursor:"pointer",color:view===n.id?"#c7d2fe":"#64748b",display:"flex",flexDirection:"column",alignItems:"center",gap:2,whiteSpace:"nowrap"}}><span style={{fontSize:18}}>{n.icon}</span><span style={{fontSize:9}}>{n.label}</span></button>)}
        {canCreate&&<button onClick={()=>setShowRecurring(true)} style={{flex:"0 0 auto",minWidth:60,padding:"10px 8px",background:"transparent",border:"none",cursor:"pointer",color:"#64748b",display:"flex",flexDirection:"column",alignItems:"center",gap:2,whiteSpace:"nowrap"}}><span style={{fontSize:18}}>🔄</span><span style={{fontSize:9}}>Định kỳ</span></button>}
        {isAdmin&&<button onClick={()=>setUserModal(true)} style={{flex:"0 0 auto",minWidth:60,padding:"10px 8px",background:"transparent",border:"none",cursor:"pointer",color:"#64748b",display:"flex",flexDirection:"column",alignItems:"center",gap:2,whiteSpace:"nowrap"}}><span style={{fontSize:18}}>🔐</span><span style={{fontSize:9}}>TK</span></button>}
      </div>
    )}
  </>);
}
