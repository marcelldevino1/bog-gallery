import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ygpjgopwrlncxmxtwlhi.supabase.co",
  "sb_publishable_mmuoG4bZZt53PiSLpRLlEA_1FsR4IMV"
);

const NAME_KEY = "bog_display_name";

(async ()=>{
  const { data } = await supabase.auth.getSession();
  if(!data.session || !localStorage.getItem(NAME_KEY)){
    alert("Harus login dulu");
    location.href="finance.html";
  }
})();

form.onsubmit = async (e)=>{
  e.preventDefault();
  msg.textContent="Menyimpan...";

  const { error } = await supabase.from("finance_logs").insert({
    team_name: team.value,
    type: type.value,
    amount: Number(amount.value),
    category: category.value||null,
    description: desc.value||null,
    actor_name: localStorage.getItem(NAME_KEY)
  });

  if(error) return msg.textContent=error.message;
  location.href="finance.html";
};
