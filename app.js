const appKey = "你的PrimaryKey"; // 仅需这个

const lineColors = {
  bakerloo: "#B36305",
  central: "#EE2E24",
  circle: "#FFD700",
  district: "#007A33",
  hammersmithcity: "#F4A9BE",
  jubilee: "#868F98",
  metropolitan: "#751056",
  northern: "#000000",
  piccadilly: "#0019A8",
  victoria: "#0098D4",
  waterloocity: "#76D0BD",
  elizabeth: "#6950A1"
};

async function loadStatus() {
  const url = `https://api.tfl.gov.uk/Line/Mode/tube/Status?app_key=${appKey}`;

  const res = await fetch(url);
  const data = await res.json();

  const container = document.getElementById("status-container");
  container.innerHTML = "";

  data.forEach(line => {
    const id = line.id.replace(/-/g, "");
    const name = line.name;
    const status = line.lineStatuses[0].statusSeverityDescription;

    let statusClass = "status-good";
    if (/Delay/i.test(status)) statusClass = "status-warning";
    if (/Closed|Suspended/i.test(status)) statusClass = "status-bad";

    const color = lineColors[id] || "#333";

    container.innerHTML += `
      <div class="line-card" style="border-left-color:${color}">
        <div class="line-name">${name}</div>
        <div class="${statusClass}">${status}</div>
      </div>
    `;
  });
}

loadStatus();
setInterval(loadStatus, 30000);
