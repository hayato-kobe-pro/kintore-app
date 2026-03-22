import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  addCustomSessionInState,
  getSessionFromState,
  listSessionsFromState,
  parseSessionsState,
  sessionsDefaultState,
  updateSessionInState,
  type SessionRow,
  type SessionsState,
} from "~/utils/sessionsCore";

/**
 * トレーニングセッションを Firestore `users/{uid}/settings/sessions` に保存。
 */
export function useKintoreSessions() {
  const nuxtApp = useNuxtApp();
  const { user, waitUntilReady } = useFirebaseAuth();

  const state = useState<SessionsState>(
    "kintore-sessions-state",
    () => sessionsDefaultState(),
  );
  const ready = useState("kintore-sessions-ready", () => false);

  async function persist() {
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) return;
    await setDoc(
      doc(db, "users", uid, "settings", "sessions"),
      {
        byId: state.value.byId,
        customOrder: state.value.customOrder,
      },
      { merge: true },
    );
  }

  async function load() {
    await waitUntilReady();
    const uid = user.value?.uid;
    const db = nuxtApp.$firestoreDb;
    if (!uid || !db) {
      state.value = sessionsDefaultState();
      ready.value = true;
      return;
    }
    const snap = await getDoc(doc(db, "users", uid, "settings", "sessions"));
    state.value = snap.exists()
      ? parseSessionsState(snap.data())
      : sessionsDefaultState();
    ready.value = true;
  }

  watch(
    user,
    async () => {
      ready.value = false;
      await load();
    },
    { immediate: true },
  );

  function listSessions(): SessionRow[] {
    return listSessionsFromState(state.value);
  }

  function getSession(id: string | undefined | null): SessionRow | null {
    return getSessionFromState(state.value, id);
  }

  async function updateSession(
    id: string,
    patch: { title?: string; notes?: string; exercises?: string[] },
  ): Promise<boolean> {
    const ok = updateSessionInState(state.value, id, patch);
    if (ok) await persist();
    return ok;
  }

  async function addCustomSession(title: string): Promise<string> {
    const id = addCustomSessionInState(state.value, title);
    await persist();
    return id;
  }

  return {
    ready: readonly(ready),
    listSessions,
    getSession,
    updateSession,
    addCustomSession,
    refresh: load,
  };
}
