const { createClient } = supabase;

const supabaseClient = createClient(
  "https://oeyquqvffipiakozezjw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leXF1cXZmZmlwaWFrb3plemp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTY3NDYsImV4cCI6MjA5MDIzMjc0Nn0.gxsjF5reAM3egojoXGb6J8dqjQook4JiykjGG9-FWn4"
);

// ==========================
// 🔥 MANUAL REGISTER + QR
// ==========================
const form = document.getElementById("registerForm");
const qrContainer = document.getElementById("qrcode");
const downloadBtn = document.getElementById("downloadQR");

let qrCanvas = null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nis = document.getElementById("nis").value.trim();
  const nama = document.getElementById("nama").value.trim();
  const kelas = document.getElementById("kelas").value.trim();

  if (!nis || !nama || !kelas) {
    alert("Semua field wajib diisi!");
    return;
  }

  // 🔥 SIMPAN (ANTI DUPLICATE)
  const { error } = await supabaseClient
    .from("students")
    .upsert([{ nis, nama, kelas }], { onConflict: "nis" });

  if (error) {
    alert("Gagal simpan: " + error.message);
    console.error(error);
    return;
  }

  // 🔥 GENERATE QR
  const qrData = JSON.stringify({ nis, nama, kelas });

  qrContainer.innerHTML = "";

  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, qrData);

  qrContainer.appendChild(canvas);
  qrCanvas = canvas;

  downloadBtn.style.display = "inline-block";

  form.reset();

  alert("✅ Register berhasil + QR dibuat!");
});

// DOWNLOAD QR
downloadBtn.addEventListener("click", () => {
  if (!qrCanvas) return;

  const link = document.createElement("a");
  link.download = "QR_" + Date.now() + ".png";
  link.href = qrCanvas.toDataURL();
  link.click();
});


// ==========================
// 🔥 BULK UPLOAD + QR + ZIP
// ==========================
let generatedQRs = [];

document.getElementById("uploadExcel").addEventListener("click", async () => {
  const file = document.getElementById("excelFile").files[0];
  if (!file) return alert("Pilih file dulu!");

  generatedQRs = [];

  const reader = new FileReader();

  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    console.log("DATA EXCEL:", jsonData);

    const table = document.getElementById("bulkTable");
    table.innerHTML = "";

    let success = 0;
    let failed = 0;

    for (let row of jsonData) {
      const nis = row.NIS || row.nis;
      const nama = row.Nama || row.nama;
      const kelas = row.Kelas || row.kelas;

      if (!nis || !nama || !kelas) {
        console.log("DATA ERROR:", row);
        failed++;
        continue;
      }

      let status = "Success";

      // 🔥 UPSERT (ANTI DUPLICATE)
      const { error } = await supabaseClient
        .from("students")
        .upsert([{ nis, nama, kelas }], { onConflict: "nis" });

      if (error) {
        status = "Error";
        failed++;
      } else {
        success++;

        // 🔥 GENERATE QR
        const qrData = JSON.stringify({ nis, nama, kelas });

        const canvas = document.createElement("canvas");
        await QRCode.toCanvas(canvas, qrData);

        const base64 = canvas.toDataURL("image/png");

        // 🔥 SAFE FILENAME
        const safeNama = nama.replace(/[^a-zA-Z0-9]/g, "_");

        generatedQRs.push({
          filename: `${nis}_${safeNama}.png`,
          base64: base64
        });
      }

      table.innerHTML += `
        <tr>
          <td>${nis}</td>
          <td>${nama}</td>
          <td>${kelas}</td>
          <td>${status}</td>
        </tr>
      `;
    }

    alert(`Selesai!\nSuccess: ${success}\nFailed: ${failed}`);
  };

  reader.readAsArrayBuffer(file);
});


// ==========================
// 🔥 DOWNLOAD ZIP
// ==========================
document.getElementById("downloadZip").addEventListener("click", async () => {
  if (generatedQRs.length === 0) {
    alert("Belum ada QR!");
    return;
  }

  const zip = new JSZip();

  generatedQRs.forEach((item) => {
    const base64Data = item.base64.split(",")[1];
    zip.file(item.filename, base64Data, { base64: true });
  });

  const content = await zip.generateAsync({ type: "blob" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = "QR_SISWA.zip";
  link.click();
});