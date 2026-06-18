# Artoir — MVP 実装仕様

> 最終更新: 2026-06-01

## 技術スタック

- React + Vite + Tailwind CSS
- Supabase（DB + Auth + Storage）
- Vercel / Cloudflare Workers

## データ構造

```
auth.users（認証）
  └── profiles（プロフィール）

profiles
  └── organization_members
        └── organizations
              └── exhibitions
                    └── artworks
                          └── artwork_creators
                                └── profiles
```

### profiles

| カラム | 型 |
|--------|-----|
| id | UUID (PK, auth.users.id) |
| slug | string unique |
| display_name | string |
| bio | text |
| avatar_url | string |
| sns_links | JSONB |
| homepage_url | string |

### organizations

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| name | string |
| slug | string unique |
| description | text |
| sns_links | JSONB |
| homepage_url | string |
| created_by | UUID (profiles.id) |

### organization_members

| カラム | 型 |
|--------|-----|
| organization_id | UUID (organizations.id) |
| profile_id | UUID (profiles.id) |
| role | string (`owner` / `admin`) |

### exhibitions

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| organization_id | UUID (organizations.id) |
| title | string |
| slug | string |
| start_date | date |
| end_date | date |
| location | string |
| description | text |
| thumbnail_url | string |

### artworks

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| exhibition_id | UUID (exhibitions.id) |
| title | string |
| description | text |
| image_url | string |
| order | integer |

### artwork_creators

| カラム | 型 |
|--------|-----|
| artwork_id | UUID (artworks.id) |
| profile_id | UUID (profiles.id) |
| display_order | integer |
| is_visible | boolean |

作者名は `artworks` に直接持たず、`artwork_creators` でプロフィールに紐づける。団体展示では、作者候補は団体メンバーに限定する。

## URL設計

```
/{org-slug}/                              # 団体ページ
/{org-slug}/exhibition/{exhibition-slug}  # 展覧会ページ
```

プロフィール公開URLは将来の `@profileSlug` を想定するが、現時点では主導線にしない。

## 画面仕様

### アカウント

- プロフィール設定・編集
- 管理している団体一覧
- 団体作成
- ログアウト

### 団体ページ

- 団体名・説明
- SNSリンク・HPリンク
- 展覧会一覧（タイトル・会期・場所・サムネイル）

### 展覧会ページ

- タイトル・会期・場所・説明
- 団体ページへの戻り導線
- 作品グリッド
- 作品クリック → モーダル（画像・タイトル・説明・表示ONの作者）
- シェアボタン
