import assert from 'node:assert/strict'

import {
  attachDiscoveryMetadata,
  buildSeriesPath,
  getConnection,
  groupExhibitionsByYear,
  inferDiscoveryMetadata,
  rankConnectedExhibitions,
} from '../src/lib/discoveryData.js'
import { normalizeDiscoveryMetadata } from '../src/lib/discovery.js'

const calligraphy = attachDiscoveryMetadata({
  id: 'calligraphy',
  title: '墨と余白の書展',
  start_date: '2024-04-01',
}, new Map())

const painting = attachDiscoveryMetadata({
  id: 'painting',
  title: '墨と線による絵画展',
  start_date: '2023-04-01',
}, new Map())

const photography = attachDiscoveryMetadata({
  id: 'photography',
  title: '光の写真展',
  start_date: '2025-04-01',
}, new Map())

const inferred = inferDiscoveryMetadata(calligraphy)
assert.equal(inferred.disciplines[0]?.slug, 'calligraphy')
assert.deepEqual(inferred.tags.map((tag) => tag.slug), ['ink', 'text', 'negative-space'])

const bridge = getConnection(calligraphy, painting)
assert.equal(bridge.kind, 'bridge')
assert.match(bridge.reason, /墨|線/)

const wide = rankConnectedExhibitions(calligraphy, [painting, photography], { breadth: 'wide', limit: 2 })
assert.equal(wide.length, 2)
assert.ok(wide.every((item) => item.connection?.reason))

const yearGroups = groupExhibitionsByYear([
  { id: 'older', start_date: '2022-01-01' },
  { id: 'edition', edition_year: 2026, start_date: '2020-01-01' },
  { id: 'undated' },
])
assert.deepEqual(yearGroups.map(([year]) => year), [2026, 2022, '会期未設定'])

assert.equal(
  buildSeriesPath({ series: { slug: 'annual' }, org: { slug: 'art-club' } }),
  '/art-club/series/annual',
)
assert.equal(
  buildSeriesPath({ series: { slug: 'annual' }, profile: { slug: 'artist' } }),
  '/profile/artist/series/annual',
)

assert.deepEqual(normalizeDiscoveryMetadata({
  primaryDiscipline: '書・文字',
  secondaryDisciplines: ['絵画・ドローイング', '写真', '版画'],
  tags: ['墨', '紙', '油彩', '陶', '余白', '線'],
}), {
  primaryDisciplineSlug: 'calligraphy',
  secondaryDisciplineSlugs: ['painting-drawing', 'photography'],
  expressionTagSlugs: {
    medium: ['ink', 'paper', 'oil'],
    theme: [],
    visual: ['negative-space', 'line'],
  },
})

console.log('Discovery and series tests passed.')
