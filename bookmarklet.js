
javascript:(function() {
    if (document.getElementById("job-assistant-widget")) {
      return; // already open
    }
  
    // === Create container ===
    const container = document.createElement("div");
    container.id = "job-assistant-widget";
    container.style.position = "fixed";
    container.style.top = "50px";
    container.style.right = "50px";
    container.style.width = "400px";
    container.style.height = "500px";
    container.style.zIndex = "99999";
    container.style.background = "rgba(30, 30, 40, 0.95)";
    container.style.color = "#fff";
    container.style.fontFamily = "sans-serif";
    container.style.borderRadius = "12px";
    container.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
    container.style.overflow = "hidden";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.backdropFilter = "blur(10px)";
    document.body.appendChild(container);
  
    // === Create header ===
    const header = document.createElement("div");
    header.style.background = "rgba(50,50,70,0.9)";
    header.style.padding = "8px";
    header.style.cursor = "move";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.innerHTML = `<span style="font-weight:bold;">Job Assistant</span>`;
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "✖";
    closeBtn.style.background = "transparent";
    closeBtn.style.border = "none";
    closeBtn.style.color = "#fff";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = () => container.remove();
    header.appendChild(closeBtn);
    container.appendChild(header);
  
    // Drag functionality
    let isDragging = false, offsetX = 0, offsetY = 0;
    header.onmousedown = (e) => {
      isDragging = true;
      offsetX = e.clientX - container.offsetLeft;
      offsetY = e.clientY - container.offsetTop;
      document.onmousemove = (e) => {
        if (isDragging) {
          container.style.left = (e.clientX - offsetX) + "px";
          container.style.top = (e.clientY - offsetY) + "px";
          container.style.right = "auto";
        }
      };
      document.onmouseup = () => { isDragging = false; document.onmousemove = null; };
    };
  
    // === Create tabs ===
    const tabs = document.createElement("div");
    tabs.style.display = "flex";
    tabs.style.borderBottom = "1px solid rgba(255,255,255,0.2)";
    const tabCover = document.createElement("button");
    const tabPrompt = document.createElement("button");
    const tabUploads = document.createElement("button");
    [tabCover, tabPrompt, tabUploads].forEach(btn => {
      btn.style.flex = "1";
      btn.style.padding = "10px";
      btn.style.border = "none";
      btn.style.background = "transparent";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
    });
    tabCover.innerText = "Cover Letter";
    tabPrompt.innerText = "Prompt";
    tabUploads.innerText = "Uploads";
    tabs.appendChild(tabCover);
    tabs.appendChild(tabPrompt);
    tabs.appendChild(tabUploads);
    container.appendChild(tabs);
  
    // === Content area ===
    const content = document.createElement("div");
    content.style.flex = "1";
    content.style.overflow = "auto";
    content.style.padding = "10px";
    container.appendChild(content);

    // Backend base URL
    const BASE = "http://localhost:8000";

    async function fetchCoverLetters() {
      try {
        const res = await fetch(`${BASE}/api/list-cover-letters`);
        const data = await res.json();
        return (data.items || []);
      } catch (e) {
        return [];
      }
    }
  
    function setActiveTab(tab) {
      if (tab === "cover") {
        tabCover.style.background = "rgba(255,255,255,0.1)";
        tabPrompt.style.background = "transparent";
        tabUploads.style.background = "transparent";
        renderCoverForm();
      } else {
        if (tab === "prompt") {
          tabPrompt.style.background = "rgba(255,255,255,0.1)";
          tabCover.style.background = "transparent";
          tabUploads.style.background = "transparent";
          renderPromptForm();
        } else {
          tabUploads.style.background = "rgba(255,255,255,0.1)";
          tabCover.style.background = "transparent";
          tabPrompt.style.background = "transparent";
          renderUploads();
        }
      }
    }
    tabCover.onclick = () => setActiveTab("cover");
    tabPrompt.onclick = () => setActiveTab("prompt");
    tabUploads.onclick = () => setActiveTab("uploads");
    setActiveTab("cover");
  
    // === Render Cover Letter Form ===
    function renderCoverForm() {
      content.innerHTML = `
        <label>Job Description</label>
        <textarea id="job-desc" style="width:100%;height:80px;margin:5px 0;"></textarea>
        <label>Additional Context (optional)</label>
        <textarea id="job-context" style="width:100%;height:50px;margin:5px 0;"></textarea>
        <label>Template Name (optional, without .pdf)</label>
        <input id="template-name" placeholder="cover_letter_template" style="width:100%;margin:5px 0;"/>
        <button id="cover-submit" style="margin-top:10px;width:100%;padding:8px;border:none;border-radius:6px;background:#4CAF50;color:white;cursor:pointer;">Generate Cover Letter</button>
        <div style="margin-top:10px;">
          <label>Edit Result</label>
          <textarea id="cover-edit" style="width:100%;height:160px;margin:5px 0;background:rgba(0,0,0,0.3);color:#fff;border-radius:6px;padding:8px;"></textarea>
          <div style="display:flex;gap:6px;align-items:center;margin:6px 0;">
            <input id="cover-save-name" placeholder="my_cover_letter" style="flex:1;"/>
            <button id="cover-save" style="padding:6px 10px;border:none;border-radius:6px;background:#9C27B0;color:white;cursor:pointer;">Save as Cover Letter (PDF)</button>
          </div>
          <div id="cover-status" style="font-size:12px;color:#ddd;"></div>
        </div>
      `;
      document.getElementById("cover-submit").onclick = async () => {
        const jobDescription = document.getElementById("job-desc").value;
        const additionalContext = document.getElementById("job-context").value;
        const templateName = document.getElementById("template-name").value;
        const editBox = document.getElementById("cover-edit");
        const status = document.getElementById("cover-status");
        status.innerText = "Loading...";
        try {
          const res = await fetch(`${BASE}/api/generate-cover-letter`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({job_description: jobDescription, additional_context: additionalContext, template_name: templateName || null})
          });
          const data = await res.json();
          editBox.value = data.cover_letter || JSON.stringify(data);
          status.innerText = "Done. You can edit and save as a cover letter.";
        } catch (err) {
          status.innerText = "Error: " + err.message;
        }
      };
      document.getElementById("cover-save").onclick = async () => {
        const name = document.getElementById("cover-save-name").value || "cover_letter";
        const content = document.getElementById("cover-edit").value;
        const status = document.getElementById("cover-status");
        status.innerText = "Saving...";
        try {
          const res = await fetch(`${BASE}/api/save-cover-letter`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name, content})
          });
          const data = await res.json();
          status.innerText = data.message || JSON.stringify(data);
        } catch (e) {
          status.innerText = "Error: " + e.message;
        }
      };
    }
  
    // === Render Prompt Form ===
    function renderPromptForm() {
      content.innerHTML = `
        <label>Prompt</label>
        <textarea id="prompt-text" style="width:100%;height:80px;margin:5px 0;"></textarea>
        <label>Additional Context (optional)</label>
        <textarea id="prompt-context" style="width:100%;height:50px;margin:5px 0;"></textarea>
        <div style="margin:6px 0;">
          <label>Pick a Cover Letter (optional)</label>
          <input id="cl-filter" placeholder="Search..." style="width:100%;margin:4px 0;"/>
          <select id="cl-select" size="4" style="width:100%;"></select>
        </div>
        <div style="display:flex;gap:6px;">
          <button id="prompt-submit" style="margin-top:10px;flex:1;padding:8px;border:none;border-radius:6px;background:#2196F3;color:white;cursor:pointer;">Submit Prompt</button>
          <button id="cl-upload-btn" style="margin-top:10px;padding:8px;border:none;border-radius:6px;background:#795548;color:white;cursor:pointer;">Upload Cover Letter</button>
          <input id="cl-upload" type="file" accept=".pdf,.txt" style="display:none;"/>
        </div>
        <div style="margin-top:10px;">
          <label>Edit Result</label>
          <textarea id="prompt-edit" style="width:100%;height:160px;margin:5px 0;background:rgba(0,0,0,0.3);color:#fff;border-radius:6px;padding:8px;"></textarea>
        </div>
      `;

      // Populate cover letters
      (async () => {
        const items = await fetchCoverLetters();
        const sel = document.getElementById("cl-select");
        sel.innerHTML = items.map(i => `<option value="${i.name}">${i.name}</option>`).join("");
        const filter = document.getElementById("cl-filter");
        filter.oninput = () => {
          const q = filter.value.toLowerCase();
          sel.innerHTML = items.filter(i => i.name.toLowerCase().includes(q)).map(i => `<option value="${i.name}">${i.name}</option>`).join("");
        };
      })();

      document.getElementById("cl-upload-btn").onclick = () => document.getElementById("cl-upload").click();
      document.getElementById("cl-upload").onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const fd = new FormData();
        fd.append("file", f);
        try {
          await fetch(`${BASE}/api/upload-cover-letter`, { method: "POST", body: fd });
          renderPromptForm();
        } catch (e) {
          alert("Upload failed: " + e.message);
        }
      };

      document.getElementById("prompt-submit").onclick = async () => {
        const promptText = document.getElementById("prompt-text").value;
        const additionalContext = document.getElementById("prompt-context").value;
        const editBox = document.getElementById("prompt-edit");
        editBox.value = "Loading...";
        const sel = document.getElementById("cl-select");
        const chosen = sel && sel.value ? sel.value : null;
        try {
          const res = await fetch(`${BASE}/api/respond-to-prompt`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({prompt: promptText, additional_context: additionalContext, cover_letter_name: chosen})
          });
          const data = await res.json();
          editBox.value = data.response || JSON.stringify(data);
        } catch (err) {
          editBox.value = "Error: " + err.message;
        }
      };
    }
  
    // === Render Uploads (Resume & Template PDFs) ===
    function renderUploads() {
      content.innerHTML = `
        <div>
          <div style="margin-bottom:10px;">
            <label>Upload Resume (PDF)</label>
            <input id="resume-file" type="file" accept="application/pdf" style="width:100%;margin:6px 0;"/>
            <button id="resume-upload" style="padding:8px;border:none;border-radius:6px;background:#4CAF50;color:white;cursor:pointer;">Upload Resume</button>
          </div>
          <div>
            <label>Upload Cover Letter Template (PDF)</label>
            <input id="tpl-file" type="file" accept="application/pdf" style="width:100%;margin:6px 0;"/>
            <button id="tpl-upload" style="padding:8px;border:none;border-radius:6px;background:#FF9800;color:white;cursor:pointer;">Upload Template</button>
          </div>
          <div id="upload-status" style="margin-top:10px;font-size:12px;color:#ddd;"></div>
        </div>
      `;

      document.getElementById("resume-upload").onclick = async () => {
        const f = document.getElementById("resume-file").files[0];
        const status = document.getElementById("upload-status");
        if (!f) { status.innerText = "Please choose a PDF"; return; }
        const fd = new FormData(); fd.append("file", f);
        status.innerText = "Uploading resume...";
        try {
          await fetch(`${BASE}/api/upload-resume`, { method: "POST", body: fd });
          status.innerText = "Resume uploaded.";
        } catch (e) { status.innerText = "Error: " + e.message; }
      };

      document.getElementById("tpl-upload").onclick = async () => {
        const f = document.getElementById("tpl-file").files[0];
        const status = document.getElementById("upload-status");
        if (!f) { status.innerText = "Please choose a PDF"; return; }
        const fd = new FormData(); fd.append("file", f);
        status.innerText = "Uploading template...";
        try {
          await fetch(`${BASE}/api/upload-template`, { method: "POST", body: fd });
          status.innerText = "Template uploaded.";
        } catch (e) { status.innerText = "Error: " + e.message; }
      };
    }

  })();