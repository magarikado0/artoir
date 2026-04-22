# インフラ構成

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase（DB + Auth + Storage）
- **Hosting**: Vercel（Root Directory: `app`）

## データ構造

```
organizations
  └── exhibitions
        └── artworks
```

## URL設計

```
Artoir.jp/{org-slug}/exhibition/{exhibition-slug}
```

例：`Artoir.jp/kyodai-shodo/exhibition/2026-spring`

## Vercel設定

Root Directoryは `app` に設定する。

## 現在の開発状況

- モックアップHTML作成済み（`docs/design/mockups/`）
- Supabaseスキーマ：未設計
- 認証：未実装
