# DAIKI Fit（Nuxt 版）

ルート直下の静的 HTML アプリと同じデータ（`localStorage` のキー）を使うクライアント専用（`ssr: false`）の Nuxt 3 アプリです。

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

## メール／パスワード認証（Firebase Authentication）

`.env` に `NUXT_PUBLIC_FIREBASE_*` を設定すると、**未ログイン時は `/login` にリダイレクト**されます。変数が **空のまま**のときは認証なし（従来どおり `localStorage` のみ）で動きます。

1. [Firebase Console](https://console.firebase.google.com/) → プロジェクト → **Authentication** → **Sign-in method** で **メール／パスワード** を有効化
2. プロジェクト設定 → 全般 → **マイアプリ** の Web 設定から値をコピー
3. `nuxt-app` に `.env` を作成（`.env.example` を参考）:

```bash
cp .env.example .env
# 各キーを編集
```

4. `npm run dev` を再起動

ログイン後、ドロワーメニュー下部にメールアドレスと **ログアウト** が表示されます。

本番（Firebase Hosting など）では、Console の **承認済みドメイン** にデプロイ先のドメインを追加してください。

## ルーティング

| パス | 内容 |
|------|------|
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

- 同じ `localStorage` キー（例: `kintore-daily-v1`, `kintore-training-v1`, `kintore-sessions-v1` など）を共有するため、**同じオリジンで開けばデータは引き続き使えます**（別ポートでもオリジンが異なるため共有されません）。
