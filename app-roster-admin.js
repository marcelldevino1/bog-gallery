import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ygpjgopwrlncxmxtwlhi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);

const loginBox = $("#loginBox");
const formBox = $("#formBox");
const listBox = $("#listBox");

const loginBtn = $("#loginBtn");
const logoutBtn = $("#logout");
const loginMsg = $("#loginMsg");

const form = $("#form");
const msg = $("#msg");
const listMsg = $("#listMsg");

const tbody = $("#tbodyAdmin");

const cancelEdit = $("#cancelEdit");
const formTitle = $("#formTitle");
const submitBtn = $("#submitBtn");

let editingId = null;

function setUI(isAuthed){
  loginBox.classList.toggle("hidden", isAuthed);
  formBox.classList.toggle("hidden", !isAuthed);
  listBox.classList.toggle("hidden", !isAuthed);
}

function safeInt(v){ return Math.max(0, parseInt(v || "0", 10) || 0); }

function escapeHtml(str=""){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function resetForm(){
  editingId = null;
  form.reset();
  $("#age").value = 0;
  $("#status").value = "Active";
  formTitle.textContent = "Tambah Player";
  submitBtn.textContent = "Simpan";
  msg.textContent = "";
}

function setEditMode(row){
  editingId = row.id;

  $("#name").value = row.name || "";
  $("#age").value = row.age ?? 0;
  $("#team").value = row.team || "";
  $("#nickname").value = row.nickname || "";
  $("#pubg_id").value = row.pubg_id || "";
  $("#manager").value = row.manager || "";
  $("#status").value = row.status || "Active";

  formTitle.textContent = "Edit Player";
  submitBtn.textContent = "Simpan Perubahan";
  msg.textContent = "Mode edit aktif.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function badge(status){
  const s = (status || "").toLowerCase();
  if (s === "active") return `<span class="badge badge--active">Active</span>`;
  if (s === "trial") return `<span class="badge badge--trial">Trial</span>`;
  if (s === "inactive") return `<span class="badge badge--inactive">Inactive</span>`;
  return `<span class="badge">${escapeHtml(status || "-")}</span>`;
}

async function refreshList(){
  listMsg.textContent = "Loading...";

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("team", { ascending: true })
    .order("name", { ascending: true });

  if (error){
    listMsg.textContent = error.message;
    tbody.innerHTML = `<tr><td colspan="8" class="muted" style="padding:14px">${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  listMsg.textContent = `${data.length} item`;

  if (!data.length){
    tbody.innerHTML = `<tr><td colspan="8" class="muted" style="padding:14px">Belum ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td><b>${escapeHtml(r.name)}</b></td>
      <td>${escapeHtml(String(r.age ?? 0))}</td>
      <td>${escapeHtml(r.team || "-")}</td>
      <td>${escapeHtml(r.nickname || "-")}</td>
      <td>${escapeHtml(r.pubg_id || "-")}</td>
      <td>${escapeHtml(r.manager || "-")}</td>
      <td>${badge(r.status)}</td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" type="button" data-edit="${r.id}">Edit</button>
          <button class="btn" type="button" data-del="${r.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-edit");
      const { data: row, error } = await supabase.from("players").select("*").eq("id", id).single();
      if (error) return alert(error.message);
      setEditMode(row);
    });
  });

  tbody.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-del");
      if (!confirm("Hapus player ini?")) return;

      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) return alert(error.message);

      if (editingId === id) resetForm();
      refreshList();
    });
  });
}

loginBtn.addEventListener("click", async ()=>{
  loginMsg.textContent = "Login...";
  const email = $("#email").value.trim();
  const password = $("#password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return (loginMsg.textContent = error.message);

  loginMsg.textContent = "Berhasil login.";
});

logoutBtn.addEventListener("click", async ()=>{
  await supabase.auth.signOut();
  resetForm();
});

cancelEdit.addEventListener("click", ()=> resetForm());

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  msg.textContent = editingId ? "Menyimpan perubahan..." : "Menyimpan...";

  const payload = {
    name: $("#name").value.trim(),
    age: safeInt($("#age").value),
    team: $("#team").value.trim(),
    nickname: $("#nickname").value.trim() || null,
    pubg_id: $("#pubg_id").value.trim() || null,
    manager: $("#manager").value.trim() || null,
    status: $("#status").value,
  };

  if (!payload.name || !payload.team){
    msg.textContent = "Wajib isi: Nama dan Tim.";
    return;
  }

  if (editingId){
    const { error } = await supabase.from("players").update(payload).eq("id", editingId);
    if (error){ msg.textContent = error.message; return; }
    msg.textContent = "Perubahan tersimpan.";
    resetForm();
    refreshList();
    return;
  }

  const { error } = await supabase.from("players").insert(payload);
  if (error){ msg.textContent = error.message; return; }

  msg.textContent = "Sukses! Player ditambahkan.";
  resetForm();
  refreshList();
});

supabase.auth.onAuthStateChange(async (_e, session)=>{
  setUI(!!session);
  if (session) refreshList();
});

(async function init(){
  const { data } = await supabase.auth.getSession();
  setUI(!!data.session);
  resetForm();
  if (data.session) refreshList();
})();
