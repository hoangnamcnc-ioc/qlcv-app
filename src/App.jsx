import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { supabase } from "./supabase";

const DEPTS = ["HCTH", "QL-KTDL", "HT-NTS"];
const DEPT_COLOR = { "HCTH":"#6366f1","QL-KTDL":"#0ea5e9","HT-NTS":"#10b981" };
const ROLES_EMP = ["Trưởng phòng","Phó trưởng phòng","Chuyên viên","Nhân viên"];
const VI_MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const VI_DAYS = ["CN","T2","T3","T4","T5","T6","T7"];

// ── ROLE CONFIG ──
const ROLE_LABELS = {
  admin:           "Quản trị viên",
  director:        "Ban Giám đốc",
  manager_hcth:    "TP. HCTH (Toàn bộ)",
  manager:         "Trưởng phòng",
  deputy_manager:  "Phó trưởng phòng",
  staff:           "Nhân viên",
};
const ROLE_COLORS = {
  admin:          ["#4338ca","#e0e7ff"],
  director:       ["#7c3aed","#f3e8ff"],
  manager_hcth:   ["#0369a1","#e0f2fe"],
  manager:        ["#15803d","#dcfce7"],
  deputy_manager: ["#0f766e","#ccfbf1"],
  staff:          ["#92400e","#fef9c3"],
};

// Roles with full visibility (see all tasks)
const FULL_ACCESS_ROLES  = ["admin","director","manager_hcth"];
// Roles that can create/assign tasks
const CAN_CREATE_ROLES   = ["admin","director","manager_hcth","manager","deputy_manager"];
// Roles that can edit/delete any task (within scope)
const MANAGER_ROLES      = ["admin","director","manager_hcth","manager","deputy_manager"];

const DEFAULT_EMPLOYEES = [
  {id:"e1",name:"Nguyễn Thị Hoa",dept:"HCTH",role:"Trưởng phòng"},{id:"e2",name:"Trần Văn An",dept:"HCTH",role:"Chuyên viên"},{id:"e3",name:"Lê Thị Mai",dept:"HCTH",role:"Chuyên viên"},{id:"e4",name:"Phạm Văn Bình",dept:"HCTH",role:"Chuyên viên"},{id:"e5",name:"Hoàng Thị Lan",dept:"HCTH",role:"Chuyên viên"},{id:"e6",name:"Đỗ Văn Cường",dept:"HCTH",role:"Nhân viên"},{id:"e7",name:"Vũ Thị Thu",dept:"HCTH",role:"Nhân viên"},{id:"e8",name:"Ngô Văn Đức",dept:"HCTH",role:"Nhân viên"},{id:"e9",name:"Bùi Thị Hạnh",dept:"HCTH",role:"Nhân viên"},{id:"e10",name:"Đinh Văn Hùng",dept:"HCTH",role:"Nhân viên"},{id:"e11",name:"Lý Thị Hương",dept:"HCTH",role:"Nhân viên"},{id:"e12",name:"Trịnh Văn Khoa",dept:"HCTH",role:"Nhân viên"},{id:"e13",name:"Phan Thị Linh",dept:"HCTH",role:"Nhân viên"},
  {id:"e14",name:"Nguyễn Văn Minh",dept:"QL-KTDL",role:"Trưởng phòng"},{id:"e15",name:"Trần Thị Nga",dept:"QL-KTDL",role:"Phó trưởng phòng"},{id:"e16",name:"Lê Văn Nam",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e17",name:"Phạm Thị Oanh",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e18",name:"Hoàng Văn Phong",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e19",name:"Đỗ Thị Quỳnh",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e20",name:"Vũ Văn Sơn",dept:"QL-KTDL",role:"Chuyên viên"},{id:"e21",name:"Ngô Thị Tâm",dept:"QL-KTDL",role:"Nhân viên"},{id:"e22",name:"Bùi Văn Thắng",dept:"QL-KTDL",role:"Nhân viên"},{id:"e23",name:"Đinh Thị Thủy",dept:"QL-KTDL",role:"Nhân viên"},{id:"e24",name:"Lý Văn Tiến",dept:"QL-KTDL",role:"Nhân viên"},{id:"e25",name:"Trịnh Thị Trang",dept:"QL-KTDL",role:"Nhân viên"},{id:"e26",name:"Phan Văn Trung",dept:"QL-KTDL",role:"Nhân viên"},{id:"e27",name:"Cao Thị Tuyết",dept:"QL-KTDL",role:"Nhân viên"},
  {id:"e28",name:"Nguyễn Thị Út",dept:"HT-NTS",role:"Trưởng phòng"},{id:"e29",name:"Trần Văn Việt",dept:"HT-NTS",role:"Phó trưởng phòng"},{id:"e30",name:"Lê Thị Xuân",dept:"HT-NTS",role:"Chuyên viên"},{id:"e31",name:"Phạm Văn Yên",dept:"HT-NTS",role:"Chuyên viên"},{id:"e32",name:"Hoàng Thị Yến",dept:"HT-NTS",role:"Chuyên viên"},{id:"e33",name:"Đỗ Văn Dũng",dept:"HT-NTS",role:"Chuyên viên"},{id:"e34",name:"Vũ Thị Diệu",dept:"HT-NTS",role:"Chuyên viên"},{id:"e35",name:"Ngô Văn Hiếu",dept:"HT-NTS",role:"Nhân viên"},{id:"e36",name:"Bùi Thị Hiền",dept:"HT-NTS",role:"Nhân viên"},{id:"e37",name:"Đinh Văn Lộc",dept:"HT-NTS",role:"Nhân viên"},{id:"e38",name:"Lý Thị Lụa",dept:"HT-NTS",role:"Nhân viên"},{id:"e39",name:"Trịnh Văn Mạnh",dept:"HT-NTS",role:"Nhân viên"},{id:"e40",name:"Phan Thị Nhung",dept:"HT-NTS",role:"Nhân viên"},
];

const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().split("T")[0];};
const today=new Date();today.setHours(0,0,0,0);
const todayStr=today.toISOString().split("T")[0];
const nowStr=()=>new Date().toLocaleString("vi-VN");
const getStatus=t=>{if(t.completed||t.progress===100)return"completed";const dl=new Date(t.deadline);dl.setHours(0,0,0,0);const d=Math.ceil((dl-today)/86400000);if(d<0)return"overdue";if(d<=3)return"nearly_due";return"on_time";};
const STATUS={on_time:{label:"Trong hạn",bg:"#dcfce7",col:"#15803d",dot:"#16a34a"},nearly_due:{label:"Sắp hết hạn",bg:"#fef9c3",col:"#a16207",dot:"#ca8a04"},overdue:{label:"Quá hạn",bg:"#fee2e2",col:"#b91c1c",dot:"#dc2626"},completed:{label:"Hoàn thành",bg:"#e0e7ff",col:"#4338ca",dot:"#6366f1"}};
const PRIO={high:{label:"Cao",bg:"#fee2e2",col:"#b91c1c"},medium:{label:"Trung bình",bg:"#fef9c3",col:"#92400e"},low:{label:"Thấp",bg:"#f1f5f9",col:"#475569"}};
const parseJSON=(v,d=[])=>{try{return JSON.parse(v||JSON.stringify(d));}catch{return d;}};
const getFileIcon=n=>{const e=n.split(".").pop().toLowerCase();if(["jpg","jpeg","png","gif"].includes(e))return"🖼️";if(e==="pdf")return"📄";if(["doc","docx"].includes(e))return"📝";if(["xls","xlsx"].includes(e))return"📊";return"📎";};

const ProgressBar=({value,onChange,editable=false})=>(
  <div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#6b7280"}}>Tiến độ</span><span style={{fontSize:13,fontWeight:600,color:value===100?"#15803d":value>=50?"#92400e":"#1e40af"}}>{value}%</span></div>
    <div style={{height:8,background:"#e5e7eb",borderRadius:8,overflow:"hidden"}}><div style={{height:"100%",width:`${value}%`,background:value===100?"#16a34a":value>=50?"#f59e0b":"#6366f1",borderRadius:8,transition:"width 0.3s"}}/></div>
    {editable&&<input type="range" min={0} max={100} step={5} value={value} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%",marginTop:6,accentColor:"#4f46e5"}}/>}
  </div>
);

const RoleBadge=({role})=>{const[col,bg]=ROLE_COLORS[role]||["#475569","#f1f5f9"];return<span style={{fontSize:11,color:col,background:bg,padding:"2px 8px",borderRadius:8,whiteSpace:"nowrap"}}>{ROLE_LABELS[role]||role}</span>;};

export default function App() {
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  const [currentUser,setCurrentUser]=useState(null);
  const [loginForm,setLoginForm]=useState({username:"",password:""});
  const [loginError,setLoginError]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);
  const [view,setView]=useState("dashboard");
  const [tasks,setTasks]=useState(null);
  const [employees,setEmployees]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [modal,setModal]=useState(null);
  const [taskForm,setTaskForm]=useState(null);
  const [empForm,setEmpForm]=useState(null);
  const [empDeptTab,setEmpDeptTab]=useState("HCTH");
  const [fStatus,setFStatus]=useState("all");
  const [fDept,setFDept]=useState("all");
  const [fEid,setFEid]=useState("all");
  const [search,setSearch]=useState("");
  const [exModal,setExModal]=useState(false);
  const [exStatus,setExStatus]=useState("all");
  const [exDept,setExDept]=useState("all");
  const [toast,setToast]=useState(null);
  const [uploadingFiles,setUploadingFiles]=useState(false);
  const [comments,setComments]=useState({});
  const [commentText,setCommentText]=useState("");
  const [commentLoading,setCommentLoading]=useState(false);
  const [userModal,setUserModal]=useState(false);
  const [users,setUsers]=useState([]);
  const [userForm,setUserForm]=useState({username:"",password:"",full_name:"",role:"staff",employee_id:""});
  const [userEditId,setUserEditId]=useState(null);
  const [calYear,setCalYear]=useState(today.getFullYear());
  const [calMonth,setCalMonth]=useState(today.getMonth());
  const [calDay,setCalDay]=useState(null);
  const [repYear,setRepYear]=useState(today.getFullYear());
  const [repMonth,setRepMonth]=useState(today.getMonth());

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),2500);};

  // ── Permissions ──
  const userDept=useMemo(()=>{
    if(!currentUser||!employees)return null;
    return employees.find(e=>e.id===currentUser.employee_id)?.dept||null;
  },[currentUser,employees]);

  const canSeeAll  = useMemo(()=>FULL_ACCESS_ROLES.includes(currentUser?.role),[currentUser]);
  const canCreate  = useMemo(()=>CAN_CREATE_ROLES.includes(currentUser?.role),[currentUser]);
  const isAdmin    = currentUser?.role==="admin";
  const isDirector = useMemo(()=>["admin","director"].includes(currentUser?.role),[currentUser]);

  const availableDepts=useMemo(()=>canSeeAll?DEPTS:userDept?[userDept]:DEPTS,[canSeeAll,userDept]);

  const canSeeTask=useMemo(()=>(t)=>{
    if(!currentUser)return false;
    if(canSeeAll)return true;
    if(["manager","deputy_manager"].includes(currentUser.role))return t.dept===userDept;
    if(t.eid===currentUser.employee_id)return true;
    return parseJSON(t.collab_eids,[]).includes(currentUser.employee_id);
  },[currentUser,canSeeAll,userDept]);

  const canEditTask=useMemo(()=>(t)=>{
    if(!currentUser)return false;
    if(FULL_ACCESS_ROLES.includes(currentUser.role))return true;
    if(["manager","deputy_manager"].includes(currentUser.role))return t.dept===userDept;
    return false;
  },[currentUser,userDept]);

  // ── Login ──
  const handleLogin=async()=>{
    if(!loginForm.username||!loginForm.password){setLoginError("Vui lòng nhập đầy đủ");return;}
    setLoginLoading(true);setLoginError("");
    const{data,error}=await supabase.from("users").select("*").eq("username",loginForm.username).eq("password",loginForm.password).single();
    if(error||!data)setLoginError("Sai tên đăng nhập hoặc mật khẩu");
    else{setCurrentUser(data);sessionStorage.setItem("qlcv_user",JSON.stringify(data));}
    setLoginLoading(false);
  };
  const handleLogout=()=>{setCurrentUser(null);sessionStorage.removeItem("qlcv_user");};
  useEffect(()=>{const s=sessionStorage.getItem("qlcv_user");if(s)try{setCurrentUser(JSON.parse(s));}catch{};},[]);

  // ── Load data ──
  useEffect(()=>{
    if(!currentUser)return;
    (async()=>{
      setLoading(true);
      try{
        const[{data:ed},{data:td},{data:ud}]=await Promise.all([
          supabase.from("employees").select("*").order("dept"),
          supabase.from("tasks").select("*").order("created",{ascending:false}),
          supabase.from("users").select("*"),
        ]);
        if(!ed||ed.length===0){await supabase.from("employees").insert(DEFAULT_EMPLOYEES);setEmployees(DEFAULT_EMPLOYEES);}
        else setEmployees(ed);
        setTasks(td||[]);
        setUsers(ud||[]);
      }catch{showToast("Lỗi kết nối database","error");setEmployees(DEFAULT_EMPLOYEES);setTasks([]);}
      setLoading(false);
    })();
  },[currentUser]);

  // ── Comments ──
  const loadComments=async id=>{setCommentLoading(true);const{data}=await supabase.from("comments").select("*").eq("task_id",id).order("created_at");setComments(p=>({...p,[id]:data||[]}));setCommentLoading(false);};
  const addComment=async id=>{
    if(!commentText.trim())return;
    const c={id:`c${Date.now()}`,task_id:id,user_name:currentUser.full_name,content:commentText.trim(),created_at:nowStr()};
    await supabase.from("comments").insert(c);
    setComments(p=>({...p,[id]:[...(p[id]||[]),c]}));
    const task=tasks.find(t=>t.id===id);
    if(task){const h=parseJSON(task.history,[]);h.push({action:`Bình luận: "${commentText.trim()}"`,by:currentUser.full_name,at:nowStr()});await supabase.from("tasks").update({history:JSON.stringify(h)}).eq("id",id);setTasks(p=>p.map(t=>t.id===id?{...t,history:JSON.stringify(h)}:t));}
    setCommentText("");
  };

  // ── File upload ──
  const uploadFiles=async(files,existing=[])=>{
    setUploadingFiles(true);const results=[...existing];
    for(const file of files){const fn=`${Date.now()}_${file.name.replace(/\s/g,"_")}`;const{error}=await supabase.storage.from("attachments").upload(fn,file);if(!error){const{data:{publicUrl}}=supabase.storage.from("attachments").getPublicUrl(fn);results.push({name:file.name,url:publicUrl});}else showToast(`Lỗi upload: ${file.name}`,"error");}
    setUploadingFiles(false);return results;
  };

  // ── Task ops ──
  const addTask=async data=>{
    setSaving(true);
    const h=[{action:"Tạo nhiệm vụ",by:currentUser.full_name,at:nowStr()}];
    const t={...data,id:`t${Date.now()}`,completed:data.progress===100,created:todayStr,history:JSON.stringify(h)};
    const{error}=await supabase.from("tasks").insert(t);
    if(!error){setTasks(p=>[t,...p]);showToast("Đã tạo nhiệm vụ");}else showToast("Lỗi","error");
    setSaving(false);
  };
  const updateTask=async(id,updates,note)=>{
    setSaving(true);
    const task=tasks.find(t=>t.id===id);
    if(note&&task){const h=parseJSON(task.history,[]);h.push({action:note,by:currentUser.full_name,at:nowStr()});updates.history=JSON.stringify(h);}
    if(updates.progress===100)updates.completed=true;
    const{error}=await supabase.from("tasks").update(updates).eq("id",id);
    if(!error){setTasks(p=>p.map(t=>t.id===id?{...t,...updates}:t));showToast("Đã cập nhật");}else showToast("Lỗi","error");
    setSaving(false);
  };
  const deleteTaskFn=async id=>{setSaving(true);await supabase.from("tasks").delete().eq("id",id);setTasks(p=>p.filter(t=>t.id!==id));setModal(null);setSaving(false);showToast("Đã xóa");};
  const toggleDone=t=>updateTask(t.id,{completed:!t.completed,progress:!t.completed?100:t.progress},!t.completed?"Đánh dấu hoàn thành":"Bỏ hoàn thành");

  // ── Employee ops ──
  const addEmployee=async d=>{setSaving(true);const e={...d,id:`e${Date.now()}`};await supabase.from("employees").insert(e);setEmployees(p=>[...p,e]);showToast("Đã thêm");setSaving(false);};
  const updateEmployee=async(id,d)=>{setSaving(true);await supabase.from("employees").update(d).eq("id",id);setEmployees(p=>p.map(e=>e.id===id?{...e,...d}:e));setSaving(false);};
  const deleteEmployee=async id=>{setSaving(true);await supabase.from("employees").delete().eq("id",id);setEmployees(p=>p.filter(e=>e.id!==id));setSaving(false);};

  // ── User ops ──
  const submitUser=async()=>{
    if(!userForm.username||!userForm.password||!userForm.full_name)return;
    setSaving(true);
    if(userEditId){await supabase.from("users").update(userForm).eq("id",userEditId);setUsers(p=>p.map(u=>u.id===userEditId?{...u,...userForm}:u));}
    else{const u={...userForm,id:`u${Date.now()}`};await supabase.from("users").insert(u);setUsers(p=>[...p,u]);}
    setUserForm({username:"",password:"",full_name:"",role:"staff",employee_id:""});setUserEditId(null);showToast("Đã lưu tài khoản");setSaving(false);
  };
  const deleteUser=async id=>{await supabase.from("users").delete().eq("id",id);setUsers(p=>p.filter(u=>u.id!==id));};

  // ── Computed ──
  const visibleTasks=useMemo(()=>(tasks||[]).filter(canSeeTask),[tasks,canSeeTask]);
  const computed=useMemo(()=>visibleTasks.map(t=>({...t,status:getStatus(t)})),[visibleTasks]);
  const stats=useMemo(()=>computed.reduce((a,t)=>({...a,total:a.total+1,[t.status]:a[t.status]+1}),{total:0,on_time:0,nearly_due:0,overdue:0,completed:0}),[computed]);
  const deptChart=useMemo(()=>DEPTS.map(d=>{const dt=computed.filter(t=>t.dept===d);return{name:d,"Trong hạn":dt.filter(t=>t.status==="on_time").length,"Sắp hết hạn":dt.filter(t=>t.status==="nearly_due").length,"Quá hạn":dt.filter(t=>t.status==="overdue").length,"Hoàn thành":dt.filter(t=>t.status==="completed").length};}), [computed]);
  const filtered=useMemo(()=>computed.filter(t=>{
    if(fStatus!=="all"&&t.status!==fStatus)return false;
    if(fDept!=="all"&&t.dept!==fDept)return false;
    if(fEid!=="all"&&t.eid!==fEid)return false;
    if(search&&!t.title.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  }),[computed,fStatus,fDept,fEid,search]);

  const calTasks=useMemo(()=>computed.filter(t=>{const d=new Date(t.deadline);return d.getFullYear()===calYear&&d.getMonth()===calMonth;}),[computed,calYear,calMonth]);
  const calTasksByDay=useMemo(()=>{const m={};calTasks.forEach(t=>{const day=new Date(t.deadline).getDate();if(!m[day])m[day]=[];m[day].push(t);});return m;},[calTasks]);
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const firstDay=new Date(calYear,calMonth,1).getDay();

  const repTasks=useMemo(()=>computed.filter(t=>{const d=new Date(t.deadline);return d.getFullYear()===repYear&&d.getMonth()===repMonth;}),[computed,repYear,repMonth]);
  const repStats=useMemo(()=>{const total=repTasks.length,done=repTasks.filter(t=>t.status==="completed").length,over=repTasks.filter(t=>t.status==="overdue").length;return{total,done,over,rate:total?Math.round(done/total*100):0};},[repTasks]);
  const repDeptData=useMemo(()=>DEPTS.map(d=>{const dt=repTasks.filter(t=>t.dept===d);const done=dt.filter(t=>t.status==="completed").length;return{name:d,total:dt.length,done,over:dt.filter(t=>t.status==="overdue").length,rate:dt.length?Math.round(done/dt.length*100):0};}), [repTasks]);
  const repEmpData=useMemo(()=>{const res=(employees||[]).map(emp=>{const et=repTasks.filter(t=>t.eid===emp.id);const done=et.filter(t=>t.status==="completed").length,over=et.filter(t=>t.status==="overdue").length;return{...emp,total:et.length,done,over,rate:et.length?Math.round(done/et.length*100):0};});return res.filter(e=>e.total>0).sort((a,b)=>b.rate-a.rate);},[employees,repTasks]);
  const repMonthTrend=useMemo(()=>{const months=[];for(let i=5;i>=0;i--){const d=new Date(repYear,repMonth-i,1);const m=d.getMonth(),y=d.getFullYear();const mt=computed.filter(t=>{const td=new Date(t.deadline);return td.getFullYear()===y&&td.getMonth()===m;});months.push({name:`T${m+1}`,done:mt.filter(t=>t.status==="completed").length,total:mt.length});}return months;},[computed,repYear,repMonth]);

  const getEmp=id=>(employees||[]).find(e=>e.id===id);
  const deptEmps=dept=>(employees||[]).filter(e=>e.dept===dept);

  const emptyTaskData=()=>{const dept=availableDepts[0];const first=(employees||[]).find(e=>e.dept===dept);return{title:"",description:"",dept,eid:first?.id||"",prio:"medium",deadline:addDays(today,7),attachments:"[]",progress:0,collab_eids:"[]",collab_note:""};};
  const openCreateTask=()=>setTaskForm({data:emptyTaskData(),editId:null});
  const openEditTask=t=>setTaskForm({data:{title:t.title,description:t.description||"",dept:t.dept,eid:t.eid,prio:t.prio,deadline:t.deadline,attachments:t.attachments||"[]",progress:t.progress||0,collab_eids:t.collab_eids||"[]",collab_note:t.collab_note||""},editId:t.id});
  const changeTaskDept=v=>{const f=(employees||[]).find(e=>e.dept===v);setTaskForm(tf=>({...tf,data:{...tf.data,dept:v,eid:f?f.id:""}}));};
  const toggleCollab=empId=>{const cur=parseJSON(taskForm.data.collab_eids,[]);const next=cur.includes(empId)?cur.filter(i=>i!==empId):[...cur,empId];setTaskForm(f=>({...f,data:{...f.data,collab_eids:JSON.stringify(next)}}));};
  const submitTask=async()=>{const{data,editId}=taskForm;if(!data.title||!data.deadline)return;if(editId)await updateTask(editId,data,"Cập nhật nhiệm vụ");else await addTask(data);setTaskForm(null);};

  const openCreateEmp=dept=>setEmpForm({data:{name:"",dept:dept||"HCTH",role:"Nhân viên"},editId:null});
  const openEditEmp=emp=>setEmpForm({data:{name:emp.name,dept:emp.dept,role:emp.role},editId:emp.id});
  const submitEmp=async()=>{const{data,editId}=empForm;if(!data.name.trim())return;if(editId)await updateEmployee(editId,data);else await addEmployee(data);setEmpForm(null);};

  const exportCSV=()=>{
    const rows=computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept));
    const header=["Tiêu đề","Phòng ban","Nhân viên","Phối hợp","Ưu tiên","Hạn chót","Tiến độ","Trạng thái","Ngày tạo"];
    const lines=rows.map(t=>{const emp=getEmp(t.eid);const collab=parseJSON(t.collab_eids,[]).map(id=>getEmp(id)?.name||"").filter(Boolean).join("; ");return[`"${(t.title||"").replace(/"/g,'""')}"`,t.dept,`"${emp?.name||""}"`,`"${collab}"`,PRIO[t.prio]?.label,t.deadline,`${t.progress||0}%`,STATUS[t.status]?.label,t.created||""].join(",");});
    const csv="\uFEFF"+[header.join(","),...lines].join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    const a=document.createElement("a");a.href=url;a.download=`bao-cao-${todayStr}.csv`;a.click();URL.revokeObjectURL(url);setExModal(false);
  };

  const inp={padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:7,fontSize:13,background:"#fff",color:"#111",width:"100%",boxSizing:"border-box"};
  const Chip=({s})=>(<span style={{background:STATUS[s].bg,color:STATUS[s].col,fontSize:12,padding:"2px 8px",borderRadius:12,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:STATUS[s].dot,flexShrink:0}}/>{STATUS[s].label}</span>);
  const PChip=({p})=>(<span style={{background:PRIO[p].bg,color:PRIO[p].col,fontSize:12,padding:"2px 8px",borderRadius:12}}>{PRIO[p].label}</span>);

  const navItems=[
    {id:"dashboard",icon:"📊",label:"Tổng quan"},
    {id:"tasks",    icon:"📋",label:"Nhiệm vụ"},
    {id:"calendar", icon:"📅",label:"Lịch"},
    {id:"reports",  icon:"📈",label:"Báo cáo"},
    {id:"employees",icon:"👥",label:"Nhân viên"},
  ];

  // ════ LOGIN ════
  if(!currentUser)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f0f4ff",fontFamily:"system-ui,sans-serif",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:isMobile?24:36,width:"100%",maxWidth:360,boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
        <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:40,marginBottom:8}}>🗂️</div><div style={{fontWeight:700,fontSize:20,color:"#1e1b4b"}}>Quản lý Công việc</div><div style={{fontSize:13,color:"#6b7280",marginTop:4}}>Đăng nhập để tiếp tục</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tên đăng nhập</label><input value={loginForm.username} onChange={e=>setLoginForm(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="admin" style={inp}/></div>
          <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Mật khẩu</label><input type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••••" style={inp}/></div>
          {loginError&&<div style={{fontSize:12,color:"#b91c1c",background:"#fee2e2",padding:"8px 12px",borderRadius:7}}>{loginError}</div>}
          <button onClick={handleLogin} disabled={loginLoading} style={{padding:10,background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600,marginTop:4}}>{loginLoading?"Đang đăng nhập…":"Đăng nhập"}</button>
        </div>
        <div style={{marginTop:16,fontSize:12,color:"#9ca3af",textAlign:"center"}}>Mặc định: <strong>admin</strong> / <strong>admin123</strong></div>
      </div>
    </div>
  );

  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"sans-serif",color:"#6b7280"}}>Đang tải dữ liệu…</div>;

  return(
    <div style={{display:"flex",flexDirection:isMobile?"column":"row",height:"100vh",fontFamily:"system-ui,sans-serif",background:"#f8fafc",overflow:"hidden"}}>
      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:200,background:toast.type==="error"?"#fee2e2":"#dcfce7",color:toast.type==="error"?"#b91c1c":"#15803d",padding:"10px 18px",borderRadius:8,fontSize:13,boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}}>{toast.msg}</div>}

      {/* SIDEBAR */}
      {!isMobile&&(
        <div style={{width:220,background:"#1e1b4b",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"16px 14px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
            <div style={{color:"#fff",fontWeight:600,fontSize:15}}>🗂️ Quản lý công việc</div>
          </div>
          <nav style={{flex:1,padding:"8px 0"}}>
            {navItems.map(n=>(
              <button key={n.id} onClick={()=>setView(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:view===n.id?"rgba(165,180,252,0.15)":"transparent",border:"none",cursor:"pointer",color:view===n.id?"#c7d2fe":"#94a3b8",textAlign:"left",fontSize:13}}>
                <span>{n.icon}</span>{n.label}
              </button>
            ))}
            {isAdmin&&<button onClick={()=>setUserModal(true)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8",textAlign:"left",fontSize:13}}>🔐 Tài khoản</button>}
          </nav>
          <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",flexDirection:"column",gap:6}}>
            {canSeeAll&&<button onClick={()=>setExModal(true)} style={{background:"rgba(99,102,241,0.25)",border:"none",borderRadius:7,padding:"8px 10px",cursor:"pointer",color:"#c7d2fe",fontSize:13,textAlign:"left"}}>📤 Xuất CSV</button>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div><div style={{color:"#e0e7ff",fontSize:12,fontWeight:500}}>{currentUser.full_name}</div><div style={{marginTop:3}}><RoleBadge role={currentUser.role}/></div></div>
              <button onClick={handleLogout} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:16}} title="Đăng xuất">⏏</button>
            </div>
            {saving&&<div style={{color:"#64748b",fontSize:11,textAlign:"center"}}>Đang lưu…</div>}
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:isMobile?"10px 12px":"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isMobile&&<span style={{fontWeight:700,fontSize:15,color:"#1e1b4b"}}>🗂️</span>}
            <span style={{fontWeight:600,fontSize:isMobile?14:15,color:"#111827"}}>{navItems.find(n=>n.id===view)?.label}</span>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isMobile&&<RoleBadge role={currentUser.role}/>}
            {view==="employees"&&canCreate&&<button onClick={()=>openCreateEmp(empDeptTab)} style={{background:"#0ea5e9",color:"#fff",border:"none",borderRadius:8,padding:isMobile?"5px 10px":"6px 14px",fontSize:isMobile?12:13,cursor:"pointer"}}>+ Thêm NV</button>}
            {["dashboard","tasks","calendar"].includes(view)&&canCreate&&<button onClick={openCreateTask} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:8,padding:isMobile?"5px 10px":"6px 14px",fontSize:isMobile?12:13,cursor:"pointer"}}>+ Tạo việc</button>}
            {isMobile&&<button onClick={handleLogout} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:13,color:"#6b7280"}}>⏏</button>}
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:isMobile?12:20}}>

          {/* DASHBOARD */}
          {view==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {currentUser.role!=="admin"&&(
                <div style={{background:ROLE_COLORS[currentUser.role]?.[1]||"#eef2ff",borderRadius:8,padding:"8px 14px",fontSize:13,color:ROLE_COLORS[currentUser.role]?.[0]||"#4338ca",display:"flex",alignItems:"center",gap:8,border:`1px solid ${ROLE_COLORS[currentUser.role]?.[0]||"#4338ca"}22`}}>
                  <RoleBadge role={currentUser.role}/>
                  <span>
                    {FULL_ACCESS_ROLES.includes(currentUser.role)&&"Bạn đang xem toàn bộ nhiệm vụ của cơ quan."}
                    {["manager","deputy_manager"].includes(currentUser.role)&&`Bạn đang xem nhiệm vụ phòng ${userDept}.`}
                    {currentUser.role==="staff"&&"Bạn đang xem nhiệm vụ được giao và phối hợp."}
                  </span>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(5,1fr)",gap:10}}>
                {[{label:"Tổng",val:stats.total,bg:"#eef2ff",col:"#4338ca"},{label:"Trong hạn",val:stats.on_time,bg:"#dcfce7",col:"#15803d"},{label:"Sắp hết hạn",val:stats.nearly_due,bg:"#fef9c3",col:"#92400e"},{label:"Quá hạn",val:stats.overdue,bg:"#fee2e2",col:"#b91c1c"},{label:"Hoàn thành",val:stats.completed,bg:"#e0e7ff",col:"#4338ca"}].map(c=>(
                  <div key={c.label} style={{background:c.bg,borderRadius:10,padding:isMobile?10:14}}><div style={{fontSize:isMobile?22:26,fontWeight:600,color:c.col}}>{c.val}</div><div style={{fontSize:11,color:c.col,opacity:0.8,marginTop:2}}>{c.label}</div></div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Theo phòng ban</div>
                  <ResponsiveContainer width="100%" height={160}><BarChart data={deptChart} barSize={10}><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} allowDecimals={false}/><Tooltip/><Bar dataKey="Trong hạn" fill="#16a34a" radius={[3,3,0,0]}/><Bar dataKey="Sắp hết hạn" fill="#ca8a04" radius={[3,3,0,0]}/><Bar dataKey="Quá hạn" fill="#dc2626" radius={[3,3,0,0]}/><Bar dataKey="Hoàn thành" fill="#6366f1" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>
                </div>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Tỷ lệ trạng thái</div>
                  <ResponsiveContainer width="100%" height={160}><PieChart><Pie data={[{name:"Trong hạn",value:stats.on_time},{name:"Sắp hết hạn",value:stats.nearly_due},{name:"Quá hạn",value:stats.overdue},{name:"Hoàn thành",value:stats.completed}]} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name,value})=>value>0?`${name}(${value})`:""} labelLine={false} style={{fontSize:9}}>{["#16a34a","#ca8a04","#dc2626","#6366f1"].map((c,i)=><Cell key={i} fill={c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
                {[{s:"overdue",title:"Quá hạn",border:"#fca5a5",hdr:"#fef2f2"},{s:"nearly_due",title:"Sắp hết hạn",border:"#fde68a",hdr:"#fefce8"}].map(({s,title,border,hdr})=>{
                  const list=computed.filter(t=>t.status===s);
                  return(<div key={s} style={{background:"#fff",borderRadius:10,border:`1px solid ${border}`,overflow:"hidden"}}>
                    <div style={{background:hdr,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}><span style={{width:8,height:8,borderRadius:"50%",background:STATUS[s].dot}}/><span style={{fontWeight:600,fontSize:13,color:STATUS[s].col}}>{title} ({list.length})</span></div>
                    <div style={{maxHeight:150,overflowY:"auto"}}>
                      {list.length===0?<div style={{padding:14,textAlign:"center",color:"#9ca3af",fontSize:13}}>Không có</div>
                        :list.map(t=>(<div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);}} style={{padding:"8px 12px",borderBottom:"1px solid #f3f4f6",cursor:"pointer"}}><div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div><div style={{fontSize:11,color:"#6b7280",marginTop:1}}>{t.dept} · {getEmp(t.eid)?.name||"–"} · {t.deadline}</div></div>))
                      }
                    </div>
                  </div>);
                })}
              </div>
            </div>
          )}

          {/* TASK LIST */}
          {view==="tasks"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"10px 12px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm kiếm..." style={{...inp,flex:1,minWidth:120}}/>
                <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{...inp,width:"auto",padding:"6px 8px",fontSize:12}}><option value="all">Tất cả TT</option><option value="on_time">Trong hạn</option><option value="nearly_due">Sắp HH</option><option value="overdue">Quá hạn</option><option value="completed">Hoàn thành</option></select>
                {canSeeAll&&!isMobile&&<select value={fDept} onChange={e=>setFDept(e.target.value)} style={{...inp,width:"auto",padding:"6px 8px",fontSize:12}}><option value="all">Tất cả phòng</option>{DEPTS.map(d=><option key={d} value={d}>{d}</option>)}</select>}
                {canCreate&&!isMobile&&<select value={fEid} onChange={e=>setFEid(e.target.value)} style={{...inp,width:"auto",padding:"6px 8px",fontSize:12}}><option value="all">Tất cả NV</option>{(employees||[]).filter(e=>canSeeAll||e.dept===userDept).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>}
                <span style={{fontSize:12,color:"#9ca3af"}}>{filtered.length}</span>
              </div>
              {isMobile?(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {filtered.length===0&&<div style={{textAlign:"center",color:"#9ca3af",padding:24}}>Không có nhiệm vụ</div>}
                  {filtered.map(t=>{const collabs=parseJSON(t.collab_eids,[]);return(
                    <div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);}} style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:12,cursor:"pointer"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><div style={{fontWeight:500,fontSize:14,flex:1,marginRight:8}}>{t.title}</div><Chip s={t.status}/></div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                        <span style={{background:DEPT_COLOR[t.dept]+"22",color:DEPT_COLOR[t.dept],fontSize:11,padding:"2px 7px",borderRadius:8}}>{t.dept}</span>
                        <span style={{fontSize:12,color:"#6b7280"}}>{getEmp(t.eid)?.name||"–"}</span>
                        {collabs.length>0&&<span style={{fontSize:11,color:"#6b7280"}}>👥{collabs.length}</span>}
                        <span style={{fontSize:12,color:t.status==="overdue"?"#b91c1c":"#6b7280"}}>📅{t.deadline}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1,height:5,background:"#e5e7eb",borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${t.progress||0}%`,background:t.progress===100?"#16a34a":t.progress>=50?"#f59e0b":"#6366f1",borderRadius:5}}/></div>
                        <span style={{fontSize:11,color:"#6b7280"}}>{t.progress||0}%</span>
                        <button onClick={e=>{e.stopPropagation();toggleDone(t);}} style={{padding:"3px 8px",border:"1px solid #d1d5db",borderRadius:5,background:t.completed?"#f9fafb":"#dcfce7",cursor:"pointer",fontSize:12,color:t.completed?"#6b7280":"#15803d"}}>✓</button>
                      </div>
                    </div>
                  );})}
                </div>
              ):(
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                    <thead><tr style={{background:"#f9fafb"}}>{[["Tiêu đề","26%"],["Phòng","8%"],["Nhân viên","12%"],["Phối hợp","12%"],["Tiến độ","12%"],["Hạn chót","10%"],["Trạng thái","12%"],["","8%"]].map(([h,w])=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb",width:w}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filtered.length===0&&<tr><td colSpan={8} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>Không có nhiệm vụ</td></tr>}
                      {filtered.map(t=>{const collabs=parseJSON(t.collab_eids,[]);return(
                        <tr key={t.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                          <td style={{padding:"9px 12px"}}><div onClick={()=>{setModal(t);loadComments(t.id);}} style={{fontWeight:500,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onMouseEnter={e=>e.target.style.color="#4f46e5"} onMouseLeave={e=>e.target.style.color="#111"}>{t.title}</div></td>
                          <td style={{padding:"9px 12px"}}><span style={{background:DEPT_COLOR[t.dept]+"22",color:DEPT_COLOR[t.dept],fontSize:11,padding:"2px 6px",borderRadius:8}}>{t.dept}</span></td>
                          <td style={{padding:"9px 12px",color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getEmp(t.eid)?.name||"–"}</td>
                          <td style={{padding:"9px 12px"}}>{collabs.length>0?(<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{collabs.slice(0,2).map(id=><span key={id} style={{fontSize:10,background:"#f0fdf4",color:"#15803d",padding:"1px 5px",borderRadius:8,whiteSpace:"nowrap"}}>{getEmp(id)?.name||"–"}</span>)}{collabs.length>2&&<span style={{fontSize:10,color:"#9ca3af"}}>+{collabs.length-2}</span>}</div>):<span style={{color:"#d1d5db",fontSize:12}}>—</span>}</td>
                          <td style={{padding:"9px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${t.progress||0}%`,background:t.progress===100?"#16a34a":t.progress>=50?"#f59e0b":"#6366f1",borderRadius:6}}/></div><span style={{fontSize:11,color:"#6b7280",flexShrink:0}}>{t.progress||0}%</span></div></td>
                          <td style={{padding:"9px 12px",fontSize:12,color:t.status==="overdue"?"#b91c1c":"#6b7280",fontWeight:t.status==="overdue"?600:400}}>{t.deadline}</td>
                          <td style={{padding:"9px 12px"}}><Chip s={t.status}/></td>
                          <td style={{padding:"9px 12px"}}><div style={{display:"flex",gap:3}}>
                            <button onClick={()=>toggleDone(t)} style={{padding:"3px 6px",border:"1px solid #d1d5db",borderRadius:5,background:t.completed?"#f9fafb":"#dcfce7",cursor:"pointer",fontSize:12,color:t.completed?"#6b7280":"#15803d"}}>✓</button>
                            {canEditTask(t)&&<button onClick={()=>openEditTask(t)} style={{padding:"3px 6px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️</button>}
                            <button onClick={()=>{setModal(t);loadComments(t.id);}} style={{padding:"3px 6px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:12}}>💬</button>
                            {canEditTask(t)&&<button onClick={()=>deleteTaskFn(t.id)} style={{padding:"3px 6px",border:"1px solid #fca5a5",borderRadius:5,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>}
                          </div></td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CALENDAR */}
          {view==="calendar"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <button onClick={()=>{let m=calMonth-1,y=calYear;if(m<0){m=11;y--;}setCalMonth(m);setCalYear(y);}} style={{padding:"6px 12px",border:"1px solid #d1d5db",borderRadius:7,background:"#f9fafb",cursor:"pointer",fontSize:14}}>‹</button>
                <div style={{fontWeight:600,fontSize:16}}>{VI_MONTHS[calMonth]} {calYear}</div>
                <button onClick={()=>{let m=calMonth+1,y=calYear;if(m>11){m=0;y++;}setCalMonth(m);setCalYear(y);}} style={{padding:"6px 12px",border:"1px solid #d1d5db",borderRadius:7,background:"#f9fafb",cursor:"pointer",fontSize:14}}>›</button>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid #e5e7eb"}}>
                  {VI_DAYS.map(d=><div key={d} style={{padding:"8px 4px",textAlign:"center",fontSize:12,fontWeight:600,color:d==="CN"?"#dc2626":"#6b7280",background:"#f9fafb"}}>{d}</div>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
                  {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} style={{minHeight:isMobile?60:80,border:"0.5px solid #f3f4f6",background:"#fafafa"}}/>)}
                  {Array.from({length:daysInMonth}).map((_,i)=>{
                    const day=i+1;const dayTasks=calTasksByDay[day]||[];
                    const isToday=day===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
                    return(
                      <div key={day} style={{minHeight:isMobile?60:80,border:"0.5px solid #f3f4f6",padding:4,background:isToday?"#f0f4ff":"#fff",cursor:dayTasks.length?"pointer":"default"}} onClick={()=>dayTasks.length&&setCalDay({day,tasks:dayTasks})}>
                        <div style={{fontSize:12,fontWeight:isToday?700:400,width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isToday?"#4f46e5":"transparent",color:isToday?"#fff":"#374151",marginBottom:2}}>{day}</div>
                        {dayTasks.slice(0,isMobile?1:2).map(t=><div key={t.id} style={{fontSize:10,padding:"2px 4px",borderRadius:4,marginBottom:2,background:STATUS[t.status].bg,color:STATUS[t.status].col,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>)}
                        {dayTasks.length>(isMobile?1:2)&&<div style={{fontSize:10,color:"#6b7280"}}>+{dayTasks.length-(isMobile?1:2)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* REPORTS */}
          {view==="reports"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span style={{fontWeight:600,fontSize:14}}>📈 Báo cáo tháng</span>
                <select value={repMonth} onChange={e=>setRepMonth(Number(e.target.value))} style={{...inp,width:"auto",padding:"6px 10px"}}>{VI_MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
                <select value={repYear} onChange={e=>setRepYear(Number(e.target.value))} style={{...inp,width:90,padding:"6px 10px"}}>{[2023,2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select>
                <span style={{fontSize:13,color:"#6b7280"}}>{repTasks.length} nhiệm vụ</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12}}>
                {[{label:"Tổng",val:repStats.total,bg:"#eef2ff",col:"#4338ca",icon:"📋"},{label:"Hoàn thành",val:repStats.done,bg:"#dcfce7",col:"#15803d",icon:"✅"},{label:"Quá hạn",val:repStats.over,bg:"#fee2e2",col:"#b91c1c",icon:"❌"},{label:"Tỷ lệ HT",val:`${repStats.rate}%`,bg:"#fef9c3",col:"#92400e",icon:"⭐"}].map(c=>(
                  <div key={c.label} style={{background:c.bg,borderRadius:10,padding:14}}><div style={{fontSize:20,marginBottom:4}}>{c.icon}</div><div style={{fontSize:24,fontWeight:700,color:c.col}}>{c.val}</div><div style={{fontSize:12,color:c.col,opacity:0.8,marginTop:2}}>{c.label}</div></div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:16}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Hiệu suất phòng ban</div>
                  <ResponsiveContainer width="100%" height={180}><BarChart data={repDeptData} barSize={20}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Bar dataKey="total" name="Tổng" fill="#e0e7ff" radius={[4,4,0,0]}/><Bar dataKey="done" name="HT" fill="#6366f1" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
                </div>
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:16}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Xu hướng 6 tháng</div>
                  <ResponsiveContainer width="100%" height={180}><LineChart data={repMonthTrend}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="total" name="Tổng" stroke="#94a3b8" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="done" name="HT" stroke="#6366f1" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer>
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #e5e7eb",fontWeight:600,fontSize:13}}>Hiệu suất phòng ban</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:"#f9fafb"}}>{["Phòng","Tổng","HT","Quá hạn","Tỷ lệ"].map(h=><th key={h} style={{padding:"8px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
                <tbody>{repDeptData.map(d=><tr key={d.name} style={{borderBottom:"1px solid #f3f4f6"}}><td style={{padding:"10px 16px"}}><span style={{background:DEPT_COLOR[d.name]+"22",color:DEPT_COLOR[d.name],padding:"2px 8px",borderRadius:8,fontSize:12,fontWeight:500}}>{d.name}</span></td><td style={{padding:"10px 16px",fontWeight:500}}>{d.total}</td><td style={{padding:"10px 16px",color:"#15803d"}}>{d.done}</td><td style={{padding:"10px 16px",color:d.over>0?"#b91c1c":"#6b7280"}}>{d.over}</td><td style={{padding:"10px 16px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:80,height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${d.rate}%`,background:d.rate>=80?"#16a34a":d.rate>=50?"#f59e0b":"#dc2626",borderRadius:6}}/></div><span style={{fontSize:12,fontWeight:600,color:d.rate>=80?"#15803d":d.rate>=50?"#92400e":"#b91c1c"}}>{d.rate}%</span></div></td></tr>)}</tbody></table>
              </div>
              {repEmpData.length>0&&(
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",borderBottom:"1px solid #e5e7eb",fontWeight:600,fontSize:13}}>Hiệu suất nhân viên</div>
                  <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:500}}><thead><tr style={{background:"#f9fafb"}}>{["","Nhân viên","Phòng","Tổng","HT","Quá hạn","Tỷ lệ"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
                  <tbody>{repEmpData.map((e,i)=>(
                    <tr key={e.id} style={{borderBottom:"1px solid #f3f4f6",background:i===0?"#f0fdf4":"#fff"}}>
                      <td style={{padding:"9px 12px",fontSize:16}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":""}</td>
                      <td style={{padding:"9px 12px",fontWeight:500}}>{e.name}</td>
                      <td style={{padding:"9px 12px"}}><span style={{background:DEPT_COLOR[e.dept]+"22",color:DEPT_COLOR[e.dept],fontSize:11,padding:"2px 6px",borderRadius:8}}>{e.dept}</span></td>
                      <td style={{padding:"9px 12px"}}>{e.total}</td><td style={{padding:"9px 12px",color:"#15803d",fontWeight:500}}>{e.done}</td>
                      <td style={{padding:"9px 12px",color:e.over>0?"#b91c1c":"#6b7280",fontWeight:e.over>0?600:400}}>{e.over}</td>
                      <td style={{padding:"9px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${e.rate}%`,background:e.rate>=80?"#16a34a":e.rate>=50?"#f59e0b":"#dc2626",borderRadius:6}}/></div><span style={{fontSize:12,fontWeight:700,color:e.rate>=80?"#15803d":e.rate>=50?"#92400e":"#b91c1c"}}>{e.rate}%</span></div></td>
                    </tr>
                  ))}</tbody></table></div>
                </div>
              )}
            </div>
          )}

          {/* EMPLOYEES */}
          {view==="employees"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(canSeeAll?DEPTS:userDept?[userDept]:[]).map(d=><button key={d} onClick={()=>setEmpDeptTab(d)} style={{padding:"7px 16px",border:`2px solid ${empDeptTab===d?DEPT_COLOR[d]:"#d1d5db"}`,borderRadius:8,background:empDeptTab===d?DEPT_COLOR[d]+"18":"#fff",color:empDeptTab===d?DEPT_COLOR[d]:"#6b7280",fontWeight:empDeptTab===d?600:400,cursor:"pointer",fontSize:13}}>Phòng {d} ({deptEmps(d).length})</button>)}
              </div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden"}}>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f9fafb"}}>
                  <span style={{fontWeight:600,fontSize:13}}>Phòng {empDeptTab} — {deptEmps(empDeptTab).length} nhân viên</span>
                  {canCreate&&<button onClick={()=>openCreateEmp(empDeptTab)} style={{background:DEPT_COLOR[empDeptTab],color:"#fff",border:"none",borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer"}}>+ Thêm</button>}
                </div>
                {isMobile?(
                  <div>{deptEmps(empDeptTab).map(emp=>{const et=computed.filter(t=>t.eid===emp.id);const ov=et.filter(t=>t.status==="overdue").length,ac=et.filter(t=>!t.completed).length;return(<div key={emp.id} style={{padding:"12px 14px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:500,fontSize:13}}>{emp.name}</div><div style={{fontSize:11,color:"#6b7280"}}>{emp.role}</div></div><div style={{display:"flex",gap:4,alignItems:"center"}}>{ac>0&&<span style={{background:"#e0e7ff",color:"#4338ca",fontSize:11,padding:"2px 6px",borderRadius:8}}>{ac}</span>}{ov>0&&<span style={{background:"#fee2e2",color:"#b91c1c",fontSize:11,padding:"2px 6px",borderRadius:8}}>!{ov}</span>}{canCreate&&<><button onClick={()=>openEditEmp(emp)} style={{padding:"3px 7px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️</button>{isAdmin&&<button onClick={()=>deleteEmployee(emp.id)} style={{padding:"3px 7px",border:"1px solid #fca5a5",borderRadius:5,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>}</>}</div></div>);})}
                  </div>
                ):(
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
                    <thead><tr style={{background:"#f9fafb"}}>{[["Họ và tên","30%"],["Chức vụ","20%"],["Đang thực hiện","18%"],["Sắp HH","12%"],["Quá hạn","10%"],["","10%"]].map(([h,w])=><th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"#6b7280",borderBottom:"1px solid #e5e7eb",width:w}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {deptEmps(empDeptTab).length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:"#9ca3af"}}>Chưa có nhân viên.</td></tr>}
                      {deptEmps(empDeptTab).map(emp=>{const et=computed.filter(t=>t.eid===emp.id);const ov=et.filter(t=>t.status==="overdue").length,nd=et.filter(t=>t.status==="nearly_due").length,ac=et.filter(t=>!t.completed).length;return(
                        <tr key={emp.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                          <td style={{padding:"10px 14px",fontWeight:500}}>{emp.name}</td>
                          <td style={{padding:"10px 14px",color:"#6b7280"}}>{emp.role}</td>
                          <td style={{padding:"10px 14px"}}>{ac>0?<span style={{background:"#e0e7ff",color:"#4338ca",fontSize:12,padding:"2px 8px",borderRadius:8}}>{ac} nhiệm vụ</span>:<span style={{color:"#9ca3af",fontSize:12}}>Không có</span>}</td>
                          <td style={{padding:"10px 14px"}}>{nd>0?<span style={{background:"#fef9c3",color:"#92400e",fontSize:12,padding:"2px 8px",borderRadius:8}}>⚠ {nd}</span>:"–"}</td>
                          <td style={{padding:"10px 14px"}}>{ov>0?<span style={{background:"#fee2e2",color:"#b91c1c",fontSize:12,padding:"2px 8px",borderRadius:8}}>! {ov}</span>:"–"}</td>
                          <td style={{padding:"10px 14px"}}>{canCreate&&<div style={{display:"flex",gap:4}}><button onClick={()=>openEditEmp(emp)} style={{padding:"3px 7px",border:"1px solid #d1d5db",borderRadius:5,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️</button>{isAdmin&&<button onClick={()=>deleteEmployee(emp.id)} style={{padding:"3px 7px",border:"1px solid #fca5a5",borderRadius:5,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>}</div>}</td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      {isMobile&&(
        <div style={{background:"#1e1b4b",display:"flex",flexShrink:0,borderTop:"1px solid rgba(255,255,255,0.1)"}}>
          {navItems.map(n=><button key={n.id} onClick={()=>setView(n.id)} style={{flex:1,padding:"10px 4px",background:"transparent",border:"none",cursor:"pointer",color:view===n.id?"#c7d2fe":"#64748b",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:18}}>{n.icon}</span><span style={{fontSize:9}}>{n.label}</span></button>)}
          {isAdmin&&<button onClick={()=>setUserModal(true)} style={{flex:1,padding:"10px 4px",background:"transparent",border:"none",cursor:"pointer",color:"#64748b",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:18}}>🔐</span><span style={{fontSize:9}}>TK</span></button>}
        </div>
      )}

      {/* CALENDAR DAY POPUP */}
      {calDay&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16}}>
          <div style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:420,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}>
              <span style={{fontWeight:600,fontSize:15}}>📅 {calDay.day}/{calMonth+1}/{calYear}</span>
              <button onClick={()=>setCalDay(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:8}}>
              {calDay.tasks.map(t=>(<div key={t.id} onClick={()=>{setModal(t);loadComments(t.id);setCalDay(null);}} style={{padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",borderLeft:`4px solid ${STATUS[t.status].dot}`}}><div style={{fontWeight:500,fontSize:13,marginBottom:4}}>{t.title}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Chip s={t.status}/><PChip p={t.prio}/><span style={{fontSize:12,color:"#6b7280"}}>{getEmp(t.eid)?.name||"–"}</span></div><div style={{marginTop:8}}><ProgressBar value={t.progress||0}/></div></div>))}
            </div>
          </div>
        </div>
      )}

      {/* TASK FORM */}
      {taskForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:isMobile?"12px 12px 0 0":12,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
              <span style={{fontWeight:600,fontSize:15}}>{taskForm.editId?"Chỉnh sửa nhiệm vụ":"Tạo nhiệm vụ mới"}</span>
              <button onClick={()=>setTaskForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Tiêu đề *</label><input value={taskForm.data.title} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,title:e.target.value}}))} placeholder="Nhập tiêu đề..." style={inp}/></div>
              <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Mô tả</label><textarea value={taskForm.data.description} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,description:e.target.value}}))} rows={2} style={{...inp,resize:"vertical"}}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label>
                  {canSeeAll?(<select value={taskForm.data.dept} onChange={e=>changeTaskDept(e.target.value)} style={inp}>{DEPTS.map(d=><option key={d} value={d}>{d}</option>)}</select>)
                  :(<div style={{...inp,background:"#f9fafb",color:"#374151"}}>{taskForm.data.dept}</div>)}
                </div>
                <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Giao cho</label>
                  <select value={taskForm.data.eid} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,eid:e.target.value}}))} style={inp}>
                    {(employees||[]).filter(e=>e.dept===taskForm.data.dept).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ưu tiên</label><select value={taskForm.data.prio} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,prio:e.target.value}}))} style={inp}><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></div>
                <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Hạn chót *</label><input type="date" value={taskForm.data.deadline} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,deadline:e.target.value}}))} style={inp}/></div>
              </div>
              <ProgressBar value={taskForm.data.progress||0} editable onChange={v=>setTaskForm(f=>({...f,data:{...f.data,progress:v}}))}/>
              {/* COLLAB */}
              <div style={{border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",background:"#f8fafc",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>👥</span><span style={{fontWeight:500,fontSize:13}}>Nhân viên / Phòng phối hợp</span>
                  {parseJSON(taskForm.data.collab_eids,[]).length>0&&<span style={{background:"#dcfce7",color:"#15803d",fontSize:11,padding:"1px 8px",borderRadius:10}}>{parseJSON(taskForm.data.collab_eids,[]).length} đã chọn</span>}
                </div>
                <div style={{padding:12}}>
                  {DEPTS.map(dept=>(
                    <div key={dept} style={{marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:600,color:DEPT_COLOR[dept],marginBottom:6,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:DEPT_COLOR[dept],display:"inline-block"}}/>Phòng {dept}</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {deptEmps(dept).map(emp=>{const selected=parseJSON(taskForm.data.collab_eids,[]).includes(emp.id);const isAssignee=taskForm.data.eid===emp.id;return(
                          <button key={emp.id} disabled={isAssignee} onClick={()=>toggleCollab(emp.id)}
                            style={{padding:"4px 10px",border:`1.5px solid ${selected?DEPT_COLOR[dept]:"#e5e7eb"}`,borderRadius:20,background:selected?DEPT_COLOR[dept]+"18":"#fff",color:selected?DEPT_COLOR[dept]:"#6b7280",cursor:isAssignee?"default":"pointer",fontSize:12,fontWeight:selected?600:400,opacity:isAssignee?0.4:1}}>
                            {selected&&"✓ "}{emp.name}{isAssignee&&" (chính)"}
                          </button>
                        );})}
                      </div>
                    </div>
                  ))}
                  {parseJSON(taskForm.data.collab_eids,[]).length>0&&(
                    <div style={{marginTop:8,paddingTop:8,borderTop:"1px dashed #e5e7eb"}}>
                      <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Ghi chú phối hợp</label>
                      <input value={taskForm.data.collab_note||""} onChange={e=>setTaskForm(f=>({...f,data:{...f.data,collab_note:e.target.value}}))} placeholder="Nội dung cần phối hợp..." style={inp}/>
                    </div>
                  )}
                </div>
              </div>
              {/* FILE */}
              <div>
                <label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:6}}>📎 Đính kèm file</label>
                <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"1.5px dashed #d1d5db",borderRadius:8,cursor:"pointer",background:"#f9fafb",fontSize:13,color:"#6b7280"}}>
                  <span>🗂️</span><span>{uploadingFiles?"Đang upload...":"Chọn file…"}</span>
                  <input type="file" multiple style={{display:"none"}} disabled={uploadingFiles} onChange={async e=>{const files=Array.from(e.target.files);if(!files.length)return;const ex=parseJSON(taskForm.data.attachments,[]);const up=await uploadFiles(files,ex);setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(up)}}));e.target.value="";}}/>
                </label>
                {parseJSON(taskForm.data.attachments,[]).length>0&&(
                  <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
                    {parseJSON(taskForm.data.attachments,[]).map((att,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"#f1f5f9",borderRadius:6,fontSize:12}}>
                        <span>{getFileIcon(att.name)} {att.name}</span>
                        <button onClick={()=>{const a=parseJSON(taskForm.data.attachments,[]);a.splice(i,1);setTaskForm(f=>({...f,data:{...f.data,attachments:JSON.stringify(a)}}));}} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8,position:"sticky",bottom:0,background:"#fff"}}>
              <button onClick={()=>setTaskForm(null)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button>
              <button onClick={submitTask} disabled={saving||uploadingFiles} style={{padding:"7px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>{saving?"Đang lưu…":taskForm.editId?"Cập nhật":"Tạo nhiệm vụ"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE FORM */}
      {empForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:isMobile?"12px 12px 0 0":12,width:"100%",maxWidth:380,boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:600,fontSize:15}}>{empForm.editId?"Chỉnh sửa":"Thêm nhân viên"}</span>
              <button onClick={()=>setEmpForm(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
              <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Họ và tên *</label><input value={empForm.data.name} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,name:e.target.value}}))} placeholder="Nguyễn Văn A..." style={inp}/></div>
              <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label><select value={empForm.data.dept} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,dept:e.target.value}}))} style={inp}>{DEPTS.map(d=><option key={d} value={d}>Phòng {d}</option>)}</select></div>
              <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Chức vụ</label><select value={empForm.data.role} onChange={e=>setEmpForm(f=>({...f,data:{...f.data,role:e.target.value}}))} style={inp}>{ROLES_EMP.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setEmpForm(null)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button>
              <button onClick={submitEmp} disabled={saving} style={{padding:"7px 16px",background:"#0ea5e9",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>{empForm.editId?"Cập nhật":"Thêm"}</button>
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAIL */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:isMobile?"12px 12px 0 0":12,width:"100%",maxWidth:520,maxHeight:isMobile?"95vh":"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
              <span style={{fontWeight:600,fontSize:15}}>Chi tiết nhiệm vụ</span>
              <button onClick={()=>setModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18,flex:1}}>
              <div style={{fontWeight:600,fontSize:16,marginBottom:8}}>{modal.title}</div>
              {modal.description&&<div style={{fontSize:13,color:"#6b7280",marginBottom:14}}>{modal.description}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:13,marginBottom:14}}>
                {[["Phòng ban",<span style={{background:DEPT_COLOR[modal.dept]+"22",color:DEPT_COLOR[modal.dept],padding:"2px 7px",borderRadius:8,fontSize:12}}>{modal.dept}</span>],["Giao cho",getEmp(modal.eid)?.name||"–"],["Ưu tiên",<PChip p={modal.prio}/>],["Hạn chót",<span style={{color:modal.status==="overdue"?"#b91c1c":"#111",fontWeight:modal.status==="overdue"?600:400}}>{modal.deadline}</span>],["Trạng thái",<Chip s={modal.status}/>],["Ngày tạo",modal.created||"–"]].map(([k,v])=>(<div key={k}><div style={{fontSize:11,color:"#9ca3af",marginBottom:3}}>{k}</div><div>{v}</div></div>))}
              </div>
              {parseJSON(modal.collab_eids,[]).length>0&&(
                <div style={{marginBottom:14,padding:"10px 14px",background:"#f0fdf4",borderRadius:10,border:"1px solid #bbf7d0"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#15803d",marginBottom:8}}>👥 Nhân viên phối hợp</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:modal.collab_note?8:0}}>
                    {parseJSON(modal.collab_eids,[]).map(id=>{const emp=getEmp(id);return emp?(<span key={id} style={{background:"#fff",border:"1px solid #bbf7d0",color:"#15803d",fontSize:12,padding:"3px 10px",borderRadius:20,display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:DEPT_COLOR[emp.dept]||"#16a34a"}}/>{emp.name} <span style={{color:"#9ca3af",fontSize:11}}>({emp.dept})</span></span>):null;})}
                  </div>
                  {modal.collab_note&&<div style={{fontSize:12,color:"#166534",background:"#dcfce7",padding:"6px 10px",borderRadius:6}}>📝 {modal.collab_note}</div>}
                </div>
              )}
              <div style={{marginBottom:14}}><ProgressBar value={modal.progress||0} editable={!!(canCreate||currentUser.employee_id===modal.eid||parseJSON(modal.collab_eids,[]).includes(currentUser.employee_id))} onChange={async v=>{await updateTask(modal.id,{progress:v},`Cập nhật tiến độ: ${v}%`);setModal(t=>({...t,progress:v}));}}/></div>
              {parseJSON(modal.attachments,[]).length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:8}}>📎 File đính kèm</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>{parseJSON(modal.attachments,[]).map((att,i)=>(<a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#f1f5f9",borderRadius:8,textDecoration:"none",color:"#1e40af",fontSize:13}}><span style={{fontSize:18}}>{getFileIcon(att.name)}</span><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</span><span style={{fontSize:11,color:"#6b7280",flexShrink:0}}>⬇</span></a>))}</div>
                </div>
              )}
              {parseJSON(modal.history,[]).length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:8}}>🔄 Lịch sử</div>
                  <div style={{maxHeight:100,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>{parseJSON(modal.history,[]).map((h,i)=>(<div key={i} style={{fontSize:12,padding:"5px 10px",background:"#f8fafc",borderRadius:6,borderLeft:"3px solid #6366f1"}}><span style={{color:"#4338ca",fontWeight:500}}>{h.action}</span><span style={{color:"#9ca3af",marginLeft:8}}>— {h.by} · {h.at}</span></div>))}</div>
                </div>
              )}
              <div>
                <div style={{fontSize:12,color:"#9ca3af",marginBottom:8}}>💬 Bình luận ({(comments[modal.id]||[]).length})</div>
                <div style={{maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
                  {commentLoading&&<div style={{fontSize:12,color:"#9ca3af",textAlign:"center"}}>Đang tải…</div>}
                  {(comments[modal.id]||[]).length===0&&!commentLoading&&<div style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:8}}>Chưa có bình luận</div>}
                  {(comments[modal.id]||[]).map(c=>(<div key={c.id} style={{padding:"8px 12px",background:c.user_name===currentUser.full_name?"#eef2ff":"#f9fafb",borderRadius:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:600,fontSize:12,color:c.user_name===currentUser.full_name?"#4338ca":"#374151"}}>{c.user_name}</span><span style={{fontSize:11,color:"#9ca3af"}}>{c.created_at}</span></div><div style={{fontSize:13}}>{c.content}</div></div>))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&addComment(modal.id)} placeholder="Bình luận… (Enter gửi)" style={{...inp,flex:1}}/>
                  <button onClick={()=>addComment(modal.id)} style={{padding:"7px 14px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>Gửi</button>
                </div>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",position:"sticky",bottom:0,background:"#fff"}}>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{toggleDone(modal);setModal(null);}} style={{padding:"7px 14px",border:"1px solid #d1d5db",borderRadius:7,background:modal.completed?"#f9fafb":"#dcfce7",cursor:"pointer",fontSize:12,color:modal.completed?"#6b7280":"#15803d"}}>{modal.completed?"↩ Bỏ HT":"✓ Hoàn thành"}</button>
                {canEditTask(modal)&&<button onClick={()=>{openEditTask(modal);setModal(null);}} style={{padding:"7px 14px",border:"1px solid #d1d5db",borderRadius:7,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️ Sửa</button>}
              </div>
              {canEditTask(modal)&&<button onClick={()=>deleteTaskFn(modal.id)} style={{padding:"7px 14px",border:"1px solid #fca5a5",borderRadius:7,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>}
            </div>
          </div>
        </div>
      )}

      {/* USER MODAL */}
      {userModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:isMobile?"12px 12px 0 0":12,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff"}}>
              <span style={{fontWeight:600,fontSize:15}}>🔐 Quản lý tài khoản</span>
              <button onClick={()=>setUserModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18}}>
              {/* Role guide */}
              <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#0369a1"}}>
                <div style={{fontWeight:600,marginBottom:6}}>📋 Phân quyền hệ thống:</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:4}}>
                  {[
                    ["director",        "Xem & giao việc toàn cơ quan, toàn quyền"],
                    ["manager_hcth",    "Xem & giao việc toàn cơ quan"],
                    ["manager",         "Xem & giao việc trong phòng mình"],
                    ["deputy_manager",  "Xem & giao việc trong phòng mình"],
                    ["staff",           "Chỉ xem việc được giao & phối hợp"],
                  ].map(([role,desc])=>(
                    <div key={role} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>
                      <RoleBadge role={role}/><span style={{color:"#374151"}}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* User form */}
              <div style={{background:"#f8fafc",borderRadius:10,padding:14,marginBottom:16}}>
                <div style={{fontWeight:500,fontSize:13,marginBottom:10}}>{userEditId?"Chỉnh sửa tài khoản":"Thêm tài khoản mới"}</div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                  <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Họ tên *</label><input value={userForm.full_name} onChange={e=>setUserForm(f=>({...f,full_name:e.target.value}))} placeholder="Nguyễn Văn A" style={inp}/></div>
                  <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Tên đăng nhập *</label><input value={userForm.username} onChange={e=>setUserForm(f=>({...f,username:e.target.value}))} placeholder="nguyenvana" style={inp}/></div>
                  <div><label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Mật khẩu *</label><input value={userForm.password} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))} placeholder="••••••" style={inp}/></div>
                  <div>
                    <label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Vai trò</label>
                    <select value={userForm.role} onChange={e=>setUserForm(f=>({...f,role:e.target.value}))} style={inp}>
                      <option value="admin">Quản trị viên (hệ thống)</option>
                      <option value="director">Ban Giám đốc</option>
                      <option value="manager_hcth">TP. HCTH (Toàn bộ)</option>
                      <option value="manager">Trưởng phòng</option>
                      <option value="deputy_manager">Phó trưởng phòng</option>
                      <option value="staff">Nhân viên</option>
                    </select>
                  </div>
                  <div style={{gridColumn:"span 2"}}>
                    <label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:3}}>Liên kết nhân viên <span style={{color:"#dc2626"}}>(bắt buộc với TP, PTP, NV)</span></label>
                    <select value={userForm.employee_id} onChange={e=>setUserForm(f=>({...f,employee_id:e.target.value}))} style={inp}>
                      <option value="">-- Không liên kết --</option>
                      {(employees||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept} - {e.role})</option>)}
                    </select>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:10,justifyContent:"flex-end"}}>
                  {userEditId&&<button onClick={()=>{setUserEditId(null);setUserForm({username:"",password:"",full_name:"",role:"staff",employee_id:""});}} style={{padding:"6px 14px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:12}}>Hủy</button>}
                  <button onClick={submitUser} disabled={saving} style={{padding:"6px 14px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12}}>{userEditId?"Cập nhật":"Thêm tài khoản"}</button>
                </div>
              </div>
              {/* User list */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {users.map(u=>(
                  <div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:8}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{fontWeight:500,fontSize:13}}>{u.full_name}</span><RoleBadge role={u.role}/></div>
                      <div style={{fontSize:12,color:"#9ca3af"}}>@{u.username}{u.employee_id&&` · ${getEmp(u.employee_id)?.name||""} (${getEmp(u.employee_id)?.dept||""})`}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setUserEditId(u.id);setUserForm({username:u.username,password:u.password,full_name:u.full_name,role:u.role,employee_id:u.employee_id||""});}} style={{padding:"4px 10px",border:"1px solid #d1d5db",borderRadius:6,background:"#f9fafb",cursor:"pointer",fontSize:12}}>✏️</button>
                      {u.id!=="admin001"&&<button onClick={()=>deleteUser(u.id)} style={{padding:"4px 10px",border:"1px solid #fca5a5",borderRadius:6,background:"#fff0f0",cursor:"pointer",fontSize:12,color:"#dc2626"}}>🗑️</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT */}
      {exModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:isMobile?"12px 12px 0 0":12,width:"100%",maxWidth:380,boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:600,fontSize:15}}>📤 Xuất báo cáo</span>
              <button onClick={()=>setExModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
              <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Trạng thái</label><select value={exStatus} onChange={e=>setExStatus(e.target.value)} style={inp}><option value="all">Tất cả</option><option value="on_time">Trong hạn</option><option value="nearly_due">Sắp hết hạn</option><option value="overdue">Quá hạn</option><option value="completed">Hoàn thành</option></select></div>
              <div><label style={{fontSize:12,color:"#6b7280",display:"block",marginBottom:4}}>Phòng ban</label><select value={exDept} onChange={e=>setExDept(e.target.value)} style={inp}><option value="all">Tất cả</option>{DEPTS.map(d=><option key={d} value={d}>Phòng {d}</option>)}</select></div>
              <div style={{background:"#f9fafb",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#6b7280"}}>Sẽ xuất <strong style={{color:"#111"}}>{computed.filter(t=>(exStatus==="all"||t.status===exStatus)&&(exDept==="all"||t.dept===exDept)).length}</strong> nhiệm vụ</div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setExModal(false)} style={{padding:"7px 16px",border:"1px solid #d1d5db",borderRadius:7,background:"none",cursor:"pointer",fontSize:13}}>Hủy</button>
              <button onClick={exportCSV} style={{padding:"7px 16px",background:"#4f46e5",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13}}>⬇️ Tải xuống</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}