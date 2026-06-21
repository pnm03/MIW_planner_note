import {
  Archive as ArchiveIcon,
  BarChart3,
  CalendarClock,
  CalendarDays,
  Bell,
  BellRing,
  BookHeart,
  Bold,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock3,
  GripVertical,
  Heart,
  ImagePlus,
  Italic,
  ListChecks,
  MoveRight,
  Palette,
  Plus,
  RotateCcw,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  Download,
  X,
  Trophy,
  CheckCircle2,
  Target,
  Share2,
  Star,
} from "lucide-react";
import {
  type ArchivedWeek,
  type DayCounter,
  type DayKey,
  type DefaultPage,
  type PlannerState,
  type PlannerViewMode,
  type ProgressionStyle,
  type Project,
  type Task,
  countProjectTasks,
  countTasks,
  createId,
  createDayCounter,
  createProject,
  createTask,
  dayKeys,
  dayLabels,
  formatWeekRange,
  getTodayKey,
  getWeekDates,
  loadPlanner,
  initialState,
  savePlanner,
  toIsoDate,
  getScheduledDates,
  getTaskStartDate,
} from "./planner";
import {
  applyPlannerTheme,
  getTheme,
  plannerThemes,
  type TextureLevel,
  type ThemeId,
} from "./themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { AuthPage } from "./AuthPage";

type View = "plan" | "days" | "stats" | "archive" | "auth";

const mergePlannerStates = (local: PlannerState, cloud: PlannerState): PlannerState => {
  if (!cloud) return local;
  if (!local || (local.projects.length === 0 && local.dayCounters.length === 0 && local.archives.length === 0)) {
    return cloud;
  }
  
  // Union of projects
  const mergedProjects = [...local.projects];
  cloud.projects.forEach(cloudProj => {
    const localProjIdx = mergedProjects.findIndex(p => p.id === cloudProj.id);
    if (localProjIdx === -1) {
      mergedProjects.push(cloudProj);
    } else {
      const localProj = mergedProjects[localProjIdx];
      const mergedTasks = [...localProj.tasks];
      cloudProj.tasks.forEach(cloudTask => {
        const localTaskIdx = mergedTasks.findIndex(t => t.id === cloudTask.id);
        if (localTaskIdx === -1) {
          mergedTasks.push(cloudTask);
        } else {
          if (cloudTask.completed && !mergedTasks[localTaskIdx].completed) {
            mergedTasks[localTaskIdx] = cloudTask;
          }
        }
      });
      mergedProjects[localProjIdx] = {
        ...localProj,
        ...cloudProj,
        tasks: mergedTasks,
      };
    }
  });

  // Union of archives
  const mergedArchives = [...local.archives];
  cloud.archives.forEach(cloudArch => {
    const exists = mergedArchives.some(a => a.id === cloudArch.id);
    if (!exists) {
      mergedArchives.push(cloudArch);
    }
  });

  // Union of day counters
  const mergedDayCounters = [...local.dayCounters];
  cloud.dayCounters.forEach(cloudCounter => {
    const localCounterIdx = mergedDayCounters.findIndex(c => c.id === cloudCounter.id);
    if (localCounterIdx === -1) {
      mergedDayCounters.push(cloudCounter);
    } else {
      const localCounter = mergedDayCounters[localCounterIdx];
      const mergedMemories = [...localCounter.memories];
      cloudCounter.memories.forEach(cloudMem => {
        const exists = mergedMemories.some(m => m.id === cloudMem.id);
        if (!exists) {
          mergedMemories.push(cloudMem);
        }
      });
      mergedDayCounters[localCounterIdx] = {
        ...localCounter,
        ...cloudCounter,
        memories: mergedMemories,
      };
    }
  });

  return {
    ...local,
    projects: mergedProjects,
    archives: mergedArchives,
    dayCounters: mergedDayCounters,
    themeId: cloud.themeId || local.themeId,
    texture: cloud.texture || local.texture,
    viewMode: cloud.viewMode || local.viewMode,
    defaultPage: cloud.defaultPage || local.defaultPage,
  };
};

interface TaskLocation {
  projectId: string;
  taskId: string;
}

interface DayTask {
  project: Project;
  task: Task;
}

const clone = <T,>(value: T): T => structuredClone(value);
const titleColors = [
  "",
  "#b5482e",
  "#4f7a4a",
  "#286d8c",
  "#765da5",
  "#b85d74",
  "#8b5537",
  "#d97706",
];
const projectIcons = [
  "✦",
  "✧",
  "★",
  "☆",
  "◆",
  "◇",
  "●",
  "○",
  "■",
  "□",
  "▲",
  "△",
  "◈",
  "◎",
  "◌",
  "◍",
  "⌁",
  "⌂",
  "⌘",
  "⌬",
  "⚑",
  "⚐",
  "✎",
  "✚",
  "✕",
  "☼",
  "☾",
  "♢",
  "♧",
  "♤",
  "♙",
  "♜",
  "01",
  "A",
  "M",
  "N",
  "UX",
  "AI",
  "OK",
  "GO",
];

const playReminderSound = () => {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    980,
    context.currentTime + 0.14,
  );
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.36);
  window.setTimeout(() => void context.close(), 500);
};

const formatDateTimeLabel = (date: string, time?: string) => {
  if (!date) return "Gán thời gian";
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
  });
  return time ? `${dateLabel} · ${time}` : dateLabel;
};

const getRemainingDateLabel = (date: string) => {
  if (!date) return "";
  const due = new Date(`${date}T00:00:00`);
  if (Number.isNaN(due.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (days > 0) return `còn ${days} ngày`;
  if (days === 0) return "hôm nay";
  return `quá ${Math.abs(days)} ngày`;
};

const getDayDateStr = (day: DayKey, offset: number) => {
  const dates = getWeekDates(offset);
  const date = dates[dayKeys.indexOf(day)].date;
  return toIsoDate(date);
};

const getTaskScheduleProgress = (task: Task, weekOffset: number) => {
  if (!task.days.length) return 0;
  if (task.deadline) {
    const scheduled = getScheduledDates(getTaskStartDate(task), task.deadline, task.days);
    if (!scheduled.length) return 0;
    const completedCount = (task.completedDates ?? []).filter((date) =>
      scheduled.includes(date),
    ).length;
    return Math.round((completedCount / scheduled.length) * 100);
  }

  const weekDates = getWeekDates(weekOffset).map((d) => toIsoDate(d.date));
  const scheduledInWeek = weekDates.filter((_, index) =>
    task.days.includes(dayKeys[index]),
  );
  const completedInWeek = (task.completedDates ?? []).filter((date) =>
    scheduledInWeek.includes(date),
  ).length;
  return Math.round((completedInWeek / task.days.length) * 100);
};

const getTaskPriority = (project: Project, task: Task) => ({
  important: Boolean(task.important || project.important),
  urgent: Boolean(task.urgent || project.urgent),
});

const getMatrixKey = (project: Project, task: Task) => {
  const priority = getTaskPriority(project, task);
  if (priority.important && priority.urgent) return "do";
  if (priority.important && !priority.urgent) return "schedule";
  if (!priority.important && priority.urgent) return "delegate";
  return "drop";
};

const isImageIcon = (icon?: string) => Boolean(icon?.startsWith("data:image/"));

const progressionPresets: Record<
  ProgressionStyle,
  {
    name: string;
    description: string;
    symbol: string;
    levels: string[];
    upMilestones: number[];
    auras: string[];
    glyphs: string[];
  }
> = {
  cultivation: {
    name: "Đạo lộ tu tiên",
    description: "Tụ linh khí qua ngày tháng, phá cảnh và bước lên tiên lộ.",
    symbol: "仙",
    levels: [
      "Luyện Khí",
      "Trúc Cơ",
      "Kim Đan",
      "Nguyên Anh",
      "Hóa Thần",
      "Luyện Hư",
      "Hợp Thể",
      "Đại Thừa",
    ],
    upMilestones: [0, 5, 10, 20, 30, 60, 100, 180],
    auras: [
      "#7ee7d8",
      "#6ee7a8",
      "#f7d66d",
      "#ff9c68",
      "#c59cff",
      "#75b8ff",
      "#f5a8ff",
      "#fff1a6",
    ],
    glyphs: ["气", "基", "丹", "婴", "神", "虚", "合", "乘"],
  },
  expedition: {
    name: "Đội viễn chinh",
    description: "Hệ cấp bậc hư cấu theo tinh thần thám hiểm và chỉ huy.",
    symbol: "⚑",
    levels: [
      "Tân Hành Giả",
      "Trinh Lộ",
      "Tiền Phong",
      "Dẫn Đội",
      "Chỉ Huy Cánh",
      "Thống Lĩnh Tuyến",
      "Nguyên Soái Sao",
      "Tổng Chỉ Huy",
    ],
    upMilestones: [0, 3, 7, 14, 30, 60, 120, 240],
    auras: [
      "#b6c3cc",
      "#7bc4df",
      "#62b7ff",
      "#7597ff",
      "#ab86ff",
      "#ef9f62",
      "#ffd56f",
      "#fff0b5",
    ],
    glyphs: ["·", "I", "II", "III", "IV", "V", "★", "✦"],
  },
  love: {
    name: "Chuyện chúng mình",
    description: "Mỗi chặng là một lớp ký ức mới của hai người.",
    symbol: "♡",
    levels: [
      "Chạm Mặt",
      "Rung Động",
      "Đồng Điệu",
      "Thương Nhớ",
      "Gắn Bó",
      "Tri Kỷ",
      "Một Nhà",
      "Mãi Về Sau",
    ],
    upMilestones: [0, 7, 30, 60, 100, 180, 365, 730],
    auras: [
      "#ffc2d0",
      "#ff9eb5",
      "#ff7e9d",
      "#f071a8",
      "#c987e8",
      "#9b8df2",
      "#f0ab67",
      "#ffd98c",
    ],
    glyphs: ["♡", "♥", "∞", "❣", "✿", "☾", "⌂", "✦"],
  },
};

const dayMs = 86_400_000;

const getDateAtMidnight = (value: string | Date) => {
  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(value.includes("T") ? value : `${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getCounterNumbers = (counter: DayCounter) => {
  const today = getDateAtMidnight(new Date());
  const anchor = getDateAtMidnight(counter.anchorDate);
  const created = getDateAtMidnight(counter.createdAt);
  const elapsed = Math.max(
    0,
    Math.floor((today.getTime() - created.getTime()) / dayMs),
  );
  const value =
    counter.mode === "up"
      ? Math.max(0, Math.floor((today.getTime() - anchor.getTime()) / dayMs))
      : Math.max(0, Math.ceil((anchor.getTime() - today.getTime()) / dayMs));
  const passedTarget =
    counter.mode === "down" && anchor.getTime() < today.getTime();
  const totalDuration = Math.max(
    1,
    Math.ceil((anchor.getTime() - created.getTime()) / dayMs),
  );

  return {
    value,
    elapsed: counter.mode === "up" ? value : elapsed,
    totalDuration,
    passedTarget,
  };
};

const getCounterLevel = (counter: DayCounter) => {
  const preset = progressionPresets[counter.progressionStyle];
  const { elapsed, totalDuration, passedTarget } = getCounterNumbers(counter);
  const milestones =
    counter.mode === "up"
      ? preset.upMilestones
      : preset.levels.map((_, index) =>
          Math.round((totalDuration * index) / (preset.levels.length - 1)),
        );
  const levelIndex = passedTarget
    ? preset.levels.length - 1
    : milestones.reduce(
        (currentLevel, milestone, index) =>
          elapsed >= milestone ? index : currentLevel,
        0,
      );
  const atFinalLevel = levelIndex === preset.levels.length - 1;
  const currentMilestone = milestones[levelIndex] ?? 0;
  const nextMilestone =
    milestones[Math.min(levelIndex + 1, milestones.length - 1)] ??
    currentMilestone;
  const levelSpan = Math.max(1, nextMilestone - currentMilestone);
  const progress = atFinalLevel
    ? 100
    : Math.min(
        100,
        Math.round(((elapsed - currentMilestone) / levelSpan) * 100),
      );
  const daysToNext = atFinalLevel ? 0 : Math.max(0, nextMilestone - elapsed);

  return {
    preset,
    milestones,
    levelIndex,
    currentLevel: preset.levels[levelIndex],
    nextLevel: preset.levels[Math.min(levelIndex + 1, preset.levels.length - 1)],
    aura: preset.auras[levelIndex],
    glyph: preset.glyphs[levelIndex],
    progress,
    daysToNext,
    atFinalLevel,
  };
};

const readImageFile = (file: File | null, onLoad: (dataUrl: string) => void) => {
  if (!file) return;
  if (file.size > 2_500_000) {
    window.alert("Ảnh nên nhỏ hơn 2.5 MB để lưu ổn định trên thiết bị.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") onLoad(reader.result);
  };
  reader.readAsDataURL(file);
};

function App() {
  const [planner, setPlanner] = useState<PlannerState>(loadPlanner);
  const [view, setView] = useState<View>(() => planner.defaultPage);
  const [user, setUser] = useState<any>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const lastSyncedStateStr = useRef("");
  const hasFetchedForUser = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  const [editingTask, setEditingTask] = useState<TaskLocation | null>(null);
  const [showEndWeek, setShowEndWeek] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sharedProjectToImport, setSharedProjectToImport] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);
  const [dragTask, setDragTask] = useState<TaskLocation | null>(null);
  const [iconPickerProjectId, setIconPickerProjectId] = useState<string | null>(
    null,
  );
  interface TaskCompletionModalData {
    projectId: string;
    taskId: string;
    isEarly: boolean;
    taskTitle: string;
  }
  const [taskCompletionModal, setTaskCompletionModal] = useState<TaskCompletionModalData | null>(null);
  interface DeadlineExtensionModalData {
    projectId: string;
    taskId: string;
    taskTitle: string;
    currentDeadline: string;
  }
  const [deadlineExtensionModal, setDeadlineExtensionModal] = useState<DeadlineExtensionModalData | null>(null);
  const notifiedTasks = useRef(new Map<string, string>());

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // 1. Delete data from database table
    const { error: deleteDataError } = await supabase
      .from("planner_data")
      .delete()
      .eq("id", user.id);
    
    if (deleteDataError) {
      console.warn("Lỗi khi xóa dữ liệu planner_data:", deleteDataError.message);
    }

    // 2. Try to call custom RPC function to delete auth user (optional configuration on Supabase)
    try {
      await supabase.rpc("delete_user_account");
    } catch (rpcErr) {
      console.log("Không có hàm RPC delete_user_account hoặc lỗi RPC:", rpcErr);
    }

    // 3. Sign out
    await supabase.auth.signOut();

    // 4. Reset to initial default state and refs
    setPlanner(initialState);
    savePlanner(initialState);
    lastSyncedStateStr.current = "";
    hasFetchedForUser.current = null;
    
    setToast("Đã xóa tài khoản và dữ liệu thành công!");
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareProjBase64 = urlParams.get("shareProj");
    if (shareProjBase64) {
      try {
        const jsonStr = decodeURIComponent(escape(atob(shareProjBase64)));
        const sharedProj = JSON.parse(jsonStr);
        if (sharedProj && sharedProj.title) {
          setSharedProjectToImport(sharedProj);
        }
      } catch (err) {
        console.error("Lỗi giải mã dự án chia sẻ:", err);
      }
    }
  }, []);

  const fetchAndSyncData = async (currentUser: any) => {
    if (!currentUser) return;
    setLoadingSync(true);
    try {
      const { data, error } = await supabase
        .from("planner_data")
        .select("state")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn("Error checking cloud data (table might not exist yet):", error.message);
        setToast("Không thể tải dữ liệu từ đám mây (bảng CSDL chưa được tạo).");
        return;
      }

      if (data && data.state) {
        const cloudState = data.state as PlannerState;
        setPlanner((localState) => {
          const merged = mergePlannerStates(localState, cloudState);
          lastSyncedStateStr.current = JSON.stringify(merged);
          return merged;
        });
        hasFetchedForUser.current = currentUser.id;
        setToast("Đồng bộ dữ liệu thành công từ đám mây!");
      } else {
        const { error: insertError } = await supabase
          .from("planner_data")
          .upsert({ id: currentUser.id, state: planner });

        if (insertError) {
          console.error("Error upserting initial cloud data:", insertError.message);
        } else {
          lastSyncedStateStr.current = JSON.stringify(planner);
          hasFetchedForUser.current = currentUser.id;
          setToast("Đã đẩy dữ liệu hiện tại của bạn lên đám mây!");
        }
      }
    } catch (err: any) {
      console.error("Unexpected sync error:", err);
    } finally {
      setLoadingSync(false);
      isInitialLoad.current = false;
    }
  };

  const userId = user?.id;
  useEffect(() => {
    if (userId) {
      fetchAndSyncData(user);
    } else {
      isInitialLoad.current = false;
      hasFetchedForUser.current = null;
    }
  }, [userId]);

  useEffect(() => {
    savePlanner(planner);

    if (user && hasFetchedForUser.current === user.id && !loadingSync) {
      const currentStr = JSON.stringify(planner);
      if (currentStr !== lastSyncedStateStr.current) {
        const syncToCloud = async () => {
          const { error } = await supabase
            .from("planner_data")
            .upsert({ id: user.id, state: planner });
          if (error) {
            console.warn("Failed to sync to cloud:", error.message);
          } else {
            lastSyncedStateStr.current = currentStr;
          }
        };
        syncToCloud();
      }
    }
  }, [planner, user, loadingSync]);

  useEffect(() => {
    applyPlannerTheme(planner.themeId, planner.texture);
  }, [planner.themeId, planner.texture]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      planner.projects.forEach((project) => {
        project.tasks.forEach((task) => {
          if (
            task.completed ||
            !task.reminderEnabled ||
            !task.deadline ||
            !task.deadlineTime ||
            notifiedTasks.current.get(task.id) ===
              `${task.deadline}T${task.deadlineTime}`
          ) {
            return;
          }
          const dueAt = new Date(`${task.deadline}T${task.deadlineTime}:00`);
          const diff = now.getTime() - dueAt.getTime();
          if (diff >= 0 && diff < 60_000) {
            notifiedTasks.current.set(
              task.id,
              `${task.deadline}T${task.deadlineTime}`,
            );
            playReminderSound();
            setToast(`Đến giờ: ${task.title || "Công việc chưa đặt tên"}`);
          }
        });
      });
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 15_000);
    return () => window.clearInterval(timer);
  }, [planner.projects]);

  const completion = useMemo(() => {
    const allTasks = planner.projects.flatMap((p) => p.tasks);
    if (allTasks.length === 0) return 0;

    let totalProgressPoints = 0;
    allTasks.forEach((task) => {
      if (task.completed) {
        totalProgressPoints += 1;
      } else if (task.days.length > 0) {
        let totalDays = task.days.length;
        let reachedDays = 0;
        if (task.deadline) {
          const startDate = getTaskStartDate(task);
          const scheduled = getScheduledDates(startDate, task.deadline, task.days);
          totalDays = scheduled.length;
          reachedDays = (task.completedDates ?? []).filter((d) => scheduled.includes(d)).length;
        } else {
          const weekDates = getWeekDates(planner.weekOffset).map((d) => toIsoDate(d.date));
          const scheduledInWeek = weekDates.filter((_, index) => task.days.includes(dayKeys[index]));
          totalDays = task.days.length;
          reachedDays = (task.completedDates ?? []).filter((d) => scheduledInWeek.includes(d)).length;
        }
        const taskDayRatio = totalDays > 0 ? reachedDays / totalDays : 0;
        totalProgressPoints += taskDayRatio;
      }
    });

    const ratio = totalProgressPoints / allTasks.length;
    return Math.round(ratio * 1000) / 10;
  }, [planner.projects, planner.weekOffset]);

  const taskTotals = useMemo(() => {
    return countTasks(planner.projects);
  }, [planner.projects]);

  const updateProject = (projectId: string, updater: (project: Project) => Project) => {
    setPlanner((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? updater(project) : project,
      ),
    }));
  };

  const updateTask = (
    projectId: string,
    taskId: string,
    updater: (task: Task) => Task,
  ) => {
    updateProject(projectId, (project) => ({
      ...project,
      tasks: project.tasks.map((task) =>
        task.id === taskId ? updater(task) : task,
      ),
    }));
  };

  const handleToggleMainTask = (projectId: string, taskId: string) => {
    const project = planner.projects.find((p) => p.id === projectId);
    if (!project) return;
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.completed) {
      let allTicked = false;
      if (task.days.length > 0 && task.deadline) {
        const startDate = getTaskStartDate(task);
        const scheduled = getScheduledDates(startDate, task.deadline, task.days);
        allTicked = scheduled.length > 0 && scheduled.every((d) => (task.completedDates ?? []).includes(d));
      }

      if (allTicked) {
        setDeadlineExtensionModal({
          projectId,
          taskId,
          taskTitle: task.title || "Công việc chưa đặt tên",
          currentDeadline: task.deadline,
        });
      } else {
        updateTask(projectId, taskId, (current) => ({
          ...current,
          completed: false,
        }));
      }
    } else {
      if (task.days.length > 0) {
        const todayStr = toIsoDate(new Date());
        const isEarly = task.deadline ? (todayStr < task.deadline) : false;
        setTaskCompletionModal({
          projectId,
          taskId,
          isEarly,
          taskTitle: task.title || "Công việc chưa đặt tên",
        });
      } else {
        updateTask(projectId, taskId, (current) => ({
          ...current,
          completed: true,
        }));
      }
    }
  };

  const addProject = () => {
    setPlanner((current) => ({
      ...current,
      projects: [...current.projects, createProject()],
    }));
    setView("plan");
  };

  const deleteProject = (projectId: string) => {
    const project = planner.projects.find((item) => item.id === projectId);
    if (!project) return;
    if (
      !window.confirm(
        `Xóa “${project.title || "Dự án chưa đặt tên"}” cùng toàn bộ công việc?`,
      )
    ) {
      return;
    }
    setPlanner((current) => ({
      ...current,
      projects: current.projects.filter((item) => item.id !== projectId),
    }));
  };

  const deleteTask = (projectId: string, taskId: string) => {
    updateProject(projectId, (project) => ({
      ...project,
      tasks: project.tasks.filter((task) => task.id !== taskId),
    }));
  };

  const moveProject = (targetProjectId: string) => {
    if (!dragProjectId || dragProjectId === targetProjectId) return;
    setPlanner((current) => {
      const next = [...current.projects];
      const from = next.findIndex((project) => project.id === dragProjectId);
      const to = next.findIndex((project) => project.id === targetProjectId);
      if (from < 0 || to < 0) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...current, projects: next };
    });
    setDragProjectId(null);
  };

  const moveTask = (targetProjectId: string, targetTaskId?: string) => {
    if (!dragTask) return;
    setPlanner((current) => {
      const projects = clone(current.projects);
      const sourceProject = projects.find(
        (project) => project.id === dragTask.projectId,
      );
      const targetProject = projects.find(
        (project) => project.id === targetProjectId,
      );
      if (!sourceProject || !targetProject) return current;

      const sourceIndex = sourceProject.tasks.findIndex(
        (task) => task.id === dragTask.taskId,
      );
      if (sourceIndex < 0) return current;
      const [moved] = sourceProject.tasks.splice(sourceIndex, 1);

      if (!targetTaskId) {
        targetProject.tasks.push(moved);
      } else {
        const targetIndex = targetProject.tasks.findIndex(
          (task) => task.id === targetTaskId,
        );
        targetProject.tasks.splice(
          targetIndex < 0 ? targetProject.tasks.length : targetIndex,
          0,
          moved,
        );
      }

      return { ...current, projects };
    });
    setDragTask(null);
  };

  const endWeek = (mode: "carry" | "clear") => {
    const dates = getWeekDates(planner.weekOffset);
    const snapshotTotals = countTasks(planner.projects);
    const archived: ArchivedWeek = {
      id: createId(),
      label: formatWeekRange(planner.weekOffset),
      start: toIsoDate(dates[0].date),
      end: toIsoDate(dates[6].date),
      completed: snapshotTotals.completed,
      total: snapshotTotals.total,
      projects: clone(planner.projects),
      archivedAt: new Date().toISOString(),
    };

    const projects =
      mode === "clear"
        ? []
        : planner.projects
            .map((project) => ({
              ...project,
              tasks: project.tasks
                .filter((task) => !task.completed || (task.deadline && task.deadline > archived.end))
                .map((task) => ({ ...task, completed: false, completedDates: task.completedDates ?? [] })),
            }))
            .filter((project) => project.tasks.length > 0);

    setPlanner((current) => ({
      ...current,
      projects,
      archives: [archived, ...current.archives],
      weekOffset: current.weekOffset + 1,
      focusDay: "mon",
      showAllDays: false,
    }));
    setShowEndWeek(false);
    setToast("Đã lưu tuần. Kế hoạch tuần mới đã sẵn sàng.");
  };

  const editorProject = editingTask
    ? planner.projects.find((project) => project.id === editingTask.projectId)
    : undefined;
  const editorTask = editingTask
    ? editorProject?.tasks.find((task) => task.id === editingTask.taskId)
    : undefined;

  if (view === "auth") {
    return (
      <div className="app-shell" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <AuthPage
          onBack={() => setView("plan")}
          onAuthSuccess={() => setView("plan")}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        planner={planner}
        view={view}
        totals={taskTotals}
        completion={completion}
        onView={setView}
        user={user}
        onSignOut={async () => {
          await supabase.auth.signOut();
          setPlanner(initialState);
          savePlanner(initialState);
          lastSyncedStateStr.current = "";
          hasFetchedForUser.current = null;
          setToast("Đã đăng xuất thành công!");
        }}
        onWeekChange={(amount) =>
          setPlanner((current) => ({
            ...current,
            weekOffset: current.weekOffset + amount,
            focusDay:
              current.weekOffset + amount === 0 ? getTodayKey() : "mon",
          }))
        }
        onCurrentWeek={() =>
          setPlanner((current) => ({
            ...current,
            weekOffset: 0,
            focusDay: getTodayKey(),
          }))
        }
        onEndWeek={() => setShowEndWeek(true)}
        onSettings={() => setShowSettings(true)}
        onPlaceholder={(message) => setToast(message)}
      />

      {view === "plan" && (
        <main className="planner-layout">
          <section className="projects-pane">
            <SectionLabel>Dự án</SectionLabel>
            <div className="project-list">
              {planner.projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  weekOffset={planner.weekOffset}
                  onUpdate={(updater) => updateProject(project.id, updater)}
                  onUpdateTask={(taskId, updater) =>
                    updateTask(project.id, taskId, updater)
                  }
                  onToggleMainTask={(taskId) =>
                    handleToggleMainTask(project.id, taskId)
                  }
                  onAddTask={() =>
                    updateProject(project.id, (current) => ({
                      ...current,
                      tasks: [...current.tasks, createTask()],
                    }))
                  }
                  onDelete={() => deleteProject(project.id)}
                  onDeleteTask={(taskId) => deleteTask(project.id, taskId)}
                  onEditTask={(taskId) =>
                    setEditingTask({ projectId: project.id, taskId })
                  }
                  onOpenIconPicker={() => setIconPickerProjectId(project.id)}
                  onProjectDragStart={() => setDragProjectId(project.id)}
                  onProjectDrop={() => moveProject(project.id)}
                  onTaskDragStart={(taskId) =>
                    setDragTask({ projectId: project.id, taskId })
                  }
                  onTaskDrop={(taskId) => moveTask(project.id, taskId)}
                  onTaskDropAtEnd={() => moveTask(project.id)}
                />
              ))}
              <button className="add-project" onClick={addProject}>
                <Plus size={15} />
                Thêm dự án
              </button>
            </div>
          </section>

          {planner.viewMode === "matrix" ? (
            <EisenhowerMatrix
              planner={planner}
              onOpenTask={(projectId, taskId) =>
                setEditingTask({ projectId, taskId })
              }
              onToggleViewMode={() =>
                setPlanner((current) => ({
                  ...current,
                  viewMode: current.viewMode === "matrix" ? "week" : "matrix",
                }))
              }
              onToggleTask={(projectId, taskId, day) => {
                if (day) {
                  updateTask(projectId, taskId, (task) => {
                    if (task.days.length > 0) {
                      const dayDateStr = getDayDateStr(day, planner.weekOffset);
                      const completedDates = task.completedDates ?? [];
                      const nextCompletedDates = completedDates.includes(dayDateStr)
                        ? completedDates.filter((d) => d !== dayDateStr)
                        : [...completedDates, dayDateStr];
                      
                      let completed = task.completed;
                      if (task.deadline) {
                        const startDate = getTaskStartDate({ ...task, completedDates: nextCompletedDates });
                        const scheduled = getScheduledDates(startDate, task.deadline, task.days);
                        completed = scheduled.length > 0 && scheduled.every((d) => nextCompletedDates.includes(d));
                      } else {
                        const weekDates = getWeekDates(planner.weekOffset).map((d) => toIsoDate(d.date));
                        const scheduledInWeek = weekDates.filter((_, index) => task.days.includes(dayKeys[index]));
                        completed = scheduledInWeek.length > 0 && scheduledInWeek.every((d) => nextCompletedDates.includes(d));
                      }
                      
                      return {
                        ...task,
                        completedDates: nextCompletedDates,
                        completed,
                      };
                    }
                    return task;
                  });
                } else {
                  handleToggleMainTask(projectId, taskId);
                }
              }}
            />
          ) : (
            <WeekPane
              planner={planner}
              onAddProject={addProject}
              onOpenTask={(projectId, taskId) =>
                setEditingTask({ projectId, taskId })
              }
              onToggleViewMode={() =>
                setPlanner((current) => ({
                  ...current,
                  viewMode: current.viewMode === "matrix" ? "week" : "matrix",
                }))
              }
              onToggleTask={(projectId, taskId, day) => {
                if (day) {
                  updateTask(projectId, taskId, (task) => {
                    if (task.days.length > 0) {
                      const dayDateStr = getDayDateStr(day, planner.weekOffset);
                      const completedDates = task.completedDates ?? [];
                      const nextCompletedDates = completedDates.includes(dayDateStr)
                        ? completedDates.filter((d) => d !== dayDateStr)
                        : [...completedDates, dayDateStr];
                      
                      let completed = task.completed;
                      if (task.deadline) {
                        const startDate = getTaskStartDate({ ...task, completedDates: nextCompletedDates });
                        const scheduled = getScheduledDates(startDate, task.deadline, task.days);
                        completed = scheduled.length > 0 && scheduled.every((d) => nextCompletedDates.includes(d));
                      } else {
                        const weekDates = getWeekDates(planner.weekOffset).map((d) => toIsoDate(d.date));
                        const scheduledInWeek = weekDates.filter((_, index) => task.days.includes(dayKeys[index]));
                        completed = scheduledInWeek.length > 0 && scheduledInWeek.every((d) => nextCompletedDates.includes(d));
                      }
                      
                      return {
                        ...task,
                        completedDates: nextCompletedDates,
                        completed,
                      };
                    }
                    return task;
                  });
                } else {
                  handleToggleMainTask(projectId, taskId);
                }
              }}
              onPlannerChange={(updater) => setPlanner(updater)}
            />
          )}
        </main>
      )}

      {view === "days" && (
        <DayCounterPage
          counters={planner.dayCounters}
          onChange={(updater) =>
            setPlanner((current) => ({
              ...current,
              dayCounters: updater(current.dayCounters),
            }))
          }
        />
      )}

      {view === "stats" && (
        <StatsView
          planner={planner}
          onBack={() => setView("plan")}
        />
      )}

      {view === "archive" && (
        <ArchiveView
          archives={planner.archives}
          onBack={() => setView("plan")}
          onDelete={(archiveId) =>
            setPlanner((current) => ({
              ...current,
              archives: current.archives.filter(
                (archive) => archive.id !== archiveId,
              ),
            }))
          }
        />
      )}

      {editingTask && editorProject && editorTask && (
        <TaskEditor
          key={editorTask.id}
          project={editorProject}
          task={editorTask}
          planner={planner}
          onClose={() => setEditingTask(null)}
          onSave={(task) => {
            const nextCompletedDates = (task.completedDates ?? []).filter((d) => {
              const dateObj = new Date(`${d}T12:00:00`);
              if (Number.isNaN(dateObj.getTime())) return false;
              const jsDay = dateObj.getDay();
              const dayKey = jsDay === 0 ? "sun" : dayKeys[jsDay - 1];
              return task.days.includes(dayKey);
            });
            
            let completed = task.completed;
            if (task.days.length > 0) {
              let allScheduledDone = false;
              if (task.deadline) {
                const startDate = getTaskStartDate({ ...task, completedDates: nextCompletedDates });
                const scheduled = getScheduledDates(startDate, task.deadline, task.days);
                allScheduledDone = scheduled.length > 0 && scheduled.every((d) => nextCompletedDates.includes(d));
              } else {
                const weekDates = getWeekDates(planner.weekOffset).map((d) => toIsoDate(d.date));
                const scheduledInWeek = weekDates.filter((_, index) => task.days.includes(dayKeys[index]));
                allScheduledDone = scheduledInWeek.length > 0 && scheduledInWeek.every((d) => nextCompletedDates.includes(d));
              }
              if (allScheduledDone) {
                completed = true;
              }
            }
            
            updateTask(editorProject.id, task.id, () => ({
              ...task,
              completedDates: nextCompletedDates,
              completed,
            }));
            setEditingTask(null);
          }}
        />
      )}

      {taskCompletionModal && (() => {
        const project = planner.projects.find((p) => p.id === taskCompletionModal.projectId);
        const task = project?.tasks.find((t) => t.id === taskCompletionModal.taskId);
        const hasDeadline = !!task?.deadline;
        const statusText = hasDeadline
          ? (taskCompletionModal.isEarly ? "đã hoàn thành TRƯỚC HẠN" : "đã hoàn thành ĐÚNG HẠN / SAU HẠN")
          : "đã hoàn thành";

        return (
          <Modal onClose={() => setTaskCompletionModal(null)}>
            <div className="task-completion-modal" style={{ padding: "24px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "var(--ink)" }}>
                Xác nhận hoàn thành công việc
              </h3>
              <p style={{ fontSize: "14px", color: "var(--ink-soft)", margin: "0 0 20px 0", lineHeight: "1.5" }}>
                Công việc <strong>“{taskCompletionModal.taskTitle}”</strong> {statusText}. Vui lòng chọn cách cập nhật lịch trình dưới đây:
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                {/* Lựa chọn 1 */}
                <button
                  className="option-button"
                  onClick={() => {
                    updateTask(taskCompletionModal.projectId, taskCompletionModal.taskId, (task) => ({
                      ...task,
                      completed: true,
                    }));
                    setTaskCompletionModal(null);
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--ink)" }}>
                    1. Cập nhật công việc và khóa toàn bộ lịch ngày
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "4px" }}>
                    Giữ nguyên các ngày đã tích/chưa tích và khóa không cho chỉnh sửa các ngày con nữa.
                  </div>
                </button>

                {/* Lựa chọn 2 */}
                {taskCompletionModal.isEarly && (
                  <button
                    className="option-button"
                    onClick={() => {
                      const todayStr = toIsoDate(new Date());
                      updateTask(taskCompletionModal.projectId, taskCompletionModal.taskId, (task) => ({
                        ...task,
                        completed: true,
                        deadline: todayStr,
                      }));
                      setTaskCompletionModal(null);
                    }}
                  >
                    <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--ink)" }}>
                      2. Cập nhật công việc và cập nhật lại thời gian hoàn thành
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "4px" }}>
                      Đổi hạn chót về hôm nay để công việc không hiển thị vào những ngày sau nữa.
                    </div>
                  </button>
                )}

                {/* Lựa chọn 3 */}
                <button
                  className="option-button"
                  onClick={() => {
                    updateTask(taskCompletionModal.projectId, taskCompletionModal.taskId, (task) => {
                      const startDate = getTaskStartDate(task);
                      let nextCompletedDates = task.completedDates ?? [];
                      if (task.deadline) {
                        const allScheduled = getScheduledDates(startDate, task.deadline, task.days);
                        nextCompletedDates = Array.from(new Set([...nextCompletedDates, ...allScheduled]));
                      } else {
                        const weekDates = getWeekDates(planner.weekOffset).map((d) => toIsoDate(d.date));
                        const scheduledInWeek = weekDates.filter((_, index) => task.days.includes(dayKeys[index]));
                        nextCompletedDates = Array.from(new Set([...nextCompletedDates, ...scheduledInWeek]));
                      }
                      return {
                        ...task,
                        completed: true,
                        completedDates: nextCompletedDates,
                      };
                    });
                    setTaskCompletionModal(null);
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--ink)" }}>
                    {taskCompletionModal.isEarly ? "3." : "2."} Cập nhật công việc và đánh dấu hoàn thành toàn bộ cho các lịch
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "4px" }}>
                    Đánh dấu hoàn thành cho toàn bộ các ngày đã lên lịch cho công việc này.
                  </div>
                </button>

                {/* Lựa chọn 4 */}
                {taskCompletionModal.isEarly && (
                  <button
                    className="option-button"
                    onClick={() => {
                      const todayStr = toIsoDate(new Date());
                      updateTask(taskCompletionModal.projectId, taskCompletionModal.taskId, (task) => {
                        const startDate = getTaskStartDate(task);
                        let nextCompletedDates = task.completedDates ?? [];
                        if (task.deadline) {
                          const limitDate = todayStr < task.deadline ? todayStr : task.deadline;
                          const scheduledUpToToday = getScheduledDates(startDate, limitDate, task.days);
                          nextCompletedDates = Array.from(new Set([...nextCompletedDates, ...scheduledUpToToday]));
                        }
                        return {
                          ...task,
                          completed: true,
                          deadline: todayStr,
                          completedDates: nextCompletedDates,
                        };
                      });
                      setTaskCompletionModal(null);
                    }}
                  >
                    <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--ink)" }}>
                      4. Cập nhật công việc và đánh dấu toàn bộ cho các lịch kèm theo cập nhật lại ngày hoàn thành
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginTop: "4px" }}>
                      Đánh dấu hoàn thành lịch trình đến hôm nay, đồng thời đổi hạn chót về hôm nay.
                    </div>
                  </button>
                )}
              </div>

              <div className="modal-actions" style={{ justifyContent: "flex-end", padding: "0" }}>
                <button className="secondary-button" onClick={() => setTaskCompletionModal(null)}>
                  Hủy bỏ
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {deadlineExtensionModal && (
        <DeadlineExtensionModal
          taskTitle={deadlineExtensionModal.taskTitle}
          currentDeadline={deadlineExtensionModal.currentDeadline}
          onClose={() => setDeadlineExtensionModal(null)}
          onSave={(newDeadline) => {
            updateTask(
              deadlineExtensionModal.projectId,
              deadlineExtensionModal.taskId,
              (current) => ({
                ...current,
                completed: false,
                deadline: newDeadline,
              })
            );
            setDeadlineExtensionModal(null);
          }}
        />
      )}

      {showEndWeek && (
        <EndWeekModal
          label={formatWeekRange(planner.weekOffset)}
          onClose={() => setShowEndWeek(false)}
          onEnd={endWeek}
        />
      )}

      {showSettings && (
        <SettingsModal
          themeId={planner.themeId}
          texture={planner.texture}
          viewMode={planner.viewMode}
          defaultPage={planner.defaultPage}
          onThemeChange={(themeId) =>
            setPlanner((current) => ({ ...current, themeId }))
          }
          onTextureChange={(texture) =>
            setPlanner((current) => ({ ...current, texture }))
          }
          onViewModeChange={(viewMode) =>
            setPlanner((current) => ({ ...current, viewMode }))
          }
          onDefaultPageChange={(defaultPage) =>
            setPlanner((current) => ({ ...current, defaultPage }))
          }
          onClose={() => setShowSettings(false)}
          onImportData={(imported) =>
            setPlanner((current) => mergePlannerStates(current, imported))
          }
          planner={planner}
          user={user}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      {sharedProjectToImport && (
        <Modal onClose={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("shareProj");
          window.history.replaceState({}, "", url.toString());
          setSharedProjectToImport(null);
        }}>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="modal-kicker">Nhập dự án chia sẻ</div>
            <h3 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "20px", margin: "0" }}>
              Bạn có muốn thêm dự án "{sharedProjectToImport.title}" vào planner của mình không?
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-soft)", margin: "0" }}>
              Dự án này chứa <b>{sharedProjectToImport.tasks?.length || 0} công việc</b>. Tiến độ các công việc trong dự án sẽ được thiết lập về trạng thái mới (chưa hoàn thành).
            </p>
            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button
                className="secondary-button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("shareProj");
                  window.history.replaceState({}, "", url.toString());
                  setSharedProjectToImport(null);
                }}
              >
                Hủy bỏ
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  const newProjId = createId();
                  const newProj = {
                    ...sharedProjectToImport,
                    id: newProjId,
                    tasks: (sharedProjectToImport.tasks || []).map((t: any) => ({
                      ...t,
                      id: createId(),
                      completed: false,
                      completedDays: [],
                      completedDates: [],
                      subtasks: (t.subtasks || []).map((st: any) => ({
                        ...st,
                        completed: false
                      }))
                    }))
                  };
                  setPlanner((current) => ({
                    ...current,
                    projects: [...current.projects, newProj]
                  }));
                  setToast(`Đã thêm dự án "${sharedProjectToImport.title}" thành công!`);
                  
                  const url = new URL(window.location.href);
                  url.searchParams.delete("shareProj");
                  window.history.replaceState({}, "", url.toString());
                  setSharedProjectToImport(null);
                }}
              >
                Đồng ý thêm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {iconPickerProjectId && (
        <IconPickerModal
          currentIcon={
            planner.projects.find(
              (project) => project.id === iconPickerProjectId,
            )?.icon || "✨"
          }
          onSelect={(icon) => {
            updateProject(iconPickerProjectId, (project) => ({
              ...project,
              icon,
            }));
            setIconPickerProjectId(null);
          }}
          onUpload={(icon) => {
            updateProject(iconPickerProjectId, (project) => ({
              ...project,
              icon,
            }));
            setIconPickerProjectId(null);
          }}
          onClose={() => setIconPickerProjectId(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

interface HeaderProps {
  planner: PlannerState;
  view: View;
  totals: { completed: number; total: number };
  completion: number;
  onView: (view: View) => void;
  onWeekChange: (amount: number) => void;
  onCurrentWeek: () => void;
  onEndWeek: () => void;
  onSettings: () => void;
  onPlaceholder: (message: string) => void;
  user: any;
  onSignOut: () => void;
}

function Header({
  planner,
  view,
  totals,
  completion,
  onView,
  onWeekChange,
  onCurrentWeek,
  onEndWeek,
  onSettings,
  onPlaceholder,
  user,
  onSignOut,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/pnm03/MIW_planner_note")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.stargazers_count === "number") {
          setStarCount(data.stargazers_count);
        }
      })
      .catch((err) => console.error("Error fetching GitHub stars:", err));
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowUserMenu(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setShowUserMenu(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const weekCaption =
    planner.weekOffset === 0
      ? "Tuần này"
      : planner.weekOffset === 1
        ? "Tuần sau"
        : planner.weekOffset === -1
          ? "Tuần trước"
          : planner.weekOffset > 0
            ? `Sau ${planner.weekOffset} tuần`
            : `${Math.abs(planner.weekOffset)} tuần trước`;

  return (
    <header className="site-header">
      <div className="header-main">
        <button className="brand" onClick={() => onView("plan")}>
          miw planner<span>.</span>
        </button>

        {view === "plan" ? (
          <div className="week-navigation-wrap">
            <div className="planning-for">
              <CalendarDays size={14} />
              Kế hoạch
            </div>
            <div className="week-navigation" aria-label="Chọn tuần kế hoạch">
              <button
                aria-label="Tuần trước"
                onClick={() => onWeekChange(-1)}
              >
                <ChevronLeft size={17} />
              </button>
              <div>
                <strong>{formatWeekRange(planner.weekOffset)}</strong>
                <span>{weekCaption}</span>
              </div>
              <button aria-label="Tuần sau" onClick={() => onWeekChange(1)}>
                <ChevronRight size={17} />
              </button>
            </div>
            {planner.weekOffset !== 0 && (
              <button
                className="return-current-week"
                onClick={onCurrentWeek}
                aria-label="Quay về tuần hiện tại"
                title="Quay về tuần hiện tại"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="page-name">
            {view === "days"
              ? "Đếm ngày"
              : view === "stats"
                ? "Thống kê"
                : "Lưu trữ"}
          </div>
        )}

        <nav className="header-actions">
          {user ? (
            <div
              className="user-menu-container"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <span className="user-menu-trigger">
                {user.email ? user.email.split("@")[0] : ""}
              </span>
              {showUserMenu && (
                <div className="user-menu-dropdown" style={{ display: "block" }}>
                  <button onClick={onSignOut} className="user-menu-item">
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => onView("auth")}>Đăng nhập</button>
          )}
          <button className="settings-button" onClick={onSettings}>
            <Settings2 size={14} />
            Cài đặt
          </button>
          {view !== "plan" && (
            <button onClick={() => onView("plan")}>
              <BookHeart size={13} />
              Ghi chú
            </button>
          )}
          {view !== "days" && (
            <button onClick={() => onView("days")}>
              <CalendarRange size={13} />
              Đếm ngày
            </button>
          )}
          {view === "plan" && (
            <>
              <button onClick={() => onView("stats")}>Thống kê</button>
              <a
                href="https://github.com/pnm03/MIW_planner_note"
                target="_blank"
                rel="noopener noreferrer"
                title="Star dự án trên GitHub"
                className="header-star-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  minHeight: "30px",
                  padding: "5px 11px",
                  border: "1px solid var(--line-strong)",
                  borderRadius: "8px",
                  color: "var(--ink-soft)",
                  background: "var(--paper)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "10px",
                  fontWeight: 400,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "160ms ease",
                }}
              >
                <Star size={12} fill="#eab308" style={{ color: "#eab308" }} />
                Star {starCount !== null ? `(${starCount})` : ""}
              </a>
              {!user && (
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(planner, null, 2));
                    const downloadAnchor = document.createElement("a");
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `miw-planner-backup-${new Date().toISOString().split("T")[0]}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    onPlaceholder("Đã tải tệp sao lưu (.json) về máy!");
                  }}
                >
                  Lưu trữ
                </button>
              )}
            </>
          )}
        </nav>
      </div>
      {view === "plan" && (
        <div className="progress-line">
          <div className="progress-track">
            <i style={{ width: `${completion}%` }} />
          </div>
          <span
            className="progress-fill-label"
            style={{
              left: `${completion}%`,
            }}
          >
            {completion % 1 === 0 ? completion : completion.toFixed(1)}%
          </span>
          <span className="progress-totals">
            {totals.completed}/{totals.total} · {completion % 1 === 0 ? completion : completion.toFixed(1)}%
          </span>
        </div>
      )}
    </header>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="section-label">{children}</h2>;
}

function ProjectIconMark({ icon }: { icon?: string }) {
  if (isImageIcon(icon)) {
    return <img src={icon} alt="" />;
  }

  return <span>{icon || "✦"}</span>;
}

function PriorityControls({
  important,
  urgent,
  onImportantChange,
  onUrgentChange,
}: {
  important: boolean;
  urgent: boolean;
  onImportantChange: (important: boolean) => void;
  onUrgentChange: (urgent: boolean) => void;
}) {
  return (
    <div className="priority-controls">
      <button
        className={important ? "active" : ""}
        onClick={() => onImportantChange(!important)}
        type="button"
      >
        Quan trọng
      </button>
      <button
        className={urgent ? "active" : ""}
        onClick={() => onUrgentChange(!urgent)}
        type="button"
      >
        Gấp
      </button>
    </div>
  );
}

function TitleStyleControls({
  bold,
  italic,
  color,
  onBoldChange,
  onItalicChange,
  onColorChange,
}: {
  bold: boolean;
  italic: boolean;
  color: string;
  onBoldChange: (bold: boolean) => void;
  onItalicChange: (italic: boolean) => void;
  onColorChange: (color: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);

  return (
    <div className="title-style-controls">
      <button
        className={`format-button ${bold ? "active" : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onBoldChange(!bold)}
        aria-label={bold ? "Bỏ in đậm" : "In đậm"}
        title={bold ? "Bỏ in đậm" : "In đậm"}
      >
        <Bold size={13} />
      </button>
      <button
        className={`format-button ${italic ? "active" : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onItalicChange(!italic)}
        aria-label={italic ? "Bỏ in nghiêng" : "In nghiêng"}
        title={italic ? "Bỏ in nghiêng" : "In nghiêng"}
      >
        <Italic size={13} />
      </button>
      <button
        className={`format-button color-button ${color ? "active" : ""}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setShowColors((current) => !current)}
        aria-label="Chọn màu chữ"
        title="Chọn màu chữ"
      >
        <Palette size={13} />
        <i style={{ background: color || "var(--ink)" }} />
      </button>
      {showColors && (
        <div className="title-color-popover">
          {titleColors.map((swatch) => (
            <button
              key={swatch || "default"}
              className={!swatch ? "default-swatch" : ""}
              style={{ background: swatch || "var(--paper)" }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onColorChange(swatch);
                setShowColors(false);
              }}
              aria-label={swatch ? `Chọn màu ${swatch}` : "Màu mặc định"}
              title={swatch ? swatch : "Màu mặc định"}
            >
              {!swatch && <X size={10} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TitleEditField({
  className,
  value,
  placeholder,
  autoFocus,
  bold,
  italic,
  color,
  normalWeight,
  boldWeight,
  onChange,
  onBlur,
  onBoldChange,
  onItalicChange,
  onColorChange,
}: {
  className: string;
  value: string;
  placeholder: string;
  autoFocus?: boolean;
  bold: boolean;
  italic: boolean;
  color: string;
  normalWeight: number;
  boldWeight: number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onBoldChange: (bold: boolean) => void;
  onItalicChange: (italic: boolean) => void;
  onColorChange: (color: string) => void;
}) {
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);

  const syncToolbar = (input: HTMLTextAreaElement) => {
    const selected =
      input.selectionStart !== null &&
      input.selectionEnd !== null &&
      input.selectionEnd > input.selectionStart;
    setToolbarOpen(selected || Boolean(input.value.trim()));
  };

  return (
    <div className={`title-edit-wrap ${toolbarOpen ? "toolbar-open" : ""}`}>
      <textarea
        ref={textareaRef}
        className={className}
        value={value}
        style={{
          fontWeight: bold ? boldWeight : normalWeight,
          fontStyle: italic ? "italic" : "normal",
          color: color || undefined,
          resize: "none",
          overflow: "hidden",
          fontFamily: "inherit",
        }}
        rows={1}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setToolbarOpen(Boolean(event.target.value.trim()));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        onFocus={(event) => {
          if (event.currentTarget.value.trim()) setToolbarOpen(true);
        }}
        onMouseUp={(event) => syncToolbar(event.currentTarget)}
        onKeyUp={(event) => syncToolbar(event.currentTarget)}
        onSelect={(event) => syncToolbar(event.currentTarget)}
        onBlur={() => {
          window.setTimeout(() => setToolbarOpen(false), 120);
          onBlur?.();
        }}
      />
      {toolbarOpen && (
        <TitleStyleControls
          bold={bold}
          italic={italic}
          color={color}
          onBoldChange={onBoldChange}
          onItalicChange={onItalicChange}
          onColorChange={onColorChange}
        />
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  weekOffset: number;
  onUpdate: (updater: (project: Project) => Project) => void;
  onUpdateTask: (taskId: string, updater: (task: Task) => Task) => void;
  onToggleMainTask: (taskId: string) => void;
  onAddTask: () => void;
  onDelete: () => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  onOpenIconPicker: () => void;
  onProjectDragStart: () => void;
  onProjectDrop: () => void;
  onTaskDragStart: (taskId: string) => void;
  onTaskDrop: (taskId: string) => void;
  onTaskDropAtEnd: () => void;
}

function ProjectCard({
  project,
  weekOffset,
  onUpdate,
  onUpdateTask,
  onToggleMainTask,
  onAddTask,
  onDelete,
  onDeleteTask,
  onEditTask,
  onOpenIconPicker,
  onProjectDragStart,
  onProjectDrop,
  onTaskDragStart,
  onTaskDrop,
  onTaskDropAtEnd,
}: ProjectCardProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    () => new Set(),
  );
  const [showProjectSchedule, setShowProjectSchedule] = useState(false);
  const projectDragStarted = useRef(false);
  const projectTotals = countProjectTasks(project);
  const projectCompletion = projectTotals.total
    ? Math.round((projectTotals.completed / projectTotals.total) * 100)
    : 0;
  const projectRemaining = getRemainingDateLabel(project.deadline);

  const toggleTaskDetails = (taskId: string) => {
    setExpandedTasks((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <article
      className="project-card"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onProjectDrop();
        onTaskDropAtEnd();
      }}
    >
      <div className="project-header">
        <button
          className="project-icon-drag"
          draggable
          onDragStart={() => {
            projectDragStarted.current = true;
            onProjectDragStart();
          }}
          onDragEnd={() =>
            window.setTimeout(() => {
              projectDragStarted.current = false;
            }, 0)
          }
          onClick={() => {
            if (!projectDragStarted.current) onOpenIconPicker();
          }}
          title="Bấm để chọn icon, giữ và kéo để di chuyển dự án"
        >
          <ProjectIconMark icon={project.icon} />
        </button>
        <TitleEditField
          className="project-title-input"
          value={project.title}
          autoFocus={!project.title}
          placeholder="Tên dự án…"
          bold={project.titleBold ?? false}
          italic={project.titleItalic ?? false}
          color={project.titleColor ?? ""}
          normalWeight={500}
          boldWeight={800}
          onChange={(title) =>
            onUpdate((current) => ({
              ...current,
              title,
            }))
          }
          onBlur={() => {
            if (!project.title.trim()) {
              onUpdate((current) => ({
                ...current,
                title: "Dự án chưa đặt tên",
              }));
            }
          }}
          onBoldChange={(titleBold) =>
            onUpdate((current) => ({ ...current, titleBold }))
          }
          onItalicChange={(titleItalic) =>
            onUpdate((current) => ({ ...current, titleItalic }))
          }
          onColorChange={(titleColor) =>
            onUpdate((current) => ({ ...current, titleColor }))
          }
        />
        <div className="project-schedule-wrap">
          <button
            className="project-deadline"
            onClick={() => setShowProjectSchedule((current) => !current)}
            title="Ngày và giờ của dự án"
          >
            <CalendarClock size={15} />
            {project.deadline && (
              <span className="project-deadline-copy">
                <b>{formatDateTimeLabel(project.deadline)}</b>
                <small>
                  {project.deadlineTime ? (
                    <>
                      <span style={{ color: "var(--ink-faint)" }}>{project.deadlineTime}</span>
                      {projectRemaining && (
                        <>
                          <span style={{ color: "var(--ink-faint)", opacity: 0.6 }}> · </span>
                          <span>{projectRemaining}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span>{projectRemaining}</span>
                  )}
                </small>
              </span>
            )}
          </button>
          {showProjectSchedule && (
            <div className="project-schedule-popover">
              <strong>Ngày và giờ dự án</strong>
              <div className="field-label compact-field">
                Mức ưu tiên dự án
                <PriorityControls
                  important={project.important ?? false}
                  urgent={project.urgent ?? false}
                  onImportantChange={(important) =>
                    onUpdate((current) => ({ ...current, important }))
                  }
                  onUrgentChange={(urgent) =>
                    onUpdate((current) => ({ ...current, urgent }))
                  }
                />
              </div>
              <label>
                Ngày
                <input
                  type="date"
                  value={project.deadline}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      deadline: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Giờ
                <input
                  type="time"
                  value={project.deadlineTime ?? ""}
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      deadlineTime: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                className="popover-done"
                onClick={() => setShowProjectSchedule(false)}
              >
                Xong
              </button>
            </div>
          )}
        </div>
        <div className="project-progress">
          <span className="project-progress-ratio">
            {projectTotals.completed}/{projectTotals.total}
          </span>
          <span className="mini-progress">
            <i style={{ width: `${projectCompletion}%` }} />
          </span>
        </div>
        <button
          className="icon-button share-button"
          onClick={() => {
            try {
              const projectCopy = {
                title: project.title,
                titleColor: project.titleColor,
                titleBold: project.titleBold,
                titleItalic: project.titleItalic,
                important: project.important,
                urgent: project.urgent,
                icon: project.icon,
                deadline: project.deadline,
                deadlineTime: project.deadlineTime,
                tasks: project.tasks.map(t => ({
                  title: t.title,
                  titleBold: t.titleBold,
                  titleItalic: t.titleItalic,
                  titleColor: t.titleColor,
                  important: t.important,
                  urgent: t.urgent,
                  completed: false,
                  days: t.days,
                  deadline: t.deadline,
                  deadlineTime: t.deadlineTime,
                  description: t.description,
                  subtasks: t.subtasks.map(st => ({ title: st.title, completed: false }))
                }))
              };
              const jsonStr = JSON.stringify(projectCopy);
              const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
              const shareUrl = `${window.location.origin}${window.location.pathname}?shareProj=${base64}`;
              
              navigator.clipboard.writeText(shareUrl).then(() => {
                alert("Đã sao chép liên kết chia sẻ dự án vào bộ nhớ tạm!");
              }).catch(() => {
                const el = document.createElement("textarea");
                el.value = shareUrl;
                document.body.appendChild(el);
                el.select();
                document.execCommand("copy");
                document.body.removeChild(el);
                alert("Đã sao chép liên kết chia sẻ dự án vào bộ nhớ tạm!");
              });
            } catch (err) {
              console.error("Lỗi tạo link share:", err);
            }
          }}
          title="Chia sẻ dự án"
          aria-label="Chia sẻ dự án"
          style={{ marginRight: "4px" }}
        >
          <Share2 size={13} />
        </button>
        <button className="icon-button delete-button" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="task-list">
        {project.tasks.map((task) => {
          const subtaskDone = task.subtasks.filter(
            (subtask) => subtask.completed || task.completed,
          ).length;
          const subtaskProgress = task.subtasks.length
            ? Math.round((subtaskDone / task.subtasks.length) * 100)
            : 0;
          const scheduleProgress = getTaskScheduleProgress(task, weekOffset);
          let totalDays = task.days.length;
          let reachedDays = 0;
          if (task.days.length > 0) {
            if (task.deadline) {
              const scheduled = getScheduledDates(getTaskStartDate(task), task.deadline, task.days);
              totalDays = scheduled.length;
              reachedDays = (task.completedDates ?? []).filter((d) => scheduled.includes(d)).length;
            } else {
              const weekDates = getWeekDates(weekOffset).map((d) => toIsoDate(d.date));
              const scheduledInWeek = weekDates.filter((_, index) => task.days.includes(dayKeys[index]));
              totalDays = task.days.length;
              reachedDays = (task.completedDates ?? []).filter((d) => scheduledInWeek.includes(d)).length;
            }
          }
          const isExpanded = expandedTasks.has(task.id);
          const assignmentLabel = task.days.length
            ? `Lịch: ${reachedDays}/${totalDays} ngày, tiến độ ${scheduleProgress}%${
                task.deadlineTime ? ` · ${task.deadlineTime}` : ""
              }`
            : task.deadlineTime
              ? `Giờ nhắc ${task.deadlineTime}`
              : "Gán ngày / giờ";

          return (
            <div
              className="project-task-group"
              key={task.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onTaskDrop(task.id);
              }}
            >
              <div
                className={`project-task ${
                  task.completed ? "is-complete" : ""
                }`}
              >
                <span
                  className="drag-handle task-drag"
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    onTaskDragStart(task.id);
                  }}
                  title="Kéo để đổi vị trí hoặc chuyển công việc"
                >
                  <GripVertical size={13} />
                </span>
                <button
                  className={`check-button ${task.completed ? "checked" : ""}`}
                  aria-label={
                    task.completed
                      ? "Đánh dấu chưa hoàn thành"
                      : "Đánh dấu hoàn thành"
                  }
                  onClick={() => onToggleMainTask(task.id)}
                >
                  {task.completed && <Check size={14} />}
                </button>
                <TitleEditField
                  className="task-title-input"
                  value={task.title}
                  autoFocus={!task.title}
                  placeholder="Công việc…"
                  bold={task.titleBold ?? false}
                  italic={task.titleItalic ?? false}
                  color={task.titleColor ?? ""}
                  normalWeight={400}
                  boldWeight={700}
                  onChange={(title) =>
                    onUpdateTask(task.id, (current) => ({
                      ...current,
                      title,
                    }))
                  }
                  onBlur={() => {
                    if (!task.title.trim()) {
                      onUpdateTask(task.id, (current) => ({
                        ...current,
                        title: "Công việc chưa đặt tên",
                      }));
                    }
                  }}
                  onBoldChange={(titleBold) =>
                    onUpdateTask(task.id, (current) => ({
                      ...current,
                      titleBold,
                    }))
                  }
                  onItalicChange={(titleItalic) =>
                    onUpdateTask(task.id, (current) => ({
                      ...current,
                      titleItalic,
                    }))
                  }
                  onColorChange={(titleColor) =>
                    onUpdateTask(task.id, (current) => ({
                      ...current,
                      titleColor,
                    }))
                  }
                />
                {task.deadline && (
                  <button
                    className="project-deadline"
                    onClick={() => onEditTask(task.id)}
                    title="Hạn chót và giờ nhắc của công việc"
                  >
                    <CalendarClock size={15} />
                    <span className="project-deadline-copy">
                      <b>{formatDateTimeLabel(task.deadline)}</b>
                      {task.deadlineTime && (
                        <small style={{ color: "var(--ink-faint)", fontSize: "8px" }}>{task.deadlineTime}</small>
                      )}
                      {getRemainingDateLabel(task.deadline) && (
                        <small>{getRemainingDateLabel(task.deadline)}</small>
                      )}
                    </span>
                  </button>
                )}
                {(task.days.length > 0 || task.subtasks.length > 0) && (
                  <div
                    className="task-progress-stack"
                    title={[
                      task.days.length
                        ? assignmentLabel
                        : "Chưa gán ngày trong tuần",
                      task.subtasks.length
                        ? `Việc nhỏ: ${subtaskDone}/${task.subtasks.length} · ${subtaskProgress}%`
                        : "Chưa có việc nhỏ",
                    ].join("\n")}
                  >
                    {task.days.length > 0 ? (
                      <div className="task-progress-column">
                        <span className="task-progress-ratio">
                          {reachedDays}/{totalDays}
                        </span>
                        <button
                          className="stack-progress-line schedule-progress"
                          onClick={() => onEditTask(task.id)}
                          aria-label={assignmentLabel}
                          title={assignmentLabel}
                        >
                          <i style={{ width: `${scheduleProgress}%` }} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="day-assignment is-empty"
                        onClick={() => onEditTask(task.id)}
                        aria-label={assignmentLabel}
                        title={assignmentLabel}
                      />
                    )}
                    {task.subtasks.length > 0 && (
                      <div className="task-progress-column">
                        <span className="task-progress-ratio">
                          {subtaskDone}/{task.subtasks.length}
                        </span>
                        <span
                          className="stack-progress-line subtask-progress"
                          title={`Việc nhỏ: ${subtaskDone}/${task.subtasks.length}`}
                        >
                          <i style={{ width: `${subtaskProgress}%` }} />
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {!task.deadline && task.days.length === 0 && task.subtasks.length === 0 && (
                  <button
                    className={
                      task.deadlineTime
                        ? "day-assignment has-time"
                        : "day-assignment is-empty"
                    }
                    onClick={() => onEditTask(task.id)}
                    aria-label={assignmentLabel}
                    title={assignmentLabel}
                  >
                    {task.deadlineTime && (
                      <span className="assignment-time">
                        <Clock3 size={11} />
                        {task.deadlineTime}
                      </span>
                    )}
                  </button>
                )}
                {task.subtasks.length > 0 && (
                  <button
                    className="icon-button subtask-toggle"
                    title={isExpanded ? "Ẩn việc nhỏ" : "Hiện việc nhỏ"}
                    onClick={() => toggleTaskDetails(task.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp size={15} />
                    ) : (
                      <ChevronDown size={15} />
                    )}
                  </button>
                )}
                <button
                  className="icon-button"
                  title="Chi tiết công việc"
                  onClick={() => onEditTask(task.id)}
                >
                  <ListChecks size={15} />
                </button>
                <button
                  className="icon-button delete-button"
                  onClick={() => onDeleteTask(task.id)}
                >
                  <X size={15} />
                </button>
              </div>
              {task.subtasks.length > 0 && isExpanded && (
                <div className="subtask-preview">
                  <div className="subtask-preview-heading">
                    <span>Việc nhỏ</span>
                    <b>{subtaskProgress}%</b>
                  </div>
                  {task.subtasks.map((subtask) => {
                    const isSubtaskCompleted = subtask.completed || task.completed;
                    return (
                      <div
                        className={`subtask-preview-row ${
                          isSubtaskCompleted ? "is-complete" : ""
                        }`}
                        key={subtask.id}
                      >
                        <button
                          className={`check-button ${
                            isSubtaskCompleted ? "checked" : ""
                          }`}
                          disabled={task.completed}
                          onClick={() =>
                            onUpdateTask(task.id, (current) => ({
                              ...current,
                              subtasks: current.subtasks.map((item) =>
                                item.id === subtask.id
                                  ? { ...item, completed: !item.completed }
                                  : item,
                              ),
                            }))
                          }
                          aria-label={
                            isSubtaskCompleted
                              ? "Đánh dấu việc nhỏ chưa hoàn thành"
                              : "Đánh dấu việc nhỏ hoàn thành"
                          }
                        >
                          {isSubtaskCompleted && <Check size={12} />}
                        </button>
                        <span>{subtask.title || "Việc nhỏ chưa đặt tên"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <button className="add-task" onClick={onAddTask}>
          <Plus size={14} />
          thêm việc
        </button>
      </div>
    </article>
  );
}

interface WeekPaneProps {
  planner: PlannerState;
  onAddProject: () => void;
  onOpenTask: (projectId: string, taskId: string) => void;
  onToggleTask: (projectId: string, taskId: string, day?: DayKey) => void;
  onPlannerChange: React.Dispatch<React.SetStateAction<PlannerState>>;
  onToggleViewMode: () => void;
}

function WeekPane({
  planner,
  onAddProject,
  onOpenTask,
  onToggleTask,
  onPlannerChange,
  onToggleViewMode,
}: WeekPaneProps) {
  const allTasks = planner.projects.flatMap((project) => project.tasks);
  const hasProjects = planner.projects.length > 0;
  const hasTasks = allTasks.length > 0;
  const hasScheduled = allTasks.some((task) => task.days.length > 0);
  const todayKey = getTodayKey();
  const currentWeek = planner.weekOffset === 0;

  const getTasksForDay = (day: DayKey): DayTask[] => {
    const dayDateStr = getDayDateStr(day, planner.weekOffset);
    return planner.projects.flatMap((project) =>
      project.tasks
        .filter((task) => {
          if (!task.days.includes(day)) return false;
          if (task.deadline && dayDateStr > task.deadline) return false;
          const startDate = getTaskStartDate(task);
          if (startDate && dayDateStr < startDate) return false;
          return true;
        })
        .map((task) => ({ project, task })),
    );
  };

  if (!hasScheduled) {
    return (
      <section className="week-pane">
        <div className="section-header-with-action">
          <SectionLabel>Tuần này</SectionLabel>
          <button
            className="view-mode-toggle-btn"
            onClick={onToggleViewMode}
            title="Chuyển sang Ma trận Eisenhower"
            aria-label="Chuyển sang Ma trận Eisenhower"
          >
            <RefreshCw size={12} />
          </button>
        </div>
        <Onboarding
          hasProjects={hasProjects}
          hasTasks={hasTasks}
          projectName={planner.projects[0]?.title}
          onAction={onAddProject}
        />
      </section>
    );
  }

  return (
    <section className="week-pane">
      <div className="section-header-with-action">
        <SectionLabel>Tuần này</SectionLabel>
        <button
          className="view-mode-toggle-btn"
          onClick={onToggleViewMode}
          title="Chuyển sang Ma trận Eisenhower"
          aria-label="Chuyển sang Ma trận Eisenhower"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {!planner.showAllDays ? (
        <>
          <div className="week-context">
            Đang xem <strong>{dayLabels[planner.focusDay]}</strong>
            {currentWeek && planner.focusDay === todayKey && " (hôm nay)"} ·{" "}
            <button
              onClick={() =>
                onPlannerChange((current) => ({
                  ...current,
                  showAllDays: true,
                }))
              }
            >
              hiện tất cả ngày
            </button>
          </div>
          <div className="day-tabs" role="tablist" aria-label="Chọn ngày">
            {dayKeys.map((day) => {
              const dayTasks = getTasksForDay(day);
              const dayIndex = dayKeys.indexOf(day);
              const todayIndex = dayKeys.indexOf(todayKey);
              const dayDateStr = getDayDateStr(day, planner.weekOffset);
              const missed = dayTasks.filter(({ task }) => {
                const isCompleted = task.days.length > 0
                  ? (task.completedDates ?? []).includes(dayDateStr)
                  : task.completed;
                if (isCompleted) return false;
                if (currentWeek && dayIndex < todayIndex) return true;

                if (currentWeek && day === todayKey) {
                  const dayTime = task.dayTimes?.[day] || (task.startTime && task.endTime ? { startTime: task.startTime, endTime: task.endTime } : null);
                  if (dayTime?.endTime) {
                    const [endH, endM] = dayTime.endTime.split(":").map(Number);
                    const now = new Date();
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    const endMinutes = endH * 60 + endM;
                    return currentMinutes > endMinutes;
                  }
                }
                return false;
              }).length;
              const allDone =
                dayTasks.length > 0 &&
                dayTasks.every(({ task }) => {
                  if (task.days.length > 0) {
                    return (task.completedDates ?? []).includes(dayDateStr);
                  }
                  return task.completed;
                });
              return (
                <button
                  key={day}
                  className={planner.focusDay === day ? "active" : ""}
                  role="tab"
                  aria-selected={planner.focusDay === day}
                  onClick={() =>
                    onPlannerChange((current) => ({
                      ...current,
                      focusDay: day,
                    }))
                  }
                >
                  <span>{dayLabels[day]}</span>
                  <small>
                    {missed > 0 && <b title={`${missed} việc trễ`}>!</b>}
                    {dayTasks.length > 0 && (
                      <i className={allDone ? "done-dot" : ""}>○</i>
                    )}
                  </small>
                </button>
              );
            })}
          </div>
          <DayColumn
            day={planner.focusDay}
            tasks={getTasksForDay(planner.focusDay)}
            currentWeek={currentWeek}
            todayKey={todayKey}
            weekOffset={planner.weekOffset}
            focused
            onOpenTask={onOpenTask}
            onToggleTask={onToggleTask}
          />
        </>
      ) : (
        <>
          <div className="week-context">
            <button
              onClick={() =>
                onPlannerChange((current) => ({
                  ...current,
                  showAllDays: false,
                  focusDay: currentWeek ? todayKey : current.focusDay,
                }))
              }
            >
              về hôm nay
            </button>{" "}
            · hoặc bấm một ngày để xem riêng
          </div>
          <div className="all-days">
            {dayKeys.map((day) => (
              <DayColumn
                key={day}
                day={day}
                tasks={getTasksForDay(day)}
                currentWeek={currentWeek}
                todayKey={todayKey}
                weekOffset={planner.weekOffset}
                onFocus={() =>
                  onPlannerChange((current) => ({
                    ...current,
                    showAllDays: false,
                    focusDay: day,
                  }))
                }
                onOpenTask={onOpenTask}
                onToggleTask={onToggleTask}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

type MatrixKey = "do" | "schedule" | "delegate" | "drop";

const matrixSections: Array<{
  key: MatrixKey;
  title: string;
  subtitle: string;
}> = [
  {
    key: "do",
    title: "Làm ngay",
    subtitle: "Quan trọng + gấp",
  },
  {
    key: "schedule",
    title: "Lên lịch",
    subtitle: "Quan trọng · chưa gấp",
  },
  {
    key: "delegate",
    title: "Đẩy / giao",
    subtitle: "Gấp · ít quan trọng hơn",
  },
  {
    key: "drop",
    title: "Để sau",
    subtitle: "Không gấp · không quan trọng",
  },
];

function EisenhowerMatrix({
  planner,
  onOpenTask,
  onToggleTask,
  onToggleViewMode,
}: {
  planner: PlannerState;
  onOpenTask: (projectId: string, taskId: string) => void;
  onToggleTask: (projectId: string, taskId: string, day?: DayKey) => void;
  onToggleViewMode: () => void;
}) {
  const tasks = planner.projects.flatMap((project) =>
    project.tasks.map((task) => ({ project, task })),
  );

  const grouped = matrixSections.reduce(
    (result, section) => ({
      ...result,
      [section.key]: tasks.filter(
        ({ project, task }) => getMatrixKey(project, task) === section.key,
      ),
    }),
    {} as Record<MatrixKey, DayTask[]>,
  );

  return (
    <section className="week-pane matrix-pane">
      <div className="section-header-with-action">
        <SectionLabel>Ma trận Eisenhower</SectionLabel>
        <button
          className="view-mode-toggle-btn"
          onClick={onToggleViewMode}
          title="Chuyển sang Xem theo tuần"
          aria-label="Chuyển sang Xem theo tuần"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      <div className="eisenhower-grid">
        {matrixSections.map((section) => (
          <div className={`matrix-cell matrix-${section.key}`} key={section.key}>
            <div className="matrix-cell-heading">
              <strong>{section.title}</strong>
              <span>{section.subtitle}</span>
              <b>{grouped[section.key].length}</b>
            </div>
            <div className="matrix-task-list">
              {grouped[section.key].length === 0 ? (
                <p>Trống</p>
              ) : (
                grouped[section.key].map(({ project, task }) => (
                  <article
                    className={`matrix-task ${task.completed ? "is-complete" : ""}`}
                    key={task.id}
                  >
                    <button
                      className={`check-button ${task.completed ? "checked" : ""}`}
                      onClick={() => onToggleTask(project.id, task.id)}
                      aria-label={
                        task.completed
                          ? "Đánh dấu chưa hoàn thành"
                          : "Đánh dấu hoàn thành"
                      }
                    >
                      {task.completed && <Check size={13} />}
                    </button>
                    <button
                      className="matrix-task-content"
                      onClick={() => onOpenTask(project.id, task.id)}
                    >
                      <span>
                        <ProjectIconMark icon={project.icon} />
                        {project.title || "Dự án chưa đặt tên"}
                      </span>
                      <strong>{task.title || "Công việc chưa đặt tên"}</strong>
                      <small>
                        {(task.important || project.important) && (
                          <b>quan trọng</b>
                        )}
                        {(task.urgent || project.urgent) && <b>gấp</b>}
                        {task.deadline && (
                          <b>
                            hạn{" "}
                            {formatDateTimeLabel(
                              task.deadline,
                              task.deadlineTime,
                            )}
                          </b>
                        )}
                      </small>
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DayCounterPage({
  counters,
  onChange,
}: {
  counters: DayCounter[];
  onChange: (updater: (counters: DayCounter[]) => DayCounter[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(counters[0]?.id ?? "");
  const [showSetup, setShowSetup] = useState(counters.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DayCounter>(() => createDayCounter());
  const [memoryDraft, setMemoryDraft] = useState({
    title: "",
    body: "",
    happenedAt: toIsoDate(new Date()),
    image: "",
  });

  useEffect(() => {
    if (counters.length === 0) {
      setShowSetup(true);
      setSelectedId("");
      return;
    }
    if (!counters.some((counter) => counter.id === selectedId)) {
      setSelectedId(counters[0].id);
    }
  }, [counters, selectedId]);

  const selectedCounter =
    counters.find((counter) => counter.id === selectedId) ?? counters[0];

  const startCreate = () => {
    setDraft(createDayCounter());
    setEditingId(null);
    setShowSetup(true);
  };

  const startEdit = () => {
    if (!selectedCounter) return;
    setDraft(clone(selectedCounter));
    setEditingId(selectedCounter.id);
    setShowSetup(true);
  };

  const saveCounter = () => {
    const title = draft.title.trim();
    if (!title || !draft.anchorDate) {
      window.alert("Nhập tên và ngày mốc trước nhé.");
      return;
    }

    const saved = {
      ...draft,
      title,
      subtitle: draft.subtitle.trim(),
    };
    onChange((current) =>
      editingId
        ? current.map((counter) => (counter.id === editingId ? saved : counter))
        : [...current, saved],
    );
    setSelectedId(saved.id);
    setShowSetup(false);
    setEditingId(null);
  };

  const deleteCounter = () => {
    if (!selectedCounter) return;
    if (!window.confirm(`Xóa bộ đếm “${selectedCounter.title}”?`)) return;
    onChange((current) =>
      current.filter((counter) => counter.id !== selectedCounter.id),
    );
  };

  const updateSelected = (updater: (counter: DayCounter) => DayCounter) => {
    if (!selectedCounter) return;
    onChange((current) =>
      current.map((counter) =>
        counter.id === selectedCounter.id ? updater(counter) : counter,
      ),
    );
  };

  const addMemory = () => {
    if (
      !selectedCounter ||
      (!memoryDraft.title.trim() &&
        !memoryDraft.body.trim() &&
        !memoryDraft.image)
    ) {
      return;
    }
    const memory = {
      id: createId(),
      title: memoryDraft.title.trim(),
      body: memoryDraft.body.trim(),
      image: memoryDraft.image,
      happenedAt: memoryDraft.happenedAt || toIsoDate(new Date()),
      createdAt: new Date().toISOString(),
    };
    updateSelected((counter) => ({
      ...counter,
      memories: [memory, ...counter.memories],
    }));
    setMemoryDraft({
      title: "",
      body: "",
      happenedAt: toIsoDate(new Date()),
      image: "",
    });
  };

  return (
    <main className="days-page">
      <header className="days-page-heading">
        <div>
          <span>Nhật ký thời gian</span>
          <h1>Đếm ngày, giữ lại hành trình.</h1>
          <p>
            Đếm xuôi một chặng đường hoặc đếm ngược tới ngày đang mong chờ.
          </p>
        </div>
        <button className="primary-button" onClick={startCreate}>
          <Plus size={15} /> Bộ đếm mới
        </button>
      </header>

      {showSetup ? (
        <DayCounterSetup
          draft={draft}
          editing={Boolean(editingId)}
          canCancel={counters.length > 0}
          onChange={setDraft}
          onSave={saveCounter}
          onCancel={() => setShowSetup(false)}
        />
      ) : selectedCounter ? (
        <div className="day-counter-shell">
          <aside className="counter-rail">
            <div className="counter-rail-heading">
              <span>Bộ đếm</span>
              <b>{counters.length}</b>
            </div>
            {counters.map((counter) => {
              const numbers = getCounterNumbers(counter);
              return (
                <button
                  key={counter.id}
                  className={counter.id === selectedCounter.id ? "active" : ""}
                  onClick={() => setSelectedId(counter.id)}
                >
                  <i>{progressionPresets[counter.progressionStyle].symbol}</i>
                  <span>
                    <strong>{counter.title}</strong>
                    <small>
                      {numbers.value} ngày ·{" "}
                      {counter.mode === "up" ? "đếm xuôi" : "đếm ngược"}
                    </small>
                  </span>
                </button>
              );
            })}
          </aside>

          <DayCounterDetail
            counter={selectedCounter}
            memoryDraft={memoryDraft}
            onMemoryDraftChange={setMemoryDraft}
            onAddMemory={addMemory}
            onDeleteMemory={(memoryId) =>
              updateSelected((counter) => ({
                ...counter,
                memories: counter.memories.filter(
                  (memory) => memory.id !== memoryId,
                ),
              }))
            }
            onEdit={startEdit}
            onDelete={deleteCounter}
          />
        </div>
      ) : null}
    </main>
  );
}

function DayCounterSetup({
  draft,
  editing,
  canCancel,
  onChange,
  onSave,
  onCancel,
}: {
  draft: DayCounter;
  editing: boolean;
  canCancel: boolean;
  onChange: React.Dispatch<React.SetStateAction<DayCounter>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const preview = getCounterLevel(draft);
  const previewNumbers = getCounterNumbers(draft);

  return (
    <section className="counter-setup">
      <div className="counter-setup-heading">
        <span>{editing ? "Chỉnh bộ đếm" : "Setup nhanh"}</span>
        <h2>Bạn muốn đếm hành trình nào?</h2>
        <p>Chọn kiểu đếm, ngày mốc và một hệ thăng cấp hợp với câu chuyện.</p>
      </div>

      <div className="counter-setup-grid">
        <label className="counter-field counter-field-wide">
          <span>Tên hành trình</span>
          <input
            value={draft.title}
            onChange={(event) =>
              onChange((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="ví dụ: Chuyện của chúng mình"
          />
        </label>
        <label className="counter-field counter-field-wide">
          <span>Một dòng mô tả</span>
          <input
            value={draft.subtitle}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                subtitle: event.target.value,
              }))
            }
            placeholder="Một hành trình đáng để nhớ"
          />
        </label>

        <div className="counter-field counter-field-wide">
          <span>Kiểu đếm</span>
          <div className="counter-mode-grid">
            {(
              [
                ["up", "Đếm xuôi", "Tính số ngày đã đi cùng hành trình."],
                ["down", "Đếm ngược", "Tính số ngày còn lại tới cột mốc."],
              ] as const
            ).map(([mode, label, description]) => (
              <button
                key={mode}
                className={draft.mode === mode ? "selected" : ""}
                onClick={() =>
                  onChange((current) => ({ ...current, mode }))
                }
                type="button"
              >
                {mode === "up" ? (
                  <Sparkles size={18} />
                ) : (
                  <CalendarRange size={18} />
                )}
                <strong>{label}</strong>
                <small>{description}</small>
              </button>
            ))}
          </div>
        </div>

        <label className="counter-field counter-field-wide">
          <span>
            {draft.mode === "up" ? "Ngày bắt đầu" : "Ngày đích đến"}
          </span>
          <input
            type="date"
            value={draft.anchorDate}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                anchorDate: event.target.value,
              }))
            }
          />
        </label>

        <div className="counter-field counter-field-wide">
          <span>Phong cách thăng tiến</span>
          <div className="progression-style-grid">
            {(Object.keys(progressionPresets) as ProgressionStyle[]).map(
              (style) => {
                const preset = progressionPresets[style];
                return (
                  <button
                    key={style}
                    className={
                      draft.progressionStyle === style ? "selected" : ""
                    }
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        progressionStyle: style,
                      }))
                    }
                    type="button"
                  >
                    <i>{preset.symbol}</i>
                    <strong>{preset.name}</strong>
                    <small>{preset.description}</small>
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="counter-auto-ranks counter-field-wide">
          <div>
            <Sparkles size={16} />
            <span>
              Hệ thống tự chia cấp
              <small>
                {draft.mode === "up"
                  ? "Mốc ngày tăng dần theo độ dài hành trình."
                  : `Toàn bộ ${previewNumbers.totalDuration} ngày được chia thành ${preview.preset.levels.length} chặng; ngày đích đạt cấp cao nhất.`}
              </small>
            </span>
          </div>
          <div className="counter-auto-rank-list">
            {preview.preset.levels.map((rank, index) => {
              const milestone = preview.milestones[index];
              const remaining = Math.max(
                0,
                previewNumbers.totalDuration - milestone,
              );
              return (
                <span
                  key={rank}
                  style={
                    {
                      "--rank-aura": preview.preset.auras[index],
                    } as React.CSSProperties
                  }
                >
                  <i>{preview.preset.glyphs[index]}</i>
                  <b>{rank}</b>
                  <small>
                    {draft.mode === "up"
                      ? milestone === 0
                        ? "Bắt đầu"
                        : `${milestone} ngày`
                      : remaining === 0
                        ? "Ngày đích"
                        : `Còn ${remaining} ngày`}
                  </small>
                </span>
              );
            })}
          </div>
        </div>

        <label className="counter-cover-upload counter-field-wide">
          <Upload size={16} />
          {draft.coverImage ? "Đổi ảnh bìa" : "Thêm ảnh bìa (tùy chọn)"}
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              readImageFile(event.target.files?.[0] ?? null, (coverImage) =>
                onChange((current) => ({ ...current, coverImage })),
              )
            }
          />
        </label>
        {draft.coverImage && (
          <div className="counter-cover-preview counter-field-wide">
            <img src={draft.coverImage} alt="Ảnh bìa xem trước" />
            <button
              onClick={() =>
                onChange((current) => ({ ...current, coverImage: "" }))
              }
              type="button"
            >
              <X size={13} /> Bỏ ảnh
            </button>
          </div>
        )}
      </div>

      <div className="counter-setup-actions">
        {canCancel && (
          <button className="secondary-button" onClick={onCancel}>
            Hủy
          </button>
        )}
        <button className="primary-button" onClick={onSave}>
          {editing ? "Lưu thay đổi" : "Bắt đầu đếm"}
        </button>
      </div>
    </section>
  );
}

function DayCounterDetail({
  counter,
  memoryDraft,
  onMemoryDraftChange,
  onAddMemory,
  onDeleteMemory,
  onEdit,
  onDelete,
}: {
  counter: DayCounter;
  memoryDraft: {
    title: string;
    body: string;
    happenedAt: string;
    image: string;
  };
  onMemoryDraftChange: React.Dispatch<
    React.SetStateAction<{
      title: string;
      body: string;
      happenedAt: string;
      image: string;
    }>
  >;
  onAddMemory: () => void;
  onDeleteMemory: (memoryId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const numbers = getCounterNumbers(counter);
  const level = getCounterLevel(counter);
  const sortedMemories = [...counter.memories].sort((a, b) =>
    b.happenedAt.localeCompare(a.happenedAt),
  );
  const heroStyle = {
    "--level-progress": `${level.progress * 3.6}deg`,
    "--aura-color": level.aura,
    ...(counter.coverImage
      ? {
          backgroundImage: `linear-gradient(var(--counter-overlay), var(--counter-overlay)), url(${counter.coverImage})`,
        }
      : {}),
  } as React.CSSProperties;

  return (
    <section
      className={`counter-detail counter-style-${counter.progressionStyle}`}
    >
      <div
        className={`counter-hero ${counter.coverImage ? "has-cover" : ""}`}
        data-level={level.levelIndex}
        style={heroStyle}
      >
        <div className="counter-hero-actions">
          <button onClick={onEdit}>Chỉnh sửa</button>
          <button className="danger" onClick={onDelete}>
            Xóa
          </button>
        </div>
        <div className="counter-hero-content">
          <div className="counter-story">
            <span className="counter-path-name">
              {level.preset.symbol} {level.preset.name}
            </span>
            <p>{counter.subtitle || level.preset.description}</p>
            <h2>{counter.title}</h2>
            <div className="counter-number">
              <strong>{numbers.value}</strong>
              <span>ngày</span>
            </div>
            <small>
              {counter.mode === "up"
                ? "đã đi qua kể từ ngày bắt đầu"
                : numbers.passedTarget
                  ? "cột mốc đã đến"
                  : "còn lại tới cột mốc"}
            </small>
            <time>
              {getDateAtMidnight(counter.anchorDate).toLocaleDateString(
                "vi-VN",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </time>
          </div>

          <div className="ascension-orbit" aria-label={`Tiến độ ${level.progress}%`}>
            <i className="orbit-halo orbit-halo-one" />
            <i className="orbit-halo orbit-halo-two" />
            <i className="orbit-stars" />
            <div className="orbit-progress">
              <div className="realm-seal">
                <span>{level.glyph}</span>
                <small>Cảnh giới {level.levelIndex + 1}</small>
                <strong>{level.currentLevel}</strong>
                <b>{level.progress}%</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="counter-level-card">
        <div className="counter-level-copy">
          <span>Cấp hiện tại · {level.levelIndex + 1}</span>
          <strong>{level.currentLevel}</strong>
          <small>
            {level.atFinalLevel
              ? "Đã mở cấp cao nhất của hành trình này."
              : `Còn ${level.daysToNext} ngày tới ${level.nextLevel}.`}
          </small>
        </div>
        <div className="counter-level-meta">
          <span>
            <small>Đã tích lũy</small>
            <b>{numbers.elapsed} ngày</b>
          </span>
          <span>
            <small>Mốc kế tiếp</small>
            <b>
              {level.atFinalLevel
                ? "Viên mãn"
                : counter.mode === "up"
                  ? `${level.milestones[level.levelIndex + 1]} ngày`
                  : `sau ${level.daysToNext} ngày`}
            </b>
          </span>
        </div>
      </div>

      <div className="counter-rank-map">
        <div className="counter-section-heading">
          <div>
            <span>Lộ trình thăng cấp</span>
            <h3>{level.preset.name}</h3>
          </div>
          <small>Mốc cấp được hệ thống tính tự động</small>
        </div>
        <div className="rank-track">
          {level.preset.levels.map((rank, index) => {
            const remaining = Math.max(
              0,
              numbers.totalDuration - level.milestones[index],
            );
            return (
              <div
                className={`${index < level.levelIndex ? "complete" : ""} ${
                  index === level.levelIndex ? "current" : ""
                }`}
                key={rank}
                style={
                  {
                    "--rank-aura": level.preset.auras[index],
                  } as React.CSSProperties
                }
              >
                <i>
                  {index < level.levelIndex ? (
                    <Check size={12} />
                  ) : (
                    level.preset.glyphs[index]
                  )}
                </i>
                <span>{rank}</span>
                <small>
                  {counter.mode === "up"
                    ? level.milestones[index] === 0
                      ? "Bắt đầu"
                      : `${level.milestones[index]} ngày`
                    : remaining === 0
                      ? "Ngày đích"
                      : `Còn ${remaining} ngày`}
                </small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="memory-section">
        <div className="counter-section-heading">
          <div>
            <span>Ký ức</span>
            <h3>Những điều không muốn quên</h3>
          </div>
          <small>{counter.memories.length} mảnh ký ức</small>
        </div>

        <div className="memory-composer">
          <div className="memory-composer-grid">
            <input
              value={memoryDraft.title}
              onChange={(event) =>
                onMemoryDraftChange((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Tiêu đề ký ức"
            />
            <input
              type="date"
              value={memoryDraft.happenedAt}
              onChange={(event) =>
                onMemoryDraftChange((current) => ({
                  ...current,
                  happenedAt: event.target.value,
                }))
              }
            />
          </div>
          <textarea
            value={memoryDraft.body}
            onChange={(event) =>
              onMemoryDraftChange((current) => ({
                ...current,
                body: event.target.value,
              }))
            }
            placeholder="Viết lại câu chuyện, cảm xúc hoặc một điều nhỏ đáng nhớ…"
          />
          {memoryDraft.image && (
            <div className="memory-image-preview">
              <img src={memoryDraft.image} alt="Ảnh ký ức xem trước" />
              <button
                onClick={() =>
                  onMemoryDraftChange((current) => ({
                    ...current,
                    image: "",
                  }))
                }
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="memory-composer-actions">
            <label>
              <ImagePlus size={15} />
              Thêm ảnh
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  readImageFile(event.target.files?.[0] ?? null, (image) =>
                    onMemoryDraftChange((current) => ({ ...current, image })),
                  )
                }
              />
            </label>
            <button className="primary-button" onClick={onAddMemory}>
              <Heart size={14} /> Lưu ký ức
            </button>
          </div>
        </div>

        {sortedMemories.length === 0 ? (
          <div className="memory-empty">
            <BookHeart size={24} />
            <p>Ký ức đầu tiên đang chờ bạn viết.</p>
          </div>
        ) : (
          <div className="memory-grid">
            {sortedMemories.map((memory) => (
              <article className="memory-card" key={memory.id}>
                {memory.image && <img src={memory.image} alt="" />}
                <div>
                  <time>
                    {getDateAtMidnight(memory.happenedAt).toLocaleDateString(
                      "vi-VN",
                      { day: "numeric", month: "long", year: "numeric" },
                    )}
                  </time>
                  {memory.title && <h4>{memory.title}</h4>}
                  {memory.body && <p>{memory.body}</p>}
                </div>
                <button
                  className="memory-delete"
                  onClick={() => onDeleteMemory(memory.id)}
                  title="Xóa ký ức"
                >
                  <Trash2 size={13} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface OnboardingProps {
  hasProjects: boolean;
  hasTasks: boolean;
  projectName?: string;
  onAction: () => void;
}

function Onboarding({
  hasProjects,
  hasTasks,
  projectName,
  onAction,
}: OnboardingProps) {
  const heading = !hasProjects
    ? "Chào buổi sáng. Cùng lên kế hoạch tuần này nhé."
    : !hasTasks
      ? `Chào buổi sáng. Bắt đầu phác thảo ${projectName || "dự án của bạn"}.`
      : "Chào buổi sáng. Gần xong rồi.";
  const description = !hasProjects
    ? "Ba bước nhanh thôi, rồi các ngày sẽ tự vào guồng."
    : !hasTasks
      ? "Thêm vài công việc bên dưới để phác thảo việc cần làm."
      : "Gán ngày cho công việc, nó sẽ hiện ở đây.";

  return (
    <div className="onboarding-card">
      <h1>{heading}</h1>
      <p>{description}</p>
      <div className="onboarding-steps">
        <OnboardingStep
          number="1"
          complete={hasProjects}
          title="Tạo dự án"
          detail="Một môn học, mục tiêu hoặc mảng việc bạn muốn theo dõi."
        />
        <OnboardingStep
          number="2"
          complete={hasTasks}
          title="Thêm công việc"
          detail={
            <span className="sample-task">
              <i />
              thiết kế trang chính <b>0/1</b>
            </span>
          }
        />
        <OnboardingStep
          number="3"
          title="Gán ngày làm"
          detail={
            <span className="sample-days">
              <b>T2</b>
              <b className="selected">T4 <i>•</i></b>
              <b>T6</b>
            </span>
          }
        />
      </div>
      {!hasProjects && (
        <button className="primary-button" onClick={onAction}>
          <Plus size={16} /> Thêm dự án đầu tiên
        </button>
      )}
    </div>
  );
}

function OnboardingStep({
  number,
  complete = false,
  title,
  detail,
}: {
  number: string;
  complete?: boolean;
  title: string;
  detail: React.ReactNode;
}) {
  return (
    <div className="onboarding-step">
      <span className={complete ? "step-number complete" : "step-number"}>
        {complete ? <Check size={15} /> : number}
      </span>
      <div>
        <h3>{title}</h3>
        <div className="step-detail">{detail}</div>
      </div>
    </div>
  );
}

interface DayColumnProps {
  day: DayKey;
  tasks: DayTask[];
  currentWeek: boolean;
  todayKey: DayKey;
  weekOffset: number;
  focused?: boolean;
  onFocus?: () => void;
  onOpenTask: (projectId: string, taskId: string) => void;
  onToggleTask: (projectId: string, taskId: string, day?: DayKey) => void;
}

function DayColumn({
  day,
  tasks,
  currentWeek,
  todayKey,
  weekOffset,
  focused = false,
  onFocus,
  onOpenTask,
  onToggleTask,
}: DayColumnProps) {
  const dayDateStr = getDayDateStr(day, weekOffset);
  const completed = tasks.filter(({ task }) => {
    if (task.days.length > 0) {
      return (task.completedDates ?? []).includes(dayDateStr);
    }
    return task.completed;
  }).length;
  const percentage = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const missedDay =
    currentWeek && dayKeys.indexOf(day) < dayKeys.indexOf(todayKey);

  return (
    <div className={`day-column ${focused ? "focused" : ""}`}>
      <button className="day-column-header" onClick={onFocus} disabled={!onFocus}>
        <span>{dayLabels[day]}</span>
        {tasks.length > 0 && (
          <small>
            {completed}/{tasks.length} · {percentage}%
          </small>
        )}
      </button>
      <div className="day-task-list">
        {tasks.length === 0 ? (
          <div className="empty-day">—</div>
        ) : (
          tasks.map(({ project, task }) => {
            const subtasksDone = task.subtasks.filter(
              (subtask) => subtask.completed || task.completed,
            ).length;
            const subtaskProgress = task.subtasks.length
              ? Math.round((subtasksDone / task.subtasks.length) * 100)
              : 0;
            const isCompleted = task.days.length > 0
              ? (task.completedDates ?? []).includes(dayDateStr)
              : task.completed;
            
            const dayTime = task.dayTimes?.[day] || (task.startTime && task.endTime ? { startTime: task.startTime, endTime: task.endTime } : null);
            const isToday = currentWeek && day === todayKey;
            let isOverdueToday = false;
            if (isToday && !isCompleted && dayTime?.endTime) {
              const [endH, endM] = dayTime.endTime.split(":").map(Number);
              const now = new Date();
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              const endMinutes = endH * 60 + endM;
              if (currentMinutes > endMinutes) {
                isOverdueToday = true;
              }
            }
            const missed = (missedDay || isOverdueToday) && !isCompleted;
            return (
              <article
                className={`day-task-card ${isCompleted ? "is-complete" : ""}`}
                key={`${day}-${task.id}`}
              >
                <button
                  className={`check-button ${isCompleted ? "checked" : ""}`}
                  onClick={() => onToggleTask(project.id, task.id, day)}
                  disabled={task.completed}
                  aria-label={
                    isCompleted
                      ? "Đánh dấu chưa hoàn thành"
                      : "Đánh dấu hoàn thành"
                  }
                >
                  {isCompleted ? (
                    <Check size={14} />
                  ) : (
                    task.completed && <X size={12} style={{ color: "var(--ink-faint)" }} />
                  )}
                </button>
                <button
                  className="day-task-content"
                  onClick={() => onOpenTask(project.id, task.id)}
                >
                  <span
                    style={{
                      fontWeight: project.titleBold ? 800 : 400,
                      fontStyle: project.titleItalic ? "italic" : "normal",
                      color: project.titleColor || undefined,
                    }}
                  >
                    <ProjectIconMark icon={project.icon} />{" "}
                    {project.title || "Dự án chưa đặt tên"}
                  </span>
                  <strong
                    style={{
                      fontWeight: task.titleBold ? 700 : 400,
                      fontStyle: task.titleItalic ? "italic" : "normal",
                      color: task.titleColor || undefined,
                    }}
                  >
                    {task.title || "Công việc chưa đặt tên"}
                  </strong>
                  {(task.description ||
                    task.deadline ||
                    task.subtasks.length > 0 ||
                    (dayTime?.startTime && dayTime?.endTime) ||
                    missed) && (
                    <small>
                      {dayTime?.startTime && dayTime?.endTime && (
                        <b className="time-badge" style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "var(--accent)", marginRight: "6px" }}>
                          <Clock3 size={10} />
                          {dayTime.startTime} - {dayTime.endTime}
                        </b>
                      )}
                      {task.description && <em>{task.description}</em>}
                      {task.subtasks.length > 0 && (
                        <>
                          <span className="day-subtask-progress">
                            <i style={{ width: `${subtaskProgress}%` }} />
                          </span>
                          <b>
                            {subtasksDone}/{task.subtasks.length}
                          </b>
                        </>
                      )}
                      {task.deadline && (
                        <b>
                          hạn{" "}
                          {formatDateTimeLabel(
                            task.deadline,
                            task.deadlineTime,
                          )}
                        </b>
                      )}
                      {task.reminderEnabled && (
                        <b className="reminder-badge" title="Có nhắc âm thanh">
                          <BellRing size={10} />
                        </b>
                      )}
                      {missed && <b className="missed-label">trễ</b>}
                    </small>
                  )}
                </button>
                {missed && (
                  <button
                    className="move-button"
                    onClick={() => onOpenTask(project.id, task.id)}
                  >
                    Dời <MoveRight size={12} />
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

interface TaskEditorProps {
  project: Project;
  task: Task;
  planner: PlannerState;
  onClose: () => void;
  onSave: (task: Task) => void;
}

function getDurationText(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h}h${m}p`;
  if (h > 0) return `${h}h`;
  return `${m}p`;
}

function TaskEditor({ project, task, planner, onClose, onSave }: TaskEditorProps) {
  const [draft, setDraft] = useState<Task>(() => {
    const cloned = clone(task);
    if (!cloned.dayTimes) {
      cloned.dayTimes = {};
    }
    // Backward compatibility
    if (cloned.startTime && cloned.endTime) {
      cloned.days.forEach(day => {
        if (!cloned.dayTimes![day]) {
          cloned.dayTimes![day] = {
            startTime: cloned.startTime,
            endTime: cloned.endTime
          };
        }
      });
    }
    return cloned;
  });

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [activeModalDay, setActiveModalDay] = useState<DayKey>("mon");
  const [tempDayTimes, setTempDayTimes] = useState<Partial<Record<DayKey, { startTime?: string; endTime?: string }>>>(() => draft.dayTimes ?? {});
  
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [timeError, setTimeError] = useState("");
  const [typedStart, setTypedStart] = useState("");
  const [typedEnd, setTypedEnd] = useState("");

  const startOptions = useMemo(() => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        options.push(`${hh}:${mm}`);
      }
    }
    return options;
  }, []);

  const activeDayTime = tempDayTimes[activeModalDay] || {};
  const currentStart = activeDayTime.startTime ?? "";
  const currentEnd = activeDayTime.endTime ?? "";

  const endOptions = useMemo(() => {
    if (!currentStart) return [];
    let formattedStart = currentStart;
    if (/^[0-9]:[0-5][0-9]$/.test(formattedStart)) {
      formattedStart = "0" + formattedStart;
    }
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(formattedStart)) {
      return [];
    }
    const [sh, sm] = formattedStart.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const options: { value: string; label: string }[] = [];
    for (let min = startMin + 30; min <= 1440; min += 30) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      let timeVal = "";
      if (h === 24 && m === 0) {
        timeVal = "24:00";
      } else {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        timeVal = `${hh}:${mm}`;
      }
      const diff = min - startMin;
      let durText = "";
      if (diff < 60) {
        durText = `${diff} phút`;
      } else if (diff % 60 === 0) {
        durText = `${diff / 60} giờ`;
      } else if (diff % 30 === 0) {
        durText = `${(diff / 60).toFixed(1).replace(".", ",")} giờ`;
      } else {
        const dh = Math.floor(diff / 60);
        const dm = diff % 60;
        durText = `${dh}h${dm}p`;
      }
      options.push({ value: timeVal, label: `${timeVal} (${durText})` });
    }
    return options;
  }, [currentStart]);

  const openTimeModalForDay = (day: DayKey) => {
    setActiveModalDay(day);
    const times = draft.dayTimes ?? {};
    setTempDayTimes(times);
    const dt = times[day] || {};
    setTypedStart(dt.startTime ?? "");
    setTypedEnd(dt.endTime ?? "");
    setTimeError("");
    setStartOpen(false);
    setEndOpen(false);
    setShowTimeModal(true);
  };

  const handleTimeConfirm = () => {
    const updatedDayTimes = { ...tempDayTimes };

    const cleanStart = typedStart.trim();
    const cleanEnd = typedEnd.trim();

    if (cleanStart || cleanEnd) {
      if (!cleanStart || !cleanEnd) {
        setTimeError(`Vui lòng nhập đầy đủ giờ bắt đầu và kết thúc cho ${dayLabels[activeModalDay]}.`);
        return;
      }
      let formattedStart = cleanStart;
      let formattedEnd = cleanEnd;
      if (/^[0-9]:[0-5][0-9]$/.test(formattedStart)) formattedStart = "0" + formattedStart;
      if (/^[0-9]:[0-5][0-9]$/.test(formattedEnd)) formattedEnd = "0" + formattedEnd;

      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$|^24:00$/;
      if (!timeRegex.test(formattedStart) || !timeRegex.test(formattedEnd)) {
        setTimeError(`Định dạng giờ ở ${dayLabels[activeModalDay]} không hợp lệ (hỗ trợ HH:MM).`);
        return;
      }

      const [sh, sm] = formattedStart.split(":").map(Number);
      const [eh, em] = formattedEnd.split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        setTimeError(`Giờ kết thúc phải sau giờ bắt đầu ở ${dayLabels[activeModalDay]}.`);
        return;
      }

      updatedDayTimes[activeModalDay] = {
        startTime: formattedStart,
        endTime: formattedEnd
      };
    } else {
      delete updatedDayTimes[activeModalDay];
    }
    
    for (const d of dayKeys) {
      if (d === activeModalDay) continue; // already validated
      const dt = updatedDayTimes[d];
      if (dt) {
        if ((dt.startTime && !dt.endTime) || (!dt.startTime && dt.endTime)) {
          setTimeError(`Vui lòng nhập đầy đủ giờ bắt đầu và kết thúc cho ${dayLabels[d]}.`);
          return;
        }
        if (dt.startTime && dt.endTime) {
          const [sh, sm] = dt.startTime.split(":").map(Number);
          const [eh, em] = dt.endTime.split(":").map(Number);
          if (eh * 60 + em <= sh * 60 + sm) {
            setTimeError(`Giờ kết thúc phải sau giờ bắt đầu ở ${dayLabels[d]}.`);
            return;
          }
        }
      }
    }
    
    setTimeError("");

    let conflictTaskName = "";
    let conflictProjectName = "";
    let conflictDayLabel = "";

    for (const d of dayKeys) {
      const dt = updatedDayTimes[d];
      if (!dt || !dt.startTime || !dt.endTime) continue;
      
      const [sh, sm] = dt.startTime.split(":").map(Number);
      const [eh, em] = dt.endTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      for (const proj of planner.projects) {
        for (const t of proj.tasks) {
          if (t.id === draft.id) continue;
          
          if (t.days.includes(d)) {
            const otherDayTime = t.dayTimes?.[d] || (t.startTime && t.endTime ? { startTime: t.startTime, endTime: t.endTime } : null);
            if (otherDayTime?.startTime && otherDayTime?.endTime) {
              const [oStartH, oStartM] = otherDayTime.startTime.split(":").map(Number);
              const [oEndH, oEndM] = otherDayTime.endTime.split(":").map(Number);
              const oStart = oStartH * 60 + oStartM;
              const oEnd = oEndH * 60 + oEndM;

              if (startMin < oEnd && oStart < endMin) {
                conflictTaskName = t.title;
                conflictProjectName = proj.title;
                conflictDayLabel = dayLabels[d];
                break;
              }
            }
          }
        }
        if (conflictTaskName) break;
      }
      if (conflictTaskName) break;
    }

    if (conflictTaskName) {
      const proceed = window.confirm(
        `Thời gian ở ${conflictDayLabel} đang trùng với lịch của công việc "${conflictTaskName}" trong dự án "${conflictProjectName}". Bạn có muốn tiếp tục ghi không?`
      );
      if (!proceed) {
        return;
      }
    }

    setDraft((current) => {
      const newDays = [...current.days];
      dayKeys.forEach(d => {
        const dt = updatedDayTimes[d];
        if (dt?.startTime && dt?.endTime && !newDays.includes(d)) {
          newDays.push(d);
        }
      });

      const cleanedDayTimes: Partial<Record<DayKey, { startTime?: string; endTime?: string }>> = {};
      dayKeys.forEach(d => {
        const dt = updatedDayTimes[d];
        if (dt?.startTime && dt?.endTime) {
          cleanedDayTimes[d] = { startTime: dt.startTime, endTime: dt.endTime };
        }
      });

      const firstActiveDay = dayKeys.find(d => cleanedDayTimes[d]?.startTime);
      const fallbackStart = firstActiveDay ? cleanedDayTimes[firstActiveDay]?.startTime : undefined;
      const fallbackEnd = firstActiveDay ? cleanedDayTimes[firstActiveDay]?.endTime : undefined;

      return {
        ...current,
        days: newDays,
        dayTimes: cleanedDayTimes,
        startTime: fallbackStart,
        endTime: fallbackEnd
      };
    });

    setShowTimeModal(false);
  };

  const toggleDay = (day: DayKey) => {
    setDraft((current) => {
      const isSelected = current.days.includes(day);
      const newDays = isSelected
        ? current.days.filter((item) => item !== day)
        : [...current.days, day];
      
      const newDayTimes = { ...current.dayTimes };
      if (isSelected && newDayTimes[day]) {
        delete newDayTimes[day];
      }
      
      const firstActiveDay = dayKeys.find(d => newDays.includes(d) && newDayTimes[d]?.startTime);
      const fallbackStart = firstActiveDay ? newDayTimes[firstActiveDay]?.startTime : undefined;
      const fallbackEnd = firstActiveDay ? newDayTimes[firstActiveDay]?.endTime : undefined;

      return {
        ...current,
        days: newDays,
        dayTimes: newDayTimes,
        startTime: fallbackStart,
        endTime: fallbackEnd
      };
    });
  };

  return (
    <Modal onClose={onClose}>
      <div className="task-editor">
        <div className="modal-kicker">Chọn ngày cho công việc</div>
        <button className="modal-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>
        <span className="editor-project-name">
          {project.title || "Dự án chưa đặt tên"}
        </span>
        <div className="editor-title-row">
          <TitleEditField
            className="editor-title"
            value={draft.title}
            placeholder="Tên công việc"
            bold={draft.titleBold ?? false}
            italic={draft.titleItalic ?? false}
            color={draft.titleColor ?? ""}
            normalWeight={500}
            boldWeight={800}
            onChange={(title) =>
              setDraft((current) => ({ ...current, title }))
            }
            onBlur={() => undefined}
            onBoldChange={(titleBold) =>
              setDraft((current) => ({ ...current, titleBold }))
            }
            onItalicChange={(titleItalic) =>
              setDraft((current) => ({ ...current, titleItalic }))
            }
            onColorChange={(titleColor) =>
              setDraft((current) => ({ ...current, titleColor }))
            }
          />
        </div>

        <div className="field-label">
          Thời gian thực hiện và nhắc nhở
          <div className="deadline-grid">
            <label title="Ngày bắt đầu công việc">
              <span style={{ fontSize: "9px", whiteSpace: "nowrap", marginRight: "3px" }}>Bắt đầu:</span>
              <input
                type="date"
                value={draft.createdAt || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    createdAt: event.target.value,
                  }))
                }
              />
            </label>
            <label title="Hạn chót công việc">
              <span style={{ fontSize: "9px", whiteSpace: "nowrap", marginRight: "3px" }}>Hạn chót:</span>
              <input
                type="date"
                value={draft.deadline}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    deadline: event.target.value,
                  }))
                }
              />
            </label>
            <label title="Giờ nhắc">
              <Clock3 size={14} />
              <input
                type="time"
                value={draft.deadlineTime ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    deadlineTime: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="reminder-row">
            <button
              className={`reminder-toggle ${
                draft.reminderEnabled ? "active" : ""
              }`}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  reminderEnabled: !current.reminderEnabled,
                }))
              }
            >
              {draft.reminderEnabled ? (
                <BellRing size={15} />
              ) : (
                <Bell size={15} />
              )}
              {draft.reminderEnabled
                ? "Đang bật nhắc bằng âm thanh"
                : "Bật nhắc bằng âm thanh"}
            </button>
            <button className="sound-preview" onClick={playReminderSound}>
              Nghe thử
            </button>
          </div>
          {draft.reminderEnabled &&
            (!draft.deadline || !draft.deadlineTime) && (
              <small>Chọn đủ ngày và giờ để âm thanh nhắc hoạt động.</small>
            )}
        </div>

        <div className="field-label">
          Mức ưu tiên
          <PriorityControls
            important={draft.important ?? false}
            urgent={draft.urgent ?? false}
            onImportantChange={(important) =>
              setDraft((current) => ({ ...current, important }))
            }
            onUrgentChange={(urgent) =>
              setDraft((current) => ({ ...current, urgent }))
            }
          />
          <small>
            Nếu để trống, task vẫn có thể kế thừa “quan trọng/gấp” từ project
            khi xem ma trận.
          </small>
        </div>

        <div className="field-label">
          Gán vào ngày
          <div className="editor-days" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
            {dayKeys.map((day) => {
              const isSelected = draft.days.includes(day);
              const dayTime = draft.dayTimes?.[day];
              const timeStr = dayTime?.startTime && dayTime?.endTime 
                ? `${dayTime.startTime}-${dayTime.endTime}`
                : "";
              const durationStr = dayTime?.startTime && dayTime?.endTime
                ? `(${getDurationText(dayTime.startTime, dayTime.endTime)})`
                : "";
              
              return (
                <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <button
                    type="button"
                    className={isSelected ? "selected" : ""}
                    onClick={() => toggleDay(day)}
                    style={{ 
                      width: "100%", 
                      minHeight: "44px", 
                      padding: "4px 2px", 
                      fontSize: "10px", 
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center", 
                      justifyContent: "center",
                      gap: "2px"
                    }}
                  >
                    <span>{dayLabels[day]}</span>
                    {isSelected && <i style={{ color: "var(--accent)", fontStyle: "normal", fontSize: "12px", lineHeight: "1" }}>•</i>}
                  </button>
                  <span 
                    style={{ 
                      fontSize: "9px", 
                      color: isSelected ? "var(--accent)" : "var(--ink-faint)", 
                      cursor: isSelected ? "pointer" : "default",
                      textAlign: "center",
                      minHeight: "22px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      lineHeight: "1.2",
                      width: "100%"
                    }}
                    onClick={() => {
                      if (isSelected) {
                        openTimeModalForDay(day);
                      }
                    }}
                  >
                    {isSelected ? (
                      timeStr ? (
                        <>
                          <div style={{ fontWeight: 500, letterSpacing: "-0.3px" }}>{timeStr}</div>
                          <div style={{ opacity: 0.75, fontSize: "8px" }}>{durationStr}</div>
                        </>
                      ) : (
                        <span style={{ textDecoration: "underline", color: "var(--ink-soft)" }}>Đặt giờ</span>
                      )
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <small>
            {draft.days.length
              ? `Đã xếp vào ${draft.days
                  .map((day) => dayLabels[day])
                  .join(", ")}.`
              : "Chưa xếp lịch — sẽ chưa hiện trong tuần."}
          </small>
        </div>

        <label className="field-label">
          Mô tả <span>(tùy chọn)</span>
          <textarea
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="ví dụ: phác thảo hero, bảng giá và FAQ…"
          />
        </label>

        <div className="field-label">
          Việc nhỏ <span>(tùy chọn)</span>
          <div className="subtask-editor-list">
            {draft.subtasks.map((subtask) => {
              const isSubtaskCompleted = subtask.completed || draft.completed;
              return (
                <div className="subtask-editor-row" key={subtask.id}>
                  <button
                    className={`check-button ${isSubtaskCompleted ? "checked" : ""}`}
                    disabled={draft.completed}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        subtasks: current.subtasks.map((item) =>
                          item.id === subtask.id
                            ? { ...item, completed: !item.completed }
                            : item,
                        ),
                      }))
                    }
                  >
                    {isSubtaskCompleted && <Check size={13} />}
                  </button>
                  <input
                    value={subtask.title}
                    placeholder="Việc nhỏ…"
                    disabled={draft.completed}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        subtasks: current.subtasks.map((item) =>
                          item.id === subtask.id
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <button
                    className="icon-button"
                    disabled={draft.completed}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        subtasks: current.subtasks.filter(
                          (item) => item.id !== subtask.id,
                        ),
                      }))
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            <button
              className="add-subtask"
              disabled={draft.completed}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  subtasks: [
                    ...current.subtasks,
                    { id: createId(), title: "", completed: false },
                  ],
                }))
              }
            >
              <Plus size={13} /> thêm việc nhỏ
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button
            className="primary-button"
            onClick={() =>
              onSave({
                ...draft,
                title: draft.title.trim() || "Công việc chưa đặt tên",
                subtasks: draft.subtasks.filter((item) => item.title.trim()),
              })
            }
          >
            Lưu
          </button>
        </div>
      </div>

      {showTimeModal && (
        <Modal onClose={() => setShowTimeModal(false)}>
          <div className="time-picker-modal" style={{ padding: "20px", maxWidth: "340px", width: "90vw" }}>
            <div className="modal-kicker">Cấu hình thời gian</div>
            <button className="modal-close" onClick={() => setShowTimeModal(false)} aria-label="Đóng">
              <X size={18} />
            </button>
            <h3 style={{ marginTop: "15px", fontSize: "16px", color: "var(--ink)", fontFamily: "Fraunces, serif" }}>Đặt giờ theo ngày</h3>
            <p style={{ margin: "5px 0 15px 0", fontSize: "12px", color: "var(--ink-faint)", lineHeight: "1.4" }}>
              Chọn thứ trong tuần để đặt giờ cụ thể (hỗ trợ các khung giờ khác nhau giữa các thứ).
            </p>

            <div style={{ display: "flex", gap: "6px", marginBottom: "15px", overflowX: "auto", paddingBottom: "5px" }}>
              {dayKeys.map((day) => {
                const isSelected = draft.days.includes(day);
                const isActive = activeModalDay === day;
                const hasTime = !!tempDayTimes[day]?.startTime && !!tempDayTimes[day]?.endTime;
                
                return (
                  <button
                    key={day}
                    type="button"
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: isActive ? "2px solid var(--accent)" : "1px solid var(--line)",
                      background: isActive ? "var(--accent-soft)" : "var(--paper)",
                      color: isActive ? "var(--accent)" : (isSelected ? "var(--ink)" : "var(--ink-faint)"),
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "inherit",
                      fontWeight: isActive || isSelected ? 600 : 400,
                      minWidth: "42px",
                      textAlign: "center",
                      flexShrink: 0
                    }}
                    onClick={() => {
                      setActiveModalDay(day);
                      const dt = tempDayTimes[day] || {};
                      setTypedStart(dt.startTime ?? "");
                      setTypedEnd(dt.endTime ?? "");
                      setStartOpen(false);
                      setEndOpen(false);
                    }}
                  >
                    {dayLabels[day]}
                    {hasTime && <span style={{ color: "var(--accent)", marginLeft: "2px" }}>•</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                  Thứ đang sửa: <span style={{ color: "var(--accent)" }}>{dayLabels[activeModalDay]}</span>
                </span>
                {!draft.days.includes(activeModalDay) && (
                  <span style={{ fontSize: "10px", color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: "4px" }}>
                    Tự động gán vào ngày khi chọn giờ
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", position: "relative" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "var(--ink-soft)" }}>Bắt đầu:</label>
                  <input
                    type="text"
                    value={typedStart}
                    placeholder="00:00"
                    onFocus={() => {
                      setStartOpen(true);
                      setEndOpen(false);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTypedStart(val);
                      let checkVal = val.trim();
                      if (/^[0-9]:[0-5][0-9]$/.test(checkVal)) checkVal = "0" + checkVal;
                      if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$|^24:00$/.test(checkVal)) {
                        setTempDayTimes((prev) => ({
                          ...prev,
                          [activeModalDay]: {
                            ...prev[activeModalDay],
                            startTime: checkVal
                          }
                        }));
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--line-strong)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                      textAlign: "center",
                      fontSize: "14px",
                      fontFamily: "inherit"
                    }}
                  />
                  
                  {startOpen && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 999 }}
                        onClick={() => setStartOpen(false)}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          background: "var(--paper)",
                          border: "1px solid var(--line-strong)",
                          borderRadius: "8px",
                          boxShadow: "var(--shadow)",
                          maxHeight: "180px",
                          overflowY: "auto",
                          marginTop: "4px",
                          padding: "4px 0"
                        }}
                      >
                        {startOptions.map((opt) => (
                          <div
                            key={opt}
                            style={{
                              padding: "8px 12px",
                              fontSize: "13px",
                              color: "var(--ink)",
                              cursor: "pointer",
                              backgroundColor: opt === currentStart ? "var(--accent-soft)" : "transparent"
                            }}
                            onClick={() => {
                              let nextEnd = currentEnd;
                              if (currentEnd) {
                                const [sh, sm] = opt.split(":").map(Number);
                                const [eh, em] = currentEnd.split(":").map(Number);
                                if (eh * 60 + em <= sh * 60 + sm) {
                                  const endMin = (sh * 60 + sm + 60) % 1440;
                                  const ehNew = Math.floor(endMin / 60);
                                  const emNew = endMin % 60;
                                  nextEnd = `${ehNew.toString().padStart(2, '0')}:${emNew.toString().padStart(2, '0')}`;
                                }
                              } else {
                                const [sh, sm] = opt.split(":").map(Number);
                                const endMin = sh * 60 + sm + 60;
                                if (endMin <= 1440) {
                                  const ehNew = Math.floor(endMin / 60);
                                  const emNew = endMin % 60;
                                  nextEnd = ehNew === 24 && emNew === 0 ? "24:00" : `${ehNew.toString().padStart(2, '0')}:${emNew.toString().padStart(2, '0')}`;
                                }
                              }
                              
                              setTempDayTimes((prev) => ({
                                ...prev,
                                [activeModalDay]: {
                                  startTime: opt,
                                  endTime: nextEnd
                                }
                              }));
                              setTypedStart(opt);
                              if (nextEnd) setTypedEnd(nextEnd);
                              setStartOpen(false);
                            }}
                            className="time-option-hover"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <span style={{ color: "var(--ink-soft)", marginTop: "18px" }}>-</span>

                <div style={{ position: "relative", flex: 1 }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", marginBottom: "4px", color: "var(--ink-soft)" }}>Kết thúc:</label>
                  <input
                    type="text"
                    value={typedEnd}
                    placeholder="00:00"
                    disabled={!currentStart}
                    onFocus={() => {
                      setEndOpen(true);
                      setStartOpen(false);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTypedEnd(val);
                      let checkVal = val.trim();
                      if (/^[0-9]:[0-5][0-9]$/.test(checkVal)) checkVal = "0" + checkVal;
                      if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$|^24:00$/.test(checkVal)) {
                        setTempDayTimes((prev) => ({
                          ...prev,
                          [activeModalDay]: {
                            ...prev[activeModalDay],
                            endTime: checkVal
                          }
                        }));
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--line-strong)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                      textAlign: "center",
                      fontSize: "14px",
                      opacity: currentStart ? 1 : 0.6,
                      fontFamily: "inherit"
                    }}
                  />

                  {endOpen && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 999 }}
                        onClick={() => setEndOpen(false)}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          background: "var(--paper)",
                          border: "1px solid var(--line-strong)",
                          borderRadius: "8px",
                          boxShadow: "var(--shadow)",
                          maxHeight: "180px",
                          overflowY: "auto",
                          marginTop: "4px",
                          padding: "4px 0"
                        }}
                      >
                        {endOptions.map((opt) => (
                          <div
                            key={opt.value}
                            style={{
                              padding: "8px 12px",
                              fontSize: "13px",
                              color: "var(--ink)",
                              cursor: "pointer",
                              backgroundColor: opt.value === currentEnd ? "var(--accent-soft)" : "transparent"
                            }}
                            onClick={() => {
                              setTempDayTimes((prev) => ({
                                ...prev,
                                [activeModalDay]: {
                                  ...prev[activeModalDay],
                                  endTime: opt.value
                                }
                              }));
                              setTypedEnd(opt.value);
                              setEndOpen(false);
                            }}
                            className="time-option-hover"
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {((typedStart && typedEnd) || (currentStart && currentEnd)) && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg-soft)", borderRadius: "6px", fontSize: "11px" }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    Thời lượng: {(() => {
                      let startFormat = typedStart.trim();
                      let endFormat = typedEnd.trim();
                      if (/^[0-9]:[0-5][0-9]$/.test(startFormat)) startFormat = "0" + startFormat;
                      if (/^[0-9]:[0-5][0-9]$/.test(endFormat)) endFormat = "0" + endFormat;
                      return getDurationText(startFormat, endFormat) || "—";
                    })()}
                  </span>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--red, #ef4444)",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontFamily: "inherit"
                    }}
                    onClick={() => {
                      setTempDayTimes((prev) => {
                        const copy = { ...prev };
                        delete copy[activeModalDay];
                        return copy;
                      });
                      setTypedStart("");
                      setTypedEnd("");
                      setStartOpen(false);
                      setEndOpen(false);
                    }}
                  >
                    Xóa giờ ngày này
                  </button>
                </div>
              )}
            </div>

            {timeError && (
              <div style={{ color: "var(--red, #ef4444)", fontSize: "12px", marginBottom: "15px", lineHeight: "1.4" }}>
                {timeError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowTimeModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleTimeConfirm}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function DeadlineExtensionModal({
  taskTitle,
  currentDeadline,
  onClose,
  onSave,
}: {
  taskTitle: string;
  currentDeadline: string;
  onClose: () => void;
  onSave: (newDeadline: string) => void;
}) {
  const [newDeadline, setNewDeadline] = useState<string>(() => {
    if (currentDeadline) {
      const curr = new Date(currentDeadline + "T12:00:00");
      if (!Number.isNaN(curr.getTime())) {
        curr.setDate(curr.getDate() + 7);
        return toIsoDate(curr);
      }
    }
    return toIsoDate(new Date());
  });

  const remainingLabel = getRemainingDateLabel(newDeadline);

  return (
    <Modal onClose={onClose}>
      <div className="task-completion-modal" style={{ padding: "24px" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "var(--ink)" }}>
          Gia hạn hạn chót công việc
        </h3>
        <p style={{ fontSize: "14px", color: "var(--ink-soft)", margin: "0 0 20px 0", lineHeight: "1.5" }}>
          Lịch trình của công việc <strong>“{taskTitle}”</strong> đã hoàn thành đầy đủ. Để tiếp tục thực hiện và bỏ tích hoàn thành công việc tổng, vui lòng gia hạn hạn chót mới:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--ink-soft)" }}>Hạn chót mới:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="date"
                value={newDeadline}
                min={currentDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                style={{
                  padding: "8px 12px",
                  fontSize: "14px",
                  borderRadius: "6px",
                  border: "1.5px solid var(--line-strong)",
                  background: "var(--field)",
                  color: "var(--ink)",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              {remainingLabel && (
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: newDeadline <= currentDeadline ? "var(--ink-faint)" : "var(--accent)",
                    background: newDeadline <= currentDeadline ? "rgba(28, 26, 23, 0.05)" : "var(--accent-soft)",
                    padding: "4px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {remainingLabel}
                </span>
              )}
            </div>
          </div>
          
          {newDeadline && newDeadline <= currentDeadline && (
            <small style={{ color: "var(--accent)", fontSize: "12px" }}>
              * Vui lòng chọn ngày mới sau hạn chót cũ ({currentDeadline}) để kéo dài lịch trình.
            </small>
          )}
        </div>

        <div className="modal-actions" style={{ justifyContent: "flex-end", padding: "0" }}>
          <button className="secondary-button" onClick={onClose}>
            Hủy bỏ
          </button>
          <button
            className="primary-button"
            disabled={!newDeadline || newDeadline <= currentDeadline}
            onClick={() => onSave(newDeadline)}
          >
            Đồng ý & Gia hạn
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal-panel ${wide ? "modal-panel-wide" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function IconPickerModal({
  currentIcon,
  onSelect,
  onUpload,
  onClose,
}: {
  currentIcon: string;
  onSelect: (icon: string) => void;
  onUpload: (icon: string) => void;
  onClose: () => void;
}) {
  const handleUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onUpload(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="icon-picker-modal">
        <div className="modal-kicker">Icon dự án</div>
        <button className="modal-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>
        <h3>Chọn một icon cho dự án</h3>
        <p>Bấm để đổi, xong rồi quay lại sắp việc.</p>
        <label className="icon-upload-button">
          <Plus size={14} />
          Tải icon lên
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleUpload(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="icon-grid">
          {projectIcons.map((icon) => (
            <button
              key={icon}
              className={icon === currentIcon ? "selected" : ""}
              onClick={() => onSelect(icon)}
              aria-pressed={icon === currentIcon}
            >
              {icon}
            </button>
          ))}
        </div>
        <button className="secondary-button full-button" onClick={onClose}>
          Xong
        </button>
      </div>
    </Modal>
  );
}

function SettingsModal({
  themeId,
  texture,
  viewMode,
  defaultPage,
  onThemeChange,
  onTextureChange,
  onViewModeChange,
  onDefaultPageChange,
  onClose,
  onImportData,
  planner,
  user,
  onDeleteAccount,
}: {
  themeId: ThemeId;
  texture: TextureLevel;
  viewMode: PlannerViewMode;
  defaultPage: DefaultPage;
  onThemeChange: (themeId: ThemeId) => void;
  onTextureChange: (texture: TextureLevel) => void;
  onViewModeChange: (viewMode: PlannerViewMode) => void;
  onDefaultPageChange: (defaultPage: DefaultPage) => void;
  onClose: () => void;
  onImportData: (importedState: PlannerState) => void;
  planner: PlannerState;
  user: any;
  onDeleteAccount: () => Promise<void>;
}) {
  const activeTheme = getTheme(themeId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmInput.trim().toUpperCase() !== "XÓA VĨNH VIỄN") {
      setDeleteError("Vui lòng nhập chính xác cụm từ yêu cầu.");
      return;
    }
    setDeleteError("");
    setIsDeleting(true);
    try {
      await onDeleteAccount();
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setDeleteError(err.message || "Đã xảy ra lỗi khi xóa tài khoản.");
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setConfirmInput("");
    setDeleteError("");
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="settings-modal">
        <div className="modal-kicker">Giao diện</div>
        <button className="modal-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>
        <div className="settings-heading">
          <div>
            <h3>Tùy biến planner theo gu của bạn.</h3>
            <p>
              Chọn bộ màu tổng thể và mức độ nổi bật của họa tiết nền.
            </p>
          </div>
          <div
            className="active-theme-chip"
            style={{ background: activeTheme.colors.accentSoft }}
          >
            <i style={{ background: activeTheme.colors.accent }} />
            {activeTheme.name}
          </div>
        </div>

        <section className="texture-settings">
          <div>
            <strong>Họa tiết nền</strong>
            <span>Giữ gọn gàng hoặc cho trang có nhiều chất hơn.</span>
          </div>
          <div className="texture-options">
            {(
              [
                ["clean", "Trơn"],
                ["soft", "Nhẹ"],
                ["rich", "Đậm"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={texture === value ? "selected" : ""}
                onClick={() => onTextureChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="view-mode-settings">
          <div>
            <strong>Cách hiển thị công việc</strong>
            <span>
              Chọn lịch theo tuần hoặc gom việc vào Ma trận Eisenhower.
            </span>
          </div>
          <div className="view-mode-options">
            {(
              [
                ["week", "Theo tuần"],
                ["matrix", "Ma trận"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={viewMode === value ? "selected" : ""}
                onClick={() => onViewModeChange(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="view-mode-settings default-page-settings">
          <div>
            <strong>Trang mở mặc định</strong>
            <span>
              Mặc định là Ghi chú; có thể mở thẳng trang Đếm ngày.
            </span>
          </div>
          <div className="view-mode-options">
            {(
              [
                ["plan", "Ghi chú"],
                ["days", "Đếm ngày"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={defaultPage === value ? "selected" : ""}
                onClick={() => onDefaultPageChange(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="theme-count">
          <span>Thư viện theme</span>
          <b>Bản gốc + {plannerThemes.length - 1} theme mới</b>
        </div>
        <div className="theme-grid">
          {plannerThemes.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option ${
                themeId === theme.id ? "selected" : ""
              }`}
              onClick={() => onThemeChange(theme.id)}
              aria-pressed={themeId === theme.id}
            >
              <span
                className="theme-preview"
                style={{
                  backgroundColor: theme.colors.bg,
                  backgroundImage:
                    texture === "clean"
                      ? "none"
                      : texture === "rich"
                        ? theme.richPattern
                        : theme.softPattern,
                  backgroundSize: theme.backgroundSize,
                }}
              >
                <i style={{ background: theme.colors.paper }}>
                  <b style={{ background: theme.colors.accent }} />
                  <em style={{ background: theme.colors.line }} />
                  <em style={{ background: theme.colors.line }} />
                  <small style={{ background: theme.colors.good }} />
                </i>
              </span>
              <span className="theme-option-copy">
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </span>
              {themeId === theme.id && (
                <span className="theme-selected-mark">
                  <Check size={13} />
                </span>
              )}
            </button>
          ))}
        </div>

        <section className="view-mode-settings" style={{ borderTop: "1px solid var(--line)", paddingTop: "15px", marginTop: "15px" }}>
          <div>
            <strong>Sao lưu & Phục hồi dữ liệu</strong>
            <span>Tải tệp sao lưu dữ liệu hiện tại về máy hoặc chọn tệp .json để phục hồi/gộp dữ liệu vào planner.</span>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              className="secondary-button"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid var(--line-strong)", borderRadius: "8px", padding: "5px 11px", backgroundColor: "var(--paper)", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer" }}
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(planner, null, 2));
                const downloadAnchor = document.createElement("a");
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `miw-planner-backup-${new Date().toISOString().split("T")[0]}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
            >
              <Download size={13} />
              Tải dữ liệu của bạn
            </button>

            <label className="secondary-button" style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", border: "1px solid var(--line-strong)", borderRadius: "8px", padding: "5px 11px", backgroundColor: "var(--paper)", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              <Upload size={13} />
              Tải tệp lên
              <input
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const text = event.target?.result;
                      if (typeof text !== "string") return;
                      const parsed = JSON.parse(text) as PlannerState;
                      if (parsed && (Array.isArray(parsed.projects) || Array.isArray(parsed.dayCounters))) {
                        onImportData(parsed);
                        alert("Đã nhập dữ liệu thành công! Bản dự phòng đã được gộp vào dữ liệu hiện tại.");
                      } else {
                        alert("Định dạng file không hợp lệ.");
                      }
                    } catch (err) {
                      alert("Có lỗi xảy ra khi đọc tệp.");
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
        </section>

        {user && (
          <section className="view-mode-settings danger-zone-section" style={{ border: "1px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.04)", padding: "14px", borderRadius: "9px", marginTop: "20px" }}>
            <div style={{ display: "grid", gap: "3px" }}>
              <strong style={{ color: "#ef4444" }}>Vùng nguy hiểm: Xóa tài khoản</strong>
              <span style={{ color: "var(--ink-faint)", fontSize: "13px" }}>Khi xóa tài khoản, toàn bộ dữ liệu trên đám mây sẽ bị gỡ bỏ vĩnh viễn.</span>
            </div>
            <div>
              <button
                className="secondary-button"
                style={{
                  borderColor: "#ef4444",
                  color: "#ef4444",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  padding: "5px 11px",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Xóa tài khoản
              </button>
            </div>
          </section>
        )}

        <div className="settings-footer">
          <button
            className="secondary-button"
            onClick={() => {
              onThemeChange("paper");
              onTextureChange("soft");
            }}
          >
            Về mặc định
          </button>
          <button className="primary-button" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <Modal onClose={closeDeleteConfirm}>
          <div className="delete-account-confirm-modal" style={{ padding: "20px", maxWidth: "400px" }}>
            <div className="modal-kicker" style={{ color: "#ef4444" }}>Xác nhận xóa tài khoản</div>
            <button className="modal-close" onClick={closeDeleteConfirm} aria-label="Đóng">
              <X size={18} />
            </button>
            <h3 style={{ marginTop: "15px", color: "#ef4444", fontSize: "18px" }}>Hành động này không thể hoàn tác!</h3>
            <p style={{ margin: "10px 0 20px 0", fontSize: "13px", lineHeight: "1.5", color: "var(--ink-faint)" }}>
              Toàn bộ dữ liệu của bạn trên đám mây (bao gồm các dự án, đếm ngày, kho lưu trữ và cài đặt) sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </p>
            
            <form onSubmit={handleDeleteSubmit}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "var(--ink)" }}>
                  Để xác nhận, vui lòng nhập chính xác cụm từ <span style={{ color: "#ef4444", borderBottom: "2px solid #ef4444", paddingBottom: "1px" }}>XÓA VĨNH VIỄN</span> bên dưới:
                </label>
                <input
                  type="text"
                  required
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="XÓA VĨNH VIỄN"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line-strong)", borderRadius: "6px", backgroundColor: "var(--paper)", color: "var(--ink)", fontFamily: "inherit" }}
                  disabled={isDeleting}
                />
              </div>

              {deleteError && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "15px" }}>
                  {deleteError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeDeleteConfirm}
                  disabled={isDeleting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ backgroundColor: "#ef4444", color: "#fff", borderColor: "#ef4444" }}
                  disabled={isDeleting || confirmInput.trim().toUpperCase() !== "XÓA VĨNH VIỄN"}
                >
                  {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function EndWeekModal({
  label,
  onClose,
  onEnd,
}: {
  label: string;
  onClose: () => void;
  onEnd: (mode: "carry" | "clear") => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="end-week-modal">
        <div className="modal-kicker">Kết thúc tuần</div>
        <button className="modal-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>
        <h3>{label}</h3>
        <p>
          Tuần này sẽ được lưu vào kho lưu trữ. Bạn muốn xử lý các việc chưa
          hoàn thành như thế nào?
        </p>
        <div className="end-week-options">
          <button onClick={() => onEnd("carry")}>
            <MoveRight size={17} />
            <span>
              <strong>Chuyển việc chưa xong sang tuần sau</strong>
              <small>Giữ các việc còn mở và bắt đầu tuần mới.</small>
            </span>
          </button>
          <button onClick={() => onEnd("clear")}>
            <Circle size={17} />
            <span>
              <strong>Xóa hết bảng hiện tại</strong>
              <small>Bắt đầu tuần mới với bảng trống.</small>
            </span>
          </button>
        </div>
        <button className="secondary-button full-button" onClick={onClose}>
          Hủy
        </button>
      </div>
    </Modal>
  );
}

function StatsView({
  planner,
  onBack,
}: {
  planner: PlannerState;
  onBack: () => void;
}) {
  const archives = planner.archives || [];
  
  // Overview Calculations
  const totalProjects = planner.projects.length;
  const activeTasks = planner.projects.flatMap((p) => p.tasks);
  const totalActiveTasks = activeTasks.length;
  const completedActiveTasks = activeTasks.filter((t) => t.completed).length;
  const activeCompletionRate = totalActiveTasks
    ? Math.round((completedActiveTasks / totalActiveTasks) * 100)
    : 0;
  const totalCounters = planner.dayCounters.length;

  // Eisenhower Matrix Breakdown
  const q1 = activeTasks.filter((t) => t.important && t.urgent).length;
  const q2 = activeTasks.filter((t) => t.important && !t.urgent).length;
  const q3 = activeTasks.filter((t) => !t.important && t.urgent).length;
  const q4 = activeTasks.filter((t) => !t.important && !t.urgent).length;

  // Scheduled Tasks by Day
  const dayStats = dayKeys.map((day) => {
    const totalOnDay = activeTasks.filter((t) => t.days.includes(day)).length;
    const completedOnDay = activeTasks.filter(
      (t) => t.days.includes(day) && (t.completed || t.completedDays?.includes(day))
    ).length;
    const rate = totalOnDay ? Math.round((completedOnDay / totalOnDay) * 100) : 0;
    return {
      day,
      label: dayLabels[day],
      total: totalOnDay,
      completed: completedOnDay,
      rate,
    };
  });

  // Find max task count on any day to scale schedule bars
  const maxDayTasks = Math.max(...dayStats.map((d) => d.total), 1);

  // Past Weeks Stats
  const totalArchivedTasks = archives.reduce((sum, w) => sum + w.total, 0);
  const totalArchivedCompleted = archives.reduce((sum, w) => sum + w.completed, 0);
  const archiveAverage = totalArchivedTasks
    ? Math.round((totalArchivedCompleted / totalArchivedTasks) * 100)
    : 0;

  return (
    <main className="stats-view-dashboard">
      <div className="stats-header">
        <button className="back-button" onClick={onBack}>
          <ChevronLeft size={15} /> Về kế hoạch
        </button>
        <h2>Báo cáo hiệu suất công việc</h2>
        <p>Thống kê chi tiết về tiến độ, mức độ ưu tiên và nhịp độ làm việc của bạn.</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid-summary">
        <div className="premium-stat-card">
          <div className="premium-stat-icon-wrapper">
            <Target size={20} />
          </div>
          <div className="premium-stat-info">
            <span className="premium-stat-label">Dự án đang chạy</span>
            <strong className="premium-stat-value">{totalProjects}</strong>
          </div>
        </div>

        <div className="premium-stat-card good">
          <div className="premium-stat-icon-wrapper">
            <Trophy size={20} />
          </div>
          <div className="premium-stat-info">
            <span className="premium-stat-label">Tỷ lệ hoàn thành</span>
            <strong className="premium-stat-value">{activeCompletionRate}%</strong>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="premium-stat-icon-wrapper">
            <CheckCircle2 size={20} />
          </div>
          <div className="premium-stat-info">
            <span className="premium-stat-label">Công việc tuần này</span>
            <strong className="premium-stat-value">
              {completedActiveTasks}/{totalActiveTasks}
            </strong>
          </div>
        </div>

        <div className="premium-stat-card good">
          <div className="premium-stat-icon-wrapper">
            <CalendarDays size={20} />
          </div>
          <div className="premium-stat-info">
            <span className="premium-stat-label">Bộ đếm ngày</span>
            <strong className="premium-stat-value">{totalCounters}</strong>
          </div>
        </div>
      </div>

      {/* Main Layout Columns */}
      <div className="stats-layout-cols">
        {/* Left Column */}
        <div>
          {/* Projects Progress */}
          <section className="stats-section-card">
            <h3 className="stats-section-title">
              <Target size={16} /> Tiến độ từng dự án
            </h3>
            {planner.projects.length === 0 ? (
              <p style={{ color: "var(--ink-faint)", fontSize: "13px" }}>
                Chưa có dự án nào đang chạy.
              </p>
            ) : (
              <div className="project-progress-list">
                {planner.projects.map((project) => {
                  const total = project.tasks.length;
                  const completed = project.tasks.filter((t) => t.completed).length;
                  const rate = total ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div className="project-progress-item" key={project.id}>
                      <div className="project-progress-meta">
                        <span>{project.title || "Dự án chưa đặt tên"}</span>
                        <span>
                          {completed}/{total} ({rate}%)
                        </span>
                      </div>
                      <div className="project-progress-bar-wrapper">
                        <div
                          className="project-progress-bar-fill"
                          style={{
                            width: `${rate}%`,
                            backgroundColor: project.titleColor || "var(--accent)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Eisenhower Matrix Quadrants */}
          <section className="stats-section-card">
            <h3 className="stats-section-title">
              <BarChart3 size={16} /> Phân nhóm việc theo mức ưu tiên
            </h3>
            <div className="eisenhower-stats-matrix">
              <div className="matrix-stat-quadrant q-urgent-important">
                <strong>{q1}</strong>
                <span>Khẩn cấp & Quan trọng</span>
              </div>
              <div className="matrix-stat-quadrant q-important">
                <strong>{q2}</strong>
                <span>Quan trọng, không khẩn</span>
              </div>
              <div className="matrix-stat-quadrant">
                <strong>{q3}</strong>
                <span>Khẩn cấp, không quan trọng</span>
              </div>
              <div className="matrix-stat-quadrant">
                <strong>{q4}</strong>
                <span>Không khẩn & Không quan trọng</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div>
          {/* Week Schedule Distribution */}
          <section className="stats-section-card">
            <h3 className="stats-section-title">
              <CalendarClock size={16} /> Phân bố công việc theo ngày
            </h3>
            {totalActiveTasks === 0 ? (
              <p style={{ color: "var(--ink-faint)", fontSize: "13px" }}>
                Chưa lên lịch cho công việc nào tuần này.
              </p>
            ) : (
              <div className="day-schedule-list">
                {dayStats.map((d) => {
                  const widthPercent = (d.total / maxDayTasks) * 100;
                  return (
                    <div className="day-schedule-row" key={d.day}>
                      <span className="day-schedule-label">{d.label}</span>
                      <div className="day-schedule-bar-container">
                        <div
                          className="day-schedule-bar-fill"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <span className="day-schedule-count">
                        {d.completed}/{d.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Archived Weeks History */}
          {archives.length > 0 && (
            <section className="stats-section-card">
              <h3 className="stats-section-title">
                <ArchiveIcon size={16} /> Hiệu suất các tuần đã qua
              </h3>
              <div className="chart-heading" style={{ marginBottom: "15px" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>
                    Tỷ lệ hoàn thành trung bình của {archives.length} tuần trước:
                  </span>
                  <h2 style={{ fontSize: "20px", margin: "4px 0 0 0" }}>{archiveAverage}%</h2>
                </div>
              </div>
              <div className="bar-chart" style={{ display: "flex", gap: "10px", height: "120px", alignItems: "flex-end", paddingTop: "20px" }}>
                {[...archives].reverse().map((week) => {
                  const rate = week.total
                    ? Math.round((week.completed / week.total) * 100)
                    : 0;
                  return (
                    <div className="bar-item" key={week.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <div className="bar-track" style={{ width: "100%", height: "80px", background: "var(--line)", borderRadius: "4px", display: "flex", alignItems: "flex-end", overflow: "hidden", position: "relative" }}>
                        <i style={{ display: "block", width: "100%", height: `${Math.max(rate, 4)}%`, background: "var(--good)" }} />
                        <span style={{ position: "absolute", top: "2px", left: "50%", transform: "translateX(-50%)", fontSize: "8px", fontWeight: "bold", color: "var(--ink)" }}>{rate}%</span>
                      </div>
                      <small style={{ fontSize: "8px", color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", maxWidth: "45px" }}>{week.label}</small>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function ArchiveView({
  archives,
  onBack,
  onDelete,
}: {
  archives: ArchivedWeek[];
  onBack: () => void;
  onDelete: (archiveId: string) => void;
}) {
  return (
    <main className="standalone-view">
      <button className="back-button" onClick={onBack}>
        <ChevronLeft size={15} /> Về kế hoạch
      </button>
      {archives.length === 0 ? (
        <div className="empty-state">
          <ArchiveIcon size={28} />
          <p>Chưa có tuần nào trong lưu trữ. Bấm “Kết thúc tuần” để lưu tuần đầu tiên.</p>
        </div>
      ) : (
        <div className="archive-list">
          {archives.map((week) => {
            const rate = week.total
              ? Math.round((week.completed / week.total) * 100)
              : 0;
            return (
              <details className="archive-card" key={week.id}>
                <summary>
                  <div>
                    <span>Tuần đã lưu</span>
                    <strong>{week.label}</strong>
                  </div>
                  <div className="archive-score">
                    <b>
                      {week.completed}/{week.total}
                    </b>
                    <span>{rate}%</span>
                  </div>
                </summary>
                <div className="archive-projects">
                  {week.projects.length === 0 ? (
                    <p>Tuần này chưa có dự án nào.</p>
                  ) : (
                    week.projects.map((project) => (
                      <div key={project.id}>
                        <h3>{project.title || "Dự án chưa đặt tên"}</h3>
                        {project.tasks.map((task) => (
                          <p
                            className={task.completed ? "is-complete" : ""}
                            key={task.id}
                          >
                            <span>{task.completed ? "✓" : "○"}</span>
                            {task.title || "Công việc chưa đặt tên"}
                          </p>
                        ))}
                      </div>
                    ))
                  )}
                  <button
                    className="delete-archive"
                    onClick={() => {
                      if (window.confirm(`Xóa tuần đã lưu “${week.label}”?`)) {
                        onDelete(week.id);
                      }
                    }}
                  >
                    <Trash2 size={13} /> Xóa bản lưu
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default App;
