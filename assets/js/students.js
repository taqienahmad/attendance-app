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

    const row = `
      <tr>
        <td>${siswa.nis}</td>
        <td>${siswa.nama}</td>
        <td>${siswa.kelas}</td>
        <td><img src="${qrImage}" class="qr-img"/></td>
        <td>
          <div class="action-btns">
            <button class="btn btn-success btn-sm"
              onclick="downloadQR('${qrImage}','${siswa.nis}_${safeNama}')">
              Download
            </button>

            <button class="btn btn-warning btn-sm"
              onclick="editSiswa(${siswa.id}, '${siswa.nama}', '${siswa.kelas}')">
              Edit
            </button>

            <button class="btn btn-danger btn-sm"
              onclick="deleteSiswa(${siswa.id})">
              Hapus
            </button>
          </div>
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
async function editSiswa(id, nama, kelas) {
  const newNama = prompt("Nama:", nama);
  if (!newNama) return;

  const newKelas = prompt("Kelas:", kelas);
  if (!newKelas) return;

  const { error } = await supabaseClient
    .from("students")
    .update({
      nama: newNama,
      kelas: newKelas
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadStudents();
}

// ============================
// INIT
// ============================
loadStudents();