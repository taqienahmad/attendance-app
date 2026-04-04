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
    employees[item.nis] = {
      name: item.name,
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
// GET MODE
// ========================
function getMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

// ========================
// 🔥 LOGIC 1 JAM (CORE)
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
    const minutes = remainingMinutes;

    resultEl.innerHTML = `
      <div style="font-size:28px; color:red;">
        ❌ Belum bisa logout<br>
        Tunggu ${minutes} menit lagi
      </div>
    `;

    return null;
  }
  return "OUT";
}

  return "IN";
}

// ========================
// SAVE TO DATABASE
// ========================
async function saveAttendance(nis, name, kelas, status) {
  const { error } = await supabaseClient
    .from("attendance")
    .insert([{ nis, name, kelas, status }]);

  if (error) {
    console.error("❌ Error:", error);
  } else {
    console.log("✅ Saved");
  }
}

// ========================
// SCAN RESULT
// ========================
async function onScanSuccess(decodedText) {
  if (decodedText === lastScan) return;

  lastScan = decodedText;

  setTimeout(() => {
    lastScan = null;
  }, 5000); // anti spam

  const student = await getStudent(decodedText);

  if (!student) {
    resultEl.innerHTML = `
      <div style="color:red; font-size:28px;">
        ❌ Siswa tidak terdaftar
      </div>
    `;
    return;
  }

  const name = student.name;
  const kelas = student.kelas;

  const mode = getMode();

  let status;

  if (mode === "AUTO") {
    status = await determineStatus(decodedText);

    if (!status) return; // stop kalau belum 5 jam
  } else {
    status = mode;
  }

  // ========================
  // DATE DISPLAY
  // ========================
  const now = new Date();
  const date = now.toLocaleDateString("id-ID");
  const time = now.toLocaleTimeString("en-GB");

  const datetime = `${date}  ${time}`;

  // ========================
  // RESULT UI
  // ========================
  resultEl.innerHTML = `
    <div style="font-size:20px;">${name} (${status})</div>
    <div style="font-size:20px;">Kelas: ${kelas}</div>
    <div style="font-size:20px; margin-top:10px;">${datetime}</div>
  `;

  resultEl.style.color = status === "IN" ? "#22c55e" : "#ef4444";

  playBeep(status);

  // ========================
  // SAVE
  // ========================
  saveAttendance(decodedText, name, kelas, status);

  // ========================
  // RESET
  // ========================
  setTimeout(() => {
    resultEl.innerHTML = "Please Scan QRcode";
    resultEl.style.color = "black";
  }, 3000);
}

// ========================
// START CAMERA
// ========================
function startSelectedCamera() {
  // Stop camera kalau sudah jalan
  if (html5QrCode) {
    html5QrCode.stop().catch(err => {
      console.log("Stop error:", err);
    });
  }

  // Init ulang scanner
  html5QrCode = new Html5Qrcode("reader");

  // 🔥 WAJIB: trigger permission camera dulu (biar tidak silent fail di HP)
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(() => {

      html5QrCode.start(
        { facingMode: "environment" }, // 🔥 kamera belakang
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }, // lebih fleksibel di HP
          aspectRatio: 1.0
        },
        onScanSuccess,

        // error handler (biar bisa debug)
        (errorMessage) => {
          // ini normal muncul terus saat scan, jadi jangan alert
          // console.log("Scan error:", errorMessage);
        }
      );

    })
    .catch(err => {
      console.error("❌ Tidak bisa akses kamera:", err);
      alert("Tidak bisa akses kamera. Pastikan izin kamera sudah diaktifkan.");
    });
}

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

      cameraSelect.selectedIndex = 0;

      setTimeout(() => {
        startSelectedCamera();
      }, 500);
    })
    .catch(err => {
      console.error("Camera error:", err);
    });
}

async function getStudent(nis) {
  const { data, error } = await supabaseClient
    .from("students")
    .select("*")
    .eq("nis", nis)
    .single();

  if (error) {
    console.error("❌ Student tidak ditemukan:", error);
    return null;
  }

  return data;
}


// ========================
// INIT
// ========================
window.onload = async () => {
  await loadEmployees(); // 🔥 WAJIB dulu
  loadCameras();
};