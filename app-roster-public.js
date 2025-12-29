import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ygpjgopwrlncxmxtwlhi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);

const tbody = $("#tbody");
const qEl = $("#q");
const teamEl = $("#team");
const statsEl = $("#stats");

let rows = [];
let filtered = [];

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badge(status) {
  const s = (status || "").toLowerCase();
  if (s === "aktif") return `<span class="badge badge--active">Aktif</span>`;
  if (s === "trial") return `<span class="badge badge--trial">Trial</span>`;
  if (s === "nonaktif") return `<span class="badge badge--inactive">Nonaktif</span>`;
  if (s === "cadangan") return `<span class="badge">Cadangan</span>`;
  return `<span class="badge">${escapeHtml(status || "-")}</span>`;
}

// bikin link wa.me yang bersih (tanpa +, spasi, strip)
function waLink(waRaw) {
  const raw = String(waRaw || "").trim();
  if (!raw) return `<span class="muted">-</span>`;

  const digits = raw.replace(/\D/g, ""); // ambil angka saja
  if (!digits) return `<span class="muted">-</span>`;

  // Tampilkan tombol Chat (lebih aman daripada tampil nomor mentah)
  return `<a class="btn" href="https://wa.me/${digits}" target="_blank" rel="noopener">Chat</a>`;
}

function buildTeamOptions(data) {
  const teams = Array.from(
    new Set((data || []).map(r => (r.team || "").trim()).filter(Boolean))
  ).sort();

  teamEl.innerHTML =
    `<option value="">Semua Tim</option>` +
    teams.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
}

function applyFilters() {
  const q = (qEl.value || "").trim().toLowerCase();
  const team = teamEl.value || "";

  filtered = rows.filter(r => {
    if (team && (r.team || "") !== team) return false;

    if (!q) return true;
    const hay = [
      r.name, r.nickname, r.pubg_id, r.manager, r.team, r.status, r.wa
    ].map(x => String(x || "").toLowerCase()).join(" | ");
    return hay.includes(q);
  });

  render();
}

function render() {
  statsEl.textContent = `${filtered.length} item`;

  if (!filtered.length) {
    tbody.innerHTML =
      `<tr><td colspan="8" class="muted" style="padding:14px">Tidak ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td><b>${escapeHtml(r.name || "-")}</b></td>
      <td>${escapeHtml(r.age || "-")}</td>
      <td>${escapeHtml(r.team || "-")}</td>
      <td>${escapeHtml(r.nickname || "-")}</td>
      <td>${escapeHtml(r.pubg_id || "-")}</td>
      <td>${escapeHtml(r.manager || "-")}</td>
      <td>${waLink(r.wa)}</td>
      <td>${badge(r.status)}</td>
    </tr>
  `).join("");
}


async function load() {
  tbody.innerHTML = `<tr><td colspan="8" class="muted" style="padding:14px">Loading...</td></tr>`;

  // public hanya SELECT -> policy anon SELECT harus ada
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("team", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted" style="padding:14px">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  rows = (data || []).map(r => ({
    ...r,
    team: String(r.team || "").trim(),
    status: r.status || "Aktif",
    age: r.age ? String(r.age) : "",
    wa: r.wa ? String(r.wa) : "",
  }));

  buildTeamOptions(rows);
  applyFilters();
}

qEl.addEventListener("input", applyFilters);
teamEl.addEventListener("change", applyFilters);

load();
