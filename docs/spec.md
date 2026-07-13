# Artoir — 実装仕様・インフラ

> 最終更新: 2026-07-05(ドキュメント統合。旧 `ops/infra.md` を本ファイルに吸収)

## 技術スタック

- React 19 + Vite + Tailwind CSS 4(スタイルの実態は `app/src/index.css` の `ui-*` クラスと `app/src/lib/tokens.js`)
- Supabase(DB + Auth)— 認証は Google OAuth とメール+パスワード
- Cloudinary(作品・サムネイル画像のストレージ)
- Cloudflare Workers(ホスティング)

## インフラ・運用

### Hosting — Cloudflare Workers

- 本番: https://artoir.net
- デプロイ: `cd app && npm run deploy`(wrangler。設定は `app/wrangler.jsonc`)
- `app/worker/index.js` が `/sitemap.xml` を生成、それ以外は SPA アセット配信(`not_found_handling: single-page-application`)
- ※ Vercel・Supabase Storage は使っていない(過去の記述が残っていたら誤り)

### Images — Cloudinary

- unsigned upload preset(`VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET`)でクライアントから直接アップロード。preset 側でフォルダ・許可形式・サイズ制限を必ず設定する
- アップロード前にクライアントで長辺 1920px に圧縮するため、**元解像度は残らない**(図録印刷対応時の課題 → `product.md` 未決事項)

### DB — Supabase

スキーマの正は `docs/sql/`。変更は SQL ファイルを追加し、Supabase SQL Editor で実行して適用する。

- `rebuild-profiles-organizations.sql` — 基盤(profiles / organizations / exhibitions / artworks / artwork_creators)
- `profile-artworks-without-exhibitions.sql` — プロフィール作品を合成展覧会から `artworks.profile_id` へ移行
- `add-favorites.sql` — お気に入り
- `apply-all-table-rls.sql` — 全テーブル RLS
- `add-artwork-image-dimensions.sql` — artworks に image_width / image_height を追加(段組レイアウト用)
- `add-exhibition-artwork-layouts.sql` — 展覧会ごとの自由配置(正規化座標・RLS)
- `fix-artwork-creators-personal-exhibitions.sql` — 個人展覧会の作者紐付けRLS判定を修正

## データ構造

```
auth.users(認証)
  └── profiles(1:1)

profiles
  ├── artworks(プロフィール直下の作品)
  ├── exhibitions(個人の展覧会)
  ├── favorites(保存)
  └── organization_members
        └── organizations
              └── exhibitions
                    ├── artworks
                          └── artwork_creators
                                └── profiles
                    └── exhibition_artwork_layouts
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

※ `kind`(organization / person)は廃止済み(rebuild スクリプトで削除、コード側の参照も 2026-07 に削除)。

### organization_members

| カラム | 型 |
|--------|-----|
| organization_id | UUID |
| profile_id | UUID |
| role | string (`owner` / `admin`) |

### exhibitions

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| organization_id | UUID(団体の展覧会のみ) |
| profile_id | UUID(個人の展覧会のみ) |
| title | string |
| slug | string(owner 内で unique。タイトルから自動生成) |
| start_date / end_date | date |
| start_time / end_time | string |
| location | string |
| description | text |
| thumbnail_url | string(未設定なら先頭作品の画像で代替) |
| visibility | string(`public` / `private` / `draft` / `unlisted`) |

`organization_id` XOR `profile_id`(CHECK 制約)。料金系フィールド(fee_type / fee_detail)は存在しない。

公開ページと公開一覧に表示するのは `visibility = 'public'` の展覧会のみ。管理画面では所有者が全状態を確認・編集できる。

### artworks

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| exhibition_id | UUID(展覧会の作品のみ) |
| profile_id | UUID(プロフィール直下の作品のみ) |
| title | string |
| description | text |
| image_url | string(Cloudinary の secure_url) |
| file_name / file_size | string / number |
| order | integer |
| image_width / image_height | integer(nullable。画像の px 寸法) |

`exhibition_id` XOR `profile_id`(CHECK 制約)。

image_width / image_height は Cloudinary アップロード応答の width/height を保存(段組レイアウトのアスペクト比確定用)。追加 SQL は `docs/sql/add-artwork-image-dimensions.sql`、既存行のバックフィルは `app/scripts/backfill-artwork-dimensions.mjs`(service role キーで実行)。

### exhibition_artwork_layouts

展覧会と作品の関連に属する自由配置。`exhibition_id + artwork_id` が主キー。`x / y / width / height` はキャンバス幅を 1 とする正規化値で、`z_index / rotation / is_visible` も保持する。公開画面では自由配置・従来ウォール・均等グリッドを切替可能。未設定時とスマートフォン表示は既存の自動配置へフォールバックする。

### artwork_creators

| カラム | 型 |
|--------|-----|
| artwork_id | UUID |
| profile_id | UUID |
| display_order | integer |
| is_visible | boolean |

作者名は artworks に直接持たず、ここでプロフィールに紐づける。`is_visible` で公開ページでの表示を制御。団体展示の作者候補は団体メンバーに限定(RLS で強制)。

### favorites

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| profile_id | UUID |
| target_type | `artwork` / `exhibition` / `organization` / `profile` |
| target_id | UUID(ポリモーフィック、FK なし) |

本人のみ読み書き可(保存数は非公開)。

## RLS の前提

- 公開ページの閲覧者(未ログイン)は organizations / exhibitions / artworks / profiles と表示ONの artwork_creators を読める
- ログイン済みプロフィールは団体を作成でき、最初の owner になる
- 団体メンバーはその団体の展覧会・作品を管理できる
- プロフィールは自分直下の展覧会・作品を管理できる
- 団体の owner はメンバーを管理できる
- artwork_creators は展覧会に対して正当なプロフィールのみ参照できる(団体展は団体メンバー、個人展は所有プロフィール)
- favorites は本人のみ読み書き可

## URL設計

```
/                                            # トップ: 全展覧会一覧(検索付き)
/orgs                                        # 団体一覧
/creators                                    # 作家一覧(検索付き)
/{org-slug}                                  # 団体ページ
/{org-slug}/exhibition/{exhibition-slug}     # 団体の展覧会ページ
/profile/{profile-slug}                      # プロフィールページ(/@{slug} でも可)
/profile/{profile-slug}/exhibition/{slug}    # 個人の展覧会ページ
/collection                                  # お気に入り一覧(要ログイン)
/login                                       # ログイン
/account                                     # アカウント(プロフィール・所属団体)
/account/setup, /account/setup/links         # 初回セットアップ
/account/organizations/new                   # 団体作成
/{org-slug}/dashboard                        # 団体ダッシュボード
/{org-slug}/dashboard/settings|members       # 団体設定・メンバー管理
/{org-slug}/dashboard/exhibitions/new        # 展覧会作成
/{org-slug}/dashboard/exhibitions/{id}/edit  # 展覧会編集
/{org-slug}/dashboard/exhibitions/{id}/artworks  # 作品管理
/profile/{slug}/dashboard/...                # 個人ダッシュボード(展覧会作成・編集・作品管理)
```

- プロフィール直下の作品はプロフィールページに直接表示する(便宜的な「作品集」展覧会は廃止済み)。それとは別に、個人も展覧会を持てる。
- ダッシュボード系は要ログイン(ProtectedRoute)。公開ページはすべて認証なしで閲覧可。

## 画面仕様(実装済み)

### 公開側

- **トップ(展覧会一覧)**: 全展覧会をカードで新しい順に表示、タイトル・会場・主体名で絞り込み検索
- **団体一覧 / 団体ページ**: 名前・説明・SNS/HPリンク・展覧会一覧(サムネイル・会期・場所・開催状況バッジ)
- **作家一覧**: 作家(プロフィール)をカードで一覧表示、検索付き
- **プロフィールページ**: 表示名・bio・アバター・SNS/HP・作品・所属団体・個人の展覧会
- **展覧会ページ**: タイトル・会期(日付+時刻)・場所・説明・開催状況バッジ、作品ギャラリー(PCの保存済み自由配置 / 自動ウォール / グリッド)、作品モーダル(画像・タイトル・説明・表示ONの作者)、シェアボタン、主体ページへの戻り導線
- **お気に入り**: 作品・展覧会・団体・プロフィールをブックマーク保存(長押し対応)、`/collection` で一覧
- ナビゲーション: ヘッダー + ボトムナビ(展覧会 / 団体 / 作家 / コレクション※ログイン時のみ / アカウント)

### 管理側

- **アカウント**: プロフィール設定・編集、所属団体一覧、団体作成、ログアウト
- **ダッシュボード(団体・個人共通の構成)**: 展覧会一覧(開催状況バッジ)、展覧会の作成・編集・削除、作品のアップロード・編集・並べ替え・削除、作者の紐づけと表示切り替え。作品管理画面では作品一覧と自由配置キャンバスを同時表示する
- **団体のみ**: 団体設定、メンバー管理(owner が追加・削除・ロール変更)

### 画像アップロード

- アップロード前にクライアント側で圧縮: 長辺 1920px に縮小、JPEG quality 0.82、400KB 未満はスキップ(`app/src/lib/imageCompress.js`)
- 圧縮後 Cloudinary に直接アップロード。**元解像度は保存されない**(図録印刷対応の際は要変更 → `product.md` 未決事項)
- トリミング・位置調整 UI あり(react-easy-crop / react-image-crop)。四隅指定の遠近補正(quad crop、`app/src/lib/perspectiveWarp.js`)に対応 — 展示壁面を斜めから撮った写真を正面化できる
