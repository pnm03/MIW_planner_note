const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const dayLabels = {
  mon: "Thứ Hai", tue: "Thứ Ba", wed: "Thứ Tư", thu: "Thứ Năm",
  fri: "Thứ Sáu", sat: "Thứ Bảy", sun: "Chủ Nhật"
};

document.addEventListener("DOMContentLoaded", () => {
  const syncDot = document.getElementById("sync-dot");
  const syncStatus = document.getElementById("sync-status");
  const syncTime = document.getElementById("sync-time");
  const taskList = document.getElementById("task-list");
  const btnOpen = document.getElementById("btn-open-planner");

  // Open Web App
  btnOpen.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://weeknote-planner.vercel.app" });
  });

  // Load storage data
  chrome.storage.local.get(["plannerData", "lastSync"], (res) => {
    if (res.lastSync) {
      syncDot.classList.add("active");
      syncStatus.innerText = "Đã kết nối";
      
      const d = new Date(res.lastSync);
      const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      syncTime.innerText = `Đồng bộ lần cuối lúc ${timeStr} hôm nay.`;
    } else {
      syncDot.classList.remove("active");
      syncStatus.innerText = "Chưa kết nối";
      syncTime.innerText = "Mở trang web MIW Planner để đồng bộ dữ liệu.";
    }

    const planner = res.plannerData;
    if (!planner || !planner.projects) {
      taskList.innerHTML = '<div class="empty-state">Chưa có dữ liệu đồng bộ.</div>';
      return;
    }

    // Get current day key
    const today = new Date();
    const todayIndex = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const todayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][todayIndex];

    const todayAlarms = [];

    planner.projects.forEach(project => {
      project.tasks.forEach(task => {
        if (task.completed) return;
        
        if (task.days && task.days.includes(todayKey)) {
          const dayTime = task.dayTimes?.[todayKey] || (task.startTime && task.endTime ? { startTime: task.startTime, endTime: task.endTime } : null);
          if (dayTime) {
            todayAlarms.push({
              title: task.title || "Công việc chưa đặt tên",
              startTime: dayTime.startTime,
              endTime: dayTime.endTime,
              projectTitle: project.title,
              reminderEnabled: task.reminderEnabled,
              endReminderEnabled: task.endReminderEnabled
            });
          }
        }
      });
    });

    if (todayAlarms.length === 0) {
      taskList.innerHTML = '<div class="empty-state">Không có lịch trình nhắc nhở hôm nay.</div>';
      return;
    }

    // Sort by startTime
    todayAlarms.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

    taskList.innerHTML = "";
    todayAlarms.forEach(alarm => {
      const item = document.createElement("div");
      item.className = "task-item";
      
      const timeDisplay = alarm.startTime && alarm.endTime 
        ? `${alarm.startTime} - ${alarm.endTime}`
        : (alarm.startTime || alarm.endTime || "—");

      const iconStart = alarm.reminderEnabled ? "🔔" : "";
      const iconEnd = alarm.endReminderEnabled ? "⏰" : "";
      const icons = [iconStart, iconEnd].filter(Boolean).join(" ");

      item.innerHTML = `
        <div class="task-item-title">${alarm.title}</div>
        <div class="task-item-time">
          <span>🕒 ${timeDisplay}</span>
          ${icons ? `<span style="margin-left: auto;">${icons}</span>` : ""}
        </div>
      `;
      taskList.appendChild(item);
    });
  });
});
