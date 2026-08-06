export const TAG_TYPES = Object.freeze({
  MATERIAL_TECHNIQUE: 'medium',
  SUBJECT: 'theme',
  VISUAL: 'visual',
})

export const DISCOVERY_LIMITS = Object.freeze({
  secondaryDisciplines: 2,
  tagsPerType: 3,
})

export const DISCIPLINES = Object.freeze([
  {
    slug: 'calligraphy',
    name: '書・文字',
    bridges: [
      { tagSlug: 'ink', label: '墨', targetSlugs: ['painting-drawing'] },
      { tagSlug: 'line', label: '線', targetSlugs: ['painting-drawing', 'printmaking'] },
      { tagSlug: 'negative-space', label: '余白', targetSlugs: ['painting-drawing', 'photography'] },
      { tagSlug: 'text', label: '文字', targetSlugs: ['design-illustration', 'interdisciplinary'] },
    ],
  },
  { slug: 'painting-drawing', name: '絵画・ドローイング', bridges: [] },
  { slug: 'photography', name: '写真', bridges: [] },
  { slug: 'printmaking', name: '版画', bridges: [] },
  { slug: 'sculpture-installation', name: '彫刻・立体', bridges: [] },
  { slug: 'craft', name: '工芸', bridges: [] },
  { slug: 'design-illustration', name: 'デザイン・イラスト', bridges: [] },
  { slug: 'moving-digital', name: '映像・デジタル', bridges: [] },
  { slug: 'interdisciplinary', name: '複合表現', bridges: [] },
])

export const EXPRESSION_TAGS = Object.freeze([
  { slug: 'ink', name: '墨', tagType: TAG_TYPES.MATERIAL_TECHNIQUE },
  { slug: 'paper', name: '紙', tagType: TAG_TYPES.MATERIAL_TECHNIQUE },
  { slug: 'oil', name: '油彩', tagType: TAG_TYPES.MATERIAL_TECHNIQUE },
  { slug: 'ceramic', name: '陶', tagType: TAG_TYPES.MATERIAL_TECHNIQUE },

  { slug: 'text', name: '文字', tagType: TAG_TYPES.SUBJECT },
  { slug: 'nature', name: '自然', tagType: TAG_TYPES.SUBJECT },
  { slug: 'figure', name: '人物', tagType: TAG_TYPES.SUBJECT },
  { slug: 'abstraction', name: '抽象', tagType: TAG_TYPES.SUBJECT },

  { slug: 'negative-space', name: '余白', tagType: TAG_TYPES.VISUAL },
  { slug: 'monochrome', name: 'モノクロ', tagType: TAG_TYPES.VISUAL },
  { slug: 'vivid-color', name: '鮮色', tagType: TAG_TYPES.VISUAL },
  { slug: 'line', name: '線', tagType: TAG_TYPES.VISUAL },
  { slug: 'geometric', name: '幾何学', tagType: TAG_TYPES.VISUAL },
  { slug: 'light', name: '光', tagType: TAG_TYPES.VISUAL },
])

export const TAG_TYPE_LABELS = Object.freeze({
  [TAG_TYPES.MATERIAL_TECHNIQUE]: '素材・技法',
  [TAG_TYPES.SUBJECT]: '主題',
  [TAG_TYPES.VISUAL]: '視覚的な特徴',
})

export const SERIES_RECURRENCE_OPTIONS = Object.freeze([
  '毎年',
  '隔年',
  '年2回',
  '春・秋',
  '不定期',
])

function cleanSlug(value) {
  return String(value || '').trim().toLowerCase()
}

export function slugifyDiscoveryValue(value) {
  const source = String(value || '').trim()
  const known = [...DISCIPLINES, ...EXPRESSION_TAGS].find((item) => item.name === source)
  if (known) return known.slug
  return source
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeDiscoveryMetadata(input = {}) {
  const normalizeSlug = (value) => slugifyDiscoveryValue(value) || cleanSlug(value)
  const primary = normalizeSlug(input.primaryDisciplineSlug || input.primaryDiscipline)
  const secondarySource = input.secondaryDisciplineSlugs || input.secondaryDisciplines || []
  const secondaryDisciplineSlugs = [...new Set(secondarySource.map((item) => normalizeSlug(item?.slug || item)).filter(Boolean))]
    .filter((slug) => slug !== primary)
    .slice(0, DISCOVERY_LIMITS.secondaryDisciplines)

  const sourceTags = input.expressionTagSlugs || input.tags || []
  const grouped = Object.values(TAG_TYPES).reduce((result, tagType) => {
    const source = Array.isArray(sourceTags)
      ? sourceTags.filter((tag) => {
        const slug = normalizeSlug(tag?.slug || tag)
        const knownType = getExpressionTag(slug)?.tagType
        return (tag?.tagType || tag?.tag_type || knownType) === tagType
      }).map((tag) => tag?.slug || tag)
      : sourceTags[tagType] || []
    result[tagType] = [...new Set(source.map(normalizeSlug).filter(Boolean))]
      .slice(0, DISCOVERY_LIMITS.tagsPerType)
    return result
  }, {})

  return {
    primaryDisciplineSlug: primary,
    secondaryDisciplineSlugs,
    expressionTagSlugs: grouped,
  }
}

export function getDiscipline(slug) {
  const normalized = cleanSlug(slug)
  return DISCIPLINES.find((item) => item.slug === normalized) || null
}

export function getExpressionTag(slug) {
  const normalized = cleanSlug(slug)
  return EXPRESSION_TAGS.find((item) => item.slug === normalized) || null
}

export function getExpressionTagsByType(tagType) {
  return EXPRESSION_TAGS.filter((tag) => tag.tagType === tagType)
}
