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
let notesText = "";
let isEditing = false;

function setStatus(text) {
  statusEl.textContent = text || "";
}

function calcTotal() {
  let total = 0;
  for (const item of itemsData) {
    const c = Number(item.calories);
    if (Number.isFinite(c)) total += c;
  }
  totalCaloriesEl.textContent = String(Math.round(total));
}

function getTotal() {
  let total = 0;
  for (const item of itemsData) {
    const c = Number(item.calories);
    if (Number.isFinite(c)) total += c;
  }
  return Math.round(total);
}

function parseQuantityFromPortion(portion) {
  const text = String(portion || "").trim();
  const match = text.match(/(\d+(\.\d+)?)/);
  if (!match) return 1;
  const qty = Number(match[1]);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function renderReadOnlyItems() {
  itemsEl.innerHTML = "";

  for (const item of itemsData) {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.className = "item-left";

    const nameEl = document.createElement("div");
    nameEl.className = "item-name";
    nameEl.textContent = item.name || "Item";

    const portionEl = document.createElement("div");
    portionEl.className = "item-portion";
    portionEl.textContent = item.portion || "";

    left.appendChild(nameEl);
    if (item.portion) left.appendChild(portionEl);

    const calEl = document.createElement("div");
    calEl.className = "item-cal";
    calEl.textContent = `${Math.round(Number(item.calories) || 0)} cal`;

    row.appendChild(left);
    row.appendChild(calEl);

    itemsEl.appendChild(row);
  }
}

function renderEditableItems() {
  itemsEl.innerHTML = "";

  itemsData.forEach((item, index) => {
    const wrap = document.createElement("div");
    wrap.className = "item";
    wrap.style.display = "block";

    const nameInput = document.createElement("input");
    nameInput.className = "input";
    nameInput.placeholder = "Item name";
    nameInput.value = item.name || "";
    nameInput.style.marginBottom = "8px";
    nameInput.oninput = () => {
      itemsData[index].name = nameInput.value;
    };

    const portionInput = document.createElement("input");
    portionInput.className = "input";
    portionInput.placeholder = "Portion / quantity (e.g. 2 pieces)";
    portionInput.value = item.portion || "";
    portionInput.style.marginBottom = "8px";
    portionInput.oninput = () => {
      itemsData[index].portion = portionInput.value;
    };

    const row2 = document.createElement("div");
    row2.style.display = "flex";
    row2.style.gap = "8px";
    row2.style.flexWrap = "wrap";
    row2.style.alignItems = "center";

    const calInput = document.createElement("input");
    calInput.className = "input";
    calInput.type = "number";
    calInput.min = "0";
    calInput.step = "1";
    calInput.value = String(item.calories ?? 0);
    calInput.style.width = "110px";
    calInput.oninput = () => {
      itemsData[index].calories = Number(calInput.value) || 0;
      calcTotal();
    };

    const aiBtn = document.createElement("button");
    aiBtn.className = "btn";
    aiBtn.textContent = "AI";
    aiBtn.onclick = async () => {
      const name = String(itemsData[index].name || "").trim();
      const portion = String(itemsData[index].portion || "").trim();
      const quantity = parseQuantityFromPortion(portion);

      if (!name) {
        setStatus("Enter an item name first.");
        return;
      }

      aiBtn.disabled = true;
      setStatus(`Recalculating "${name}"...`);

      try {
        const resp = await fetch("/api/recalc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            quantity,
            original: {
              items: [itemsData[index]],
              totalCalories: Number(itemsData[index].calories) || 0,
              notes: notesText
            }
          })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || "AI recalc failed");

        const newItem = Array.isArray(data.items) && data.items[0] ? data.items[0] : null;
        if (!newItem) throw new Error("No item returned");

        itemsData[index] = {
          name: newItem.name || name,
          portion: newItem.portion || portion,
          calories: Number(newItem.calories) || 0
        };

        notesText = data.notes || notesText;
        notesEl.textContent = notesText || "—";

        calcTotal();
        renderEditableItems();
        setStatus(`Updated "${itemsData[index].name}".`);
      } catch (err) {
        setStatus("Error: " + err.message);
        aiBtn.disabled = false;
      }
    };

    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      itemsData.splice(index, 1);
      renderCurrentMode();
      calcTotal();
      setStatus("Item deleted.");
    };

    row2.appendChild(calInput);
    row2.appendChild(aiBtn);
    row2.appendChild(delBtn);

    wrap.appendChild(nameInput);
    wrap.appendChild(portionInput);
    wrap.appendChild(row2);

    itemsEl.appendChild(wrap);
  });

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "10px";
  controls.style.flexWrap = "wrap";
  controls.style.marginTop = "12px";

  const addBtn = document.createElement("button");
  addBtn.className = "btn";
  addBtn.textContent = "+ Add item";
  addBtn.onclick = () => {
    itemsData.push({
      name: "New item",
      portion: "1 item",
      calories: 0
    });
    renderEditableItems();
    calcTotal();
    setStatus("Item added.");
  };

  const totalBtn = document.createElement("button");
  totalBtn.className = "btn primary";
  totalBtn.textContent = "Recalculate Total";
  totalBtn.onclick = () => {
    calcTotal();
    notesEl.textContent = notesText || "—";
    setStatus(`Total updated: ${getTotal()} cal`);
  };

  controls.appendChild(addBtn);
  controls.appendChild(totalBtn);
  itemsEl.appendChild(controls);
}

function renderCurrentMode() {
  if (isEditing) renderEditableItems();
  else renderReadOnlyItems();
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

editBtn.addEventListener("click", () => {
  isEditing = !isEditing;
  editBtn.textContent = isEditing ? "Done Editing" : "Edit";
  renderCurrentMode();
  calcTotal();
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
      calories: Number(item.calories) || 0
    })) : [];

    notesText = data.notes || "";
    notesEl.textContent = notesText || "—";

    prettyEl.classList.remove("hidden");
    isEditing = false;
    editBtn.textContent = "Edit";
    editBtn.disabled = false;

    renderCurrentMode();
    calcTotal();
    setStatus("Done.");
  } catch (err) {
    setStatus("Error: " + err.message);
  } finally {
    analyzeBtn.disabled = false;
  }
});
