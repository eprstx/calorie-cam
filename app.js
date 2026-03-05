const photoEl = document.getElementById("photo");
const imgEl = document.getElementById("img");
const previewEl = document.getElementById("preview");
const analyzeBtn = document.getElementById("analyze");
const statusEl = document.getElementById("status");

// Pretty UI elements
const prettyEl = document.getElementById("pretty");
const totalCaloriesEl = document.getElementById("totalCalories");
const itemsEl = document.getElementById("items");
const notesEl = document.getElementById("notes");

// Raw JSON fallback
const resultEl = document.getElementById("result");

let currentFile = null;

function showRaw(text) {
  resultEl.textContent = text;
  resultEl.classList.remove("hidden");
}

function showPretty(data) {
  // Validate expected shape
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = Number.isFinite(data?.totalCalories) ? data.totalCalories : null;
  const notes = typeof data?.notes === "string" ? data.notes : "";

  totalCaloriesEl.textContent = total !== null ? String(Math.round(total)) : "—";

  itemsEl.innerHTML = "";
  for (const it of items) {
    const name = (it?.name ?? "").toString();
    const portion = (it?.portion ?? "").toString();
    const calories = Number(it?.calories);

    const li = document.createElement("li");
    li.className = "item";

    const left = document.createElement("div");
    left.className = "item-left";

    const nameEl = document.createElement("div");
    nameEl.className = "item-name";
    nameEl.textContent = name || "Item";

    const portionEl = document.createElement("div");
    portionEl.className = "item-portion";
    portionEl.textContent = portion || "";

    left.appendChild(nameEl);
    if (portion) left.appendChild(portionEl);

    const calEl = document.createElement("div");
    calEl.className = "item-cal";
    calEl.textContent = Number.isFinite(calories) ? `${Math.round(calories)} cal` : "—";

    li.appendChild(left);
    li.appendChild(calEl);

    itemsEl.appendChild(li);
  }

  notesEl.textContent = notes || "—";

  prettyEl.classList.remove("hidden");
  // Keep raw JSON visible for now (we can hide later)
}

photoEl.addEventListener("change", () => {
  const file = photoEl.files?.[0];
  if (!file) return;

  currentFile = file;
  imgEl.src = URL.createObjectURL(file);
  previewEl.classList.remove("hidden");
  analyzeBtn.disabled = false;
  statusEl.textContent = "";
  prettyEl.classList.add("hidden");
  showRaw("(Ready to analyze)");
});

analyzeBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  analyzeBtn.disabled = true;
  statusEl.textContent = "Uploading photo…";

  try {
    const fd = new FormData();
    fd.append("image", currentFile);

    const resp = await fetch("/api/analyze", { method: "POST", body: fd });
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data?.error || "Request failed");
    }

    statusEl.textContent = "Done.";
    showRaw(JSON.stringify(data, null, 2));
    showPretty(data);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    prettyEl.classList.add("hidden");
    showRaw("(No result)");
  } finally {
    analyzeBtn.disabled = false;
  }
});
