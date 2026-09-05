import { exhStatus } from './exhibition.js'

const FALLBACK_DISCIPLINES = [
  { slug: 'calligraphy', name: '書・文字', keywords: ['書道', '書展', '書・文字', '墨書', 'カリグラフィ', '文字表現'] },
  { slug: 'painting-drawing', name: '絵画・ドローイング', keywords: ['絵画', '油彩', '水彩', '日本画', 'ドローイング', '素描', '絵'] },
  { slug: 'photography', name: '写真', keywords: ['写真', 'フォト', '撮影'] },
  { slug: 'printmaking', name: '版画', keywords: ['版画', '木版', '銅版', 'リトグラフ', 'シルクスクリーン'] },
  { slug: 'sculpture-installation', name: '彫刻・立体', keywords: ['彫刻', '立体', '造形', 'インスタレーション'] },
  { slug: 'craft', name: '工芸', keywords: ['工芸', '陶芸', '陶磁', '染織', '漆', 'ガラス', '木工', '金工'] },
  { slug: 'design-illustration', name: 'デザイン・イラスト', keywords: ['デザイン', 'イラスト', 'グラフィック', 'ポスター'] },
  { slug: 'moving-digital', name: '映像・デジタル', keywords: ['映像', 'デジタル', 'メディアアート', 'アニメーション', 'パフォーマンス'] },
  { slug: 'interdisciplinary', name: '複合表現', keywords: ['複合', '合同', '総合', 'ミクストメディア'] },
]

const FALLBACK_TAGS = [
  { slug: 'ink', name: '墨', tag_type: 'medium', keywords: ['墨', '墨汁', '水墨'] },
  { slug: 'paper', name: '紙', tag_type: 'medium', keywords: ['紙', '和紙'] },
  { slug: 'oil', name: '油彩', tag_type: 'medium', keywords: ['油彩', '油絵'] },
  { slug: 'ceramic', name: '陶', tag_type: 'medium', keywords: ['陶', '焼物', '磁器'] },
  { slug: 'text', name: '文字', tag_type: 'theme', keywords: ['文字', '言葉', 'タイポグラフィ', '書'] },
  { slug: 'nature', name: '自然', tag_type: 'theme', keywords: ['自然', '風景', '植物', '山', '海'] },
  { slug: 'figure', name: '人物', tag_type: 'theme', keywords: ['人物', '肖像', '身体'] },
  { slug: 'abstraction', name: '抽象', tag_type: 'theme', keywords: ['抽象', '非具象'] },
  { slug: 'line', name: '線', tag_type: 'visual', keywords: ['線', '輪郭', '筆致'] },
  { slug: 'negative-space', name: '余白', tag_type: 'visual', keywords: ['余白', '静寂', '間'] },
  { slug: 'monochrome', name: 'モノクロ', tag_type: 'visual', keywords: ['モノクロ', '白黒', '単色'] },
  { slug: 'vivid-color', name: '鮮色', tag_type: 'visual', keywords: ['色彩', '鮮やか', 'カラフル'] },
  { slug: 'geometric', name: '幾何学', tag_type: 'visual', keywords: ['幾何', 'グリッド'] },
  { slug: 'light', name: '光', tag_type: 'visual', keywords: ['光', '影', '透明'] },
]

export const DISCIPLINE_FALLBACKS = FALLBACK_DISCIPLINES.map(({ slug, name }) => ({ slug, name }))

export const DISCIPLINE_BRIDGES = {
  calligraphy: [
    { to: 'painting-drawing', via: ['ink', 'line', 'negative-space'] },
    { to: 'printmaking', via: ['line', 'paper'] },
    { to: 'design-illustration', via: ['text', 'line'] },
    { to: 'photography', via: ['negative-space', 'monochrome'] },
  ],
  'painting-drawing': [
    { to: 'calligraphy', via: ['ink', 'line', 'negative-space'] },
    { to: 'photography', via: ['light', 'figure', 'nature'] },
    { to: 'printmaking', via: ['line', 'paper'] },
  ],
  photography: [
    { to: 'painting-drawing', via: ['light', 'figure', 'nature'] },
    { to: 'calligraphy', via: ['negative-space', 'monochrome'] },
    { to: 'moving-digital', via: ['light', 'figure'] },
  ],
  printmaking: [
    { to: 'calligraphy', via: ['line', 'paper'] },
    { to: 'design-illustration', via: ['line', 'text'] },
    { to: 'painting-drawing', via: ['line', 'paper'] },
  ],
  craft: [
    { to: 'sculpture-installation', via: ['ceramic', 'abstraction'] },
    { to: 'design-illustration', via: ['geometric', 'nature'] },
  ],
  'sculpture-installation': [
    { to: 'craft', via: ['ceramic', 'abstraction'] },
    { to: 'moving-digital', via: ['light', 'figure'] },
  ],
  'design-illustration': [
    { to: 'calligraphy', via: ['text', 'line'] },
    { to: 'printmaking', via: ['line', 'paper'] },
  ],
  'moving-digital': [
    { to: 'photography', via: ['light', 'figure'] },
    { to: 'sculpture-installation', via: ['light', 'abstraction'] },
  ],
  interdisciplinary: [],
}

function includesKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()))
}

export function inferDiscoveryMetadata(exhibition) {
  const text = [exhibition?.title, exhibition?.description, exhibition?.location]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const disciplines = FALLBACK_DISCIPLINES
    .filter((discipline) => includesKeyword(text, discipline.keywords))
    .slice(0, 3)
    .map((discipline, index) => ({
      slug: discipline.slug,
      name: discipline.name,
      is_primary: index === 0,
      sort_order: index,
      inferred: true,
    }))
  const tags = FALLBACK_TAGS
    .filter((tag) => includesKeyword(text, tag.keywords))
    .slice(0, 9)
    .map((tag) => ({ slug: tag.slug, name: tag.name, tag_type: tag.tag_type, inferred: true }))
  return { disciplines, tags }
}

export async function loadDiscoveryMetadata(client, exhibitionIds) {
  const ids = [...new Set((exhibitionIds || []).filter(Boolean))]
  if (!client || ids.length === 0) return new Map()

  const [disciplineLinksResult, disciplinesResult, tagLinksResult, tagsResult] = await Promise.all([
    client.from('exhibition_disciplines').select('exhibition_id, discipline_id, is_primary, sort_order').in('exhibition_id', ids),
    client.from('art_disciplines').select('id, slug, name, sort_order').order('sort_order'),
    client.from('exhibition_expression_tags').select('exhibition_id, tag_id').in('exhibition_id', ids),
    client.from('art_expression_tags').select('id, slug, name, tag_type, sort_order').order('sort_order'),
  ])

  const disciplineById = new Map((disciplinesResult.data || []).map((item) => [item.id, item]))
  const tagById = new Map((tagsResult.data || []).map((item) => [item.id, item]))
  const metadata = new Map(ids.map((id) => [id, { disciplines: [], tags: [] }]))

  for (const link of disciplineLinksResult.data || []) {
    const discipline = disciplineById.get(link.discipline_id)
    if (!discipline || !metadata.has(link.exhibition_id)) continue
    metadata.get(link.exhibition_id).disciplines.push({
      ...discipline,
      is_primary: Boolean(link.is_primary),
      sort_order: link.sort_order ?? discipline.sort_order ?? 0,
    })
  }
  for (const link of tagLinksResult.data || []) {
    const tag = tagById.get(link.tag_id)
    if (!tag || !metadata.has(link.exhibition_id)) continue
    metadata.get(link.exhibition_id).tags.push(tag)
  }
  for (const value of metadata.values()) {
    value.disciplines.sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
    value.tags.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }
  return metadata
}

export function attachDiscoveryMetadata(exhibition, metadata) {
  const saved = metadata?.get(exhibition?.id)
  const inferred = inferDiscoveryMetadata(exhibition)
  return {
    ...exhibition,
    discovery: {
      disciplines: saved?.disciplines?.length ? saved.disciplines : inferred.disciplines,
      tags: saved?.tags?.length ? saved.tags : inferred.tags,
    },
  }
}

export function getPrimaryDiscipline(exhibition) {
  const disciplines = exhibition?.discovery?.disciplines || []
  return disciplines.find((item) => item.is_primary) || disciplines[0] || null
}

export function getExhibitionYear(exhibition) {
  const explicit = Number(exhibition?.edition_year)
  if (Number.isInteger(explicit) && explicit > 0) return explicit
  const dateYear = Number(String(exhibition?.start_date || '').slice(0, 4))
  return Number.isInteger(dateYear) && dateYear > 0 ? dateYear : null
}

export function groupExhibitionsByYear(exhibitions) {
  const groups = new Map()
  for (const exhibition of exhibitions || []) {
    const year = getExhibitionYear(exhibition) || '会期未設定'
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year).push(exhibition)
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === '会期未設定') return 1
    if (b === '会期未設定') return -1
    return Number(b) - Number(a)
  })
}

function sharedValues(seed, candidate, key) {
  const seedValues = new Set((seed?.discovery?.[key] || []).map((item) => item.slug))
  return (candidate?.discovery?.[key] || []).filter((item) => seedValues.has(item.slug))
}

export function getConnection(seed, candidate) {
  if (!seed || !candidate || seed.id === candidate.id) return null
  const seedPrimary = getPrimaryDiscipline(seed)
  const candidatePrimary = getPrimaryDiscipline(candidate)
  const sharedTags = sharedValues(seed, candidate, 'tags')
  const sameDiscipline = Boolean(seedPrimary?.slug && seedPrimary.slug === candidatePrimary?.slug)
  if (sharedTags.length > 0) {
    const names = sharedTags.slice(0, 2).map((tag) => tag.name)
    return {
      kind: sameDiscipline ? 'near' : 'bridge',
      score: (sameDiscipline ? 36 : 52) + sharedTags.length * 13,
      reason: `${names.join('と')}でつながる`,
      sharedTags,
    }
  }
  if (sameDiscipline) {
    return { kind: 'near', score: 34, reason: `${seedPrimary.name}をさらに辿る`, sharedTags: [] }
  }
  const bridge = (DISCIPLINE_BRIDGES[seedPrimary?.slug] || []).find((item) => item.to === candidatePrimary?.slug)
  if (bridge) {
    const fallbackTag = FALLBACK_TAGS.find((tag) => bridge.via.includes(tag.slug))
    return {
      kind: 'bridge',
      score: 28,
      reason: fallbackTag ? `${fallbackTag.name}から別の表現へ` : '表現の境界を越える',
      sharedTags: [],
    }
  }
  return { kind: 'wide', score: 8, reason: '意外な表現へひらく', sharedTags: [] }
}

export function rankConnectedExhibitions(seed, candidates, { breadth = 'balanced', limit = 4 } = {}) {
  const breadthBoost = breadth === 'wide' ? { near: -8, bridge: 20, wide: 28 } : { near: 12, bridge: 8, wide: 0 }
  return (candidates || [])
    .filter((item) => item?.id !== seed?.id)
    .map((item) => {
      const connection = getConnection(seed, item)
      const statusBoost = exhStatus(item) === 'live' ? 8 : exhStatus(item) === 'upcoming' ? 5 : 0
      return { item, connection, score: (connection?.score || 0) + (breadthBoost[connection?.kind] || 0) + statusBoost }
    })
    .sort((a, b) => b.score - a.score || String(b.item.start_date || '').localeCompare(String(a.item.start_date || '')))
    .slice(0, limit)
}

export function buildSeriesPath({ series, org, profile }) {
  if (!series?.slug) return ''
  if (profile?.slug) return `/profile/${profile.slug}/series/${series.slug}`
  if (org?.slug) return `/${org.slug}/series/${series.slug}`
  return ''
}

export function editionDisplay(exhibition) {
  const parts = []
  if (exhibition?.edition_number != null) parts.push(`第${exhibition.edition_number}回`)
  if (exhibition?.edition_year) parts.push(`${exhibition.edition_year}年`)
  return parts.join('・')
}
