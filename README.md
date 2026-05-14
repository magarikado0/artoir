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
http://localhost:5173/**
http://127.0.0.1:5173/**
```

アプリ側では Google OAuth 開始時に現在の origin から `http://localhost:5173/login` のような `redirectTo` を渡しています。Vite のポートを変えた場合は、そのポートの URL も Supabase 側に追加してください。

Google Cloud Console の「承認済みのリダイレクト URI」にはローカル URL ではなく、Supabase プロジェクトの callback URL を登録します。

```
https://<project-ref>.supabase.co/auth/v1/callback
```

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase
- **Hosting**: Vercel（Root Directory: `app`）
