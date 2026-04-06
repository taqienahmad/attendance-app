const { createClient } = supabase;

const supabaseClient = createClient(
  "https://oeyquqvffipiakozezjw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leXF1cXZmZmlwaWFrb3plemp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTY3NDYsImV4cCI6MjA5MDIzMjc0Nn0.gxsjF5reAM3egojoXGb6J8dqjQook4JiykjGG9-FWn4"
);

const table = document.getElementById("studentTable");

// ============================
// LOAD DATA
// ============================
async function loadStudents() {
  const { data, error } = await supabaseClient
    .from("students")
    .select("*")
    .order("nis", { ascending: true });

  if (error) {
    alert("Gagal load");
    return;
  }

  table.innerHTML = "";

  for (let siswa of data) {

    const qrData = JSON.stringify({
      nis: siswa.nis,
      nama: siswa.nama,
      kelas: siswa.kelas
    });

    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, qrData);

    const qrImage = canvas.toDataURL();
    const safeNama = siswa.nama.replace(/[^a-zA-Z0-9]/g, "_");

const fotoUrl = siswa.foto
  ? `https://oeyquqvffipiakozezjw.supabase.co/storage/v1/object/public/student-photo/${siswa.foto}?t=${new Date().getTime()}`
  : "https://ui-avatars.com/api/?name=+&background=random";


const row = `
  <tr>
    <td>${siswa.nis}</td>
    <td>${siswa.nama}</td>
    <td>${siswa.kelas}</td>
    
    <td>
      <img 
        src="${fotoUrl}" 
        class="student-photo"
        onclick="openCamera(${siswa.id}, '${siswa.nis}')"
      />
    </td>

    <td><img src="${qrImage}" class="qr-img"/></td>

    <td>
      <button class="btn btn-success btn-sm"
        onclick="downloadQR('${qrImage}','${siswa.nis}_${safeNama}')">
        Download
      </button>

      <button class="btn btn-warning btn-sm"
        onclick="editSiswa(${siswa.id}, '${siswa.nis}', '${siswa.nama}', '${siswa.kelas}', '${siswa.foto || ""}')">
        Edit
      </button>

      <button class="btn btn-danger btn-sm"
        onclick="deleteSiswa(${siswa.id})">
        Hapus
      </button>
    </td>
  </tr>
`;

    table.innerHTML += row;
  }
}

// ============================
// DOWNLOAD
// ============================
function downloadQR(base64, filename) {
  const link = document.createElement("a");
  link.href = base64;
  link.download = filename + ".png";
  link.click();
}

// ============================
// DELETE
// ============================
async function deleteSiswa(id) {
  if (!confirm("Yakin hapus?")) return;

  const { error } = await supabaseClient
    .from("students")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadStudents();
}

// ============================
// EDIT
// ============================
async function editSiswa(id, nis, nama, kelas, fotoLama) {

  const newNama = prompt("Nama:", nama);
  if (!newNama) return;

  const newKelas = prompt("Kelas:", kelas);
  if (!newKelas) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async () => {
    const file = input.files[0];

    let fotoBaru = fotoLama;

    if (file) {
      fotoBaru = await uploadPhoto(file, nis); // ✅ sekarang aman
    }

    const { error } = await supabaseClient
      .from("students")
      .update({
        nama: newNama,
        kelas: newKelas,
        foto: fotoBaru
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("✅ Data berhasil diupdate");
    loadStudents();
  };

  input.click();
}

// ============================
// INIT
// ============================
loadStudents();


// ============================
// upload photos
// ============================

async function uploadPhoto(file, nis) {
  const fileName = `${nis}.jpg`;

  const { error } = await supabaseClient.storage
    .from("student-photo")
    .upload(fileName, file, { upsert: true });

  if (error) {
    alert("Upload gagal!");
    console.error(error);
    return null;
  }

  return fileName;
}

// ============================
// script camera
// ============================

let currentId = null;
let currentNis = null;
let cameraStream = null;
let cameraList = [];

async function loadCameraList() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  cameraList = devices.filter(d => d.kind === "videoinput");

  const select = document.getElementById("cameraSelect");
  select.innerHTML = "";

  cameraList.forEach((cam, i) => {
    const option = document.createElement("option");
    option.value = cam.deviceId;
    option.text = cam.label || `Camera ${i + 1}`;
    select.appendChild(option);
  });

  // default kamera belakang
  if (cameraList.length > 1) {
    select.selectedIndex = cameraList.length - 1;
  }
}

window.addEventListener("load", () => {
  const select = document.getElementById("cameraSelect");

  if (select) {
    select.addEventListener("change", async () => {
      if (!currentId) return;
      await openCamera(currentId, currentNis);
    });
  }
});

function closeCamera() {
  console.log("CLOSE JALAN");

  const modal = document.getElementById("cameraModal");
  modal.style.display = "none";

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}
// ============================
// open camera
// ============================
async function openCamera(id, nis) {
  currentId = id;
  currentNis = nis;

  const modal = document.getElementById("cameraModal");
  const video = document.getElementById("cameraVideo");

  modal.style.display = "flex";

  // 🔥 1. buka kamera dulu (trigger permission)
  const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });

  // stop sementara
  tempStream.getTracks().forEach(track => track.stop());

  // 🔥 2. baru load semua kamera
  await loadCameraList();

  const selectedCamera = document.getElementById("cameraSelect").value;

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }

  // 🔥 3. start kamera sesuai pilihan
  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: selectedCamera ? { exact: selectedCamera } : undefined
    }
  });

  video.srcObject = cameraStream;
}



// ============================
// script camera
// ============================
async function capturePhoto() {
  const video = document.getElementById("cameraVideo");

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  canvas.toBlob(async (blob) => {

    const file = new File([blob], `${currentNis}.jpg`, {
      type: "image/jpeg"
    });

    // 🔥 upload ke storage
    const { error } = await supabaseClient.storage
      .from("student-photo")
      .upload(`${currentNis}.jpg`, file, { upsert: true });

    if (error) {
      alert("Upload gagal!");
      console.error(error);
      return;
    }
  

    
    // 🔥 update DB
    await supabaseClient
      .from("students")
      .update({ foto: `${currentNis}.jpg` })
      .eq("id", currentId);

    closeCamera();
    loadStudents(); // refresh table

  }, "image/jpeg");
}
