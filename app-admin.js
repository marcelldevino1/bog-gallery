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
const list = $("#list");

// state edit
let editingId = null;

function parseTags(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function setUI(isAuthed) {
  loginBox.classList.toggle("hidden", isAuthed);
  formBox.classList.toggle("hidden", !isAuthed);
  listBox.classList.toggle("hidden", !isAuthed);
}

function setFormModeEdit(item) {
  editingId = item?.id || null;

  $("#title").value = item?.title || "";
  $("#event").value = item?.event || "";
  $("#team").value = item?.team || "";
  $("#date").value = item?.date || "";
  $("#rank").value = item?.rank || "";
  $("#note").value = item?.note || "";
  $("#tags").value = (item?.tags || []).join(", ");

  // image input selalu kosong (upload baru hanya kalau mau ganti gambar)
  $("#image").value = "";

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = editingId ? "Simpan Perubahan" : "Upload & Simpan";

  msg.textContent = editingId
    ? "Mode edit aktif. Upload gambar baru hanya jika ingin ganti gambar."
    : "";
}

async function refreshList() {
  listMsg.textContent = "Loading...";

  const { data, error } = await supabase
    .from("certificates")
    .select("id,title,team,date,image_url,image_path,tags,event,rank,note")
    .order("date", { ascending: false });

  if (error) {
    listMsg.textContent = error.message;
    return;
  }

  listMsg.textContent = `${data.length} item`;
  list.innerHTML = data
    .map(
      (i) => `
    <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:10px">
      <div style="display:flex;gap:10px;align-items:center">
        <img src="${i.image_url}" style="width:64px;height:44px;object-fit:cover;border-radius:10px;border:1px solid var(--line)">
        <div>
          <div style="font-weight:700">${escapeHtml(i.title)}</div>
          <div class="muted">${escapeHtml(i.team)} • ${escapeHtml(i.date)} • ${escapeHtml((i.tags || []).join(", "))}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn--sm btn--edit" data-edit="${i.id}">Edit</button>
        <button class="btn btn--sm btn--danger" data-del="${i.id}">Hapus</button>
      </div>
    </div>
  `
    )
    .join("");

  // edit
  list.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");

      const { data: row, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setFormModeEdit(row);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // delete
  list.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Hapus data ini? (gambar di storage juga akan dihapus)")) return;

      // ambil image_path dulu
      const { data: row, error: e1 } = await supabase
        .from("certificates")
        .select("image_path")
        .eq("id", id)
        .single();
      if (e1) {
        alert(e1.message);
        return;
      }

      // hapus row
      const { error: e2 } = await supabase.from("certificates").delete().eq("id", id);
      if (e2) {
        alert(e2.message);
        return;
      }

      // hapus file storage (best-effort)
      const { error: e3 } = await supabase.storage.from("certs").remove([row.image_path]);
      if (e3) {
        alert("Row terhapus, tapi file gagal dihapus: " + e3.message);
      }

      if (editingId === id) setFormModeEdit(null);
      refreshList();
    });
  });
}

loginBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "Login...";

  const email = $("#email").value.trim();
  const password = $("#password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginMsg.textContent = error.message;
    return;
  }

  loginMsg.textContent = "Berhasil login.";
});

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  setFormModeEdit(null);
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = editingId ? "Menyimpan perubahan..." : "Uploading...";

  const payloadBase = {
    title: $("#title").value.trim(),
    event: $("#event").value.trim(),
    team: $("#team").value.trim(),
    date: $("#date").value,
    rank: $("#rank").value.trim(),
    note: $("#note").value.trim(),
    tags: parseTags($("#tags").value),
  };

  if (!payloadBase.title || !payloadBase.event || !payloadBase.team || !payloadBase.date) {
    msg.textContent = "Judul, event, tim, dan tanggal wajib diisi.";
    return;
  }

  const file = $("#image").files?.[0];

  // ===== EDIT MODE =====
  if (editingId) {
    // ganti gambar jika ada file baru
    if (file) {
      const ext = file.name.split(".").pop();
      const newPath = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("certs").upload(newPath, file, {
        upsert: false,
      });
      if (upErr) {
        msg.textContent = upErr.message;
        return;
      }

      const { data: pub } = supabase.storage.from("certs").getPublicUrl(newPath);
      const newUrl = pub.publicUrl;

      // ambil old path
      const { data: oldRow, error: eOld } = await supabase
        .from("certificates")
        .select("image_path")
        .eq("id", editingId)
        .single();
      if (eOld) {
        msg.textContent = eOld.message;
        return;
      }

      const { error: upRowErr } = await supabase
        .from("certificates")
        .update({ ...payloadBase, image_url: newUrl, image_path: newPath })
        .eq("id", editingId);

      if (upRowErr) {
        msg.textContent = upRowErr.message;
        return;
      }

      // hapus gambar lama (best-effort)
      await supabase.storage.from("certs").remove([oldRow.image_path]);

      msg.textContent = "Perubahan tersimpan + gambar diganti.";
      setFormModeEdit(null);
      form.reset();
      refreshList();
      return;
    }

    // edit tanpa ganti gambar
    const { error: upErr } = await supabase
      .from("certificates")
      .update(payloadBase)
      .eq("id", editingId);

    if (upErr) {
      msg.textContent = upErr.message;
      return;
    }

    msg.textContent = "Perubahan tersimpan.";
    setFormModeEdit(null);
    form.reset();
    refreshList();
    return;
  }

  // ===== ADD MODE =====
  if (!file) {
    msg.textContent = "Pilih gambar sertifikat.";
    return;
  }

  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const { error: upErr } = await supabase.storage.from("certs").upload(path, file, {
    upsert: false,
  });
  if (upErr) {
    msg.textContent = upErr.message;
    return;
  }

  const { data: pub } = supabase.storage.from("certs").getPublicUrl(path);
  const image_url = pub.publicUrl;

  const { error: insErr } = await supabase.from("certificates").insert({
    ...payloadBase,
    image_url,
    image_path: path,
  });

  if (insErr) {
    msg.textContent = insErr.message;
    return;
  }

  msg.textContent = "Sukses! Data tersimpan.";
  form.reset();
  refreshList();
});

supabase.auth.onAuthStateChange((_event, session) => {
  setUI(!!session);
  if (session) refreshList();
});

(async function init() {
  console.log("app-admin.js loaded ✅");

  const { data, error } = await supabase.auth.getSession();
  if (error) console.error(error);

  setUI(!!data.session);
  if (data.session) refreshList();

  setFormModeEdit(null);
})();

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
