<script setup lang="ts">
useHead({ title: "ボディログ — 新規" });
</script>

<template>
  <main class="main">
    <div class="sessions-back-wrap">
      <NuxtLink to="/body-log" class="sessions-back-btn">
        <span class="sessions-back-btn__mark" aria-hidden="true">＜</span>一覧へ
      </NuxtLink>
    </div>
    <h1 class="page-title">ボディログを追加</h1>

    <BodyLogEntryForm />
  </main>
</template>

<style>
@import "~/assets/css/body-log.css";
@import "~/assets/css/sessions.css";
</style>
