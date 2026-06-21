const dayLabels = {
  mon: "Thứ Hai",
  tue: "Thứ Ba",
  wed: "Thứ Tư",
  thu: "Thứ Năm",
  fri: "Thứ Sáu",
  sat: "Thứ Bảy",
  sun: "Chủ Nhật"
};

const toIsoDate = (d) => {
  const pad = num => num.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getWeekDates = (offset) => {
  const current = new Date();
  const day = current.getDay();
  // Adjust index so Monday is 0, Sunday is 6
  const diff = current.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const startOfWeek = new Date(current.setDate(diff));
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + idx);
    return {
      key: dayKeys[idx],
      date: d
    };
  });
};

const triggerReminder = (info) => {
  // Save to storage to sync across all tabs (even new/suspended ones)
  chrome.storage.local.set({ activeReminder: info }, () => {
    // Send system notification as well
    sendSystemNotification(info);
  });
};

const sendSystemNotification = (info) => {
  let title = "";
  let body = "";

  if (info.isSnooze) {
    title = info.isEnd ? `Báo thức lại (Hết giờ): ${info.task.title}` : `Báo thức lại: ${info.task.title}`;
    body = `Dự án: ${info.projectTitle}\nThời gian: ${dayLabels[info.dayKey]} lúc ${info.timeStr}`;
  } else if (info.isEnd) {
    const remainingText = info.remainingMin <= 0 ? "Hết giờ ngay bây giờ" : `Còn ${info.remainingMin} phút nữa là kết thúc`;
    title = info.remainingMin <= 0 ? `Hết giờ: ${info.task.title}` : `Sắp hết giờ: ${info.task.title}`;
    body = `Dự án: ${info.projectTitle}\nThời gian: ${dayLabels[info.dayKey]} lúc ${info.timeStr} (${remainingText})`;
  } else {
    const remainingText = info.remainingMin <= 0 ? "Bắt đầu ngay bây giờ" : `Còn ${info.remainingMin} phút nữa là bắt đầu`;
    title = info.remainingMin <= 0 ? `Bắt đầu: ${info.task.title}` : `Nhắc nhở công việc: ${info.task.title}`;
    body = `Dự án: ${info.projectTitle}\nThời gian: ${dayLabels[info.dayKey]} lúc ${info.timeStr} (${remainingText})`;
  }

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: title,
    message: body,
    priority: 2
  });
};

const checkReminders = () => {
  const now = new Date();
  const currentWeekDays = getWeekDates(0);

  chrome.storage.local.get(["plannerData", "snoozes", "notifiedKeys"], (res) => {
    const planner = res.plannerData;
    if (!planner || !planner.projects) return;

    const notifiedKeys = new Set(res.notifiedKeys || []);
    const snoozes = res.snoozes || [];
    const remainingSnoozes = [];
    let updatedSnooze = false;

    // 1. Check snoozed reminders
    snoozes.forEach((snooze) => {
      if (now.getTime() >= snooze.triggerTimeMs) {
        triggerReminder({
          task: { 
            id: snooze.taskId, 
            title: snooze.taskTitle, 
            reminderSound: snooze.sound, 
            endReminderSound: snooze.sound 
          },
          projectTitle: snooze.projectName,
          dayKey: snooze.dayKey,
          timeStr: snooze.startTime,
          remainingMin: 0,
          isEnd: snooze.isEnd,
          isSnooze: true
        });
        updatedSnooze = true;
      } else {
        remainingSnoozes.push(snooze);
      }
    });

    if (updatedSnooze) {
      chrome.storage.local.set({ snoozes: remainingSnoozes });
    }

    // 2. Check scheduled project tasks
    planner.projects.forEach((project) => {
      project.tasks.forEach((task) => {
        if (task.completed) return;

        if (task.days && task.days.length > 0) {
          task.days.forEach((day) => {
            const matchingDate = currentWeekDays.find(d => d.key === day);
            if (!matchingDate) return;

            const dayTime = task.dayTimes?.[day] || (task.startTime && task.endTime ? { startTime: task.startTime, endTime: task.endTime } : null);
            if (!dayTime) return;

            const dateStr = toIsoDate(matchingDate.date);

            // Check start reminder
            if (task.reminderEnabled && dayTime.startTime) {
              const startTimeMs = new Date(`${dateStr}T${dayTime.startTime}:00`).getTime();
              if (!isNaN(startTimeMs)) {
                const offsets = task.reminderOffsets && task.reminderOffsets.length > 0 ? task.reminderOffsets : [5];
                offsets.forEach((offset) => {
                  const triggerTimeMs = startTimeMs - offset * 60 * 1000;
                  const diff = now.getTime() - triggerTimeMs;

                  if (diff >= 0 && diff < 10 * 60 * 1000) {
                    const reminderKey = `${task.id}-${day}-${offset}-${dateStr}`;
                    if (!notifiedKeys.has(reminderKey)) {
                      notifiedKeys.add(reminderKey);
                      const remainingMin = Math.round((startTimeMs - now.getTime()) / 60000);

                      triggerReminder({
                        task,
                        projectTitle: project.title,
                        dayKey: day,
                        timeStr: dayTime.startTime,
                        remainingMin,
                        isEnd: false,
                        isSnooze: false
                      });
                    }
                  }
                });
              }
            }

            // Check end reminder
            if (task.endReminderEnabled && dayTime.endTime) {
              const endTimeMs = new Date(`${dateStr}T${dayTime.endTime}:00`).getTime();
              if (!isNaN(endTimeMs)) {
                const offsets = task.endReminderOffsets && task.endReminderOffsets.length > 0 ? task.endReminderOffsets : [0];
                offsets.forEach((offset) => {
                  const triggerTimeMs = endTimeMs - offset * 60 * 1000;
                  const diff = now.getTime() - triggerTimeMs;

                  if (diff >= 0 && diff < 10 * 60 * 1000) {
                    const reminderKey = `${task.id}-${day}-end-${offset}-${dateStr}`;
                    if (!notifiedKeys.has(reminderKey)) {
                      notifiedKeys.add(reminderKey);
                      const remainingMin = Math.round((endTimeMs - now.getTime()) / 60000);

                      triggerReminder({
                        task,
                        projectTitle: project.title,
                        dayKey: day,
                        timeStr: dayTime.endTime,
                        remainingMin,
                        isEnd: true,
                        isSnooze: false
                      });
                    }
                  }
                });
              }
            }
          });
        }
      });
    });

    chrome.storage.local.set({ notifiedKeys: Array.from(notifiedKeys) });
  });
};

// Create Alarm on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("reminder-check", { periodInMinutes: 1 });

  // Inject content.js into all existing tabs to prevent manual refresh
  chrome.tabs.query({}, (tabs) => {
    if (tabs) {
      tabs.forEach((tab) => {
        if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://") && !tab.url.startsWith("https://chrome.google.com/webstore")) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          }, () => {
            if (chrome.runtime.lastError) {
              // Ignore
            }
          });
        }
      });
    }
  });
});

// Run Check on Alarm Fire
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "reminder-check") {
    checkReminders();
  }
});

// Listen to Sync Messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SYNC_DATA") {
    chrome.storage.local.set({ plannerData: message.data, lastSync: Date.now() }, () => {
      sendResponse({ status: "success" });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === "SNOOZE_REMINDER") {
    chrome.storage.local.get(["snoozes"], (res) => {
      const existing = res.snoozes || [];
      existing.push(message.data);
      chrome.storage.local.set({ snoozes: existing }, () => {
        sendResponse({ status: "success" });
      });
    });
    return true;
  }
});
