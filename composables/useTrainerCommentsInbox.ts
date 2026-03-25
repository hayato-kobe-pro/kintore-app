import {
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  fetchAdminUserComments,
  type AdminUserComment,
} from "~/composables/useAdminUserComments";
import { isAllowedTrainerCommentReactionEmoji } from "~/utils/trainerCommentReactions";

/**
 * ユーザー向けトレーナーコメントの取得、既読（`trainerCommentReads`）、
 * リアクション（`trainerCommentReactions`）の管理。
 */
export function useTrainerCommentsInbox() {
  const nuxtApp = useNuxtApp();
  const { user, waitUntilReady } = useFirebaseAuth();

  const comments = useState<AdminUserComment[]>(
    "trainer-inbox-comments",
    () => [],
  );
  const seenCommentIds = useState<string[]>("trainer-inbox-seen-ids", () => []);
  const reactions = useState<Record<string, string>>(
    "trainer-inbox-reactions",
    () => ({}),
  );
  const reactionSavingCommentId = useState<string | null>(
    "trainer-inbox-reaction-saving",
    () => null,
  );
  const loading = useState("trainer-inbox-loading", () => false);
  const error = useState<string | null>("trainer-inbox-error", () => null);

  function seenSet(): Set<string> {
    return new Set(seenCommentIds.value);
  }

  const unreadCount = computed(() => {
    const s = seenSet();
    return comments.value.filter((c) => !s.has(c.id)).length;
  });

  function isCommentRead(id: string): boolean {
    return seenSet().has(id);
  }

  async function loadReactions(uid: string): Promise<Record<string, string>> {
    const db = nuxtApp.$firestoreDb;
    if (!db) return {};
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

  async function loadSeenIds(uid: string): Promise<string[]> {
    const db = nuxtApp.$firestoreDb;
    if (!db) return [];
    const snap = await getDoc(
      doc(db, "users", uid, "settings", "trainerCommentReads"),
    );
    if (!snap.exists()) return [];
    const raw = snap.data()?.seenCommentIds;
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => String(x));
  }

  async function refreshInbox(): Promise<void> {
    await waitUntilReady();
    const uid = user.value?.uid;
    if (!uid) {
      comments.value = [];
      seenCommentIds.value = [];
      reactions.value = {};
      error.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const [list, seen, reactMap] = await Promise.all([
        fetchAdminUserComments(uid),
        loadSeenIds(uid),
        loadReactions(uid),
      ]);
      comments.value = list;
      seenCommentIds.value = seen;
      reactions.value = reactMap;
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "コメントの読み込みに失敗しました";
      comments.value = [];
      reactions.value = {};
    } finally {
      loading.value = false;
    }
  }

  /** 指定 ID を既読として保存（未読のみ Firestore に送る） */
  async function markCommentsAsSeen(ids: string[]): Promise<void> {
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db || ids.length === 0) return;
    const s = seenSet();
    const newIds = [...new Set(ids.map(String))].filter((id) => !s.has(id));
    if (newIds.length === 0) return;
    await waitUntilReady();
    await setDoc(
      doc(db, "users", uid, "settings", "trainerCommentReads"),
      {
        seenCommentIds: arrayUnion(...newIds),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    seenCommentIds.value = [...new Set([...seenCommentIds.value, ...newIds])];
  }

  async function markAllInListAsSeen(): Promise<void> {
    const ids = comments.value.map((c) => c.id);
    await markCommentsAsSeen(ids);
  }

  function reactionForComment(commentId: string): string | undefined {
    return reactions.value[commentId];
  }

  async function setCommentReaction(
    commentId: string,
    emoji: string | null,
  ): Promise<void> {
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    const id = commentId.trim();
    if (!uid || !db || !id) return;
    if (emoji != null && emoji !== "") {
      if (!isAllowedTrainerCommentReactionEmoji(emoji)) return;
      const current = reactions.value[id];
      if (current === emoji) {
        await setCommentReaction(id, null);
        return;
      }
    }
    await waitUntilReady();
    const ref = doc(db, "users", uid, "settings", "trainerCommentReactions");
    reactionSavingCommentId.value = id;
    try {
      if (emoji == null || emoji === "") {
        await updateDoc(ref, {
          [`reactions.${id}`]: deleteField(),
        }).catch((e: { code?: string }) => {
          if (e?.code === "not-found") return;
          throw e;
        });
        const next = { ...reactions.value };
        delete next[id];
        reactions.value = next;
      } else {
        if (!isAllowedTrainerCommentReactionEmoji(emoji)) return;
        await setDoc(
          ref,
          { reactions: { [id]: emoji }, updatedAt: serverTimestamp() },
          { merge: true },
        );
        reactions.value = { ...reactions.value, [id]: emoji };
      }
    } finally {
      reactionSavingCommentId.value = null;
    }
  }

  return reactive({
    comments,
    seenCommentIds,
    reactions,
    reactionSavingCommentId,
    loading,
    error,
    unreadCount,
    isCommentRead,
    reactionForComment,
    refreshInbox,
    markCommentsAsSeen,
    markAllInListAsSeen,
    setCommentReaction,
  });
}
