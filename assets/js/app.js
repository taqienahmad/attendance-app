async function loadData() {
  const { data } = await supabaseClient
    .from("attendance")
    .select("*")
    .order("time", { ascending: false });

  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  let total = data.length;
  let totalIn = 0;
  let totalOut = 0;

  data.forEach(row => {
    if (row.status === "IN") totalIn++;
    else totalOut++;

    table.innerHTML += `
      <tr>
        <td>${row.nis}</td>
        <td>${row.name}</td>
        <td>${row.kelas}</td>
        <td>${new Date(row.time).toLocaleString()}</td>
        <td>${row.status}</td>
      </tr>
    `;
  });

  animateCounter("totalScan", total);
  animateCounter("totalIn", totalIn);
  animateCounter("totalOut", totalOut);

  createMiniChart("#chart-total", [1,2,3,4,5]);
  createMiniChart("#chart-in", [1,2,2,3,4]);
  createMiniChart("#chart-out", [1,1,2,2,3]);
}

// realtime
function initRealtime() {
  supabaseClient
    .channel("attendance")
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance" },
      () => loadData()
    )
    .subscribe();
}