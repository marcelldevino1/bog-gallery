import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ygpjgopwrlncxmxtwlhi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);

const tbody = $("#tbody");
const qEl = $("#q");
const teamEl = $("#team");
const statusEl = $("#status");
const perPageEl = $("#perPage");
const statsEl = $("#stats");
const pageInfoEl = $("#pageInfo");
const prevBtn = $("#prev");
const nextBtn = $("#next");

let rows = [];
let filtered = [];
let page = 1;

function safeInt(v){ return Math.max(0, parseInt(v || "0", 10) || 0); }

function escapeHtml(str=""){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function badge(status){
  const s = (status || "").toLowerCase();
  if (s === "active") return `<span class="badge badge--active">Active</span>`;
  if (s === "trial") return `<span class="badge badge--trial">Trial</span>`;
  if (s === "inactive") return `<span class="badge badge--inactive">Inactive</span>`;
  return `<span class="badge">${escapeHtml(status || "-")}</span>`;
}

function buildTeamOptions(data){
  const teams = Array.from(new Set((data || []).map(r => (r.team || "").trim()).filter(Boolean))).sort();
  teamEl.innerHTML = `<option value="">Semua Tim</option>` + teams.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
}

function applyFilters(){
  const q = (qEl.value || "").trim().toLowerCase();
  const team = teamEl.value || "";
  const status = statusEl.value || "";
  const perPage = safeInt(perPageEl.value) || 20;

  filtered = rows.filter(r => {
    if (team && r.team !== team) return false;
    if (status && (r.status || "") !== status) return false;

    if (!q) return true;
    const hay = [
      r.name, r.nickname, r.pubg_id, r.manager, r.team, r.status
    ].map(x => String(x || "").toLowerCase()).join(" | ");
    return hay.includes(q);
  });

  // reset page kalau out-of-range
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if (page > totalPages) page = totalPages;
  if (page < 1) page = 1;

  render();
}

function render(){
  const perPage = safeInt(perPageEl.value) || 20;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const slice = filtered.slice(start, start + perPage);

  statsEl.textContent = `${total} item`;
  pageInfoEl.textContent = `${page}/${totalPages}`;

  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;

  if (!slice.length){
    tbody.innerHTML = `<tr><td colspan="7" class="muted" style="padding:14px">Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = slice.map(r => `
    <tr>
      <td><b>${escapeHtml(r.name)}</b></td>
      <td>${escapeHtml(String(r.age ?? 0))}</td>
      <td>${escapeHtml(r.team || "-")}</td>
      <td>${escapeHtml(r.nickname || "-")}</td>
      <td>${escapeHtml(r.pubg_id || "-")}</td>
      <td>${escapeHtml(r.manager || "-")}</td>
      <td>${badge(r.status)}</td>
    </tr>
  `).join("");
}

async function load(){
  tbody.innerHTML = `<tr><td colspan="7" class="muted" style="padding:14px">Loading...</td></tr>`;

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("team", { ascending: true })
    .order("name", { ascending: true });

  if (error){
    tbody.innerHTML = `<tr><td colspan="7" class="muted" style="padding:14px">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  rows = (data || []).map(r => ({
    ...r,
    age: safeInt(r.age),
    team: String(r.team || "").trim(),
    status: r.status || "Active",
  }));

  buildTeamOptions(rows);
  applyFilters();
}

qEl.addEventListener("input", ()=>{ page = 1; applyFilters(); });
teamEl.addEventListener("change", ()=>{ page = 1; applyFilters(); });
statusEl.addEventListener("change", ()=>{ page = 1; applyFilters(); });
perPageEl.addEventListener("change", ()=>{ page = 1; applyFilters(); });

prevBtn.addEventListener("click", ()=>{ page--; applyFilters(); });
nextBtn.addEventListener("click", ()=>{ page++; applyFilters(); });

load();
