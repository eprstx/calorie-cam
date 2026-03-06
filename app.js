const photoEl = document.getElementById("photo");
const imgEl = document.getElementById("img");
const previewEl = document.getElementById("preview");
const analyzeBtn = document.getElementById("analyze");
const statusEl = document.getElementById("status");

const prettyEl = document.getElementById("pretty");
const itemsEl = document.getElementById("items");
const notesEl = document.getElementById("notes");
const editBtn = document.getElementById("editBtn");

const totalCaloriesEl = document.getElementById("totalCalories");
const totalProteinEl = document.getElementById("totalProtein");
const totalFatEl = document.getElementById("totalFat");
const totalCarbsEl = document.getElementById("totalCarbs");

let currentFile = null;
let itemsData = [];
let notesText = "";
let isEditing = false;

function setStatus(text) {
  statusEl.textContent = text || "";
}

function calcTotals() {

  let calories = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;

  for (const item of itemsData) {

    const c = Number(item.calories);
    const p = Number(item.protein);
    const f = Number(item.fat);
    const cb = Number(item.carbs);

    if (Number.isFinite(c)) calories += c;
    if (Number.isFinite(p)) protein += p;
    if (Number.isFinite(f)) fat += f;
    if (Number.isFinite(cb)) carbs += cb;
  }

  totalCaloriesEl.textContent = Math.round(calories);
  totalProteinEl.textContent = Math.round(protein);
  totalFatEl.textContent = Math.round(fat);
  totalCarbsEl.textContent = Math.round(carbs);
}

function renderReadOnlyItems() {

  itemsEl.innerHTML = "";

  for (const item of itemsData) {

    const row = document.createElement("div");
    row.className = "item";

    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = item.name || "Item";

    const portion = document.createElement("div");
    portion.className = "item-portion";
    portion.textContent = item.portion || "";

    const macros = document.createElement("div");
    macros.style.opacity = "0.85";
    macros.style.fontSize = "13px";
    macros.style.marginTop = "6px";

    macros.textContent =
      `${Math.round(item.calories || 0)} cal • ` +
      `P ${Math.round(item.protein || 0)}g • ` +
      `F ${Math.round(item.fat || 0)}g • ` +
      `C ${Math.round(item.carbs || 0)}g`;

    row.appendChild(name);
    row.appendChild(portion);
    row.appendChild(macros);

    itemsEl.appendChild(row);
  }
}

function renderCurrentMode() {
  renderReadOnlyItems();
  calcTotals();
}

photoEl.addEventListener("change", () => {

  const file = photoEl.files?.[0];
  if (!file) return;

  currentFile = file;

  imgEl.src = URL.createObjectURL(file);
  previewEl.classList.remove("hidden");

  analyzeBtn.disabled = false;
  editBtn.disabled = true;
  prettyEl.classList.add("hidden");

  setStatus("");
});

analyzeBtn.addEventListener("click", async () => {

  if (!currentFile) return;

  analyzeBtn.disabled = true;
  editBtn.disabled = true;

  setStatus("Analyzing...");

  try {

    const fd = new FormData();
    fd.append("image", currentFile);

    const resp = await fetch("/api/analyze", {
      method: "POST",
      body: fd
    });

    const data = await resp.json();

    if (!resp.ok) throw new Error(data?.error || "Analyze failed");

    itemsData = Array.isArray(data.items) ? data.items.map(item => ({
      name: item.name || "",
      portion: item.portion || "",
      calories: Number(item.calories) || 0,
      protein: Number(item.protein) || 0,
      fat: Number(item.fat) || 0,
      carbs: Number(item.carbs) || 0
    })) : [];

    notesText = data.notes || "";
    notesEl.textContent = notesText || "—";

    prettyEl.classList.remove("hidden");
    editBtn.disabled = false;

    renderCurrentMode();

    setStatus("Done.");

  } catch (err) {

    setStatus("Error: " + err.message);

  } finally {

    analyzeBtn.disabled = false;

  }

});
