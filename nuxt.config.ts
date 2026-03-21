// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  telemetry: false,
  compatibilityDate: "2026-03-21",
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "DAIKI Fit",
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { name: "theme-color", content: "#ffffff" },
      ],
    },
  },
  css: ["~/assets/css/styles.css", "~/assets/css/site-header.css"],
  /** ブラウザが Vite の内部ポート（例: 24678）へ直接フェッチして ERR_CONNECTION_REFUSED になるのを防ぐ */
  vite: {
    server: {
      hmr: {
        // 開発時に `nuxt dev --port 4000` など使う場合は同じ番号に合わせる
        clientPort: Number(process.env.PORT || 3000),
      },
    },
  },
  nitro: {
    preset: "static",
    compatibilityDate: "2026-03-21",
  },
  runtimeConfig: {
    public: {
      firebaseApiKey: "",
      firebaseAuthDomain: "",
      firebaseProjectId: "",
      firebaseStorageBucket: "",
      firebaseMessagingSenderId: "",
      firebaseAppId: "",
    },
  },
});
