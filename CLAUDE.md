# Artoir — Development Context

展覧会ごとに作品をまとめて公開できるポータルサイト。

詳細なプロダクト・ビジネス文脈は `docs/` を参照。

---

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase（DB + Auth + Storage）
- **Hosting**: Vercel（Root Directory: `app`）

---

## Directory Structure

```
Artoir/
├── app/                    # アプリ本体（Vercelのビルド対象）
│   ├── src/
│   ├── public/
│   └── package.json
├── docs/
│   ├── product/
│   ├── design/
│   │   └── mockups/        # デモHTML
│   ├── marketing/
│   └── ops/
├── CLAUDE.md
└── README.md
```

---

## Data Structure

```
organizations
  └── exhibitions
        └── artworks
```

各テーブルの主なフィールド：

**organizations**: name, slug, description, sns_links, homepage_url
**exhibitions**: org_id, title, slug, start_date, end_date, location, description, bg_color
**artworks**: exhibition_id, title, description, image_url, order

---

## URL Design

```
Artoir.jp/{org-slug}/exhibition/{exhibition-slug}
```

---

## MVP Scope

作るもの：
- 団体ページ（名前・説明・SNS・HP・展覧会一覧）
- 展覧会ページ（タイトル・期間・場所・説明・作品一覧・背景色カスタム）
- 作品表示（タイトル・説明・画像）※作者名は掲載しない
- シェアリンク

作らないもの（後回し）：
- ログイン・認証
- 有料プラン・アナリティクス

---

## Dev Rules

- Vercelの`Root Directory`は`app`に設定すること
- 作者名は作品に紐づけない（プライバシー配慮）
- シェアリンクは認証なしで閲覧できること
