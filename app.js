// app.js — Mind the Tube (TfL realtime status viewer)

document.addEventListener("DOMContentLoaded", () => {

  const API_URL = "https://api.tfl.gov.uk/Line/Mode/tube/Status";

  // Official TfL line colors
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

  const container = document.getElementById("lines");

  if (!container) {
    console.error("Error: #lines element not found.");
    return;
  }

  // Fetch API data
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

    } catch (error) {
      container.innerHTML = `<p class="error">Network Error: ${error}</p>`;
    }
  }

  // Render line cards
  function renderLines(lines) {
    container.innerHTML = "";

    lines.forEach(line => {
      const id = line.id;
      const name = line.name;
      const status = line.lineStatuses[0]?.statusSeverityDescription || "Unknown";
      const reason = line.lineStatuses[0]?.reason || "";

      const card = document.createElement("div");
      card.className = "line-card";

      const color = LINE_COLORS[id] || "#666";

      card.innerHTML = `
        <div class="line-bar" style="background:${color}"></div>
        <div class="line-info">
          <h2>${name}</h2>
          <p class="status">${status}</p>
          ${reason ? `<p class="reason">${reason}</p>` : ""}
        </div>
      `;

      container.appendChild(card);
    });
  }

  // Initial load
  loadStatus();

  // Refresh every 30s
  setInterval(loadStatus, 30000);

});
