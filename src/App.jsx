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
const SupportCases = lazy(()=>import("./SupportCases"));
const MyQueue = lazy(()=>import("./MyQueue"));
const Chat = lazy(()=>import("./Chat"));
import { DEPTS, DEPT_COLOR, ROLES_EMP, VI_MONTHS, VI_DAYS, ROLE_LABELS, ROLE_COLORS, FULL_ACCESS, CAN_CREATE, RATING, LATE_REASONS, OVERLOAD_DEFAULT, FREQUENCIES, STATUS, PRIO, STATUS_ORDER, LATE_COMPLETION_PENALTY } from "./constants";
import { addDays, today, todayStr, nowStr, parseNowStr, getNextDate, freqWeight, isCompletedLateByDate, getStatus, isCompletedStatus, isLateStatus, parseJSON, hashPwd, getFileIcon, sanitizeFileName, fmtDate, pendingApprovalDays } from "./helpers";
import { ProgressBar, RoleBadge, RatingBadge, Chip, PChip } from "./components/ui";
import ErrorBoundary from "./components/ErrorBoundary";
import useTasks from "./hooks/useTasks";
import useAuth from "./hooks/useAuth";
import useEmployees from "./hooks/useEmployees";
import useUsers from "./hooks/useUsers";
import useReports, { MANAGER_EMP_ROLES } from "./hooks/useReports";
const Dashboard = lazy(()=>import("./components/Dashboard"));
import TaskList from "./components/TaskList";
const Reports = lazy(()=>import("./components/Reports"));
import Employees from "./components/Employees";
import TaskModal from "./components/TaskModal";
const ActivityLog = lazy(()=>import("./components/ActivityLog"));
const AssistantChat = lazy(()=>import("./components/AssistantChat"));
const ChatLearningAdmin = lazy(()=>import("./ChatLearningAdmin"));


const DEFAULT_EMPLOYEES = [
  {id:"e1",name:"Nguyễn Thị Hoa",dept:"HCTH",role:"Trưởng phòng"},{id:"e2",name:"Trần Văn An",dept:"HCTH",role:"Chuyên viên"},{id:"e3",name:"Lê Thị Mai",dept:"HCTH",role:"Chuyên viên"},{id:"e4",name:"Phạm Văn Bình",dept:"HCTH",role:"Chuyên viên"},{id:"e5",name:"Hoàng Thị Lan",dept:"HCTH",role:"Chuyên viên"},{id:"e6",name:"Đỗ Văn Cường",dept:"HCTH",role:"Nhân viên"},{id:"e7",name:"Vũ Thị Thu",dept:"HCTH",role:"Nhân viên"},{id:"e8",name:"Ngô Văn Đức",dept:"HCTH",role:"Nhân viên"},{id:"e9",name:"Bùi Thị Hạnh",dept:"HCTH",role:"Nhân viên"},{id:"e10",name:"Đinh Văn Hùng",dept:"HCTH",role:"Nhân viên"},{id:"e11",name:"Lý Thị Hương",dept:"HCTH",role:"Nhân viên"},{id:"e12",name:"Trịnh Văn Khoa",dept:"HCTH",role:"Nhân viên"},{id:"e13",name:"Phan Thị Linh",dept:"HCTH",role:"Nhân viên"},
  {id:"e14",name:"Nguyễn Văn Minh",dept:"QL-KTDL",role:"Trưởng phòng"},{id:"e15",name:"Trần Thị Nga",dept:"QL-KTDL",role:"Phó trưởng phòng"},{id:"e16",name:"Lê Văn Nam",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e17",name:"Phạm Thị Oanh",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e18",name:"Hoàng Văn Phong",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e19",name:"Đỗ Thị Quỳnh",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e20",name:"Vũ Văn Sơn",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e21",name:"Ngô Thị Tâm",dept:"QL-KTDL",role:"Nhân viên"},{id:"e22",name:"Bùi Văn Thắng",dept:"QL-KTDL",role:"Nhân viên"},{id:"e23",name:"Đinh Thị Thủy",dept:"QL-KTDL",role:"Nhân viên"},{id:"e24",name:"Lý Văn Tiến",dept:"QL-KTDL",role:"Nhân viên"},{id:"e25",name:"Trịnh Thị Trang",dept:"QL-KTDL",role:"Nhân viên"},{id:"e26",name:"Phan Văn Trung",dept:"QL-KTDL",role:"Nhân viên"},{id:"e27",name:"Cao Thị Tuyết",dept:"QL-KTDL",role:"Nhân viên"},
  {id:"e28",name:"Nguyễn Thị Út",dept:"HT-NTS",role:"Trưởng phòng"},{id:"e29",name:"Trần Văn Việt",dept:"HT-NTS",role:"Phó trưởng phòng"},{id:"e30",name:"Lê Thị Xuân",dept:"HT-NTS",role:"Chuyên viên"},{id:"e31",name:"Phạm Văn Yên",dept:"HT-NTS",role:"Chuyên viên"},{id:"e32",name:"Hoàng Thị Yến",dept:"HT-NTS",role:"Chuyên viên"},{id:"e33",name:"Đỗ Văn Dũng",dept:"HT-NTS",role:"Chuyên viên"},{id:"e34",name:"Vũ Thị Diệu",dept:"HT-NTS",role:"Chuyên viên"},{id:"e35",name:"Ngô Văn Hiếu",dept:"HT-NTS",role:"Nhân viên"},{id:"e36",name:"Bùi Thị Hiền",dept:"HT-NTS",role:"Nhân viên"},{id:"e37",name:"Đinh Văn Lộc",dept:"HT-NTS",role:"Nhân viên"},{id:"e38",name:"Lý Thị Lụa",dept:"HT-NTS",role:"Nhân viên"},{id:"e39",name:"Trịnh Văn Mạnh",dept:"HT-NTS",role:"Nhân viên"},{id:"e40",name:"Phan Thị Nhung",dept:"HT-NTS",role:"Nhân viên"},
];

const emptyTemplate=(emps,dept)=>{const d=dept||DEPTS[0];const f=emps.find(e=>e.dept===d);return{title:"",description:"",dept:d,eid:f?.id||"",prio:"medium",frequency:"monthly",deadline_days:7,active:true,next_date:todayStr,collab_eids:"[]",collab_note:""};};


export default function App() {
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  const [view,setView]=useState("dashboard");
  const [showQuickStart,setShowQuickStart]=useState(false); // hướng dẫn nhanh lần đầu đăng nhập
  const [pendingProfileId,setPendingProfileId]=useState(null); // mở Hồ sơ nhân viên từ trợ lý chat
  const [tasks,setTasks]=useState(null); const [employees,setEmployees]=useState(null);
  const [otherTasks,setOtherTasks]=useState([]);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  const [modal,setModal]=useState(null); const [taskForm,setTaskForm]=useState(null);
  const [showTrash,setShowTrash]=useState(false);
  const [exModal,setExModal]=useState(false); const [exStatus,setExStatus]=useState("all"); const [exDept,setExDept]=useState("all");
  const [toast,setToast]=useState(null); const [uploadingFiles,setUploadingFiles]=useState(false);
  const [comments,setComments]=useState({}); const [commentText,setCommentText]=useState(""); const [commentLoading,setCommentLoading]=useState(false); const [commentFiles,setCommentFiles]=useState([]);
  const [users,setUsers]=useState([]);
  const [calYear,setCalYear]=useState(today.getFullYear()); const [calMonth,setCalMonth]=useState(today.getMonth()); const [calDay,setCalDay]=useState(null);
  const [calEmpFilter,setCalEmpFilter]=useState("all"); // lọc lịch deadline theo 1 nhân viên, để cân tải trước khi giao thêm việc
  const [overloadThreshold,setOverloadThreshold]=useState(()=>parseInt(localStorage.getItem("qlcv_overload")||"5"));
  // Chỉ tiêu (KPI) tỷ lệ hoàn thành của phòng — tô màu Đạt/Chưa đạt trong báo cáo điều hành. BGĐ đặt.
  // Lưu DÙNG CHUNG toàn cơ quan ở app_config (key="kpi_ontime"); localStorage chỉ là cache hiển thị nhanh khi mở.
  const [kpiOnTime,setKpiOnTime]=useState(()=>parseInt(localStorage.getItem("qlcv_kpi_ontime")||"85"));
  const saveKpiOnTime=async v=>{setKpiOnTime(v);localStorage.setItem("qlcv_kpi_ontime",v);try{const{data}=await supabase.from("app_config").select("key").eq("key","kpi_ontime");if(data&&data.length)await supabase.from("app_config").update({value:String(v)}).eq("key","kpi_ontime");else await supabase.from("app_config").insert({key:"kpi_ontime",value:String(v)});}catch(e){showToast("Đã lưu tạm trên máy này, nhưng chưa đồng bộ được lên hệ thống","error");}};
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
  const [recurringTemplates,setRecurringTemplates]=useState([]);
  const [projectsForScoring,setProjectsForScoring]=useState([]); // chỉ để tính điểm hiệu suất từ nhiệm vụ ngân sách đã nghiệm thu, không phải state đầy đủ của trang Investment
  const [supportCasesForScoring,setSupportCasesForScoring]=useState([]); // chỉ để tính điểm hiệu suất từ hỗ trợ người dùng, không phải state đầy đủ của trang Hỗ trợ ND
  const [docsForLog,setDocsForLog]=useState([]); // văn bản (rút gọn) chỉ để gộp vào Nhật ký toàn diện — chỉ nạp cho BGĐ/Admin
  const [holidays,setHolidays]=useState([]); // danh sách ngày lễ (app_config key="holidays") — để nhiệm vụ hàng ngày né ngày nghỉ lễ
  const [allComments,setAllComments]=useState([]); // bản nhẹ (task_id, user_name, created_at) toàn bộ bình luận, để tính "bình luận mới chưa đọc" không cần mở từng nhiệm vụ
  const [delegations,setDelegations]=useState([]); // ủy quyền duyệt: Trưởng phòng vắng mặt ủy quyền cho Phó phòng trong 1 khoảng ngày cụ thể
  const [monthlyScores,setMonthlyScores]=useState([]); // sổ điểm đã chốt theo tháng — snapshot cố định, không đổi khi dữ liệu sống bị sửa
  const [showRecurring,setShowRecurring]=useState(false); const [templateForm,setTemplateForm]=useState(null);
  const recurringChecked=useRef(false);
  const [loginNotifShown,setLoginNotifShown]=useState(false);

  const showToast=(msg,type="success")=>{setToast({msg,type});if(type!=="error")setTimeout(()=>setToast(null),3000);};

  // ── Đăng nhập/đăng xuất, đổi mật khẩu ──
  const {
    currentUser, setCurrentUser,
    loginForm, setLoginForm, loginError, loginLoading, handleLogin, handleLogout,
    showChangePwd, setShowChangePwd, changePwdForm, setChangePwdForm, changePwdError, setChangePwdError, handleChangePwd,
  } = useAuth({ showToast, onLogout: () => setLoginNotifShown(false) });

  // ── Tự động đăng xuất khi không thao tác lâu (bảo mật) ──
  const IDLE_LIMIT_MS=30*60*1000; // 30 phút không thao tác
  const IDLE_WARN_MS=2*60*1000;   // cảnh báo trước 2 phút
  const [idleWarning,setIdleWarning]=useState(false);
  const [idleSecondsLeft,setIdleSecondsLeft]=useState(0);
  const idleWarningRef=useRef(false);
  useEffect(()=>{idleWarningRef.current=idleWarning;},[idleWarning]);
  const idleTimers=useRef({warn:null,logout:null,tick:null});
  const clearIdleTimers=()=>{if(idleTimers.current.warn)clearTimeout(idleTimers.current.warn);if(idleTimers.current.logout)clearTimeout(idleTimers.current.logout);if(idleTimers.current.tick)clearInterval(idleTimers.current.tick);idleTimers.current={warn:null,logout:null,tick:null};};
  const resetIdleTimer=()=>{
    if(!currentUser)return;
    clearIdleTimers();
    setIdleWarning(false);
    idleTimers.current.warn=setTimeout(()=>{
      setIdleWarning(true);
      let secs=Math.round(IDLE_WARN_MS/1000);
      setIdleSecondsLeft(secs);
      idleTimers.current.tick=setInterval(()=>{secs-=1;setIdleSecondsLeft(secs);},1000);
      idleTimers.current.logout=setTimeout(()=>{clearInterval(idleTimers.current.tick);setIdleWarning(false);handleLogout();showToast("Đã tự động đăng xuất do không thao tác lâu","error");},IDLE_WARN_MS);
    },IDLE_LIMIT_MS-IDLE_WARN_MS);
  };
  useEffect(()=>{
    if(!currentUser){clearIdleTimers();setIdleWarning(false);return;}
    resetIdleTimer();
    const onActivity=()=>{if(!idleWarningRef.current)resetIdleTimer();};
    // "scroll" không nổi bọt (bubble) lên window khi cuộn trong 1 div con có overflow riêng
    // (khu vực nội dung chính) — phải bắt ở pha capture mới nhận được, nếu không việc "đang đọc" (chỉ cuộn,
    // không click/gõ phím) sẽ bị tính nhầm là không thao tác và tự đăng xuất.
    const events=["mousedown","keydown","touchstart","wheel"];
    events.forEach(e=>window.addEventListener(e,onActivity));
    window.addEventListener("scroll",onActivity,{capture:true,passive:true});
    return()=>{events.forEach(e=>window.removeEventListener(e,onActivity));window.removeEventListener("scroll",onActivity,{capture:true});clearIdleTimers();};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[currentUser]);

  // Hướng dẫn nhanh: hiện 1 lần cho mỗi tài khoản ở lần đăng nhập đầu (đánh dấu đã xem ở localStorage).
  useEffect(()=>{if(currentUser&&!localStorage.getItem(`qlcv_qs_${currentUser.username}_v1`))setShowQuickStart(true);},[currentUser]);
  const userDept=useMemo(()=>!currentUser||!employees?null:employees.find(e=>e.id===currentUser.employee_id)?.dept||null,[currentUser,employees]);
  const canSeeAll=useMemo(()=>FULL_ACCESS.includes(currentUser?.role),[currentUser]);
  const canAssignAllDepts=useMemo(()=>["admin","director"].includes(currentUser?.role),[currentUser]);
  const canCreate=useMemo(()=>CAN_CREATE.includes(currentUser?.role),[currentUser]);
  // Nhân viên (staff) được TỰ TẠO việc cá nhân của mình (chỉ giao cho chính mình, TP/PP duyệt & chấm điểm).
  const canSelfCreate=useMemo(()=>currentUser?.role==="staff"&&!!currentUser?.employee_id,[currentUser]);
  const isAdmin=currentUser?.role==="admin";
  const availableDepts=useMemo(()=>canAssignAllDepts?DEPTS:userDept?[userDept]:DEPTS,[canAssignAllDepts,userDept]);
  const getEmp=id=>(employees||[]).find(e=>e.id===id);

  // ── Bàn giao hàng loạt: khi nhân viên nghỉ phép dài/nghỉ việc, chuyển toàn bộ việc đang mở sang người khác 1 lần,
  // thay vì phải mở từng nhiệm vụ để chuyển tiếp — vẫn ghi lịch sử đầy đủ trên từng nhiệm vụ như chuyển tiếp thường.
  const [showBulkHandoff,setShowBulkHandoff]=useState(false);
  const [bulkFromEid,setBulkFromEid]=useState("");
  const [bulkToEid,setBulkToEid]=useState("");
  const [bulkSelectedIds,setBulkSelectedIds]=useState([]);
  const [bulkRunning,setBulkRunning]=useState(false);
  const openBulkHandoff=()=>{setShowBulkHandoff(true);setBulkFromEid("");setBulkToEid("");setBulkSelectedIds([]);};
  const bulkFromOpenTasks=useMemo(()=>bulkFromEid?tasks.filter(t=>!t.deleted&&!t.completed&&t.eid===bulkFromEid):[],[tasks,bulkFromEid]);
  const toggleBulkSelected=id=>setBulkSelectedIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const confirmBulkHandoff=async()=>{
    if(!bulkToEid||bulkSelectedIds.length===0)return;
    setBulkRunning(true);
    const newEmp=getEmp(bulkToEid);const oldEmp=getEmp(bulkFromEid);
    let ok=0;
    for(const id of bulkSelectedIds){
      const task=tasks.find(t=>t.id===id);if(!task)continue;
      const h=parseJSON(task.history,[]);
      h.push({action:`Bàn giao hàng loạt cho ${newEmp?.name||"?"} thực hiện (phụ trách: ${oldEmp?.name||"?"})`,by:currentUser.full_name,at:nowStr()});
      const collab=parseJSON(task.collab_eids,[]);if(task.eid&&!collab.includes(task.eid))collab.push(task.eid);const newCollab=collab.filter(x=>x!==bulkToEid);
      const updates={eid:bulkToEid,collab_eids:JSON.stringify(newCollab),forwarded_by:currentUser.full_name,history:JSON.stringify(h)};
      const{error}=await supabase.from("tasks").update(updates).eq("id",id);
      if(!error){setTasks(p=>p.map(t=>t.id===id?{...t,...updates}:t));ok++;}
    }
    setBulkRunning(false);
    showToast(ok===bulkSelectedIds.length?`Đã bàn giao ${ok} nhiệm vụ cho ${newEmp?.name}`:`Đã bàn giao ${ok}/${bulkSelectedIds.length} nhiệm vụ (một số bị lỗi)`,ok===bulkSelectedIds.length?"success":"error");
    setShowBulkHandoff(false);
  };

  // ── Ủy quyền duyệt: Trưởng phòng vắng mặt (nghỉ phép/công tác) ủy quyền cho Phó phòng duyệt thay
  // nhiệm vụ trong 1 khoảng ngày cụ thể, tự hết hiệu lực sau ngày kết thúc — xem isDelegatedApprover trong useTasks.js ──
  const [showDelegationModal,setShowDelegationModal]=useState(false);
  const isDelegationAdmin=["admin","director"].includes(currentUser?.role);
  const managerTierUsers=useMemo(()=>(users||[]).filter(u=>["manager","manager_hcth"].includes(u.role)),[users]);
  const [delegatorId,setDelegatorId]=useState("");
  const [delegateId,setDelegateId]=useState("");
  const [delegStart,setDelegStart]=useState(todayStr);
  const [delegEnd,setDelegEnd]=useState("");
  const openDelegationModal=()=>{setShowDelegationModal(true);setDelegatorId(isDelegationAdmin?"":currentUser.id);setDelegateId("");setDelegStart(todayStr);setDelegEnd("");};
  const delegatorDept=useMemo(()=>{const u=(users||[]).find(x=>x.id===delegatorId);return u?.employee_id?getEmp(u.employee_id)?.dept:null;},[delegatorId,users]);
  const deputyCandidates=useMemo(()=>(users||[]).filter(u=>u.role==="deputy_manager"&&u.id!==delegatorId&&(!delegatorDept||getEmp(u.employee_id)?.dept===delegatorDept)),[users,delegatorId,delegatorDept]);
  const myDelegations=useMemo(()=>isDelegationAdmin?delegations:delegations.filter(d=>d.delegator_id===currentUser?.id),[delegations,isDelegationAdmin,currentUser]);
  const createDelegation=async()=>{
    if(!delegatorId||!delegateId||!delegStart||!delegEnd){showToast("Vui lòng chọn đầy đủ thông tin","error");return;}
    if(delegEnd<delegStart){showToast("Ngày kết thúc phải sau ngày bắt đầu","error");return;}
    const d={id:`dg${Date.now()}`,delegator_id:delegatorId,delegate_id:delegateId,dept:delegatorDept||"",start_date:delegStart,end_date:delegEnd,revoked:false,created_by:currentUser.full_name,created_at:nowStr()};
    const{error}=await supabase.from("approval_delegations").insert(d);
    if(!error){setDelegations(p=>[d,...p]);showToast("Đã tạo ủy quyền duyệt");setDelegatorId(isDelegationAdmin?"":currentUser.id);setDelegateId("");setDelegStart(todayStr);setDelegEnd("");}
    else showToast("Lỗi: "+(error.message||""),"error");
  };
  const revokeDelegation=async id=>{
    const{error}=await supabase.from("approval_delegations").update({revoked:true}).eq("id",id);
    if(!error){setDelegations(p=>p.map(d=>d.id===id?{...d,revoked:true}:d));showToast("Đã thu hồi ủy quyền");}
    else showToast("Lỗi: "+(error.message||""),"error");
  };

  // ── Sao lưu dữ liệu (admin): tải toàn bộ các bảng về 1 file JSON — dùng khi cần lưu trữ định kỳ
  // hoặc trước khi thay đổi lớn. Bảng nào không đọc được (thiếu quyền/chưa tạo) ghi _error thay vì làm hỏng cả file.
  const [backingUp,setBackingUp]=useState(false);
  const backupData=async()=>{
    setBackingUp(true);
    const tables={employees:"*",tasks:"*",users:"id,username,full_name,role,employee_id",recurring_templates:"*",comments:"*",documents:"*",duty_schedule:"*",projects:"*",other_tasks:"*",support_cases:"*",feedback:"*",approval_delegations:"*",monthly_scores:"*",login_history:"*",app_config:"*"};
    const out={_meta:{app:"QLCV DAK LAK IOC",exported_at:new Date().toISOString(),by:currentUser.full_name}};
    for(const[t,cols]of Object.entries(tables)){
      try{const{data,error}=await supabase.from(t).select(cols);out[t]=error?{_error:error.message}:data;}catch(e){out[t]={_error:String(e)};}
    }
    const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download=`qlcv-backup-${todayStr}.json`;a.click();URL.revokeObjectURL(url);
    setBackingUp(false);showToast("Đã tải file sao lưu về máy — cất vào nơi lưu trữ an toàn");
  };

  // Nhiệm vụ ngân sách/Hỗ trợ ND ghi qua trang riêng (Investment/SupportCases) không tự cập nhật state điểm hiệu suất
  // ở đây — gọi hàm này sau khi lưu/xóa để Báo cáo phản ánh ngay, không cần tải lại trang.
  const refreshScoringData=async()=>{
    const[{data:pjd},{data:scd}]=await Promise.all([supabase.from("projects").select("id,name,lead_eid,steps,quality_rating,quality_rated_at,quality_on_time"),supabase.from("support_cases").select("id,eid,collab_eids,difficulty,created,content,category").eq("deleted",false)]);
    setProjectsForScoring(pjd||[]);setSupportCasesForScoring(scd||[]);
  };

  useEffect(()=>{
    if(!currentUser)return;
    (async()=>{
      setLoading(true);
      try{
        const[{data:ed},{data:td},{data:ud},{data:rtd},{data:otd},{data:pjd},{data:scd},{data:cmd},{data:dgd},{data:msd}]=await Promise.all([supabase.from("employees").select("*").order("dept"),supabase.from("tasks").select("*").order("created",{ascending:false}),supabase.from("users").select("id,username,full_name,role,employee_id"),supabase.from("recurring_templates").select("*").order("title"),supabase.from("other_tasks").select("*").order("created",{ascending:false}),supabase.from("projects").select("id,name,dept,lead_eid,steps,quality_rating,quality_rated_at,quality_on_time,deadline,ext_proposed,ext_reason,ext_requested_by,ext_requested_at"),supabase.from("support_cases").select("id,eid,collab_eids,difficulty,created,content,category").eq("deleted",false),supabase.from("comments").select("task_id,user_name,created_at"),supabase.from("approval_delegations").select("*").order("start_date",{ascending:false}),supabase.from("monthly_scores").select("*")]);
        if(!ed||ed.length===0){await supabase.from("employees").insert(DEFAULT_EMPLOYEES);setEmployees(DEFAULT_EMPLOYEES);}else setEmployees(ed);
        setTasks(td||[]);setUsers(ud||[]);setRecurringTemplates(rtd||[]);setOtherTasks(otd||[]);setProjectsForScoring(pjd||[]);setSupportCasesForScoring(scd||[]);setAllComments(cmd||[]);setDelegations(dgd||[]);setMonthlyScores(msd||[]);
        try{const{data:acd}=await supabase.from("app_config").select("key,value");const kpi=(acd||[]).find(r=>r.key==="kpi_ontime");if(kpi&&kpi.value!=null&&!isNaN(parseInt(kpi.value))){setKpiOnTime(parseInt(kpi.value));localStorage.setItem("qlcv_kpi_ontime",parseInt(kpi.value));}const hol=(acd||[]).find(r=>r.key==="holidays");if(hol)setHolidays(parseJSON(hol.value,[]));}catch{}
        if(canSeeAll){try{const{data:docd}=await supabase.from("documents").select("id,type,doc_number,title,created,created_by,forwards");setDocsForLog(docd||[]);}catch{}}
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
      // Ngày nghỉ = Thứ 7/Chủ nhật HOẶC ngày lễ (theo cấu hình holidays). Nhiệm vụ hàng ngày né các ngày này.
      const holSet=new Set(holidays||[]);
      const isNonWork=ymd=>{const dd=new Date(ymd);return [0,6].includes(dd.getDay())||holSet.has(ymd);};
      const isNonWorkToday=isNonWork(todayStr);
      for(const tpl of due){
        // Nhiệm vụ hàng ngày không tạo vào ngày nghỉ (T7/CN/lễ) — vẫn phải đẩy next_date
        // sang ngày kế tiếp để không bị "dí" tạo bù dồn dập khi qua ngày làm việc lại.
        if(tpl.frequency==="daily"&&isNonWorkToday){
          const nextDate=getNextDate(tpl.next_date,tpl.frequency);
          await supabase.from("recurring_templates").update({next_date:nextDate,last_created:todayStr}).eq("id",tpl.id);
          setRecurringTemplates(p=>p.map(r=>r.id===tpl.id?{...r,next_date:nextDate,last_created:todayStr}:r));
          continue;
        }
        // Hàng ngày luôn khóa hạn = ngày làm việc tiếp theo (không dùng deadline_days) — bỏ qua Thứ 7/CN
        // vì cơ quan không làm việc, tránh giao hạn rơi đúng ngày nghỉ; các tần suất khác vẫn tự do chọn số ngày
        let dailyDeadline=addDays(today,1);
        while(isNonWork(dailyDeadline))dailyDeadline=addDays(dailyDeadline,1);
        const deadline=tpl.frequency==="daily"?dailyDeadline:addDays(today,tpl.deadline_days||7);
        // created_by_id/created_by_name copy từ người tạo mẫu, để chính người đó (thường là TP/PP) duyệt được
        // hoàn thành nhiệm vụ tự sinh — nếu không, canApprove() sẽ chỉ còn đúng Admin/BGĐ được duyệt.
        const newTask={id:`t${Date.now()}_${Math.random().toString(36).slice(2,6)}`,title:`🔄 ${tpl.title}`,description:tpl.description||"",dept:tpl.dept,eid:tpl.eid,prio:tpl.prio,deadline,completed:false,created:todayStr,progress:0,attachments:"[]",collab_eids:tpl.collab_eids||"[]",collab_note:tpl.collab_note||"",template_id:tpl.id,weight:freqWeight(tpl.frequency),created_by_id:tpl.created_by_id||null,created_by_name:tpl.created_by||"",forwarded_by:"",history:JSON.stringify([{action:`Tạo tự động từ mẫu định kỳ "${tpl.title}"`,by:"Hệ thống",at:nowStr()}]),rating:"",rating_note:"",rated_by:"",rated_at:"",late_reason:"",late_note:""};
        const{error}=await supabase.from("tasks").insert(newTask);
        if(!error){setTasks(p=>[newTask,...p]);const nextDate=getNextDate(tpl.next_date,tpl.frequency);await supabase.from("recurring_templates").update({next_date:nextDate,last_created:todayStr}).eq("id",tpl.id);setRecurringTemplates(p=>p.map(r=>r.id===tpl.id?{...r,next_date:nextDate,last_created:todayStr}:r));created++;}
      }
      if(created>0)showToast(`🔄 Đã tạo ${created} nhiệm vụ định kỳ tự động`);
    })();
  },[tasks,recurringTemplates,canCreate]);

  // Đánh dấu "đã xem bình luận" của nhiệm vụ này với người đang đăng nhập, để không còn báo "bình luận mới" nữa
  const markCommentsRead=async id=>{const task=tasks.find(t=>t.id===id);if(!task)return;const reads=parseJSON(task.comment_reads,{});reads[currentUser.full_name]=nowStr();await updateTask(id,{comment_reads:JSON.stringify(reads)},null,{silent:true});};
  const loadComments=async id=>{setCommentLoading(true);const{data}=await supabase.from("comments").select("*").eq("task_id",id).order("created_at");setComments(p=>({...p,[id]:data||[]}));setCommentLoading(false);markCommentsRead(id);};
  const addComment=async id=>{if(!commentText.trim()&&commentFiles.length===0)return;const c={id:`c${Date.now()}`,task_id:id,user_name:currentUser.full_name,content:commentText.trim(),attachments:JSON.stringify(commentFiles),created_at:nowStr()};await supabase.from("comments").insert(c);setComments(p=>({...p,[id]:[...(p[id]||[]),c]}));setAllComments(p=>[...p,{task_id:id,user_name:c.user_name,created_at:c.created_at}]);const task=tasks.find(t=>t.id===id);if(task){const h=parseJSON(task.history,[]);h.push({action:`Bình luận: "${commentText.trim()||"(đính kèm file)"}"`,by:currentUser.full_name,at:nowStr()});await supabase.from("tasks").update({history:JSON.stringify(h)}).eq("id",id);setTasks(p=>p.map(t=>t.id===id?{...t,history:JSON.stringify(h)}:t));}markCommentsRead(id);setCommentText("");setCommentFiles([]);};
  const uploadFiles=async(files,existing=[])=>{setUploadingFiles(true);const results=[...existing];for(const file of files){const fn=`${Date.now()}_${sanitizeFileName(file.name)}`;const{error}=await supabase.storage.from("attachments").upload(fn,file);if(!error){const{data:{publicUrl}}=supabase.storage.from("attachments").getPublicUrl(fn);results.push({name:file.name,url:publicUrl});}else{console.error("Lỗi upload:",file.name,error);showToast(`Lỗi upload "${file.name}": ${error.message||"không rõ nguyên nhân"}`,"error");}}setUploadingFiles(false);return results;};
  // ── Nhân viên & tài khoản đăng nhập ──
  const {
    addEmployee, updateEmployee, deleteEmployee,
    empForm, setEmpForm, empDeptTab, setEmpDeptTab, openCreateEmp, openEditEmp, submitEmp,
    deptEmps,
  } = useEmployees({ employees, setEmployees, showToast, setSaving });
  const {
    userModal, setUserModal, userForm, setUserForm, userEditId, setUserEditId, submitUser, deleteUser, resetUserPwd,
  } = useUsers({ users, setUsers, showToast, setSaving });

  const submitTemplate=async()=>{const{editId}=templateForm;const data={...templateForm.data,deadline_days:templateForm.data.frequency==="daily"?0:templateForm.data.deadline_days};if(!data.title||!data.eid){showToast("Nhập tiêu đề và chọn người giao","error");return;}setSaving(true);if(editId){const{error}=await supabase.from("recurring_templates").update(data).eq("id",editId);if(error){showToast("Lỗi lưu mẫu: "+(error.message||""),"error");setSaving(false);return;}setRecurringTemplates(p=>p.map(t=>t.id===editId?{...t,...data}:t));}else{const nt={...data,id:`rt${Date.now()}`,created_by:currentUser.full_name,created_by_id:currentUser.id,last_created:""};const{error}=await supabase.from("recurring_templates").insert(nt);if(error){showToast("Lỗi tạo mẫu: "+(error.message||""),"error");setSaving(false);return;}setRecurringTemplates(p=>[...p,nt]);}showToast("Đã lưu mẫu định kỳ");setTemplateForm(null);setSaving(false);};
  const deleteTemplate=async id=>{await supabase.from("recurring_templates").delete().eq("id",id);setRecurringTemplates(p=>p.filter(t=>t.id!==id));};
  const toggleTemplate=async(id,active)=>{await supabase.from("recurring_templates").update({active}).eq("id",id);setRecurringTemplates(p=>p.map(t=>t.id===id?{...t,active}:t));showToast(active?"Đã kích hoạt":"Đã tạm dừng");};

  // ── Toàn bộ logic nghiệp vụ của Nhiệm vụ (phân quyền, CRUD, luồng yêu cầu/duyệt, lọc/phân trang, thông báo) ──
  const {
    canSeeTask, canEditTask, canDeleteTask, canUpdateProgress, canRequestCompletion, canRate, canApprove, canForward, canSetLateReason, canProposeExtension,
    addTask, updateTask,
    forwardModal, setForwardModal, forwardEid, setForwardEid, forwardTask,
    deleteConfirm, setDeleteConfirm, deleteTaskFn, restoreTaskFn, purgeTaskFn,
    isSuspiciousCompletion, toggleDone, confirmCompletion,
    completionNoteModal, setCompletionNoteModal, completionNote, setCompletionNote, completionFiles, setCompletionFiles,
    approveModal, setApproveModal, approveRating, setApproveRating, approveNote, setApproveNote, openApproveModal, confirmApproveCompletion,
    rejectCompletionRequest, remindApproval, nudgeTask, canEditOwnSelfTask, updateChecklist,
    extRequestModal, setExtRequestModal, extProposedDate, setExtProposedDate, extReason, setExtReason, openExtRequestModal, submitExtRequest,
    extDecideModal, setExtDecideModal, extDecideDate, setExtDecideDate, extDecideNote, setExtDecideNote, openExtApprove, openExtReject, confirmExtDecision,
    ratingNote, setRatingNote, lateNote, setLateNote, rateTask, setLateReasonFn, toggleLateExcused,
    visibleTasks, trashedTasks, computed, computedGlobal, stats, statsW, deptChart,
    dateFrom, setDateFrom, dateTo, setDateTo,
    fStatus, setFStatus, fDept, setFDept, fEid, setFEid, fAssignedByMe, setFAssignedByMe, search, setSearch, fSort, setFSort, page, setPage,
    filtered, paged, totalPages,
    notifications, unratedTasks, suspiciousTasks, myPendingTaskApprovals, myPendingExtRequests,
    seenKey, markSeen, myAssignedTasks, myNewTasks, myOverdueTasks, myNewTaskIds,
  } = useTasks({ tasks, setTasks, employees, currentUser, canSeeAll, userDept, canCreate, showToast, getEmp, setModal, setSaving, delegations });

  // ── Hiệu suất/Báo cáo (tổng hợp phòng ban, điểm hiệu suất tháng, bảng xếp hạng, thống kê trễ hạn/quá tải) ──
  const {
    repMonth, setRepMonth, repYear, setRepYear, repTab, setRepTab, rankYear, setRankYear,
    execDeptSummary, execMonth, setExecMonth, execYear, setExecYear, staffingAdvice, empProfile, managerBoard, managerLeaderboard, repTasks, repStats, repStatsPrev, repDeptData, repEmpData, repMonthTrend, leaderboard,
    lateReasonStats, overloadedEmps, myTrend, myTasks, myWorkList, myWorkloadCompare, myDoneList, atRiskTasks, weeklyDigest, watchList, dataHealth,
    empReliability, execNarrative, lateInsights,
    calcMonthPerf, managerPerf,
  } = useReports({ computed, computedGlobal, employees, currentUser, overloadThreshold, projects: projectsForScoring, supportCases: supportCasesForScoring, otherTasks });

  // ── Chốt sổ điểm tháng: lưu snapshot cố định điểm hiệu suất vào monthly_scores để điểm quá khứ
  // không thay đổi khi dữ liệu sống bị sửa/xóa về sau — phục vụ phiếu xếp loại quý/năm (bình xét thi đua).
  // mJs = tháng theo JS (0-11); trong DB lưu 1-12 cho dễ đọc.
  const snapshotMonth=async(y,mJs,opts={})=>{
    const rows=(employees||[]).map(emp=>{
      // Cấp quản lý (TP/PP) chốt theo ĐIỂM ĐIỀU HÀNH (kết quả phòng); nhân viên theo điểm hiệu suất cá nhân.
      const isMgr=MANAGER_EMP_ROLES.includes(emp.role);
      if(isMgr){
        const m=managerPerf(emp.id,y,mJs);
        if((m.resolvedW||0)<=0)return null;
        return {id:`ms${y}_${mJs+1}_${emp.id}`,year:y,month:mJs+1,eid:emp.id,name:emp.name,dept:emp.dept,score:m.eligible?m.perfScore:null,eligible:m.eligible,total:m.resolvedW,done:m.doneW,on_time:m.onTimeW,completed_late:m.lateW,over:m.overW,is_manager:true,breakdown:m.breakdown?JSON.stringify(m.breakdown):null,snapshot_at:nowStr(),snapshot_by:currentUser.full_name};
      }
      const m=calcMonthPerf(emp.id,y,mJs);
      if(m.total<=0)return null;
      return {id:`ms${y}_${mJs+1}_${emp.id}`,year:y,month:mJs+1,eid:emp.id,name:emp.name,dept:emp.dept,score:m.eligible?m.perfScore:null,eligible:m.eligible,total:m.total,done:m.done,on_time:m.onTime,completed_late:m.completedLate,over:m.over,is_manager:false,breakdown:m.breakdown?JSON.stringify(m.breakdown):null,snapshot_at:nowStr(),snapshot_by:currentUser.full_name};
    }).filter(Boolean);
    if(rows.length===0){if(!opts.silent)showToast("Tháng này không có dữ liệu để chốt","error");return false;}
    const{error:delErr}=await supabase.from("monthly_scores").delete().eq("year",y).eq("month",mJs+1);
    if(delErr){if(!opts.silent)showToast("Lỗi: "+(delErr.message||""),"error");return false;}
    const{error}=await supabase.from("monthly_scores").insert(rows);
    if(error){if(!opts.silent)showToast("Lỗi chốt sổ: "+(error.message||""),"error");return false;}
    setMonthlyScores(p=>[...p.filter(r=>!(r.year===y&&r.month===mJs+1)),...rows]);
    if(!opts.silent)showToast(`Đã chốt sổ điểm tháng ${mJs+1}/${y} (${rows.length} nhân viên)`);
    return true;
  };
  // ── Đồng bộ điểm ĐIỀU HÀNH cho các tháng ĐÃ CHỐT trước đây (trước khi có công thức điểm điều hành) ──
  // Chỉ thay các dòng của Trưởng/Phó phòng bằng điểm điều hành mới; GIỮ NGUYÊN điểm nhân viên đã chốt.
  const syncManagerSnapshots=async()=>{
    const months=[...new Set((monthlyScores||[]).map(r=>`${r.year}|${r.month}`))].map(k=>k.split("|").map(Number));
    if(months.length===0){showToast("Chưa có tháng nào được chốt sổ để đồng bộ","error");return;}
    const managers=(employees||[]).filter(e=>MANAGER_EMP_ROLES.includes(e.role));
    const managerIds=managers.map(e=>e.id);
    const allNew=[];
    for(const[y,mDb]of months){
      const mJs=mDb-1;
      const mrows=managers.map(emp=>{const m=managerPerf(emp.id,y,mJs);if((m.resolvedW||0)<=0)return null;return {id:`ms${y}_${mDb}_${emp.id}`,year:y,month:mDb,eid:emp.id,name:emp.name,dept:emp.dept,score:m.eligible?m.perfScore:null,eligible:m.eligible,total:m.resolvedW,done:m.doneW,on_time:m.onTimeW,completed_late:m.lateW,over:m.overW,is_manager:true,breakdown:m.breakdown?JSON.stringify(m.breakdown):null,snapshot_at:nowStr(),snapshot_by:currentUser.full_name};}).filter(Boolean);
      const{error:delErr}=await supabase.from("monthly_scores").delete().eq("year",y).eq("month",mDb).in("eid",managerIds);
      if(delErr){showToast("Lỗi khi đồng bộ: "+(delErr.message||""),"error");return;}
      if(mrows.length){const{error}=await supabase.from("monthly_scores").insert(mrows);if(error){showToast("Lỗi khi ghi: "+(error.message||""),"error");return;}}
      allNew.push(...mrows);
    }
    setMonthlyScores(p=>[...p.filter(r=>!managerIds.includes(r.eid)),...allNew]);
    showToast(`Đã đồng bộ điểm điều hành cho ${months.length} tháng đã chốt (${allNew.length} lượt quản lý)`);
  };
  // Tự chốt sổ THÁNG TRƯỚC nếu chưa chốt, khi người có quyền toàn đơn vị đăng nhập —
  // cùng cơ chế client-side với nhiệm vụ định kỳ (không có server chạy nền).
  const scoreSnapshotChecked=useRef(false);
  useEffect(()=>{
    if(loading||!currentUser||!FULL_ACCESS.includes(currentUser.role)||scoreSnapshotChecked.current)return;
    if(!employees||!tasks)return;
    scoreSnapshotChecked.current=true;
    const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);
    const y=d.getFullYear(),mJs=d.getMonth();
    if(monthlyScores.some(r=>r.year===y&&r.month===mJs+1))return;
    (async()=>{const ok=await snapshotMonth(y,mJs,{silent:true});if(ok)showToast(`📊 Đã tự động chốt sổ điểm tháng ${mJs+1}/${y}`);})();
  },[loading,currentUser,employees,tasks,monthlyScores]);

  // ── Tìm kiếm toàn hệ thống: gộp Nhiệm vụ + Nhiệm vụ khác + Nhiệm vụ ngân sách + Hỗ trợ ND vào 1 ô tìm,
  // vì trước đây mỗi tab chỉ tìm được trong phạm vi riêng, khó nhớ lại 1 việc cũ thuộc mục nào ──
  const [showGlobalSearch,setShowGlobalSearch]=useState(false);
  const [globalQuery,setGlobalQuery]=useState("");
  const globalSearchResults=useMemo(()=>{
    const q=globalQuery.trim().toLowerCase();
    if(q.length<2)return [];
    const out=[];
    for(const t of computed){ if(t.title?.toLowerCase().includes(q)||t.description?.toLowerCase().includes(q)) out.push({kind:"task",icon:"📋",label:"Nhiệm vụ",title:t.title,sub:`${t.dept} · ${getEmp(t.eid)?.name||"–"}`,onClick:()=>{setModal(t);loadComments(t.id);}}); }
    for(const ot of (otherTasks||[])){ if(!ot.name?.toLowerCase().includes(q)&&!ot.content?.toLowerCase().includes(q))continue; out.push({kind:"other",icon:"📌",label:"Nhiệm vụ khác",title:ot.name,sub:ot.content||"",onClick:()=>setView("othertasks")}); }
    for(const p of (projectsForScoring||[])){ if(!p.name?.toLowerCase().includes(q))continue; out.push({kind:"project",icon:"💰",label:"Nhiệm vụ ngân sách",title:p.name,sub:"Bấm để mở tab Nhiệm vụ ngân sách",onClick:()=>setView("investment")}); }
    for(const c of (supportCasesForScoring||[])){ if(!c.content?.toLowerCase().includes(q))continue; out.push({kind:"support",icon:"🎧",label:"Hỗ trợ ND",title:c.content,sub:"Bấm để mở tab Hỗ trợ người dùng/PAHT",onClick:()=>setView("supportcases")}); }
    return out.slice(0,40);
  },[globalQuery,computed,otherTasks,projectsForScoring,supportCasesForScoring,getEmp]);

  const calMonthTasks=useMemo(()=>computed.filter(t=>{const d=new Date(t.deadline);return d.getFullYear()===calYear&&d.getMonth()===calMonth;}),[computed,calYear,calMonth]);
  const calEmpSummary=useMemo(()=>{const m={};calMonthTasks.forEach(t=>{if(!t.eid)return;m[t.eid]=(m[t.eid]||0)+1;});return Object.entries(m).map(([eid,count])=>({eid,count,name:getEmp(eid)?.name||"?"})).sort((a,b)=>b.count-a.count);},[calMonthTasks,getEmp]);
  const calTasks=useMemo(()=>calEmpFilter==="all"?calMonthTasks:calMonthTasks.filter(t=>t.eid===calEmpFilter),[calMonthTasks,calEmpFilter]);
  const calTasksByDay=useMemo(()=>{const m={};calTasks.forEach(t=>{const day=new Date(t.deadline).getDate();if(!m[day])m[day]=[];m[day].push(t);});return m;},[calTasks]);
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const firstDay=new Date(calYear,calMonth,1).getDay();
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
  // ── Nhiệm vụ có bình luận mới mà mình chưa xem (chỉ tính người liên quan trực tiếp: giao/chuyển tiếp/thực hiện/phối hợp) ──
  const unreadCommentTasks=useMemo(()=>{
    if(!currentUser)return[];
    const myEid=currentUser.employee_id;
    const isStakeholder=t=>t.created_by_id===currentUser.id||(t.forwarded_by&&t.forwarded_by===currentUser.full_name)||t.eid===myEid||parseJSON(t.collab_eids,[]).includes(myEid);
    return computed.filter(t=>{
      if(!isStakeholder(t))return false;
      const mine=parseJSON(t.comment_reads,{})[currentUser.full_name];
      const others=allComments.filter(c=>c.task_id===t.id&&c.user_name!==currentUser.full_name);
      if(!others.length)return false;
      if(!mine)return true;
      const lastMine=parseNowStr(mine);
      return others.some(c=>parseNowStr(c.created_at)>lastMine);
    });
  },[computed,allComments,currentUser]);
  // ── Bước/gia hạn dự án (Nhiệm vụ ngân sách) đang chờ mình duyệt — dùng cho màn "Việc chờ tôi xử lý" ──
  const canApproveProjectStepFor=p=>canAssignAllDepts||(["manager","deputy_manager","manager_hcth"].includes(currentUser?.role)&&userDept===p.dept);
  const myPendingProjectSteps=useMemo(()=>{
    const out=[];
    (projectsForScoring||[]).forEach(p=>{ if(!canApproveProjectStepFor(p))return; parseJSON(p.steps,[]).forEach((s,idx)=>{ if(s.status==="pending_approval")out.push({proj:p,idx,step:s}); }); });
    return out;
  },[projectsForScoring,currentUser,userDept]);
  const myPendingProjectExt=useMemo(()=>canAssignAllDepts?(projectsForScoring||[]).filter(p=>p.ext_proposed):[],[projectsForScoring,canAssignAllDepts]);
  const myPendingProjectStepExt=useMemo(()=>{
    const out=[];
    (projectsForScoring||[]).forEach(p=>{ if(!canApproveProjectStepFor(p))return; parseJSON(p.steps,[]).forEach((s,idx)=>{ if(s.ext_proposed)out.push({proj:p,idx,step:s}); }); });
    return out;
  },[projectsForScoring,currentUser,userDept]);
  // Cho phép "Việc chờ tôi xử lý" mở thẳng đúng dự án/nhiệm vụ khác cần xử lý (Investment/OtherTasks tự quản lý modal chi tiết riêng)
  const [pendingOpenProjectId,setPendingOpenProjectId]=useState(null);
  const [pendingOpenOtherTaskId,setPendingOpenOtherTaskId]=useState(null);
  useEffect(()=>{
    if(!modal||!seenKey)return;
    markSeen(modal.id);
    // Ghi nhận lần đầu người được giao (eid) mở xem nhiệm vụ, để BGĐ/Trưởng/Phó phòng biết trạng thái Đã xem/Chưa xem
    if(!modal.viewed_at&&currentUser?.employee_id&&modal.eid===currentUser.employee_id){
      const vt=nowStr();
      updateTask(modal.id,{viewed_at:vt},null,{silent:true});
      setModal(m=>m?{...m,viewed_at:vt}:m);
    }
  },[modal]);
  // Tab Văn bản: chỉ Admin/BGĐ/TP.HCTH/TP/PTP thấy (Nhân viên không tham gia luồng chuyển văn bản nên ẩn hẳn)
  const canSeeDocumentsTab=["admin","director","manager_hcth","manager","deputy_manager"].includes(currentUser?.role);
  // ── Văn bản chuyển tới mình chưa xem: trước đây KHÔNG có gì báo cho người nhận biết (Documents.jsx chỉ
  // âm thầm ghi viewed_at khi họ tự mở tab Văn bản) — người được chuyển dễ bỏ sót văn bản vì không có gì
  // nhắc họ vào xem. Tải riêng 1 bộ cột gọn (không tải cả bảng documents nặng) chỉ để tính badge/thông báo. ──
  const [docsForNotif,setDocsForNotif]=useState([]);
  useEffect(()=>{
    if(!currentUser||!canSeeDocumentsTab)return;
    (async()=>{const{data}=await supabase.from("documents").select("id,doc_number,title,type,forwards,task_id").not("forwards","is",null);setDocsForNotif(data||[]);})();
  },[currentUser,canSeeDocumentsTab]);
  const myPendingDocForwards=useMemo(()=>{
    if(!currentUser)return[];
    return docsForNotif.filter(d=>{
      const chain=parseJSON(d.forwards,[]);
      const last=chain[chain.length-1];
      return last&&last.to_id===currentUser.id&&!last.viewed_at;
    });
  },[docsForNotif,currentUser]);
  // Badge số trên tab "Văn bản": với GĐ/Admin (thấy toàn bộ hộp thư đến) không ai chuyển ngược lại cho họ
  // nên myPendingDocForwards luôn =0 — đếm riêng số văn bản đến CHƯA xử lý (chưa chuyển cho ai, chưa giao việc)
  // để badge có ý nghĩa, giống số "Văn bản đến (N)" của iOffice.
  const isTopDocUser=currentUser?.role==="admin"||currentUser?.is_top_director===true;
  const docsNeedingAttentionCount=useMemo(()=>{
    if(!currentUser)return 0;
    if(isTopDocUser)return docsForNotif.filter(d=>(d.type==="den"||d.type==="incoming")&&parseJSON(d.forwards,[]).length===0&&!d.task_id).length;
    return myPendingDocForwards.length;
  },[docsForNotif,currentUser,isTopDocUser,myPendingDocForwards]);
  const [showLoginPopup,setShowLoginPopup]=useState(false);
  useEffect(()=>{
    if(!currentUser||loading||loginNotifShown)return;
    if(myNewTasks.length>0||myOverdueTasks.length>0||myPendingApprovals.length>0||myPendingTaskApprovals.length>0||myPendingExtRequests.length>0||myPendingDocForwards.length>0)setShowLoginPopup(true);
    setLoginNotifShown(true);
  },[currentUser,loading,loginNotifShown,myNewTasks.length,myOverdueTasks.length,myPendingApprovals.length,myPendingTaskApprovals.length,myPendingExtRequests.length,myPendingDocForwards.length]);
  const totalNotif=notifications.length+unratedTasks.length+myNewTasks.length+suspiciousTasks.length+myPendingApprovals.length+myPendingTaskApprovals.length+myPendingExtRequests.length+unreadCommentTasks.length+myPendingDocForwards.length;
  // Nhật ký TOÀN DIỆN = gộp sự kiện từ Nhiệm vụ (history) + Hỗ trợ ND (ghi nhận) + Ngân sách & Nhiệm vụ khác
  // (duyệt bước/nghiệm thu). Sắp theo mốc thời gian THẬT (parseAnyTime xử lý nhiều định dạng), KHÔNG cắt bớt —
  // component tự lọc/phân trang. Không hề xóa dữ liệu, chỉ tổng hợp để hiển thị.
  const parseAnyTime=s=>{if(!s||typeof s!=="string")return null;if(s.includes(":")&&s.includes(" ")){const d=parseNowStr(s);if(d)return d;}if(s.includes("/")){const[d,m,y]=s.split("/").map(Number);if(d&&m&&y)return new Date(y,m-1,d);return null;}const dt=new Date(s);return isNaN(dt)?null:dt;};
  const activityLog=useMemo(()=>{if(!canSeeAll)return[];const out=[];
    (tasks||[]).forEach(t=>{parseJSON(t.history,[]).forEach((h,i)=>{out.push({id:`t_${t.id}_${i}`,module:"task",title:t.title,action:h.action,by:h.by,at:h.at,ts:parseAnyTime(h.at)});});});
    (supportCasesForScoring||[]).forEach(c=>{out.push({id:`s_${c.id}`,module:"support",title:c.content||"Trường hợp hỗ trợ",action:"Ghi nhận xử lý hỗ trợ/PAHT",by:getEmp(c.eid)?.name||"—",at:c.created,ts:parseAnyTime(c.created)});});
    (projectsForScoring||[]).forEach(p=>{parseJSON(p.steps,[]).forEach(s=>{if(s.status==="done"&&s.approved_at)out.push({id:`p_${p.id}_${s.id}`,module:"project",title:p.name,action:`Duyệt bước "${s.content||""}"`,by:s.approved_by||"—",at:s.approved_at,ts:parseAnyTime(s.approved_at)});});if(p.quality_rating&&p.quality_rated_at)out.push({id:`pq_${p.id}`,module:"project",title:p.name,action:`Nghiệm thu dự án (${p.quality_rating}★)`,by:p.quality_rated_by||"Ban Giám đốc",at:p.quality_rated_at,ts:parseAnyTime(p.quality_rated_at)});});
    (otherTasks||[]).forEach(t=>{parseJSON(t.steps,[]).forEach(s=>{if(s.status==="done"&&s.approved_at)out.push({id:`o_${t.id}_${s.id}`,module:"other",title:t.name||t.content||"Nhiệm vụ khác",action:`Duyệt bước "${s.content||""}"`,by:s.approved_by||"—",at:s.approved_at,ts:parseAnyTime(s.approved_at)});});});
    (docsForLog||[]).forEach(d=>{out.push({id:`doc_${d.id}`,module:"document",title:`[${d.doc_number}] ${d.title||""}`,action:d.type==="di"?"Thêm văn bản đi":"Thêm văn bản đến",by:d.created_by||"—",at:d.created,ts:parseAnyTime(d.created)});(parseJSON(d.forwards,[])||[]).forEach((f,i)=>{if(f&&(f.at||f.by))out.push({id:`docf_${d.id}_${i}`,module:"document",title:`[${d.doc_number}] ${d.title||""}`,action:`Chuyển văn bản cho ${f.to_name||"—"}`,by:f.by||"—",at:f.at,ts:parseAnyTime(f.at)});});});
    return out.sort((a,b)=>(b.ts?b.ts.getTime():0)-(a.ts?a.ts.getTime():0));
  },[tasks,supportCasesForScoring,projectsForScoring,otherTasks,docsForLog,canSeeAll,getEmp]);
  useEffect(()=>{setPage(1);},[fStatus,fDept,fEid,fAssignedByMe,search,fSort]);
  const emptyTaskData=()=>{const dept=canSelfCreate?userDept:availableDepts[0];const first=(employees||[]).find(e=>e.dept===dept);return{title:"",description:"",dept,eid:canSelfCreate?currentUser.employee_id:(first?.id||""),prio:"medium",deadline:addDays(today,7),attachments:"[]",progress:0,collab_eids:"[]",collab_note:"",depends_on:""};};
  // Khối lượng ĐANG MỞ của mỗi nhân viên (đếm trên toàn bộ nhiệm vụ chưa hoàn thành, không phụ thuộc bộ lọc
  // thời gian) — hiện ngay lúc giao việc để trưởng phòng biết ai đang rảnh/ai đang ngập, tránh dồn việc một người.
  const activeLoadByEid=useMemo(()=>{const map={};for(const t of (tasks||[])){if(t.deleted)continue;if(isCompletedStatus(getStatus(t)))continue;if(!t.eid)continue;if(!map[t.eid])map[t.eid]={count:0,w:0};map[t.eid].count+=1;map[t.eid].w+=(t.weight??1);}Object.values(map).forEach(v=>{v.w=Math.round(v.w*100)/100;});return map;},[tasks]);
  // TV3 — Gợi ý người nhận: trong phòng, ưu tiên người ĐANG RẢNH nhất, cùng lịch sử ĐÚNG HẠN tốt.
  const suggestAssignee=dept=>{const cands=(employees||[]).filter(e=>e.dept===dept&&!e.no_kpi).map(e=>({e,load:activeLoadByEid[e.id]?.w||0,onTime:empReliability[e.id]?.onTimeRate??null}));if(!cands.length)return null;cands.sort((a,b)=>(a.load-b.load)||((b.onTime??70)-(a.onTime??70)));return cands[0];};
  const [rateReminderModal,setRateReminderModal]=useState(false);
  const openCreateTask=()=>{if(unratedTasks.length>0){setRateReminderModal(true);return;}setTaskForm({data:emptyTaskData(),editId:null});};
  const [pendingDocLink,setPendingDocLink]=useState(null); // văn bản đang chờ gán nhiệm vụ vừa tạo
  const openCreateTaskFromDoc=(doc)=>{if(unratedTasks.length>0){setRateReminderModal(true);return;}const base=emptyTaskData();setTaskForm({data:{...base,title:`[${doc.doc_number}] ${doc.title}`,description:doc.note||"",attachments:doc.attachments||"[]"},editId:null});setPendingDocLink(doc.id);};
  const openEditTask=t=>setTaskForm({data:{title:t.title,description:t.description||"",dept:t.dept,eid:t.eid,prio:t.prio,deadline:t.deadline,attachments:t.attachments||"[]",progress:t.progress||0,collab_eids:t.collab_eids||"[]",collab_note:t.collab_note||"",depends_on:t.depends_on||""},editId:t.id});
  // Sửa các trường khác vẫn theo canEditTask (Trưởng/Phó phòng trong phòng ban) như cũ — riêng ô Hạn chót
  // chỉ người giao việc (hoặc Admin/BGĐ) mới đổi trực tiếp được, tránh việc dời hạn tùy tiện không qua người giao việc.
  const editingTaskForDeadline=useMemo(()=>taskForm?.editId?tasks.find(t=>t.id===taskForm.editId):null,[taskForm,tasks]);
  const deadlineEditable=!editingTaskForDeadline||canApprove(editingTaskForDeadline);
  const changeTaskDept=v=>{const f=(employees||[]).find(e=>e.dept===v);setTaskForm(tf=>({...tf,data:{...tf.data,dept:v,eid:f?f.id:""}}));};
  const toggleCollab=empId=>{const cur=parseJSON(taskForm.data.collab_eids,[]);const next=cur.includes(empId)?cur.filter(i=>i!==empId):[...cur,empId];setTaskForm(f=>({...f,data:{...f.data,collab_eids:JSON.stringify(next)}}));};
  const toggleTemplateCollab=empId=>{const cur=parseJSON(templateForm.data.collab_eids,[]);const next=cur.includes(empId)?cur.filter(i=>i!==empId):[...cur,empId];setTemplateForm(f=>({...f,data:{...f.data,collab_eids:JSON.stringify(next)}}));};
  const submitTask=async()=>{let{data,editId}=taskForm;if(!data.title||!data.deadline)return;
    // Chốt chặn phía server-logic: nhân viên tự tạo chỉ được giao cho CHÍNH MÌNH, đúng phòng của mình, không phối hợp người khác.
    if(canSelfCreate&&!canCreate)data={...data,eid:currentUser.employee_id,dept:userDept,collab_eids:"[]",collab_note:""};
    if(editId)await updateTask(editId,data,"Cập nhật nhiệm vụ");else{const created=await addTask(data);if(created&&pendingDocLink){await supabase.from("documents").update({task_id:created.id}).eq("id",pendingDocLink);showToast("Đã liên kết nhiệm vụ với văn bản");}}setPendingDocLink(null);setTaskForm(null);};
  const exportCSV=()=>{const rows=computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept));const header=["Tiêu đề","Phòng ban","Nhân viên","Ưu tiên","Hạn chót","Tiến độ","Trạng thái","Đánh giá","Nguyên nhân trễ","Định kỳ","Ngày tạo"];const lines=rows.map(t=>{const emp=getEmp(t.eid);return[`"${(t.title||"").replace(/"/g,'""')}"`,t.dept,`"${emp?.name||""}"`,PRIO[t.prio]?.label,t.deadline,`${t.progress||0}%`,STATUS[t.status]?.label,t.rating?RATING[t.rating]?.label:"",t.late_reason?LATE_REASONS.find(r=>r.value===t.late_reason)?.label:"",t.template_id?"Có":"",t.created||""].join(",");});const csv="\uFEFF"+[header.join(","),...lines].join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download=`bao-cao-${todayStr}.csv`;a.click();URL.revokeObjectURL(url);setExModal(false);};
  const exportPDF=()=>{const rows=computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept));const total=rows.length,done=rows.filter(t=>t.status==="completed").length,over=rows.filter(t=>t.status==="overdue").length,nd=rows.filter(t=>t.status==="nearly_due").length;const rows_html=rows.map(t=>{const emp=getEmp(t.eid);const sc=STATUS[t.status];return`<tr><td>${t.title||""}</td><td>${t.dept}</td><td>${emp?.name||"–"}</td><td>${PRIO[t.prio]?.label||""}</td><td style="color:${t.status==="overdue"?"#b91c1c":"inherit"}">${t.deadline}</td><td>${t.progress||0}%</td><td style="color:${sc?.col}">${sc?.label||""}</td><td>${t.rating?RATING[t.rating]?.label:"–"}</td></tr>`;}).join("");const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Báo cáo nhiệm vụ</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{color:#1e1b4b;font-size:20px;margin-bottom:4px}.meta{color:#6b7280;font-size:13px;margin-bottom:20px}.stats{display:flex;gap:16px;margin-bottom:20px}.stat{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px 20px;text-align:center}.stat .val{font-size:26px;font-weight:700;color:#4338ca}.stat .lbl{font-size:12px;color:#6b7280;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f1f5f9;padding:8px 10px;text-align:left;border:1px solid #e5e7eb;font-size:12px;color:#374151}td{padding:7px 10px;border:1px solid #e5e7eb}tr:nth-child(even){background:#fafafa}@media print{body{padding:0}button{display:none}}</style></head><body><h1>📋 Báo cáo Nhiệm vụ</h1><div class="meta">Xuất ngày: ${new Date().toLocaleDateString("vi-VN")} · Bộ lọc: ${exStatus==="all"?"Tất cả":STATUS[exStatus]?.label} · Phòng: ${exDept==="all"?"Tất cả":exDept}</div><div class="stats"><div class="stat"><div class="val">${total}</div><div class="lbl">Tổng</div></div><div class="stat"><div class="val" style="color:#15803d">${done}</div><div class="lbl">Hoàn thành</div></div><div class="stat"><div class="val" style="color:#b91c1c">${over}</div><div class="lbl">Quá hạn</div></div><div class="stat"><div class="val" style="color:#92400e">${nd}</div><div class="lbl">Sắp hết hạn</div></div><div class="stat"><div class="val" style="color:#4338ca">${total?Math.round(done/total*100):0}%</div><div class="lbl">Tỷ lệ HT</div></div></div><table><thead><tr><th>Tiêu đề</th><th>Phòng</th><th>Nhân viên</th><th>Ưu tiên</th><th>Hạn chót</th><th>Tiến độ</th><th>Trạng thái</th><th>Đánh giá</th></tr></thead><tbody>${rows_html}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`;const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}setExModal(false);};

  const inp={padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:7,fontSize:13,background:"#fff",color:"#111",width:"100%",boxSizing:"border-box"};
  // Gom "Nhiệm vụ / Ngân sách / Khác / Hỗ trợ ND" vào 1 mục cha "Công việc" có tab con bên trong,
  // giảm số mục menu chính. workSubviews giữ nguyên đúng các id view cũ để không phải sửa logic render bên dưới.
  const workSubviews=[{id:"tasks",icon:"📋",label:"Nhiệm vụ"},{id:"investment",icon:"💰",label:"Nhiệm vụ ngân sách"},{id:"othertasks",icon:"📌",label:"Nhiệm vụ khác"},{id:"supportcases",icon:"🎧",label:"Hỗ trợ người dùng/PAHT và vận hành DC",shortLabel:"Hỗ trợ ND"}];
  // "Nhiệm vụ định kỳ" là modal (không phải view riêng) nhưng vẫn hiện như 1 tab con trong "Công việc"
  const workExtras=canCreate?[{id:"recurring",icon:"🔄",label:"Nhiệm vụ định kỳ",onClick:()=>setShowRecurring(true)},{id:"bulkhandoff",icon:"🔁",label:"Bàn giao hàng loạt",onClick:openBulkHandoff}]:[];
  const myQueueTotal=myPendingTaskApprovals.length+myPendingExtRequests.length+unratedTasks.length+unreadCommentTasks.length+myPendingApprovals.length+myPendingProjectSteps.length+myPendingProjectExt.length+myPendingProjectStepExt.length;
  const navItems=[{id:"dashboard",icon:"📊",label:"Tổng quan"},{id:"myqueue",icon:"🗂️",label:"Việc chờ xử lý",shortLabel:"Chờ xử lý",badge:myQueueTotal},{id:"work",icon:"💼",label:"Công việc"},{id:"calendar",icon:"🗓️",label:"Lịch (Deadline/Trực)",shortLabel:"Lịch"},...(canSeeDocumentsTab?[{id:"documents",icon:"📁",label:"Văn bản",badge:docsNeedingAttentionCount}]:[]),{id:"chat",icon:"💬",label:"Chat"},{id:"reports",icon:"📈",label:"Báo cáo"},{id:"employees",icon:"👥",label:"Nhân viên"},{id:"feedback",icon:"💡",label:"Góp ý"},{id:"help",icon:"📘",label:"Hướng dẫn"},...(canSeeAll?[{id:"activity",icon:"📜",label:"Nhật ký"}]:[]),...(["admin","director"].includes(currentUser?.role)?[{id:"chatlearn",icon:"🧠",label:"Trợ lý học"}]:[]),...(currentUser?.role==="admin"?[{id:"security",icon:"🔐",label:"Bảo mật"}]:[])];
  const isWorkView=workSubviews.some(w=>w.id===view);
  const getViewMeta=id=>navItems.find(n=>n.id===id)||workSubviews.find(w=>w.id===id);
  // Nhớ tab con "Công việc" xem gần nhất (theo trình duyệt) để lần sau bấm "Công việc" vào thẳng đó,
  // đỡ phải bấm thêm 1 lần chọn lại tab quen dùng.
  useEffect(()=>{if(isWorkView)localStorage.setItem("qlcv_last_work_tab",view);},[isWorkView,view]);
  const goToWork=()=>{if(isWorkView)return;const last=localStorage.getItem("qlcv_last_work_tab");setView(workSubviews.some(w=>w.id===last)?last:"tasks");};

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
    <div className={darkMode?"qlcv-dark":""} style={{display:"flex",flexDirection:isMobile?"column":"row",height:"100dvh",fontFamily:"system-ui,sans-serif",background:darkMode?"#0f172a":"#f8fafc",overflow:"hidden",zoom:(isMobile||zoom===1)?undefined:zoom}}>
      <style>{`
        .qlcv-dark { filter: invert(1) hue-rotate(180deg); }
        .qlcv-dark img, .qlcv-dark svg { filter: invert(1) hue-rotate(180deg); }
      `}</style>
      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:200,background:toast.type==="error"?"#fee2e2":"#dcfce7",color:toast.type==="error"?"#b91c1c":"#15803d",padding:"10px 18px",borderRadius:8,fontSize:13,boxShadow:"0 2px 8px rgba(0,0,0,0.12)",maxWidth:320,display:"flex",alignItems:"flex-start",gap:10}}><span style={{flex:1}}>{toast.msg}</span>{toast.type==="error"&&<button onClick={()=>setToast(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#b91c1c",fontSize:16,lineHeight:1,flexShrink:0}}>✕</button>}</div>}

      {/* Tìm kiếm toàn hệ thống */}
      {showGlobalSearch&&(
        <div onClick={()=>setShowGlobalSearch(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:250,padding:isMobile?"12px 8px":"10vh 16px"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,maxHeight:"75vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",gap:8,alignItems:"center",position:"sticky",top:0,background:"#fff"}}>
              <span style={{fontSize:16}}>🔍</span>
              <input autoFocus value={globalQuery} onChange={e=>setGlobalQuery(e.target.value)} placeholder="Tìm việc, mô tả, dự án, trường hợp hỗ trợ... (gõ ít nhất 2 ký tự)" style={{...inp,border:"none",flex:1}}/>
              <button onClick={()=>setShowGlobalSearch(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:"6px 0"}}>
              {globalQuery.trim().length<2?(
                <div style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>Gõ ít nhất 2 ký tự để tìm — kết quả gộp từ Nhiệm vụ, Nhiệm vụ ngân sách, Nhiệm vụ khác, Hỗ trợ ND/PAHT.</div>
              ):globalSearchResults.length===0?(
                <div style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>Không tìm thấy kết quả phù hợp</div>
              ):globalSearchResults.map((r,i)=>(
                <div key={i} onClick={()=>{r.onClick();setShowGlobalSearch(false);}} style={{padding:"10px 18px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:18,flexShrink:0}}>{r.icon}</span>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,wordBreak:"break-word"}}>{r.title}</div>
                    <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{r.label}{r.sub?` · ${r.sub}`:""}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo tự động đăng xuất do không thao tác */}
      {idleWarning&&currentUser&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:380,padding:24,textAlign:"center",boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
            <div style={{fontSize:36,marginBottom:10}}>⏳</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Bạn có còn ở đây không?</div>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>Do không thao tác, hệ thống sẽ tự động đăng xuất sau <b style={{color:"#dc2626"}}>{idleSecondsLeft}</b> giây để bảo mật tài khoản.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={handleLogout} style={{flex:1,padding:"10px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,color:"#374151"}}>Đăng xuất ngay</button>
              <button onClick={resetIdleTimer} style={{flex:1,padding:"10px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Tiếp tục làm việc</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      {!isMobile&&(
        <div style={{width:220,background:"#1e1b4b",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"14px",borderBottom:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:10}}><img src={LOGO} alt="logo" style={{width:40,height:40,objectFit:"contain",borderRadius:"50%",flexShrink:0}}/><div><div style={{color:"#fff",fontWeight:700,fontSize:13,lineHeight:1.3}}>QUẢN LÝ GIAO VIỆC</div><div style={{color:"#a5b4fc",fontSize:11,marginTop:1}}>DAK LAK IOC</div></div></div>
          <nav style={{flex:1,padding:"8px 0",overflowY:"auto",minHeight:0}}>
            {navItems.map(n=>{const active=n.id==="work"?isWorkView:view===n.id;return(
            <div key={n.id}>
              <button onClick={()=>{if(n.id==="work")goToWork();else setView(n.id);if(n.id==="security")loadLoginHistory();}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:active?"rgba(165,180,252,0.15)":"transparent",border:"none",cursor:"pointer",color:active?"#c7d2fe":"#94a3b8",textAlign:"left",fontSize:13}}><span>{n.icon}</span>{n.label}{!!n.badge&&<span style={{background:"#dc2626",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:10,marginLeft:"auto"}}>{n.badge}</span>}</button>
              {n.id==="work"&&isWorkView&&<div style={{display:"flex",flexDirection:"column"}}>{[...workSubviews,...workExtras].map(w=><button key={w.id} onClick={()=>w.onClick?w.onClick():setView(w.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 14px 8px 34px",background:view===w.id?"rgba(165,180,252,0.1)":"transparent",border:"none",cursor:"pointer",color:view===w.id?"#c7d2fe":"#94a3b8",textAlign:"left",fontSize:12.5}}><span>{w.icon}</span>{w.label}{w.id==="recurring"&&recurringTemplates.filter(t=>t.active).length>0&&<span style={{background:"#6366f1",color:"#fff",fontSize:10,padding:"1px 6px",borderRadius:10,marginLeft:"auto"}}>{recurringTemplates.filter(t=>t.active).length}</span>}</button>)}</div>}
            </div>
            );})}
            {isAdmin&&<button onClick={()=>setUserModal(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8",textAlign:"left",fontSize:13}}>🔐 Tài khoản</button>}
            {(canCreate||isDelegationAdmin)&&<button onClick={openDelegationModal} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8",textAlign:"left",fontSize:13}}>🤝 Ủy quyền duyệt</button>}
          </nav>
          <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
            {canSeeAll&&<button onClick={()=>setExModal(true)} style={{background:"rgba(99,102,241,0.25)",border:"none",borderRadius:7,padding:"8px 10px",cursor:"pointer",color:"#c7d2fe",fontSize:13,textAlign:"left"}}>📤 Xuất CSV</button>}
            {isAdmin&&<button onClick={backupData} disabled={backingUp} style={{background:"rgba(16,185,129,0.2)",border:"none",borderRadius:7,padding:"8px 10px",cursor:backingUp?"wait":"pointer",color:"#6ee7b7",fontSize:13,textAlign:"left"}}>{backingUp?"⏳ Đang sao lưu…":"💾 Sao lưu dữ liệu"}</button>}
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
            <span style={{fontWeight:600,fontSize:isMobile?14:15,color:"#111827"}}>{getViewMeta(view)?.label}</span>
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
            {/* Trên mobile bỏ nút "Aa" (CSS zoom làm modal tràn màn hình); dùng thu phóng của trình duyệt/hệ điều hành */}
            {/* Tìm kiếm toàn hệ thống */}
            <button onClick={()=>{setShowGlobalSearch(true);setGlobalQuery("");}} title="Tìm kiếm mọi mục (Nhiệm vụ, Ngân sách, Khác, Hỗ trợ ND)" style={{background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 8px",cursor:"pointer",fontSize:16}}>🔍</button>
            {/* Bell notification */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowNotif(v=>!v)} style={{position:"relative",background:"none",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 8px",cursor:"pointer",fontSize:16}}>
                🔔{totalNotif>0&&<span style={{position:"absolute",top:-4,right:-4,background:unratedTasks.length>0?"#f59e0b":"#dc2626",color:"#fff",fontSize:10,fontWeight:700,minWidth:16,height:16,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{totalNotif}</span>}
              </button>
              {showNotif&&<div style={{position:"absolute",top:36,right:0,width:320,maxHeight:420,overflowY:"auto",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:100}}>
                <div style={{padding:"10px 14px",borderBottom:"1px solid #e5e7eb",fontWeight:600,fontSize:13,display:"flex",justifyContent:"space-between"}}><span>🔔 Thông báo ({totalNotif})</span><button onClick={()=>setShowNotif(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af"}}>✕</button></div>
                {myPendingTaskApprovals.length>0&&<div><div style={{padding:"8px 14px",background:"#fffbeb",fontSize:11,fontWeight:600,color:"#92400e",borderBottom:"1px solid #fde68a"}}>📨 NHIỆM VỤ CHỜ BẠN DUYỆT ({myPendingTaskApprovals.length})</div>{myPendingTaskApprovals.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#fffef5"}} onMouseEnter={e=>e.currentTarget.style.background="#fffbeb"} onMouseLeave={e=>e.currentTarget.style.background="#fffef5"}><span style={{fontSize:18,flexShrink:0}}>📨</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.reminder_at&&"🔔 "}{t.title}</div><div style={{fontSize:11,color:"#92400e"}}>{t.requested_by} yêu cầu duyệt lúc {t.requested_at}{t.reminder_at&&` · Đã được nhắc lúc ${t.reminder_at}`}</div>{pendingApprovalDays(t)>=2&&<div style={{fontSize:10,color:"#b91c1c",fontWeight:700,marginTop:2}}>⏳ Đã chờ duyệt {pendingApprovalDays(t)} ngày — nên duyệt sớm</div>}</div></div>)}</div>}
                {myPendingExtRequests.length>0&&<div><div style={{padding:"8px 14px",background:"#eff6ff",fontSize:11,fontWeight:600,color:"#1d4ed8",borderBottom:"1px solid #bfdbfe"}}>📅 ĐỀ XUẤT GIA HẠN CHỜ BẠN DUYỆT ({myPendingExtRequests.length})</div>{myPendingExtRequests.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#f8fbff"}} onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8fbff"}><span style={{fontSize:18,flexShrink:0}}>📅</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#1d4ed8"}}>{t.ext_requested_by} đề xuất gia hạn đến {t.ext_proposed}</div></div></div>)}</div>}
                {myPendingApprovals.length>0&&<div><div style={{padding:"8px 14px",background:"#fffbeb",fontSize:11,fontWeight:600,color:"#92400e",borderBottom:"1px solid #fde68a"}}>📨 CHỜ DUYỆT HOÀN THÀNH ({myPendingApprovals.length})</div>{myPendingApprovals.map((a,i)=><div key={i} onClick={()=>{setView("othertasks");setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#fffef5"}} onMouseEnter={e=>e.currentTarget.style.background="#fffbeb"} onMouseLeave={e=>e.currentTarget.style.background="#fffef5"}><span style={{fontSize:18,flexShrink:0}}>📨</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{a.taskName}</div><div style={{fontSize:11,color:"#92400e"}}>Bước: {a.content} · {a.requested_by} yêu cầu duyệt</div></div></div>)}</div>}
                {myNewTasks.length>0&&<div><div style={{padding:"8px 14px",background:"#eff6ff",fontSize:11,fontWeight:600,color:"#1d4ed8",borderBottom:"1px solid #bfdbfe"}}>📥 VIỆC MỚI GIAO ({myNewTasks.length})</div>{myNewTasks.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#f8fafc"}} onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"} onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}><span style={{fontSize:18,flexShrink:0}}>📥</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#1d4ed8"}}>{t.dept} · Hạn: {fmtDate(t.deadline)}</div></div></div>)}</div>}
                {unreadCommentTasks.length>0&&<div><div style={{padding:"8px 14px",background:"#f5f3ff",fontSize:11,fontWeight:600,color:"#6d28d9",borderBottom:"1px solid #ddd6fe"}}>💬 BÌNH LUẬN MỚI ({unreadCommentTasks.length})</div>{unreadCommentTasks.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#faf9ff"}} onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"} onMouseLeave={e=>e.currentTarget.style.background="#faf9ff"}><span style={{fontSize:18,flexShrink:0}}>💬</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#6d28d9"}}>{t.dept} · Có bình luận mới chưa xem</div></div></div>)}</div>}
                {unratedTasks.length>0&&<div><div style={{padding:"8px 14px",background:"#fffbeb",fontSize:11,fontWeight:600,color:"#92400e",borderBottom:"1px solid #fde68a"}}>⭐ CẦN ĐÁNH GIÁ ({unratedTasks.length})</div>{unratedTasks.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#fffef0"}} onMouseEnter={e=>e.currentTarget.style.background="#fef9c3"} onMouseLeave={e=>e.currentTarget.style.background="#fffef0"}><span style={{fontSize:18,flexShrink:0}}>⭐</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#92400e"}}>Hoàn thành — chờ đánh giá · {t.dept}</div></div></div>)}</div>}
                {suspiciousTasks.length>0&&<div><div style={{padding:"8px 14px",background:"#fff7ed",fontSize:11,fontWeight:600,color:"#c2410c",borderBottom:"1px solid #fed7aa"}}>🚨 HOÀN THÀNH ĐỘT NGỘT — CẦN KIỂM TRA ({suspiciousTasks.length})</div>{suspiciousTasks.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#fff7ed"}} onMouseEnter={e=>e.currentTarget.style.background="#ffedd5"} onMouseLeave={e=>e.currentTarget.style.background="#fff7ed"}><span style={{fontSize:18,flexShrink:0}}>🚨</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#c2410c"}}>{getEmp(t.eid)?.name||"–"} · {t.dept} · Tiến độ thấp → hoàn thành sát deadline</div></div></div>)}</div>}
                {myPendingDocForwards.length>0&&<div><div style={{padding:"8px 14px",background:"#f5f3ff",fontSize:11,fontWeight:600,color:"#6d28d9",borderBottom:"1px solid #ddd6fe"}}>↪️ VĂN BẢN CHUYỂN TỚI BẠN ({myPendingDocForwards.length})</div>{myPendingDocForwards.map(d=><div key={d.id} onClick={()=>{setView("documents");setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start",background:"#faf9ff"}} onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"} onMouseLeave={e=>e.currentTarget.style.background="#faf9ff"}><span style={{fontSize:18,flexShrink:0}}>↪️</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>[{d.doc_number}] {d.title}</div><div style={{fontSize:11,color:"#6d28d9"}}>Có văn bản mới được chuyển tới bạn, chưa xem</div></div></div>)}</div>}
                {notifications.length>0&&<div><div style={{padding:"8px 14px",background:"#f9fafb",fontSize:11,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>⚠️ DEADLINE ({notifications.length})</div>{notifications.map(t=><div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setShowNotif(false);}} style={{padding:"10px 14px",borderBottom:"1px solid #f3f4f6",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}} onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontSize:18,flexShrink:0}}>{t.status==="overdue"?"🔴":"🟡"}</span><div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{t.title}</div><div style={{fontSize:11,color:"#6b7280"}}>{getEmp(t.eid)?.name||"–"} · {t.dept} · Hạn: {fmtDate(t.deadline)}</div></div></div>)}</div>}
                {totalNotif===0&&<div style={{padding:20,textAlign:"center",color:"#9ca3af",fontSize:13}}>Không có thông báo</div>}
              </div>}
            </div>
            {view==="tasks"&&canCreate&&<button onClick={()=>setShowRecurring(true)} style={{background:"#f1f5f9",color:"#475569",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 8px",fontSize:12,cursor:"pointer"}}>🔄</button>}
            {view==="tasks"&&canDeleteTask({dept:userDept})&&trashedTasks.length>0&&<button onClick={()=>setShowTrash(true)} style={{background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:8,padding:"5px 8px",fontSize:12,cursor:"pointer"}}>🗑️ {trashedTasks.length}</button>}
            {view==="employees"&&canCreate&&<button onClick={()=>openCreateEmp(empDeptTab)} style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:8,padding:isMobile?"5px 10px":"6px 14px",fontSize:isMobile?12:13,cursor:"pointer"}}>+ NV</button>}
            {["dashboard","tasks","calendar"].includes(view)&&(canCreate||canSelfCreate)&&<button onClick={openCreateTask} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:isMobile?"5px 10px":"6px 14px",fontSize:isMobile?12:13,cursor:"pointer"}}>+ {canCreate?"Tạo việc":"Tự tạo việc"}</button>}
            {/* Mobile: đổi MK + đăng xuất */}
            {isMobile&&(canCreate||isDelegationAdmin)&&<button onClick={openDelegationModal} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:13}} title="Ủy quyền duyệt">🤝</button>}
            {isMobile&&<button onClick={()=>{setChangePwdForm({current:"",next:"",confirm:""});setChangePwdError("");setShowChangePwd(true);}} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:13}} title="Đổi mật khẩu">🔑</button>}
            {isMobile&&<button onClick={handleLogout} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:13,color:"#6b7280"}}>⏏</button>}
          </div>
        </div>

        {isMobile&&isWorkView&&(
          <div style={{display:"flex",gap:6,overflowX:"auto",padding:"8px 12px",background:"#fff",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
            {[...workSubviews,...workExtras].map(w=><button key={w.id} onClick={()=>w.onClick?w.onClick():setView(w.id)} style={{flex:"0 0 auto",padding:"6px 12px",borderRadius:20,border:"1px solid "+(view===w.id?"#4f46e5":"#e5e7eb"),background:view===w.id?"#4f46e5":"#fff",color:view===w.id?"#fff":"#374151",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>{w.icon} {w.shortLabel||w.label}</button>)}
          </div>
        )}

        <div style={{flex:1,overflowY:"auto",padding:isMobile?12:20,paddingBottom:isMobile?"72px":20}}>
        <Suspense fallback={<div style={{padding:40,textAlign:"center",color:"#9ca3af",fontSize:13}}>Đang tải…</div>}>
        <ErrorBoundary key={view} label={getViewMeta(view)?.label||"màn hình này"}>

          {/* DASHBOARD */}
          {view==="dashboard"&&(
            <Dashboard
              currentUser={currentUser} isMobile={isMobile} userDept={userDept}
              execDeptSummary={execDeptSummary} execMonth={execMonth} setExecMonth={setExecMonth} execYear={execYear} setExecYear={setExecYear} staffingAdvice={staffingAdvice} empProfile={empProfile} employees={employees}
              stats={stats} statsW={statsW} deptChart={deptChart}
              myTasks={myTasks} myWorkList={myWorkList} myWorkloadCompare={myWorkloadCompare} myDoneList={myDoneList} myTrend={myTrend}
              atRiskTasks={atRiskTasks} weeklyDigest={weeklyDigest} watchList={watchList} dataHealth={dataHealth} execNarrative={execNarrative} lateInsights={lateInsights}
              computed={computed} overloadedEmps={overloadedEmps}
              dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
              overloadThreshold={overloadThreshold} setOverloadThreshold={setOverloadThreshold}
              kpiOnTime={kpiOnTime} setKpiOnTime={saveKpiOnTime}
              overloadPopup={overloadPopup} setOverloadPopup={setOverloadPopup}
              recurringTemplates={recurringTemplates} setShowRecurring={setShowRecurring}
              statFilter={statFilter} setStatFilter={setStatFilter}
              setView={setView} setFDept={setFDept}
              setModal={setModal} loadComments={loadComments}
              getEmp={getEmp} todayStr={todayStr}
              onReassign={(t,eid)=>{setForwardModal(t);setForwardEid(eid);}}
              pendingProfileId={pendingProfileId} onProfileOpened={()=>setPendingProfileId(null)}
            />
          )}

          {/* VIỆC CHỜ TÔI XỬ LÝ */}
          {view==="myqueue"&&(
            <MyQueue
              myPendingTaskApprovals={myPendingTaskApprovals} myPendingExtRequests={myPendingExtRequests}
              unratedTasks={unratedTasks} unreadCommentTasks={unreadCommentTasks}
              myPendingApprovals={myPendingApprovals}
              myPendingProjectSteps={myPendingProjectSteps} myPendingProjectExt={myPendingProjectExt} myPendingProjectStepExt={myPendingProjectStepExt}
              getEmp={getEmp}
              onOpenTask={t=>{setModal(t);loadComments(t.id);}}
              onOpenOtherTask={id=>{setView("othertasks");setPendingOpenOtherTaskId(id);}}
              onOpenProject={id=>{setView("investment");setPendingOpenProjectId(id);}}
            />
          )}

          {/* TASKS */}
          {view==="tasks"&&(
            <TaskList
              isMobile={isMobile} inp={inp}
              search={search} setSearch={setSearch}
              dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
              fStatus={fStatus} setFStatus={setFStatus}
              fDept={fDept} setFDept={setFDept}
              fEid={fEid} setFEid={setFEid}
              fAssignedByMe={fAssignedByMe} setFAssignedByMe={setFAssignedByMe}
              fSort={fSort} setFSort={setFSort}
              filtered={filtered} paged={paged} page={page} setPage={setPage} totalPages={totalPages}
              canSeeAll={canSeeAll} canCreate={canCreate} canEditTask={canEditTask} canDeleteTask={canDeleteTask} canUpdateProgress={canUpdateProgress} canRequestCompletion={canRequestCompletion} canRate={canRate} canApprove={canApprove}
              employees={employees} userDept={userDept}
              getEmp={getEmp}
              setModal={setModal} loadComments={loadComments}
              openEditTask={openEditTask} toggleDone={toggleDone}
              setDeleteConfirm={setDeleteConfirm}
              rateTask={rateTask} ratingNote={ratingNote} setRatingNote={setRatingNote}
              quickRate={quickRate} setQuickRate={setQuickRate}
              quickProgress={quickProgress} setQuickProgress={setQuickProgress}
              updateTask={updateTask}
              myNewTaskIds={myNewTaskIds}
              onCompleteRequest={t=>{setCompletionNoteModal(t);setCompletionNote("");setCompletionFiles(parseJSON(t.attachments,[]));}}
              openApproveModal={openApproveModal} rejectCompletionRequest={rejectCompletionRequest} remindApproval={remindApproval} currentUser={currentUser}
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
              {calEmpSummary.length>0&&<div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"10px 16px"}}>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:8}}>📊 Hạn chót trong tháng theo nhân viên — bấm để lọc riêng người đó, cân nhắc trước khi giao thêm việc:</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {calEmpFilter!=="all"&&<button onClick={()=>setCalEmpFilter("all")} style={{padding:"3px 10px",border:"1px solid #d1d5db",borderRadius:20,background:"#f9fafb",cursor:"pointer",fontSize:11,color:"#6b7280"}}>✕ Bỏ lọc</button>}
                  {calEmpSummary.map(e=><button key={e.eid} onClick={()=>setCalEmpFilter(f=>f===e.eid?"all":e.eid)} style={{padding:"3px 10px",border:"1px solid "+(calEmpFilter===e.eid?"#4f46e5":"#e5e7eb"),borderRadius:20,background:calEmpFilter===e.eid?"#eef2ff":"#f9fafb",cursor:"pointer",fontSize:11,color:calEmpFilter===e.eid?"#4338ca":"#374151",fontWeight:calEmpFilter===e.eid?600:400}}>{e.name} <span style={{opacity:0.7}}>({e.count})</span></button>)}
                </div>
              </div>}
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
              repStats={repStats} repStatsPrev={repStatsPrev} repTasks={repTasks} repDeptData={repDeptData} repEmpData={repEmpData} repMonthTrend={repMonthTrend}
              leaderboard={leaderboard} managerBoard={managerBoard} managerLeaderboard={managerLeaderboard}
              lateReasonStats={lateReasonStats}
              getEmp={getEmp} setModal={setModal} loadComments={loadComments}
              canExec={true} computed={computedGlobal} monthlyScores={monthlyScores} snapshotMonth={snapshotMonth} syncManagerSnapshots={syncManagerSnapshots} currentUser={currentUser} overloadThreshold={overloadThreshold} kpiOnTime={kpiOnTime}
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
            <Suspense fallback={<div style={{padding:24,textAlign:"center",color:"#9ca3af"}}>Đang tải nhật ký…</div>}>
              <ActivityLog log={activityLog} isMobile={isMobile}/>
            </Suspense>
          )}
          {view==="investment"&&(
            <Investment currentUser={currentUser} employees={employees} users={users} getEmp={getEmp} isMobile={isMobile} inp={inp} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles} showToast={showToast} onScoringChange={refreshScoringData} openProjectId={pendingOpenProjectId} onProjectOpened={()=>setPendingOpenProjectId(null)}/>
          )}
          {view==="othertasks"&&(
            <OtherTasks currentUser={currentUser} employees={employees} getEmp={getEmp} isMobile={isMobile} inp={inp} showToast={showToast} tasksData={otherTasks} setTasksData={setOtherTasks} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles} openTaskId={pendingOpenOtherTaskId} onTaskOpened={()=>setPendingOpenOtherTaskId(null)}/>
          )}
          {view==="supportcases"&&(
            <SupportCases currentUser={currentUser} employees={employees} getEmp={getEmp} isMobile={isMobile} inp={inp} showToast={showToast} onScoringChange={refreshScoringData} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles}/>
          )}
          {view==="feedback"&&(
            <Feedback currentUser={currentUser} isMobile={isMobile} inp={inp} showToast={showToast} canManage={["admin","director"].includes(currentUser?.role)}/>
          )}
          {view==="help"&&(
            <HelpGuide isMobile={isMobile}/>
          )}
          {view==="chatlearn"&&["admin","director"].includes(currentUser?.role)&&(
            <ChatLearningAdmin isMobile={isMobile} showToast={showToast}/>
          )}
          {view==="documents"&&canSeeDocumentsTab&&(
            <Documents currentUser={currentUser} isMobile={isMobile} inp={inp} showToast={showToast} canManage={["admin","director","manager_hcth","manager","deputy_manager"].includes(currentUser?.role)} tasks={tasks} users={users} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles} onOpenTask={(t)=>{setView("tasks");const full=computed.find(x=>x.id===t.id)||t;setModal(full);loadComments(full.id);}} onCreateTask={openCreateTaskFromDoc} projects={projectsForScoring} onProjectsChanged={refreshScoringData}/>
          )}
          {view==="chat"&&(
            <Chat currentUser={currentUser} users={users} isMobile={isMobile} inp={inp} showToast={showToast}/>
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
        </ErrorBoundary>
        </Suspense>
      </div>


      {/* Popup thông báo khi đăng nhập: việc mới + việc trễ hạn */}
      {showLoginPopup&&(<div onClick={()=>setShowLoginPopup(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:isMobile?"12px 8px":16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"20px 20px 12px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:6}}>👋</div><div style={{fontWeight:700,fontSize:16}}>Chào {currentUser?.full_name}!</div><div style={{fontSize:13,color:"#6b7280",marginTop:4}}>Đây là các việc bạn cần lưu ý</div></div>
        <div style={{padding:"0 16px 8px"}}>
          {myOverdueTasks.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#b91c1c",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>🔴 Việc đang trễ hạn ({myOverdueTasks.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myOverdueTasks.map(t=><div key={t.id} onClick={()=>{setShowLoginPopup(false);setModal(t);loadComments(t.id);}} style={{padding:"9px 12px",borderRadius:8,background:"#fef2f2",border:"1px solid #fecaca",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"} onMouseLeave={e=>e.currentTarget.style.background="#fef2f2"}><div style={{fontSize:13,fontWeight:500}}>{t.title}</div><div style={{fontSize:11,color:"#b91c1c",marginTop:1}}>Hạn: {fmtDate(t.deadline)} · {t.dept}</div></div>)}</div>
          </div>}
          {myNewTasks.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>📥 Việc chưa xem ({myNewTasks.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myNewTasks.map(t=><div key={t.id} onClick={()=>{setShowLoginPopup(false);setModal(t);loadComments(t.id);}} style={{padding:"9px 12px",borderRadius:8,background:"#eff6ff",border:"1px solid #bfdbfe",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#dbeafe"} onMouseLeave={e=>e.currentTarget.style.background="#eff6ff"}><div style={{fontSize:13,fontWeight:500}}>{t.title}</div><div style={{fontSize:11,color:"#1d4ed8",marginTop:1}}>{STATUS[t.status]?.label} · Hạn: {fmtDate(t.deadline)} · {t.dept}</div></div>)}</div>
          </div>}
          {myPendingTaskApprovals.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#92400e",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>📨 Nhiệm vụ chờ bạn duyệt ({myPendingTaskApprovals.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myPendingTaskApprovals.map(t=><div key={t.id} onClick={()=>{setShowLoginPopup(false);setModal(t);loadComments(t.id);}} style={{padding:"9px 12px",borderRadius:8,background:"#fffbeb",border:"1px solid #fde68a",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#fef3c7"} onMouseLeave={e=>e.currentTarget.style.background="#fffbeb"}><div style={{fontSize:13,fontWeight:500}}>{t.reminder_at&&"🔔 "}{t.title}</div><div style={{fontSize:11,color:"#92400e",marginTop:1}}>{t.requested_by} yêu cầu duyệt lúc {t.requested_at}</div>{pendingApprovalDays(t)>=2&&<div style={{fontSize:10,color:"#b91c1c",fontWeight:700,marginTop:1}}>⏳ Đã chờ duyệt {pendingApprovalDays(t)} ngày — nên duyệt sớm</div>}</div>)}</div>
          </div>}
          {myPendingExtRequests.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>📅 Đề xuất gia hạn chờ bạn duyệt ({myPendingExtRequests.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myPendingExtRequests.map(t=><div key={t.id} onClick={()=>{setShowLoginPopup(false);setModal(t);loadComments(t.id);}} style={{padding:"9px 12px",borderRadius:8,background:"#eff6ff",border:"1px solid #bfdbfe",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#dbeafe"} onMouseLeave={e=>e.currentTarget.style.background="#eff6ff"}><div style={{fontSize:13,fontWeight:500}}>{t.title}</div><div style={{fontSize:11,color:"#1d4ed8",marginTop:1}}>{t.ext_requested_by} đề xuất gia hạn đến {t.ext_proposed}</div></div>)}</div>
          </div>}
          {myPendingApprovals.length>0&&<div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#92400e",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>📨 Bước chờ bạn duyệt hoàn thành ({myPendingApprovals.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myPendingApprovals.map((a,i)=><div key={i} onClick={()=>{setShowLoginPopup(false);setView("othertasks");}} style={{padding:"9px 12px",borderRadius:8,background:"#fffbeb",border:"1px solid #fde68a",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#fef3c7"} onMouseLeave={e=>e.currentTarget.style.background="#fffbeb"}><div style={{fontSize:13,fontWeight:500}}>{a.taskName}</div><div style={{fontSize:11,color:"#92400e",marginTop:1}}>Bước: {a.content} · {a.requested_by} yêu cầu duyệt</div></div>)}</div>
          </div>}
          {myPendingDocForwards.length>0&&<div style={{marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:"#6d28d9",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>↪️ Văn bản chuyển tới bạn ({myPendingDocForwards.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>{myPendingDocForwards.map(d=><div key={d.id} onClick={()=>{setShowLoginPopup(false);setView("documents");}} style={{padding:"9px 12px",borderRadius:8,background:"#f5f3ff",border:"1px solid #ddd6fe",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#ede9fe"} onMouseLeave={e=>e.currentTarget.style.background="#f5f3ff"}><div style={{fontSize:13,fontWeight:500}}>[{d.doc_number}] {d.title}</div><div style={{fontSize:11,color:"#6d28d9",marginTop:1}}>Có văn bản mới được chuyển tới bạn, chưa xem</div></div>)}</div>
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
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
              <div><div style={{fontWeight:700,fontSize:15}}>✅ Duyệt hoàn thành & đánh giá</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{approveModal.title}</div></div>
              <button onClick={()=>setApproveModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto",flex:1,minHeight:0}}>
              <div style={{padding:"10px 14px",background:"#f8fafc",borderRadius:8,fontSize:12,color:"#374151"}}>
                <div style={{marginBottom:4}}><b>{approveModal.requested_by}</b> yêu cầu lúc {approveModal.requested_at}</div>
                {approveModal.completion_note&&<div style={{fontStyle:"italic",color:"#6b7280",maxHeight:"32vh",overflowY:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>"{approveModal.completion_note}"</div>}
              </div>
              <div>
                <div style={{fontSize:12,color:"#6b7280",marginBottom:8,fontWeight:500}}>Đánh giá kết quả <span style={{color:"#dc2626"}}>*</span></div>
                <div style={{display:"flex",gap:8}}>
                  {Object.entries(RATING).map(([key,r])=><button key={key} onClick={()=>setApproveRating(key)} style={{flex:1,padding:"8px 4px",border:"2px solid "+(approveRating===key?r.col:"#e5e7eb"),borderRadius:8,background:approveRating===key?r.bg:"#fff",cursor:"pointer",fontSize:12,fontWeight:approveRating===key?700:400,color:approveRating===key?r.col:"#6b7280",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:17}}>{r.icon}</span>{r.label}</button>)}
                </div>
              </div>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Nhận xét {["tb","kem"].includes(approveRating)?<span style={{color:"#dc2626"}}>* (bắt buộc khi chấm Trung bình/Kém, tối thiểu 10 ký tự)</span>:"(không bắt buộc)"}</label>
                <input value={approveNote} onChange={e=>setApproveNote(e.target.value)} placeholder="Nhận xét về kết quả công việc..." style={inp}/>
              </div>
            </div>
            <div style={{padding:"12px 20px 16px",display:"flex",gap:8,borderTop:"1px solid #e5e7eb",flexShrink:0,background:"#fff",borderRadius:"0 0 14px 14px"}}>
              <button onClick={()=>setApproveModal(null)} style={{flex:1,padding:10,border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,color:"#374151"}}>Hủy</button>
              <button onClick={confirmApproveCompletion} disabled={!approveRating} style={{flex:2,padding:10,border:"none",borderRadius:8,background:approveRating?"#16a34a":"#d1d5db",color:"#fff",cursor:approveRating?"pointer":"not-allowed",fontSize:13,fontWeight:600}}>Xác nhận duyệt hoàn thành</button>
            </div>
          </div>
        </div>
      )}
      {/* ── ĐỀ XUẤT GIA HẠN DEADLINE (nhân viên được giao) ── */}
      {extRequestModal&&(
        <div onClick={()=>setExtRequestModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontWeight:700,fontSize:15}}>📅 Đề xuất gia hạn deadline</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{extRequestModal.title}</div></div>
              <button onClick={()=>setExtRequestModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"10px 14px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,fontSize:12,color:"#1d4ed8"}}>Hạn chót hiện tại: <b>{fmtDate(extRequestModal.deadline)}</b>. Đề xuất sẽ được gửi tới người giao việc để duyệt.</div>
              <div>
                <label style={{fontSize:12,color:"#374151",fontWeight:600,display:"block",marginBottom:6}}>Đề xuất gia hạn đến ngày <span style={{color:"#dc2626"}}>*</span></label>
                <input type="date" min={extRequestModal.deadline} value={extProposedDate} onChange={e=>setExtProposedDate(e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={{fontSize:12,color:"#374151",fontWeight:600,display:"block",marginBottom:6}}>Lý do xin gia hạn <span style={{color:"#dc2626"}}>*</span></label>
                <textarea value={extReason} onChange={e=>setExtReason(e.target.value)} placeholder="Nêu rõ lý do cần thêm thời gian... (ít nhất 5 ký tự)" rows={3} style={{...inp,resize:"vertical"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setExtRequestModal(null)} style={{flex:1,padding:10,border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,color:"#374151"}}>Hủy</button>
                <button onClick={submitExtRequest} style={{flex:2,padding:10,border:"none",borderRadius:8,background:"#4f46e5",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>Gửi đề xuất</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── DUYỆT/TỪ CHỐI ĐỀ XUẤT GIA HẠN (người giao việc) ── */}
      {extDecideModal&&(
        <div onClick={()=>setExtDecideModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontWeight:700,fontSize:15}}>{extDecideModal.mode==="approve"?"✅ Duyệt gia hạn":"✖ Từ chối gia hạn"}</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{extDecideModal.task.title}</div></div>
              <button onClick={()=>setExtDecideModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{padding:"10px 14px",background:"#f8fafc",borderRadius:8,fontSize:12,color:"#374151"}}>
                <div style={{marginBottom:4}}><b>{extDecideModal.task.ext_requested_by}</b> đề xuất gia hạn đến <b>{fmtDate(extDecideModal.task.ext_proposed)}</b> (hạn hiện tại: {fmtDate(extDecideModal.task.deadline)})</div>
                {extDecideModal.task.ext_reason&&<div style={{fontStyle:"italic",color:"#6b7280"}}>"{extDecideModal.task.ext_reason}"</div>}
              </div>
              {extDecideModal.mode==="approve"?(<>
                <div>
                  <label style={{fontSize:12,color:"#374151",fontWeight:600,display:"block",marginBottom:6}}>Duyệt đến ngày <span style={{color:"#dc2626"}}>*</span></label>
                  <input type="date" max={extDecideModal.task.ext_proposed} value={extDecideDate} onChange={e=>setExtDecideDate(e.target.value)} style={inp}/>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Chỉ được duyệt đúng ngày đề xuất hoặc ngắn hơn.</div>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#374151",fontWeight:600,display:"block",marginBottom:6}}>Lý do {extDecideDate!==extDecideModal.task.ext_proposed?<span style={{color:"#dc2626"}}>* (bắt buộc vì ngắn hơn đề xuất)</span>:"(không bắt buộc)"}</label>
                  <input value={extDecideNote} onChange={e=>setExtDecideNote(e.target.value)} placeholder="Vì sao rút ngắn so với đề xuất..." style={inp}/>
                </div>
              </>):(
                <div>
                  <label style={{fontSize:12,color:"#374151",fontWeight:600,display:"block",marginBottom:6}}>Lý do từ chối <span style={{color:"#dc2626"}}>*</span></label>
                  <textarea value={extDecideNote} onChange={e=>setExtDecideNote(e.target.value)} placeholder="Nêu rõ lý do từ chối gia hạn... (ít nhất 5 ký tự)" rows={3} style={{...inp,resize:"vertical"}}/>
                </div>
              )}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setExtDecideModal(null)} style={{flex:1,padding:10,border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,color:"#374151"}}>Hủy</button>
                <button onClick={confirmExtDecision} style={{flex:2,padding:10,border:"none",borderRadius:8,background:extDecideModal.mode==="approve"?"#16a34a":"#dc2626",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>{extDecideModal.mode==="approve"?"Xác nhận duyệt":"Xác nhận từ chối"}</button>
              </div>
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
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Giao cho *</label><select value={templateForm.data.eid} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,eid:e.target.value}}))} style={inp}>{(employees||[]).filter(e=>e.dept===templateForm.data.dept&&!e.no_kpi).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Tần suất</label><select value={templateForm.data.frequency} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,frequency:e.target.value}}))} style={inp}>{FREQUENCIES.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Deadline (ngày sau khi tạo)</label>{templateForm.data.frequency==="daily"?<div style={{...inp,background:"#f9fafb",color:"#6b7280"}} title="Nhiệm vụ hàng ngày luôn có hạn là ngày hôm sau">Ngày hôm sau 🔒</div>:<input type="number" min={1} max={90} value={templateForm.data.deadline_days} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,deadline_days:Number(e.target.value)}}))} style={inp}/>}</div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Ưu tiên</label><select value={templateForm.data.prio} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,prio:e.target.value}}))} style={inp}><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></div>
                      <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Tạo đầu tiên vào ngày</label><input type="date" value={templateForm.data.next_date} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,next_date:e.target.value}}))} style={inp}/></div>
                    </div>
                    <div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
                      <div style={{padding:"10px 14px",background:"#fff",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6}}><span>👥</span><span style={{fontWeight:500,fontSize:13}}>Người phối hợp</span>{parseJSON(templateForm.data.collab_eids,[]).length>0&&<span style={{background:"#dcfce7",color:"#15803d",fontSize:11,padding:"1px 8px",borderRadius:10}}>{parseJSON(templateForm.data.collab_eids,[]).length}</span>}</div>
                      <div style={{padding:12}}>
                        {(canSeeAll?DEPTS:[templateForm.data.dept].filter(Boolean)).map(dept=>(
                          <div key={dept} style={{marginBottom:10}}>
                            <div style={{fontSize:11,fontWeight:600,color:DEPT_COLOR[dept],marginBottom:6}}>{dept}</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{deptEmps(dept).filter(x=>!x.no_kpi).map(emp=>{const sel=parseJSON(templateForm.data.collab_eids,[]).includes(emp.id);const isAss=templateForm.data.eid===emp.id;return(<button key={emp.id} disabled={isAss} onClick={()=>toggleTemplateCollab(emp.id)} style={{padding:"4px 10px",border:"1.5px solid "+(sel?DEPT_COLOR[dept]:"#e5e7eb"),borderRadius:20,background:sel?DEPT_COLOR[dept]+"18":"#fff",color:sel?DEPT_COLOR[dept]:"#6b7280",cursor:isAss?"default":"pointer",fontSize:12,fontWeight:sel?600:400,opacity:isAss?0.4:1}}>{sel&&"✓ "}{emp.name}{isAss&&" (chính)"}</button>);})}</div>
                          </div>
                        ))}
                        {parseJSON(templateForm.data.collab_eids,[]).length>0&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #e5e7eb"}}><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú phối hợp</label><input value={templateForm.data.collab_note||""} onChange={e=>setTemplateForm(f=>({...f,data:{...f.data,collab_note:e.target.value}}))} placeholder="Nội dung phối hợp..." style={inp}/></div>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button onClick={()=>setTemplateForm(null)} style={{padding:"6px 14px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:12}}>Hủy</button><button onClick={submitTemplate} disabled={saving} style={{padding:"6px 14px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12}}>{saving?"Đang lưu…":templateForm.editId?"Cập nhật":"Tạo mẫu"}</button></div>
                  </div>
                </div>
              )}
              {recurringTemplates.length===0?(<div style={{textAlign:"center",padding:32,color:"#9ca3af"}}><div style={{fontSize:40,marginBottom:8}}>🔄</div><div style={{fontSize:14}}>Chưa có mẫu định kỳ nào</div></div>):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>{recurringTemplates.map(tpl=>{const nd=new Date(tpl.next_date);nd.setHours(0,0,0,0);const daysUntil=Math.ceil((nd-today)/86400000);const isDue=tpl.next_date<=todayStr;return(
                  <div key={tpl.id} style={{border:"1px solid "+(tpl.active?"#e5e7eb":"#f3f4f6"),borderRadius:10,padding:14,background:tpl.active?"#fff":"#f9fafb",opacity:tpl.active?1:0.65}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                      <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,display:"flex",alignItems:"center",gap:6}}>{tpl.title}{tpl.active?<span style={{background:"#dcfce7",color:"#15803d",fontSize:10,padding:"1px 6px",borderRadius:8}}>Hoạt động</span>:<span style={{background:"#f1f5f9",color:"#6b7280",fontSize:10,padding:"1px 6px",borderRadius:8}}>Tạm dừng</span>}</div>{tpl.description&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{tpl.description}</div>}</div>
                      <div style={{display:"flex",gap:4,flexShrink:0}}><button onClick={()=>toggleTemplate(tpl.id,!tpl.active)} style={{padding:"3px 8px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:11,color:tpl.active?"#b91c1c":"#15803d"}}>{tpl.active?"⏸":"▶"}</button><button onClick={()=>setTemplateForm({data:{title:tpl.title,description:tpl.description||"",dept:tpl.dept,eid:tpl.eid,prio:tpl.prio,frequency:tpl.frequency,deadline_days:tpl.deadline_days,active:tpl.active,next_date:tpl.next_date,collab_eids:tpl.collab_eids||"[]",collab_note:tpl.collab_note||""},editId:tpl.id})} style={{padding:"3px 8px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:11}}>✏️</button><button onClick={()=>deleteTemplate(tpl.id)} style={{padding:"3px 8px",border:"1px solid #fca5a5",borderRadius:5,background:"#fff0f0",cursor:"pointer",fontSize:11,color:"#dc2626"}}>🗑️</button></div>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,fontSize:12}}><span style={{background:DEPT_COLOR[tpl.dept]+"22",color:DEPT_COLOR[tpl.dept],padding:"2px 8px",borderRadius:8}}>{tpl.dept}</span><span style={{background:"#f1f5f9",color:"#475569",padding:"2px 8px",borderRadius:8}}>{getEmp(tpl.eid)?.name||"–"}</span>{parseJSON(tpl.collab_eids,[]).length>0&&<span title={parseJSON(tpl.collab_eids,[]).map(id=>getEmp(id)?.name).filter(Boolean).join(", ")} style={{background:"#ede9fe",color:"#7c3aed",padding:"2px 8px",borderRadius:8}}>🤝 {parseJSON(tpl.collab_eids,[]).length}</span>}<span style={{background:"#e0e7ff",color:"#4338ca",padding:"2px 8px",borderRadius:8}}>{FREQUENCIES.find(f=>f.value===tpl.frequency)?.label}</span><span style={{background:"#fef9c3",color:"#92400e",padding:"2px 8px",borderRadius:8}}>Deadline: {tpl.frequency==="daily"?"Ngày hôm sau":`${tpl.deadline_days} ngày`}</span><span style={{background:isDue?"#fee2e2":"#f0fdf4",color:isDue?"#b91c1c":"#15803d",padding:"2px 8px",borderRadius:8,fontWeight:500}}>{isDue?"⚡ Đến hạn tạo":`📅 ${fmtDate(tpl.next_date)} (${daysUntil} ngày nữa)`}</span>{tpl.last_created&&<span style={{color:"#9ca3af",padding:"2px 4px"}}>Lần cuối: {fmtDate(tpl.last_created)}</span>}</div>
                  </div>
                );})}
              </div>)}
            </div>
          </div>
        </div>
      )}

      {/* Task form */}
      {taskForm&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}><span style={{fontWeight:600,fontSize:15}}>{taskForm.editId?"Chỉnh sửa":"Tạo nhiệm vụ mới"}{pendingDocLink&&<span style={{marginLeft:8,fontSize:11,background:"#eef2ff",color:"#4338ca",padding:"2px 8px",borderRadius:8,fontWeight:500}}>🔗 Từ văn bản</span>}</span><button onClick={()=>setTaskForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>{canSelfCreate&&!canCreate&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#1e40af",lineHeight:1.5}}>ℹ️ Việc bạn <b>tự tạo</b> sẽ được giao cho chính bạn và do <b>Trưởng/Phó phòng</b> ghi nhận, duyệt hoàn thành & chấm điểm.</div>}<div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tiêu đề *</label><input value={taskForm.data.title} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,title:e.target.value}}))} placeholder="Nhập tiêu đề..." style={inp}/></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Mô tả</label><textarea value={taskForm.data.description} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,description:e.target.value}}))} rows={2} style={{...inp,resize:"vertical"}}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label>{canAssignAllDepts?<select value={taskForm.data.dept} onChange={e=>changeTaskDept(e.target.value)} style={inp}>{DEPTS.map(d=><option key={d} value={d}>{d}</option>)}</select>:<div style={{...inp,background:"#f9fafb"}}>{taskForm.data.dept}</div>}</div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Giao cho</label>{canSelfCreate&&!canCreate?<div style={{...inp,background:"#f9fafb",color:"#374151",display:"flex",alignItems:"center",gap:6}}>👤 {getEmp(currentUser.employee_id)?.name||"Bạn"} <span style={{color:"#9ca3af",fontSize:11}}>(chính bạn)</span></div>:<><select value={taskForm.data.eid} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,eid:e.target.value}}))} style={inp}>{(employees||[]).filter(e=>e.dept===taskForm.data.dept&&!e.no_kpi).map(e=>{const l=activeLoadByEid[e.id];return <option key={e.id} value={e.id}>{e.name}{l?` — ${l.count} việc`:" — rảnh"}</option>;})}</select>{(()=>{const l=activeLoadByEid[taskForm.data.eid];const over=l&&l.w>=overloadThreshold;return <div style={{fontSize:11,marginTop:4,color:over?"#b91c1c":"#6b7280",fontWeight:over?600:400}}>{over?"🔥 ":"📋 "}{l?`Đang mở: ${l.count} việc (≈${l.w} quy đổi)`:"Chưa có việc nào đang mở"}{over?" — đã quá tải!":""}</div>;})()}</>}</div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ưu tiên</label><select value={taskForm.data.prio} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,prio:e.target.value}}))} style={inp}><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Hạn chót *</label>{deadlineEditable?<input type="date" value={taskForm.data.deadline} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,deadline:e.target.value}}))} style={inp}/>:<div style={{...inp,background:"#f9fafb",color:"#6b7280"}} title="Chỉ người giao việc mới đổi được hạn chót">{taskForm.data.deadline} 🔒</div>}</div></div>{canCreate&&(()=>{const sug=suggestAssignee(taskForm.data.dept);const rel=empReliability[taskForm.data.eid];const dl=taskForm.data.deadline?Math.ceil((new Date(new Date(taskForm.data.deadline).setHours(0,0,0,0))-new Date(new Date().setHours(0,0,0,0)))/86400000):null;const tight=rel?.avgDays!=null&&dl!=null&&dl<rel.avgDays;if((!sug||sug.e.id===taskForm.data.eid)&&rel?.avgDays==null)return null;return <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#075985",lineHeight:1.7}}>{sug&&sug.e.id!==taskForm.data.eid&&<div>💡 Gợi ý người nhận: <b>{sug.e.name}</b> — đang rảnh ({sug.load} quy đổi){sug.onTime!=null?`, đúng hạn ${sug.onTime}%`:""} <button type="button" onClick={()=>setTaskForm(f=>({...f,data:{...f.data,eid:sug.e.id}}))} style={{marginLeft:4,background:"none",border:"none",color:"#0369a1",textDecoration:"underline",cursor:"pointer",fontSize:12,fontWeight:600}}>Chọn</button></div>}{rel?.avgDays!=null&&<div>⏱ {getEmp(taskForm.data.eid)?.name} thường hoàn thành ~{rel.avgDays} ngày{dl!=null?` · hạn hiện còn ${dl} ngày`:""}{tight?" — hơi gấp, cân nhắc nới hạn":""}.</div>}</div>;})()}<div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>⛓ Chờ việc hoàn thành trước (tùy chọn)</label><select value={taskForm.data.depends_on||""} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,depends_on:e.target.value}}))} style={inp}><option value="">— Không phụ thuộc —</option>{(tasks||[]).filter(t=>!t.deleted&&t.dept===taskForm.data.dept&&t.id!==taskForm.editId&&!t.completed).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div><ProgressBar value={taskForm.data.progress||0} editable onChange={v=>setTaskForm(f=>({...f,data:{...f.data,progress:v}}))}/>{!(canSelfCreate&&!canCreate)&&<div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}><div style={{padding:"10px 14px",background:"#f8fafc",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6}}><span>👥</span><span style={{fontWeight:500,fontSize:13}}>Phối hợp</span>{parseJSON(taskForm.data.collab_eids,[]).length>0&&<span style={{background:"#dcfce7",color:"#15803d",fontSize:11,padding:"1px 8px",borderRadius:10}}>{parseJSON(taskForm.data.collab_eids,[]).length}</span>}</div><div style={{padding:12}}>{(canAssignAllDepts?DEPTS:[userDept].filter(Boolean)).map(dept=>(<div key={dept} style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:DEPT_COLOR[dept],marginBottom:6}}>{dept}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{deptEmps(dept).filter(x=>!x.no_kpi).map(emp=>{const sel=parseJSON(taskForm.data.collab_eids,[]).includes(emp.id);const isAss=taskForm.data.eid===emp.id;return(<button key={emp.id} disabled={isAss} onClick={()=>toggleCollab(emp.id)} style={{padding:"4px 10px",border:"1.5px solid "+(sel?DEPT_COLOR[dept]:"#e5e7eb"),borderRadius:20,background:sel?DEPT_COLOR[dept]+"18":"#fff",color:sel?DEPT_COLOR[dept]:"#6b7280",cursor:isAss?"default":"pointer",fontSize:12,fontWeight:sel?600:400,opacity:isAss?0.4:1}}>{sel&&"✓ "}{emp.name}{isAss&&" (chính)"}</button>);})}</div></div>))}{parseJSON(taskForm.data.collab_eids,[]).length>0&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #e5e7eb"}}><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú</label><input value={taskForm.data.collab_note||""} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,collab_note:e.target.value}}))} placeholder="Nội dung phối hợp..." style={inp}/></div>}</div></div>}<div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>📎 Đính kèm file</label><label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"1.5px dashed #d1d5db",borderRadius:8,cursor:"pointer",background:"#f9fafb",fontSize:13,color:"#6b7280"}}><span>🗂️</span><span>{uploadingFiles?"Đang upload...":"Chọn file…"}</span><input type="file" multiple style={{display:"none"}} disabled={uploadingFiles} onChange={async e=>{const files=Array.from(e.target.files);if(!files.length)return;const ex=parseJSON(taskForm.data.attachments,[]);const up=await uploadFiles(files,ex);setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(up)}}));e.target.value="";}}/>
              </label>{parseJSON(taskForm.data.attachments,[]).length>0&&<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>{parseJSON(taskForm.data.attachments,[]).map((att,i)=>(<div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"#f1f5f9",borderRadius:6,fontSize:12}}><span>{att.url&&att.url.startsWith("http")&&!att.url.includes("supabase")?"🔗":getFileIcon(att.name)} {att.name}</span><button onClick={()=>{const a=parseJSON(taskForm.data.attachments,[]);a.splice(i,1);setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(a)}}));}} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14}}>✕</button></div>))}</div>}
              <div style={{marginTop:10,padding:"10px 12px",background:"#f8fafc",border:"1px solid #e5e7eb",borderRadius:8}}><div style={{fontSize:12,color:"#6b7280",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>🔗 Hoặc dán link tài liệu (iDesk, Drive…)</div><div style={{display:"flex",gap:6,flexDirection:isMobile?"column":"row"}}><input value={linkInput.name} onChange={e=>setLinkInput(p=>({...p,name:e.target.value}))} placeholder="Tên tài liệu" style={{...inp,flex:1}}/><input value={linkInput.url} onChange={e=>setLinkInput(p=>({...p,url:e.target.value}))} placeholder="https://idesk..." style={{...inp,flex:2}}/><button onClick={()=>{if(!linkInput.url.trim())return;const url=linkInput.url.trim();const name=linkInput.name.trim()||url.split("/").pop()||"Tài liệu";const a=parseJSON(taskForm.data.attachments,[]);a.push({name,url});setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(a)}}));setLinkInput({name:"",url:""});}} style={{padding:"8px 14px",background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,flexShrink:0}}>+ Thêm link</button></div></div></div></div><div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}><button onClick={()=>{setTaskForm(null);setPendingDocLink(null);}} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={submitTask} disabled={saving||uploadingFiles} style={{padding:"7px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>{saving?"Đang lưu…":taskForm.editId?"Cập nhật":"Tạo nhiệm vụ"}</button></div></div></div>)}

      {/* Employee form */}
      {empForm&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:380,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>{empForm.editId?"Chỉnh sửa":"Thêm nhân viên"}</span><button onClick={()=>setEmpForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Họ và tên *</label><input value={empForm.data.name} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,name:e.target.value}}))} placeholder="Nguyễn Văn A..." style={inp}/></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label><select value={empForm.data.dept} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,dept:e.target.value}}))} style={inp}>{DEPTS.map(d=><option key={d} value={d}>Phòng {d}</option>)}</select></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Chức vụ</label><select value={empForm.data.role} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,role:e.target.value}}))} style={inp}>{ROLES_EMP.map(r=><option key={r} value={r}>{r}</option>)}</select></div><label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#374151",cursor:"pointer",background:"#f8fafc",border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px"}}><input type="checkbox" checked={!!empForm.data.no_kpi} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,no_kpi:e.target.checked}}))} style={{width:16,height:16,flexShrink:0}}/><span>Không giao việc / không tính KPI <span style={{color:"#9ca3af",fontSize:11}}>(khoán lương, bảo vệ…)</span></span></label></div><div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setEmpForm(null)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={submitEmp} disabled={saving} style={{padding:"7px 16px",background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>{empForm.editId?"Cập nhật":"Thêm"}</button></div></div></div>)}

      {/* Task detail */}
      <ErrorBoundary key={modal?.id||"no-modal"} label="chi tiết nhiệm vụ" onRetry={()=>setModal(null)}>
      <TaskModal
        modal={modal} setModal={setModal}
        isMobile={isMobile} inp={inp}
        currentUser={currentUser}
        getEmp={getEmp} getTask={id=>(tasks||[]).find(t=>t.id===id)}
        canEditTask={canEditTask} canDeleteTask={canDeleteTask} canRate={canRate} canApprove={canApprove} canForward={canForward} canSetLateReason={canSetLateReason} canUpdateProgress={canUpdateProgress} canRequestCompletion={canRequestCompletion} canProposeExtension={canProposeExtension}
        canCreate={canCreate}
        comments={comments} commentText={commentText} setCommentText={setCommentText} commentFiles={commentFiles} setCommentFiles={setCommentFiles} commentLoading={commentLoading}
        addComment={addComment} uploadFiles={uploadFiles} uploadingFiles={uploadingFiles}
        updateTask={updateTask}
        toggleDone={toggleDone}
        openApproveModal={openApproveModal} rejectCompletionRequest={rejectCompletionRequest} remindApproval={remindApproval} nudgeTask={nudgeTask}
        openExtRequestModal={openExtRequestModal} openExtApprove={openExtApprove} openExtReject={openExtReject}
        rateTask={rateTask} ratingNote={ratingNote} setRatingNote={setRatingNote}
        setLateReasonFn={setLateReasonFn} lateNote={lateNote} setLateNote={setLateNote} toggleLateExcused={toggleLateExcused}
        openEditTask={openEditTask} canEditOwnSelfTask={canEditOwnSelfTask} updateChecklist={updateChecklist}
        setDeleteConfirm={setDeleteConfirm}
        setForwardModal={setForwardModal} setForwardEid={setForwardEid}
        loadComments={loadComments}
      />
      </ErrorBoundary>
      {/* User modal */}
      {userModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:560,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}><span style={{fontWeight:600,fontSize:15}}>🔐 Quản lý tài khoản</span><button onClick={()=>setUserModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:18}}><div style={{background:"#f8fafc",borderRadius:10,padding:14,marginBottom:16}}><div style={{fontWeight:500,fontSize:13,marginBottom:10}}>{userEditId?"Chỉnh sửa":"Thêm tài khoản"}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Họ tên *</label><input value={userForm.full_name} onChange={e=>setUserForm(f=>({...f,full_name:e.target.value}))} placeholder="Nguyễn Văn A" style={inp}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Tên đăng nhập *</label><input value={userForm.username} onChange={e=>setUserForm(f=>({...f,username:e.target.value}))} placeholder="nguyenvana" style={inp}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Mật khẩu {userEditId?"(để trống nếu không đổi)":"*"}</label><input value={userForm.password} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))} placeholder={userEditId?"Giữ nguyên...":"••••••"} style={inp}/></div><div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Vai trò</label><select value={userForm.role} onChange={e=>setUserForm(f=>({...f,role:e.target.value}))} style={inp}><option value="admin">Quản trị viên</option><option value="director">Ban Giám đốc</option><option value="manager_hcth">TP. HCTH</option><option value="manager">Trưởng phòng</option><option value="deputy_manager">Phó trưởng phòng</option><option value="staff">Nhân viên</option></select></div><div style={{gridColumn:"span 2"}}><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Liên kết nhân viên</label><select value={userForm.employee_id} onChange={e=>setUserForm(f=>({...f,employee_id:e.target.value}))} style={inp}><option value="">-- Không liên kết --</option>{(employees||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept} - {e.role})</option>)}</select></div></div><div style={{display:"flex",gap:8,marginTop:10,justifyContent:"flex-end"}}>{userEditId&&<button onClick={()=>{setUserEditId(null);setUserForm({username:"",password:"",full_name:"",role:"staff",employee_id:""});}} style={{padding:"6px 14px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:12}}>Hủy</button>}<button onClick={submitUser} disabled={saving} style={{padding:"6px 14px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12}}>{userEditId?"Cập nhật":"Thêm"}</button></div></div><div style={{display:"flex",flexDirection:"column",gap:6}}>{users.map(u=>(<div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:8}}><div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontWeight:500,fontSize:13}}>{u.full_name}</span><RoleBadge role={u.role}/></div><div style={{fontSize:12,color:"#9ca3af"}}>@{u.username}{u.employee_id&&` · ${getEmp(u.employee_id)?.name||""}`}</div></div><div style={{display:"flex",gap:6}}><button onClick={()=>resetUserPwd(u)} title="Đặt lại mật khẩu về abc123" style={{padding:"4px 10px",border:"1px solid #fde68a",borderRadius:6,background:"#fffbeb",cursor:"pointer",fontSize:12,color:"#92400e"}}>🔑</button><button onClick={()=>{setUserEditId(u.id);setUserForm({username:u.username,password:"",full_name:u.full_name,role:u.role,employee_id:u.employee_id||""});}} style={{padding:"4px 10px",border:"1px solid #d1d5db",borderRadius:6,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️</button>{u.id!=="admin001"&&<button onClick={()=>deleteUser(u.id)} style={{padding:"4px 10px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>}</div></div>))}</div></div></div></div>)}

      {/* Export */}
      {exModal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:isMobile?"12px 8px":16}}><div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:380,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>📤 Xuất báo cáo</span><button onClick={()=>setExModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button></div><div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Trạng thái</label><select value={exStatus} onChange={e=>setExStatus(e.target.value)} style={inp}><option value="all">Tất cả</option><option value="on_time">Trong hạn</option><option value="nearly_due">Sắp hết hạn</option><option value="overdue">Quá hạn</option><option value="pending_approval">Chờ duyệt</option><option value="completed_late">HT quá hạn</option><option value="completed">Hoàn thành</option></select></div><div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label><select value={exDept} onChange={e=>setExDept(e.target.value)} style={inp}><option value="all">Tất cả</option>{DEPTS.map(d=><option key={d} value={d}>Phòng {d}</option>)}</select></div><div style={{background:"#f9fafb",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#6b7280"}}>Sẽ xuất <strong style={{color:"#111"}}>{computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept)).length}</strong> nhiệm vụ</div></div><div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setExModal(false)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button><button onClick={exportPDF} style={{padding:"7px 16px",background:"#dc2626",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>📄 PDF</button><button onClick={exportCSV} style={{padding:"7px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>⬇️ CSV</button></div></div></div>)}
      {/* Chuyển tiếp nhiệm vụ */}
      {forwardModal&&(<div onClick={()=>setForwardModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:110,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>↪ Chuyển tiếp nhiệm vụ</span><button onClick={()=>setForwardModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div><div style={{padding:18}}><div style={{fontSize:13,color:"#374151",marginBottom:6,fontWeight:500}}>{forwardModal.title}</div><div style={{fontSize:12,color:"#6b7280",marginBottom:16,padding:"8px 12px",background:"#eff6ff",borderRadius:8,lineHeight:1.5}}>Bạn sẽ trở thành <b>người phụ trách</b>, nhân viên được chọn là <b>người thực hiện</b>. Nhiệm vụ không bị nhân đôi.</div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>Chọn nhân viên thực hiện *</label><select value={forwardEid} onChange={e=>setForwardEid(e.target.value)} style={inp}><option value="">— Chọn nhân viên —</option>{(employees||[]).filter(e=>e.dept===forwardModal.dept&&e.id!==forwardModal.eid&&!e.no_kpi).map(e=><option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}</select></div><div style={{padding:"0 18px 18px",display:"flex",gap:10}}><button onClick={()=>setForwardModal(null)} style={{flex:1,padding:"10px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:14}}>Hủy</button><button onClick={forwardTask} disabled={!forwardEid||saving} style={{flex:1,padding:"10px",border:"none",borderRadius:8,background:!forwardEid||saving?"#cbd5e1":"#2563eb",color:"#fff",cursor:!forwardEid||saving?"not-allowed":"pointer",fontSize:14,fontWeight:600}}>{saving?"Đang chuyển…":"Chuyển tiếp"}</button></div></div></div>)}

      {/* ── BÀN GIAO HÀNG LOẠT (nhân viên nghỉ phép dài/nghỉ việc) ── */}
      {showBulkHandoff&&(<div onClick={()=>setShowBulkHandoff(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:110,padding:16}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}><span style={{fontWeight:600,fontSize:15}}>🔁 Bàn giao hàng loạt</span><button onClick={()=>setShowBulkHandoff(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div>
          <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:"#6b7280",padding:"8px 12px",background:"#eff6ff",borderRadius:8,lineHeight:1.5}}>Dùng khi nhân viên nghỉ phép dài/nghỉ việc — chọn người cần bàn giao, tick các việc muốn chuyển, rồi chọn người nhận. Mỗi nhiệm vụ vẫn được ghi lịch sử đầy đủ như chuyển tiếp thường.</div>
            <div>
              <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Từ nhân viên (đang có việc cần bàn giao) *</label>
              <select value={bulkFromEid} onChange={e=>{setBulkFromEid(e.target.value);setBulkSelectedIds([]);}} style={inp}>
                <option value="">— Chọn nhân viên —</option>
                {(canAssignAllDepts?employees:(employees||[]).filter(e=>e.dept===userDept)).map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}
              </select>
            </div>
            {bulkFromEid&&(
              bulkFromOpenTasks.length===0?(
                <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:16}}>Nhân viên này không có việc nào đang mở.</div>
              ):(<>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <label style={{fontSize:12,color:"#6b7280"}}>Chọn việc cần bàn giao ({bulkSelectedIds.length}/{bulkFromOpenTasks.length})</label>
                  <button onClick={()=>setBulkSelectedIds(bulkSelectedIds.length===bulkFromOpenTasks.length?[]:bulkFromOpenTasks.map(t=>t.id))} style={{fontSize:11,color:"#4f46e5",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>{bulkSelectedIds.length===bulkFromOpenTasks.length?"Bỏ chọn tất cả":"Chọn tất cả"}</button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto"}}>
                  {bulkFromOpenTasks.map(t=>(
                    <label key={t.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",border:"1px solid "+(bulkSelectedIds.includes(t.id)?"#a5b4fc":"#e5e7eb"),borderRadius:8,background:bulkSelectedIds.includes(t.id)?"#eef2ff":"#fff",cursor:"pointer"}}>
                      <input type="checkbox" checked={bulkSelectedIds.includes(t.id)} onChange={()=>toggleBulkSelected(t.id)} style={{marginTop:2}}/>
                      <div style={{minWidth:0}}><div style={{fontSize:13,wordBreak:"break-word"}}>{t.title}</div><div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Hạn: {fmtDate(t.deadline)} · {t.dept}</div></div>
                    </label>
                  ))}
                </div>
                <div>
                  <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Sang nhân viên *</label>
                  <select value={bulkToEid} onChange={e=>setBulkToEid(e.target.value)} style={inp}>
                    <option value="">— Chọn nhân viên —</option>
                    {(employees||[]).filter(e=>e.dept===getEmp(bulkFromEid)?.dept&&e.id!==bulkFromEid&&!e.no_kpi).map(e=><option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                  </select>
                </div>
              </>)
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowBulkHandoff(false)} style={{flex:1,padding:10,border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:13,color:"#374151"}}>Hủy</button>
              <button onClick={confirmBulkHandoff} disabled={!bulkToEid||bulkSelectedIds.length===0||bulkRunning} style={{flex:2,padding:10,border:"none",borderRadius:8,background:(!bulkToEid||bulkSelectedIds.length===0||bulkRunning)?"#d1d5db":"#4f46e5",color:"#fff",cursor:(!bulkToEid||bulkSelectedIds.length===0||bulkRunning)?"not-allowed":"pointer",fontSize:13,fontWeight:600}}>{bulkRunning?"Đang bàn giao…":`Bàn giao ${bulkSelectedIds.length} việc`}</button>
            </div>
          </div>
        </div>
      </div>)}

      {/* ── ỦY QUYỀN DUYỆT (Trưởng phòng vắng mặt) ── */}
      {showDelegationModal&&(<div onClick={()=>setShowDelegationModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:110,padding:16}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:520,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}><span style={{fontWeight:600,fontSize:15}}>🤝 Ủy quyền duyệt</span><button onClick={()=>setShowDelegationModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div>
          <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:"#6b7280",padding:"8px 12px",background:"#eff6ff",borderRadius:8,lineHeight:1.5}}>Dùng khi Trưởng phòng đi công tác/nghỉ phép — Phó phòng được ủy quyền sẽ tạm thời duyệt hoàn thành/gia hạn thay trong khoảng ngày đã chọn, tự động hết hiệu lực sau ngày kết thúc.</div>
            {isDelegationAdmin&&(
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Người ủy quyền (Trưởng phòng) *</label>
                <select value={delegatorId} onChange={e=>{setDelegatorId(e.target.value);setDelegateId("");}} style={inp}>
                  <option value="">— Chọn —</option>
                  {managerTierUsers.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            )}
            {delegatorId&&(<>
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Người được ủy quyền (Phó phòng cùng đơn vị) *</label>
                <select value={delegateId} onChange={e=>setDelegateId(e.target.value)} style={inp}>
                  <option value="">— Chọn —</option>
                  {deputyCandidates.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
                {deputyCandidates.length===0&&<div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Không có Phó phòng nào trong đơn vị này.</div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Từ ngày *</label><input type="date" value={delegStart} onChange={e=>setDelegStart(e.target.value)} style={inp}/></div>
                <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Đến ngày *</label><input type="date" min={delegStart} value={delegEnd} onChange={e=>setDelegEnd(e.target.value)} style={inp}/></div>
              </div>
              <button onClick={createDelegation} disabled={!delegateId||!delegEnd} style={{padding:10,border:"none",borderRadius:8,background:(!delegateId||!delegEnd)?"#d1d5db":"#4f46e5",color:"#fff",cursor:(!delegateId||!delegEnd)?"not-allowed":"pointer",fontSize:13,fontWeight:600}}>+ Tạo ủy quyền</button>
            </>)}
            <div style={{borderTop:"1px solid #f3f4f6",paddingTop:12}}>
              <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:8}}>{isDelegationAdmin?"Tất cả ủy quyền":"Ủy quyền của tôi"} ({myDelegations.length})</div>
              {myDelegations.length===0?(<div style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:12}}>Chưa có ủy quyền nào</div>):(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {myDelegations.map(d=>{
                    const isActive=!d.revoked&&d.start_date<=todayStr&&d.end_date>=todayStr;
                    const isExpired=!d.revoked&&d.end_date<todayStr;
                    const delegatorName=(users||[]).find(u=>u.id===d.delegator_id)?.full_name||"?";
                    const delegateName=(users||[]).find(u=>u.id===d.delegate_id)?.full_name||"?";
                    return (
                      <div key={d.id} style={{padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:13}}>{delegatorName} → <b>{delegateName}</b></div>
                          <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{d.start_date} — {d.end_date} · {d.dept}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <span style={{fontSize:11,padding:"2px 8px",borderRadius:8,background:d.revoked?"#f3f4f6":isActive?"#dcfce7":isExpired?"#f3f4f6":"#fef9c3",color:d.revoked?"#9ca3af":isActive?"#15803d":isExpired?"#9ca3af":"#92400e"}}>{d.revoked?"Đã thu hồi":isActive?"Đang hiệu lực":isExpired?"Đã hết hạn":"Sắp tới"}</span>
                          {!d.revoked&&!isExpired&&<button onClick={()=>revokeDelegation(d.id)} style={{padding:"3px 9px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",color:"#dc2626",cursor:"pointer",fontSize:11}}>Thu hồi</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>)}
      {/* Thùng rác */}
      {showTrash&&(<div onClick={()=>setShowTrash(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:560,maxHeight:"85vh",boxShadow:"0 12px 40px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column",overflow:"hidden"}}><div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:600,fontSize:15}}>🗑️ Thùng rác ({trashedTasks.length})</span><button onClick={()=>setShowTrash(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button></div><div style={{overflowY:"auto",padding:"8px 0"}}>{trashedTasks.length===0?<div style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>Thùng rác trống</div>:trashedTasks.map(t=>(<div key={t.id} style={{padding:"10px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,whiteSpace:"normal",wordBreak:"break-word"}}>{t.title}</div><div style={{fontSize:11,color:"#6b7280",marginTop:1}}>{t.dept} · {getEmp(t.eid)?.name||"–"} · Hạn: {fmtDate(t.deadline)}</div></div><div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={()=>restoreTaskFn(t.id)} style={{padding:"5px 10px",border:"1px solid #86efac",borderRadius:6,background:"#f0fdf4",cursor:"pointer",fontSize:12,color:"#15803d"}}>↩ Khôi phục</button><button onClick={()=>{if(window.confirm("Xóa vĩnh viễn nhiệm vụ này? Không thể hoàn tác."))purgeTaskFn(t.id);}} style={{padding:"5px 10px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>Xóa hẳn</button></div></div>))}</div></div></div>)}
      {rateReminderModal&&(<div onClick={()=>setRateReminderModal(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:110,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:440,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        <div style={{padding:"24px 20px 12px",textAlign:"center"}}><div style={{fontSize:44,marginBottom:8}}>⭐</div><div style={{fontWeight:700,fontSize:17,marginBottom:6,color:"#92400e"}}>Cần đánh giá trước khi giao việc mới</div><div style={{fontSize:13,color:"#6b7280",lineHeight:1.5}}>Bạn còn <b style={{color:"#dc2626"}}>{unratedTasks.length} nhiệm vụ</b> đã hoàn thành nhưng chưa đánh giá. Vui lòng đánh giá hết trước khi giao việc mới.</div></div>
        <div style={{padding:"0 16px",maxHeight:240,overflowY:"auto"}}>{unratedTasks.map(t=><div key={t.id} onClick={()=>{setRateReminderModal(false);setModal(t);loadComments(t.id);}} style={{padding:"10px 12px",borderRadius:8,background:"#fffbeb",border:"1px solid #fde68a",marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}} onMouseEnter={e=>e.currentTarget.style.background="#fef3c7"} onMouseLeave={e=>e.currentTarget.style.background="#fffbeb"}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,whiteSpace:"normal",wordBreak:"break-word"}}>{t.title}</div><div style={{fontSize:11,color:"#92400e"}}>{getEmp(t.eid)?.name||"–"} · {t.dept}</div></div><span style={{fontSize:11,color:"#b45309",flexShrink:0,fontWeight:600}}>⭐ Đánh giá →</span></div>)}</div>
        <div style={{padding:"12px 20px 18px"}}><button onClick={()=>setRateReminderModal(false)} style={{width:"100%",padding:"10px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:14,fontWeight:500}}>Đóng</button></div>
      </div></div>)}
      {/* Delete confirm modal */}
      {deleteConfirm&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}><div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:360,boxShadow:"0 12px 40px rgba(0,0,0,0.2)",overflow:"hidden"}}><div style={{padding:"24px 20px 0",textAlign:"center"}}><div style={{fontSize:44,marginBottom:8}}>🗑️</div><div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Xóa nhiệm vụ?</div><div style={{fontSize:13,color:"#6b7280",marginBottom:20,lineHeight:1.5}}>Nhiệm vụ sẽ được chuyển vào Thùng rác.<br/>Bạn có thể khôi phục lại sau nếu cần.</div></div><div style={{padding:"0 20px 20px",display:"flex",gap:10}}><button onClick={()=>setDeleteConfirm(null)} style={{flex:1,padding:"10px",border:"1px solid #d1d5db",borderRadius:8,background:"#f9fafb",cursor:"pointer",fontSize:14,fontWeight:500}}>Hủy</button><button onClick={()=>{deleteTaskFn(deleteConfirm);setDeleteConfirm(null);}} style={{flex:1,padding:"10px",border:"none",borderRadius:8,background:"#dc2626",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>Xóa</button></div></div></div>)}
    </div>
    </div>
    {/* Trợ lý chat — NGOÀI div zoom để popup fixed không bị scale/tràn màn hình mobile */}
    {currentUser&&(
      <Suspense fallback={null}>
        <AssistantChat isMobile={isMobile} me={currentUser?.full_name||currentUser?.username} employees={employees} computed={computed} calcMonthPerf={calcMonthPerf} managerPerf={managerPerf} empReliability={empReliability} activeLoadByEid={activeLoadByEid} getEmp={getEmp} isCompletedStatus={isCompletedStatus} onOpenTask={t=>{setModal(t);loadComments(t.id);}} onOpenProfile={eid=>{setView("dashboard");setPendingProfileId(eid);}} onOpenHelp={()=>setView("help")}/>
      </Suspense>
    )}
    {/* Hướng dẫn nhanh lần đầu — NGOÀI div zoom để không bị tràn/khoá trên mobile */}
    {showQuickStart&&currentUser&&(()=>{
      const tips={
        staff:["📋 Xem \"Công việc của tôi\" — việc gấp/ưu tiên đã tự đưa lên đầu.","📈 Cập nhật % tiến độ (hoặc tick checklist con) để quản lý nắm được.","📨 Xong việc → bấm \"Yêu cầu hoàn thành\" để Trưởng phòng duyệt & chấm điểm.","➕ Có việc tự phát? Bấm \"Tự tạo việc\" để ghi nhận.","🖨 Cuối tháng bấm \"Tự đánh giá\" để in bản tổng kết của mình."],
        manager:["📊 Tổng quan có bảng Nhân sự — bấm 1 người để mở hồ sơ đánh giá.","➕ Khi giao việc, ô \"Giao cho\" hiện luôn ai đang rảnh / ai quá tải.","✅ Duyệt & chấm điểm việc nhân viên gửi (mục 🗂️ Việc chờ xử lý / 🔔).","🩺 Để ý thẻ Sức khỏe dữ liệu & ⚠️ Nguy cơ trễ để chấn chỉnh kịp thời.","🔔 Việc chậm? Bấm \"Nhắc việc\" để đôn đốc (có ghi lịch sử)."],
        director:["📊 Tổng hợp điều hành: chọn 📅 Kỳ và đặt 🎯 Chỉ tiêu KPI (dùng chung).","🚩 Xem thẻ \"Cần chú ý\" — phòng/người đang đi xuống nhiều tháng.","📑 Báo cáo → Xếp loại: chốt sổ điểm & in phiếu bình xét thi đua.","🏛️ Điểm điều hành xếp hạng RIÊNG cho Trưởng/Phó phòng.","📜 Nhật ký: tra cứu toàn bộ thao tác, lọc theo người/ngày & xuất CSV."],
      };
      const role=currentUser.role;
      const list=role==="staff"?tips.staff:["admin","director"].includes(role)?tips.director:tips.manager;
      const roleLabel=ROLE_LABELS[role]||role;
      const dismiss=()=>{localStorage.setItem(`qlcv_qs_${currentUser.username}_v1`,"1");setShowQuickStart(false);};
      return(<div onClick={dismiss} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:460,maxHeight:"88dvh",display:"flex",flexDirection:"column",boxShadow:"0 12px 40px rgba(0,0,0,0.25)",overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#4f46e5,#6366f1)",color:"#fff",padding:"18px 20px",flexShrink:0}}><div style={{fontSize:18,fontWeight:700}}>👋 Chào {currentUser.full_name}!</div><div style={{fontSize:12.5,opacity:0.9,marginTop:3}}>Vài việc nên làm với vai trò <b>{roleLabel}</b>:</div></div>
        <div style={{padding:"14px 20px",overflowY:"auto",flex:1,minHeight:0}}>{list.map((t,i)=>(<div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<list.length-1?"1px solid #f3f4f6":"none",fontSize:13.5,color:"#374151",lineHeight:1.5}}><span style={{color:"#6366f1",fontWeight:700}}>{i+1}.</span><span>{t}</span></div>))}</div>
        <div style={{padding:"12px 20px 18px",display:"flex",gap:8,justifyContent:"flex-end",alignItems:"center",flexWrap:"wrap",borderTop:"1px solid #f3f4f6",flexShrink:0}}><button onClick={()=>{dismiss();setView("help");}} style={{background:"none",border:"none",color:"#6366f1",cursor:"pointer",fontSize:13,textDecoration:"underline"}}>Xem hướng dẫn đầy đủ</button><button onClick={dismiss} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",cursor:"pointer",fontSize:13.5,fontWeight:600}}>Bắt đầu</button></div>
      </div></div>);
    })()}
    {/* MOBILE BOTTOM NAV — ngoài div zoom để position:fixed không bị scale */}
    {isMobile&&(
      <div className="qlcv-bottomnav" style={{position:"fixed",bottom:0,left:0,right:0,background:"#1e1b4b",display:"flex",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",borderTop:"1px solid rgba(255,255,255,0.1)",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        <style>{`.qlcv-bottomnav::-webkit-scrollbar{display:none}`}</style>
        {navItems.map(n=>{const active=n.id==="work"?isWorkView:view===n.id;return(
        <button key={n.id} onClick={()=>{if(n.id==="work")goToWork();else setView(n.id);if(n.id==="security")loadLoginHistory();}} style={{flex:"0 0 auto",minWidth:60,padding:"10px 8px",background:"transparent",border:"none",cursor:"pointer",color:active?"#c7d2fe":"#64748b",display:"flex",flexDirection:"column",alignItems:"center",gap:2,whiteSpace:"nowrap",position:"relative"}}>{!!n.badge&&<span style={{position:"absolute",top:4,right:6,background:"#dc2626",color:"#fff",fontSize:9,fontWeight:700,minWidth:14,height:14,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{n.badge}</span>}<span style={{fontSize:18}}>{n.icon}</span><span style={{fontSize:9}}>{n.shortLabel||n.label}</span></button>
        );})}
        {isAdmin&&<button onClick={()=>setUserModal(true)} style={{flex:"0 0 auto",minWidth:60,padding:"10px 8px",background:"transparent",border:"none",cursor:"pointer",color:"#64748b",display:"flex",flexDirection:"column",alignItems:"center",gap:2,whiteSpace:"nowrap"}}><span style={{fontSize:18}}>🔐</span><span style={{fontSize:9}}>TK</span></button>}
      </div>
    )}
  </>);
}
