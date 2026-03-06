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
    calories += Number(item.calories) || 0;
    protein += Number(item.protein) || 0;
    fat += Number(item.fat) || 0;
    carbs += Number(item.carbs) || 0;
  }

  totalCaloriesEl.textContent = Math.round(calories);
  totalProteinEl.textContent = Math.round(protein);
  totalFatEl.textContent = Math.round(fat);
  totalCarbsEl.textContent = Math.round(carbs);
}

function renderItems() {

  itemsEl.innerHTML = "";

  itemsData.forEach((item, index) => {

    const row = document.createElement("div");
    row.className = "item";

    const nameInput = document.createElement("input");
    nameInput.className = "input";
    nameInput.value = item.name;
    nameInput.placeholder = "Food name";
    nameInput.oninput = () => itemsData[index].name = nameInput.value;

    const portionInput = document.createElement("input");
    portionInput.className = "input";
    portionInput.value = item.portion;
    portionInput.placeholder = "Portion / quantity";
    portionInput.oninput = () => itemsData[index].portion = portionInput.value;

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
      input.style.width = "70px";
      input.value = item[field];
      input.oninput = () => {
        itemsData[index][field] = Number(input.value) || 0;
        calcTotals();
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

    itemsData = data.items || [];

    notesText = data.notes || "";
    notesEl.textContent = notesText || "—";

    prettyEl.classList.remove("hidden");
    editBtn.disabled = false;

    renderItems();

    setStatus("Done.");

  } catch (err) {

    setStatus("Error: " + err.message);

  } finally {

    analyzeBtn.disabled = false;

  }

});
