# DAIKI Fit（Nuxt 版）

クライアント専用（`ssr: false`）の Nuxt 3 アプリです。Firebase を設定した場合は **Firestore にユーザーごとにデータを保存**し、未設定時は `/setup` で案内のみ（または従来の開発用フローに依存）です。

## 必要環境

- **Node.js 18+**（推奨: **20 LTS** または **22+**）
- Node **v21** はエコシステムの一部が未対応のため非推奨です。`nuxi` が `node:util` の `styleText` を要求する場合は、本プロジェクトの `package.json` の **`overrides`** で `nuxi@3.14.0` に固定しているので、`npm install` 後は **Node 21 でもビルド可能**な構成にしています。

## セットアップ

```bash
cd nuxt-app
npm install
```

## 開発サーバー

```bash
npm run dev
```

ブラウザで表示された URL（通常は `http://localhost:3000`）を開きます。

### 画面が真っ白で `localhost:24678` の `ERR_CONNECTION_REFUSED` が出るとき

Vite が HMR 用に別ポートへクライアントを向けると、環境によってはそのポートに届かずスクリプト読み込みに失敗します。`nuxt.config.ts` の `vite.server.hmr.clientPort` を **実際に開いているポート（通常 3000）** に合わせてあります。別ポートで起動する場合は `PORT=4000 npm run dev` のように **`PORT` と同じ番号**になるよう `clientPort` を調整してください。

## 本番ビルド（静的出力）

```bash
npm run build
```

`nitro.preset: 'static'` のため、成果物は `.output/public` に出力されます。プレビュー例:

```bash
npx serve .output/public
```

## メール／パスワード認証（Firebase Authentication）と Firestore

`.env` に `NUXT_PUBLIC_FIREBASE_*` を設定すると、**未ログイン時は `/login` にリダイレクト**され、ログイン後は **Firestore** の `users/{uid}/...` に日次・トレーニング・セッション・プロフィール・ビジョンを保存します。変数が **空のまま**のときは **`/setup`** のみ利用可能です。

1. [Firebase Console](https://console.firebase.google.com/) → プロジェクト → **Authentication** → **Sign-in method** で **メール／パスワード** を有効化
2. **Firestore** を作成し、ルートの `firestore.rules` をデプロイ（`firebase deploy --only firestore:rules` など）。ルール例はリポジトリの `firestore.rules`（本人の `users/{uid}/**` のみ読み書き可）
3. プロジェクト設定 → 全般 → **マイアプリ** の Web 設定から値をコピー
4. `nuxt-app` に `.env` を作成（`.env.example` を参考）:

```bash
cp .env.example .env
# 各キーを編集
```

5. `npm run dev` を再起動

ログイン後、ドロワーメニュー下部にメールアドレスと **ログアウト** が表示されます。

本番（Firebase Hosting など）では、Console の **承認済みドメイン** にデプロイ先のドメインを追加してください。

初回ログイン時、クライアントは旧 `localStorage` キー（`kintore-*-v1`）を **削除**して Firestore との混在を防ぎます。

## ルーティング

| パス | 内容 |
|------|------|
| `/setup` | Firebase 未設定時の案内 |
| `/login` | ログイン・新規登録（Firebase 設定時のみガードの対象外） |
| `/` | コンディションレコード |
| `/graph` | コンディションログ（Chart.js） |
| `/training` | トレーニングレコード（`?date=YYYY-MM-DD` 可） |
| `/training-log` | トレーニングログ（カレンダー） |
| `/training-sessions` | セッション一覧 |
| `/training-sessions/new` | 新規セッション |
| `/training-sessions/:id` | セッション詳細・編集 |
| `/vision` | ビジョン |
| `/profile` | プロフィール |

## アセット

- `public/daiki-fit.png` … ヘッダーロゴ（リポジトリルートの画像をコピー済み。無い場合は同ファイルを置いてください）

## 静的版との関係

リポジトリルートの静的 HTML は別物です。Nuxt 版は Firebase 利用時 **クラウドのユーザー別データ**を参照し、ルート静的版の `localStorage` とは共有しません。
