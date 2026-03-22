<template>
  <div class="auth-layout">
    <header class="auth-layout__header">
      <NuxtLink
        to="/"
        class="site-logo"
        aria-label="ホーム（DAIKI Fit）"
        :prefetch="false"
      >
        <span class="site-logo__mark" aria-hidden="true">
          <img
            src="/daiki-fit.png"
            alt=""
            class="site-logo__img"
            width="36"
            height="36"
            decoding="async"
          />
        </span>
        <span class="site-logo__text">DAIKI Fit</span>
      </NuxtLink>
    </header>
    <slot />
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100dvh;
  background: var(--bg, #f5f5f5);
}
.auth-layout__header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #e5e5e5);
  background: #fff;
}
</style>
