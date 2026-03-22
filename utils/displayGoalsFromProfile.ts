/**
 * コンディション画面・グラフの「目標」表示用。
 * Firestore `users/{uid}/settings/profile` の goal* から取得し、未設定時はフォールバック。
 */
export const DISPLAY_GOAL_FALLBACKS: Record<
  | "weight"
  | "calories"
  | "protein"
  | "fat"
  | "carbs"
  | "fiber"
  | "sleep",
  number
> = {
  weight: 65,
  calories: 1844,
  protein: 152,
  fat: 31,
  carbs: 240,
  fiber: 20,
  sleep: 7,
};

export type DisplayGoalKey = keyof typeof DISPLAY_GOAL_FALLBACKS;

const PROFILE_KEY: Record<DisplayGoalKey, string> = {
  weight: "goalWeight",
  calories: "goalCalories",
  protein: "goalProtein",
  fat: "goalFat",
  carbs: "goalCarbs",
  fiber: "goalFiber",
  sleep: "goalSleep",
};

export function displayGoalsFromProfile(
  data: Record<string, unknown>,
): Record<DisplayGoalKey, number> {
  const out = { ...DISPLAY_GOAL_FALLBACKS };
  (Object.keys(PROFILE_KEY) as DisplayGoalKey[]).forEach((k) => {
    const pk = PROFILE_KEY[k];
    const v = data[pk];
    if (v === "" || v == null) return;
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  });
  return out;
}
