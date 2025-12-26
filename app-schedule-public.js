import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ygpjgopwrlncxmxtwlhi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);

// ===== DOM =====
const grid = $("#calendarGrid");
const monthLabel = $("#monthLabel");
const monthSelect = $("#monthSelect");
const yearSelect = $("#yearSelect");
const prevBtn = $("#prevMonth");
const nextBtn = $("#nextMonth");

// Modal
const tModal = $("#tModal");
const tBack = $("#tBack");
const tClose = $("#tClose");
const tTitle = $("#tTitle");
const tDateLine = $("#tDateLine");
const tList = $("#tList");

// ===== Util tanggal =====
const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const startDow = (y, m) => new Date(y, m, 1).getDay(); // 0=Min .. 6=Sab

function formatDateID(yyyyMmDd){
  // "2025-12-26" -> "26 Des 2025"
  const [y, m, d] = String(yyyyMmDd || "").slice(0,10).split("-");
  const mi = Math.max(0, (parseInt(m,10)||1) - 1);
  const di = parseInt(d,10)||1;
  return `${di} ${MONTHS_ID[mi]} ${y}`;
}

function formatMoney(n){
  return new Intl.NumberFormat("id-ID").format(Number(n || 0));
}

function escapeHtml(str=""){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===== State =====
let view = new Date();
view.setDate(1);

let events = []; // data bulan aktif

function fillMonthYearSelect(){
  monthSelect.innerHTML = MONTHS_ID.map((m,i)=>`<option value="${i}">${m}</option>`).join("");

  const nowY = new Date().getFullYear();
  const years = [];
  for (let y = nowY - 5; y <= nowY + 6; y++) years.push(y);
  yearSelect.innerHTML = years.map(y=>`<option value="${y}">${y}</option>`).join("");
}

function setControls(){
  monthLabel.textContent = `${MONTHS_ID[view.getMonth()]} ${view.getFullYear()}`;
  monthSelect.value = String(view.getMonth());
  yearSelect.value = String(view.getFullYear());
}

async function loadEventsForMonth(year, monthIndex){
  // Pakai local-date string (bukan ISO UTC)
  const startStr = `${year}-${String(monthIndex+1).padStart(2,"0")}-01`;
  const endDate = new Date(year, monthIndex + 1, 1); // awal bulan depan (local)
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,"0")}-01`;

  const { data, error } = await supabase
    .from("tournaments")
    .select("id,title,kind,organizer,teams,tour_date,start_time,fee,prizepool,note,image_url")
    .gte("tour_date", startStr)
    .lt("tour_date", endStr)
    .order("tour_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error){
    console.error("loadEventsForMonth error:", error);
    events = [];
    return;
  }

  events = (data || []).map(r => ({
    ...r,
    tour_date: String(r.tour_date).slice(0,10),
    start_time: String(r.start_time || "").slice(0,5),
    teams: Array.isArray(r.teams) ? r.teams : [],
  }));

  console.log("events loaded:", events.length, events.map(e=>e.tour_date));
}

function eventsByDateMap(){
  const map = new Map();
  for (const e of events){
    const key = String(e.tour_date).slice(0,10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return map;
}

function openModalForDate(dateKey, list){
  tTitle.textContent = "Detail Tournament";
  tDateLine.textContent = `Tanggal: ${formatDateID(dateKey)}`;

  tList.innerHTML = (list || []).map(ev => {
    const teams = (ev.teams || []).join(", ");
    const fee = `Rp ${formatMoney(ev.fee)}`;
    const prize = `Rp ${formatMoney(ev.prizepool)}`;
    const time = ev.start_time ? ev.start_time : "-";

    return `
      <div class="t-item" style="border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.03);border-radius:14px;padding:12px;display:grid;gap:8px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div>
            <div style="font-weight:700">${escapeHtml(ev.title || "-")}</div>
            <div class="muted" style="margin-top:2px">${escapeHtml(ev.kind || "")}${ev.organizer ? " • " + escapeHtml(ev.organizer) : ""}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span class="pill">${escapeHtml(time)}</span>
            <span class="pill">Fee: ${escapeHtml(fee)}</span>
            <span class="pill">Prize: ${escapeHtml(prize)}</span>
          </div>
        </div>

        ${teams ? `<div class="muted"><b>Tim:</b> ${escapeHtml(teams)}</div>` : ""}

        ${ev.note ? `<div class="muted">${escapeHtml(ev.note)}</div>` : ""}

        ${ev.image_url ? `
          <div style="border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.10)">
            <img src="${escapeHtml(ev.image_url)}" alt="Poster" style="display:block;max-width:100%;height:auto;object-fit:contain">
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  tModal.classList.remove("hidden");
}

function closeModal(){
  tModal.classList.add("hidden");
}

function renderCalendar(){
  if (!grid) return;

  grid.innerHTML = "";

  const y = view.getFullYear();
  const m = view.getMonth();
  const total = daysInMonth(y, m);
  const offset = startDow(y, m); // 0..6

  const todayKey = ymd(new Date());
  const map = eventsByDateMap();

  // 6 minggu (42 cell) biar stabil
  for (let i = 0; i < 42; i++){
    const dayNum = i - offset + 1;

    const cell = document.createElement("div");
    cell.className = "day";

    if (dayNum < 1 || dayNum > total){
      cell.classList.add("empty");
      grid.appendChild(cell);
      continue;
    }

    const d = new Date(y, m, dayNum);
    const key = ymd(d);
    const dayEvents = map.get(key) || [];

    if (key === todayKey) cell.classList.add("today");
    if (dayEvents.length) cell.classList.add("has-event");

    cell.innerHTML = `
      <div class="num">${dayNum}</div>
      ${dayEvents.slice(0,2).map(ev => `<div class="event">${escapeHtml(ev.title || "Tournament")}</div>`).join("")}
      ${dayEvents.length > 2 ? `<div class="event">+${dayEvents.length - 2} lagi</div>` : ""}
    `;

    cell.addEventListener("click", ()=>{
      if (!dayEvents.length) return;
      openModalForDate(key, dayEvents);
    });

    grid.appendChild(cell);
  }
}

// ===== Controls events =====
prevBtn?.addEventListener("click", async ()=>{
  view.setMonth(view.getMonth() - 1);
  setControls();
  await loadEventsForMonth(view.getFullYear(), view.getMonth());
  renderCalendar();
});

nextBtn?.addEventListener("click", async ()=>{
  view.setMonth(view.getMonth() + 1);
  setControls();
  await loadEventsForMonth(view.getFullYear(), view.getMonth());
  renderCalendar();
});

monthSelect?.addEventListener("change", async ()=>{
  view.setMonth(parseInt(monthSelect.value, 10));
  setControls();
  await loadEventsForMonth(view.getFullYear(), view.getMonth());
  renderCalendar();
});

yearSelect?.addEventListener("change", async ()=>{
  view.setFullYear(parseInt(yearSelect.value, 10));
  setControls();
  await loadEventsForMonth(view.getFullYear(), view.getMonth());
  renderCalendar();
});

// Modal close
tBack?.addEventListener("click", closeModal);
tClose?.addEventListener("click", closeModal);

// init
(async function init(){
  console.log("app-schedule-public.js loaded ✅");
  fillMonthYearSelect();
  setControls();
  await loadEventsForMonth(view.getFullYear(), view.getMonth());
  renderCalendar();
})();
