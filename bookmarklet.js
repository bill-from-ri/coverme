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
    [tabCover, tabPrompt].forEach(btn => {
      btn.style.flex = "1";
      btn.style.padding = "10px";
      btn.style.border = "none";
      btn.style.background = "transparent";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
    });
    tabCover.innerText = "Cover Letter";
    tabPrompt.innerText = "Prompt";
    tabs.appendChild(tabCover);
    tabs.appendChild(tabPrompt);
    container.appendChild(tabs);
  
    // === Content area ===
    const content = document.createElement("div");
    content.style.flex = "1";
    content.style.overflow = "auto";
    content.style.padding = "10px";
    container.appendChild(content);
  
    function setActiveTab(tab) {
      if (tab === "cover") {
        tabCover.style.background = "rgba(255,255,255,0.1)";
        tabPrompt.style.background = "transparent";
        renderCoverForm();
      } else {
        tabPrompt.style.background = "rgba(255,255,255,0.1)";
        tabCover.style.background = "transparent";
        renderPromptForm();
      }
    }
    tabCover.onclick = () => setActiveTab("cover");
    tabPrompt.onclick = () => setActiveTab("prompt");
    setActiveTab("cover");
  
    // === Render Cover Letter Form ===
    function renderCoverForm() {
      content.innerHTML = `
        <label>Job Description</label>
        <textarea id="job-desc" style="width:100%;height:80px;margin:5px 0;"></textarea>
        <label>Additional Context (optional)</label>
        <textarea id="job-context" style="width:100%;height:50px;margin:5px 0;"></textarea>
        <button id="cover-submit" style="margin-top:10px;width:100%;padding:8px;border:none;border-radius:6px;background:#4CAF50;color:white;cursor:pointer;">Generate Cover Letter</button>
        <pre id="cover-result" style="margin-top:10px;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;max-height:200px;overflow:auto;"></pre>
      `;
      document.getElementById("cover-submit").onclick = async () => {
        const jobDescription = document.getElementById("job-desc").value;
        const additionalContext = document.getElementById("job-context").value;
        const resultBox = document.getElementById("cover-result");
        resultBox.innerText = "Loading...";
        try {
          const res = await fetch("http://localhost:8000/api/generate-cover-letter", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({job_description: jobDescription, additional_context: additionalContext})
          });
          const data = await res.json();
          resultBox.innerText = data.cover_letter || JSON.stringify(data);
        } catch (err) {
          resultBox.innerText = "Error: " + err.message;
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
        <button id="prompt-submit" style="margin-top:10px;width:100%;padding:8px;border:none;border-radius:6px;background:#2196F3;color:white;cursor:pointer;">Submit Prompt</button>
        <pre id="prompt-result" style="margin-top:10px;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;max-height:200px;overflow:auto;"></pre>
      `;
      document.getElementById("prompt-submit").onclick = async () => {
        const promptText = document.getElementById("prompt-text").value;
        const additionalContext = document.getElementById("prompt-context").value;
        const resultBox = document.getElementById("prompt-result");
        resultBox.innerText = "Loading...";
        try {
          const res = await fetch("http://localhost:8000/api/respond-to-prompt", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({prompt: promptText, additional_context: additionalContext})
          });
          const data = await res.json();
          resultBox.innerText = data.response || JSON.stringify(data);
        } catch (err) {
          resultBox.innerText = "Error: " + err.message;
        }
      };
    }
  
  })();