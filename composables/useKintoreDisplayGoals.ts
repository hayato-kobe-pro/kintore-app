import { displayGoalsFromProfile } from "~/utils/displayGoalsFromProfile";

/**
 * プロフィール（Firestore）由来の目標値。コンディション画面・グラフで共有。
 */
export function useKintoreDisplayGoals() {
  const profileFirestore = useProfileFirestore();
  const { user } = useFirebaseAuth();

  const goals = ref(displayGoalsFromProfile({}));

  async function refresh() {
    const raw = await profileFirestore.load();
    goals.value = displayGoalsFromProfile(raw);
  }

  watch(
    () => user.value?.uid,
    (uid, prevUid) => {
      if (!uid) {
        goals.value = displayGoalsFromProfile({});
        return;
      }
      if (prevUid === undefined) return;
      void refresh();
    },
  );

  return {
    goals: readonly(goals),
    refresh,
  };
}
