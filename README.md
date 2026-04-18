# Artport

展覧会ごとに作品をまとめて公開できるポータルサイト。

## ディレクトリ構造

```
artport/
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

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase
- **Hosting**: Vercel（Root Directory: `app`）
