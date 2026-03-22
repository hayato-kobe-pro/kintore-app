/** 旧 localStorage キーを削除（Firestore 移行後の混在防止） */
const LEGACY_KEYS = [
  "kintore-daily-v1",
  "kintore-training-v1",
  "kintore-sessions-v1",
  "kintore-profile-v1",
  "kintore-vision-v1",
  "kintore-body-log-v1",
];

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;
  const config = useRuntimeConfig().public;
  if (!config.firebaseApiKey) return;
  for (const k of LEGACY_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
});
