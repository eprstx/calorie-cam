const photoEl = document.getElementById("photo");
const imgEl = document.getElementById("img");
const previewEl = document.getElementById("preview");
const statusEl = document.getElementById("status");

const confirmPhotoBtn = document.getElementById("confirmPhoto");
const retakePhotoBtn = document.getElementById("retakePhoto");

const prettyEl = document.getElementById("pretty");
const itemsEl = document.getElementById("items");
const notesEl = document.getElementById("notes");
const editBtn = document.getElementById("editBtn");

const totalCaloriesEl = document.getElementById("totalCalories");
const totalProteinEl = document.getElementById("totalProtein");
const totalFatEl = document.getElementById("totalFat");
const totalCarbsEl = document.getElementById("totalCarbs");

const mealNameEl = document.getElementById("mealName");
const waterInputEl = document.getElementById("waterInput");
const saveMealBtn = document.getElementById("saveMealBtn");

let currentFile = null;
let itemsData = [];
let notesText = "";
let isSaved = false;

function setStatus(text) {
  statusEl.textContent = text || "";
}

function markUnsaved() {
  isSaved = false;
  saveMealBtn.disabled = false;
  saveMealBtn.textContent = "Save Meal";
}

function markSaved() {
  isSaved = true;
  saveMealBtn.disabled = true;
  saveMealBtn.textContent = "Saved";
}

function getTotals() {
  let calories = 0;
  let protein = 0;
  let fat = 0;
  let carbs = 0;

  for (const item of itemsData) {
    calories += Number(item.calories) || 0;
    protein += Number(item.protein) || 0;
    fat += Number(item.fat) || 0;
    carbs += Number(item.carbs) || 0;
  }

  return {
    total_calories: Math.round(calories),
    total_protein: Math.round(protein),
    total_fat: Math.round(fat),
    total_carbs: Math.round(carbs)
  };
}

function renderTotals() {
  const totals = getTotals();
  totalCaloriesEl.textContent = totals.total_calories;
  totalProteinEl.textContent = totals.total_protein;
  totalFatEl.textContent = totals.total_fat;
  totalCarbsEl.textContent = totals.total_carbs;
}

function renderItems() {
  itemsEl.innerHTML = "";

  itemsData.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item";

    const nameInput = document.createElement("input");
    nameInput.className = "input";
    nameInput.value = item.name || "";
    nameInput.placeholder = "Food name";
    nameInput.oninput = () => {
      itemsData[index].name = nameInput.value;
      markUnsaved();
    };

    const portionInput = document.createElement("input");
    portionInput.className = "input";
    portionInput.value = item.portion || "";
    portionInput.placeholder = "Portion / quantity";
    portionInput.oninput = () => {
      itemsData[index].portion = portionInput.value;
      markUnsaved();
    };

    const macroRow = document.createElement("div");
    macroRow.style.display = "flex";
    macroRow.style.gap = "6px";
    macroRow.style.marginTop = "8px";
    macroRow.style.flexWrap = "wrap";

    function makeInput(label, field) {
      const wrap = document.createElement("div");

      const lab = document.createElement("div");
      lab.textContent = label;
      lab.style.fontSize = "12px";
      lab.style.opacity = "0.8";

      const input = document.createElement("input");
      input.className = "input";
      input.type = "number";
      input.style.width = "80px";
      input.value = item[field] ?? 0;
      input.oninput = () => {
        itemsData[index][field] = Number(input.value) || 0;
        renderTotals();
        markUnsaved();
      };

      wrap.appendChild(lab);
      wrap.appendChild(input);
      return wrap;
    }

    macroRow.appendChild(makeInput("Cal", "calories"));
    macroRow.appendChild(makeInput("Protein", "protein"));
    macroRow.appendChild(makeInput("Fat", "fat"));
    macroRow.appendChild(makeInput("Carbs", "carbs"));

    row.appendChild(nameInput);
    row.appendChild(portionInput);
    row.appendChild(macroRow);

    itemsEl.appendChild(row);
  });

  renderTotals();
}

function resetPhotoSelection() {
  currentFile = null;
  photoEl.value = "";
  imgEl.src = "";
  previewEl.classList.add("hidden");
  setStatus("");
}

photoEl.addEventListener("change", () => {
  const file = photoEl.files?.[0];
  if (!file) return;

  currentFile = file;
  imgEl.src = URL.createObjectURL(file);
  previewEl.classList.remove("hidden");

  prettyEl.classList.add("hidden");
  setStatus("");
  markUnsaved();
});

retakePhotoBtn.addEventListener("click", () => {
  resetPhotoSelection();
});

mealNameEl.addEventListener("input", markUnsaved);
waterInputEl.addEventListener("input", markUnsaved);

confirmPhotoBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  confirmPhotoBtn.disabled = true;
  retakePhotoBtn.disabled = true;
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
    renderItems();
    markUnsaved();

    setStatus("Done.");
  } catch (err) {
    setStatus("Error: " + err.message);
  } finally {
    confirmPhotoBtn.disabled = false;
    retakePhotoBtn.disabled = false;
  }
});

saveMealBtn.addEventListener("click", async () => {
  if (isSaved) return;

  const meal_name = (mealNameEl.value || "").trim() || "Untitled meal";
  const water = Number(waterInputEl.value) || 0;
  const totals = getTotals();

  saveMealBtn.disabled = true;
  saveMealBtn.textContent = "Saving...";
  setStatus("Saving meal...");

  try {
    const resp = await fetch("/api/saveMeal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: 1,
        meal_name,
        items: itemsData,
        total_calories: totals.total_calories,
        total_protein: totals.total_protein,
        total_fat: totals.total_fat,
        total_carbs: totals.total_carbs,
        water,
        notes: notesText
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Save failed");

    markSaved();
    setStatus("Meal saved successfully.");
  } catch (err) {
    saveMealBtn.disabled = false;
    saveMealBtn.textContent = "Save Meal";
    setStatus("Error: " + err.message);
  }
});
