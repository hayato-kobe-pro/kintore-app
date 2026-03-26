export default defineNuxtPlugin({
  name: "user-theme-init",
  enforce: "pre",
  setup() {
    const isDark = useState<boolean>("user-theme-is-dark", () => false);
    try {
      if (localStorage.getItem("kintore-user-theme") === "dark") {
        isDark.value = true;
        document.documentElement.dataset.userTheme = "dark";
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", "#121212");
      }
    } catch {
      /* ignore */
    }
  },
});
