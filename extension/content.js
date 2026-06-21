(() => {
  // Safe-guard: Check if extension context is valid
  if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
    return;
  }

  // Prevent duplicate injections
  if (window.miwReminderInjected) {
    return;
  }
  window.miwReminderInjected = true;

  const playReminderSound = (soundId) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;

    if (soundId === "chime") {
      const osc = context.createOscillator();
      const osc2 = context.createOscillator();
      const gain = context.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now);
      
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(context.destination);
      
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.8);
      osc2.stop(now + 0.8);
      setTimeout(() => void context.close(), 1000);
    } else if (soundId === "double") {
      const playBeep = (timeOffset) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now + timeOffset);
        gain.gain.setValueAtTime(0.0001, now + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.12, now + timeOffset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + 0.12);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.13);
      };
      playBeep(0);
      playBeep(0.18);
      setTimeout(() => void context.close(), 800);
    } else if (soundId === "retro") {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.31);
      setTimeout(() => void context.close(), 600);
    } else {
      // Default beep
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.exponentialRampToValueAtTime(980, now + 0.14);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.36);
      setTimeout(() => void context.close(), 500);
    }
  };

  const showReminderPopup = (info) => {
    // 1. Play synthesizer sound
    const soundId = info.isEnd ? info.task.endReminderSound : info.task.reminderSound;
    try {
      playReminderSound(soundId);
    } catch (err) {
      console.warn("Failed to play reminder sound:", err);
    }

    // 2. Clear any existing popup
    const existingContainer = document.getElementById("miw-planner-reminder-container");
    if (existingContainer) {
      existingContainer.remove();
    }

    // 3. Create container (Centered blurred backdrop overlay)
    const container = document.createElement("div");
    container.id = "miw-planner-reminder-container";
    container.style.position = "fixed";
    container.style.inset = "0";
    container.style.zIndex = "999999999";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.backgroundColor = "rgba(10, 10, 10, 0.45)";
    container.style.backdropFilter = "blur(6px)";
    container.style.webkitBackdropFilter = "blur(6px)";
    container.style.pointerEvents = "auto";
    container.style.opacity = "0";
    container.style.transition = "opacity 0.3s ease";

    // 4. Attach Shadow DOM
    const shadowRoot = container.attachShadow({ mode: "open" });

    // 5. Inject styles
    const style = document.createElement("style");
    style.textContent = `
      .modal-card {
        width: 500px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 1px 4px rgba(0, 0, 0, 0.05);
        padding: 32px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1c1c1e;
        display: flex;
        flex-direction: column;
        gap: 20px;
        transform: scale(0.95);
        opacity: 0;
        transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .modal-card.show {
        transform: scale(1);
        opacity: 1;
      }
      .header-row {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .icon-wrapper {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #ff5722;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(255, 87, 34, 0.3);
      }
      .title-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .title-main {
        font-weight: 800;
        font-size: 16px;
        color: #ff5722;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .title-sub {
        font-weight: 500;
        font-size: 12px;
        color: #8e8e93;
      }
      .project-badge {
        font-size: 11px;
        font-weight: 700;
        color: #e65100;
        background: #ffe0b2;
        padding: 5px 12px;
        border-radius: 6px;
        display: inline-block;
        width: fit-content;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .task-title {
        font-weight: 700;
        font-size: 20px;
        color: #000000;
        line-height: 1.35;
        margin: 4px 0;
      }
      .time-info {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        color: #3a3a3c;
        background: rgba(0, 0, 0, 0.05);
        padding: 12px 16px;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.02);
      }
      .btn-column {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 8px;
      }
      .btn-primary {
        background: #ff5722;
        color: white;
        border: none;
        padding: 13px 20px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(255, 87, 34, 0.25);
        transition: all 0.2s ease;
      }
      .btn-primary:hover {
        background: #f4511e;
        box-shadow: 0 6px 16px rgba(255, 87, 34, 0.35);
      }
      .btn-primary:active {
        transform: scale(0.98);
      }
      .btn-secondary {
        background: transparent;
        color: #ff5722;
        border: 1.5px solid #ff5722;
        padding: 12px 20px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-secondary:hover {
        background: rgba(255, 87, 34, 0.08);
      }
      .btn-secondary:active {
        transform: scale(0.98);
      }
    `;
    shadowRoot.appendChild(style);

    // 6. Setup layout texts
    let headerTitle = "Nhắc nhở công việc";
    let timeLabel = info.isEnd ? "Giờ kết thúc" : "Giờ bắt đầu";
    let bodyText = "";

    if (info.isSnooze) {
      headerTitle = info.isEnd ? "Báo thức lại (Hết giờ)" : "Báo thức lại";
      bodyText = `${info.timeStr}`;
    } else if (info.isEnd) {
      const remainingText = info.remainingMin <= 0 ? "Hết giờ ngay bây giờ" : `Còn ${info.remainingMin} phút nữa là kết thúc`;
      headerTitle = info.remainingMin <= 0 ? "Đến giờ kết thúc" : "Sắp hết giờ";
      bodyText = `${info.timeStr} (${remainingText})`;
    } else {
      const remainingText = info.remainingMin <= 0 ? "Bắt đầu ngay bây giờ" : `Còn ${info.remainingMin} phút nữa là bắt đầu`;
      headerTitle = info.remainingMin <= 0 ? "Bắt đầu công việc" : "Sắp đến giờ";
      bodyText = `${info.timeStr} (${remainingText})`;
    }

    const dayLabels = {
      mon: "Thứ Hai", tue: "Thứ Ba", wed: "Thứ Tư", thu: "Thứ Năm",
      fri: "Thứ Sáu", sat: "Thứ Bảy", sun: "Chủ Nhật"
    };
    const dayLabel = dayLabels[info.dayKey] || info.dayKey;

    const card = document.createElement("div");
    card.className = "modal-card";
    card.innerHTML = `
      <div class="header-row">
        <div class="icon-wrapper">
          ${info.isEnd ? "⏰" : "🔔"}
        </div>
        <div class="title-col">
          <div class="title-main">${headerTitle}</div>
          <div class="title-sub">${dayLabel}</div>
        </div>
      </div>
      
      <div class="project-badge">${info.projectTitle}</div>
      
      <div class="task-title">${info.task.title || "Công việc chưa đặt tên"}</div>
      
      <div class="time-info">
        <span>🕒</span>
        <span>${timeLabel}: <strong>${bodyText}</strong></span>
      </div>
      
      <div class="btn-column">
        <button class="btn-primary" id="btn-snooze">Hoãn lại 5 phút</button>
        <button class="btn-secondary" id="btn-dismiss">Đã hiểu / Tắt nhắc</button>
      </div>
    `;

    shadowRoot.appendChild(card);
    if (document.body) {
      document.body.appendChild(container);
    } else {
      document.documentElement.appendChild(container);
    }

    // Trigger animations
    setTimeout(() => {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
      container.style.opacity = "1";
      card.classList.add("show");
    }, 10);

    // Button events
    shadowRoot.getElementById("btn-snooze").addEventListener("click", () => {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
      const now = new Date();
      const triggerTimeMs = now.getTime() + 5 * 60 * 1000;
      
      const newSnooze = {
        id: Math.random().toString(36).substring(2, 9),
        taskId: info.task.id,
        taskTitle: info.task.title,
        projectName: info.projectTitle,
        dayKey: info.dayKey,
        startTime: info.timeStr,
        triggerTimeMs,
        isEnd: info.isEnd,
        sound: soundId
      };

      chrome.storage.local.remove("activeReminder", () => {
        if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
        chrome.runtime.sendMessage({ type: "SNOOZE_REMINDER", data: newSnooze });
      });
    });

    shadowRoot.getElementById("btn-dismiss").addEventListener("click", () => {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
      chrome.storage.local.remove("activeReminder");
    });
  };

  // Check if there is an active reminder on load
  chrome.storage.local.get(["activeReminder"], (res) => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
    if (res.activeReminder) {
      showReminderPopup(res.activeReminder);
    }
  });

  // Listen for changes to activeReminder in storage
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
    if (areaName === "local" && changes.activeReminder) {
      const val = changes.activeReminder.newValue;
      if (val) {
        showReminderPopup(val);
      } else {
        // Clear popup if activeReminder was removed
        const existingContainer = document.getElementById("miw-planner-reminder-container");
        if (existingContainer) {
          existingContainer.style.opacity = "0";
          const shadow = existingContainer.shadowRoot;
          const card = shadow ? shadow.querySelector(".modal-card") : null;
          if (card) {
            card.classList.remove("show");
          }
          setTimeout(() => existingContainer.remove(), 300);
        }
      }
    }
  });

  // Sync data to extension storage if page is MIW Planner
  const isPlannerHost = 
    window.location.host.includes("weeknote-planner.vercel.app") || 
    window.location.host.includes("localhost") || 
    window.location.host.includes("127.0.0.1");

  if (isPlannerHost) {
    window.addEventListener("message", (event) => {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) return;
      if (event.data && event.data.type === "SYNC_PLANNER_DATA") {
        chrome.runtime.sendMessage({ type: "SYNC_DATA", data: event.data.data });
      }
    });
  }
})();
