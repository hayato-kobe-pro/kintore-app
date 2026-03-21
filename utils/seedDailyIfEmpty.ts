const STORAGE_KEY = "kintore-daily-v1";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hasAnyFiniteWeight(entries: Record<string, { weight?: unknown }>) {
  for (const k of Object.keys(entries)) {
    const e = entries[k];
    if (!e || typeof e !== "object") continue;
    const w = e.weight;
    if (w !== "" && w != null && Number.isFinite(Number(w))) {
      return true;
    }
  }
  return false;
}

function buildDemoEntries() {
  const entries: Record<
    string,
    {
      weight: number;
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
      fiber: number;
      sleep: number;
      condition: string;
    }
  > = {};
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  for (let ago = 40; ago >= 0; ago -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - ago);
    const key = ymd(d);
    const i = 40 - ago;

    const w =
      69.2 - i * 0.014 + Math.sin(i / 16) * 0.18 + Math.sin(i / 31) * 0.08;
    const weight = Math.round(Math.max(67.5, Math.min(70.5, w)) * 10) / 10;

    const calories = Math.round(
      1960 + Math.sin(i / 12) * 55 + Math.sin(i / 23) * 28,
    );
    const protein = Math.round(
      116 + Math.sin(i / 10) * 5 + Math.sin(i / 19) * 2,
    );
    const fat = Math.round(
      59 + Math.sin(i / 11) * 3.5 + Math.sin(i / 17) * 1.5,
    );
    const carbs = Math.round(
      230 + Math.sin(i / 13) * 14 + Math.sin(i / 21) * 6,
    );
    const fiber = Math.round((17.8 + Math.sin(i / 9) * 1.4) * 10) / 10;
    const sleep = Math.round((6.95 + Math.sin(i / 14) * 0.28) * 10) / 10;

    entries[key] = {
      weight,
      calories,
      protein,
      fat,
      carbs,
      fiber,
      sleep,
      condition: i % 22 === 17 ? "不調" : "普通",
    };
  }
  return entries;
}

/** 初回のみデモデータを入れる（既存の静的HTML版と同じキー） */
export function seedDailyIfEmpty() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let entries: Record<string, { weight?: unknown }> = {};
    if (raw) {
      const parsed = JSON.parse(raw) as { entries?: Record<string, unknown> };
      entries =
        parsed.entries && typeof parsed.entries === "object"
          ? (parsed.entries as Record<string, { weight?: unknown }>)
          : {};
    }
    if (hasAnyFiniteWeight(entries)) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ entries: buildDemoEntries() }),
    );
  } catch {
    /* ignore */
  }
}
