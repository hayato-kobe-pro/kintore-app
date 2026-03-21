<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

useHead({ title: "ログイン" });

const route = useRoute();
const {
  isConfigured,
  waitUntilReady,
  signInWithEmail,
  signUpWithEmail,
  user,
} = useFirebaseAuth();

const mode = ref<"login" | "register">("login");
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const pending = ref(false);

function safeInternalPath(path: unknown, fallback = "/") {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }
  return path;
}

onMounted(async () => {
  const config = useRuntimeConfig().public;
  if (!config.firebaseApiKey) {
    errorMessage.value =
      "Firebase が未設定です。.env に NUXT_PUBLIC_FIREBASE_* を設定してください。";
    return;
  }
  await waitUntilReady();
  if (user.value) {
    await navigateTo(safeInternalPath(route.query.redirect, "/"));
  }
});

function firebaseErrorMessage(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-email": "メールアドレスの形式が正しくありません。",
    "auth/user-disabled": "このアカウントは無効です。",
    "auth/user-not-found": "メールまたはパスワードが正しくありません。",
    "auth/wrong-password": "メールまたはパスワードが正しくありません。",
    "auth/invalid-credential":
      "メールまたはパスワードが正しくありません。",
    "auth/email-already-in-use": "このメールアドレスは既に登録されています。",
    "auth/weak-password":
      "パスワードが弱すぎます。6文字以上にしてください。",
    "auth/too-many-requests": "試行回数が多すぎます。しばらく待ってから再度お試しください。",
    "auth/network-request-failed": "ネットワークエラーです。接続を確認してください。",
  };
  return map[code] ?? "エラーが発生しました。もう一度お試しください。";
}

async function onSubmit() {
  errorMessage.value = "";
  if (!isConfigured.value) return;
  pending.value = true;
  try {
    if (mode.value === "login") {
      await signInWithEmail(email.value.trim(), password.value);
    } else {
      await signUpWithEmail(email.value.trim(), password.value);
    }
    await navigateTo(safeInternalPath(route.query.redirect, "/"));
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    errorMessage.value = firebaseErrorMessage(code);
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <main class="main auth-page">
    <h1 class="page-title">
      {{ mode === "login" ? "ログイン" : "新規登録" }}
    </h1>

    <div class="auth-card card">
      <div class="auth-mode-seg" role="group" aria-label="モード">
        <button
          type="button"
          class="auth-mode-btn"
          :class="{ 'is-active': mode === 'login' }"
          :aria-pressed="mode === 'login' ? 'true' : 'false'"
          @click="mode = 'login'"
        >
          ログイン
        </button>
        <button
          type="button"
          class="auth-mode-btn"
          :class="{ 'is-active': mode === 'register' }"
          :aria-pressed="mode === 'register' ? 'true' : 'false'"
          @click="mode = 'register'"
        >
          新規登録
        </button>
      </div>

      <form class="auth-form" @submit.prevent="onSubmit">
        <div class="field">
          <label class="field-label" for="auth-email">
            <span
              class="field-label-dot"
              style="background: var(--accent)"
            />
            メールアドレス
          </label>
          <input
            id="auth-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            inputmode="email"
            placeholder="you@example.com"
          />
        </div>
        <div class="field">
          <label class="field-label" for="auth-password">
            <span
              class="field-label-dot"
              style="background: var(--c-weight)"
            />
            パスワード
          </label>
          <input
            id="auth-password"
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            required
            minlength="6"
            placeholder="6文字以上"
          />
        </div>

        <p v-if="errorMessage" class="auth-error" role="alert">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="auth-submit"
          :disabled="pending || !isConfigured"
        >
          {{ pending ? "処理中…" : mode === "login" ? "ログイン" : "登録する" }}
        </button>
      </form>
    </div>
  </main>
</template>

<style src="~/assets/css/auth.css"></style>
