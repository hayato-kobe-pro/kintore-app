function safeInternalPath(path: unknown, fallback = "/") {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  return path;
}

/**
 * Firebase 未設定時は /setup のみ。
 * 設定済みなら /setup はホームへ。ログイン必須（/login を除く）。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public;

  if (!config.firebaseApiKey) {
    if (to.path !== "/setup") {
      return navigateTo("/setup");
    }
    return;
  }

  if (to.path === "/setup") {
    return navigateTo("/");
  }

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
