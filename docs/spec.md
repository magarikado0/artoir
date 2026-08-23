# Artoir — 実装仕様・インフラ

> 最終更新: 2026-08-05(展覧会の分野探索・年次シリーズを反映)

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
- `add-exhibition-gallery-view-settings.sql` — 公開ページに表示する作品レイアウトと初期表示
- `add-exhibition-discovery-series.sql` — 芸術分野・表現タグ・展覧会シリーズと開催回メタデータ
- `fix-artwork-creators-personal-exhibitions.sql` — 個人展覧会の作者紐付けRLS判定を修正

`add-exhibition-discovery-series.sql` の適用手順:

1. 対象の Supabase プロジェクトで SQL Editor を開く
2. `docs/sql/add-exhibition-discovery-series.sql` の全内容を貼り付けて実行する(再実行可能)
3. `art_disciplines` / `art_expression_tags` / `exhibition_series` / 2つの関連テーブルと、`exhibitions` の追加列が作成されたことを確認する
4. SQL 適用後にアプリをデプロイする。既存展覧会は未分類・単発のまま維持され、管理画面から順次設定できる

SQL 未適用の環境では、公開一覧・展覧会ページはタイトル・説明・会場から分野と表現タグを推定して基本的な探索表示を維持する。管理画面は分類・シリーズ欄を無効化して理由を表示し、従来の展覧会基本情報だけを読み書きする。シリーズページと確定済み分類の保存は SQL 適用後に有効になる。

## データ構造

```
auth.users(認証)
  └── profiles(1:1)

profiles
  ├── artworks(プロフィール直下の作品)
  ├── exhibitions(個人の展覧会)
  ├── exhibition_series(個人の継続展)
  ├── favorites(保存)
  └── organization_members
        └── organizations
              ├── exhibition_series(団体の継続展)
              └── exhibitions
                    ├── artworks
                          └── artwork_creators
                                └── profiles
                    └── exhibition_artwork_layouts

exhibitions
  ├── exhibition_disciplines ── art_disciplines
  └── exhibition_expression_tags ── art_expression_tags
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
| gallery_view_modes | text[](`curated` / `wall` / `grid` のうち公開する表示) |
| gallery_default_view | string(公開ページの初期表示) |
| series_id | UUID(nullable、exhibition_series.id) |
| edition_year / edition_number | integer(nullable、開催年 / 回次) |
| edition_label | text(nullable、記念展などの特別名称) |
| is_series_milestone | boolean(節目の開催回) |
| participant_count | integer(nullable、参加作家数) |

`organization_id` XOR `profile_id`(CHECK 制約)。料金系フィールド(fee_type / fee_detail)は存在しない。

公開ページと公開一覧に表示するのは `visibility = 'public'` の展覧会のみ。管理画面では所有者が全状態を確認・編集できる。

### 展覧会の分野・表現タグ

- `art_disciplines`: 固定の主分野マスタ(`slug / name / sort_order`)。初期値は書・文字、絵画・ドローイング、写真、版画、彫刻・立体、工芸、デザイン・イラスト、映像・デジタル、複合表現
- `exhibition_disciplines`: `exhibition_id / discipline_id / is_primary / sort_order`。主分野は1件、副分野は最大2件。主分野を0番、副分野を1・2番に固定する
- `art_expression_tags`: 固定の表現語彙(`slug / name / tag_type / sort_order`)。`tag_type` は `medium`(素材・技法) / `theme`(主題) / `visual`(視覚的特徴)
- `exhibition_expression_tags`: `exhibition_id / tag_id`。管理画面では各 tag_type を最大3件まで選択する

マスタの `slug` は公開側の検索・分野間接続で使う固定キー。表示名を文字列として展覧会へ複製しない。
フォーム用の固定定義・正規化は `app/src/lib/discovery.js`、公開側の取得・推定・接続順位は `app/src/lib/discoveryData.js` に置く。

### exhibition_series

毎年・隔年・年2回・不定期など、同じ企画の開催回を束ねる任意のシリーズ。

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| organization_id / profile_id | UUID(所有者、XOR) |
| slug | string(owner 内で unique) |
| name | string |
| description | text |
| recurrence_label | text(毎年、隔年など) |
| start_year | integer(nullable) |
| created_at / updated_at | timestamptz |

各開催回は従来どおり独立した `exhibitions` 行・公開URL・作品群を持ち、`series_id` で任意に所属する。シリーズと開催回の所有者は必ず一致させる。`edition_year` と `edition_number` は別データとして扱い、回次はシリーズ内で重複不可。シリーズを削除・解除した場合も展覧会自体は残し、シリーズ所属・回次・特別名称・節目フラグを外す。

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

展覧会と作品の関連に属する自由配置。`exhibition_id + artwork_id` が主キー。`x / y / width / height` はキャンバス幅を 1 とする正規化値で、`z_index / rotation / is_visible` も保持する。公開画面では自由配置・従来ウォール・均等グリッドを切替可能。`exhibitions.gallery_view_modes` で公開する切替を、`gallery_default_view` で初期表示を指定する。自由配置データの削除と公開停止は別操作とし、未設定時・非公開時・スマートフォン表示は公開中の自動配置へフォールバックする。

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
- 芸術分野・表現タグのマスタは公開読取のみ。展覧会との関連は公開展なら閲覧可、追加・更新・削除は展覧会の管理者のみ
- シリーズは公開展を1件以上含む場合だけ一般公開し、空シリーズ・非公開回だけのシリーズは所有者のみ閲覧・管理できる

## URL設計

```
/                                            # 未ログイン向けランディング(ログイン済みは /exhibitions へ)
/exhibitions                                 # 展覧会探索(検索・分野・表現・開催年)
/orgs                                        # 団体一覧
/creators                                    # 作家一覧(検索付き)
/{org-slug}                                  # 団体ページ
/{org-slug}/exhibition/{exhibition-slug}     # 団体の展覧会ページ
/{org-slug}/series/{series-slug}             # 団体の展覧会シリーズ
/profile/{profile-slug}                      # プロフィールページ(/@{slug} でも可)
/profile/{profile-slug}/exhibition/{slug}    # 個人の展覧会ページ
/profile/{profile-slug}/series/{slug}        # 個人の展覧会シリーズ(/@{slug}/series/... でも可)
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

- **トップ(展覧会探索)**: タイトル・説明・会場・主体名・表示ONの作者名・開催年を横断検索し、開催年と開催状態で絞り込む。`q / year / status` はURLへ反映する。結果は年別の単一アーカイブ台帳で表示し、タイトル・団体・作家を別々のリンクとして辿れる
- **団体一覧 / 団体ページ**: 一覧は名前・説明・公開展覧会数・活動年・最新展・代表画像を表示し、検索と並び替えをURLへ反映する。詳細は説明・SNS/HP・公開中の継続シリーズ・表示ONの参加作家・年別の公開展覧会を表示する
- **作家一覧**: 公開作品または公開展覧会との関係があるプロフィールを全件表示。名前・bio・作品数・参加公開展覧会数・最新展で判断でき、検索と並び替えをURLへ反映する
- **プロフィールページ**: 表示名・bio・SNS/HP・プロフィール直下作品に加え、`artwork_creators(is_visible = true)` で参加した公開展覧会を年別に表示し、関わった団体へ辿れる
- **展覧会ページ**: タイトル・会期(日付+時刻)・場所・説明・開催状況・表示ONの参加作家、作品ギャラリー(PCの保存済み自由配置 / 自動ウォール / グリッド)、作品モーダル、シェアボタンを表示。上部から主催団体・参加作家・同年の記録へ進め、末尾では同じ作家・同主体・同年の展覧会へ進める
- **展覧会シリーズページ**: シリーズ概要・最新回・年/回次の時間レール・歴代開催を表示。初期表示は最新3回、節目、初回を優先し、全件展開できる。2回を選ぶ比較は代表作品・作品数・参加作家数・会場を並べ、末尾から共通表現を持つ別分野へ進める。団体・個人の双方に対応
- **お気に入り**: 作品・展覧会・団体・プロフィールをブックマーク保存(長押し対応)、`/collection` で一覧
- ナビゲーション: ヘッダー + ボトムナビ(展覧会 / 団体 / 作家 / コレクション※ログイン時のみ / アカウント)

### 管理側

- **アカウント**: プロフィール設定・編集、所属団体一覧、団体作成、ログアウト
- **ダッシュボード(団体・個人共通の構成)**: 展覧会一覧(開催状況バッジ)、展覧会の作成・編集・削除、作品のアップロード・編集・並べ替え・削除、作者の紐づけと表示切り替え。展覧会編集では主分野1件、副分野最大2件、素材・技法/主題/視覚タグを各最大3件設定できる。単発、新規シリーズ作成、既存シリーズ追加を選び、周期・開催年・回次・特別名称・節目・参加作家数を保存する。作品管理画面は自由配置キャンバスを主画面とする。キャンバス内ツールバーでUndo / Redo・初期配置・保存を行う。空白部分のコンテキストメニューから作品を追加し、作品上のメニューから編集・削除・重なり順を操作する(PC右クリック、モバイル長押し、キーボードメニュー)。作品ゼロ時のみキャンバス中央に追加ボタンを表示する。従来ウォールの並び替えは折りたたみ式の作品トレイで行う
- **団体のみ**: 団体設定、メンバー管理(owner が追加・削除・ロール変更)

### 画像アップロード

- 新規作品の入口ではカバー画像を1枚だけ選択する。作品情報画面では、カバー画像の元データから詳細を再クロップするか、別アングル・背面・展示風景などの写真を残り枚数まで複数追加できる。カバー元画像からの再クロップは、元データを保持している新規作成中のみ対応する
- アップロード前にクライアント側で圧縮: 長辺 1920px に縮小、JPEG quality 0.82、400KB 未満はスキップ(`app/src/lib/imageCompress.js`)
- 圧縮後 Cloudinary に直接アップロード。**元解像度は保存されない**(図録印刷対応の際は要変更 → `product.md` 未決事項)
- トリミング・位置調整 UI あり(react-easy-crop / react-image-crop)。四隅指定の遠近補正(quad crop、`app/src/lib/perspectiveWarp.js`)に対応 — 展示壁面を斜めから撮った写真を正面化できる
