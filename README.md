# お題当てオンライン（仮）

ゲームマスター(GM)1名 vs プレイヤー(P1, P2)2名で遊ぶ、リアルタイムのお題当て対戦ゲームです。
出題者と回答者に分かれて、Socket.IOの同期機能を用いたチャット形式で進行します。

## 使用技術
- Frontend: React, Bootstrap 5, Vite
- Backend: Node.js (Express), Socket.io, SQLite3

---

## 💻 ローカル開発手順

1. **パッケージのインストール**
   ```bash
   npm install
   ```
2. **開発サーバーの起動**
   ```bash
   npm run dev
   ```
   フロントエンド(Vite)とバックエンド(nodemon)が同時起動します。
   ブラウザで `http://localhost:5173/` (Vite側のポート) にアクセスして操作してください。
   (APIおよびWebSocketの通信は `http://localhost:8080` へプロキシされます)

## 🐛 デバッグ方法

- **ブラウザ側**: Chrome等のDevToolsのコンソールタブを開き、コンポーネントのログやSocketの接続状態(`Connecting...`, `Socket connected`)を確認できます。
- **サーバー側**: `npm run dev` を実行しているターミナルに、ユーザーの入室(`User connected: ...`)や、クリーンアップ処理のログ(`Cleaned up old room...`)が出力されます。

---

## 🚀 Koyeb デプロイガイド

KoyebのNanoインスタンスでデプロイすることを想定した設定です。

1. **GitHubリポジトリの作成とプッシュ**
   このプロジェクトをGitHubリポジトリにプッシュします。

2. **KoyebでのApp作成**
   - デプロイのソースとして「GitHub」を選択。
   - 対象のリポジトリを選択。

3. **ビルドおよびラン・コマンド設定**
   Koyebのデプロイ設定画面で、オーバーライド設定(Override)を使用します。
   - **Build Command**: `npm run build`
   - **Run Command**: `npm start`
   - *(補足: `package.json`には `npm start` 時に `node server.js` を実行するように記述されています)*

4. **ポート設定 (PORT)**
   - Expose(公開ポート)の設定で、ポート番号を `8080` に設定します。
   - Expressサーバー側で `process.env.PORT` を優先して受け取るようになっているため、Koyebが指定したポートで自動的に立ち上がります。

5. **データ永続化における注意事項**
   - 本ゲームでは SQLite3 をファイル(`database.sqlite`)で管理しています。
   - Koyebの仕様上、デプロイや再起動によってローカルファイルは初期化されます。進行中のセッションはリセットされますが、1回ごとの短期ゲームであることを前提とした仕様です。
