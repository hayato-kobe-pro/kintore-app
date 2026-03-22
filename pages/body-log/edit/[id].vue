<script setup lang="ts">
const route = useRoute();
const entryId = computed(() => String(route.params.id ?? ""));

useHead({ title: "ボディログ — 編集" });
</script>

<template>
  <main class="main">
    <div class="sessions-back-wrap">
      <NuxtLink to="/body-log" class="sessions-back-btn">
        <span class="sessions-back-btn__mark" aria-hidden="true">＜</span>一覧へ
      </NuxtLink>
    </div>
    <h1 class="page-title">ボディログを編集</h1>

    <BodyLogEntryForm
      v-if="entryId"
      :key="entryId"
      :entry-id="entryId"
    />
  </main>
</template>

<style>
@import "~/assets/css/body-log.css";
@import "~/assets/css/sessions.css";
</style>
