<script setup lang="ts">
useHead({ title: "新規セッション" });

const title = ref("");
const submitError = ref<string | null>(null);
const kintoreSessions = useKintoreSessions();

async function onSubmit(e: Event) {
  e.preventDefault();
  submitError.value = null;
  try {
    const id = await kintoreSessions.addCustomSession(title.value);
    await navigateTo(`/training-sessions/${encodeURIComponent(id)}`);
  } catch (err) {
    submitError.value =
      err instanceof Error ? err.message : "登録に失敗しました。";
  }
}
</script>

<template>
  <main class="main">
    <div class="sessions-back-wrap">
      <NuxtLink to="/training-sessions" class="sessions-back-btn">
        <span class="sessions-back-btn__mark" aria-hidden="true">＜</span>戻る
      </NuxtLink>
    </div>
    <h1 class="page-title">新規セッション</h1>

    <p v-if="submitError" class="firestore-alert" role="alert">
      {{ submitError }}
    </p>

    <form class="card form-new-session" autocomplete="off" @submit="onSubmit">
      <div class="field">
        <span class="field-label">
          <span class="field-label-dot" style="background: var(--accent)" />
          セッション名
        </span>
        <input
          id="new-session-title"
          v-model="title"
          type="text"
          required
          maxlength="80"
          placeholder="例: 胸のみ、デッドリフト日 など"
        />
      </div>
      <button type="submit" class="sessions-btn-primary">登録して詳細へ</button>
    </form>
  </main>
</template>

<style>
@import "~/assets/css/sessions.css";
</style>
