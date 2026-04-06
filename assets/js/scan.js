// ========================
// INIT SUPABASE
// ========================
const { createClient } = supabase;

const supabaseClient = createClient(
  "https://oeyquqvffipiakozezjw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leXF1cXZmZmlwaWFrb3plemp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTY3NDYsImV4cCI6MjA5MDIzMjc0Nn0.gxsjF5reAM3egojoXGb6J8dqjQook4JiykjGG9-FWn4"
);

// ========================
// ELEMENT
// ========================
const resultEl = document.getElementById("result");
const cameraSelect = document.getElementById("cameraSelect");

let html5QrCode;
let lastScan = null;

// ========================
// DATA USER
// ========================
let employees = {};

async function loadEmployees() {
  const { data, error } = await supabaseClient
    .from("students")
    .select("*");

  if (error) {
    console.error("❌ Error load students:", error);
    return;
  }

  employees = {};

  data.forEach(item => {
    employees[String(item.nis).trim()] = {
      nama: item.nama,
      kelas: item.kelas
    };
  });

  console.log("✅ Students loaded:", employees);
}

// ========================
// AUDIO
// ========================
let audioContext;

function playBeep(type = "IN") {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(
      type === "IN" ? 1200 : 600,
      audioContext.currentTime
    );

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    console.log("Audio error:", e);
  }
}

// ========================
// GET MODE (FIXED)
// ========================
function getMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

// ========================
// LOGIC STATUS
// ========================
async function determineStatus(nis) {
  const { data, error } = await supabaseClient
    .from("attendance")
    .select("*")
    .eq("nis", nis)
    .order("time", { ascending: false })
    .limit(1);

  if (error) {
    console.error(error);
    return "IN";
  }

  if (!data.length) return "IN";

  const last = data[0];
  const lastTime = new Date(last.time);
  const now = new Date();

  const diffMinutes = (now - lastTime) / (1000 * 60);

  if (last.status === "IN") {
    if (diffMinutes < 60) {
      const remainingMinutes = Math.ceil(60 - diffMinutes);

      showResult("error", `Tunggu ${remainingMinutes} menit lagi`);

      return null;
    }
    return "OUT";
  }

  return "IN";
}

// ========================
// SAVE
// ========================
async function saveAttendance(nis, nama, kelas, status) {
  const { error } = await supabaseClient
    .from("attendance")
    .insert([{ nis, nama, kelas, status }]);

  if (error) {
    console.error("❌ Error:", error);
  } else {
    console.log("✅ Saved");
  }
}

// ========================
// GET STUDENT (FIXED)
// ========================
async function getStudent(nis) {
  const cleanNis = String(nis).trim();

  console.log("🔍 Cari NIS:", cleanNis);

  const { data, error } = await supabaseClient
    .from("students")
    .select("*")
    .eq("nis", cleanNis)
    .single();

  if (error || !data) {
    console.error("❌ Student tidak ditemukan:", cleanNis);
    return null;
  }

  return data;
}

// ========================
// SCAN RESULT (FIXED TOTAL)
// ========================
async function onScanSuccess(decodedText) {

  console.log("📸 RAW QR:", decodedText);

  let scannedNis;

  try {
    const parsed = JSON.parse(decodedText);
    scannedNis = String(parsed.nis).trim();
  } catch (e) {
    // kalau bukan JSON (fallback)
    scannedNis = String(decodedText).trim();
  }

  console.log("✅ NIS HASIL PARSE:", scannedNis);

  if (scannedNis === lastScan) return;

  lastScan = scannedNis;

  setTimeout(() => {
    lastScan = null;
  }, 5000);

  const student = await getStudent(scannedNis);

  if (!student) {
    showResult("error", "Siswa tidak terdaftar");
    return;
  }

  const nama = student.nama;
  const kelas = student.kelas;

  const mode = getMode();

  let status;

  if (mode === "AUTO") {
    status = await determineStatus(scannedNis);
    if (!status) return;
  } else {
    status = mode;
  }

  const now = new Date();
  const date = now.toLocaleDateString("id-ID");
  const time = now.toLocaleTimeString("en-GB");

  showResult(
    "success",
    `Absensi ${status}`,
    nama,
    kelas
  );
  
  triggerScanEffect();
  playBeep(status);

  await saveAttendance(scannedNis, nama, kelas, status);

    setTimeout(() => {
      showResult("success", "Ready to Scan");
    }, 3000);
}

// ========================
// START CAMERA (SAFE)
// ========================
function startSelectedCamera() {
  if (html5QrCode) {
    html5QrCode.stop().catch(() => {});
  }

  html5QrCode = new Html5Qrcode("reader");

  const selectedCameraId = cameraSelect.value;

  html5QrCode.start(
    selectedCameraId, // ✅ pakai deviceId, bukan facingMode
    {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    },
    onScanSuccess
  ).catch(err => {
    console.error("❌ Kamera error:", err);
    alert("Tidak bisa akses kamera");
  });
}

cameraSelect.addEventListener("change", () => {
  startSelectedCamera();
});

// ========================
// LOAD CAMERA
// ========================
function loadCameras() {
  Html5Qrcode.getCameras()
    .then(devices => {
      if (!devices.length) {
        alert("Camera tidak ditemukan");
        return;
      }

      cameraSelect.innerHTML = "";

      devices.forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.id;
        option.text = device.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
      });

      // ✅ langsung start kamera pertama
      startSelectedCamera();
    })
    .catch(err => {
      console.error("Camera error:", err);
    });
}

// ========================
// INIT
// ========================
window.onload = async () => {
  await loadEmployees();
  loadCameras();
};

function showResult(status, message, nama = "", kelas = "") {
  const card = document.querySelector(".result-card");
  const result = document.getElementById("result");
  const icon = document.getElementById("statusIcon");
  const time = document.getElementById("scanTime");

  card.classList.remove("success", "error");

  const now = new Date().toLocaleTimeString("id-ID");

  if (status === "success") {
    card.classList.add("success");
    icon.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
  } 
  else if (status === "error") {
    card.classList.add("error");
    icon.innerHTML = '<i class="bi bi-x-circle-fill text-danger"></i>';
  } 
  else {
    // DEFAULT SCANNER ICON
    icon.innerHTML = '<i class="bi bi-qr-code-scan"></i>';
  }

  result.innerHTML = `
    <div style="font-size:18px; font-weight:bold;">${message}</div>
    ${nama ? `<div>${nama}</div>` : ""}
    ${kelas ? `<div>Kelas: ${kelas}</div>` : ""}
  `;

  time.textContent = now;
}


function triggerScanEffect() {
  const frame = document.querySelector(".scanner-frame");

  // FLASH
  frame.classList.add("flash");

  // SUCCESS (HIJAU)
  frame.classList.add("success");

  // HAPUS FLASH CEPAT
  setTimeout(() => {
    frame.classList.remove("flash");
  }, 400);

  // BALIK NORMAL
  setTimeout(() => {
    frame.classList.remove("success");
  }, 2000);
}