
/* ===== ADMIN ALL-INTERN VIEW PATCH v5.3 =====
   Admin emails below can view all staff entries.
   Existing Firestore documents are untouched.
*/
const INTERN_ADMIN_EMAILS = [
  "naim3905@gmail.com",
  "mamariam.marketingm9fin@gmail.com"
];

let internViewMode = "self";
let internSelectedUid = "all";
let internKnownStaff = [];

function isInternAdminUser(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  return INTERN_ADMIN_EMAILS.includes(email);
}

function getInternDisplayName(entry) {
  return entry.staffName || entry.userName || entry.name ||
         entry.staffEmail || entry.email || entry.userEmail ||
         (entry.staffUid ? `Intern ${String(entry.staffUid).slice(0,6)}` : "Intern");
}

function getInternEntryUid(entry) {
  return entry.staffUid || entry.userUid || entry.uid || entry.createdBy || "";
}

function setupInternAdminFilter(entries, currentUser) {
  const wrap = document.getElementById("internViewFilterWrap");
  const select = document.getElementById("internViewFilter");
  if (!wrap || !select) return;

  const admin = isInternAdminUser(currentUser);
  wrap.style.display = admin ? "flex" : "none";
  internViewMode = admin ? "admin" : "self";

  const byUid = new Map();
  (entries || []).forEach(e => {
    const uid = getInternEntryUid(e);
    if (!uid) return;
    if (!byUid.has(uid)) byUid.set(uid, getInternDisplayName(e));
  });

  internKnownStaff = Array.from(byUid.entries()).map(([uid, name]) => ({uid, name}));
  const oldValue = select.value || internSelectedUid || "all";
  select.innerHTML = '<option value="all">Semua Intern</option>' +
    internKnownStaff.map(s => `<option value="${s.uid}">${s.name}</option>`).join("");

  if (Array.from(select.options).some(o => o.value === oldValue)) {
    select.value = oldValue;
  } else {
    select.value = "all";
  }
  internSelectedUid = select.value;

  if (!select.dataset.bound) {
    select.addEventListener("change", () => {
      internSelectedUid = select.value;
      if (typeof applyAdminViewerFilter === "function") applyAdminViewerFilter();
      if (typeof renderEverything === "function") renderEverything();
      else if (typeof refreshAll === "function") refreshAll();
      else if (typeof renderAll === "function") renderAll();
      else if (typeof renderDashboard === "function") renderDashboard();
    });
    select.dataset.bound = "1";
  }
}

function filterEntriesForViewer(entries, currentUser) {
  const list = Array.isArray(entries) ? entries : [];
  if (isInternAdminUser(currentUser)) {
    if (!internSelectedUid || internSelectedUid === "all") return list;
    return list.filter(e => getInternEntryUid(e) === internSelectedUid);
  }
  const uid = currentUser?.uid || "";
  return list.filter(e => getInternEntryUid(e) === uid);
}
/* ===== END ADMIN PATCH ===== */


/* ===== V5.4 ADMIN RAW DATA CACHE ===== */
let rawAllSales = [];
let rawAllPosters = [];
let rawCreativeDaily = [];
let rawCodEntries = [];

function applyAdminViewerFilter(){
  try{
    allSales = filterEntriesForViewer(rawAllSales, currentUser);
    allPosters = filterEntriesForViewer(rawAllPosters, currentUser);
    creativeDaily = filterEntriesForViewer(rawCreativeDaily, currentUser);
    codEntries = filterEntriesForViewer(rawCodEntries, currentUser);

    calendarMonthSales = allSales.filter(e=>entryMonth(e)===selectedMonth).sort(sortEntries);
    monthSales = allSales.filter(e=>accountingMonthForEntry(e)===selectedMonth).sort(sortEntries);
  }catch(e){ console.warn("applyAdminViewerFilter",e); }
}
/* ===== END V5.4 ADMIN RAW DATA CACHE ===== */

let currentUser=null;
let currentProfile=null;
let selectedMonth='';
let allSales=[];
let calendarMonthSales=[];
let monthSales=[];
let allPosters=[];
let creativeDaily=[];
let editingCreativeDailyId=null;
let codEntries=[];
let currentTarget=blankTarget();
let editingId=null;
let codEditingId=null;
let pendingPosterImage='';
let trendChart=null;
let mixChart=null;
let creativePosterChart=null;
let creativeTypeChart=null;

const money=(n,dec=0)=>new Intl.NumberFormat('ms-MY',{style:'currency',currency:'MYR',minimumFractionDigits:dec,maximumFractionDigits:dec}).format(Number(n)||0).replace('MYR','RM');
const num=n=>Number(n)||0;
const pct=(a,b)=>b>0?(a/b*100):0;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const byId=id=>document.getElementById(id);
const monthLabel=(key)=>{if(!key)return'';const [y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('ms-MY',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));};
const daysInMonth=(key)=>{const [y,m]=key.split('-').map(Number);return new Date(y,m,0).getDate();};
const todayISO=()=>new Date().toLocaleDateString('en-CA');
const currentMonthKey=()=>todayISO().slice(0,7);
const entryMonth=e=>e.monthKey||(e.date||'').slice(0,7);
const entryDay=e=>Number((e.date||'').slice(8,10))||0;
const isTikTok=e=>e.channel==='live'&&(e.platform==='solusi'||e.platform==='mamayuyu');
const isShopee=e=>e.channel==='live'&&e.platform==='shopee';
const platformLabel=p=>({shopee:'Shopee',mamayuyu:'TikTok Mamayuyu',solusi:'TikTok Solusi'}[p]||'—');
const sourceLabel=e=>e.channel==='whatsapp'?'WhatsApp':`Live · ${platformLabel(e.platform)}`;

function blankTarget(){return{ws1:1000,ws2:1000,ws3:1000,tt1:1000,tt2:1000,tt3:1000,ttCarry:1000,shopee:2000,commissionRate:4,whatsapp:3000,tiktok:3000,total:8000};}
function calcTarget(t){t.whatsapp=num(t.ws1)+num(t.ws2)+num(t.ws3);t.tiktok=num(t.tt1)+num(t.tt2)+num(t.tt3);t.total=t.whatsapp+t.tiktok+num(t.shopee);return t;}
function shiftMonth(key,offset){const [y,m]=key.split('-').map(Number);const d=new Date(y,m-1+offset,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function accountingMonthForEntry(e){const m=entryMonth(e);if(isTikTok(e)&&entryDay(e)>=26)return shiftMonth(m,1);return m;}
function commissionForEntry(e,rate=currentTarget.commissionRate){if(isTikTok(e)&&entryDay(e)>=26)return 0;return num(e.sales)*(num(rate)/100);}
function formatDate(v){if(!v)return'—';const [y,m,d]=v.split('-').map(Number);return new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d));}
function escapeHtml(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function creativeTypeLabel(v){return({promo:'Promo',masalah:'Masalah',problem_aware:'Problem Aware',unaware:'Unaware',solusi:'Solusi'}[v]||v||'—');}
function deliveryLabel(v){return({order:'Order Baru',shipped:'Shipped',out_delivery:'Out for Delivery',delivered:'Delivered',failed:'Delivery Failed',return:'Return / Reject'}[v]||v||'—');}
function paymentLabel(v){return({pending:'Pending',paid:'Paid',failed:'Tak Bayar / Failed'}[v]||v||'—');}

function toast(message,type='ok'){const el=byId('toast');el.textContent=message;el.className=`toast show ${type}`;clearTimeout(toast.t);toast.t=setTimeout(()=>el.className='toast',3000);}
function setThemeIcon(){const light=document.documentElement.getAttribute('data-theme')==='light';byId('theme-toggle').textContent=light?'☀️':'🌙';}
function toggleTheme(){const light=document.documentElement.getAttribute('data-theme')==='light';if(light){document.documentElement.removeAttribute('data-theme');localStorage.setItem('internTheme','dark');}else{document.documentElement.setAttribute('data-theme','light');localStorage.setItem('internTheme','light');}setThemeIcon();renderCharts();renderCreativeCharts();}

const viewCopy={dashboard:['Dashboard Sales Intern','Prestasi sales bulan dipilih berbanding target dan cutoff.'],input:['Input Sales Harian','Rekod sales Live atau WhatsApp.'],target:['Target & Komisen','Tetapkan target fleksibel ikut tempoh dan lihat progress.'],creative:['Creative Analysis','Kenal pasti poster dan angle yang paling banyak membawa leads.'],cod:['COD Tracker','Pantau customer COD, tracking, penghantaran dan status bayaran.'],schedule:['Jadual Live Luqman','Semak slot Live Shopee HQ, TikTok Mamayuyu dan TikTok Solusi.'],report:['Laporan Sales','Sales yang dikira mengikut cycle cutoff TikTok.']};
function switchView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));const view=byId(`view-${name}`);if(!view)return;view.classList.add('active');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));const copy=viewCopy[name]||viewCopy.dashboard;byId('page-title').textContent=copy[0];byId('page-subtitle').textContent=copy[1];window.scrollTo({top:0,behavior:'smooth'});if(name==='creative')setTimeout(renderCreativeCharts,50);if(name==='dashboard')setTimeout(renderCharts,50);}

document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.go)));
byId('theme-toggle').addEventListener('click',toggleTheme);setThemeIcon();
byId('logout-btn').addEventListener('click',()=>auth.signOut());
byId('global-month').addEventListener('change',async e=>{selectedMonth=e.target.value||currentMonthKey();await refreshAll();});

auth.onAuthStateChanged(async user=>{
  if(!user){location.href='index.html';return;}
  currentUser=user;await loadProfile();selectedMonth=currentMonthKey();byId('global-month').value=selectedMonth;byId('sale-date').value=todayISO();byId('creative-date').value=todayISO();byId('cod-date').value=todayISO();byId('app-shell').hidden=false;byId('loading-screen').style.display='none';await refreshAll();toggleSourceFields();updateInputPreview();
});

async function loadProfile(){try{const snap=await db.collection('users').doc(currentUser.uid).get();currentProfile=snap.exists?snap.data():null;}catch(e){currentProfile=null;}const fallback=(currentUser.email||'Intern').split('@')[0].replace(/[._-]+/g,' ');const name=(currentProfile&&currentProfile.name)||fallback;byId('user-name').textContent=name;byId('user-email').textContent=currentUser.email||'—';byId('user-avatar').textContent=name.trim().charAt(0).toUpperCase()||'I';}

async function refreshAll(){
  /* admin-filter-refreshAll */
  setTimeout(() => {
    try {
      const source = (typeof entries !== "undefined" && Array.isArray(entries)) ? entries :
                     (typeof allEntries !== "undefined" && Array.isArray(allEntries)) ? allEntries :
                     (typeof salesEntries !== "undefined" && Array.isArray(salesEntries)) ? salesEntries : [];
      setupInternAdminFilter(
      (typeof rawAllSales !== "undefined" && Array.isArray(rawAllSales) && rawAllSales.length) ? rawAllSales : source,
      typeof currentUser !== "undefined" ? currentUser : null
    );
    } catch (e) { console.warn("Admin filter init:", e); }
  }, 0);
await Promise.all([loadSales(),loadTarget(),loadCreative(),loadCod()]);renderEverything();}
async function loadSales(){try{const snap=await db.collection('entries').where('kind','==','intern_sales').get();rawAllSales=snap.docs.map(d=>({id:d.id,...d.data()}));allSales=filterEntriesForViewer(rawAllSales,currentUser);}catch(err){console.error(err);toast('Tak dapat baca data sales. Semak Firestore Rules.','error');allSales=[];}calendarMonthSales=allSales.filter(e=>entryMonth(e)===selectedMonth).sort(sortEntries);monthSales=allSales.filter(e=>accountingMonthForEntry(e)===selectedMonth).sort(sortEntries);}
function sortEntries(a,b){return(b.date||'').localeCompare(a.date||'')||((b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));}
function targetDocId(){return `intern_target_${currentUser.uid}_${selectedMonth}`;}
async function loadTarget(){
  try{
    const snap=await db.collection('meta').doc(targetDocId()).get();
    if(!snap.exists){currentTarget=calcTarget(blankTarget());}
    else{
      const d=snap.data();
      const hasOldWs=d.whatsapp!==undefined;
      const hasOldTt=d.tiktok!==undefined||d.mamayuyu!==undefined||d.solusi!==undefined;
      const oldWs=num(d.whatsapp);const oldTt=d.tiktok!==undefined?num(d.tiktok):num(d.mamayuyu)+num(d.solusi);
      currentTarget=calcTarget({
        ws1:d.ws1!==undefined?num(d.ws1):(hasOldWs?oldWs/3:1000),ws2:d.ws2!==undefined?num(d.ws2):(hasOldWs?oldWs/3:1000),ws3:d.ws3!==undefined?num(d.ws3):(hasOldWs?oldWs/3:1000),
        tt1:d.tt1!==undefined?num(d.tt1):(hasOldTt?oldTt/3:1000),tt2:d.tt2!==undefined?num(d.tt2):(hasOldTt?oldTt/3:1000),tt3:d.tt3!==undefined?num(d.tt3):(hasOldTt?oldTt/3:1000),
        ttCarry:d.ttCarry!==undefined?num(d.ttCarry):1000,shopee:d.shopee!==undefined?num(d.shopee):2000,commissionRate:d.commissionRate!==undefined?num(d.commissionRate):4
      });
    }
  }catch(err){console.error(err);currentTarget=calcTarget(blankTarget());}
  setTargetInputs();updateTargetPreview();
}
async function loadCreative(){try{const [pSnap,dSnap]=await Promise.all([db.collection('posters').where('kind','==','intern_creative').get(),db.collection('entries').where('kind','==','intern_creative_daily').get()]);rawAllPosters=pSnap.docs.map(d=>({id:d.id,...d.data()}));allPosters=filterEntriesForViewer(rawAllPosters,currentUser);rawCreativeDaily=dSnap.docs.map(d=>({id:d.id,...d.data()}));creativeDaily=filterEntriesForViewer(rawCreativeDaily,currentUser);}catch(err){console.error(err);allPosters=[];creativeDaily=[];}}
async function loadCod(){try{const snap=await db.collection('entries').where('kind','==','intern_cod').get();rawCodEntries=snap.docs.map(d=>({id:d.id,...d.data()}));codEntries=filterEntriesForViewer(rawCodEntries,currentUser);}catch(err){console.error(err);codEntries=[];}}

function stats(){
  const s={total:0,live:0,whatsapp:0,shopee:0,tiktok:0,mamayuyu:0,solusi:0,leads:0,buyers:0,commission:0,wsCommission:0,tiktokCommission:0,shopeeCommission:0,carryIn:0,carryOut:0};
  monthSales.forEach(e=>{const v=num(e.sales);s.total+=v;const c=commissionForEntry(e);s.commission+=c;if(e.channel==='whatsapp'){s.whatsapp+=v;s.leads+=num(e.leads);s.buyers+=num(e.buyers);s.wsCommission+=c;}else if(isShopee(e)){s.live+=v;s.shopee+=v;s.shopeeCommission+=c;}else if(isTikTok(e)){s.live+=v;s.tiktok+=v;s[e.platform]+=v;s.tiktokCommission+=c;if(entryMonth(e)!==selectedMonth)s.carryIn+=v;}});
  calendarMonthSales.filter(e=>isTikTok(e)&&entryDay(e)>=26).forEach(e=>s.carryOut+=num(e.sales));
  return s;
}
function elapsedInfo(){const totalDays=daysInMonth(selectedMonth);const nowKey=currentMonthKey();let elapsed=totalDays;if(selectedMonth===nowKey)elapsed=Math.min(new Date().getDate(),totalDays);if(selectedMonth>nowKey)elapsed=0;const remaining=selectedMonth<nowKey?0:selectedMonth===nowKey?Math.max(1,totalDays-elapsed+1):totalDays;return{totalDays,elapsed,remaining};}
function renderEverything(){renderDashboard();renderInputTable();renderTarget();renderCreative();renderCod();renderReport();renderCharts();}

function renderDashboard(){
  /* admin-filter-renderDashboard */
  setTimeout(() => {
    try {
      const source = (typeof entries !== "undefined" && Array.isArray(entries)) ? entries :
                     (typeof allEntries !== "undefined" && Array.isArray(allEntries)) ? allEntries :
                     (typeof salesEntries !== "undefined" && Array.isArray(salesEntries)) ? salesEntries : [];
      setupInternAdminFilter(
      (typeof rawAllSales !== "undefined" && Array.isArray(rawAllSales) && rawAllSales.length) ? rawAllSales : source,
      typeof currentUser !== "undefined" ? currentUser : null
    );
    } catch (e) { console.warn("Admin filter init:", e); }
  }, 0);

  const s=stats(),t=currentTarget,ach=pct(s.total,t.total);const {totalDays,elapsed,remaining}=elapsedInfo();const expected=totalDays?t.total*(elapsed/totalDays):0;const gap=Math.max(0,t.total-s.total);const dailyNeed=remaining?gap/remaining:gap;const avg=elapsed?s.total/elapsed:0;const forecast=elapsed?s.total/Math.max(1,elapsed)*totalDays:0;const paceDiff=s.total-expected;
  byId('dash-total-sales').textContent=money(s.total);byId('dash-total-target').textContent=money(t.total);byId('overall-progress-bar').style.width=`${clamp(ach,0,100)}%`;byId('overall-progress-text').textContent=`${ach.toFixed(1)}% dicapai`;byId('overall-gap-text').textContent=t.total?`Baki ${money(gap)}`:'Set target dahulu';
  byId('dash-tiktok-sales').textContent=money(s.tiktok);byId('dash-tiktok-meta').textContent=s.carryIn?`${money(s.carryIn)} carry-in termasuk dalam total`:'1–25hb cycle semasa';byId('dash-ws-sales').textContent=money(s.whatsapp);byId('dash-ws-meta').textContent=`${s.buyers} buyer · ${s.leads} leads`;byId('dash-commission').textContent=money(s.commission,2);byId('dash-commission-meta').textContent=`${currentTarget.commissionRate}% sales layak · cutoff TikTok 25hb`;
  byId('sum-ws-sales').textContent=money(s.whatsapp);byId('sum-ws-commission').textContent=money(s.wsCommission,2);byId('sum-tiktok-sales').textContent=money(s.tiktok);byId('sum-tiktok-commission').textContent=money(s.tiktokCommission,2);byId('sum-shopee-sales').textContent=money(s.shopee);byId('sum-shopee-commission').textContent=money(s.shopeeCommission,2);byId('sum-carry-sales').textContent=money(s.carryOut);byId('sum-carry-meta').textContent=`→ ${monthLabel(shiftMonth(selectedMonth,1))} · tiada komisen`;
  byId('expected-to-date').textContent=money(expected);byId('expected-meta').textContent=elapsed?`Hari ${elapsed} daripada ${totalDays}`:'Bulan belum bermula';byId('daily-needed').textContent=money(dailyNeed);byId('daily-needed-meta').textContent=t.total?`${remaining} hari masih tersedia`:'Belum ada target';byId('daily-average').textContent=money(avg);byId('daily-average-meta').textContent=elapsed?`Purata ${elapsed} hari berlalu`:'Belum ada data';const paceEl=byId('pace-difference');paceEl.textContent=`${paceDiff>=0?'+':''}${money(paceDiff)}`;paceEl.classList.toggle('negative',paceDiff<0);byId('pace-difference-meta').textContent=t.total?(paceDiff>=0?'Mendahului pace target':'Di belakang pace target'):'Belum ada target';
  const chip=byId('pace-chip');chip.className='status-chip';if(!t.total)chip.textContent='Belum ada target';else if(s.total>=t.total){chip.textContent='Target tercapai';chip.classList.add('success');}else if(paceDiff>=0){chip.textContent='On track';chip.classList.add('success');}else{chip.textContent='Perlu push';chip.classList.add('warning');}
  renderChannel('shopee',s.shopee,t.shopee);renderChannel('tiktok',s.tiktok,t.tiktok);renderChannel('whatsapp',s.whatsapp,t.whatsapp);renderPerformanceSummary(s,t,{ach,expected,gap,dailyNeed,forecast,paceDiff,remaining,totalDays,elapsed});renderRecent();
}
function renderChannel(key,actual,target){const p=pct(actual,target);byId(`${key}-sales`).textContent=money(actual);byId(`${key}-bar`).style.width=`${clamp(p,0,100)}%`;byId(`${key}-pct`).textContent=target?`${p.toFixed(1)}%`:'0%';byId(`${key}-target`).textContent=`Target ${money(target)}`;}
function renderPerformanceSummary(s,t,m){
  const hasTarget=t.total>0,ach=hasTarget?m.ach:0,expectedPct=hasTarget?pct(m.expected,t.total):0;byId('performance-actual').textContent=money(s.total);byId('performance-target').textContent=money(t.total);byId('performance-achievement').textContent=`${ach.toFixed(1)}%`;byId('performance-achievement-bar').style.width=`${clamp(ach,0,100)}%`;byId('performance-expected').textContent=money(m.expected);byId('performance-expected-bar').style.width=`${clamp(expectedPct,0,100)}%`;
  const achChip=byId('performance-achievement-chip');achChip.textContent=hasTarget?`${ach.toFixed(1)}%`:'Belum set';achChip.className='status-chip';if(hasTarget&&s.total>=t.total)achChip.classList.add('success');else if(hasTarget&&m.paceDiff<0)achChip.classList.add('warning');byId('performance-gap').textContent=money(m.gap);byId('performance-gap-caption').textContent=!hasTarget?'Tetapkan target bulan untuk mula tracking.':s.total>=t.total?`Lebih target ${money(s.total-t.total)}.`:`Masih perlu ${money(m.gap)} untuk capai 100%.`;
  const badge=byId('pace-status-badge'),amount=byId('pace-status-amount'),detail=byId('pace-status-detail');badge.className='pace-status-badge';if(!hasTarget){badge.textContent='BELUM ADA TARGET';amount.textContent=money(0);detail.textContent='Tetapkan target bulanan untuk mula banding prestasi sebenar dengan pace target.';}else if(s.total>=t.total){badge.textContent='TARGET TERCAPAI';badge.classList.add('success');amount.textContent=`+${money(s.total-t.total)}`;detail.textContent='Sales cycle bulan ini sudah melepasi target keseluruhan.';}else if(m.paceDiff>=0){badge.textContent='ON TRACK';badge.classList.add('success');amount.textContent=`+${money(m.paceDiff)}`;detail.textContent=`Mendahului pace target setakat hari ini. Forecast ${money(m.forecast)}.`;}else{badge.textContent='BEHIND TARGET';badge.classList.add('danger');amount.textContent=`-${money(Math.abs(m.paceDiff))}`;detail.textContent=`Ketinggalan daripada pace. Perlu purata ${money(m.dailyNeed)} sehari untuk catch up.`;}
  byId('pace-days-left').textContent=String(m.remaining);byId('pace-daily-needed').textContent=money(m.dailyNeed);byId('ranking-month-label').textContent=monthLabel(selectedMonth);
  const ranking=[{label:'TikTok Live',actual:s.tiktok,target:t.tiktok},{label:'WhatsApp',actual:s.whatsapp,target:t.whatsapp},{label:'Shopee Live',actual:s.shopee,target:t.shopee}].sort((a,b)=>b.actual-a.actual);byId('channel-ranking-list').innerHTML=ranking.map((r,i)=>`<div class="ranking-row"><div class="ranking-position">${i+1}</div><div class="ranking-copy"><b>${r.label}</b><span>${r.target?`${pct(r.actual,r.target).toFixed(1)}% target`:'Tiada target'}</span></div><div class="ranking-value"><b>${money(r.actual)}</b><span>Target ${money(r.target)}</span></div></div>`).join('');
}
function renderRecent(){const rows=monthSales.slice(0,6);const el=byId('recent-sales-list');if(!rows.length){el.innerHTML='<div class="empty-state">Belum ada sales untuk cycle bulan ini.</div>';return;}el.innerHTML=rows.map(e=>{const carry=isTikTok(e)&&entryDay(e)>=26?'<span class="carry-inline">Carry-in</span>':'';return `<div class="recent-row"><div class="recent-icon ${e.channel}">${e.channel==='whatsapp'?'W':isShopee(e)?'S':'T'}</div><div class="recent-copy"><b>${sourceLabel(e)} ${carry}</b><span>${formatDate(e.date)}${e.note?` · ${escapeHtml(e.note)}`:''}</span></div><strong>${money(e.sales,2)}</strong></div>`;}).join('');}

function renderInputTable(){const rows=calendarMonthSales;const body=byId('input-sales-body');byId('input-entry-count').textContent=`${rows.length} entri`;if(!rows.length){body.innerHTML='<tr><td colspan="7" class="empty-cell">Belum ada entri sales.</td></tr>';return;}body.innerHTML=rows.map(e=>{const cycle=isTikTok(e)&&entryDay(e)>=26?`→ ${monthLabel(shiftMonth(entryMonth(e),1))}`:monthLabel(entryMonth(e));return `<tr><td>${formatDate(e.date)}</td><td><span class="table-tag ${e.channel}">${e.channel==='whatsapp'?'WhatsApp':'Live'}</span></td><td>${e.channel==='live'?platformLabel(e.platform):`${num(e.leads)} leads`}</td><td class="money-cell">${money(e.sales,2)}</td><td>${e.channel==='whatsapp'?num(e.buyers):'—'}</td><td>${isTikTok(e)&&entryDay(e)>=26?`<span class="status-chip warning">${cycle}</span>`:cycle}</td><td><div class="row-actions"><button data-edit="${e.id}">Edit</button><button class="danger" data-delete="${e.id}">Padam</button></div></td></tr>`;}).join('');body.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>startEdit(b.dataset.edit)));body.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteEntry(b.dataset.delete)));}

function setTargetInputs(){byId('target-ws-1').value=currentTarget.ws1;byId('target-ws-2').value=currentTarget.ws2;byId('target-ws-3').value=currentTarget.ws3;byId('target-tt-1').value=currentTarget.tt1;byId('target-tt-2').value=currentTarget.tt2;byId('target-tt-3').value=currentTarget.tt3;byId('target-tt-carry').value=currentTarget.ttCarry;byId('target-shopee').value=currentTarget.shopee;byId('commission-rate').value=currentTarget.commissionRate;}
function readTargetInputs(){return calcTarget({ws1:num(byId('target-ws-1').value),ws2:num(byId('target-ws-2').value),ws3:num(byId('target-ws-3').value),tt1:num(byId('target-tt-1').value),tt2:num(byId('target-tt-2').value),tt3:num(byId('target-tt-3').value),ttCarry:num(byId('target-tt-carry').value),shopee:num(byId('target-shopee').value),commissionRate:num(byId('commission-rate').value)});}
function updateTargetPreview(){const t=readTargetInputs();byId('target-total-preview').textContent=money(t.total);byId('target-ws-preview').textContent=money(t.whatsapp);byId('target-tiktok-preview').textContent=money(t.tiktok);byId('target-shopee-preview').textContent=money(t.shopee);byId('target-ws-total-preview').textContent=money(t.whatsapp);byId('target-tt-total-preview').textContent=money(t.tiktok);byId('target-shopee-total-preview').textContent=money(t.shopee);byId('target-grand-preview').textContent=money(t.total);byId('target-carry-preview').textContent=money(t.ttCarry);}
['target-ws-1','target-ws-2','target-ws-3','target-tt-1','target-tt-2','target-tt-3','target-tt-carry','target-shopee','commission-rate'].forEach(id=>byId(id).addEventListener('input',updateTargetPreview));
byId('target-form').addEventListener('submit',async e=>{e.preventDefault();const t=readTargetInputs();try{await db.collection('meta').doc(targetDocId()).set({kind:'intern_target',staffUid:currentUser.uid,monthKey:selectedMonth,...t,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});currentTarget=t;toast(`Target ${monthLabel(selectedMonth)} disimpan.`);renderEverything();}catch(err){console.error(err);toast('Gagal simpan target.','error');}});
function segmentActuals(){const rows=calendarMonthSales;const ws=rows.filter(e=>e.channel==='whatsapp'),tt=rows.filter(isTikTok),sh=rows.filter(isShopee);const sum=(arr,a,b)=>arr.filter(e=>entryDay(e)>=a&&entryDay(e)<=b).reduce((n,e)=>n+num(e.sales),0);const end=daysInMonth(selectedMonth);return{ws1:sum(ws,1,10),ws2:sum(ws,11,20),ws3:sum(ws,21,end),tt1:sum(tt,1,8),tt2:sum(tt,9,16),tt3:sum(tt,17,25),ttCarry:sum(tt,26,end),shopee:sh.reduce((n,e)=>n+num(e.sales),0)};}
function renderTarget(){updateTargetPreview();const a=segmentActuals(),t=currentTarget;const cards=[['WhatsApp 1–10hb',a.ws1,t.ws1],['WhatsApp 11–20hb',a.ws2,t.ws2],['WhatsApp 21–Akhir',a.ws3,t.ws3],['TikTok 1–8hb',a.tt1,t.tt1],['TikTok 9–16hb',a.tt2,t.tt2],['TikTok 17–25hb',a.tt3,t.tt3],['TikTok 26–Akhir · Carry',a.ttCarry,t.ttCarry],['Shopee · Sebulan',a.shopee,t.shopee]];byId('target-progress-grid').innerHTML=cards.map(([label,actual,target])=>{const p=pct(actual,target),ok=target>0&&actual>=target;const cls=target===0?'neutral':ok?'achieved':'behind';return `<div class="segment-card ${cls}"><div class="segment-head"><span>${label}</span><b>${target?`${p.toFixed(0)}%`:'—'}</b></div><strong>${money(actual)}</strong><small>Target ${money(target)}</small><div class="segment-bar"><i style="width:${clamp(p,0,100)}%"></i></div><em>${target===0?'Tiada target':ok?`Lebih ${money(actual-target)}`:`Kurang ${money(target-actual)}`}</em></div>`;}).join('');}

function toggleSourceFields(){const source=byId('sale-source').value;byId('live-fields').hidden=source!=='live';byId('whatsapp-fields').hidden=source!=='whatsapp';updateInputPreview();}
byId('sale-source').addEventListener('change',toggleSourceFields);['sale-date','sale-platform','sale-live-hours','sale-leads','sale-buyers','sale-amount'].forEach(id=>byId(id).addEventListener('input',updateInputPreview));
function updateInputPreview(){const source=byId('sale-source').value,platform=byId('sale-platform').value,amount=num(byId('sale-amount').value),date=byId('sale-date').value;byId('preview-amount').textContent=money(amount,2);byId('preview-source').textContent=source==='live'?`Live · ${platformLabel(platform)}`:'WhatsApp';byId('preview-date').textContent=formatDate(date);const carry=source==='live'&&(platform==='solusi'||platform==='mamayuyu')&&Number(date.slice(8,10))>=26;byId('preview-detail').textContent=carry?`Carry forward → ${monthLabel(shiftMonth(date.slice(0,7),1))}`:source==='live'?`${num(byId('sale-live-hours').value)} jam`:`${num(byId('sale-leads').value)} leads · ${num(byId('sale-buyers').value)} buyer`;}
byId('sales-form').addEventListener('submit',async e=>{e.preventDefault();const btn=byId('sales-submit');btn.disabled=true;btn.textContent='Menyimpan...';const date=byId('sale-date').value,channel=byId('sale-source').value,platform=channel==='live'?byId('sale-platform').value:'';const data={kind:'intern_sales',staffUid:currentUser.uid,staffEmail:currentUser.email||'',staffName:(currentProfile&&currentProfile.name)||'',date,monthKey:date.slice(0,7),channel,platform,sales:num(byId('sale-amount').value),liveHours:channel==='live'?num(byId('sale-live-hours').value):0,leads:channel==='whatsapp'?num(byId('sale-leads').value):0,buyers:channel==='whatsapp'?num(byId('sale-buyers').value):0,note:byId('sale-note').value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};try{if(editingId){await db.collection('entries').doc(editingId).set(data,{merge:true});toast('Sales berjaya dikemas kini.');}else{data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await db.collection('entries').add(data);const carry=channel==='live'&&(platform==='solusi'||platform==='mamayuyu')&&Number(date.slice(8,10))>=26;toast(carry?`Sales disimpan sebagai carry forward ke ${monthLabel(shiftMonth(date.slice(0,7),1))}.`:'Sales berjaya disimpan.');}selectedMonth=date.slice(0,7);byId('global-month').value=selectedMonth;resetForm();await refreshAll();}catch(err){console.error(err);toast('Gagal simpan sales. Semak Firestore Rules.','error');}finally{btn.disabled=false;btn.textContent='Simpan Sales';}});
function startEdit(id){const e=allSales.find(x=>x.id===id);if(!e)return;editingId=id;switchView('input');byId('sales-form-title').textContent='Edit Rekod Sales';byId('sale-date').value=e.date||todayISO();byId('sale-source').value=e.channel||'live';byId('sale-platform').value=e.platform||'shopee';byId('sale-live-hours').value=num(e.liveHours);byId('sale-leads').value=num(e.leads);byId('sale-buyers').value=num(e.buyers);byId('sale-amount').value=num(e.sales);byId('sale-note').value=e.note||'';byId('cancel-edit').hidden=false;toggleSourceFields();}
function resetForm(){editingId=null;byId('sales-form').reset();byId('sales-form-title').textContent='Rekod Sales Baru';byId('sale-date').value=todayISO();byId('sale-source').value='live';byId('sale-platform').value='shopee';byId('sale-leads').value=0;byId('sale-buyers').value=0;byId('cancel-edit').hidden=true;toggleSourceFields();}
byId('cancel-edit').addEventListener('click',resetForm);
async function deleteEntry(id){if(!confirm('Padam rekod sales ini?'))return;try{await db.collection('entries').doc(id).delete();toast('Rekod dipadam.');await refreshAll();}catch(err){console.error(err);toast('Gagal padam rekod.','error');}}

// Creative Analysis
byId('poster-image').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file){pendingPosterImage='';return;}try{pendingPosterImage=await compressImage(file);byId('poster-upload-preview').innerHTML=`<img src="${pendingPosterImage}" alt="Preview poster">`;}catch(err){console.error(err);toast('Gagal proses gambar poster.','error');}});
function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=760,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.round(img.width*scale),h=Math.round(img.height*scale),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);resolve(canvas.toDataURL('image/jpeg',.68));};img.src=reader.result;};reader.readAsDataURL(file);});}
byId('poster-form').addEventListener('submit',async e=>{e.preventDefault();if(!pendingPosterImage){toast('Sila pilih screenshot poster.','error');return;}const data={kind:'intern_creative',staffUid:currentUser.uid,staffEmail:currentUser.email||'',name:byId('poster-name').value.trim(),creativeType:byId('poster-type').value,status:byId('poster-status').value,imageDataUrl:pendingPosterImage,note:byId('poster-note').value.trim(),createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};try{await db.collection('posters').add(data);toast('Poster berjaya ditambah.');byId('poster-form').reset();pendingPosterImage='';byId('poster-upload-preview').innerHTML='<span>Preview screenshot akan keluar di sini</span>';await loadCreative();renderCreative();}catch(err){console.error(err);toast('Gagal simpan poster. Pastikan gambar tidak terlalu besar.','error');}});
byId('creative-daily-form').addEventListener('submit',async e=>{e.preventDefault();const posterId=byId('creative-poster-id').value,date=byId('creative-date').value;if(!posterId){toast('Tambah poster dahulu.','error');return;}const existing=editingCreativeDailyId?creativeDaily.find(x=>x.id===editingCreativeDailyId):creativeDaily.find(x=>x.posterId===posterId&&x.date===date);const data={kind:'intern_creative_daily',staffUid:(existing&&existing.staffUid)||currentUser.uid,staffEmail:(existing&&existing.staffEmail)||currentUser.email||'',posterId,date,monthKey:date.slice(0,7),leads:num(byId('creative-leads').value),buyers:num(byId('creative-buyers').value),sales:num(byId('creative-sales').value),note:byId('creative-daily-note').value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};try{if(existing)await db.collection('entries').doc(existing.id).set(data,{merge:true});else{data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await db.collection('entries').add(data);}toast(existing?'Performance berjaya dikemas kini.':'Performance harian disimpan.');editingCreativeDailyId=null;byId('creative-leads').value=0;byId('creative-buyers').value=0;byId('creative-sales').value=0;byId('creative-daily-note').value='';const submitBtn=byId('creative-daily-form').querySelector('button[type=submit]');if(submitBtn)submitBtn.textContent='Simpan Performance';await loadCreative();renderCreative();}catch(err){console.error(err);toast('Gagal simpan performance creative.','error');}});
function renderCreative(){const monthRows=creativeDaily.filter(x=>(x.monthKey||(x.date||'').slice(0,7))===selectedMonth);renderCreativePosterSelect();const ranking=allPosters.map(p=>{const rows=monthRows.filter(x=>x.posterId===p.id);const leads=rows.reduce((n,x)=>n+num(x.leads),0),buyers=rows.reduce((n,x)=>n+num(x.buyers),0),sales=rows.reduce((n,x)=>n+num(x.sales),0),days=new Set(rows.map(x=>x.date)).size,last=rows.map(x=>x.date).sort().pop()||'';return{...p,leads,buyers,sales,days,last,avg:days?leads/days:0};}).sort((a,b)=>b.leads-a.leads||b.sales-a.sales);const typeAgg={};ranking.forEach(r=>{typeAgg[r.creativeType]=(typeAgg[r.creativeType]||0)+r.leads;});const topType=Object.entries(typeAgg).sort((a,b)=>b[1]-a[1])[0];byId('creative-total-posters').textContent=allPosters.length;byId('creative-active-posters').textContent=allPosters.filter(x=>x.status==='active').length;byId('creative-total-leads').textContent=monthRows.reduce((n,x)=>n+num(x.leads),0);byId('creative-total-buyers').textContent=monthRows.reduce((n,x)=>n+num(x.buyers),0);byId('creative-top-poster').textContent=ranking[0]&&ranking[0].leads?ranking[0].name:'—';byId('creative-top-type').textContent=topType&&topType[1]?creativeTypeLabel(topType[0]):'—';byId('creative-ranking-count').textContent=`${allPosters.length} poster`;
  const body=byId('creative-ranking-body');if(!ranking.length)body.innerHTML='<tr><td colspan="9" class="empty-cell">Belum ada poster. Upload screenshot pertama untuk mula analysis.</td></tr>';else body.innerHTML=ranking.map(r=>`<tr><td><div class="poster-cell"><img src="${r.imageDataUrl||''}" alt=""><div><b>${escapeHtml(r.name)}</b><small>${escapeHtml(r.note||'')}</small></div></div></td><td><span class="creative-type-tag">${creativeTypeLabel(r.creativeType)}</span></td><td><span class="status-chip ${r.status==='active'?'success':'warning'}">${r.status==='active'?'Active':'Inactive'}</span></td><td><b>${r.leads}</b></td><td>${r.buyers}</td><td>${money(r.sales)}</td><td>${r.avg.toFixed(1)}</td><td>${r.last?formatDate(r.last):'—'}</td><td><div class="row-actions"><button data-poster-toggle="${r.id}">${r.status==='active'?'Inactive':'Active'}</button><button class="danger" data-poster-delete="${r.id}">Padam</button></div></td></tr>`).join('');body.querySelectorAll('[data-poster-toggle]').forEach(b=>b.addEventListener('click',()=>togglePosterStatus(b.dataset.posterToggle)));body.querySelectorAll('[data-poster-delete]').forEach(b=>b.addEventListener('click',()=>deletePoster(b.dataset.posterDelete)));
  const daily=monthRows.sort((a,b)=>(b.date||'').localeCompare(a.date||''));const dBody=byId('creative-daily-body');dBody.innerHTML=daily.length?daily.map(x=>{const p=allPosters.find(p=>p.id===x.posterId);return `<tr><td>${formatDate(x.date)}</td><td>${escapeHtml(p?p.name:'Poster dipadam')}</td><td><b>${num(x.leads)}</b></td><td>${num(x.buyers)}</td><td>${money(x.sales)}</td><td>${escapeHtml(x.note||'—')}</td><td><div class="row-actions"><button data-creative-edit="${x.id}">Edit</button><button class="danger" data-creative-delete="${x.id}">Padam</button></div></td></tr>`;}).join(''):'<tr><td colspan="7" class="empty-cell">Belum ada performance harian bulan ini.</td></tr>';dBody.querySelectorAll('[data-creative-edit]').forEach(b=>b.addEventListener('click',()=>startCreativeDailyEdit(b.dataset.creativeEdit)));dBody.querySelectorAll('[data-creative-delete]').forEach(b=>b.addEventListener('click',()=>deleteCreativeDaily(b.dataset.creativeDelete)));renderCreativeCharts(ranking,typeAgg);
}
function renderCreativePosterSelect(){const sel=byId('creative-poster-id'),current=sel.value;const editing=editingCreativeDailyId?creativeDaily.find(x=>x.id===editingCreativeDailyId):null;const allowed=allPosters.filter(x=>x.status==='active'||(editing&&x.id===editing.posterId));sel.innerHTML=allowed.length?allowed.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(p=>`<option value="${p.id}">${escapeHtml(p.name)} · ${creativeTypeLabel(p.creativeType)}${p.status==='inactive'?' · Inactive':''}</option>`).join(''):'<option value="">Tambah poster dahulu</option>';if(allowed.some(x=>x.id===current))sel.value=current;}
async function togglePosterStatus(id){const p=allPosters.find(x=>x.id===id);if(!p)return;try{await db.collection('posters').doc(id).update({status:p.status==='active'?'inactive':'active',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});await loadCreative();renderCreative();toast(`Poster ditukar kepada ${p.status==='active'?'Inactive':'Active'}.`);}catch(err){console.error(err);toast('Gagal tukar status poster.','error');}}
async function deletePoster(id){if(!confirm('Padam poster dan semua rekod performance hariannya?'))return;try{const related=creativeDaily.filter(x=>x.posterId===id);await Promise.all([db.collection('posters').doc(id).delete(),...related.map(x=>db.collection('entries').doc(x.id).delete())]);await loadCreative();renderCreative();toast('Poster dipadam.');}catch(err){console.error(err);toast('Gagal padam poster.','error');}}
function startCreativeDailyEdit(id){const x=creativeDaily.find(r=>r.id===id);if(!x)return;editingCreativeDailyId=id;renderCreativePosterSelect();byId('creative-date').value=x.date||'';byId('creative-poster-id').value=x.posterId||'';byId('creative-leads').value=num(x.leads);byId('creative-buyers').value=num(x.buyers);byId('creative-sales').value=num(x.sales);byId('creative-daily-note').value=x.note||'';const submitBtn=byId('creative-daily-form').querySelector('button[type=submit]');if(submitBtn)submitBtn.textContent='Update Performance';byId('creative-daily-form').scrollIntoView({behavior:'smooth',block:'center'});toast('Mode edit dibuka. Ubah maklumat dan tekan Update Performance.');}
async function deleteCreativeDaily(id){if(!confirm('Padam rekod performance ini?'))return;try{await db.collection('entries').doc(id).delete();await loadCreative();renderCreative();toast('Rekod performance dipadam.');}catch(err){console.error(err);toast('Gagal padam rekod.','error');}}
function renderCreativeCharts(rankingArg,typeAggArg){if(typeof Chart==='undefined'||!byId('creative-poster-chart'))return;let ranking=rankingArg,typeAgg=typeAggArg;if(!ranking){const rows=creativeDaily.filter(x=>(x.monthKey||(x.date||'').slice(0,7))===selectedMonth);ranking=allPosters.map(p=>({...p,leads:rows.filter(x=>x.posterId===p.id).reduce((n,x)=>n+num(x.leads),0)})).sort((a,b)=>b.leads-a.leads);typeAgg={};ranking.forEach(r=>typeAgg[r.creativeType]=(typeAgg[r.creativeType]||0)+r.leads);}const css=getComputedStyle(document.documentElement),text=css.getPropertyValue('--text').trim()||'#eee',muted=css.getPropertyValue('--muted').trim()||'#888',grid=css.getPropertyValue('--line').trim()||'#222';if(creativePosterChart)creativePosterChart.destroy();creativePosterChart=new Chart(byId('creative-poster-chart'),{type:'bar',data:{labels:ranking.slice(0,10).map(r=>r.name),datasets:[{label:'Leads',data:ranking.slice(0,10).map(r=>r.leads),backgroundColor:'#ef3340',borderRadius:7}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:muted,maxRotation:35}},y:{beginAtZero:true,grid:{color:grid},ticks:{color:muted,precision:0}}}}});const types=Object.entries(typeAgg).sort((a,b)=>b[1]-a[1]);if(creativeTypeChart)creativeTypeChart.destroy();creativeTypeChart=new Chart(byId('creative-type-chart'),{type:'doughnut',data:{labels:types.map(x=>creativeTypeLabel(x[0])),datasets:[{data:types.map(x=>x[1]),backgroundColor:['#ef3340','#f2a93b','#7c8cff','#2bc48a','#ff7d52'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:text,usePointStyle:true,boxWidth:8}}}}});}

// COD Tracker
byId('cod-form').addEventListener('submit',async e=>{e.preventDefault();const btn=byId('cod-submit');btn.disabled=true;const date=byId('cod-date').value;const data={kind:'intern_cod',staffUid:currentUser.uid,staffEmail:currentUser.email||'',date,monthKey:date.slice(0,7),customerName:byId('cod-name').value.trim(),phone:byId('cod-phone').value.trim(),sales:num(byId('cod-sales').value),tracking:byId('cod-tracking').value.trim(),courier:byId('cod-courier').value.trim(),deliveryStatus:byId('cod-delivery-status').value,paymentStatus:byId('cod-payment-status').value,note:byId('cod-note').value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};try{if(codEditingId)await db.collection('entries').doc(codEditingId).set(data,{merge:true});else{data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await db.collection('entries').add(data);}toast(codEditingId?'COD dikemas kini.':'COD disimpan.');resetCodForm();await loadCod();renderCod();}catch(err){console.error(err);toast('Gagal simpan COD.','error');}finally{btn.disabled=false;}});
function codMonthRows(){return codEntries.filter(x=>(x.monthKey||(x.date||'').slice(0,7))===selectedMonth).sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
function isCodRisk(x){return x.paymentStatus!=='paid'&&['out_delivery','delivered','failed','return'].includes(x.deliveryStatus);}
function renderCod(){const rows=codMonthRows(),total=rows.reduce((n,x)=>n+num(x.sales),0),delivered=rows.filter(x=>x.deliveryStatus==='delivered').length,pending=rows.filter(x=>['order','shipped','out_delivery'].includes(x.deliveryStatus)).length,paid=rows.filter(x=>x.paymentStatus==='paid').length,risk=rows.filter(isCodRisk).length;byId('cod-total-sales').textContent=money(total);byId('cod-total-customers').textContent=rows.length;byId('cod-delivered').textContent=delivered;byId('cod-pending-delivery').textContent=pending;byId('cod-paid').textContent=paid;byId('cod-risk').textContent=risk;byId('cod-entry-count').textContent=`${rows.length} customer`;
  const groups={};rows.forEach(x=>{groups[x.date]??={count:0,sales:0,risk:0};groups[x.date].count++;groups[x.date].sales+=num(x.sales);if(isCodRisk(x))groups[x.date].risk++;});byId('cod-daily-summary').innerHTML=Object.keys(groups).length?Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,g])=>`<div class="daily-summary-card"><span>${formatDate(date)}</span><b>${money(g.sales)}</b><small>${g.count} orang${g.risk?` · <strong>${g.risk} follow up</strong>`:''}</small></div>`).join(''):'<div class="empty-state">Belum ada COD bulan ini.</div>';
  const body=byId('cod-body');body.innerHTML=rows.length?rows.map(x=>{const riskClass=isCodRisk(x)?'cod-risk-row':'';const phoneUrl=whatsappUrl(x.phone);return `<tr class="${riskClass}"><td>${formatDate(x.date)}</td><td>${escapeHtml(x.customerName||'—')}</td><td><div class="phone-cell"><span>${escapeHtml(x.phone)}</span>${phoneUrl?`<a class="mini-link" href="${phoneUrl}" target="_blank" rel="noopener">Chat</a>`:''}</div></td><td class="money-cell">${money(x.sales,2)}</td><td><b>${escapeHtml(x.tracking||'—')}</b><small class="table-sub">${escapeHtml(x.courier||'')}</small></td><td><span class="delivery-chip ${x.deliveryStatus}">${deliveryLabel(x.deliveryStatus)}</span></td><td><span class="payment-chip ${x.paymentStatus}">${paymentLabel(x.paymentStatus)}</span></td><td>${escapeHtml(x.note||'—')}</td><td><div class="row-actions"><button data-cod-edit="${x.id}">Edit</button><button class="danger" data-cod-delete="${x.id}">Padam</button></div></td></tr>`;}).join(''):'<tr><td colspan="9" class="empty-cell">Belum ada customer COD bulan ini.</td></tr>';body.querySelectorAll('[data-cod-edit]').forEach(b=>b.addEventListener('click',()=>startCodEdit(b.dataset.codEdit)));body.querySelectorAll('[data-cod-delete]').forEach(b=>b.addEventListener('click',()=>deleteCod(b.dataset.codDelete)));}
function whatsappUrl(phone){let d=String(phone||'').replace(/\D/g,'');if(!d)return'';if(d.startsWith('0'))d='60'+d.slice(1);else if(!d.startsWith('60'))d='60'+d;return `https://wa.me/${d}`;}
function startCodEdit(id){const x=codEntries.find(r=>r.id===id);if(!x)return;codEditingId=id;switchView('cod');byId('cod-date').value=x.date||todayISO();byId('cod-name').value=x.customerName||'';byId('cod-phone').value=x.phone||'';byId('cod-sales').value=num(x.sales);byId('cod-tracking').value=x.tracking||'';byId('cod-courier').value=x.courier||'';byId('cod-delivery-status').value=x.deliveryStatus||'order';byId('cod-payment-status').value=x.paymentStatus||'pending';byId('cod-note').value=x.note||'';byId('cod-submit').textContent='Simpan Perubahan';byId('cod-cancel-edit').hidden=false;}
function resetCodForm(){codEditingId=null;byId('cod-form').reset();byId('cod-date').value=todayISO();byId('cod-delivery-status').value='order';byId('cod-payment-status').value='pending';byId('cod-submit').textContent='Simpan COD';byId('cod-cancel-edit').hidden=true;}
byId('cod-cancel-edit').addEventListener('click',resetCodForm);
async function deleteCod(id){if(!confirm('Padam rekod COD ini?'))return;try{await db.collection('entries').doc(id).delete();await loadCod();renderCod();toast('COD dipadam.');}catch(err){console.error(err);toast('Gagal padam COD.','error');}}

function renderReport(){const s=stats();byId('report-total').textContent=money(s.total);byId('report-tiktok').textContent=money(s.tiktok);byId('report-shopee').textContent=money(s.shopee);byId('report-ws').textContent=money(s.whatsapp);byId('report-commission').textContent=money(s.commission,2);byId('report-achievement').textContent=`${pct(s.total,currentTarget.total).toFixed(1)}%`;byId('report-cycle-note').textContent=`Cycle ${monthLabel(selectedMonth)}: TikTok 1–25hb bulan ini + carry-in 26hb–akhir daripada ${monthLabel(shiftMonth(selectedMonth,-1))}. Sales TikTok 26hb–akhir ${monthLabel(selectedMonth)} dibawa ke ${monthLabel(shiftMonth(selectedMonth,1))} dan tidak dikira komisen.`;const body=byId('report-sales-body');if(!monthSales.length){body.innerHTML='<tr><td colspan="10" class="empty-cell">Belum ada data untuk cycle bulan ini.</td></tr>';return;}body.innerHTML=monthSales.map(e=>{const carry=isTikTok(e)&&entryDay(e)>=26;return `<tr><td>${formatDate(e.date)}</td><td>${e.channel==='whatsapp'?'WhatsApp':'Live'}</td><td>${e.channel==='live'?platformLabel(e.platform):'—'}</td><td class="money-cell">${money(e.sales,2)}</td><td>${e.channel==='whatsapp'?num(e.leads):'—'}</td><td>${e.channel==='whatsapp'?num(e.buyers):'—'}</td><td>${e.channel==='live'?`${num(e.liveHours)} jam`:'—'}</td><td>${carry?'<span class="status-chip warning">Carry-in</span>':'Semasa'}</td><td>${money(commissionForEntry(e),2)}</td><td>${escapeHtml(e.note||'—')}</td></tr>`;}).join('');}
byId('export-csv').addEventListener('click',()=>{const rows=[['Tarikh Asal','Jenis','Platform','Sales (RM)','Leads','Buyer','Masa Live (jam)','Cycle','Komisen (RM)','Nota'],...monthSales.map(e=>[e.date,e.channel==='whatsapp'?'WhatsApp':'Live',e.channel==='live'?platformLabel(e.platform):'',num(e.sales),num(e.leads),num(e.buyers),num(e.liveHours),isTikTok(e)&&entryDay(e)>=26?'Carry-in':'Semasa',commissionForEntry(e).toFixed(2),e.note||''])];const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sales-intern-cycle-${selectedMonth}.csv`;a.click();URL.revokeObjectURL(a.href);});

function renderCharts(){if(typeof Chart==='undefined'||!byId('trend-chart'))return;const s=stats(),d=daysInMonth(selectedMonth),byDay={};let start=s.carryIn;monthSales.forEach(e=>{if(entryMonth(e)!==selectedMonth)return;const day=entryDay(e);if(day)byDay[day]=(byDay[day]||0)+num(e.sales);});let cum=start;const labels=[],actual=[],target=[];for(let i=1;i<=d;i++){labels.push(String(i));cum+=byDay[i]||0;actual.push(cum);target.push(currentTarget.total*(i/d));}const css=getComputedStyle(document.documentElement),text=css.getPropertyValue('--text').trim()||'#eee',muted=css.getPropertyValue('--muted').trim()||'#888',grid=css.getPropertyValue('--line').trim()||'#222';if(trendChart)trendChart.destroy();trendChart=new Chart(byId('trend-chart'),{type:'line',data:{labels,datasets:[{label:'Sales Cumulative',data:actual,borderColor:'#ff4d5d',backgroundColor:'rgba(255,77,93,.12)',fill:true,tension:.3,borderWidth:2.5,pointRadius:1.5},{label:'Target Pace',data:target,borderColor:'#7d8b9e',borderDash:[6,6],tension:.2,borderWidth:2,pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:text,usePointStyle:true,boxWidth:8}}},scales:{x:{grid:{display:false},ticks:{color:muted,maxTicksLimit:10}},y:{grid:{color:grid},ticks:{color:muted,callback:v=>'RM'+Number(v).toLocaleString('en-MY')}}}}});if(mixChart)mixChart.destroy();mixChart=new Chart(byId('mix-chart'),{type:'doughnut',data:{labels:['TikTok Live','Shopee Live','WhatsApp'],datasets:[{data:[s.tiktok,s.shopee,s.whatsapp],backgroundColor:['#ef3340','#f2a93b','#2bc48a'],borderWidth:0,hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{color:text,usePointStyle:true,padding:18,boxWidth:8}}}}});}


/* intern-admin-auth-listener-v53 */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    try {
      const u = (typeof currentUser !== "undefined" ? currentUser : null);
      const source = (typeof entries !== "undefined" && Array.isArray(entries)) ? entries :
                     (typeof allEntries !== "undefined" && Array.isArray(allEntries)) ? allEntries :
                     (typeof salesEntries !== "undefined" && Array.isArray(salesEntries)) ? salesEntries : [];
      setupInternAdminFilter(source, u);
    } catch(e) {}
  }, 800);
});
