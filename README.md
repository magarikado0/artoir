# Artoir

展覧会ごとに作品をまとめて公開できるポータルサイト。

## ディレクトリ構造

```
Artoir/
├── app/        # アプリ本体（React + Vite）
├── docs/       # プロダクト・設計・運用ドキュメント
└── CLAUDE.md   # Claude Code 用プロジェクト文脈
```

## 開発環境のセットアップ

```bash
cd app
npm install
npm run dev
```

`app/.env.example` を `.env` にコピーして環境変数を設定してください。Cloudinary の `VITE_CLOUDINARY_UPLOAD_PRESET` は、アップロード先フォルダ・許可形式・サイズ制限を必ず設定した unsigned preset を使用してください。

### Google ログインのローカル開発設定

Google ログインは Supabase Auth の Redirect URL allowlist にローカル URL が入っていないと、Supabase の Site URL（本番デプロイ先）へ戻ります。Supabase Dashboard → Authentication → URL Configuration で、開発時に使う URL を追加してください。

```
http://localhost:5173/
http://localhost:5173/**
http://127.0.0.1:5173/
http://127.0.0.1:5173/**
http://192.168.0.8:5173/
http://192.168.0.8:5173/**
```

アプリ側では Google OAuth 開始時に現在の origin から `http://localhost:5173/` や `http://192.168.0.8:5173/` のような `redirectTo` を渡しています。Vite のポートや LAN IP が変わった場合は、その URL も Supabase 側に追加してください。

Google Cloud Console の「承認済みのリダイレクト URI」にはローカル URL ではなく、Supabase プロジェクトの callback URL を登録します。

```
https://<project-ref>.supabase.co/auth/v1/callback
```

## 作品画像の4隅クロップ（透視補正）

作品追加・編集時の画像調整は、4 隅を個別にドラッグして被写体に合わせる四辺形（クアッド）クロップです。確定時に透視変換（ホモグラフィ）で長方形へ補正するため、撮影時の傾き・遠近の歪みを一度に補正できます。

- UI 本体: `app/src/components/ArtworkImageAdjuster.jsx`
  - 4 隅のドラッグ可能なハンドル（Pointer Events でマウス・タッチ両対応、タッチ判定は見た目より大きめ）、辺の描画、ドラッグ中の拡大ルーペ、画像範囲内へのクランプ、「四隅にリセット」。
  - プレビューは縮小画像、確定時のみ原寸で変換。EXIF 回転は `createImageBitmap(..., { imageOrientation: 'from-image' })` で正規化。
  - 自己交差（凹み）した四辺形は凸判定で検知し、警告表示＋確定を無効化。
- 変換ロジック: `app/src/lib/perspectiveWarp.js`
  - ホモグラフィ行列を自前で解き、WebGL シェーダで逆写像サンプリングして補正画像を生成（WebGL 非対応時は Canvas の per-pixel にフォールバック）。OpenCV.js のような重い依存は使わない。
  - 出力サイズは辺の長さから算出（幅 = 上辺/下辺の長い方、高さ = 左辺/右辺の長い方）。0 除算・極小サイズはガードし、最大画素数で縮小。
- 使い方: `ArtworkCreateModal` / `ArtworkEditModal` が同コンポーネントを利用。props は従来の矩形クロップ版と互換のため、呼び出し側の変更は不要。確定すると補正済み Blob が `onConfirm` に渡される。

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase
- **Hosting**: Vercel（Root Directory: `app`）
