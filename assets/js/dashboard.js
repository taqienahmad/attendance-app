// ========================
// INIT SUPABASE
// ========================
const { createClient } = supabase;

const supabaseClient = createClient(
  "https://oeyquqvffipiakozezjw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leXF1cXZmZmlwaWFrb3plemp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTY3NDYsImV4cCI6MjA5MDIzMjc0Nn0.gxsjF5reAM3egojoXGb6J8dqjQook4JiykjGG9-FWn4"
);

// ========================
// FORMAT TIME (WIB FIX)
// ========================
function formatWIB(time) {
  const date = new Date(time);

  const tanggal = date.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta"
  });

  const waktu = date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return `${tanggal}  ${waktu}`; // 🔥 double space
}

// ========================
// LOAD DATA
// ========================
async function loadData() {
  const { data, error } = await supabaseClient
    .from("attendance")
    .select("*")
    .order("time", { ascending: false });

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  let total = 0, totalIn = 0, totalOut = 0;

  data.forEach(item => {
    const statusBadge =
      item.status === "IN"
        ? `<span class="badge badge-in">IN</span>`
        : `<span class="badge badge-out">OUT</span>`;

    const formattedTime = formatWIB(item.time);

    const row = `
      <tr>
        <td>${item.nis}</td>
        <td>${item.name}</td>
        <td>${item.kelas}</td>        
        <td>${formattedTime}</td>
        <td>${statusBadge}</td>
      </tr>
    `;

    table.innerHTML += row;

    total++;
    if (item.status === "IN") totalIn++;
    if (item.status === "OUT") totalOut++;
  });

  document.getElementById("totalScan").innerText = total;
  document.getElementById("totalIn").innerText = totalIn;
  document.getElementById("totalOut").innerText = totalOut;
}

// ========================
// FILTER
// ========================
function filterData() {
  const selectedDate = document.getElementById("filterDate").value;

  if (!selectedDate) {
    loadData();
    return;
  }

  loadData(); // nanti bisa kita upgrade filter server-side
}

// ========================
// REALTIME LISTENER
// ========================
function initRealtime() {
  supabaseClient
    .channel("attendance-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "attendance"
      },
      () => {
        console.log("🔥 Realtime update");
        loadData();
      }
    )
    .subscribe();
}

// ========================
// EXPORT EXCEL (FIX)
// ========================
async function exportExcel() {
  const { data, error } = await supabaseClient
    .from("attendance")
    .select("*")
    .order("time", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const formatted = data.map(item => ({
    NIS: item.nis,
    Nama: item.name,
    Kelas: item.kelas,    
    Waktu: formatWIB(item.time), // ✅ FIX DISINI
    Status: item.status
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `attendance_${today}.xlsx`);
}

// ========================
// INIT
// ========================
window.onload = () => {
  loadData();
  initRealtime();
};