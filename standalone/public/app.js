const elements = {
  mode: document.getElementById("mode"),
  path: document.getElementById("path"),
  uploadFile: document.getElementById("uploadFile"),
  uploadNote: document.getElementById("uploadNote"),
  language: document.getElementById("language"),
  functionName: document.getElementById("functionName"),
  functionPicker: document.getElementById("functionPicker"),
  position: document.getElementById("position"),
  theme: document.getElementById("theme"),
  appearance: document.getElementById("appearance"),
  renderButton: document.getElementById("renderButton"),
  copyUrlButton: document.getElementById("copyUrlButton"),
  title: document.getElementById("title"),
  status: document.getElementById("status"),
  meta: document.getElementById("meta"),
  diagram: document.getElementById("diagram"),
};

const uploadState = {
  file: null,
  code: "",
};

function setFunctionOptions(functions) {
  const options = ['<option value="">Auto-select first function</option>'];
  for (const functionName of functions) {
    const escaped = functionName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    options.push(`<option value="${escaped}">${escaped}</option>`);
  }
  elements.functionPicker.innerHTML = options.join("");

  if (elements.functionName.value.trim()) {
    elements.functionPicker.value = functions.includes(elements.functionName.value.trim())
      ? elements.functionName.value.trim()
      : "";
  }
}

window.onNodeClick = function onNodeClick(start, end) {
  elements.status.textContent = `Node source range: ${start} to ${end}`;
};

function updateFormFromQuery() {
  const params = new URLSearchParams(window.location.search);
  elements.mode.value = params.get("mode") || "flowchart";
  elements.path.value = params.get("path") || "";
  elements.language.value = params.get("language") || "";
  elements.functionName.value = params.get("functionName") || "";
  elements.position.value = params.get("position") || "";
  elements.theme.value = params.get("theme") || "monokai";
  elements.appearance.value = params.get("appearance") || "dark";
}

function detectLanguageFromFileName(fileName) {
  const lower = fileName.toLowerCase();
  const extensions = [
    [".tsx", "typescript"],
    [".ts", "typescript"],
    [".jsx", "javascript"],
    [".mjs", "javascript"],
    [".cjs", "javascript"],
    [".js", "javascript"],
    [".py", "python"],
    [".java", "java"],
    [".cpp", "cpp"],
    [".cxx", "cpp"],
    [".cc", "cpp"],
    [".hpp", "cpp"],
    [".h", "c"],
    [".c", "c"],
    [".rs", "rust"],
    [".go", "go"],
  ];

  const match = extensions.find(([ext]) => lower.endsWith(ext));
  return match ? match[1] : "";
}

function refreshUploadNote() {
  if (!uploadState.file) {
    elements.uploadNote.textContent =
      "Uploaded files render as function flowcharts only. Repo path stays best for shareable URLs.";
    return;
  }

  elements.uploadNote.textContent = `Loaded local file: ${uploadState.file.name}`;
}

async function loadFunctionOptions() {
  const language = elements.language.value;
  if (!language) {
    setFunctionOptions([]);
    return;
  }

  let response;
  if (uploadState.file) {
    response = await fetch("/api/functions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: uploadState.code,
        language,
      }),
    });
  } else if (elements.path.value.trim()) {
    const params = new URLSearchParams({
      path: elements.path.value.trim(),
      language,
    });
    response = await fetch(`/api/functions?${params.toString()}`);
  } else {
    setFunctionOptions([]);
    return;
  }

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to load functions.");
  }

  setFunctionOptions(payload.functions || []);
}

function clearUploadedFile() {
  uploadState.file = null;
  uploadState.code = "";
  if (elements.uploadFile.value) {
    elements.uploadFile.value = "";
  }
  refreshUploadNote();
}

function buildViewerUrl() {
  const params = new URLSearchParams();
  params.set("mode", elements.mode.value);

  if (elements.path.value.trim()) {
    params.set("path", elements.path.value.trim());
  }
  if (elements.language.value) {
    params.set("language", elements.language.value);
  }
  if (elements.functionName.value.trim()) {
    params.set("functionName", elements.functionName.value.trim());
  }
  if (elements.position.value.trim()) {
    params.set("position", elements.position.value.trim());
  }
  params.set("theme", elements.theme.value);
  params.set("appearance", elements.appearance.value);

  return `${window.location.origin}/?${params.toString()}`;
}

function syncQueryString() {
  window.history.replaceState({}, "", buildViewerUrl());
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? "#9b2c2c" : "";
}

async function renderMermaidDiagram(mermaidCode, appearance) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: appearance === "light" ? "default" : "dark",
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: "basis",
      padding: 20,
    },
  });

  const renderId = `diagram-${Date.now()}`;
  const result = await mermaid.render(renderId, mermaidCode);
  elements.diagram.className = "";
  elements.diagram.innerHTML = result.svg;
}

async function fetchPayload() {
  if (uploadState.file) {
    const response = await fetch("/api/flowchart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: uploadState.code,
        language: elements.language.value || detectLanguageFromFileName(uploadState.file.name),
        functionName: elements.functionName.value.trim() || undefined,
        position: elements.position.value.trim() || undefined,
        theme: elements.theme.value,
        appearance: elements.appearance.value,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Unknown server error.");
    }
    payload.uploadedFileName = uploadState.file.name;
    return payload;
  }

  const params = new URLSearchParams();
  params.set("path", elements.path.value.trim());
  params.set("theme", elements.theme.value);
  params.set("appearance", elements.appearance.value);

  if (elements.language.value) {
    params.set("language", elements.language.value);
  }
  if (elements.functionName.value.trim()) {
    params.set("functionName", elements.functionName.value.trim());
  }
  if (elements.position.value.trim()) {
    params.set("position", elements.position.value.trim());
  }

  const endpoint =
    elements.mode.value === "codebase"
      ? `/api/codebase?${params.toString()}`
      : `/api/flowchart?${params.toString()}`;

  const response = await fetch(endpoint);
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Unknown server error.");
  }
  return payload;
}

async function render() {
  if (!uploadState.file && !elements.path.value.trim()) {
    setStatus("Choose a repo path or upload a local script file first.", true);
    return;
  }

  if (uploadState.file && elements.mode.value === "codebase") {
    setStatus("Uploaded files support function flowcharts only.", true);
    return;
  }

  syncQueryString();
  setStatus("Rendering flowchart...");
  elements.meta.textContent = "";

  try {
    const payload = await fetchPayload();
    await renderMermaidDiagram(payload.mermaid, elements.appearance.value);
    elements.title.textContent = payload.title;
    if (payload.uploadedFileName) {
      elements.meta.textContent = `Uploaded file: ${payload.uploadedFileName}`;
    } else {
      elements.meta.textContent = payload.path ? `Path: ${payload.path}` : "";
    }
    setStatus(
      payload.mode === "codebase"
        ? "Dependency graph rendered."
        : "Flowchart rendered."
    );
  } catch (error) {
    elements.diagram.className = "empty";
    elements.diagram.innerHTML = `<strong>Render failed.</strong><div>${error.message}</div>`;
    setStatus(error.message, true);
  }
}

elements.renderButton.addEventListener("click", () => {
  render();
});

elements.copyUrlButton.addEventListener("click", async () => {
  if (uploadState.file) {
    setStatus("Uploaded-file views cannot be fully encoded into the URL. Use repo path mode for shareable links.", true);
    return;
  }
  const url = buildViewerUrl();
  await navigator.clipboard.writeText(url);
  setStatus("Viewer URL copied to clipboard.");
});

elements.mode.addEventListener("change", () => {
  if (elements.mode.value === "codebase") {
    clearUploadedFile();
    setFunctionOptions([]);
  }
});

elements.path.addEventListener("input", () => {
  if (elements.path.value.trim()) {
    clearUploadedFile();
  }
  setFunctionOptions([]);
});

elements.language.addEventListener("change", async () => {
  try {
    await loadFunctionOptions();
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.functionPicker.addEventListener("change", () => {
  elements.functionName.value = elements.functionPicker.value;
});

elements.functionName.addEventListener("input", () => {
  if (elements.functionPicker.value !== elements.functionName.value.trim()) {
    elements.functionPicker.value = "";
  }
});

elements.uploadFile.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (!file) {
    clearUploadedFile();
    return;
  }

  uploadState.file = file;
  uploadState.code = await file.text();
  elements.mode.value = "flowchart";
  elements.path.value = "";
  elements.position.value = "";
  elements.functionName.value = "";

  const detectedLanguage = detectLanguageFromFileName(file.name);
  if (detectedLanguage) {
    elements.language.value = detectedLanguage;
  }

  refreshUploadNote();
  await loadFunctionOptions();
  setStatus(`Loaded ${file.name}. Render when ready.`);
});

window.addEventListener("load", async () => {
  updateFormFromQuery();
  refreshUploadNote();
  try {
    await loadFunctionOptions();
  } catch (error) {
    setStatus(error.message, true);
  }
  if (elements.path.value.trim()) {
    await render();
  }
});
