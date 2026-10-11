export const MISSION_THEMES = [
  { id: "flight", label: "Flight" },
  { id: "dark", label: "Night" },
  { id: "light", label: "Day" },
] as const;

export type MissionTheme = (typeof MISSION_THEMES)[number]["id"];

export const MISSION_THEME_STORAGE_KEY = "portfolio-mission-theme";
export const DEFAULT_MISSION_THEME: MissionTheme = "flight";
export const MISSION_THEME_IDS = MISSION_THEMES.map((theme) => theme.id);

// Runs while the document is still being parsed, before the first paint.
// Keep the whitelist derived from MISSION_THEMES so adding another palette
// cannot make the control accept it while a reload silently falls back.
export const MISSION_THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  MISSION_THEME_STORAGE_KEY,
)});if(${JSON.stringify(MISSION_THEME_IDS)}.indexOf(t)!==-1)document.documentElement.dataset.missionTheme=t}catch(e){}})()`;

export function isMissionTheme(value: unknown): value is MissionTheme {
  return MISSION_THEMES.some((theme) => theme.id === value);
}
