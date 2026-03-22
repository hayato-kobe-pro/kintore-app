<script setup lang="ts">
definePageMeta({
  layout: false,
});

useHead({ title: "セットアップ" });
</script>

<template>
  <div class="setup-page">
    <main class="setup-card">
      <h1 class="setup-title">Firebase の設定が必要です</h1>
      <p class="setup-lead">
        データは Firestore に保存されます。プロジェクトルートの
        <code>nuxt-app/.env</code> に Firebase Web の公開設定を入れてください。
      </p>
      <ul class="setup-list">
        <li><code>NUXT_PUBLIC_FIREBASE_API_KEY</code></li>
        <li><code>NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code></li>
        <li><code>NUXT_PUBLIC_FIREBASE_PROJECT_ID</code></li>
        <li><code>NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET</code></li>
        <li><code>NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</code></li>
        <li><code>NUXT_PUBLIC_FIREBASE_APP_ID</code></li>
      </ul>
      <p class="setup-hint">
        テンプレートは <code>.env.example</code> を参照。保存後に開発サーバーを再起動してください。
      </p>
    </main>
  </div>
</template>

<style scoped>
.setup-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f5f5f5;
}
.setup-card {
  max-width: 520px;
  background: #fff;
  border-radius: 12px;
  padding: 28px 24px;
  border: 1px solid #e5e5e5;
}
.setup-title {
  margin: 0 0 12px;
  font-size: 1.25rem;
}
.setup-lead {
  margin: 0 0 16px;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #404040;
}
.setup-list {
  margin: 0 0 16px;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.7;
}
.setup-list code {
  font-size: 0.8125rem;
}
.setup-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: #737373;
}
</style>
