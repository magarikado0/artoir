# Infra Notes

> 最終更新: 2026-07-05

## Hosting — Cloudflare Workers

- 本番: https://artoir.net
- デプロイ: `cd app && npm run deploy`（wrangler。設定は `app/wrangler.jsonc`）
- `app/worker/index.js` が `/sitemap.xml` を生成、それ以外は SPA アセット配信（`not_found_handling: single-page-application`）
- ※ 旧ドキュメントの「Vercel（Root Directory: app）」は廃止済み

## Images — Cloudinary

- 作品・サムネイル画像は Supabase Storage ではなく Cloudinary に保存
- unsigned upload preset（`VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET`）でクライアントから直接アップロード。preset 側でフォルダ・許可形式・サイズ制限を必ず設定する
- アップロード前にクライアントで長辺 1920px に圧縮するため、**元解像度は残らない**（図録印刷対応時の課題 → `monetization.md`）

## Supabase model

Current development schema is defined by:

- `docs/ops/rebuild-profiles-organizations.sql`
- `docs/ops/profile-artworks-without-exhibitions.sql`（プロフィール作品を合成展覧会から artworks.profile_id へ移行）
- `docs/ops/add-favorites.sql`
- `docs/ops/apply-all-table-rls.sql`

The active model separates:

- `auth.users`: authentication only
- `profiles`: artoir user profile
- `organizations`: groups/teams
- `organization_members`: profile membership and role (owner / admin)
- `artwork_creators`: artwork to profile authorship (is_visible で公開制御)
- `favorites`: 本人のみ読み書きの保存テーブル（artwork / exhibition / organization / profile）

適用は Supabase SQL Editor で該当ファイルを実行する運用。

### 既知の不整合（要確認）

- `organizations.kind` は rebuild スクリプトが削除する一方、`app/src/pages/OrgPage.jsx` がまだ参照している（`kind === 'person'` なら「作家」表示、未定義なら「団体」にフォールバック）。DB の実状態を確認し、kind を正式に復活させるかコード側の参照を消すか決めること。
- `add-publisher-kind.sql` は DEPRECATED（歴史的経緯として保存）。`drop-organization-invites.sql` も同様に片付け済みマイグレーション。

## RLS expectations

- Public visitors can read organizations, exhibitions, artworks, profiles, and visible artwork creator rows.
- Logged-in profiles can create organizations and become the first owner.
- Organization members can manage exhibitions and artworks for that organization.
- A profile can manage exhibitions and artworks directly owned by that profile.
- Organization owners can manage members.
- Artwork creator rows can only reference profiles that are valid for the exhibition: organization members for organization exhibitions, or the owning profile for profile exhibitions.
- Favorites are readable/writable only by the owning profile（保存数は非公開）.
