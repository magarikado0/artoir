# Artoir — MVP 実装仕様

> 最終更新: 2026-04-10

---

## 技術スタック

- React + Vite + Tailwind CSS
- Supabase（DB + Auth + Storage）
- Vercel（Root Directory: `app/`）

---

## データ構造

```
organizations
  └── exhibitions
        └── artworks
```

### organizations

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| name | string |
| slug | string (unique) |
| description | text |
| sns_links | JSONB `{instagram, x, ...}` |
| homepage_url | string |

### exhibitions

| カラム | 型 |
|--------|-----|
| id | UUID (PK) |
| org_id | UUID (FK) |
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
| exhibition_id | UUID (FK) |
| title | string |
| description | text |
| image_url | string |
| order | integer |

> 作者名は持たない（プライバシー配慮）

---

## URL設計

```
/{org-slug}/                              # 団体ページ
/{org-slug}/exhibition/{exhibition-slug}  # 展覧会ページ
```

---

## 画面仕様

### 団体ページ

- 団体名・説明
- SNSリンク・HPリンク
- 展覧会一覧（タイトル・会期・場所）→ クリックで展覧会ページへ

### 展覧会ページ

- タイトル・会期・場所・説明
- サムネイル（あれば一覧・先頭画像として表示）
- 作品グリッド（3カラム）
- 作品クリック → モーダル（画像・タイトル・説明）
- シェアボタン（URLコピー）

---

## MVP スコープ

### 作るもの

- 団体ページ
- 展覧会ページ（作品一覧・モーダル・背景色カスタム）
- シェアリンク（認証なしで閲覧可能）
- ログイン・認証（Supabase Authentication）

### 作らないもの

- 管理ダッシュボード（CMS）
- アナリティクス
- 有料プラン

---

## デザイン

| 項目 | 値 |
|------|----|
| 背景色 | `#f5f0e8`（用紙） |
| テキスト色 | `#1a1612`（墨） |
| アクセント色 | `#c0392b`（朱） |
| 見出しフォント | Noto Serif JP / Cormorant Garamond |

- モバイルファースト・レスポンシブ
- インタラクティブモックアップ: `docs/design/mockups/Artoir-exhibition.html`
