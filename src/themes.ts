export const plannerThemes = [
  {
    id: "paper",
    name: "Giấy nguyên bản",
    description: "Nền giấy ngà ấm với điểm nhấn đỏ gạch.",
    dark: false,
    colors: {
      accent: "#b5482e",
      accentHover: "#9f3d27",
      accentSoft: "#e9d9d2",
      bg: "#f4f1ea",
      good: "#4f7a4a",
      goodSoft: "#dde7da",
      ink: "#1c1a17",
      inkFaint: "#928b80",
      inkSoft: "#56514a",
      line: "#e2ddd2",
      lineStrong: "#d2ccbe",
      paper: "#fbfaf6",
      field: "#fffefa",
      task: "#f3f0e9",
      warm: "#9b7f70",
      overlay: "rgba(28, 26, 23, 0.36)",
    },
    softPattern:
      "radial-gradient(rgba(28, 26, 23, 0.035) 1px, transparent 1px)",
    richPattern:
      "radial-gradient(rgba(181, 72, 46, 0.055) 1px, transparent 1px), radial-gradient(rgba(28, 26, 23, 0.035) 1px, transparent 1px)",
    backgroundSize: "6px 6px, 18px 18px",
  },
  {
    id: "sage",
    name: "Xanh sage dịu",
    description: "Sắc xanh mềm cho những tuần cần bình tĩnh.",
    dark: false,
    colors: {
      accent: "#52705a",
      accentHover: "#405a48",
      accentSoft: "#dce7dd",
      bg: "#edf1e9",
      good: "#5e7d4c",
      goodSoft: "#dfe9d8",
      ink: "#202820",
      inkFaint: "#7e897b",
      inkSoft: "#4d5a4d",
      line: "#d9e0d5",
      lineStrong: "#c4cec0",
      paper: "#f8faf5",
      field: "#fcfdf9",
      task: "#edf2e9",
      warm: "#76856f",
      overlay: "rgba(25, 36, 27, 0.34)",
    },
    softPattern:
      "linear-gradient(rgba(82, 112, 90, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(82, 112, 90, 0.035) 1px, transparent 1px)",
    richPattern:
      "linear-gradient(rgba(82, 112, 90, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(82, 112, 90, 0.07) 1px, transparent 1px)",
    backgroundSize: "22px 22px",
  },
  {
    id: "ocean",
    name: "Dòng xanh biển",
    description: "Tông xanh mát với họa tiết chuyển động nhẹ.",
    dark: false,
    colors: {
      accent: "#286d8c",
      accentHover: "#1f5872",
      accentSoft: "#d6e8ef",
      bg: "#eaf2f4",
      good: "#397a6a",
      goodSoft: "#d8e9e4",
      ink: "#15242b",
      inkFaint: "#748891",
      inkSoft: "#405861",
      line: "#d4e1e5",
      lineStrong: "#bdcfd5",
      paper: "#f7fbfb",
      field: "#fbfefe",
      task: "#eaf3f5",
      warm: "#698691",
      overlay: "rgba(16, 37, 46, 0.36)",
    },
    softPattern:
      "radial-gradient(ellipse at 50% 0%, transparent 68%, rgba(40, 109, 140, 0.045) 70%, transparent 72%)",
    richPattern:
      "radial-gradient(ellipse at 50% 0%, transparent 65%, rgba(40, 109, 140, 0.09) 67%, transparent 70%)",
    backgroundSize: "48px 24px",
  },
  {
    id: "lavender",
    name: "Giờ lavender",
    description: "Tím lilac trầm với các sợi chéo tinh tế.",
    dark: false,
    colors: {
      accent: "#765da5",
      accentHover: "#60498d",
      accentSoft: "#e6def1",
      bg: "#f0edf5",
      good: "#647b56",
      goodSoft: "#e1e8dc",
      ink: "#26212d",
      inkFaint: "#89818f",
      inkSoft: "#5c5465",
      line: "#dfd9e7",
      lineStrong: "#cbc2d7",
      paper: "#faf8fc",
      field: "#fdfcff",
      task: "#f0ecf5",
      warm: "#887495",
      overlay: "rgba(34, 27, 43, 0.35)",
    },
    softPattern:
      "repeating-linear-gradient(135deg, transparent 0 11px, rgba(118, 93, 165, 0.025) 11px 12px)",
    richPattern:
      "repeating-linear-gradient(135deg, transparent 0 11px, rgba(118, 93, 165, 0.065) 11px 12px)",
    backgroundSize: "auto",
  },
  {
    id: "rose",
    name: "Hồng bụi",
    description: "Nền hồng phấn cùng chấm vintage mềm.",
    dark: false,
    colors: {
      accent: "#a64f65",
      accentHover: "#8b3d52",
      accentSoft: "#efdce2",
      bg: "#f6edef",
      good: "#647c5a",
      goodSoft: "#e0e9dc",
      ink: "#2b2023",
      inkFaint: "#967f85",
      inkSoft: "#655158",
      line: "#ead9de",
      lineStrong: "#d8c1c8",
      paper: "#fdf9fa",
      field: "#fffdfd",
      task: "#f6ecef",
      warm: "#9a6f7a",
      overlay: "rgba(45, 26, 32, 0.34)",
    },
    softPattern:
      "radial-gradient(rgba(166, 79, 101, 0.04) 1px, transparent 1px)",
    richPattern:
      "radial-gradient(rgba(166, 79, 101, 0.085) 1.2px, transparent 1.2px)",
    backgroundSize: "9px 9px",
  },
  {
    id: "midnight",
    name: "Bàn đêm",
    description: "Xanh navy sâu, thẻ ấm và những điểm sao nhỏ.",
    dark: true,
    colors: {
      accent: "#e58a68",
      accentHover: "#f19b78",
      accentSoft: "#49352f",
      bg: "#151a24",
      good: "#82ad77",
      goodSoft: "#293d2d",
      ink: "#f1eadf",
      inkFaint: "#8f96a3",
      inkSoft: "#c0bac0",
      line: "#303744",
      lineStrong: "#444c5a",
      paper: "#202631",
      field: "#262d39",
      task: "#292f39",
      warm: "#c19383",
      overlay: "rgba(4, 7, 12, 0.68)",
    },
    softPattern:
      "radial-gradient(rgba(241, 234, 223, 0.08) 0.7px, transparent 0.8px)",
    richPattern:
      "radial-gradient(rgba(241, 234, 223, 0.14) 0.8px, transparent 0.9px), radial-gradient(rgba(229, 138, 104, 0.1) 0.7px, transparent 0.8px)",
    backgroundSize: "18px 18px, 37px 37px",
  },
  {
    id: "forest",
    name: "Rừng sâu",
    description: "Xanh rừng tập trung với các vòng địa hình nhẹ.",
    dark: true,
    colors: {
      accent: "#d59a61",
      accentHover: "#e3aa72",
      accentSoft: "#483b2d",
      bg: "#18231f",
      good: "#8eb477",
      goodSoft: "#2d432f",
      ink: "#eff1e8",
      inkFaint: "#8f9d93",
      inkSoft: "#bdc8be",
      line: "#34433c",
      lineStrong: "#495a52",
      paper: "#222f2a",
      field: "#293832",
      task: "#2b3833",
      warm: "#c0a181",
      overlay: "rgba(5, 13, 10, 0.68)",
    },
    softPattern:
      "repeating-radial-gradient(circle at 0 0, transparent 0 17px, rgba(142, 180, 119, 0.035) 18px 19px)",
    richPattern:
      "repeating-radial-gradient(circle at 0 0, transparent 0 17px, rgba(142, 180, 119, 0.075) 18px 19px)",
    backgroundSize: "42px 42px",
  },
  {
    id: "coffee",
    name: "Ghi chú cà phê",
    description: "Nâu rang và giấy kem như sổ tay.",
    dark: false,
    colors: {
      accent: "#8b5537",
      accentHover: "#70432b",
      accentSoft: "#eadbcf",
      bg: "#eee6da",
      good: "#657449",
      goodSoft: "#e1e6d5",
      ink: "#2b211b",
      inkFaint: "#8d8075",
      inkSoft: "#5f5047",
      line: "#ded3c5",
      lineStrong: "#cbbcab",
      paper: "#faf6ef",
      field: "#fdfaf5",
      task: "#eee6dc",
      warm: "#96765f",
      overlay: "rgba(40, 29, 22, 0.38)",
    },
    softPattern:
      "repeating-linear-gradient(0deg, transparent 0 23px, rgba(139, 85, 55, 0.035) 23px 24px)",
    richPattern:
      "repeating-linear-gradient(0deg, transparent 0 23px, rgba(139, 85, 55, 0.075) 23px 24px), repeating-linear-gradient(90deg, transparent 0 23px, rgba(139, 85, 55, 0.035) 23px 24px)",
    backgroundSize: "auto",
  },
  {
    id: "sunset",
    name: "Hoàng hôn mềm",
    description: "Đào, đất nung và một đường chân trời ấm.",
    dark: false,
    colors: {
      accent: "#c15f42",
      accentHover: "#a94c33",
      accentSoft: "#f1ddd3",
      bg: "#f7eadf",
      good: "#728154",
      goodSoft: "#e5ead8",
      ink: "#30221d",
      inkFaint: "#9b8278",
      inkSoft: "#69534a",
      line: "#ead8cc",
      lineStrong: "#d7c0b2",
      paper: "#fdf8f3",
      field: "#fffdfa",
      task: "#f6e9df",
      warm: "#a56f5d",
      overlay: "rgba(46, 28, 21, 0.35)",
    },
    softPattern:
      "linear-gradient(180deg, rgba(231, 149, 102, 0.065), transparent 42%)",
    richPattern:
      "linear-gradient(180deg, rgba(231, 149, 102, 0.18), transparent 45%), repeating-linear-gradient(90deg, transparent 0 31px, rgba(193, 95, 66, 0.035) 31px 32px)",
    backgroundSize: "100% 100%, auto",
  },
  {
    id: "slate",
    name: "Slate hiện đại",
    description: "Xám graphite gọn với lưới blueprint sắc nét.",
    dark: false,
    colors: {
      accent: "#50677c",
      accentHover: "#3f5366",
      accentSoft: "#dce4eb",
      bg: "#edf0f2",
      good: "#58765d",
      goodSoft: "#dce7de",
      ink: "#20262c",
      inkFaint: "#7d8790",
      inkSoft: "#505c66",
      line: "#d9dee2",
      lineStrong: "#c4cbd1",
      paper: "#f9fafb",
      field: "#fdfefe",
      task: "#edf1f3",
      warm: "#748590",
      overlay: "rgba(25, 31, 37, 0.36)",
    },
    softPattern:
      "linear-gradient(rgba(80, 103, 124, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(80, 103, 124, 0.035) 1px, transparent 1px)",
    richPattern:
      "linear-gradient(rgba(80, 103, 124, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(80, 103, 124, 0.07) 1px, transparent 1px)",
    backgroundSize: "18px 18px",
  },
  {
    id: "sakura",
    name: "Sakura sáng",
    description: "Nền kem với cánh hoa hồng trôi nhẹ.",
    dark: false,
    colors: {
      accent: "#b85d74",
      accentHover: "#9e4a60",
      accentSoft: "#f0dce2",
      bg: "#f7f0ed",
      good: "#617e67",
      goodSoft: "#dce9df",
      ink: "#2d2425",
      inkFaint: "#958587",
      inkSoft: "#655657",
      line: "#e8ddda",
      lineStrong: "#d6c7c3",
      paper: "#fdfaf7",
      field: "#fffdfb",
      task: "#f6efeb",
      warm: "#a3767f",
      overlay: "rgba(43, 29, 31, 0.34)",
    },
    softPattern:
      "radial-gradient(ellipse at 20% 20%, rgba(184, 93, 116, 0.045) 0 2px, transparent 2.5px)",
    richPattern:
      "radial-gradient(ellipse at 20% 20%, rgba(184, 93, 116, 0.11) 0 2.5px, transparent 3px), radial-gradient(ellipse at 70% 60%, rgba(184, 93, 116, 0.07) 0 2px, transparent 2.5px)",
    backgroundSize: "38px 38px, 57px 57px",
  },
  {
    id: "immortal",
    name: "Tiên cảnh",
    description: "Ngọc bích, ánh kim và linh khí xoay quanh nền trời sâu.",
    dark: true,
    colors: {
      accent: "#e7c76b",
      accentHover: "#f4dc8a",
      accentSoft: "#384939",
      bg: "#0c1717",
      good: "#7ed9ad",
      goodSoft: "#1f4135",
      ink: "#f3ecd5",
      inkFaint: "#8ca49a",
      inkSoft: "#c4d2c6",
      line: "#28413b",
      lineStrong: "#3d5b51",
      paper: "#142522",
      field: "#1b302b",
      task: "#1b302b",
      warm: "#d1ad73",
      overlay: "rgba(3, 12, 11, 0.72)",
    },
    softPattern:
      "radial-gradient(circle at 18% 22%, rgba(126, 217, 173, 0.09) 0 1px, transparent 1.5px), radial-gradient(circle at 78% 64%, rgba(231, 199, 107, 0.07) 0 1px, transparent 1.5px)",
    richPattern:
      "repeating-radial-gradient(circle at 50% 45%, transparent 0 34px, rgba(126, 217, 173, 0.045) 35px 36px), radial-gradient(circle at 18% 22%, rgba(126, 217, 173, 0.16) 0 1px, transparent 1.8px), radial-gradient(circle at 78% 64%, rgba(231, 199, 107, 0.13) 0 1px, transparent 1.8px)",
    backgroundSize: "140px 140px, 29px 29px, 47px 47px",
  },
] as const;

export type ThemeId = (typeof plannerThemes)[number]["id"];
export type TextureLevel = "clean" | "soft" | "rich";

export const getTheme = (themeId: ThemeId) =>
  plannerThemes.find((theme) => theme.id === themeId) ?? plannerThemes[0];

export const applyPlannerTheme = (
  themeId: ThemeId,
  texture: TextureLevel,
) => {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  const variableNames: Record<keyof typeof theme.colors, string> = {
    accent: "--accent",
    accentHover: "--accent-hover",
    accentSoft: "--accent-soft",
    bg: "--bg",
    good: "--good",
    goodSoft: "--good-soft",
    ink: "--ink",
    inkFaint: "--ink-faint",
    inkSoft: "--ink-soft",
    line: "--line",
    lineStrong: "--line-strong",
    paper: "--paper",
    field: "--field",
    task: "--task",
    warm: "--warm",
    overlay: "--modal-overlay",
  };

  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(
      variableNames[key as keyof typeof theme.colors],
      value,
    );
  });

  root.style.setProperty(
    "--bg-image",
    texture === "clean"
      ? "none"
      : texture === "rich"
        ? theme.richPattern
        : theme.softPattern,
  );
  root.style.setProperty("--bg-size", theme.backgroundSize);
  root.dataset.theme = theme.id;
  root.dataset.texture = texture;
  root.style.colorScheme = theme.dark ? "dark" : "light";
};
