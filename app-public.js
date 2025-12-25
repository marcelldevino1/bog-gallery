import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ygpjgopwrlncxmxtwlhi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);

const grid = $("#grid");
const stats = $("#stats");

const q = $("#q");
const teamSel = $("#team");
const tagSel = $("#tag");
const yearSel = $("#year");
const perPageSel = $("#perPage");

const prevBtn = $("#prev");
const nextBtn = $("#next");
const pageInfo = $("#pageInfo");

const modal = $("#modal");
const back = $("#back");
const close = $("#close");

function hideSplash() {
  const splash = document.querySelector("#splash");
  if (!splash) return;
  splash.classList.add("splash--hide");
  setTimeout(() => splash.remove(), 450);
}



let items = [];
let page = 1;

function fmt(d) {
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? d
    : x.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "2-digit" });
}

function yearOf(d) {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "" : String(x.getFullYear());
}

function esc(s = "") {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function shortRank(rank) {
  const r = String(rank || "").trim();
  if (!r) return "—";
  // bikin ringkas kalau kepanjangan
  return r.length > 14 ? r.slice(0, 14) + "…" : r;
}

function rebuildFilters() {
  const teams = [...new Set(items.map((i) => i.team).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  teamSel.innerHTML =
    `<option value="">Semua Tim</option>` +
    teams.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");

  const years = [...new Set(items.map((i) => yearOf(i.date)).filter(Boolean))].sort((a, b) =>
    b.localeCompare(a)
  );
  yearSel.innerHTML =
    `<option value="">Semua Tahun</option>` +
    years.map((y) => `<option value="${y}">${y}</option>`).join("");

  const tags = [
    ...new Set(items.flatMap((i) => (Array.isArray(i.tags) ? i.tags : [])).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  tagSel.innerHTML =
    `<option value="">Semua Tag</option>` +
    tags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
}

function filtered() {
  const qq = q.value.trim().toLowerCase();
  const team = teamSel.value;
  const tag = tagSel.value;
  const year = yearSel.value;

  return items
    .filter((i) => {
      const tagsText = (i.tags || []).join(" ");
      const hay = `${i.title} ${i.event} ${i.team} ${tagsText} ${i.rank || ""} ${i.note || ""} ${
        i.date || ""
      }`.toLowerCase();

      const okQ = !qq || hay.includes(qq);
      const okTeam = !team || i.team === team;
      const okYear = !year || yearOf(i.date) === year;
      const okTag = !tag || (i.tags || []).includes(tag);

      return okQ && okTeam && okYear && okTag;
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

function paginate(list) {
  const perPage = parseInt(perPageSel.value, 10) || 9;
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * perPage;
  const slice = list.slice(start, start + perPage);

  return { slice, totalPages };
}

function render() {
  const list = filtered();
  const { slice, totalPages } = paginate(list);

  stats.textContent = `${list.length} item`;
  pageInfo.textContent = `${page}/${totalPages}`;

  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;

  grid.innerHTML = slice
    .map((i) => {
      const tags = (i.tags || []).slice(0, 6);
      const badgeText = i.rank ? shortRank(i.rank) : "Sertifikat";

      return `
      <article class="card" data-id="${esc(i.id)}">
        <div class="badge">${esc(badgeText)}</div>
        <img src="${esc(i.image_url)}" alt="${esc(i.title)}" loading="lazy">
        <div class="b">
          <div class="title">${esc(i.title)}</div>

          <div class="meta">
            <span class="pill">${esc(i.team)}</span>
            <span class="pill pill--rank">${esc(shortRank(i.rank || "—"))}</span>
            <span class="pill pill--date">${esc(fmt(i.date))}</span>
          </div>

          <div class="muted event">${esc(i.event)}</div>

          <div class="tag-row">
            ${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
          </div>
        </div>
      </article>
      `;
    })
    .join("");
}

function openDetail(id) {
  const it = items.find((x) => x.id === id);
  if (!it) return;

  $("#mtitle").textContent = it.title || "Detail";
  $("#mimg").src = it.image_url || "";
  $("#mteam").textContent = it.team || "—";
  $("#mrank").textContent = it.rank || "—";
  $("#mdate").textContent = fmt(it.date);
  $("#mevent").textContent = it.event || "—";
  $("#mnote").textContent = it.note || "Tidak ada catatan.";

  const mtags = $("#mtags");
  mtags.innerHTML = (it.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");

  $("#mopen").href = it.image_url || "#";

  modal.classList.remove("hidden");
}

function closeDetail() {
  modal.classList.add("hidden");
}

// klik card -> detail
grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  openDetail(card.dataset.id);
});

// filter events
[q, teamSel, tagSel, yearSel, perPageSel].forEach((el) => {
  el.addEventListener("input", () => {
    page = 1;
    render();
  });
  el.addEventListener("change", () => {
    page = 1;
    render();
  });
});

// pager
prevBtn.addEventListener("click", () => {
  page = Math.max(1, page - 1);
  render();
});
nextBtn.addEventListener("click", () => {
  page = page + 1;
  render();
});

// modal controls
back.addEventListener("click", closeDetail);
close.addEventListener("click", closeDetail);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});

(async function init() {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error(error);
    items = [];
  } else {
    items = data || [];
  }

  rebuildFilters();
  render();

  // tutup splash setelah render selesai
  hideSplash();
})();
