async function login() {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.innerText = "⏳ Loading...";

  // VALIDASI INPUT
  if (!email || !password) {
    errorMsg.innerText = "❌ Email & Password wajib diisi";
    return;
  }

  // LOGIN SUPABASE
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    errorMsg.innerText = "❌ " + error.message;
    return;
  }

  // 🔥 CEK ADMIN
const { data: admin, error: adminError } = await supabaseClient
  .from("admins")
  .select("*")
  .eq("id", data.user.id)
  .maybeSingle(); // 🔥 INI FIX

  if (adminError || !admin) {
    errorMsg.innerText = "❌ Anda bukan admin!";
    return;
  }

  // SIMPAN SESSION
  localStorage.setItem("user", JSON.stringify(data.user));

  // REDIRECT
  window.location.href = "dashboard.html";
}

console.log("USER ID:", data.user.id);
console.log("ADMIN DATA:", admin);
console.log("ADMIN ERROR:", adminError);