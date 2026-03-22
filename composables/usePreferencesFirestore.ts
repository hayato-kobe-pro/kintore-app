import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { stripUndefined } from "~/utils/firestoreSanitize";
import {
  firestoreBlocked,
  firestoreOk,
  MSG_NO_FIRESTORE,
  MSG_NO_USER,
  toUserFirestoreMessage,
  type FirestorePersistResult,
} from "~/utils/firestorePersist";

/** グラフの期間など UI 設定: `users/{uid}/settings/preferences` */
export type KintorePreferences = {
  graphMode?: "week" | "month" | "custom";
  graphRangeStart?: string;
  graphRangeEnd?: string;
};

export function usePreferencesFirestore() {
  const nuxtApp = useNuxtApp();
  const { user, waitUntilReady } = useFirebaseAuth();

  async function load(): Promise<KintorePreferences> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return {};
    const snap = await getDoc(
      doc(db, "users", uid, "settings", "preferences"),
    );
    if (!snap.exists()) return {};
    return { ...(snap.data() as KintorePreferences) };
  }

  async function merge(
    patch: KintorePreferences,
  ): Promise<FirestorePersistResult> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!db) return firestoreBlocked(MSG_NO_FIRESTORE);
    if (!uid) return firestoreBlocked(MSG_NO_USER);
    const payload = stripUndefined(patch as Record<string, unknown>);
    try {
      await setDoc(
        doc(db, "users", uid, "settings", "preferences"),
        { ...payload, updatedAt: serverTimestamp() },
        { merge: true },
      );
      return firestoreOk();
    } catch (e) {
      return { ok: false, message: toUserFirestoreMessage(e) };
    }
  }

  return { load, merge };
}
