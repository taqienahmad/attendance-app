function animateCounter(id, end) {
  let start = 0;
  const el = document.getElementById(id);

  const counter = setInterval(() => {
    start += end / 20;
    if (start >= end) {
      el.innerText = end;
      clearInterval(counter);
    } else {
      el.innerText = Math.floor(start);
    }
  }, 30);
}

function createMiniChart(id, data) {
  const options = {
    chart: {
      type: 'area',
      height: 60,
      sparkline: { enabled: true }
    },
    series: [{ data }]
  };

  new ApexCharts(document.querySelector(id), options).render();
}