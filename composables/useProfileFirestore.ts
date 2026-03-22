import { doc, getDoc, setDoc } from "firebase/firestore";
import { stripUndefined } from "~/utils/firestoreSanitize";

export function useProfileFirestore() {
  const nuxtApp = useNuxtApp();
  const { user, waitUntilReady } = useFirebaseAuth();

  async function load(): Promise<Record<string, unknown>> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return {};
    const snap = await getDoc(doc(db, "users", uid, "settings", "profile"));
    return snap.exists()
      ? ({ ...(snap.data() as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  }

  async function merge(data: Record<string, unknown>): Promise<void> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return;
    await setDoc(
      doc(db, "users", uid, "settings", "profile"),
      stripUndefined(data) as Record<string, unknown>,
      { merge: true },
    );
  }

  return { load, merge };
}
