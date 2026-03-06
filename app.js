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

// Edit UI
const editBtn = document.getElementById("editBtn");
const editPanel = document.getElementById("editPanel");
const editName = document.getElementById("editName");
const editQty = document.getElementById("editQty");
const recalcBtn = document.getElementById("recalcBtn");

// Raw JSON fallback (kept hidden)
const resultEl = document.getElementById("result");

let currentFile = null;
let lastResult = null;

function setStatus(text) {
  statusEl.textContent = text || "";
}

function renderPretty(data) {
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
  resultEl.classList.add("hidden");
}

function guessMainItemName(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  // Pick the highest-calorie item as "main"
  let best = items[0];
  for (const it of items) {
    if (Number(it?.calories) > Number(best?.calories)) best = it;
  }
  return (best?.name ?? "").toString();
}

function openEditPanel() {
  if (!lastResult) return;

  // Prefill name from the "main" item; qty defaults to 1
  editName.value = guessMainItemName(lastResult.items) || "";
  editQty.value = "1";

  editPanel.classList.remove("hidden");
}

function closeEditPanel() {
  editPanel.classList.add("hidden");
}

photoEl.addEventListener("change", () => {
  const file = photoEl.files?.[0];
  if (!file) return;

  currentFile = file;
  lastResult = null;

  imgEl.src = URL.createObjectURL(file);
  previewEl.classList.remove("hidden");

  analyzeBtn.disabled = false;
  editBtn.disabled = true;
  closeEditPanel();

  setStatus("");
  prettyEl.classList.add("hidden");
  resultEl.classList.add("hidden");
});

editBtn.addEventListener("click", () => {
  if (editPanel.classList.contains("hidden")) openEditPanel();
  else closeEditPanel();
});

analyzeBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  analyzeBtn.disabled = true;
  editBtn.disabled = true;
  closeEditPanel();
  setStatus("Uploading photo…");

  try {
    const fd = new FormData();
    fd.append("image", currentFile);

    const resp = await fetch("/api/analyze", { method: "POST", body: fd });
    const data = await resp.json();

    if (!resp.ok) throw new Error(data?.error || "Request failed");

    lastResult = data;
    renderPretty(data);

    editBtn.disabled = false;
    setStatus("Done.");
  } catch (err) {
    setStatus("Error: " + err.message);
    prettyEl.classList.add("hidden");
  } finally {
    analyzeBtn.disabled = false;
  }
});

recalcBtn.addEventListener("click", async () => {
  if (!lastResult) return;

  const name = (editName.value || "").trim();
  const qty = Number(editQty.value);

  if (!name) {
    setStatus("Please enter an item name.");
    return;
  }
  if (!Number.isFinite(qty) || qty < 1) {
    setStatus("Quantity must be 1 or more.");
    return;
  }

  recalcBtn.disabled = true;
  analyzeBtn.disabled = true;
  editBtn.disabled = true;
  setStatus("Recalculating…");

  try {
    const resp = await fetch("/api/recalc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        quantity: qty,
        // Send original result as context (helps the model refine)
        original: lastResult
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Recalc failed");

    lastResult = data;
    renderPretty(data);

    setStatus("Updated.");
    // keep edit panel open so they can tweak again
    editBtn.disabled = false;
    recalcBtn.disabled = false;
  } catch (err) {
    setStatus("Error: " + err.message);
    recalcBtn.disabled = false;
    editBtn.disabled = false;
  } finally {
    analyzeBtn.disabled = false;
  }
});
