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
import {
  firestoreBlocked,
  firestoreOk,
  MSG_NO_FIRESTORE,
  MSG_NO_USER,
  toUserFirestoreMessage,
  type FirestorePersistResult,
} from "~/utils/firestorePersist";

export function useTrainingFirestore() {
  const nuxtApp = useNuxtApp();
  const { user, waitUntilReady } = useFirebaseAuth();

  async function fetchRange(
    startYmd: string,
    endYmd: string,
  ): Promise<Record<string, unknown[]>> {
    await waitUntilReady();
    const uid = user.value?.uid;
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

  async function getDay(dateYmd: string): Promise<unknown[] | null> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return null;
    const snap = await getDoc(doc(db, "users", uid, "training", dateYmd));
    if (!snap.exists()) return null;
    const sets = (snap.data() as { sets?: unknown }).sets;
    return Array.isArray(sets) ? sets : [];
  }

  async function saveDay(
    dateYmd: string,
    sets: unknown[],
  ): Promise<FirestorePersistResult> {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!db) return firestoreBlocked(MSG_NO_FIRESTORE);
    if (!uid) return firestoreBlocked(MSG_NO_USER);
    try {
      await setDoc(
        doc(db, "users", uid, "training", dateYmd),
        { sets: JSON.parse(JSON.stringify(sets)) },
        { merge: true },
      );
      return firestoreOk();
    } catch (e) {
      return { ok: false, message: toUserFirestoreMessage(e) };
    }
  }

  return { fetchRange, getDay, saveDay };
}
