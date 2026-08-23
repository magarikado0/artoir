import assert from 'node:assert/strict'

import {
  exhibitionSearchText,
  formatActiveYears,
  normalizeArchiveText,
  uniqueProfilesFromArtworks,
  updateArchiveParams,
} from '../src/lib/archive.js'
import { exhStatus } from '../src/lib/exhibition.js'

const creator = { id: 'artist-1', slug: 'senoo', display_name: '妹尾 直弥' }
const hiddenCreator = { id: 'artist-2', slug: 'hidden', display_name: '非公開作家' }
const artworks = [{
  id: 'work-1',
  artwork_creators: [
    { is_visible: true, profiles: creator },
    { is_visible: false, profiles: hiddenCreator },
  ],
}]

assert.deepEqual(uniqueProfilesFromArtworks(artworks), [creator])
assert.equal(normalizeArchiveText(' ＡＲＴＯＩＲ　展 '), 'artoir 展')

const row = {
  exhibition: { title: '合同書展', description: '線の記録', location: '京都', start_date: '2025-10-11' },
  org: { name: '響都展' },
  creators: [creator],
}
assert.match(exhibitionSearchText(row), /妹尾 直弥/)
assert.match(exhibitionSearchText(row), /2025/)

const params = updateArchiveParams(new URLSearchParams('q=書&year=2025&status=ended'), {
  q: '妹尾',
  year: null,
  status: 'all',
})
assert.equal(params.toString(), `q=${encodeURIComponent('妹尾')}`)

assert.equal(formatActiveYears([{ start_date: '2022-01-01' }, { start_date: '2026-01-01' }]), '2022 — 2026')
assert.equal(exhStatus({}), 'unknown')

const now = new Date()
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
assert.equal(exhStatus({ start_date: today, end_date: today }), 'live')

console.log('Archive search and URL state tests passed.')
