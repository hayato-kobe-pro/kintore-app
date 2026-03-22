/** NFKC + ひらがな → 全角カタカナ（種目名のあいまい検索用） */
export function normalizeForExerciseSearch(s: string): string {
  const t = s.normalize("NFKC");
  let out = "";
  for (const ch of t) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x3041 && c <= 0x3096) {
      out += String.fromCodePoint(c + 0x60);
    } else {
      out += ch;
    }
  }
  return out;
}

export function matchesExerciseSearch(name: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return normalizeForExerciseSearch(name).includes(normalizeForExerciseSearch(q));
}

/** 入力文字列がカタログのいずれかの種目と正規化後に一致すれば正式名を返す */
export function resolveExerciseNameFromInput(
  query: string,
  validNames: Set<string>,
  catalogNames: readonly string[],
): string | null {
  const q = query.trim();
  if (q === "") return null;
  if (validNames.has(q)) return q;
  const nq = normalizeForExerciseSearch(q);
  return catalogNames.find((name) => normalizeForExerciseSearch(name) === nq) ?? null;
}
