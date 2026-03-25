import { doc, getDoc } from "firebase/firestore";
import { isAllowedTrainerCommentReactionEmoji } from "~/utils/trainerCommentReactions";

/**
 * 管理画面用：対象ユーザーのトレーナーコメントへのリアクション
 * （`users/{uid}/settings/trainerCommentReactions`）
 */
export async function fetchTrainerCommentReactionsMap(
  targetUid: string,
): Promise<Record<string, string>> {
  const nuxtApp = useNuxtApp();
  const { waitUntilReady } = useFirebaseAuth();
  await waitUntilReady();
  const uid = targetUid.trim();
  const db = nuxtApp.$firestoreDb;
  if (!db || !uid) return {};
  const snap = await getDoc(
    doc(db, "users", uid, "settings", "trainerCommentReactions"),
  );
  if (!snap.exists()) return {};
  const raw = snap.data()?.reactions;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const s = String(v ?? "");
    if (isAllowedTrainerCommentReactionEmoji(s)) out[k] = s;
  }
  return out;
}
