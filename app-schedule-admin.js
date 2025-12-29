import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ygpjgopwrlncxmxtwlhi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET = "tournament-posters"; // ✅ sesuai nama bucket kamu di Supabase

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

const cancelEdit = $("#cancelEdit");
const formTitle = $("#formTitle");
const submitBtn = $("#submitBtn");

let editingId = null;

function setUI(isAuthed) {
  loginBox.classList.toggle("hidden", isAuthed);
  formBox.classList.toggle("hidden", !isAuthed);
  listBox.classList.toggle("hidden", !isAuthed);
}

function parseTeams(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function safeInt(v) {
  return Math.max(0, parseInt(v || "0", 10) || 0);
}

function resetForm() {
  editingId = null;
  form.reset();
  $("#fee").value = 0;
  $("#prizepool").value = 0;
  $("#image").value = "";
  formTitle.textContent = "Tambah Jadwal";
  submitBtn.textContent = "Simpan";
  msg.textContent = "";
}

function setEditMode(row) {
  editingId = row.id;

  $("#title").value = row.title || "";
  $("#kind").value = row.kind || "";
  $("#organizer").value = row.organizer || "";
  $("#teams").value = (row.teams || []).join(", ");
  $("#tour_date").value = row.tour_date || "";
  $("#start_time").value = String(row.start_time || "").slice(0, 5);
  $("#fee").value = row.fee ?? 0;
  $("#prizepool").value = row.prizepool ?? 0;
  $("#note").value = row.note || "";
  $("#image").value = "";

  formTitle.textContent = "Edit Jadwal";
  submitBtn.textContent = "Simpan Perubahan";
  msg.textContent = "Mode edit aktif. Upload poster hanya jika ingin ganti poster.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function uuidFallback() {
  // fallback kalau browser tidak punya crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

async function uploadPoster(file) {
  if (!file) return { image_url: null, image_path: null };

  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("File harus gambar (jpg/png/webp).");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File terlalu besar. Maksimal 5MB.");
  }

  const extRaw = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ext = extRaw.replace(/[^a-z0-9]/g, "") || "jpg";

  const uid = (crypto?.randomUUID ? crypto.randomUUID() : uuidFallback());
  const path = `posters/${Date.now()}-${uid}.${ext}`; // ✅ aman & rapi

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    console.log("UPLOAD ERROR OBJECT:", upErr);
    throw new Error(upErr.message || "Upload gagal (storage).");
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { image_url: pub.publicUrl, image_path: path };
}

async function refreshList() {
  listMsg.textContent = "Loading...";

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("tour_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) {
    listMsg.textContent = error.message;
    return;
  }

  listMsg.textContent = `${data.length} item`;
  list.innerHTML = data
    .map(
      (r) => `
    <div style="border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.03);padding:12px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap">
      <div style="display:grid;gap:6px">
        <b>${escapeHtml(r.title)}</b>
        <div class="muted">${escapeHtml(r.kind)}${r.organizer ? " • " + escapeHtml(r.organizer) : ""}</div>
        <div class="muted"><b>Tanggal:</b> ${escapeHtml(r.tour_date)} <b>Jam:</b> ${escapeHtml(String(r.start_time).slice(0,5))}</div>
        <div class="muted"><b>Tim:</b> ${escapeHtml((r.teams || []).join(", "))}</div>
        <div class="muted"><b>Fee:</b> Rp ${formatMoney(r.fee)} • <b>Prize:</b> Rp ${formatMoney(r.prizepool)}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn--sm btn--edit" type="button" data-edit="${r.id}">Edit</button>
        <button class="btn btn--sm btn--danger" type="button" data-del="${r.id}">Hapus</button>
      </div>
    </div>
  `
    )
    .join("");

  list.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      const { data: row, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return alert(error.message);
      setEditMode(row);
    });
  });

  list.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm("Hapus jadwal ini?")) return;

      const { data: row, error: e1 } = await supabase
        .from("tournaments")
        .select("image_path")
        .eq("id", id)
        .single();

      if (e1) return alert(e1.message);

      const { error: e2 } = await supabase.from("tournaments").delete().eq("id", id);
      if (e2) return alert(e2.message);

      // hapus poster (best-effort)
      if (row?.image_path) {
        await supabase.storage.from(BUCKET).remove([row.image_path]);
      }

      if (editingId === id) resetForm();
      refreshList();
    });
  });
}

loginBtn.addEventListener("click", async () => {
  loginMsg.textContent = "Login...";
  const email = $("#email").value.trim();
  const password = $("#password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return (loginMsg.textContent = error.message);

  loginMsg.textContent = "Berhasil login.";
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  resetForm();
});

cancelEdit.addEventListener("click", () => {
  resetForm();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = editingId ? "Menyimpan perubahan..." : "Menyimpan...";

  const payloadBase = {
    title: $("#title").value.trim(),
    kind: $("#kind").value.trim(),
    organizer: $("#organizer").value.trim() || null,
    teams: parseTeams($("#teams").value),
    tour_date: $("#tour_date").value,
    start_time: $("#start_time").value,
    fee: safeInt($("#fee").value),
    prizepool: safeInt($("#prizepool").value),
    note: $("#note").value.trim() || null,
  };

  if (
    !payloadBase.title ||
    !payloadBase.kind ||
    !payloadBase.teams.length ||
    !payloadBase.tour_date ||
    !payloadBase.start_time
  ) {
    msg.textContent = "Wajib isi: nama, jenis, tim (min 1), tanggal, jam.";
    return;
  }

  const file = $("#image").files?.[0];

  // ===== EDIT =====
  if (editingId) {
    // kalau upload poster baru
    if (file) {
      try {
        const poster = await uploadPoster(file);

        const { data: oldRow } = await supabase
          .from("tournaments")
          .select("image_path")
          .eq("id", editingId)
          .single();

        const { error: upRowErr } = await supabase
          .from("tournaments")
          .update({ ...payloadBase, ...poster })
          .eq("id", editingId);

        if (upRowErr) {
          msg.textContent = upRowErr.message;
          return;
        }

        // hapus poster lama (best-effort)
        if (oldRow?.image_path) {
          await supabase.storage.from(BUCKET).remove([oldRow.image_path]);
        }

        msg.textContent = "Perubahan tersimpan + poster diganti.";
        resetForm();
        refreshList();
      } catch (err) {
        console.error(err);
        msg.textContent = err.message || "Gagal upload poster.";
      }
      return;
    }

    // edit tanpa ganti poster
    const { error } = await supabase.from("tournaments").update(payloadBase).eq("id", editingId);
    if (error) {
      msg.textContent = error.message;
      return;
    }

    msg.textContent = "Perubahan tersimpan.";
    resetForm();
    refreshList();
    return;
  }

  // ===== ADD =====
  if (file) {
    try {
      const poster = await uploadPoster(file);

      const { error: insErr } = await supabase.from("tournaments").insert({
        ...payloadBase,
        ...poster,
      });

      if (insErr) {
        msg.textContent = insErr.message;
        return;
      }

      msg.textContent = "Sukses! Jadwal tersimpan.";
      resetForm();
      refreshList();
    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Gagal upload poster.";
    }
    return;
  }

  // tanpa poster
  const { error: insErr } = await supabase.from("tournaments").insert(payloadBase);
  if (insErr) {
    msg.textContent = insErr.message;
    return;
  }

  msg.textContent = "Sukses! Jadwal tersimpan.";
  resetForm();
  refreshList();
});

supabase.auth.onAuthStateChange(async (_e, session) => {
  setUI(!!session);
  if (session) refreshList();
});

(async function init() {
  const { data } = await supabase.auth.getSession();
  setUI(!!data.session);
  resetForm();
  if (data.session) refreshList();

  // debug (boleh hapus kalau sudah beres)
  console.log("SESSION:", !!data.session, data.session?.user?.email);
})();
 
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("id-ID").format(v);
}
