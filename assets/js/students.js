const { createClient } = supabase;

const supabaseClient = createClient(
  "https://oeyquqvffipiakozezjw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leXF1cXZmZmlwaWFrb3plemp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTY3NDYsImV4cCI6MjA5MDIzMjc0Nn0.gxsjF5reAM3egojoXGb6J8dqjQook4JiykjGG9-FWn4"
);

const table = document.getElementById("studentTable");

// ============================
// 🔥 LOAD DATA SISWA
// ============================
async function loadStudents() {
  const { data, error } = await supabaseClient
    .from("students")
    .select("*")
    .order("nis", { ascending: true });

  if (error) {
    console.error(error);
    alert("Gagal load data");
    return;
  }

  table.innerHTML = "";

  for (let siswa of data) {
    const qrData = JSON.stringify({
      nis: siswa.nis,
      nama: siswa.nama,
      kelas: siswa.kelas
    });

    // buat canvas QR
    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, qrData);

    // convert ke base64
    const qrImage = canvas.toDataURL();

    const safeNama = siswa.nama.replace(/[^a-zA-Z0-9]/g, "_");

    table.innerHTML += `
      <tr>
        <td>${siswa.nis}</td>
        <td>${siswa.nama}</td>
        <td>${siswa.kelas}</td>
        <td><img src="${qrImage}" width="80"/></td>
        <td>
          <button class="btn btn-success btn-sm"
            onclick="downloadQR('${qrImage}','${siswa.nis}_${safeNama}')">
            Download
          </button>
        </td>
      </tr>
    `;
  }
}

// ============================
// 🔥 DOWNLOAD PER QR
// ============================
function downloadQR(base64, filename) {
  const link = document.createElement("a");
  link.href = base64;
  link.download = filename + ".png";
  link.click();
}

// ============================
// INIT
// ============================
loadStudents();



async function downloadAllQR() {
  const { data } = await supabaseClient.from("students").select("*");

  const zip = new JSZip();

  for (let siswa of data) {
    const qrData = JSON.stringify(siswa);

    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, qrData);

    const base64 = canvas.toDataURL("image/png").split(",")[1];

    const safeNama = siswa.nama.replace(/[^a-zA-Z0-9]/g, "_");

    zip.file(`${siswa.nis}_${safeNama}.png`, base64, { base64: true });
  }

  const content = await zip.generateAsync({ type: "blob" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = "SEMUA_QR.zip";
  link.click();
}