import type { TextureLevel, ThemeId } from "./themes";

export const dayKeys = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type DayKey = (typeof dayKeys)[number];
export type PlannerViewMode = "week" | "matrix";
export type DefaultPage = "plan" | "days";
export type DayCounterMode = "up" | "down";
export type ProgressionStyle = "cultivation" | "expedition" | "love";

export interface DayMemory {
  id: string;
  title: string;
  body: string;
  image?: string;
  happenedAt: string;
  createdAt: string;
}

export interface DayCounter {
  id: string;
  title: string;
  subtitle: string;
  mode: DayCounterMode;
  anchorDate: string;
  progressionStyle: ProgressionStyle;
  levelEveryDays?: number;
  coverImage?: string;
  memories: DayMemory[];
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  titleBold?: boolean;
  titleItalic?: boolean;
  titleColor?: string;
  important?: boolean;
  urgent?: boolean;
  completed: boolean;
  days: DayKey[];
  deadline: string;
  deadlineTime?: string;
  reminderEnabled?: boolean;
  description: string;
  subtasks: Subtask[];
  completedDays?: DayKey[];
  completedDates?: string[];
  createdAt?: string;
}

export interface Project {
  id: string;
  title: string;
  titleBold?: boolean;
  titleItalic?: boolean;
  titleColor?: string;
  important?: boolean;
  urgent?: boolean;
  icon?: string;
  deadline: string;
  deadlineTime?: string;
  tasks: Task[];
}

export interface ArchivedWeek {
  id: string;
  label: string;
  start: string;
  end: string;
  completed: number;
  total: number;
  projects: Project[];
  archivedAt: string;
}

export interface PlannerState {
  projects: Project[];
  archives: ArchivedWeek[];
  dayCounters: DayCounter[];
  weekOffset: number;
  focusDay: DayKey;
  showAllDays: boolean;
  viewMode: PlannerViewMode;
  defaultPage: DefaultPage;
  themeId: ThemeId;
  texture: TextureLevel;
}

export const dayLabels: Record<DayKey, string> = {
  mon: "T2",
  tue: "T3",
  wed: "T4",
  thu: "T5",
  fri: "T6",
  sat: "T7",
  sun: "CN",
};

export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createTask = (): Task => ({
  id: createId(),
  title: "",
  titleBold: false,
  titleItalic: false,
  titleColor: "",
  important: false,
  urgent: false,
  completed: false,
  days: [],
  deadline: "",
  deadlineTime: "",
  reminderEnabled: false,
  description: "",
  subtasks: [],
  completedDays: [],
  completedDates: [],
  createdAt: toIsoDate(new Date()),
});

export const createProject = (): Project => ({
  id: createId(),
  title: "",
  titleBold: false,
  titleItalic: false,
  titleColor: "",
  important: false,
  urgent: false,
  icon: "✦",
  deadline: "",
  deadlineTime: "",
  tasks: [],
});

export const createDayCounter = (): DayCounter => ({
  id: createId(),
  title: "",
  subtitle: "",
  mode: "up",
  anchorDate: toIsoDate(new Date()),
  progressionStyle: "love",
  coverImage: "",
  memories: [],
  createdAt: new Date().toISOString(),
});

export const startOfWeek = (date = new Date()) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + diff);
  return result;
};

export const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

export const getWeekDates = (offset: number) => {
  const start = addDays(startOfWeek(), offset * 7);
  return dayKeys.map((key, index) => ({
    key,
    date: addDays(start, index),
  }));
};

export const formatWeekRange = (offset: number) => {
  const dates = getWeekDates(offset);
  const start = dates[0].date;
  const end = dates[6].date;
  const startMonth = start.getMonth() + 1;
  const endMonth = end.getMonth() + 1;

  if (startMonth === endMonth) {
    return `${start.getDate()} – ${end.getDate()} Thg ${endMonth}`;
  }

  return `${start.getDate()} Thg ${startMonth} – ${end.getDate()} Thg ${endMonth}`;
};

export const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayKey = (): DayKey => {
  const jsDay = new Date().getDay();
  if (jsDay === 0) return "sun";
  return dayKeys[jsDay - 1];
};

export const countTasks = (projects: Project[]) => {
  const tasks = projects.flatMap((project) => project.tasks);
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.completed).length,
  };
};

export const countProjectTasks = (project: Project) => ({
  total: project.tasks.length,
  completed: project.tasks.filter((task) => task.completed).length,
});

export const initialState: PlannerState = {
  projects: [],
  archives: [],
  dayCounters: [],
  weekOffset: 0,
  focusDay: getTodayKey(),
  showAllDays: false,
  viewMode: "week",
  defaultPage: "plan",
  themeId: "paper",
  texture: "soft",
};

const storageKey = "weeknote-planner-v1";

export const loadPlanner = (): PlannerState => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return initialState;
    const parsed = JSON.parse(stored) as Partial<PlannerState>;
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects.map((project, projectIndex) => ({
          ...project,
          titleBold: project.titleBold ?? false,
          titleItalic: project.titleItalic ?? false,
          titleColor: project.titleColor ?? "",
          important: project.important ?? false,
          urgent: project.urgent ?? false,
          icon: project.icon ?? projectIconsForMigration[projectIndex % projectIconsForMigration.length],
          deadlineTime: project.deadlineTime ?? "",
          tasks: Array.isArray(project.tasks)
            ? project.tasks.map((task) => ({
                ...task,
                titleBold: task.titleBold ?? false,
                titleItalic: task.titleItalic ?? false,
                titleColor: task.titleColor ?? "",
                important: task.important ?? false,
                urgent: task.urgent ?? false,
                deadlineTime: task.deadlineTime ?? "",
                reminderEnabled: task.reminderEnabled ?? false,
                subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
                completedDays: Array.isArray(task.completedDays)
                  ? task.completedDays
                  : (task.completed ? [...task.days] : []),
                completedDates: (() => {
                  if (Array.isArray(task.completedDates) && task.completedDates.length > 0) {
                    return task.completedDates;
                  }
                  const daysToMigrate = Array.isArray(task.completedDays)
                    ? task.completedDays
                    : (task.completed ? [...task.days] : []);
                  if (daysToMigrate.length > 0) {
                    const currentWeek = getWeekDates(0);
                    return daysToMigrate.map(day => {
                      const idx = dayKeys.indexOf(day);
                      return idx !== -1 ? toIsoDate(currentWeek[idx].date) : "";
                    }).filter(Boolean);
                  }
                  return [];
                })(),
                createdAt: (() => {
                  const currentVal = task.createdAt;
                  if (!currentVal || currentVal === "2026-06-20") {
                    if (task.deadline) {
                      const d = new Date(`${task.deadline}T12:00:00`);
                      if (!Number.isNaN(d.getTime())) {
                        const calculated = toIsoDate(addDays(d, -28));
                        return calculated < task.deadline ? calculated : task.deadline;
                      }
                    }
                  }
                  return currentVal || toIsoDate(new Date());
                })(),
              }))
            : [],
        }))
      : [];
    const dayCounters = Array.isArray(parsed.dayCounters)
      ? parsed.dayCounters.map((counter) => ({
          ...counter,
          subtitle: counter.subtitle ?? "",
          coverImage: counter.coverImage ?? "",
          memories: Array.isArray(counter.memories)
            ? counter.memories.map((memory) => ({
                ...memory,
                title: memory.title ?? "",
                body: memory.body ?? "",
                image: memory.image ?? "",
                happenedAt:
                  memory.happenedAt ?? toIsoDate(new Date(memory.createdAt)),
              }))
            : [],
        }))
      : [];
    return {
      ...initialState,
      ...parsed,
      projects,
      dayCounters,
      archives: Array.isArray(parsed.archives) ? parsed.archives : [],
    };
  } catch {
    return initialState;
  }
};

export const savePlanner = (state: PlannerState) => {
  localStorage.setItem(storageKey, JSON.stringify(state));
};

const projectIconsForMigration = ["✦", "◆", "○", "▲", "⚑", "✎"];

export const getScheduledDates = (
  startDateStr: string,
  endDateStr: string,
  days: DayKey[]
): string[] => {
  if (!days.length || !startDateStr || !endDateStr) return [];
  const start = new Date(`${startDateStr}T12:00:00`);
  const end = new Date(`${endDateStr}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }
  const result: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const jsDay = current.getDay();
    const dayKey = jsDay === 0 ? "sun" : dayKeys[jsDay - 1];
    if (days.includes(dayKey)) {
      result.push(toIsoDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
};

export const getTaskStartDate = (task: Task): string => {
  const base = task.createdAt || task.deadline || toIsoDate(new Date());
  if (!task.completedDates || task.completedDates.length === 0) {
    return base;
  }
  let minDate = base;
  for (const d of task.completedDates) {
    if (d && d < minDate) {
      minDate = d;
    }
  }
  return minDate;
};
