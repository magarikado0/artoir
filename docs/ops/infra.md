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
artoir.net/{org-slug}/exhibition/{exhibition-slug}
```

例：`artoir.net/kyodai-shodo/exhibition/2026-spring`

## Vercel設定

Root Directoryは `app` に設定する。

## 現在の開発状況

- モックアップHTML作成済み（`docs/design/mockups/`）
- Supabaseスキーマ：未設計
- 認証：未実装

## Supabase RLS（削除）

ダッシュボードの削除機能（団体・展覧会・作品）を使うには、`user_orgs` に紐づくメンバーが自分の org 配下の `organizations` / `exhibitions` / `artworks` / `user_orgs` を **DELETE** できる RLS ポリシーが必要。FK が `RESTRICT` の場合はアプリ側で子→親の順に削除しているが、`ON DELETE CASCADE` の追加を推奨。
