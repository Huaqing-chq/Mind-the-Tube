// app.js — TfL Tube Status Viewer (no API key required)

const API_URL = "https://api.tfl.gov.uk/Line/Mode/tube/Status";

// 伦敦地铁配色（官方线路色）
const LINE_COLORS = {
  "bakerloo": "#B36305",
  "central": "#E32017",
  "circle": "#FFD300",
  "district": "#00782A",
  "hammersmith-city": "#F3A9BB",
  "jubilee": "#A0A5A9",
  "metropolitan": "#9B0056",
  "northern": "#000000",
  "piccadilly": "#003688",
  "victoria": "#0098D4",
  "waterloo-city": "#95CDBA"
};

// DOM
const container = document.getElementById("lines");

async function loadStatus() {
  try {
    const response = await fetch(API_URL, {
      headers: { "Cache-Control": "no-cache" }
    });

    if (!response.ok) {
      container.innerHTML = `<p class="error">TfL API Error ${response.status}</p>`;
      return;
    }

    const data = await response.json();
    renderLines(data);
  } catch (err) {
    container.innerHTML = `<p class="error">Network Error: ${err}</p>`;
  }
}

function renderLines(lines) {
  container.innerHTML = "";

  lines.forEach(line => {
    const id = line.id;
    const name = line.name;
    const status = line.lineStatuses[0]?.statusSeverityDescription || "Unknown";
    const reason = line.lineStatuses[0]?.reason || "";

    const card = document.createElement("div");
    card.className = "line-card";

    // 线路色条
    const color = LINE_COLORS[id] || "#666";
    const bar = `<div class="line-bar" style="background:${color}"></div>`;

    card.innerHTML = `
      ${bar}
      <div class="line-info">
        <h2>${name}</h2>
        <p class="status">${status}</p>
        ${reason ? `<p class="reason">${reason}</p>` : ""}
      </div>
    `;

    container.appendChild(card);
  });
}

// 自动刷新：30 秒一次
loadStatus();
setInterval(loadStatus, 30000);
