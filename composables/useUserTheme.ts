const STORAGE_KEY = "kintore-user-theme";

function readStoredIsDark(): boolean {
  if (import.meta.server) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark";
  } catch {
    return false;
  }
}

function writeStored(isDark: boolean) {
  if (import.meta.server) return;
  try {
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}

function applyDataTheme(isDark: boolean) {
  if (!import.meta.client) return;
  const el = document.documentElement;
  if (isDark) el.dataset.userTheme = "dark";
  else delete el.dataset.userTheme;
}

/**
 * ログイン後のユーザー向け画面（default レイアウト）のダークモード。
 * 管理画面・ログイン画面は `admin-ui` / `auth-ui` でライト固定の CSS が上書きする。
 */
export function useUserTheme() {
  const isDark = useState<boolean>("user-theme-is-dark", () => false);

  function setDark(value: boolean) {
    isDark.value = value;
    applyDataTheme(value);
    writeStored(value);
    if (import.meta.client) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", value ? "#121212" : "#ffffff");
    }
  }

  function toggle() {
    setDark(!isDark.value);
  }

  /** default レイアウト表示時: 保存値を DOM に反映 */
  function syncFromStorage() {
    const dark = readStoredIsDark();
    isDark.value = dark;
    applyDataTheme(dark);
    if (import.meta.client) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta)
        meta.setAttribute("content", dark ? "#121212" : "#ffffff");
    }
  }

  return {
    isDark: readonly(isDark),
    setDark,
    toggle,
    syncFromStorage,
  };
}
