const STORAGE_KEY = "lessons_site_data_v1";
const ADMIN_KEY   = "lessons_admin_mode_v1";
const ADMIN_SECRET = "1234"; // ✅ غيّر الرقم السري هنا

const el = (id) => document.getElementById(id);

const viewRoot = el("viewRoot");
const pageTitle = el("pageTitle");
const pageDesc  = el("pageDesc");
const breadcrumb = el("breadcrumb");
const adminBtn = el("adminBtn");
const adminHint = el("adminHint");

const modalOverlay = el("modalOverlay");
const modalClose   = el("modalClose");
const modalTitle   = el("modalTitle");
const modalBody    = el("modalBody");
const modalFoot    = el("modalFoot");

let state = {
  route: { view: "home", sectionId: null, courseId: null },
  data: null,
  adminMode: false,
};

// ✅ بيانات افتراضية تُستخدم إذا لم يوجد أي شيء في LocalStorage (مهم على GitHub Pages لأول مرة)
function defaultData(){
  return {
    sections: [
      {
        id: uid("sec"),
        title: "الحاسب وتقنية المعلومات",
        desc: "التخصص: الدعم الفني للحاسب",
        order: 1,
        courses: [
          {
            id: uid("crs"),
            title: "مقدمة JavaScript (JS-101)",
            desc: "التخصص: الدعم الفني للحاسب",
            order: 1,
            lessons: [
              {
                id: uid("les"),
                title: "الدرس الأول: مقدمة",
                videoUrl: "https://www.youtube.com/watch?v=pa1tqpI02u4",
                desc: "تعرف على JavaScript ولماذا نستخدمها.",
                order: 1
              },
              {
                id: uid("les"),
                title: "الدرس الثاني: المتغيرات",
                videoUrl: "https://www.youtube.com/watch?v=pa1tqpI02u4",
                desc: "شرح المتغيرات وأنواع البيانات.",
                order: 2
              }
            ]
          }
        ]
      },
      {
        id: uid("sec"),
        title: "تقنية الأعمال",
        desc: "التخصص: تقنيات الأعمال المكتبية",
        order: 2,
        courses: [
          {
            id: uid("crs"),
            title: "مبادئ إدارة الأعمال (ادار-101)",
            desc: "التخصص: تقنيات الأعمال المكتبية",
            order: 1,
            lessons: [
              {
                id: uid("les"),
                title: "الدرس الأول",
                videoUrl: "https://www.youtube.com/watch?v=pa1tqpI02u4",
                desc: "مدخل مبسّط لمفاهيم الإدارة.",
                order: 1
              }
            ]
          }
        ]
      }
    ]
  };
}

function uid(prefix="id"){
  return prefix + "_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}


function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultData();
    const parsed = JSON.parse(raw);
    if(!parsed || !Array.isArray(parsed.sections)) return defaultData();
    return parsed;
  }catch(e){
    return defaultData();
  }
}
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); }
function sortByOrder(arr){ return [...arr].sort((a,b)=>(a.order??0)-(b.order??0)); }
function findSection(id){ return state.data.sections.find(s=>s.id===id) || null; }
function findCourse(section, courseId){ return (section.courses||[]).find(c=>c.id===courseId) || null; }

function toYouTubeEmbed(url){
  if(!url) return "";
  const raw = String(url).trim();

  // إذا المستخدم وضع ID فقط
  if(/^[a-zA-Z0-9_-]{8,}$/.test(raw) && !raw.includes("http")){
    return `https://www.youtube-nocookie.com/embed/${raw}?rel=0&modestbranding=1`;
  }

  let u;
  try{ u = new URL(raw); }catch(e){
    return raw;
  }

  const host = (u.hostname||"").toLowerCase();
  const path = (u.pathname||"");

  let id = null;

  // youtu.be/<id>
  if(host.includes("youtu.be")){
    id = path.split("/").filter(Boolean)[0] || null;
  }

  // youtube.com/watch?v=<id>
  if(!id && (host.includes("youtube.com") || host.includes("youtube-nocookie.com"))){
    // /embed/<id>
    if(path.startsWith("/embed/")){
      id = path.split("/")[2] || null;
    }
    // /shorts/<id>
    if(!id && path.startsWith("/shorts/")){
      id = path.split("/")[2] || null;
    }
    // watch?v=
    if(!id){
      id = u.searchParams.get("v");
    }
  }

  // Playlist support
  const list = u.searchParams.get("list");

  if(id){
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  }
  if(list){
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}&rel=0&modestbranding=1`;
  }

  return raw;
}

/* Modal */
function openModal({title, bodyNode, footerNode}){
  modalTitle.textContent = title || "";
  modalBody.innerHTML = "";
  modalFoot.innerHTML = "";
  if(bodyNode) modalBody.appendChild(bodyNode);
  if(footerNode) modalFoot.appendChild(footerNode);
  modalOverlay.classList.remove("hidden");
  modalOverlay.setAttribute("aria-hidden","false");
}
function closeModal(){
  modalOverlay.classList.add("hidden");
  modalOverlay.setAttribute("aria-hidden","true");
  modalTitle.textContent = "";
  modalBody.innerHTML = "";
  modalFoot.innerHTML = "";
}
modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e)=>{ if(e.target===modalOverlay) closeModal(); });
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && !modalOverlay.classList.contains("hidden")) closeModal(); });

/* Breadcrumb */
function renderBreadcrumb(items){
  breadcrumb.innerHTML = "";
  items.forEach((it, idx)=>{
    if(idx>0){
      const sep=document.createElement("span");
      sep.className="sep";
      sep.textContent="›";
      breadcrumb.appendChild(sep);
    }
    const b=document.createElement("button");
    b.type="button";
    b.textContent=it.label;
    b.addEventListener("click", it.onClick);
    breadcrumb.appendChild(b);
  });
}

/* Routing */
function setRoute(route){
  state.route = route;
  const parts=[];
  if(route.view==="home") parts.push("home");
  if(route.view==="section") parts.push("section", route.sectionId);
  if(route.view==="course"){
    parts.push("course", route.sectionId, route.courseId);
    if(route.lessonId) parts.push(route.lessonId);
  }
  location.hash = "#"+parts.join("/");
  render();
}
function parseHash(){
  const h=(location.hash||"#home").replace(/^#/, "");
  const parts=h.split("/").filter(Boolean);
  if(parts.length===0 || parts[0]==="home") return {view:"home", sectionId:null, courseId:null};
  if(parts[0]==="section" && parts[1]) return {view:"section", sectionId:parts[1], courseId:null};
  if(parts[0]==="course" && parts[1] && parts[2]) return {view:"course", sectionId:parts[1], courseId:parts[2], lessonId: parts[3]||null};
  return {view:"home", sectionId:null, courseId:null};
}
window.addEventListener("hashchange", ()=>{ state.route=parseHash(); render(); });

/* Admin */
function isAdmin(){ return state.adminMode===true; }
function setAdminMode(on){ state.adminMode=!!on; localStorage.setItem(ADMIN_KEY, on?"1":"0"); }
function loadAdminMode(){ state.adminMode = localStorage.getItem(ADMIN_KEY)==="1"; }

function makeBtn(text, kind, onClick){
  const b=document.createElement("button");
  b.type="button";
  b.className="btn "+(kind||"btn--ghost");
  b.textContent=text;
  b.addEventListener("click", onClick);
  return b;
}
function inputField({label, placeholder, value="", type="text"}){
  const wrap=document.createElement("div");
  wrap.className="field";
  const lab=document.createElement("label");
  lab.className="label";
  lab.textContent=label;
  const inp=document.createElement("input");
  inp.className="input";
  inp.type=type;
  inp.placeholder=placeholder||"";
  inp.value=value||"";
  wrap.appendChild(lab); wrap.appendChild(inp);
  return {wrap, inp};
}
function textareaField({label, placeholder, value=""}){
  const wrap=document.createElement("div");
  wrap.className="field";
  const lab=document.createElement("label");
  lab.className="label";
  lab.textContent=label;
  const ta=document.createElement("textarea");
  ta.className="textarea";
  ta.placeholder=placeholder||"";
  ta.value=value||"";
  wrap.appendChild(lab); wrap.appendChild(ta);
  return {wrap, ta};
}

function adminLoginModal(){
  const body=document.createElement("div");
  const f=inputField({label:"أدخل الرقم السري", placeholder:"••••", type:"password"});
  body.appendChild(f.wrap);

  const foot=document.createElement("div");
  foot.appendChild(makeBtn("دخول","btn--primary", ()=>{
    if(f.inp.value===ADMIN_SECRET){
      setAdminMode(true);
      closeModal(); render();
    }else{
      f.inp.value=""; f.inp.placeholder="الرقم غير صحيح"; f.inp.focus();
    }
  }));
  foot.appendChild(makeBtn("إلغاء","btn--ghost", closeModal));
  openModal({title:"لوحة التحكم", bodyNode:body, footerNode:foot});
}

/* ✅ استيراد JSON (مثل الملف المرفق) */
function importJsonModal(){
  const body=document.createElement("div");

  const info=document.createElement("div");
  info.className="help";
  info.textContent="ارفع ملف JSON (مصفوفة عناصر) مثل الملف المرفق. سيتم إنشاء أقسام ومقررات تلقائيًا، والدروس ستكون فارغة حتى تضيفها.";
  body.appendChild(info);

  const fileWrap=document.createElement("div");
  fileWrap.className="field";
  const lab=document.createElement("label");
  lab.className="label";
  lab.textContent="ملف JSON";
  const inp=document.createElement("input");
  inp.className="input";
  inp.type="file";
  inp.accept=".json,application/json";
  fileWrap.appendChild(lab);
  fileWrap.appendChild(inp);
  body.appendChild(fileWrap);

  const foot=document.createElement("div");
  foot.appendChild(makeBtn("استيراد (استبدال البيانات)","btn--primary", ()=>{
    const f=inp.files && inp.files[0];
    if(!f) return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const rows=JSON.parse(String(reader.result||""));
        const newData = buildDataFromRows(rows);
        if(!newData.sections.length){
          alert("لم يتم العثور على بيانات صالحة داخل الملف.");
          return;
        }
        state.data = newData;
        saveData();
        closeModal();
        setRoute({view:"home"});
      }catch(e){
        alert("ملف JSON غير صالح.");
      }
    };
    reader.readAsText(f, "utf-8");
  }));
  foot.appendChild(makeBtn("إلغاء","btn--ghost", closeModal));
  openModal({title:"استيراد البيانات من JSON", bodyNode:body, footerNode:foot});
}

function buildDataFromRows(rows){
  const data = { sections: [] };
  if(!Array.isArray(rows)) return data;

  const secMap = new Map();
  let secOrder=0;

  rows.forEach((r)=>{
    if(!r || typeof r!=="object") return;

    const القسم = String(r["القسم"] ?? "").trim();
    const التخصص = String(r["التخصص"] ?? "").trim();
    const code = String(r["المقرر"] ?? "").trim();
    const name = String(r["اسم المقرر"] ?? "").trim();

    if(!القسم || (!code && !name)) return;

    let sec = secMap.get(القسم);
    if(!sec){
      secOrder += 1;
      sec = { id: uid("sec"), title: القسم, desc: التخصص ? `التخصص: ${التخصص}` : "", order: secOrder, courses: [] };
      sec.__courseMap = new Map();
      secMap.set(القسم, sec);
      data.sections.push(sec);
    }

    const key = (code+"|"+name).toLowerCase();
    if(sec.__courseMap.has(key)) return;

    const order = (sec.courses.length)+1;
    const courseTitle = (code && name) ? `${name} (${code})` : (name || code);
    const courseDescParts = [];
    if(التخصص) courseDescParts.push(`التخصص: ${التخصص}`);
    if(code && !courseTitle.includes(code)) courseDescParts.push(`المقرر: ${code}`);
    const courseDesc = courseDescParts.join(" • ");

    const course = { id: uid("crs"), title: courseTitle, desc: courseDesc, order, lessons: [] };
    sec.courses.push(course);
    sec.__courseMap.set(key, true);
  });

  data.sections.forEach(s=>{ delete s.__courseMap; });

  return data;
}

/* Card */
function card({badge, title, desc, countBadges=null, primaryText="عرض", onPrimary, secondary, draggable=false, dragMeta=null, extraAdminBar=null}){
  const c=document.createElement("div");
  c.className="card"+(draggable?" draggable":"");
  if(draggable){
    c.setAttribute("draggable","true");
    c.dataset.drag=JSON.stringify(dragMeta||{});
  }

  if(badge){
    const b=document.createElement("div");
    b.className="card__badge";
    b.textContent=badge;
    c.appendChild(b);
  }
  if(Array.isArray(countBadges) && countBadges.length){
    const wrap=document.createElement("div");
    wrap.className="countbadges";
    countBadges.forEach(txt=>{
      const cb=document.createElement("div");
      const isCourses = txt.startsWith("المقررات");
      cb.className="countbadge " + (isCourses ? "countbadge--courses" : "countbadge--lessons");

      const icon=document.createElement("div");
      icon.className="countbadge__icon";
      icon.textContent = isCourses ? "📘" : "🎬";

      const span=document.createElement("span");
      span.textContent = txt;

      cb.appendChild(icon);
      cb.appendChild(span);
      wrap.appendChild(cb);
    });
    c.appendChild(wrap);
  }

  const h=document.createElement("h3");
  h.className="card__title";
  h.textContent=title;
  c.appendChild(h);

  const p=document.createElement("p");
  p.className="card__desc";
  p.textContent=desc||"";
  c.appendChild(p);

  const actions=document.createElement("div");
  actions.className="card__actions";
  actions.appendChild(makeBtn(primaryText,"btn--primary", onPrimary));

  if(secondary){
    secondary.forEach(x=>actions.appendChild(x));
  }
  c.appendChild(actions);

  if(extraAdminBar) c.appendChild(extraAdminBar);

  return c;
}

/* Drag & Drop */
let dragPayload=null;
function safeJson(s){ try{return JSON.parse(s||"{}");}catch(e){return {};} }
function attachDnD(container, onReorder){
  container.addEventListener("dragstart",(e)=>{
    const t=e.target.closest("[draggable='true']");
    if(!t) return;
    dragPayload={from:t, meta:safeJson(t.dataset.drag)};
    e.dataTransfer.effectAllowed="move";
  });
  container.addEventListener("dragover",(e)=>{
    if(!dragPayload) return;
    e.preventDefault();
    const t=e.target.closest("[draggable='true']");
    if(t && t!==dragPayload.from) t.classList.add("drag-over");
  });
  container.addEventListener("dragleave",(e)=>{
    const t=e.target.closest("[draggable='true']");
    if(t) t.classList.remove("drag-over");
  });
  container.addEventListener("drop",(e)=>{
    if(!dragPayload) return;
    e.preventDefault();
    const t=e.target.closest("[draggable='true']");
    if(t) t.classList.remove("drag-over");
    if(!t || t===dragPayload.from){ dragPayload=null; return; }
    onReorder(dragPayload.meta, safeJson(t.dataset.drag));
    dragPayload=null;
  });
  container.addEventListener("dragend", ()=>{
    dragPayload=null;
    container.querySelectorAll(".drag-over").forEach(n=>n.classList.remove("drag-over"));
  });
}
function reorderByIds(list, fromId, toId){
  const a=[...list];
  const i=a.findIndex(x=>x.id===fromId);
  const j=a.findIndex(x=>x.id===toId);
  if(i<0||j<0) return list;
  const [m]=a.splice(i,1);
  a.splice(j,0,m);
  a.forEach((x,idx)=>x.order=idx+1);
  return a;
}

/* CRUD */
function addSectionModal(){
  const body=document.createElement("div");
  const t=inputField({label:"عنوان القسم", placeholder:"مثال: قسم الحاسب"});
  const d=textareaField({label:"وصف مختصر", placeholder:"نبذة عن القسم..."});
  body.appendChild(t.wrap); body.appendChild(d.wrap);

  const foot=document.createElement("div");
  foot.appendChild(makeBtn("حفظ","btn--primary", ()=>{
    const title=t.inp.value.trim();
    if(!title){ t.inp.focus(); return; }
    const orders=state.data.sections.map(s=>s.order||0);
    const next=(orders.length?Math.max(...orders):0)+1;
    state.data.sections.push({id:uid("sec"), title, desc:d.ta.value.trim(), order:next, courses:[]});
    saveData(); closeModal(); render();
  }));
  foot.appendChild(makeBtn("إلغاء","btn--ghost", closeModal));
  openModal({title:"إضافة قسم جديد", bodyNode:body, footerNode:foot});
}
function editSectionModal(sectionId){
  const sec=findSection(sectionId); if(!sec) return;
  const body=document.createElement("div");
  const t=inputField({label:"عنوان القسم", value:sec.title});
  const d=textareaField({label:"وصف مختصر", value:sec.desc||""});
  body.appendChild(t.wrap); body.appendChild(d.wrap);

  const foot=document.createElement("div");
  foot.appendChild(makeBtn("حفظ","btn--primary", ()=>{
    const title=t.inp.value.trim();
    if(!title) return;
    sec.title=title; sec.desc=d.ta.value.trim();
    saveData(); closeModal(); render();
  }));
  foot.appendChild(makeBtn("إلغاء","btn--ghost", closeModal));
  openModal({title:"تعديل القسم", bodyNode:body, footerNode:foot});
}
function deleteSection(sectionId){
  if(!confirm("حذف القسم سيحذف المقررات والدروس داخله. هل أنت متأكد؟")) return;
  state.data.sections=state.data.sections.filter(s=>s.id!==sectionId);
  sortByOrder(state.data.sections).forEach((s,i)=>s.order=i+1);
  saveData();
  setRoute({view:"home"});
}
function addCourseModal(sectionId){
  const sec=findSection(sectionId); if(!sec) return;
  const body=document.createElement("div");
  const t=inputField({label:"عنوان المقرر", placeholder:"مثال: قواعد البيانات"});
  const d=textareaField({label:"وصف مختصر", placeholder:"نبذة عن المقرر..."});
  body.appendChild(t.wrap); body.appendChild(d.wrap);

  const foot=document.createElement("div");
  foot.appendChild(makeBtn("حفظ","btn--primary", ()=>{
    const title=t.inp.value.trim();
    if(!title) return;
    const orders=(sec.courses||[]).map(c=>c.order||0);
    const next=(orders.length?Math.max(...orders):0)+1;
    sec.courses.push({id:uid("crs"), title, desc:d.ta.value.trim(), order:next, lessons:[]});
    saveData(); closeModal(); render();
  }));
  foot.appendChild(makeBtn("إلغاء","btn--ghost", closeModal));
  openModal({title:`إضافة مقرر داخل: ${sec.title}`, bodyNode:body, footerNode:foot});
}
function editCourseModal(sectionId, courseId){
  const sec=findSection(sectionId); if(!sec) return;
  const crs=findCourse(sec, courseId); if(!crs) return;
  const body=document.createElement("div");
  const t=inputField({label:"عنوان المقرر", value:crs.title});
  const d=textareaField({label:"وصف مختصر", value:crs.desc||""});
  body.appendChild(t.wrap); body.appendChild(d.wrap);

  const foot=document.createElement("div");
  foot.appendChild(makeBtn("حفظ","btn--primary", ()=>{
    const title=t.inp.value.trim(); if(!title) return;
    crs.title=title; crs.desc=d.ta.value.trim();
    saveData(); closeModal(); render();
  }));
  foot.appendChild(makeBtn("إلغاء","btn--ghost", closeModal));
  openModal({title:"تعديل المقرر", bodyNode:body, footerNode:foot});
}
function deleteCourse(sectionId, courseId){
  const sec=findSection(sectionId); if(!sec) return;
  if(!confirm("حذف المقرر سيحذف الدروس داخله. هل أنت متأكد؟")) return;
  sec.courses=(sec.courses||[]).filter(c=>c.id!==courseId);
  sortByOrder(sec.courses).forEach((c,i)=>c.order=i+1);
  saveData(); render();
}
function addLessonModal(sectionId, courseId){
  const sec=findSection(sectionId); if(!sec) return;
  const crs=findCourse(sec, courseId); if(!crs) return;

  const body=document.createElement("div");
  const t=inputField({label:"عنوان الدرس", placeholder:"مثال: الدرس الأول - ..."});
  const v=inputField({label:"رابط فيديو (YouTube)", placeholder:"https://www.youtube.com/watch?v=..."});
  const d=textareaField({label:"وصف مختصر", placeholder:"شرح بسيط..."});
  body.appendChild(t.wrap); body.appendChild(v.wrap); body.appendChild(d.wrap);

  const foot=document.createElement("div");
  foot.appendChild(makeBtn("حفظ","btn--primary", ()=>{
    const title=t.inp.value.trim();
    const videoUrl=v.inp.value.trim();
    if(!title || !videoUrl) return;
    const orders=(crs.lessons||[]).map(x=>x.order||0);
    const next=(orders.length?Math.max(...orders):0)+1;
    crs.lessons.push({id:uid("les"), title, videoUrl, desc:d.ta.value.trim(), order:next});
    saveData(); closeModal(); render();
  }));
  foot.appendChild(makeBtn("إلغاء","btn--ghost", closeModal));
  openModal({title:`إضافة درس داخل: ${crs.title}`, bodyNode:body, footerNode:foot});
}
function editLessonModal(sectionId, courseId, lessonId){
  const sec=findSection(sectionId); if(!sec) return;
  const crs=findCourse(sec, courseId); if(!crs) return;
  const les=(crs.lessons||[]).find(l=>l.id===lessonId); if(!les) return;

  const body=document.createElement("div");
  const t=inputField({label:"عنوان الدرس", value:les.title});
  const v=inputField({label:"رابط فيديو (YouTube)", value:les.videoUrl});
  const d=textareaField({label:"وصف مختصر", value:les.desc||""});
  body.appendChild(t.wrap); body.appendChild(v.wrap); body.appendChild(d.wrap);

  const foot=document.createElement("div");
  foot.appendChild(makeBtn("حفظ","btn--primary", ()=>{
    const title=t.inp.value.trim();
    const videoUrl=v.inp.value.trim();
    if(!title || !videoUrl) return;
    les.title=title; les.videoUrl=videoUrl; les.desc=d.ta.value.trim();
    saveData(); closeModal(); render();
  }));
  foot.appendChild(makeBtn("إلغاء","btn--ghost", closeModal));
  openModal({title:"تعديل الدرس", bodyNode:body, footerNode:foot});
}
function deleteLesson(sectionId, courseId, lessonId){
  const sec=findSection(sectionId); if(!sec) return;
  const crs=findCourse(sec, courseId); if(!crs) return;
  if(!confirm("حذف الدرس؟")) return;
  crs.lessons=(crs.lessons||[]).filter(l=>l.id!==lessonId);
  sortByOrder(crs.lessons).forEach((l,i)=>l.order=i+1);
  saveData(); render();
}

/* Views */
function renderHome(){

  renderBreadcrumb([{label:"الرئيسية", onClick:()=>setRoute({view:"home"})}]);

  const wrap=document.createElement("div");
  wrap.className="grid";

  sortByOrder(state.data.sections).forEach((sec, idx)=>{
    const adminbar = isAdmin() ? (()=> {
      const bar=document.createElement("div");
      bar.className="adminbar";
      bar.appendChild(makeBtn("إضافة مقرر","btn--muted", ()=>addCourseModal(sec.id)));
      bar.appendChild(makeBtn("تعديل","btn--ghost", ()=>editSectionModal(sec.id)));
      bar.appendChild(makeBtn("حذف","btn--danger", ()=>deleteSection(sec.id)));
      return bar;
    })() : null;

    wrap.appendChild(card({

      title:sec.title,
      desc:sec.desc,
      countBadges:[`المقررات:${(sec.courses||[]).length}`, `الدروس:${(sec.courses||[]).reduce((s,c)=>s+(c.lessons||[]).length,0)}`],
      primaryText:"عرض المقررات",
      onPrimary:()=>setRoute({view:"section", sectionId:sec.id}),
      draggable:isAdmin(),
      dragMeta:{type:"section", id:sec.id},
      extraAdminBar: adminbar
    }));
  });

  if(isAdmin()){
    wrap.appendChild(card({
      badge:"إدارة",
      title:"إضافة قسم / استيراد JSON",
      desc:"أضف قسمًا جديدًا أو استورد الأقسام والمقررات من ملف JSON.",
      primaryText:"إضافة قسم",
      onPrimary:addSectionModal,
      secondary:[
        makeBtn("استيراد JSON","btn--muted", importJsonModal),
        makeBtn("تسجيل خروج","btn--danger", ()=>{ setAdminMode(false); render(); })
      ]
    }));
  }

  viewRoot.innerHTML="";
  viewRoot.appendChild(wrap);

  if(isAdmin()){
    attachDnD(wrap, (from,to)=>{
      if(from.type!=="section"||to.type!=="section") return;
      state.data.sections = reorderByIds(sortByOrder(state.data.sections), from.id, to.id);
      saveData(); render();
    });
  }
}

function renderSection(sectionId){
  const sec=findSection(sectionId);
  if(!sec){ setRoute({view:"home"}); return; }

  pageTitle.textContent=sec.title;
  pageDesc.textContent=sec.desc||"";

  renderBreadcrumb([
    {label:"الرئيسية", onClick:()=>setRoute({view:"home"})},
    {label:sec.title, onClick:()=>setRoute({view:"section", sectionId})},
  ]);

  const wrap=document.createElement("div");
  wrap.className="grid";

  sortByOrder(sec.courses||[]).forEach((crs, idx)=>{
    const adminbar=isAdmin()?(()=> {
      const bar=document.createElement("div");
      bar.className="adminbar";
      bar.appendChild(makeBtn("إضافة درس","btn--muted", ()=>addLessonModal(sec.id, crs.id)));
      bar.appendChild(makeBtn("تعديل","btn--ghost", ()=>editCourseModal(sec.id, crs.id)));
      bar.appendChild(makeBtn("حذف","btn--danger", ()=>deleteCourse(sec.id, crs.id)));
      return bar;
    })():null;

    wrap.appendChild(card({
      badge:`المقرر: ${idx+1}`,
      title:crs.title,
      desc:crs.desc,
      countBadges:[`الدروس:${(crs.lessons||[]).length}`],
      primaryText:"عرض الدروس",
      onPrimary:()=>setRoute({view:"course", sectionId:sec.id, courseId:crs.id}),
      draggable:isAdmin(),
      dragMeta:{type:"course", sectionId:sec.id, id:crs.id},
      extraAdminBar: adminbar
    }));
  });

  if(isAdmin()){
    wrap.appendChild(card({
      badge:"إدارة",
      title:"إضافة مقرر جديد",
      desc:"أضف مقررًا داخل هذا القسم.",
      primaryText:"إضافة مقرر",
      onPrimary:()=>addCourseModal(sec.id)
    }));

    attachDnD(wrap, (from,to)=>{
      if(from.type!=="course"||to.type!=="course") return;
      if(from.sectionId!==sec.id || to.sectionId!==sec.id) return;
      sec.courses = reorderByIds(sortByOrder(sec.courses||[]), from.id, to.id);
      saveData(); render();
    });
  }

  viewRoot.innerHTML="";
  viewRoot.appendChild(wrap);
}

function renderCourse(sectionId, courseId){
  const sec=findSection(sectionId);
  if(!sec){ setRoute({view:"home"}); return; }
  const crs=findCourse(sec, courseId);
  if(!crs){ setRoute({view:"section", sectionId}); return; }

  pageTitle.textContent=crs.title;
  pageDesc.textContent=crs.desc||"";

  const routeLessonId = state.route.lessonId || null;

  renderBreadcrumb([
    {label:"الرئيسية", onClick:()=>setRoute({view:"home"})},
    {label:sec.title, onClick:()=>setRoute({view:"section", sectionId})},
    {label:crs.title, onClick:()=>setRoute({view:"course", sectionId, courseId, lessonId: routeLessonId})},
  ]);

  const lessons=sortByOrder(crs.lessons||[]);
  let activeId = routeLessonId && lessons.some(l=>l.id===routeLessonId) ? routeLessonId : (lessons[0]?.id || null);

  // wrapper
  const wrap=document.createElement("div");
  wrap.className="coursewrap";

  // player left
  const player=document.createElement("div");
  player.className="playercard";

  const active = lessons.find(l=>l.id===activeId) || null;

  const titleRow=document.createElement("div");
  titleRow.className="playercard__title";

  const titleText=document.createElement("div");
  titleText.textContent = active ? active.title : "لا توجد دروس";
  titleRow.appendChild(titleText);

  const badge=document.createElement("div");
  badge.className="playercard__badge";
  badge.textContent = active ? ("الدرس " + (lessons.findIndex(x=>x.id===activeId)+1)) : "—";
  titleRow.appendChild(badge);

  player.appendChild(titleRow);

  // video
  if(active){
    const video=document.createElement("div");
    video.className="video";
    const iframe=document.createElement("iframe");
    iframe.src=toYouTubeEmbed(active.videoUrl);
    iframe.loading="lazy";
    iframe.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen=true;
    video.appendChild(iframe);
    player.appendChild(video);

    const desc=document.createElement("div");
    desc.className="playercard__desc";
    desc.textContent=active.desc||"";
    player.appendChild(desc);

    if(isAdmin()){
      const bar=document.createElement("div");
      bar.className="adminbar";
      bar.appendChild(makeBtn("إضافة درس","btn--primary", ()=>addLessonModal(sectionId, courseId)));
      bar.appendChild(makeBtn("تعديل الدرس الحالي","btn--ghost", ()=>editLessonModal(sectionId, courseId, active.id)));
      bar.appendChild(makeBtn("حذف الدرس الحالي","btn--danger", ()=>deleteLesson(sectionId, courseId, active.id)));
      player.appendChild(bar);
    }
  }else{
    const empty=document.createElement("div");
    empty.className="help";
    empty.style.padding="8px 2px 2px";
    empty.textContent = isAdmin()
      ? "لا توجد دروس بعد. اضغط (إضافة درس) لإضافة أول درس."
      : "لا توجد دروس لهذا المقرر حالياً.";
    player.appendChild(empty);

    if(isAdmin()){
      const bar=document.createElement("div");
      bar.className="adminbar";
      bar.appendChild(makeBtn("إضافة درس","btn--primary", ()=>addLessonModal(sectionId, courseId)));
      player.appendChild(bar);
    }
  }

  // sidebar right
  const side=document.createElement("aside");
  side.className="sidebar";

  const sideTitle=document.createElement("div");
  sideTitle.className="sidebar__title";
  sideTitle.textContent="اختر درساً من القائمة.";
  side.appendChild(sideTitle);

  const list=document.createElement("ul");
  list.className="lessonnav";

  lessons.forEach((les, idx)=>{
    const li=document.createElement("li");

    const btn=document.createElement("button");
    btn.type="button";
    btn.className="lessonbtn"+(les.id===activeId?" is-active":"");
    btn.addEventListener("click", ()=>{
      setRoute({view:"course", sectionId, courseId, lessonId: les.id});
    });

    const left=document.createElement("div");
    left.className="lessonbtn__left";

    const pill=document.createElement("div");
    pill.className="lessonpill";
    pill.textContent = "الدرس " + (idx+1);

    const t=document.createElement("div");
    t.className="lessonbtn__title";
    t.textContent = les.title;

    left.appendChild(pill);
    left.appendChild(t);
    btn.appendChild(left);

    if(isAdmin()){
      const admin=document.createElement("div");
      admin.className="lessonbtn__admin";

      const ebtn=document.createElement("button");
      ebtn.type="button";
      ebtn.className="iconmini";
      ebtn.title="تعديل";
      ebtn.textContent="✎";
      ebtn.addEventListener("click",(ev)=>{ ev.stopPropagation(); editLessonModal(sectionId, courseId, les.id); });

      const dbtn=document.createElement("button");
      dbtn.type="button";
      dbtn.className="iconmini";
      dbtn.title="حذف";
      dbtn.textContent="🗑";
      dbtn.addEventListener("click",(ev)=>{ ev.stopPropagation(); deleteLesson(sectionId, courseId, les.id); });

      admin.appendChild(ebtn);
      admin.appendChild(dbtn);
      btn.appendChild(admin);

      // drag support
      li.classList.add("draggable");
      li.setAttribute("draggable","true");
      li.dataset.drag = JSON.stringify({type:"lesson", sectionId, courseId, id:les.id});
    }

    li.appendChild(btn);
    list.appendChild(li);
  });

  side.appendChild(list);

  if(isAdmin()){
    attachDnD(list, (from,to)=>{
      if(from.type!=="lesson"||to.type!=="lesson") return;
      if(from.sectionId!==sectionId || to.sectionId!==sectionId) return;
      if(from.courseId!==courseId || to.courseId!==courseId) return;
      crs.lessons = reorderByIds(sortByOrder(crs.lessons||[]), from.id, to.id);
      saveData();
      // حافظ على الدرس الحالي إن وجد
      const keep = activeId && crs.lessons.some(l=>l.id===activeId) ? activeId : (crs.lessons[0]?.id||null);
      setRoute({view:"course", sectionId, courseId, lessonId: keep});
    });
  }

  wrap.appendChild(player);
  wrap.appendChild(side);

  viewRoot.innerHTML="";
  viewRoot.appendChild(wrap);
}

function render(){
  adminHint.classList.toggle("hidden", !isAdmin());
  const r=state.route;
  if(r.view==="home") renderHome();
  else if(r.view==="section") renderSection(r.sectionId);
  else if(r.view==="course") renderCourse(r.sectionId, r.courseId);
  else renderHome();
}

function boot(){
  state.data=loadData();
  loadAdminMode();
  closeModal();

  function updateAdminBtn(){
    adminBtn.textContent = isAdmin() ? "خروج من لوحة التحكم" : "لوحة التحكم";
    adminBtn.className = "btn " + (isAdmin() ? "btn--danger" : "btn--ghost");
  }
  updateAdminBtn();

  adminBtn.addEventListener("click", ()=>{
    if(isAdmin()){
      setAdminMode(false);
      updateAdminBtn();
      render();
    }else{
      adminLoginModal();
    }
  });

  state.route=parseHash();
  render();

  const originalRender = render;
  render = function(){
    originalRender();
    updateAdminBtn();
  };
}
boot();
