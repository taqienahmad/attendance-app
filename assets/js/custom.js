document.addEventListener("DOMContentLoaded", () => {
  console.log("Dashboard Ready");

  // contoh dummy
  document.getElementById("totalScan").innerText = 10;
  document.getElementById("totalIn").innerText = 6;
  document.getElementById("totalOut").innerText = 4;
});

function filterData() {
  alert("Filter jalan");
}

function exportExcel() {
  alert("Export jalan");
}