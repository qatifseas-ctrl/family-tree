var _HTML_TEMPLATE=document.documentElement.outerHTML;

/* ══════════════════════════════════════════════════════════
   وضع الجوال — Mobile Mode System
══════════════════════════════════════════════════════════ */
const MOB_KEY='ft_mobile_mode_v1';
let _mobileMode=false;
let _mobSheetPersonId=null;

function _isMobileDevice(){
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||window.innerWidth<640;
}

function initMobileMode(){
  // استعادة الحالة المحفوظة
  try{
    let saved=localStorage.getItem(MOB_KEY);
    if(saved==='1')_mobileMode=true;
    else if(saved===null&&_isMobileDevice())_mobileMode=true; // تفعيل تلقائي على الجوال
  }catch(e){}
  _applyMobileMode();
}

function toggleMobileMode(){
  _mobileMode=!_mobileMode;
  try{localStorage.setItem(MOB_KEY,_mobileMode?'1':'0');}catch(e){}
  _applyMobileMode();
  renderAll();
}

function _applyMobileMode(){
  document.body.classList.toggle('mobile-mode',_mobileMode);
  let btn=document.getElementById('mobileModeBtn');
  if(!btn)return;
  if(_mobileMode){
    btn.classList.add('active');
    btn.innerHTML='📱 جوال ✓';
    btn.title='إلغاء وضع الجوال';
  } else {
    btn.classList.remove('active');
    btn.innerHTML='📱 وضع الجوال';
    btn.title='وضع الجوال: شجرة أخف وأسرع';
  }
}

// تبديل فتح/إغلاق فرع في وضع الجوال (بدون إغلاق الإخوة)
function toggleNodeMobile(id){
  expanded[id]=!expanded[id];
  renderAll();
}

// Action Sheet — إجراءات الشخص في وضع الجوال
function openMobSheet(id){
  _mobSheetPersonId=id;
  let p=getPerson(id);if(!p)return;
  let sheet=document.getElementById('mob-action-sheet');
  let overlay=document.getElementById('mob-action-sheet-overlay');
  let nameEl=document.getElementById('mob-sheet-name');
  let btnsEl=document.getElementById('mob-sheet-btns');
  if(!sheet||!overlay)return;
  nameEl.textContent=p.name+(p.familyName?' '+p.familyName:'');
  let hasChildren=getChildrenForNode(id).length>0;
  let btns=[
    {icon:'📋',label:'البيانات',action:`closeMobSheet();showPersonDetail(${id})`},
    {icon:'✏️',label:'تعديل',action:`closeMobSheet();openEditModal(${id})`},
    {icon:'➕',label:'إضافة ابن',action:`closeMobSheet();openAddModal(${id})`},
    {icon:'🌳',label:'انتقال',action:`closeMobSheet();navigateToPerson(${id})`},
  ];
  if(hasChildren) btns.push({icon:'⇅',label:'الترتيب',action:`closeMobSheet();openReorderModal(${id})`});
  btns.push({icon:'🗑',label:'حذف',action:`closeMobSheet();confirmDeleteFromList(${id})`,cls:'danger'});
  btnsEl.innerHTML=btns.map(b=>`
    <div class="sheet-btn${b.cls?' '+b.cls:''}" onclick="${b.action}">
      <span class="sh-icon">${b.icon}</span>
      <span class="sh-label">${b.label}</span>
    </div>`).join('');
  overlay.classList.add('open');
  sheet.classList.add('open');
  // إغلاق بالسحب للأسفل
  _mobSheetSwipe(sheet);
}

function closeMobSheet(){
  let sheet=document.getElementById('mob-action-sheet');
  let overlay=document.getElementById('mob-action-sheet-overlay');
  if(sheet)sheet.classList.remove('open');
  if(overlay)overlay.classList.remove('open');
  // إغلاق أزرار الإجراءات المفتوحة
  document.querySelectorAll('.node-header.actions-open').forEach(el=>el.classList.remove('actions-open'));
}

function _mobSheetSwipe(el){
  let startY=0,dragging=false;
  el.onpointerdown=e=>{startY=e.clientY;dragging=true;el.style.transition='none';};
  el.onpointermove=e=>{
    if(!dragging)return;
    let dy=Math.max(0,e.clientY-startY);
    el.style.transform=`translateY(${dy}px)`;
  };
  el.onpointerup=e=>{
    el.style.transition='';el.style.transform='';dragging=false;
    if(e.clientY-startY>80)closeMobSheet();
  };
}

/* ══════════════════════════════════════════════════════════
   THEME SYSTEM — Light / Dark / Auto
   يُطبَّق على <html> عبر data-theme="light"|"dark"|"auto"
══════════════════════════════════════════════════════════ */
(function(){
  var THEME_KEY='ft_theme_v1';
  var THEMES=['auto','light','dark'];
  var ICONS={auto:'🌗',light:'☀️',dark:'🌙'};
  var LABELS={auto:'تلقائي',light:'فاتح',dark:'داكن'};
  var _current='auto';

  function applyTheme(theme){
    _current=theme;
    var html=document.documentElement;
    if(theme==='auto'){
      html.removeAttribute('data-theme');
      html.style.colorScheme='';
    } else {
      html.setAttribute('data-theme',theme);
      html.style.colorScheme=theme;
    }
    // Update <meta name="theme-color"> for mobile browser chrome
    var metaTheme=document.querySelector('meta[name="theme-color"]');
    var isDark=theme==='dark'||(theme==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
    if(metaTheme)metaTheme.setAttribute('content',isDark?'#1f2937':'#3b82f6');
    updateBtn();
    try{localStorage.setItem(THEME_KEY,theme);}catch(e){}
  }

  function updateBtn(){
    var btn=document.getElementById('themeToggleBtn');
    if(!btn)return;
    var icon=ICONS[_current]||'🌗';
    var lbl=LABELS[_current]||'تلقائي';
    btn.textContent=icon+' '+lbl;
    btn.title='المظهر الحالي: '+lbl+' — اضغط للتبديل';
    // visual feedback for active state
    var isDark=_current==='dark'||(
      _current==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches
    );
    btn.style.background=isDark?'#374151':'';
    btn.style.borderColor=isDark?'#4b5563':'';
    btn.style.color=isDark?'#f9fafb':'';
  }

  window.cycleTheme=function(){
    var idx=THEMES.indexOf(_current);
    applyTheme(THEMES[(idx+1)%THEMES.length]);
  };

  // init on load
  var saved='auto';
  try{saved=localStorage.getItem(THEME_KEY)||'auto';}catch(e){}
  if(THEMES.indexOf(saved)===-1)saved='auto';
  applyTheme(saved);

  // keep button in sync when OS preference changes (auto mode)
  try{
    window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(){
      if(_current==='auto')updateBtn();
    });
  }catch(e){}

  // update button once DOM is ready (button may not exist yet)
  document.addEventListener('DOMContentLoaded',updateBtn);
  window.addEventListener('load',updateBtn);
  setTimeout(updateBtn,200);
})();
