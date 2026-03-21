function safeInternalPath(path: unknown, fallback = "/") {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  return path;
}

/**
 * Firebase が設定されているときだけ必須認証。
 * 未設定のときは従来どおり localStorage のみ（開発用）。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public;
  if (!config.firebaseApiKey) return;

  const nuxtApp = useNuxtApp();
  const fb = nuxtApp.$firebaseAuth;
  if (!fb) return;

  await fb.whenReady;
  const user = useState<import("firebase/auth").User | null>(
    "firebase-auth-user",
  );

  if (to.path === "/login") {
    if (user.value) {
      const path = safeInternalPath(to.query.redirect, "/");
      return navigateTo(path);
    }
    return;
  }

  if (!user.value) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});
