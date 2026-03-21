const SESSIONS_STORAGE_KEY = "kintore-sessions-v1";

const SESSION_PRESETS = [
  { id: "chest-shoulder", title: "胸 & 肩" },
  { id: "back-triceps", title: "背中 & 三頭" },
  { id: "legs-biceps", title: "脚 & 二頭" },
] as const;

function sessionsDefaultState() {
  return { byId: {} as Record<string, unknown>, customOrder: [] as string[] };
}

function sessionsLoadState() {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return sessionsDefaultState();
    const p = JSON.parse(raw) as {
      byId?: Record<string, unknown>;
      customOrder?: string[];
      customList?: { id: string; title?: string; notes?: string }[];
    };
    const byId = p.byId && typeof p.byId === "object" ? { ...p.byId } : {};
    let customOrder = Array.isArray(p.customOrder) ? [...p.customOrder] : [];
    if (customOrder.length === 0 && Array.isArray(p.customList)) {
      p.customList.forEach((item) => {
        if (item?.id) {
          byId[item.id] = {
            custom: true,
            title: item.title || "無題",
            notes: item.notes || "",
          };
          customOrder.push(item.id);
        }
      });
    }
    return { byId, customOrder };
  } catch {
    return sessionsDefaultState();
  }
}

function sessionsSaveState(state: ReturnType<typeof sessionsDefaultState>) {
  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(state));
}

function normalizeSessionExercises(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (typeof x === "string" ? x : (x as { name?: string })?.name))
    .map((n) => (n != null ? String(n).trim() : ""))
    .filter(Boolean);
}

export type SessionRow = {
  id: string;
  title: string;
  preset: boolean;
  notes: string;
  exercises: string[];
};

export const KintoreSessions = {
  PRESETS: SESSION_PRESETS,

  listSessions(): SessionRow[] {
    const state = sessionsLoadState();
    const rows: SessionRow[] = SESSION_PRESETS.map((def) => {
      const extra = (state.byId[def.id] || {}) as {
        title?: string;
        notes?: string;
        exercises?: unknown;
      };
      const override = extra.title != null ? String(extra.title).trim() : "";
      return {
        id: def.id,
        title: override || def.title,
        preset: true,
        notes: extra.notes ?? "",
        exercises: Array.isArray(extra.exercises)
          ? normalizeSessionExercises(extra.exercises)
          : [],
      };
    });
    (state.customOrder || []).forEach((id) => {
      const row = state.byId[id] as
        | { custom?: boolean; title?: string; notes?: string; exercises?: unknown }
        | undefined;
      if (row?.custom) {
        rows.push({
          id,
          title: row.title || "無題のセッション",
          preset: false,
          notes: row.notes ?? "",
          exercises: Array.isArray(row.exercises)
            ? normalizeSessionExercises(row.exercises)
            : [],
        });
      }
    });
    return rows;
  },

  getSession(id: string | undefined | null): SessionRow | null {
    if (!id) return null;
    const state = sessionsLoadState();
    const preset = SESSION_PRESETS.find((p) => p.id === id);
    const row = state.byId[id] as
      | { title?: string; notes?: string; exercises?: unknown; custom?: boolean }
      | undefined;
    if (preset) {
      const override = row?.title != null ? String(row.title).trim() : "";
      return {
        id,
        title: override || preset.title,
        preset: true,
        notes: row?.notes ?? "",
        exercises: Array.isArray(row?.exercises)
          ? normalizeSessionExercises(row.exercises)
          : [],
      };
    }
    if (row?.custom) {
      return {
        id,
        title: row.title || "無題のセッション",
        preset: false,
        notes: row.notes ?? "",
        exercises: Array.isArray(row.exercises)
          ? normalizeSessionExercises(row.exercises)
          : [],
      };
    }
    return null;
  },

  updateSession(
    id: string,
    patch: { title?: string; notes?: string; exercises?: string[] },
  ): boolean {
    const state = sessionsLoadState();
    const preset = SESSION_PRESETS.find((p) => p.id === id);
    const prev = (state.byId[id] || {}) as Record<string, unknown>;
    if (preset) {
      const next = {
        ...prev,
        notes: patch.notes != null ? String(patch.notes) : (prev.notes as string) ?? "",
      };
      if (patch.title != null) {
        const t = String(patch.title).trim();
        if (t === "" || t === preset.title) delete next.title;
        else next.title = t;
      }
      if (patch.exercises != null)
        next.exercises = normalizeSessionExercises(patch.exercises);
      state.byId[id] = next;
    } else if ((prev as { custom?: boolean }).custom) {
      const next = {
        custom: true,
        title:
          patch.title != null
            ? String(patch.title).trim() || "無題のセッション"
            : (prev.title as string) || "無題のセッション",
        notes: patch.notes != null ? String(patch.notes) : (prev.notes as string) ?? "",
      } as Record<string, unknown>;
      if (patch.exercises != null)
        next.exercises = normalizeSessionExercises(patch.exercises);
      else if (Array.isArray(prev.exercises))
        next.exercises = prev.exercises;
      state.byId[id] = next;
    } else {
      return false;
    }
    sessionsSaveState(state);
    return true;
  },

  addCustomSession(title: string): string {
    const t = String(title || "").trim() || "無題のセッション";
    const id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const state = sessionsLoadState();
    state.byId[id] = { custom: true, title: t, notes: "" };
    state.customOrder = state.customOrder || [];
    state.customOrder.push(id);
    sessionsSaveState(state);
    return id;
  },
};
