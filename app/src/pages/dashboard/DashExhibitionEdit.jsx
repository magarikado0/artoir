import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import DashShell, { DashField, DashSectionLabel } from '../../components/DashShell'
import ImageUploader from '../../components/ImageUploader'
import ArtworkMedia from '../../components/ArtworkMedia'
import { T } from '../../lib/tokens'
import { useIsDesktop } from '../../lib/useIsDesktop'
import {
  EXHIBITION_VISIBILITY,
  EXHIBITION_VISIBILITY_OPTIONS,
  getExhibitionVisibilityLabel,
  getExhibitionPeriodText,
  getExhibitionThumbnailUrlFromRecord,
  normalizeExhibitionVisibility,
} from '../../lib/exhibition'
import { getThumbnailUrl } from '../../lib/imageUrl'
import { deleteExhibition } from '../../lib/deleteExhibition'
import { legacyProfileSlugFromOwnerSlug, profilePath } from '../../lib/profileRoutes'
import {
  DISCIPLINES,
  DISCOVERY_LIMITS,
  EXPRESSION_TAGS,
  SERIES_RECURRENCE_OPTIONS,
  TAG_TYPES,
  TAG_TYPE_LABELS,
  getDiscipline,
  getExpressionTag,
  getExpressionTagsByType,
  normalizeDiscoveryMetadata,
  slugifyDiscoveryValue,
} from '../../lib/discovery'

const SERIES_MODE = Object.freeze({
  STANDALONE: 'standalone',
  NEW: 'new',
  EXISTING: 'existing',
})

function emptyTagSelection() {
  return Object.values(TAG_TYPES).reduce((result, tagType) => {
    result[tagType] = []
    return result
  }, {})
}

function normalizeCatalogRow(row) {
  return {
    ...row,
    slug: String(row?.slug || '').trim(),
    name: String(row?.name || '').trim(),
    tagType: row?.tag_type || row?.tagType || '',
  }
}

function parseOptionalInteger(value) {
  if (value === '' || value == null) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function isOptionalIntegerInRange(value, min, max = Number.POSITIVE_INFINITY) {
  if (value === '' || value == null) return true
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
}

function isDiscoverySchemaError(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '').toLowerCase()
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code)
    || message.includes('does not exist')
    || message.includes('schema cache')
}

function discoverySummary(primarySlug, secondarySlugs, selectedTagSlugs) {
  const disciplines = [primarySlug, ...secondarySlugs]
    .map((value) => getDiscipline(value)?.name)
    .filter(Boolean)
  const tags = Object.values(selectedTagSlugs)
    .flat()
    .map((value) => getExpressionTag(value)?.name)
    .filter(Boolean)
  if (!disciplines.length && !tags.length) return '未設定'
  return [...disciplines, ...tags].join('、')
}

function seriesSummary(seriesMode, seriesOptions, seriesId, editionYear, editionNumber, editionLabel) {
  if (seriesMode === SERIES_MODE.STANDALONE) return '単発の展覧会'
  const selected = seriesOptions.find((series) => series.id === seriesId)
  const seriesName = selected?.name || '展覧会シリーズ'
  const edition = [
    editionYear ? `${editionYear}年` : '',
    editionNumber ? `第${editionNumber}回` : '',
    editionLabel,
  ].filter(Boolean).join('・')
  return edition ? `${seriesName} / ${edition}` : seriesName
}

function slugifyAscii(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function fallbackSlug() {
  return 'exh-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

async function generateUniqueSlug(ownerColumn, ownerId, title) {
  const base = slugifyAscii(title) || fallbackSlug()
  const { data, error } = await supabase
    .from('exhibitions')
    .select('slug')
    .eq(ownerColumn, ownerId)
    .like('slug', `${base}%`)
  if (error) throw error
  const existing = new Set((data || []).map((r) => r.slug))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

async function generateUniqueSeriesSlug(ownerColumn, ownerId, name) {
  const base = slugifyDiscoveryValue(name) || `series-${Date.now().toString(36)}`
  const { data, error } = await supabase
    .from('exhibition_series')
    .select('slug')
    .eq(ownerColumn, ownerId)
    .like('slug', `${base}%`)
  if (error) throw error
  const existing = new Set((data || []).map((row) => row.slug))
  if (!existing.has(base)) return base
  let number = 2
  while (existing.has(`${base}-${number}`)) number += 1
  return `${base}-${number}`
}

function fieldValue(value, fallback = '未設定') {
  return value || fallback
}

function ExhibitionSaveActions({ onCancel, onSave, saving, deleting }) {
  return (
    <div className="ui-settings-edit-actions">
      <button type="button" onClick={onCancel} disabled={saving} className="ui-settings-secondary-button">
        キャンセル
      </button>
      <button type="button" onClick={onSave} disabled={saving || deleting} className="ui-settings-primary-button">
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}

function ExhibitionItem({ id, label, value, mono, editChildren, editSection, onBeginEdit }) {
  const editing = editSection === id
  return (
    <section className="ui-settings-item">
      <div className="ui-settings-item-head">
        <div className="ui-settings-item-label">{label}</div>
        {!editing && editChildren && (
          <button type="button" onClick={() => onBeginEdit(id)} className="ui-settings-edit-button">
            編集
          </button>
        )}
      </div>
      {editing ? editChildren : (
        <div className={`ui-settings-item-value ${mono ? 'is-mono' : ''}`}>{value}</div>
      )}
    </section>
  )
}

function VisibilityPicker({ value, onChange }) {
  return (
    <div className="ui-visibility-options" role="radiogroup" aria-label="公開設定">
      {EXHIBITION_VISIBILITY_OPTIONS.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`ui-visibility-option ${active ? 'is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className="ui-visibility-option-label">{option.label}</span>
            <span className="ui-visibility-option-description">{option.description}</span>
          </button>
        )
      })}
    </div>
  )
}

function DiscoveryOptionGroup({ label, help, options, value, onChange, multiple = false, max, disabled = false }) {
  const selected = multiple ? value : [value]
  function toggle(optionValue) {
    if (disabled) return
    if (!multiple) {
      onChange(optionValue)
      return
    }
    if (selected.includes(optionValue)) {
      onChange(selected.filter((item) => item !== optionValue))
      return
    }
    if (!max || selected.length < max) onChange([...selected, optionValue])
  }
  return (
    <fieldset className="ui-discovery-fieldset" disabled={disabled} style={{ display: 'grid', gap: 10, margin: 0, padding: 0, border: 0 }}>
      <legend className="ui-form-label">{label}</legend>
      {help && <div className="ui-field-help ui-discovery-help">{help}</div>}
      <div className="ui-btn-row ui-discovery-options" style={{ flexWrap: 'wrap' }} role={multiple ? 'group' : 'radiogroup'} aria-label={label}>
        {options.map((option) => {
          const active = selected.includes(option.slug)
          const limitReached = multiple && !active && max && selected.length >= max
          return (
            <button
              key={option.slug}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={active}
              disabled={disabled || limitReached}
              className={`ui-discovery-option ui-settings-secondary-button ${active ? 'is-active' : ''}`}
              style={active ? { borderColor: T.accent, background: 'rgba(190, 85, 61, 0.08)' } : undefined}
              onClick={() => toggle(option.slug)}
            >
              {option.name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function DiscoveryEditor({
  available,
  warning,
  primaryDisciplineSlug,
  setPrimaryDisciplineSlug,
  secondaryDisciplineSlugs,
  setSecondaryDisciplineSlugs,
  selectedTagSlugs,
  setSelectedTagSlugs,
}) {
  function changePrimary(next) {
    setPrimaryDisciplineSlug(next)
    setSecondaryDisciplineSlugs((current) => current.filter((slug) => slug !== next))
  }

  return (
    <div className="ui-discovery-editor" style={{ display: 'grid', gap: 26 }}>
      {warning && (
        <div className="ui-alert ui-discovery-fallback" role="status">
          {warning}
        </div>
      )}
      <DiscoveryOptionGroup
        label="主分野（必須）"
        help="この展覧会を最もよく表す分野を1つ選びます。"
        options={DISCIPLINES}
        value={primaryDisciplineSlug}
        onChange={changePrimary}
        disabled={!available}
      />
      <DiscoveryOptionGroup
        label={`副分野（最大${DISCOVERY_LIMITS.secondaryDisciplines}つ）`}
        help="複数の分野にまたがる場合だけ選択してください。"
        options={DISCIPLINES.filter((discipline) => discipline.slug !== primaryDisciplineSlug)}
        value={secondaryDisciplineSlugs}
        onChange={setSecondaryDisciplineSlugs}
        multiple
        max={DISCOVERY_LIMITS.secondaryDisciplines}
        disabled={!available}
      />
      <div className="ui-discovery-tag-groups" style={{ display: 'grid', gap: 24 }}>
        {Object.values(TAG_TYPES).map((tagType) => (
          <DiscoveryOptionGroup
            key={tagType}
            label={`${TAG_TYPE_LABELS[tagType]}（最大${DISCOVERY_LIMITS.tagsPerType}つ）`}
            help={tagType === TAG_TYPES.MATERIAL_TECHNIQUE
              ? '作品同士を分野を越えてつなぐ手がかりになります。'
              : undefined}
            options={getExpressionTagsByType(tagType)}
            value={selectedTagSlugs[tagType] || []}
            onChange={(next) => setSelectedTagSlugs((current) => ({ ...current, [tagType]: next }))}
            multiple
            max={DISCOVERY_LIMITS.tagsPerType}
            disabled={!available}
          />
        ))}
      </div>
    </div>
  )
}

function DiscoverySelectField({ label, value, onChange, children, disabled, help }) {
  return (
    <div className="ui-form-field ui-discovery-select-field">
      <div className="ui-form-label-row">
        <label className="ui-form-label">{label}</label>
      </div>
      <div className="ui-input-wrap">
        <select
          className="ui-discovery-select"
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', padding: '0 14px', color: T.ink, fontFamily: T.sans, fontSize: 14 }}
        >
          {children}
        </select>
      </div>
      {help && <div className="ui-field-help">{help}</div>}
    </div>
  )
}

function SeriesEditor({
  available,
  warning,
  seriesMode,
  setSeriesMode,
  seriesOptions,
  existingSeriesId,
  setExistingSeriesId,
  newSeriesName,
  setNewSeriesName,
  seriesDescription,
  setSeriesDescription,
  seriesRecurrence,
  setSeriesRecurrence,
  editionYear,
  setEditionYear,
  editionNumber,
  setEditionNumber,
  editionLabel,
  setEditionLabel,
  isSeriesMilestone,
  setIsSeriesMilestone,
  participantCount,
  setParticipantCount,
}) {
  const modeOptions = [
    { value: SERIES_MODE.STANDALONE, label: '単発の展覧会' },
    { value: SERIES_MODE.NEW, label: '新しいシリーズを作る' },
    { value: SERIES_MODE.EXISTING, label: '既存シリーズに追加' },
  ]
  const hasEdition = seriesMode !== SERIES_MODE.STANDALONE
  return (
    <div className="ui-discovery-series-editor" style={{ display: 'grid', gap: 22 }}>
      {warning && (
        <div className="ui-alert ui-discovery-fallback" role="status">
          {warning}
        </div>
      )}
      <div className="ui-btn-row ui-discovery-series-modes" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label="展覧会シリーズ">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={seriesMode === option.value}
            disabled={!available || (option.value === SERIES_MODE.EXISTING && !seriesOptions.length)}
            className={`ui-discovery-series-mode ui-settings-secondary-button ${seriesMode === option.value ? 'is-active' : ''}`}
            style={seriesMode === option.value ? { borderColor: T.accent, background: 'rgba(190, 85, 61, 0.08)' } : undefined}
            onClick={() => setSeriesMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {seriesMode === SERIES_MODE.EXISTING && (
        <DiscoverySelectField
          label="シリーズ"
          value={existingSeriesId}
          onChange={setExistingSeriesId}
          disabled={!available}
          help={!seriesOptions.length ? 'この管理者には登録済みのシリーズがありません。' : undefined}
        >
          <option value="">選択してください</option>
          {seriesOptions.map((series) => (
            <option key={series.id} value={series.id}>{series.name}</option>
          ))}
        </DiscoverySelectField>
      )}

      {seriesMode === SERIES_MODE.NEW && (
        <div className="ui-discovery-new-series" style={{ display: 'grid', gap: 2 }}>
          <DashField label="シリーズ名" value={newSeriesName} onChange={setNewSeriesName} placeholder="例: 京都学生書展" />
          <DashField label="シリーズの説明" value={seriesDescription} onChange={setSeriesDescription} multiline placeholder="この展覧会シリーズについて" />
          <DiscoverySelectField label="開催周期" value={seriesRecurrence} onChange={setSeriesRecurrence} disabled={!available}>
            <option value="">選択してください</option>
            {SERIES_RECURRENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </DiscoverySelectField>
        </div>
      )}

      {hasEdition && (
        <div className="ui-discovery-edition-fields" style={{ display: 'grid', gap: 2 }}>
          <div className="ui-exhibition-date-grid ui-discovery-edition-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <DashField label="開催年" value={editionYear} onChange={setEditionYear} type="number" min="1000" max="9999" placeholder="2026" mono />
            <DashField label="回次" value={editionNumber} onChange={setEditionNumber} type="number" min="1" placeholder="42" mono />
          </div>
          <DashField label="特別名称" value={editionLabel} onChange={setEditionLabel} placeholder="例: 創立50周年記念" />
          <DashField label="参加作家数" value={participantCount} onChange={setParticipantCount} type="number" min="0" placeholder="任意" mono />
          <button
            type="button"
            role="checkbox"
            aria-checked={isSeriesMilestone}
            disabled={!available}
            className={`ui-discovery-milestone ui-settings-secondary-button ${isSeriesMilestone ? 'is-active' : ''}`}
            style={{ width: 'fit-content', ...(isSeriesMilestone ? { borderColor: T.accent, background: 'rgba(190, 85, 61, 0.08)' } : {}) }}
            onClick={() => setIsSeriesMilestone((current) => !current)}
          >
            {isSeriesMilestone ? '節目の回として表示する ✓' : '節目の回として表示する'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashExhibitionEdit() {
  const { orgSlug: routeOrgSlug, profileSlug: routeProfileSlug, exhibitionId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const isDesktop = useIsDesktop()
  const isNew = !exhibitionId || exhibitionId === 'undefined'
  const profileSlug = routeProfileSlug || legacyProfileSlugFromOwnerSlug(routeOrgSlug)
  const orgSlug = profileSlug ? undefined : routeOrgSlug

  const [owner, setOwner] = useState(null)
  const [forbidden, setForbidden] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exhibition, setExhibition] = useState(null)
  const [editSection, setEditSection] = useState(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [visibility, setVisibility] = useState(EXHIBITION_VISIBILITY.PUBLIC)

  const [discoveryAvailable, setDiscoveryAvailable] = useState(false)
  const [discoveryWarning, setDiscoveryWarning] = useState('')
  const [discoveryHydrated, setDiscoveryHydrated] = useState(false)
  const [disciplineRows, setDisciplineRows] = useState([])
  const [tagRows, setTagRows] = useState([])
  const [primaryDisciplineSlug, setPrimaryDisciplineSlug] = useState('')
  const [secondaryDisciplineSlugs, setSecondaryDisciplineSlugs] = useState([])
  const [selectedTagSlugs, setSelectedTagSlugs] = useState(emptyTagSelection)
  const [seriesOptions, setSeriesOptions] = useState([])
  const [seriesMode, setSeriesMode] = useState(SERIES_MODE.STANDALONE)
  const [existingSeriesId, setExistingSeriesId] = useState('')
  const [newSeriesName, setNewSeriesName] = useState('')
  const [seriesDescription, setSeriesDescription] = useState('')
  const [seriesRecurrence, setSeriesRecurrence] = useState('')
  const [editionYear, setEditionYear] = useState('')
  const [editionNumber, setEditionNumber] = useState('')
  const [editionLabel, setEditionLabel] = useState('')
  const [isSeriesMilestone, setIsSeriesMilestone] = useState(false)
  const [participantCount, setParticipantCount] = useState('')
  const [savedDiscoveryMetadata, setSavedDiscoveryMetadata] = useState(null)

  function onStartDateChange(next) {
    setStartDate(next)
    if (next && endDate && endDate < next) setEndDate(next)
  }

  function onEndDateChange(next) {
    if (next && startDate && next < startDate) {
      setEndDate(startDate)
      return
    }
    setEndDate(next)
  }

  function applyDiscoverySnapshot(snapshot) {
    if (!snapshot) return
    setPrimaryDisciplineSlug(snapshot.primaryDisciplineSlug || '')
    setSecondaryDisciplineSlugs([...(snapshot.secondaryDisciplineSlugs || [])])
    setSelectedTagSlugs(Object.values(TAG_TYPES).reduce((result, tagType) => {
      result[tagType] = [...(snapshot.expressionTagSlugs?.[tagType] || [])]
      return result
    }, {}))
    setSeriesMode(snapshot.seriesMode || SERIES_MODE.STANDALONE)
    setExistingSeriesId(snapshot.existingSeriesId || '')
    setNewSeriesName(snapshot.newSeriesName || '')
    setSeriesDescription(snapshot.seriesDescription || '')
    setSeriesRecurrence(snapshot.seriesRecurrence || '')
    setEditionYear(snapshot.editionYear ?? '')
    setEditionNumber(snapshot.editionNumber ?? '')
    setEditionLabel(snapshot.editionLabel || '')
    setIsSeriesMilestone(Boolean(snapshot.isSeriesMilestone))
    setParticipantCount(snapshot.participantCount ?? '')
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    async function load() {
      try {
        const ownerQuery = profileSlug
          ? supabase.from('profiles').select('*').eq('slug', profileSlug).maybeSingle()
          : supabase.from('organizations').select('*').eq('slug', orgSlug).maybeSingle()
        const { data: ownerData, error: ownerError } = await ownerQuery
        if (ownerError) {
          setLoadError(ownerError.message || '管理対象の読み込みに失敗しました。')
          return
        }
        if (!ownerData) {
          setLoadError(profileSlug ? 'プロフィールが見つかりません。' : '団体が見つかりません。')
          return
        }
        if (profileSlug && ownerData.id !== session?.user?.id) {
          setForbidden(true)
          return
        }
        setOwner(ownerData)
        let exh = null
        if (!isNew && exhibitionId && exhibitionId !== 'undefined') {
          const { data: exhibitionData, error: exhError } = await supabase.from('exhibitions').select('*').eq('id', exhibitionId).maybeSingle()
          if (exhError) {
            setLoadError(exhError.message || '展覧会の読み込みに失敗しました。')
            return
          }
          exh = exhibitionData
          if (exh) {
            setExhibition(exh)
            setTitle(exh.title || '')
            setSlug(exh.slug || '')
            const s = exh.start_date || ''
            let e = exh.end_date || ''
            if (s && e && e < s) e = s
            setStartDate(s)
            setStartTime(exh.start_time || '')
            setEndDate(e)
            setEndTime(exh.end_time || '')
            setLocation(exh.location || '')
            setDescription(exh.description || '')
            setThumbnailUrl(getExhibitionThumbnailUrlFromRecord(exh))
            setVisibility(normalizeExhibitionVisibility(exh.visibility))
            const baseDiscoverySnapshot = {
              ...normalizeDiscoveryMetadata(),
              seriesMode: exh.series_id ? SERIES_MODE.EXISTING : SERIES_MODE.STANDALONE,
              existingSeriesId: exh.series_id || '',
              newSeriesName: '',
              seriesDescription: '',
              seriesRecurrence: '',
              editionYear: exh.edition_year ?? '',
              editionNumber: exh.edition_number ?? '',
              editionLabel: exh.edition_label || '',
              isSeriesMilestone: Boolean(exh.is_series_milestone),
              participantCount: exh.participant_count ?? '',
            }
            applyDiscoverySnapshot(baseDiscoverySnapshot)
            setSavedDiscoveryMetadata(baseDiscoverySnapshot)
          }
        }

        const ownerColumn = profileSlug ? 'profile_id' : 'organization_id'
        const [disciplinesResult, tagsResult, seriesResult, disciplineLinksProbe, tagLinksProbe] = await Promise.all([
          supabase.from('art_disciplines').select('*'),
          supabase.from('art_expression_tags').select('*'),
          supabase.from('exhibition_series').select('*').eq(ownerColumn, ownerData.id),
          supabase.from('exhibition_disciplines').select('exhibition_id').limit(1),
          supabase.from('exhibition_expression_tags').select('exhibition_id').limit(1),
        ])
        const catalogError = disciplinesResult.error || tagsResult.error || seriesResult.error
          || disciplineLinksProbe.error || tagLinksProbe.error
        if (catalogError) {
          setDiscoveryAvailable(false)
          setDiscoveryHydrated(false)
          setDiscoveryWarning('分類・シリーズ用のデータベースが未適用のため、この項目は現在編集できません。基本情報は通常どおり保存できます。')
          return
        }

        const nextDisciplineRows = (disciplinesResult.data || []).map(normalizeCatalogRow)
        const nextTagRows = (tagsResult.data || []).map(normalizeCatalogRow)
        const nextSeriesOptions = [...(seriesResult.data || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja'))
        setDisciplineRows(nextDisciplineRows)
        setTagRows(nextTagRows)
        setSeriesOptions(nextSeriesOptions)

        let primaryDiscipline = ''
        let secondaryDisciplines = []
        let expressionTags = emptyTagSelection()
        if (exh?.id) {
          const [disciplineLinksResult, tagLinksResult] = await Promise.all([
            supabase.from('exhibition_disciplines').select('*').eq('exhibition_id', exh.id),
            supabase.from('exhibition_expression_tags').select('*').eq('exhibition_id', exh.id),
          ])
          const linkError = disciplineLinksResult.error || tagLinksResult.error
          if (linkError) {
            setDiscoveryAvailable(false)
            setDiscoveryHydrated(false)
            setDiscoveryWarning('分類・シリーズ用のデータベースが未適用のため、この項目は現在編集できません。基本情報は通常どおり保存できます。')
            return
          }
          const disciplineById = new Map(nextDisciplineRows.map((row) => [row.id, row]))
          const sortedDisciplineLinks = [...(disciplineLinksResult.data || [])]
            .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
          const primaryLink = sortedDisciplineLinks.find((link) => link.is_primary)
          primaryDiscipline = disciplineById.get(primaryLink?.discipline_id)?.slug || ''
          secondaryDisciplines = sortedDisciplineLinks
            .filter((link) => !link.is_primary)
            .map((link) => disciplineById.get(link.discipline_id)?.slug)
            .filter(Boolean)

          const tagById = new Map(nextTagRows.map((row) => [row.id, row]))
          expressionTags = (tagLinksResult.data || []).reduce((result, link) => {
            const tag = tagById.get(link.tag_id)
            if (tag?.tagType && result[tag.tagType]) result[tag.tagType].push(tag.slug)
            return result
          }, emptyTagSelection())
        }

        const normalized = normalizeDiscoveryMetadata({
          primaryDisciplineSlug: primaryDiscipline,
          secondaryDisciplineSlugs: secondaryDisciplines,
          expressionTagSlugs: expressionTags,
        })
        const snapshot = {
          ...normalized,
          seriesMode: exh?.series_id ? SERIES_MODE.EXISTING : SERIES_MODE.STANDALONE,
          existingSeriesId: exh?.series_id || '',
          newSeriesName: '',
          seriesDescription: '',
          seriesRecurrence: '',
          editionYear: exh?.edition_year ?? '',
          editionNumber: exh?.edition_number ?? '',
          editionLabel: exh?.edition_label || '',
          isSeriesMilestone: Boolean(exh?.is_series_milestone),
          participantCount: exh?.participant_count ?? '',
        }
        applyDiscoverySnapshot(snapshot)
        setSavedDiscoveryMetadata(snapshot)
        setDiscoveryAvailable(true)
        setDiscoveryHydrated(true)
        setDiscoveryWarning('')
      } catch (error) {
        setLoadError(error?.message || '読み込みに失敗しました。')
      } finally { setLoading(false) }
    }
    load()
  }, [orgSlug, profileSlug, exhibitionId, isNew, session])

  async function syncDiscoveryRelations(savedExhibitionId) {
    const normalized = normalizeDiscoveryMetadata({
      primaryDisciplineSlug,
      secondaryDisciplineSlugs,
      expressionTagSlugs: selectedTagSlugs,
    })
    const disciplineBySlug = new Map(disciplineRows.map((row) => [row.slug, row]))
    const selectedDisciplineSlugs = [
      normalized.primaryDisciplineSlug,
      ...normalized.secondaryDisciplineSlugs,
    ].filter(Boolean)
    const disciplineLinks = selectedDisciplineSlugs.map((disciplineSlug, index) => {
      const row = disciplineBySlug.get(disciplineSlug)
      if (!row?.id) throw new Error(`分野「${getDiscipline(disciplineSlug)?.name || disciplineSlug}」の保存先が見つかりません。`)
      return {
        exhibition_id: savedExhibitionId,
        discipline_id: row.id,
        is_primary: index === 0,
        sort_order: index,
      }
    })

    const tagBySlug = new Map(tagRows.map((row) => [row.slug, row]))
    const selectedTags = Object.values(TAG_TYPES).flatMap((tagType) => (
      (normalized.expressionTagSlugs[tagType] || []).map((tagSlug) => ({ tagSlug, tagType }))
    ))
    const tagLinks = selectedTags.map(({ tagSlug }) => {
      const row = tagBySlug.get(tagSlug)
      if (!row?.id) throw new Error(`表現タグ「${getExpressionTag(tagSlug)?.name || tagSlug}」の保存先が見つかりません。`)
      return { exhibition_id: savedExhibitionId, tag_id: row.id }
    })

    const [deleteDisciplines, deleteTags] = await Promise.all([
      supabase.from('exhibition_disciplines').delete().eq('exhibition_id', savedExhibitionId),
      supabase.from('exhibition_expression_tags').delete().eq('exhibition_id', savedExhibitionId),
    ])
    if (deleteDisciplines.error) throw deleteDisciplines.error
    if (deleteTags.error) throw deleteTags.error

    if (disciplineLinks.length) {
      const { error } = await supabase.from('exhibition_disciplines').insert(disciplineLinks)
      if (error) throw error
    }
    if (tagLinks.length) {
      const { error } = await supabase.from('exhibition_expression_tags').insert(tagLinks)
      if (error) throw error
    }
  }

  async function handleSave() {
    setSaveError('')
    if (!supabase) {
      setSaveError('Supabase が未設定です。')
      return
    }
    if (!owner) {
      setSaveError(loadError || '管理対象を読み込めていないため保存できません。')
      return
    }
    if (!isNew && (!exhibitionId || exhibitionId === 'undefined')) {
      setSaveError('展覧会IDが不正です。')
      return
    }
    if (startDate && endDate && endDate < startDate) {
      window.alert('終了日は開始日以降である必要があります。')
      return
    }
    const requiresDiscoveryValidation = isNew || editSection === 'discovery'
    if (discoveryAvailable && requiresDiscoveryValidation && !primaryDisciplineSlug) {
      setSaveError('主分野を1つ選択してください。')
      return
    }
    if (discoveryAvailable && seriesMode === SERIES_MODE.NEW && !newSeriesName.trim()) {
      setSaveError('新しいシリーズの名前を入力してください。')
      return
    }
    if (discoveryAvailable && seriesMode === SERIES_MODE.EXISTING && !existingSeriesId) {
      setSaveError('追加するシリーズを選択してください。')
      return
    }
    if (discoveryAvailable && seriesMode !== SERIES_MODE.STANDALONE && !isOptionalIntegerInRange(editionYear, 1000, 9999)) {
      setSaveError('開催年は1000〜9999の整数で入力してください。')
      return
    }
    if (discoveryAvailable && seriesMode !== SERIES_MODE.STANDALONE && !isOptionalIntegerInRange(editionNumber, 1)) {
      setSaveError('回次は1以上の整数で入力してください。')
      return
    }
    if (discoveryAvailable && seriesMode !== SERIES_MODE.STANDALONE && !isOptionalIntegerInRange(participantCount, 0)) {
      setSaveError('参加作家数は0以上の整数で入力してください。')
      return
    }
    setSaving(true)
    let nextPath = null
    let createdSeriesForRollback = null
    const ownerColumn = profileSlug ? 'profile_id' : 'organization_id'
    const dashboardBase = profileSlug ? profilePath(profileSlug) : `/${orgSlug}`
    try {
      const finalSlug = (isNew || !slug) ? await generateUniqueSlug(ownerColumn, owner.id, title) : slug
      const basePayload = {
        title,
        slug: finalSlug,
        start_date: startDate || null,
        start_time: startTime || null,
        end_date: endDate || null,
        end_time: endTime || null,
        location,
        description,
        thumbnail_url: thumbnailUrl || null,
        visibility,
        organization_id: profileSlug ? null : owner.id,
        profile_id: profileSlug ? owner.id : null,
      }

      let metadataEnabled = discoveryAvailable && discoveryHydrated
      let resolvedSeriesId = seriesMode === SERIES_MODE.EXISTING ? existingSeriesId : null
      let createdSeries = null
      if (metadataEnabled && seriesMode === SERIES_MODE.NEW) {
        const seriesSlug = await generateUniqueSeriesSlug(ownerColumn, owner.id, newSeriesName)
        const seriesPayload = {
          name: newSeriesName.trim(),
          slug: seriesSlug,
          description: seriesDescription.trim() || null,
          recurrence_label: seriesRecurrence || null,
          start_year: parseOptionalInteger(editionYear) || parseOptionalInteger(startDate.slice(0, 4)),
          organization_id: profileSlug ? null : owner.id,
          profile_id: profileSlug ? owner.id : null,
        }
        const { data, error } = await supabase.from('exhibition_series').insert(seriesPayload).select().single()
        if (error) {
          if (!isDiscoverySchemaError(error)) throw error
          metadataEnabled = false
          setDiscoveryAvailable(false)
          setDiscoveryWarning('分類・シリーズ用のデータベースが未適用のため、今回は基本情報だけを保存しました。')
        } else {
          createdSeries = data
          createdSeriesForRollback = data
          resolvedSeriesId = data.id
        }
      }

      const discoveryPayload = {
        series_id: metadataEnabled && seriesMode !== SERIES_MODE.STANDALONE ? resolvedSeriesId : null,
        edition_year: metadataEnabled && seriesMode !== SERIES_MODE.STANDALONE ? parseOptionalInteger(editionYear) : null,
        edition_number: metadataEnabled && seriesMode !== SERIES_MODE.STANDALONE ? parseOptionalInteger(editionNumber) : null,
        edition_label: metadataEnabled && seriesMode !== SERIES_MODE.STANDALONE ? editionLabel.trim() || null : null,
        is_series_milestone: metadataEnabled && seriesMode !== SERIES_MODE.STANDALONE ? isSeriesMilestone : false,
        participant_count: metadataEnabled && seriesMode !== SERIES_MODE.STANDALONE ? parseOptionalInteger(participantCount) : null,
      }
      let payload = metadataEnabled ? { ...basePayload, ...discoveryPayload } : basePayload
      let savedData = null

      async function persistExhibition(nextPayload) {
        if (isNew) return supabase.from('exhibitions').insert(nextPayload).select().single()
        const result = await supabase.from('exhibitions').update(nextPayload).eq('id', exhibitionId).select().maybeSingle()
        return result
      }

      let saveResult = await persistExhibition(payload)
      if (saveResult.error && metadataEnabled && isDiscoverySchemaError(saveResult.error)) {
        if (createdSeries?.id) await supabase.from('exhibition_series').delete().eq('id', createdSeries.id)
        createdSeriesForRollback = null
        metadataEnabled = false
        resolvedSeriesId = null
        createdSeries = null
        payload = basePayload
        setDiscoveryAvailable(false)
        setDiscoveryWarning('分類・シリーズ用のデータベースが未適用のため、今回は基本情報だけを保存しました。')
        saveResult = await persistExhibition(basePayload)
      }
      if (saveResult.error) throw saveResult.error
      savedData = saveResult.data || (isNew ? null : { ...exhibition, ...payload })
      createdSeriesForRollback = null
      const savedExhibitionId = savedData?.id || exhibitionId

      let relationError = null
      if (metadataEnabled && savedExhibitionId) {
        try {
          await syncDiscoveryRelations(savedExhibitionId)
        } catch (error) {
          relationError = error
        }
      }

      if (createdSeries) {
        setSeriesOptions((current) => [...current, createdSeries].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja')))
        setExistingSeriesId(createdSeries.id)
        setSeriesMode(SERIES_MODE.EXISTING)
      }

      if (isNew && savedData) {
        setSlug(savedData.slug)
        nextPath = `${dashboardBase}/dashboard/exhibitions/${savedData.id}/edit`
      } else if (!isNew) {
        setSlug(finalSlug)
        setExhibition((previous) => previous ? { ...previous, ...payload } : { ...payload, id: exhibitionId })
      }

      if (metadataEnabled && !relationError) {
        const normalized = normalizeDiscoveryMetadata({
          primaryDisciplineSlug,
          secondaryDisciplineSlugs,
          expressionTagSlugs: selectedTagSlugs,
        })
        const snapshot = {
          ...normalized,
          seriesMode: seriesMode === SERIES_MODE.STANDALONE ? SERIES_MODE.STANDALONE : SERIES_MODE.EXISTING,
          existingSeriesId: resolvedSeriesId || '',
          newSeriesName: '',
          seriesDescription: '',
          seriesRecurrence: '',
          editionYear: seriesMode === SERIES_MODE.STANDALONE ? '' : editionYear,
          editionNumber: seriesMode === SERIES_MODE.STANDALONE ? '' : editionNumber,
          editionLabel: seriesMode === SERIES_MODE.STANDALONE ? '' : editionLabel,
          isSeriesMilestone: seriesMode === SERIES_MODE.STANDALONE ? false : isSeriesMilestone,
          participantCount: seriesMode === SERIES_MODE.STANDALONE ? '' : participantCount,
        }
        setSavedDiscoveryMetadata(snapshot)
      }

      if (relationError) {
        const message = relationError?.message || '分類情報の同期に失敗しました。'
        if (isDiscoverySchemaError(relationError)) {
          setDiscoveryAvailable(false)
          setDiscoveryWarning('分類・シリーズ用の関連テーブルが未適用のため、基本情報だけを保存しました。')
        }
        if (isNew) window.alert(`展覧会の基本情報は保存されましたが、分類情報を保存できませんでした: ${message}`)
        else setSaveError(`基本情報は保存されましたが、分類情報を保存できませんでした: ${message}`)
      } else if (!isNew) {
        setEditSection(null)
      }
    } catch (error) {
      if (createdSeriesForRollback?.id) {
        await supabase.from('exhibition_series').delete().eq('id', createdSeriesForRollback.id)
      }
      setSaveError(error?.message || '保存に失敗しました。入力内容や接続状況をご確認ください。')
    } finally {
      setSaving(false)
    }

    if (nextPath) navigate(nextPath)
  }

  function resetFieldsFromExhibition() {
    if (!exhibition) return
    setTitle(exhibition.title || '')
    setSlug(exhibition.slug || '')
    const s = exhibition.start_date || ''
    let e = exhibition.end_date || ''
    if (s && e && e < s) e = s
    setStartDate(s)
    setStartTime(exhibition.start_time || '')
    setEndDate(e)
    setEndTime(exhibition.end_time || '')
    setLocation(exhibition.location || '')
    setDescription(exhibition.description || '')
    setThumbnailUrl(getExhibitionThumbnailUrlFromRecord(exhibition))
    setVisibility(normalizeExhibitionVisibility(exhibition.visibility))
    applyDiscoverySnapshot(savedDiscoveryMetadata)
  }

  function handleCancelEdit() {
    resetFieldsFromExhibition()
    setEditSection(null)
  }

  function beginEditSection(id) {
    resetFieldsFromExhibition()
    setEditSection(id)
  }

  async function handleDeleteExhibition() {
    if (!supabase || isNew || !exhibitionId || exhibitionId === 'undefined') return
    setDeleting(true)
    try {
      const { error } = await deleteExhibition(supabase, exhibitionId)
      if (error) {
        window.alert(error.message ? `削除に失敗しました: ${error.message}` : '削除に失敗しました。')
        return
      }
      navigate(`${profileSlug ? profilePath(profileSlug) : `/${orgSlug}`}/dashboard`, { replace: true })
    } catch (error) {
      window.alert(error?.message ? `削除に失敗しました: ${error.message}` : '削除に失敗しました。')
    } finally {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  if (loading) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug} />
  )

  if (forbidden) return (
    <div className="ui-page-shell" style={{ display: 'grid', placeItems: 'center' }}>
      <p style={{ color: T.inkMuted, fontSize: 14 }}>このプロフィールの展示は管理できません</p>
    </div>
  )

  if (loadError && !owner) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
      <div className="ui-alert ui-alert--error">
        <div className="ui-kicker">読み込みエラー</div>
        <div className="ui-confirm-msg">{loadError}</div>
      </div>
    </DashShell>
  )

  const dashboardBase = profileSlug ? profilePath(profileSlug) : `/${orgSlug}`
  const publicBase = profileSlug ? `artoir.net/profile/${profileSlug}` : `artoir.net/${orgSlug}`
  const savedPublicUrl = `${publicBase}/exhibition/${exhibition?.slug || '(未保存)'}`
  const savedPeriodText = getExhibitionPeriodText(exhibition)
  const savedThumbnailUrl = getExhibitionThumbnailUrlFromRecord(exhibition)
  const persistedDiscovery = savedDiscoveryMetadata || {
    primaryDisciplineSlug: '',
    secondaryDisciplineSlugs: [],
    expressionTagSlugs: emptyTagSelection(),
    seriesMode: SERIES_MODE.STANDALONE,
    existingSeriesId: '',
    editionYear: '',
    editionNumber: '',
    editionLabel: '',
  }
  const savedDiscoverySummary = discoverySummary(
    persistedDiscovery.primaryDisciplineSlug,
    persistedDiscovery.secondaryDisciplineSlugs,
    persistedDiscovery.expressionTagSlugs,
  )
  const savedSeriesSummary = seriesSummary(
    persistedDiscovery.seriesMode,
    seriesOptions,
    persistedDiscovery.existingSeriesId,
    persistedDiscovery.editionYear,
    persistedDiscovery.editionNumber,
    persistedDiscovery.editionLabel,
  )
  const discoveryEditor = (showWarning = true) => (
    <DiscoveryEditor
      available={discoveryAvailable}
      warning={showWarning ? discoveryWarning : ''}
      primaryDisciplineSlug={primaryDisciplineSlug}
      setPrimaryDisciplineSlug={setPrimaryDisciplineSlug}
      secondaryDisciplineSlugs={secondaryDisciplineSlugs}
      setSecondaryDisciplineSlugs={setSecondaryDisciplineSlugs}
      selectedTagSlugs={selectedTagSlugs}
      setSelectedTagSlugs={setSelectedTagSlugs}
    />
  )
  const seriesEditor = (showWarning = true) => (
    <SeriesEditor
      available={discoveryAvailable}
      warning={showWarning ? discoveryWarning : ''}
      seriesMode={seriesMode}
      setSeriesMode={setSeriesMode}
      seriesOptions={seriesOptions}
      existingSeriesId={existingSeriesId}
      setExistingSeriesId={setExistingSeriesId}
      newSeriesName={newSeriesName}
      setNewSeriesName={setNewSeriesName}
      seriesDescription={seriesDescription}
      setSeriesDescription={setSeriesDescription}
      seriesRecurrence={seriesRecurrence}
      setSeriesRecurrence={setSeriesRecurrence}
      editionYear={editionYear}
      setEditionYear={setEditionYear}
      editionNumber={editionNumber}
      setEditionNumber={setEditionNumber}
      editionLabel={editionLabel}
      setEditionLabel={setEditionLabel}
      isSeriesMilestone={isSeriesMilestone}
      setIsSeriesMilestone={setIsSeriesMilestone}
      participantCount={participantCount}
      setParticipantCount={setParticipantCount}
    />
  )

  const formContent = (
    <div style={{ padding: isDesktop ? '28px 0' : '16px 16px' }}>
      <DashSectionLabel>基本情報</DashSectionLabel>
      {saveError && (
        <div className="ui-alert ui-alert--error" style={{ marginBottom: 16 }}>
          {saveError}
        </div>
      )}
      <DashField label="タイトル" value={title} onChange={setTitle} placeholder="" />
      <DashField
        label="URL"
        prefix={`${publicBase}/exhibition/`}
        value={isNew ? (slugifyAscii(title) || '(自動採番)') : slug}
        readOnly
        mono
        rightHint="保存時に自動生成"
        help="タイトルから自動生成されます。同じ名前の展覧会が既にある場合は連番（-2, -3 ...）が付きます。"
      />

      <DashSectionLabel>会期・会場</DashSectionLabel>
      <div className="ui-exhibition-date-grid">
        <DashField label="START" value={startDate} onChange={onStartDateChange} placeholder="YYYY-MM-DD" mono type="date" />
        <DashField label="START TIME" value={startTime} onChange={setStartTime} placeholder="--:--" mono type="time" />
        <DashField label="END" value={endDate} onChange={onEndDateChange} placeholder="YYYY-MM-DD" mono type="date" min={startDate || undefined} />
        <DashField label="END TIME" value={endTime} onChange={setEndTime} placeholder="--:--" mono type="time" />
      </div>
      <DashField label="会場" value={location} onChange={setLocation} placeholder="美術館、ギャラリー名等" />

      <DashSectionLabel>説明文</DashSectionLabel>
      <DashField
        label="説明文"
        value={description}
        onChange={setDescription}
        multiline
        placeholder="展覧会の説明文を入力..."
        help="公開ページのヒーロー下に表示されます（最大 400 文字）。"
      />

      <DashSectionLabel>芸術分野と表現</DashSectionLabel>
      {discoveryEditor(true)}

      <DashSectionLabel>展覧会シリーズ</DashSectionLabel>
      {seriesEditor(false)}

      <DashSectionLabel>公開設定</DashSectionLabel>
      <VisibilityPicker value={visibility} onChange={setVisibility} />

      <DashSectionLabel>サムネイル</DashSectionLabel>
      <div style={{ display: 'grid', gap: 12 }}>
        {thumbnailUrl ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <ArtworkMedia
              src={getThumbnailUrl(thumbnailUrl, 220)}
              alt={title || '展覧会サムネイル'}
              label={title || '展覧会サムネイル'}
              loading="eager"
              fit="contain"
              aspectRatio="1 / 1"
              wrapperStyle={{ width: 'min(220px, 100%)', borderRadius: 6 }}
              imageStyle={{ borderRadius: 6 }}
            />
            <button type="button" onClick={() => setThumbnailUrl('')} className="ui-btn ui-btn--ghost" style={{ width: 'fit-content' }}>
              サムネイルを削除
            </button>
          </div>
        ) : (
          <>
            <div className="ui-field-help">公開ページと一覧の先頭で使う画像です。設定しない場合は作品画像の先頭を使います。</div>
            <ImageUploader compressMaxDimension={1200} onUploaded={(url) => setThumbnailUrl(url)}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 14, color: T.ink }}>画像をアップロード</div>
                <div style={{ fontSize: 12, color: T.inkMuted }}>クリックまたはドラッグ&ドロップ</div>
              </div>
            </ImageUploader>
          </>
        )}
      </div>

      <div className="ui-btn-row" style={{ marginTop: 32 }}>
        {!isNew && (
          <button type="button" onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`${dashboardBase}/dashboard/exhibitions/${exhibitionId}/artworks`)} className="ui-btn ui-btn--ghost">
            作品を管理 →
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || deleting}
          className="ui-btn ui-btn--accent"
          style={{ flex: 1 }}
        >{saving ? '保存中…' : '保存'}</button>
      </div>

      {!isNew && (
        <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid #E4DDD2' }}>
          <DashSectionLabel>危険な操作</DashSectionLabel>
          <p className="ui-settings-danger-copy">
            この展覧会と登録済みの作品をすべて削除します。公開 URL は無効になります。
          </p>
          {deleteConfirm ? (
            <div className="ui-confirm">
              <div className="ui-kicker">削除の確認</div>
              <div className="ui-confirm-msg">{exhibition?.title?.trim() ? `「${exhibition.title}」を削除します。` : 'この展覧会を削除します。'}</div>
              <div className="ui-btn-row" style={{ marginTop: 16 }}>
                <button type="button" onClick={() => setDeleteConfirm(false)} disabled={deleting} className="ui-btn ui-btn--ghost">キャンセル</button>
                <button type="button" onClick={handleDeleteExhibition} disabled={deleting} className="ui-btn ui-btn--danger">{deleting ? '削除中…' : '削除する'}</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="ui-btn ui-btn--danger"
            >
              展覧会を削除
            </button>
          )}
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  )

  const existingContent = (
    <div className="ui-settings-page">
      <div className="ui-dashboard-list-head" style={{ marginBottom: 12 }}>
        <div className="ui-dashboard-list-head-copy">
          <div className="ui-dashboard-list-count">{exhibition?.title || '展覧会情報'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => exhibitionId && exhibitionId !== 'undefined' && navigate(`${dashboardBase}/dashboard/exhibitions/${exhibitionId}/artworks`)}
            className="ui-pill-action"
          >
            作品を管理
          </button>
        </div>
      </div>

      {saveError && (
        <div className="ui-alert ui-alert--error" style={{ marginBottom: 16 }} role="alert">
          {saveError}
        </div>
      )}

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="title"
        label="タイトル"
        value={fieldValue(exhibition?.title)}
        editChildren={(
          <>
            <DashField label="タイトル" value={title} onChange={setTitle} placeholder="" />
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="period"
        label="会期"
        value={savedPeriodText}
        mono
        editChildren={(
          <>
            <div className="ui-exhibition-date-grid">
              <DashField label="START" value={startDate} onChange={onStartDateChange} placeholder="YYYY-MM-DD" mono type="date" />
              <DashField label="START TIME" value={startTime} onChange={setStartTime} placeholder="--:--" mono type="time" />
              <DashField label="END" value={endDate} onChange={onEndDateChange} placeholder="YYYY-MM-DD" mono type="date" min={startDate || undefined} />
              <DashField label="END TIME" value={endTime} onChange={setEndTime} placeholder="--:--" mono type="time" />
            </div>
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="location"
        label="会場"
        value={fieldValue(exhibition?.location)}
        editChildren={(
          <>
            <DashField label="会場" value={location} onChange={setLocation} placeholder="例: 東京都・表参道 GALLERY 360°" />
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="description"
        label="説明文"
        value={fieldValue(exhibition?.description)}
        editChildren={(
          <>
            <DashField
              label="説明文"
              value={description}
              onChange={setDescription}
              multiline
              placeholder="展覧会の説明文を入力..."
            />
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="discovery"
        label="芸術分野と表現"
        value={savedDiscoverySummary}
        editChildren={(
          <>
            {discoveryEditor(true)}
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="series"
        label="展覧会シリーズ"
        value={savedSeriesSummary}
        editChildren={(
          <>
            {seriesEditor(true)}
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="visibility"
        label="公開設定"
        value={getExhibitionVisibilityLabel(exhibition)}
        editChildren={(
          <>
            <VisibilityPicker value={visibility} onChange={setVisibility} />
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </>
        )}
      />

      <ExhibitionItem
        editSection={editSection}
        onBeginEdit={beginEditSection}
        id="thumbnail"
        label="サムネイル"
        value={savedThumbnailUrl ? (
          <ArtworkMedia
            src={getThumbnailUrl(savedThumbnailUrl, 220)}
            alt={exhibition?.title || '展覧会サムネイル'}
            label={exhibition?.title || '展覧会サムネイル'}
            loading="eager"
            fit="contain"
            aspectRatio="1 / 1"
            wrapperStyle={{ width: 'min(180px, 100%)', borderRadius: 7 }}
            imageStyle={{ borderRadius: 7 }}
          />
        ) : '未設定'}
        editChildren={(
          <div style={{ display: 'grid', gap: 10 }}>
            {thumbnailUrl ? (
              <>
                <ArtworkMedia
                  src={getThumbnailUrl(thumbnailUrl, 220)}
                  alt={title || '展覧会サムネイル'}
                  label={title || '展覧会サムネイル'}
                  loading="eager"
                  fit="contain"
                  aspectRatio="1 / 1"
                  wrapperStyle={{ width: 'min(220px, 100%)', borderRadius: 7 }}
                  imageStyle={{ borderRadius: 7 }}
                />
                <div className="ui-settings-edit-actions" style={{ justifyContent: 'flex-start' }}>
                  <ImageUploader
                    compressMaxDimension={1200}
                    onUploaded={(url) => setThumbnailUrl(url)}
                    variant="button"
                    buttonLabel="サムネイル画像を変更"
                  >
                    画像を変更
                  </ImageUploader>
                  <button type="button" onClick={() => setThumbnailUrl('')} className="ui-settings-secondary-button">
                    削除
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ui-field-help">公開ページと一覧の先頭で使う画像です。設定しない場合は作品画像の先頭を使います。</div>
                <ImageUploader compressMaxDimension={1200} onUploaded={(url) => setThumbnailUrl(url)}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontFamily: T.serif, fontSize: 14, color: T.ink }}>画像をアップロード</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>クリックまたはドラッグ&ドロップ</div>
                  </div>
                </ImageUploader>
              </>
            )}
            <ExhibitionSaveActions onCancel={handleCancelEdit} onSave={handleSave} saving={saving} deleting={deleting} />
          </div>
        )}
      />

      <ExhibitionItem id="url" label="公開URL" value={savedPublicUrl} mono />

      <section className="ui-settings-section is-danger">
        <div className="ui-settings-section-head">
        </div>
        <p className="ui-settings-danger-copy">
          この展覧会と登録済みの作品をすべて削除します。公開 URL は無効になります。
        </p>
        {deleteConfirm ? (
          <div className="ui-confirm">
            <div className="ui-kicker">削除の確認</div>
            <div className="ui-confirm-msg">{exhibition?.title?.trim() ? `「${exhibition.title}」を削除します。` : 'この展覧会を削除します。'}</div>
            <div className="ui-btn-row" style={{ marginTop: 16 }}>
              <button type="button" onClick={() => setDeleteConfirm(false)} disabled={deleting} className="ui-btn ui-btn--ghost">キャンセル</button>
              <button type="button" onClick={handleDeleteExhibition} disabled={deleting} className="ui-btn ui-btn--danger">{deleting ? '削除中…' : '削除する'}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setDeleteConfirm(true)} className="ui-btn ui-btn--danger">
            展覧会を削除
          </button>
        )}
      </section>
    </div>
  )

  if (isDesktop) return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {isNew ? (
          <>
            <div className="ui-hero-screen-heading" style={{ marginBottom: 14 }}>
              <h1 className="ui-screen-title" style={{ marginTop: 8 }}>新しい展覧会</h1>
              <p className="ui-screen-subtitle">基本情報を入れると、公開ページが作成されます。</p>
            </div>
            {formContent}
          </>
        ) : existingContent}
      </div>
    </DashShell>
  )

  return (
    <DashShell orgSlug={orgSlug} profileSlug={profileSlug}>
      {isNew ? (
        <>
          <div className="ui-hero-screen-heading" style={{ marginBottom: 14 }}>
            <h1 className="ui-screen-title" style={{ marginTop: 6 }}>新しい展覧会</h1>
            <p className="ui-screen-subtitle">下の項目を入力すると、公開ページが作成されます。</p>
          </div>
          {formContent}
        </>
      ) : existingContent}
    </DashShell>
  )
}
