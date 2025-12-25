const $ = (sel) => document.querySelector(sel);
const grid = $("#grid");
const empty = $("#empty");
const stats = $("#stats");

const detailModal = $("#detailModal");

const searchInput = $("#searchInput");
const filterYear = $("#filterYear");
const sortBy = $("#sortBy");

let state = {
  items: [],
  selectedId: null,
  filters: {
    q: "",
    year: "",
    sort: "newest",
  },
};

function formatDate(iso){
  if(!iso) return "-";
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { year:"numeric", month:"short", day:"2-digit" });
}

function yearOf(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return "";
  return String(d.getFullYear());
}

function escapeHtml(str=""){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getVisibleItems(){
  const q = state.filters.q.trim().toLowerCase();
  const y = state.filters.year;
  const sort = state.filters.sort;

  let items = [...state.items];

  if(q){
    items = items.filter(it => {
      const hay = [
        it.title, it.event, it.team, it.rank, it.note, yearOf(it.date), it.date
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  if(y){
    items = items.filter(it => yearOf(it.date) === y);
  }

  items.sort((a,b) => {
    if(sort === "newest") return (b.date || "").localeCompare(a.date || "");
    if(sort === "oldest") return (a.date || "").localeCompare(b.date || "");
    if(sort === "titleAZ") return (a.title || "").localeCompare(b.title || "");
    if(sort === "titleZA") return (b.title || "").localeCompare(a.title || "");
    return 0;
  });

  return items;
}

function rebuildYearOptions(){
  const years = Array.from(new Set(state.items.map(it => yearOf(it.date)).filter(Boolean)))
    .sort((a,b)=> b.localeCompare(a));
  const current = state.filters.year;

  filterYear.innerHTML = `<option value="">Semua Tahun</option>` + years.map(y =>
    `<option value="${y}" ${y===current ? "selected": ""}>${y}</option>`
  ).join("");
}

function cardTemplate(it){
  const dateText = formatDate(it.date);
  const img = it.image || "";
  const rank = it.rank ? `<span class="pill pill--accent">${escapeHtml(it.rank)}</span>` : "";
  return `
    <article class="card" data-id="${escapeHtml(it.id)}" tabindex="0" role="button" aria-label="Buka detail ${escapeHtml(it.title)}">
      <img class="card__img" src="${escapeHtml(img)}" alt="Sertifikat: ${escapeHtml(it.title)}" loading="lazy"/>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(it.title)}</h3>
        <div class="card__meta">
          <span class="pill">${escapeHtml(it.team || "-")}</span>
          ${rank}
          <span class="pill pill--muted">${escapeHtml(dateText)}</span>
        </div>
        <div class="muted" style="font-size:12px; line-height:1.4">
          ${escapeHtml(it.event || "-")}
        </div>
      </div>
    </article>
  `;
}

function render(){
  const items = getVisibleItems();
  stats.textContent = `${items.length} item`;

  if(items.length === 0){
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  }else{
    empty.classList.add("hidden");
    grid.innerHTML = items.map(cardTemplate).join("");
  }
}

function openDetail(id){
  const it = state.items.find(x => x.id === id);
  if(!it) return;
  state.selectedId = id;

  $("#detailTitle").textContent = it.title || "Detail Sertifikat";
  $("#detailEvent").textContent = it.event || "-";
  $("#detailTeam").textContent = it.team || "-";
  $("#detailRank").textContent = it.rank || "—";
  $("#detailDate").textContent = formatDate(it.date);
  $("#detailNote").textContent = it.note ? it.note : "Tidak ada catatan.";

  const img = it.image || "";
  $("#detailImg").src = img;
  $("#btnOpenImage").href = img;

  detailModal.classList.remove("hidden");
}

function closeDetail(){
  detailModal.classList.add("hidden");
}

async function loadData(){
  // cache-bust biar update data.json kebaca cepat setelah deploy/update
  const res = await fetch(`data.json?v=${Date.now()}`, { cache: "no-store" });
  if(!res.ok) throw new Error("Gagal load data.json");
  const json = await res.json();
  if(!Array.isArray(json)) throw new Error("Format data.json harus array.");

  // minimal normalize
  state.items = json.map(it => ({
    id: it.id || it.title || String(Math.random()),
    title: it.title || "",
    event: it.event || "",
    team: it.team || "",
    date: it.date || "",
    rank: it.rank || "",
    note: it.note || "",
    image: it.image || ""
  }));
}

searchInput.addEventListener("input", (e) => {
  state.filters.q = e.target.value;
  render();
});
filterYear.addEventListener("change", (e) => {
  state.filters.year = e.target.value;
  render();
});
sortBy.addEventListener("change", (e) => {
  state.filters.sort = e.target.value;
  render();
});

grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if(!card) return;
  openDetail(card.dataset.id);
});
grid.addEventListener("keydown", (e) => {
  if(e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".card");
  if(!card) return;
  e.preventDefault();
  openDetail(card.dataset.id);
});

$("#btnCloseDetail").addEventListener("click", closeDetail);
$("#detailBackdrop").addEventListener("click", closeDetail);

(async function init(){
  $("#yearNow").textContent = String(new Date().getFullYear());
  try{
    await loadData();
  }catch(err){
    console.error(err);
    state.items = [];
  }
  rebuildYearOptions();
  render();
})();
