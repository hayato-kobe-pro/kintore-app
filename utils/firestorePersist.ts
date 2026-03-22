export type FirestorePersistResult =
  | { ok: true }
  | { ok: false; message: string };

export function firestoreOk(): FirestorePersistResult {
  return { ok: true };
}

export function firestoreBlocked(message: string): FirestorePersistResult {
  return { ok: false, message };
}

/** Firestore / Firebase エラーを画面上の日本語に寄せる */
export function toUserFirestoreMessage(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = String((e as { code?: string }).code);
    if (code === "permission-denied") {
      return "Firestore への書き込みが拒否されました。Firebase Console で Firestore を作成し、セキュリティルールをデプロイしてください（例: users/{uid}/** は本人のみ read/write）。";
    }
    if (code === "unauthenticated") {
      return "認証の有効期限が切れた可能性があります。再度ログインしてください。";
    }
    if (code === "unavailable" || code === "failed-precondition") {
      return "Firestore に接続できません。ネットワークとプロジェクト設定を確認してください。";
    }
  }
  if (e instanceof Error) return e.message;
  return "保存に失敗しました。";
}

export const MSG_NO_FIRESTORE =
  "Firestore に接続していません。`nuxt-app/.env` に NUXT_PUBLIC_FIREBASE_* を設定し、`npm run dev` を再起動してください。静的ホストする場合は **ビルド時** に同じ変数を渡してください。";

export const MSG_NO_USER =
  "ログイン情報がありません。再度ログインしてください。";
