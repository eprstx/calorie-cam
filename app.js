const photoEl = document.getElementById("photo");
const imgEl = document.getElementById("img");
const previewEl = document.getElementById("preview");
const analyzeBtn = document.getElementById("analyze");
const statusEl = document.getElementById("status");

const prettyEl = document.getElementById("pretty");
const totalCaloriesEl = document.getElementById("totalCalories");
const itemsEl = document.getElementById("items");
const notesEl = document.getElementById("notes");

const editBtn = document.getElementById("editBtn");

let currentFile = null;
let itemsData = [];

function setStatus(text) {
  statusEl.textContent = text || "";
}

function calcTotal() {
  let total = 0;
  itemsData.forEach(i => {
    const c = Number(i.calories);
    if (!isNaN(c)) total += c;
  });
  totalCaloriesEl.textContent = Math.round(total);
}

function renderItems() {
  itemsEl.innerHTML = "";

  itemsData.forEach((item, index) => {

    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.className = "item-left";

    const nameInput = document.createElement("input");
    nameInput.value = item.name;
    nameInput.className = "input";
    nameInput.oninput = () => {
      itemsData[index].name = nameInput.value;
    };

    const portionInput = document.createElement("input");
    portionInput.value = item.portion;
    portionInput.className = "input";
    portionInput.oninput = () => {
      itemsData[index].portion = portionInput.value;
    };

    left.appendChild(nameInput);
    left.appendChild(portionInput);

    const right = document.createElement("div");

    const calInput = document.createElement("input");
    calInput.value = item.calories;
    calInput.className = "input";
    calInput.style.width = "80px";
    calInput.oninput = () => {
      itemsData[index].calories = Number(calInput.value);
      calcTotal();
    };

    const aiBtn = document.createElement("button");
    aiBtn.textContent = "AI";
    aiBtn.className = "btn";
    aiBtn.onclick = () => {
      alert("AI recalc will be added next step");
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "btn";
    delBtn.onclick = () => {
      itemsData.splice(index, 1);
      renderItems();
      calcTotal();
    };

    right.appendChild(calInput);
    right.appendChild(aiBtn);
    right.appendChild(delBtn);

    row.appendChild(left);
    row.appendChild(right);

    itemsEl.appendChild(row);
  });

  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Add item";
  addBtn.className = "btn";

  addBtn.onclick = () => {
    itemsData.push({
      name: "New item",
      portion: "",
      calories: 0
    });
    renderItems();
  };

  itemsEl.appendChild(addBtn);
}

photoEl.addEventListener("change", () => {

  const file = photoEl.files?.[0];
  if (!file) return;

  currentFile = file;

  imgEl.src = URL.createObjectURL(file);
  previewEl.classList.remove("hidden");

  analyzeBtn.disabled = false;

  setStatus("");
});

analyzeBtn.addEventListener("click", async () => {

  const fd = new FormData();
  fd.append("image", currentFile);

  setStatus("Analyzing...");

  const resp = await fetch("/api/analyze", {
    method: "POST",
    body: fd
  });

  const data = await resp.json();

  itemsData = data.items || [];

  prettyEl.classList.remove("hidden");

  renderItems();
  calcTotal();

  notesEl.textContent = data.notes || "";

  setStatus("Done");
});
