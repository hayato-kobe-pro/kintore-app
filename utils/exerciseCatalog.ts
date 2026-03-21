/** トレーニング種目と解説ページURL（セッション・レコードで共通） */
const KINTORE_EXERCISE_ENTRIES = [
  {
    name: "ベンチプレス",
    guideUrl:
      "https://ja.wikipedia.org/wiki/%E3%83%99%E3%83%B3%E3%83%81%E3%83%97%E3%83%AC%E3%82%B9",
  },
  {
    name: "インクラインダンベルプレス",
    guideUrl:
      "https://www.youtube.com/results?search_query=%E3%82%A4%E3%83%B3%E3%82%AF%E3%83%A9%E3%82%A4%E3%83%B3%E3%83%80%E3%83%B3%E3%83%99%E3%83%AB%E3%83%97%E3%83%AC%E3%82%B9%20%E3%83%95%E3%82%A9%E3%83%BC%E3%83%A0",
  },
  {
    name: "マシンチェストプレス",
    guideUrl:
      "https://www.youtube.com/results?search_query=%E3%83%9E%E3%82%B7%E3%83%B3%E3%83%81%E3%82%A7%E3%82%B9%E3%83%88%E3%83%97%E3%83%AC%E3%82%B9%20%E3%82%84%E3%82%8A%E6%96%B9",
  },
  {
    name: "ケーブルクロスオーバー",
    guideUrl:
      "https://www.youtube.com/results?search_query=%E3%82%B1%E3%83%BC%E3%83%96%E3%83%AB%E3%82%AF%E3%83%AD%E3%82%B9%E3%82%AA%E3%83%BC%E3%83%90%E3%83%BC%20%E3%83%95%E3%82%A9%E3%83%BC%E3%83%A0",
  },
  {
    name: "ミリタリープレス",
    guideUrl:
      "https://www.youtube.com/results?search_query=%E3%83%9F%E3%83%AA%E3%82%BF%E3%83%AA%E3%83%BC%E3%83%97%E3%83%AC%E3%82%B9%20%E3%82%84%E3%82%8A%E6%96%B9",
  },
] as const;

export const KintoreExerciseCatalog = {
  entries: KINTORE_EXERCISE_ENTRIES,
  names(): string[] {
    return KINTORE_EXERCISE_ENTRIES.map((e) => e.name);
  },
  guideUrl(name: string): string {
    const n = String(name || "").trim();
    const hit = KINTORE_EXERCISE_ENTRIES.find((e) => e.name === n);
    return hit?.guideUrl ?? "";
  },
  isValid(name: string): boolean {
    const n = String(name || "").trim();
    return KINTORE_EXERCISE_ENTRIES.some((e) => e.name === n);
  },
};
