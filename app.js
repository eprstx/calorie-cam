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

const consumedAtInputEl = document.getElementById("consumedAtInput");
const mealNameEl = document.getElementById("mealName");
const ingredientsInputEl = document.getElementById("ingredientsInput");
const waterInputEl = document.getElementById("waterInput");
const saveMealBtn = document.getElementById("saveMealBtn");

const loadMealsBtn = document.getElementById("loadMealsBtn");
const recentMealsEl = document.getElementById("recentMeals");

const authEmailEl = document.getElementById("authEmail");
const authPasswordEl = document.getElementById("authPassword");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const authBoxEl = document.getElementById("authBox");
const currentUserBoxEl = document.getElementById("currentUserBox");
const logoutWrapEl = document.getElementById("logoutWrap");
const logoutBtn = document.getElementById("logoutBtn");

const dailyDateInputEl = document.getElementById("dailyDateInput");
const loadDailyTotalsBtn = document.getElementById("loadDailyTotalsBtn");
const dailyTotalsBoxEl = document.getElementById("dailyTotalsBox");

let currentFile = null;
let itemsData = [];
let notesText = "";
let isSaved = false;
let ingredientsManuallyEdited = false;
let mealNameManuallyEdited = false;
let currentUser = null;

const ANON_SCAN_LIMIT = 3;
const ANON_SCAN_KEY = "foodsnap_anon_scans_used";

function setStatus(text) {
  statusEl.textContent = text || "";
}

function getAnonScansUsed() {
  return Number(localStorage.getItem(ANON_SCAN_KEY) || "0");
}

function setAnonScansUsed(value) {
  localStorage.setItem(ANON_SCAN_KEY, String(value));
}

function incrementAnonScansUsed() {
  const next = getAnonScansUsed() + 1;
  setAnonScansUsed(next);
  return next;
}

function remainingAnonScans() {
  return Math.max(0, ANON_SCAN_LIMIT - getAnonScansUsed());
}

function canAnalyzeNow() {
  if (currentUser) return true;
  return getAnonScansUsed() < ANON_SCAN_LIMIT;
}

function anonLimitMessage() {
  return "You have used your 3 free scans. Create an account or log in to continue.";
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

function buildIngredientsSummary(items) {
  return (Array.isArray(items) ? items : [])
    .map(item => String(item?.name || "").trim())
    .filter(Boolean)
    .join(", ");
}

function refreshIngredientsAuto() {
  if (ingredientsManuallyEdited) return;
  ingredientsInputEl.value = buildIngredientsSummary(itemsData);
}

function formatNowForInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    "-",
    pad(d.getMonth() + 1),
    "-",
    pad(d.getDate()),
    "T",
    pad(d.getHours()),
    ":",
    pad(d.getMinutes())
  ].join("");
}

function formatTodayForDateInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultMealNameFromDateTime(localDateTimeValue) {
  if (!localDateTimeValue) return "Snack";

  const d = new Date(localDateTimeValue);
  if (Number.isNaN(d.getTime())) return "Snack";

  const hour = d.getHours();
  if (hour >= 5 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 15) return "Lunch";
  if (hour >= 17 && hour < 22) return "Dinner";
  return "Snack";
}

function refreshMealNameAuto() {
  if (mealNameManuallyEdited) return;
  mealNameEl.value = defaultMealNameFromDateTime(consumedAtInputEl.value);
}

function forceFillTimeAndDefaultMealName() {
  consumedAtInputEl.value = formatNowForInput();
  mealNameManuallyEdited = false;
  refreshMealNameAuto();
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
      refreshIngredientsAuto();
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
  refreshIngredientsAuto();
}

function resetPhotoSelection() {
  currentFile = null;
  photoEl.value = "";
  imgEl.src = "";
  previewEl.classList.add("hidden");
  setStatus("");
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function renderRecentMeals(meals) {
  recentMealsEl.innerHTML = "";

  if (!Array.isArray(meals) || meals.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notes";
    empty.textContent = "No saved meals yet.";
    recentMealsEl.appendChild(empty);
    return;
  }

  meals.forEach((meal) => {
    const row = document.createElement("div");
    row.className = "item";

    const title = document.createElement("div");
    title.className = "item-name";
    title.textContent = meal.meal_name || "Untitled meal";

    const ingredients = document.createElement("div");
    ingredients.className = "item-portion";
    ingredients.textContent = meal.ingredients_summary || "";

    const time = document.createElement("div");
    time.className = "item-portion";
    time.style.marginTop = "4px";
    time.textContent = formatDateTime(meal.consumed_at || meal.saved_at);

    const totals = document.createElement("div");
    totals.style.opacity = "0.85";
    totals.style.fontSize = "13px";
    totals.style.marginTop = "6px";
    totals.textContent =
      `${Math.round(Number(meal.total_calories) || 0)} cal • ` +
      `P ${Math.round(Number(meal.total_protein) || 0)}g • ` +
      `F ${Math.round(Number(meal.total_fat) || 0)}g • ` +
      `C ${Math.round(Number(meal.total_carbs) || 0)}g`;

    const water = document.createElement("div");
    water.style.opacity = "0.75";
    water.style.fontSize = "13px";
    water.style.marginTop = "6px";
    water.textContent = `Water: ${Number(meal.water) || 0}`;

    row.appendChild(title);
    if (meal.ingredients_summary) row.appendChild(ingredients);
    row.appendChild(time);
    row.appendChild(totals);
    row.appendChild(water);

    recentMealsEl.appendChild(row);
  });
}

function clearRecentMeals() {
  recentMealsEl.innerHTML = "";
}

function renderDailyTotals(totals, day) {
  dailyTotalsBoxEl.innerHTML =
    `<strong>${day}</strong><br>` +
    `Meals: ${Math.round(Number(totals.meal_count) || 0)}<br>` +
    `Calories: ${Math.round(Number(totals.total_calories) || 0)} cal<br>` +
    `Protein: ${Math.round(Number(totals.total_protein) || 0)} g<br>` +
    `Fat: ${Math.round(Number(totals.total_fat) || 0)} g<br>` +
    `Carbs: ${Math.round(Number(totals.total_carbs) || 0)} g<br>` +
    `Water: ${Number(totals.total_water) || 0}`;
}

function renderCurrentUser() {
  if (currentUser) {
    authBoxEl.classList.add("hidden");
    currentUserBoxEl.classList.remove("hidden");
    logoutWrapEl.classList.remove("hidden");
    currentUserBoxEl.textContent = `Logged in as ${currentUser.email}`;
  } else {
    authBoxEl.classList.remove("hidden");
    currentUserBoxEl.classList.add("hidden");
    logoutWrapEl.classList.add("hidden");

    const remaining = remainingAnonScans();
    currentUserBoxEl.textContent = "";
    dailyTotalsBoxEl.textContent = "No daily totals loaded yet.";
  }
}

async function checkCurrentUser() {
  try {
    const resp = await fetch("/api/me");
    const data = await resp.json();

    if (resp.ok && data.success && data.logged_in && data.user) {
      currentUser = data.user;
    } else {
      currentUser = null;
    }
  } catch {
    currentUser = null;
  }

  renderCurrentUser();
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

mealNameEl.addEventListener("input", () => {
  mealNameManuallyEdited = true;
  markUnsaved();
});

ingredientsInputEl.addEventListener("input", () => {
  ingredientsManuallyEdited = true;
  markUnsaved();
});

consumedAtInputEl.addEventListener("input", () => {
  refreshMealNameAuto();
  markUnsaved();
});

waterInputEl.addEventListener("input", markUnsaved);

registerBtn.addEventListener("click", async () => {
  const email = String(authEmailEl.value || "").trim();
  const password = String(authPasswordEl.value || "");

  if (!email || !password) {
    setStatus("Enter email and password.");
    return;
  }

  registerBtn.disabled = true;
  loginBtn.disabled = true;
  setStatus("Creating account...");

  try {
    const resp = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data?.error || "Registration failed");
    }

    setStatus("Account created. Now log in.");
  } catch (err) {
    setStatus("Error: " + err.message);
  } finally {
    registerBtn.disabled = false;
    loginBtn.disabled = false;
  }
});

loginBtn.addEventListener("click", async () => {
  const email = String(authEmailEl.value || "").trim();
  const password = String(authPasswordEl.value || "");

  if (!email || !password) {
    setStatus("Enter email and password.");
    return;
  }

  registerBtn.disabled = true;
  loginBtn.disabled = true;
  setStatus("Logging in...");

  try {
    const resp = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data?.error || "Login failed");
    }

    await checkCurrentUser();
    setStatus("Logged in successfully.");
  } catch (err) {
    setStatus("Error: " + err.message);
  } finally {
    registerBtn.disabled = false;
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  setStatus("Logging out...");

  try {
    const resp = await fetch("/api/logout", { method: "POST" });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      throw new Error(data?.error || "Logout failed");
    }

    currentUser = null;
    renderCurrentUser();
    clearRecentMeals();
    dailyTotalsBoxEl.textContent = "No daily totals loaded yet.";
    setStatus("Logged out successfully.");
  } catch (err) {
    setStatus("Error: " + err.message);
  } finally {
    logoutBtn.disabled = false;
  }
});

confirmPhotoBtn.addEventListener("click", async () => {
  if (!currentFile) return;

  if (!canAnalyzeNow()) {
    setStatus(anonLimitMessage());
    return;
  }

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

    ingredientsManuallyEdited = false;
    forceFillTimeAndDefaultMealName();
    ingredientsInputEl.value = buildIngredientsSummary(itemsData);

    prettyEl.classList.remove("hidden");
    renderItems();
    markUnsaved();

    if (!currentUser) {
      const used = incrementAnonScansUsed();
      const remaining = Math.max(0, ANON_SCAN_LIMIT - used);
      if (remaining > 0) {
        setStatus(`Done. ${remaining} free scan${remaining === 1 ? "" : "s"} left. Create an account to save meals.`);
      } else {
        setStatus("Done. You have used your 3 free scans. Create an account or log in to continue.");
      }
    } else {
      setStatus("Done.");
    }
  } catch (err) {
    setStatus("Error: " + err.message);
  } finally {
    confirmPhotoBtn.disabled = false;
    retakePhotoBtn.disabled = false;
  }
});

saveMealBtn.addEventListener("click", async () => {
  if (isSaved) return;

  if (!currentUser) {
    setStatus("Please log in first. Anonymous users can scan, but cannot save meals.");
    return;
  }

  const consumed_at = consumedAtInputEl.value || formatNowForInput();
  const meal_name =
    (mealNameEl.value || "").trim() || defaultMealNameFromDateTime(consumed_at);
  const ingredients_summary =
    (ingredientsInputEl.value || "").trim() || buildIngredientsSummary(itemsData);
  const water = Number(waterInputEl.value) || 0;
  const totals = getTotals();

  saveMealBtn.disabled = true;
  saveMealBtn.textContent = "Saving...";
  setStatus("Saving meal...");

  try {
    const resp = await fetch("/api/saveMeal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.id,
        meal_name,
        consumed_at,
        ingredients_summary,
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

loadMealsBtn.addEventListener("click", async () => {
  if (!currentUser) {
    setStatus("Please log in first.");
    return;
  }

  loadMealsBtn.disabled = true;
  loadMealsBtn.textContent = "Loading...";

  try {
    const resp = await fetch("/api/getMeals");
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      throw new Error(data?.error || "Could not load meals");
    }

    renderRecentMeals(data.meals || []);
  } catch (err) {
    recentMealsEl.innerHTML = "";
    const errorBox = document.createElement("div");
    errorBox.className = "notes";
    errorBox.textContent = "Error loading meals: " + err.message;
    recentMealsEl.appendChild(errorBox);
  } finally {
    loadMealsBtn.disabled = false;
    loadMealsBtn.textContent = "Load meals";
  }
});

loadDailyTotalsBtn.addEventListener("click", async () => {
  if (!currentUser) {
    setStatus("Please log in first.");
    return;
  }

  const day = String(dailyDateInputEl.value || "").trim();
  if (!day) {
    setStatus("Choose a date first.");
    return;
  }

  loadDailyTotalsBtn.disabled = true;
  loadDailyTotalsBtn.textContent = "Loading...";

  try {
    const resp = await fetch(`/api/getDailyTotals?day=${encodeURIComponent(day)}`);
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      throw new Error(data?.error || "Could not load daily totals");
    }

    renderDailyTotals(data.totals || {}, data.day || day);
  } catch (err) {
    dailyTotalsBoxEl.textContent = "Error loading daily totals: " + err.message;
  } finally {
    loadDailyTotalsBtn.disabled = false;
    loadDailyTotalsBtn.textContent = "Load daily totals";
  }
});

forceFillTimeAndDefaultMealName();
dailyDateInputEl.value = formatTodayForDateInput();
checkCurrentUser();
