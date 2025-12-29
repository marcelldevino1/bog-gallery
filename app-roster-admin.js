import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ygpjgopwrlncxmxtwlhi.supabase.co",
  "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV"
);

const TABLE = "players";
const $ = (s) => document.querySelector(s);
const must = (id) => document.getElementById(id);

let editingId = null;

function esc(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}

function setUI(auth){
  $("#loginBox").classList.toggle("hidden",auth);
  $("#formBox").classList.toggle("hidden",!auth);
  $("#listBox").classList.toggle("hidden",!auth);
}

async function refresh(){
  const {data}=await supabase.from(TABLE).select("*").order("team").order("name");
  $("#list").innerHTML=data.map(r=>`
    <tr>
      <td>${esc(r.name)}</td><td>${esc(r.age)}</td><td>${esc(r.team)}</td>
      <td>${esc(r.nickname)}</td><td>${esc(r.pubg_id)}</td>
      <td>${esc(r.manager||"-")}</td><td>${esc(r.wa||"-")}</td>
      <td>${esc(r.status)}</td>
      <td>
        <button class="btn btn--sm btn--edit" data-e="${r.id}">Edit</button>
        <button class="btn btn--sm btn--danger" data-d="${r.id}">Hapus</button>
      </td>
    </tr>`).join("");

  document.querySelectorAll("[data-e]").forEach(b=>b.onclick=async()=>{
    const {data}=await supabase.from(TABLE).select("*").eq("id",b.dataset.e).single();
    editingId=data.id;
    ["name","age","team","nickname","pubg_id","manager","wa","status"]
      .forEach(k=>must(k).value=data[k]||"");
  });

  document.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
    if(confirm("Hapus?")){await supabase.from(TABLE).delete().eq("id",b.dataset.d);refresh();}
  });
}

$("#loginBtn").onclick=async()=>{
  const {error}=await supabase.auth.signInWithPassword({
    email:must("email").value,
    password:must("password").value
  });
  if(error) $("#loginMsg").textContent=error.message;
};

$("#logout").onclick=async()=>{await supabase.auth.signOut()};

$("#form").onsubmit=async(e)=>{
  e.preventDefault();
  const payload={
    name:must("name").value.trim(),
    age:must("age").value.trim(),
    team:must("team").value.trim(),
    nickname:must("nickname").value.trim(),
    pubg_id:must("pubg_id").value.trim(),
    manager:must("manager").value.trim(),
    wa:must("wa").value.trim(),
    status:must("status").value
  };

  if(editingId)
    await supabase.from(TABLE).update(payload).eq("id",editingId);
  else
    await supabase.from(TABLE).insert(payload);

  editingId=null;
  $("#form").reset();
  refresh();
};

supabase.auth.onAuthStateChange((_e,s)=>{
  setUI(!!s);
  if(s) refresh();
});

(async()=>{
  const {data}=await supabase.auth.getSession();
  setUI(!!data.session);
  if(data.session) refresh();
})();
