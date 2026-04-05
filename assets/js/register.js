const { createClient } = supabase;

const supabaseClient = createClient(
  "https://oeyquqvffipiakozezjw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leXF1cXZmZmlwaWFrb3plemp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTY3NDYsImV4cCI6MjA5MDIzMjc0Nn0.gxsjF5reAM3egojoXGb6J8dqjQook4JiykjGG9-FWn4"
);

// ==========================
// GLOBAL STATE
// ==========================
let selectedFile = null;
let qrCanvas = null;
let stream;
let generatedQRs = [];

// ==========================
// DOM READY
// ==========================
document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("registerForm");
  const qrContainer = document.getElementById("qrcode");
  const downloadBtn = document.getElementById("downloadQR");

  // ==========================
  // FOTO PREVIEW
  // ==========================
  const fotoInput = document.getElementById("fotoInput");

  if (fotoInput) {
    fotoInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      selectedFile = file;

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.getElementById("previewPhoto");
        img.src = e.target.result;
        img.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
  }

  // ==========================
  // MANUAL REGISTER
  // ==========================
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nis = document.getElementById("nis").value.trim();
      const nama = document.getElementById("nama").value.trim();
      const kelas = document.getElementById("kelas").value.trim();

      if (!nis || !nama || !kelas) {
        alert("Semua field wajib diisi!");
        return;
      }

      // ==========================
      // UPLOAD FOTO (OPSIONAL)
      // ==========================
      let fotoName = "";

      if (selectedFile) {
        fotoName = await uploadPhoto(selectedFile, nis);

        if (!fotoName) {
          alert("Upload foto gagal!");
          return;
        }
      }

      // ==========================
      // SIMPAN DB
      // ==========================
      const { error } = await supabaseClient
        .from("students")
        .upsert([
          { nis, nama, kelas, foto: fotoName }
        ], { onConflict: "nis" });

      if (error) {
        alert("Gagal simpan: " + error.message);
        return;
      }

      // ==========================
      // GENERATE QR
      // ==========================
      const qrData = JSON.stringify({ nis, nama, kelas });

      qrContainer.innerHTML = "";
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, qrData);

      qrContainer.appendChild(canvas);
      qrCanvas = canvas;

      downloadBtn.style.display = "inline-block";

      form.reset();
      selectedFile = null;
      document.getElementById("previewPhoto").style.display = "none";

      alert("✅ Register + Foto + QR berhasil!");
    });
  }

  // ==========================
  // DOWNLOAD QR
  // ==========================
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (!qrCanvas) return;

      const link = document.createElement("a");
      link.download = "QR_" + Date.now() + ".png";
      link.href = qrCanvas.toDataURL();
      link.click();
    });
  }

  // ==========================
  // BULK UPLOAD (FIXED 🔥)
  // ==========================
  const uploadBtn = document.getElementById("uploadExcel");

  if (uploadBtn) {
    uploadBtn.addEventListener("click", async () => {
      const file = document.getElementById("excelFile").files[0];
      if (!file) return alert("Pilih file dulu!");

      generatedQRs = [];

      const reader = new FileReader();

      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const table = document.getElementById("bulkTable");
        if (table) table.innerHTML = "";

        let success = 0;
        let failed = 0;

        for (let row of jsonData) {

          const nis = String(row.nis || row.NIS).trim();
          const nama = row.nama || row.NAMA;
          const kelas = row.kelas || row.KELAS;

          if (!nis || !nama || !kelas) {
            failed++;
            continue;
          }

          let status = "Success";

          const { error } = await supabaseClient
            .from("students")
            .upsert([{ nis, nama, kelas }], { onConflict: "nis" });

          if (error) {
            status = "Error";
            failed++;
          } else {
            success++;

            // QR
            const qrData = JSON.stringify({ nis, nama, kelas });

            const canvas = document.createElement("canvas");
            await QRCode.toCanvas(canvas, qrData);

            const base64 = canvas.toDataURL("image/png");
            const safeNama = nama.replace(/[^a-zA-Z0-9]/g, "_");

            generatedQRs.push({
              filename: `${nis}_${safeNama}.png`,
              base64
            });
          }

          if (table) {
            table.innerHTML += `
              <tr>
                <td>${nis}</td>
                <td>${nama}</td>
                <td>${kelas}</td>
                <td>${status}</td>
              </tr>
            `;
          }
        }

        alert(`Selesai!\nSuccess: ${success}\nFailed: ${failed}`);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // ==========================
  // DOWNLOAD ZIP
  // ==========================
  const zipBtn = document.getElementById("downloadZip");

  if (zipBtn) {
    zipBtn.addEventListener("click", async () => {
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
  }

});

// ==========================
// CAMERA
// ==========================
function startCamera() {
  const video = document.getElementById("camera");
  const btn = document.getElementById("btnCapture");

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(s => {
      stream = s;
      video.srcObject = stream;
      video.style.display = "block";
      btn.style.display = "inline-block";
    });
}

// ==========================
// CAPTURE FOTO
// ==========================
function capturePhoto() {
  const video = document.getElementById("camera");
  const canvas = document.createElement("canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  canvas.toBlob(blob => {
    selectedFile = new File([blob], "camera.jpg", { type: "image/jpeg" });

    const img = document.getElementById("previewPhoto");
    img.src = URL.createObjectURL(blob);
    img.style.display = "block";
  });

  stream.getTracks().forEach(track => track.stop());
  video.style.display = "none";
}

// ==========================
// UPLOAD STORAGE
// ==========================
async function uploadPhoto(file, nis) {
  const fileName = `${nis}.jpg`;

  const { error } = await supabaseClient.storage
    .from("student-photo")
    .upload(fileName, file, { upsert: true });

  if (error) {
    console.error(error);
    return null;
  }

  return fileName;
}