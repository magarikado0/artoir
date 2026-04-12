export const IS_DEV = import.meta.env.VITE_IS_DEV === 'true'

export const demoOrg = {
  id: 'demo-org-1',
  slug: 'demo',
  name: '青空アート部',
  description:
    '大学の有志で集まったアート集団です。絵画・写真・立体など様々なジャンルの作品を年に数回展示しています。',
  sns_links: {
    instagram: 'https://instagram.com',
    x: 'https://x.com',
  },
  homepage_url: 'https://example.com',
}

export const demoExhibitions = [
  {
    id: 'demo-exh-1',
    org_id: 'demo-org-1',
    slug: 'spring-2025',
    title: '春の芽吹き展',
    description: '春をテーマに集めた、色とりどりの作品たち。',
    start_date: '2025-04-01',
    end_date: '2025-04-20',
    location: '東京都渋谷区 ギャラリー白',
    bg_color: '#f0ede4',
  },
  {
    id: 'demo-exh-2',
    org_id: 'demo-org-1',
    slug: 'winter-2024',
    title: '静寂と余白',
    description: '冬の静けさをモノクロームで表現した作品展。',
    start_date: '2024-12-10',
    end_date: '2024-12-22',
    location: '東京都新宿区 ギャラリー銀',
    bg_color: '#e8e8e6',
  },
]

export const demoArtworks = [
  {
    id: 'demo-aw-1',
    exhibition_id: 'demo-exh-1',
    title: '光の粒子',
    description: '朝の窓から差し込む光をアクリルで描いた作品。',
    image_url: '',
    order: 1,
  },
  {
    id: 'demo-aw-2',
    exhibition_id: 'demo-exh-1',
    title: '萌え出づる',
    description: '春の新芽をモチーフにした版画シリーズ第一作。',
    image_url: '',
    order: 2,
  },
  {
    id: 'demo-aw-3',
    exhibition_id: 'demo-exh-1',
    title: '雨上がりの路',
    description: '雨上がりの石畳を水彩で表現。',
    image_url: '',
    order: 3,
  },
]
