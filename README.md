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

### スマホから同じ Wi‑Fi で確認する

1. PC とスマホを **同じ Wi‑Fi** に接続する。
2. `nuxt-app` で `npm run dev` を実行する（`nuxt.config` で `devServer.host: "0.0.0.0"` 済み）。
3. **PC の LAN 上の IP** を調べる。例（Mac）: ターミナルで `ipconfig getifaddr en0`（Wi‑Fi が `en0` のとき）。Windows は `ipconfig` の「IPv4」。
4. スマホのブラウザで `http://<そのIP>:3000` を開く（ポートを変えた場合はその番号）。
5. PC のターミナルに出る **`Network: http://192.168.x.x:3000/`** と **完全一致**する URL をスマホで開く（`localhost` ではなく **数字の IP**）。
6. ブラウザに **`Blocked request. This host ("192.168…") is not allowed`** と出る／真っ白で何も出ないときは、`nuxt.config` の `vite.server.allowedHosts: true` が効いているか確認し、**`npm run dev` を再起動**する。
7. まだ繋がらないとき:
   - **macOS**: システム設定 → ネットワーク → ファイアウォール → オプションで、**Node** または **ターミナル / Cursor** の「着信接続をブロック」がオンならオフにする（または一時的にファイアウォールを切って試す）。
   - **PC / スマホの VPN・iCloud プライベートリレー**をオフにして試す。
   - **ルーターのゲスト Wi‑Fi**や「端末間通信を禁止」設定は、同じ SSID でも PC とスマホが互いに見えないことがある。通常の SSID に両方つなぐ。

Firebase のメールログインなどが LAN の IP では失敗する場合は、`localhost` 用トンネル（[ngrok](https://ngrok.com/) 等）で HTTPS URL を取り、Console の **承認済みドメイン** にそのホストを追加する方法があります。

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

`.env` に `NUXT_PUBLIC_FIREBASE_*` を設定すると、**未ログイン時は `/login` にリダイレクト**され、ログイン後は **Firestore** の `users/{uid}/...` にユーザー関連データを保存します。変数が **空のまま**のときは **`/setup`** のみ利用可能です。

### Firestore に保存されるデータ（ログインごと）

| ドキュメント / コレクション | 内容 |
|-----------------------------|------|
| `users/{uid}/daily/{yyyy-mm-dd}` | コンディション（体重・PFC・睡眠・体調など） |
| `users/{uid}/training/{yyyy-mm-dd}` | トレーニングセット |
| `users/{uid}/settings/sessions` | トレーニングセッション定義 |
| `users/{uid}/settings/profile` | プロフィール・目標（身長・体重・算出 PFC など） |
| `users/{uid}/settings/vision` | ビジョン文面 |
| `users/{uid}/settings/preferences` | コンディションログの表示期間（1週間／1ヶ月／期間指定と日付） |

ホームの「目標」表示とグラフの目標線は **プロフィール**の `goal*` を参照します（プロフィール画面で保存した値が使われます）。

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

### 保存してもリロードで消える・Firestore にドキュメントが増えないとき

- **`.env` は `nuxt-app` 直下**（`nuxt.config.ts` と同じフォルダ）。リポジトリルートにだけ `.env` があると読み込まれません。
- `.env` を変えたら **`npm run dev` を再起動**してください。
- **`npm run build` の静的出力**（`.output/public`）を配信している場合、`NUXT_PUBLIC_FIREBASE_*` は **ビルド実行時** にバンドルへ埋め込まれます。空のまま `npm run build` すると、認証以外が動かない／保存できないことがあります。
- Firebase Console で **Firestore Database を作成**済みか確認してください（未作成だと書き込みに失敗します）。
- **セキュリティルール**をデプロイし、ログインユーザーが自分の `users/{uid}/**` に書けるか確認してください。拒否されると画面上に赤い説明が出ます（開発者ツールの Console にも `permission-denied` が出ます）。
- Console で開いている **プロジェクト ID** と、`NUXT_PUBLIC_FIREBASE_PROJECT_ID` が一致しているか確認してください。

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
