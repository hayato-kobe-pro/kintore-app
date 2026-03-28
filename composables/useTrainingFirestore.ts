import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { ymd } from "~/utils/conditionGraphCore";
import {
  firestoreBlocked,
  firestoreOk,
  MSG_NO_FIRESTORE,
  MSG_NO_USER,
  toUserFirestoreMessage,
  type FirestorePersistResult,
} from "~/utils/firestorePersist";

const TRAINING_MEMO_MAX = 300;

function clampTrainingMemo(s: string): string {
  if (s.length <= TRAINING_MEMO_MAX) return s;
  return s.slice(0, TRAINING_MEMO_MAX);
}

function firstExerciseRowIndex(sets: unknown[]): number | null {
  for (let i = 0; i < sets.length; i++) {
    const row = sets[i];
    if (!row || typeof row !== "object") continue;
    const ex = String((row as { exercise?: unknown }).exercise ?? "").trim();
    if (ex) return i;
  }
  return null;
}

/**
 * 種目ブロックごとのメモ（キーはそのブロック先頭セットの `sets` 配列インデックスの文字列）。
 * 旧フィールド `memo`（1日1件）のみあるドキュメントは、先頭種目ブロックへだけ移行して読む。
 */
function parseExerciseMemosFromDoc(data: {
  sets?: unknown;
  memo?: unknown;
  exerciseMemos?: unknown;
}): Record<string, string> {
  const sets = Array.isArray(data.sets) ? data.sets : [];
  const out: Record<string, string> = {};
  const raw = data.exerciseMemos;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof k !== "string" || k === "") continue;
      if (v == null) continue;
      const s = clampTrainingMemo(String(v));
      if (s) out[k] = s;
    }
  }
  if (Object.keys(out).length === 0) {
    const legacy = data.memo != null ? String(data.memo).trim() : "";
    if (legacy) {
      const idx = firstExerciseRowIndex(sets);
      if (idx != null) out[String(idx)] = clampTrainingMemo(legacy);
    }
  }
  return out;
}

export type TrainingDayDoc = {
  sets: unknown[];
  exerciseMemos: Record<string, string>;
  /** @deprecated 互換のため残すが、保存時は常に空に上書きする */
  memo: string;
};

export function useTrainingFirestore() {
  const nuxtApp = useNuxtApp();
  const { user, waitUntilReady } = useFirebaseAuth();

  async function fetchRange(
    startYmd: string,
    endYmd: string,
    options?: { forUserId?: string },
  ): Promise<Record<string, unknown[]>> {
    await waitUntilReady();
    const uid = options?.forUserId ?? user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return {};
    const col = collection(db, "users", uid, "training");
    const q = query(
      col,
      where(documentId(), ">=", startYmd),
      where(documentId(), "<=", endYmd),
    );
    const snap = await getDocs(q);
    const out: Record<string, unknown[]> = {};
    snap.forEach((d) => {
      const data = d.data() as { sets?: unknown };
      out[d.id] = Array.isArray(data.sets) ? data.sets : [];
    });
    return out;
  }

  /**
   * 直近のトレーニング日（新しい順）。管理画面の一覧用。
   * `orderBy(documentId())` は環境によってインデックス／評価で失敗することがあるため、
   * `fetchRange` と同じ range クエリで取得し、クライアント側で ID 降順に並べる。
   */
  async function listTrainingDaysDesc(
    limitCount: number,
    options?: { forUserId?: string },
  ): Promise<{ dateYmd: string; sets: unknown[] }[]> {
    await waitUntilReady();
    const uid = options?.forUserId ?? user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return [];

    const maxDays = Math.min(500, Math.max(1, limitCount));
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (maxDays - 1));

    const map = await fetchRange(ymd(start), ymd(end), options);
    const keys = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return keys.map((dateYmd) => ({
      dateYmd,
      sets: map[dateYmd] ?? [],
    }));
  }

  async function getDay(dateYmd: string): Promise<TrainingDayDoc | null> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return null;
    const snap = await getDoc(doc(db, "users", uid, "training", dateYmd));
    if (!snap.exists()) return null;
    const data = snap.data() as {
      sets?: unknown;
      memo?: unknown;
      exerciseMemos?: unknown;
    };
    const sets = Array.isArray(data.sets) ? data.sets : [];
    const exerciseMemos = parseExerciseMemosFromDoc(data);
    return { sets, exerciseMemos, memo: "" };
  }

  async function saveDay(
    dateYmd: string,
    sets: unknown[],
    exerciseMemos: Record<string, string>,
  ): Promise<FirestorePersistResult> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!db) return firestoreBlocked(MSG_NO_FIRESTORE);
    if (!uid) return firestoreBlocked(MSG_NO_USER);
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(exerciseMemos)) {
      if (typeof k !== "string" || k === "") continue;
      if (v == null) continue;
      const s = clampTrainingMemo(String(v));
      if (s) cleaned[k] = s;
    }
    try {
      await setDoc(
        doc(db, "users", uid, "training", dateYmd),
        {
          sets: JSON.parse(JSON.stringify(sets)),
          exerciseMemos: cleaned,
          memo: "",
        },
        { merge: true },
      );
      return firestoreOk();
    } catch (e) {
      return { ok: false, message: toUserFirestoreMessage(e) };
    }
  }

  return { fetchRange, listTrainingDaysDesc, getDay, saveDay };
}
