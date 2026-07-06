# Artoir — Development Context

展覧会ごとに作品をまとめて公開できるポータルサイト(芸術のアーカイブ)。

プロダクト・ビジネス文脈は `docs/` を参照。実装仕様の詳細は `docs/spec.md`。

---

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4(スタイルは `app/src/index.css` の `ui-*` クラス + `app/src/lib/tokens.js` の `T` が中心)
- **Backend**: Supabase(DB + Auth。Google OAuth / メール+パスワード)
- **画像ストレージ**: Cloudinary(unsigned preset でクライアントから直接アップロード)
- **Hosting**: Cloudflare Workers(`app/` で `npm run deploy` = wrangler。本番: https://artoir.net)

※ Vercel・Supabase Storage は使っていない(過去の記述が残っていたら誤り)。

---

## Directory Structure

```
Artoir/
├── app/                    # アプリ本体
│   ├── src/
│   ├── worker/             # Cloudflare Worker(sitemap.xml 等)
│   ├── public/
│   └── wrangler.jsonc
├── docs/
│   ├── spec.md             # 実装仕様・インフラ運用
│   ├── product.md          # コンセプト・ロードマップ・マネタイズ
│   ├── marketing.md        # ターゲット・広報・アウトリーチ
│   ├── design.md           # デザインガイドライン
│   └── sql/                # スキーマSQL(Supabase SQL Editor で適用)
├── CLAUDE.md
└── README.md
```

---

## Data Structure

正は `docs/sql/rebuild-profiles-organizations.sql` ほか `docs/sql/*.sql`(Supabase SQL Editor で適用する運用)。

```
auth.users ── profiles(1:1)
profiles ──< organization_members >── organizations
organizations ──< exhibitions(organization_id)
profiles      ──< exhibitions(profile_id)      # 個人の展覧会
exhibitions   ──< artworks(exhibition_id)
profiles      ──< artworks(profile_id)         # プロフィール直下の作品
artworks      ──< artwork_creators >── profiles # 作者の紐づけ(is_visibleで表示制御)
profiles      ──< favorites                    # 保存(対象: artwork/exhibition/organization/profile)
```

- exhibitions は `organization_id` XOR `profile_id`、artworks は `exhibition_id` XOR `profile_id`
- **exhibitions の主なフィールド**: title, slug, start_date, start_time, end_date, end_time, location, description, thumbnail_url(fee系フィールドは存在しない)
- **artworks**: title, description, image_url, file_name, file_size, order

---

## URL Design

```
/                                        # トップ(全展覧会一覧+検索)
/orgs                                    # 団体一覧
/{org-slug}                              # 団体ページ
/{org-slug}/exhibition/{exhibition-slug} # 展覧会ページ
/profile/{slug} または /@{slug}          # プロフィールページ(作品直置き)
/profile/{slug}/exhibition/{slug}        # 個人の展覧会ページ
/collection                              # お気に入り一覧(要ログイン)
/login, /account, /account/setup         # 認証・アカウント
/{org-slug}/dashboard/...                # 団体ダッシュボード(settings/members/exhibitions)
/profile/{slug}/dashboard/...            # 個人ダッシュボード
```

---

## Current Scope

実装済み: 公開ページ一式、認証、ダッシュボード(団体・個人)、作品アップロード(クライアント側で最大1920pxに圧縮)、お気に入り/コレクション、シェアリンク、sitemap。

未実装(次の焦点): 図録PDF生成と展覧会単位課金(`docs/product.md`)、閲覧数アナリティクス。

---

## Dev Rules

- **作者名の扱い**: artworks に直接持たず `artwork_creators` でプロフィールに紐づけ、`is_visible` で公開/非公開を制御する(旧ルール「作者名は掲載しない」は廃止)
- シェアリンク(公開ページ)は認証なしで閲覧できること
- スキーマ変更は `docs/sql/*.sql` にファイルを置き、Supabase SQL Editor で適用する
- ドキュメント運用: 議論はNotion、決定事項をmdへ。docs は `spec.md` / `product.md` / `marketing.md` / `design.md` の4ファイル構成を維持し、むやみにファイルを増やさない
