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
import { stripUndefined } from "~/utils/firestoreSanitize";

export function useDailyFirestore() {
  const nuxtApp = useNuxtApp();
  const { user, waitUntilReady } = useFirebaseAuth();

  async function fetchRange(
    startYmd: string,
    endYmd: string,
  ): Promise<Record<string, Record<string, unknown>>> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return {};
    const col = collection(db, "users", uid, "daily");
    const q = query(
      col,
      where(documentId(), ">=", startYmd),
      where(documentId(), "<=", endYmd),
    );
    const snap = await getDocs(q);
    const out: Record<string, Record<string, unknown>> = {};
    snap.forEach((d) => {
      out[d.id] = { ...(d.data() as Record<string, unknown>) };
    });
    return out;
  }

  async function getDay(dateYmd: string): Promise<Record<string, unknown>> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return {};
    const snap = await getDoc(doc(db, "users", uid, "daily", dateYmd));
    return snap.exists()
      ? ({ ...(snap.data() as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  }

  async function mergeDay(
    dateYmd: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return;
    await setDoc(
      doc(db, "users", uid, "daily", dateYmd),
      stripUndefined(patch) as Record<string, unknown>,
      { merge: true },
    );
  }

  return { fetchRange, getDay, mergeDay };
}
