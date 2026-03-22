<script setup lang="ts">
useHead({ title: "トレーニングセッション" });

const kintoreSessions = useKintoreSessions();
const { ready } = kintoreSessions;

const tick = ref(0);
const sessions = computed(() => {
  tick.value;
  ready.value;
  return kintoreSessions.listSessions();
});

function bump() {
  tick.value += 1;
}

onMounted(() => {
  document.addEventListener("visibilitychange", onVisibility);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", onVisibility);
});

async function onVisibility() {
  if (document.visibilityState !== "visible") return;
  await kintoreSessions.refresh();
  bump();
}
</script>

<template>
  <main class="main">
    <h1 class="page-title">トレーニングセッション</h1>

    <section class="card" aria-labelledby="sessions-list-heading">
      <h2 id="sessions-list-heading" class="section-title">一覧</h2>
      <ul id="sessions-list" class="sessions-list">
        <li v-for="s in sessions" :key="s.id">
          <NuxtLink
            class="sessions-list__link"
            :to="`/training-sessions/${encodeURIComponent(s.id)}`"
          >
            <span>{{ s.title }}</span>
            <span aria-hidden="true">›</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <div class="sessions-actions">
      <NuxtLink to="/training-sessions/new" class="sessions-btn-primary">
        ＋ 新規セッション
      </NuxtLink>
    </div>
  </main>
</template>

<style>
@import "~/assets/css/sessions.css";
</style>
