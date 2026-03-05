const photoEl = document.getElementById("photo");
const imgEl = document.getElementById("img");
const previewEl = document.getElementById("preview");
const analyzeBtn = document.getElementById("analyze");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

let currentFile = null;

photoEl.addEventListener("change", () => {
  const file = photoEl.files?.[0];
  if (!file) return;

  currentFile = file;
  imgEl.src = URL.createObjectURL(file);
  previewEl.classList.remove("hidden");
  analyzeBtn.disabled = false;
  statusEl.textContent = "";
  resultEl.textContent = "(Ready to analyze)";
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
    resultEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    resultEl.textContent = "(No result)";
  } finally {
    analyzeBtn.disabled = false;
  }
});
