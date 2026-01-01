import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ygpjgopwrlncxmxtwlhi.supabase.co",
  "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV"
);

const NAME_KEY = "bog_display_name";
const TABLE = "finance_logs";

const loginBox = document.getElementById("loginBox");
const dashboardBox = document.getElementById("dashboardBox");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");
const btnAdd = document.getElementById("btnAdd");
const logoutBtn = document.getElementById("logout");

const displayNameEl = document.getElementById("displayName");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");

const sumInEl = document.getElementById("sumIn");
const sumOutEl = document.getElementById("sumOut");
const balanceEl = document.getElementById("balance");
const tbody = document.getElementById("tbody");
const statsEl = document.getElementById("stats");

/* Modal elements */
const modalBackdrop = document.getElementById("modalBackdrop");
const modalPreview = document.getElementById("modalPreview");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");

/* Toast */
const toast = document.getElementById("toast");

let pendingDeleteId = null;

function getName() {
  return localStorage.getItem(NAME_KEY) || "";
}
function setName(n) {
  localStorage.setItem(NAME_KEY, n);
}

function showLogin() {
  loginBox.classList.remove("hidden");
  dashboardBox.classList.add("hidden");
  btnAdd.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function showDashboard() {
  loginBox.classList.add("hidden");
  dashboardBox.classList.remove("hidden");
  btnAdd.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rupiah(n) {
  const num = Number(n || 0);
  return "Rp " + num.toLocaleString("id-ID");
}

function typeBadge(t) {
  const cls = t === "IN" ? "fbadge--in" : "fbadge--out";
  return `<span class="fbadge ${cls}">${escapeHtml(t)}</span>`;
}

function showToast(message = "OK", ms = 1800) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toast.classList.remove("show"), ms);
}

/* ===== MODAL ===== */
function openDeleteModal(row) {
  pendingDeleteId = row.id;

  modalPreview.innerHTML = `
    <div style="display:grid;gap:6px">
      <div><b>${escapeHtml(row.team_name || "-")}</b> • ${typeBadge(row.type)}</div>
      <div class="muted" style="font-size:12px">${escapeHtml(rupiah(row.amount))} • ${escapeHtml(row.category || "-")}</div>
      <div class="muted" style="font-size:12px">${escapeHtml(row.description || "-")}</div>
      <div class="muted" style="font-size:12px">Pelaku: ${escapeHtml(row.actor_name || "-")}</div>
    </div>
  `;

  modalBackdrop.classList.add("show");
  modalBackdrop.setAttribute("aria-hidden", "false");
}

function closeDeleteModal() {
  pendingDeleteId = null;
  modalBackdrop.classList.remove("show");
  modalBackdrop.setAttribute("aria-hidden", "true");
}

modalCancel.addEventListener("click", closeDeleteModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeDeleteModal();
});

/* ===== AUTH ===== */
loginBtn.addEventListener("click", async () => {
  loginMsg.textContent = "Login...";

  const name = (displayNameEl.value || "").trim();
  const email = (emailEl.value || "").trim();
  const password = passwordEl.value || "";

  if (!name) return (loginMsg.textContent = "Nama wajib diisi.");
  if (!email || !password) return (loginMsg.textContent = "Email & password wajib diisi.");

  setName(name);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return (loginMsg.textContent = error.message);

  loginMsg.textContent = "Login berhasil.";
  await loadData();
  showDashboard();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showToast("Logout berhasil");
  showLogin();
});

/* ===== LOAD & RENDER ===== */
async function loadData() {
  const { data: sessionRes } = await supabase.auth.getSession();
  if (!sessionRes.session || !getName()) {
    showLogin();
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showToast(error.message, 2400);
    return;
  }

  let tin = 0, tout = 0;
  tbody.innerHTML = "";

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted" style="padding:14px">Belum ada transaksi</td></tr>`;
    sumInEl.textContent = "Rp 0";
    sumOutEl.textContent = "Rp 0";
    balanceEl.textContent = "Rp 0";
    statsEl.textContent = "0 item";
    return;
  }

  for (const r of data) {
    if (r.type === "IN") tin += Number(r.amount || 0);
    else tout += Number(r.amount || 0);

    const date = new Date(r.created_at).toLocaleString("id-ID");

    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(r.team_name || "-")}</td>
        <td>${typeBadge(r.type || "-")}</td>
        <td>${escapeHtml(rupiah(r.amount))}</td>
        <td>${escapeHtml(r.category || "-")}</td>
        <td>${escapeHtml(r.description || "-")}</td>
        <td>${escapeHtml(r.actor_name || "-")}</td>
        <td>
          <button class="btn btn--danger btn--sm" data-del="${escapeHtml(r.id)}">Hapus</button>
        </td>
      </tr>
    `);
  }

  sumInEl.textContent = rupiah(tin);
  sumOutEl.textContent = rupiah(tout);
  balanceEl.textContent = rupiah(tin - tout);
  statsEl.textContent = `${data.length} item`;

  // pasang event delete (pakai event delegation)
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      const row = data.find(x => x.id === id);
      if (!row) return showToast("Data tidak ditemukan", 2000);
      openDeleteModal(row);
    });
  });
}

/* ===== DELETE CONFIRM ===== */
modalConfirm.addEventListener("click", async () => {
  if (!pendingDeleteId) return;

  modalConfirm.disabled = true;
  modalConfirm.textContent = "Menghapus...";

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", pendingDeleteId);

  modalConfirm.disabled = false;
  modalConfirm.textContent = "Hapus";

  if (error) {
    showToast(`Gagal: ${error.message}`, 2500);
    return;
  }

  closeDeleteModal();
  showToast("Transaksi berhasil dihapus ✅");
  await loadData();
});

/* ===== INIT ===== */
(async function init() {
  // isi nama otomatis kalau sudah pernah
  const savedName = getName();
  if (savedName) displayNameEl.value = savedName;

  const { data } = await supabase.auth.getSession();
  if (!data.session || !getName()) {
    showLogin();
    return;
  }

  await loadData();
  showDashboard();
})();
