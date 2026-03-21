<script setup lang="ts">
import { KintoreSessions } from "~/utils/sessionsStore";

useHead({ title: "トレーニングセッション" });

const tick = ref(0);
const sessions = computed(() => {
  tick.value;
  return KintoreSessions.listSessions();
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

function onVisibility() {
  if (document.visibilityState === "visible") bump();
}
</script>

<template>
  <main class="main">
    <h1 class="page-title">トレーニングセッション</h1>

    <div class="sessions-actions">
      <NuxtLink to="/training-sessions/new" class="sessions-btn-primary">
        ＋ 新規セッション
      </NuxtLink>
    </div>

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
  </main>
</template>

<style src="~/assets/css/sessions.css"></style>
