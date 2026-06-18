import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useResolvedSession } from '../lib/useResolvedSession'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkMedia from '../components/ArtworkMedia'
import ArtworkModal from '../components/ArtworkModal'
import ImageUploader from '../components/ImageUploader'
import ArtworkCreateModal from '../components/ArtworkCreateModal'
import { T, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { attachNormalizedCreators, normalizeProfile } from '../lib/profile'
import { getGalleryThumbnailUrl } from '../lib/imageUrl'
import { ensureProfileWorksExhibition } from '../lib/profileWorks'

function LoggedOut({ isDesktop }) {
  const navigate = useNavigate()
  const benefits = [
    ['01', 'プロフィールを設定する', '表示名とIDを決めて、artoirを始める。'],
    ['02', '団体を作成する', '部・サークル・研究室の展示活動をまとめる。'],
    ['03', '作品を管理する', '作品画像・作者プロフィール・説明文を整理する。'],
  ]

  const content = (
    <>
      <div className="ui-kicker">ゲスト</div>
      <div className="ui-screen-title" style={{ marginTop: isDesktop ? 8 : 6 }}>アカウント</div>
      <div className="ui-screen-subtitle" style={{ fontFamily: isDesktop ? T.serifBody : undefined, marginBottom: isDesktop ? 22 : undefined }}>
        ログインすると、プロフィールと団体の展示を管理できます。
      </div>
      <button onClick={() => navigate('/login')} className="ui-pill-action" style={{ marginTop: isDesktop ? 0 : 22, width: '100%', justifyContent: 'space-between' }}>
        <span>ログイン / 新規登録</span>
        <span style={{ fontFamily: T.mono, fontSize: 12 }}>→</span>
      </button>
      <div className="ui-account-benefits" style={{ marginTop: isDesktop ? undefined : 32 }}>
        <div style={{ paddingBottom: 8, borderBottom: `1px solid ${T.ink}`, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.ink }}>ログインでできること</div>
        {benefits.map(([n, title, desc]) => (
          <div key={n} className="ui-account-row" style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: isDesktop ? T.inkMuted : T.accent }}>{n}</div>
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: T.ink }}>{title}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  return <div className={`ui-account-surface ${isDesktop ? 'ui-account-surface-desktop' : ''}`}>{content}</div>
}

function ProfileSummary({ profile, onAddWork, preparingWork }) {
  return (
    <section className="ui-app-card ui-profile-summary-card">
      <div className="ui-kicker">プロフィール</div>
      <div className="ui-profile-summary-row">
        <div className="ui-profile-summary-main">
          <div className="ui-screen-title" style={{ fontSize: 28 }}>{profile.display_name}</div>
          <div style={{ marginTop: 4, fontFamily: T.mono, fontSize: 11, color: T.inkMuted }}>@{profile.slug}</div>
          {profile.bio && <p className="ui-screen-subtitle" style={{ marginTop: 10, maxWidth: 620 }}>{profile.bio}</p>}
        </div>
        <div className="ui-profile-summary-actions">
          <Link to="/account/setup" className="ui-pill-action" style={{ background: T.paperAlt, color: T.ink }}>
            <span>プロフィール編集</span>
          </Link>
          <ImageUploader
            variant="button"
            buttonClassName="ui-pill-action--accent"
            buttonLabel="作品を追加"
            onFileSelected={onAddWork}
          >
            <span>{preparingWork ? '準備中...' : '作品を追加'}</span>
          </ImageUploader>
        </div>
      </div>
    </section>
  )
}

function AccountArtworkCard({ artwork, onOpen, onEdit }) {
  const exhibition = artwork?.exhibitions
  const hasOwner = Boolean(exhibition?.organizations?.slug || exhibition?.profiles?.slug)
  const isOwnProfileWork = Boolean(exhibition?.profile_id)
  const hasTitle = Boolean(artwork.title?.trim())
  if (!artwork?.image_url || !exhibition || !hasOwner) return null

  return (
    <div className="ui-list-card ui-profile-artwork-card">
      <button type="button" onClick={() => onOpen(artwork)} className="ui-account-artwork-preview">
        <ArtworkMedia
          src={getGalleryThumbnailUrl(artwork.image_url)}
          alt=""
          decorative
          loading="lazy"
          aspectRatio="1 / 1"
          fit="contain"
          className="ui-profile-artwork-media"
          wrapperStyle={{ borderRadius: 7, background: 'rgba(228, 211, 184, 0.12)' }}
          imageStyle={{ borderRadius: 7 }}
        />
      </button>
      <div className="ui-profile-artwork-card-body">
        {hasTitle && <div className="ui-profile-artwork-title">{artwork.title}</div>}
        {isOwnProfileWork && (
          <button type="button" onClick={() => onEdit(artwork)} className="ui-account-artwork-edit">
            編集
          </button>
        )}
      </div>
    </div>
  )
}

function AccountArtworkEditModal({ artwork, title, description, saving, deleting, error, onTitleChange, onDescriptionChange, onSave, onDelete, onClose }) {
  if (!artwork) return null
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="account-artwork-edit-title" style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(17,17,16,0.5)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="ui-app-card" style={{ width: 'min(100%, 520px)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: 18 }}>
        <div id="account-artwork-edit-title" className="ui-screen-title" style={{ fontSize: 22 }}>作品を編集</div>
        <div style={{ marginTop: 14 }}>
          <ArtworkMedia
            src={artwork.image_url}
            alt=""
            decorative
            loading="eager"
            fit="contain"
            minHeight={180}
            wrapperStyle={{ borderRadius: 8 }}
            imageStyle={{ borderRadius: 8, maxHeight: 280, objectFit: 'contain' }}
          />
        </div>
        <div style={{ marginTop: 14 }} className="ui-input-wrap">
          <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="作品名を入力" />
        </div>
        <div style={{ marginTop: 12 }} className="ui-input-wrap" data-multiline="true">
          <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={4} placeholder="説明文を入力" />
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: '10px 12px', border: `1px solid ${T.accent}`, color: T.accent, background: 'rgba(190,85,61,0.06)', fontSize: 12 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onClose} disabled={saving || deleting} className="ui-pill-action" style={{ flex: 1, background: T.paperAlt, color: T.ink }}>閉じる</button>
          <button type="button" onClick={onSave} disabled={saving || deleting} className="ui-pill-action" style={{ flex: 1, background: T.accent, opacity: saving ? 0.6 : 1 }}>{saving ? '保存中...' : '保存する'}</button>
        </div>
        <button type="button" onClick={onDelete} disabled={saving || deleting} className="ui-icon-button" style={{ marginTop: 12, width: '100%', padding: '12px', background: 'transparent', color: T.accent, border: `1px solid ${T.accent}`, fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
          {deleting ? '削除中...' : '作品を削除'}
        </button>
      </div>
    </div>
  )
}

function OrganizationSelector({ orgs, onSelect, onSignOut, isDesktop }) {
  const actions = (
    <div className="ui-account-floating-actions">
      <Link to="/account/organizations/new" className="ui-account-floating-action is-primary">
        <span>＋ 団体を作成</span>
      </Link>
      <button type="button" onClick={onSignOut} className="ui-account-floating-action">
        ログアウト
      </button>
    </div>
  )

  if (orgs.length === 0) {
    return (
      <div className="ui-account-surface">
        <div className="ui-kicker">団体</div>
        <div style={{ marginTop: 8, fontFamily: T.serif, fontSize: 22, color: T.ink }}>管理している団体はまだありません</div>
        <div style={{ marginTop: 8, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>団体を作成すると、展示と作品を管理できます。</div>
        {actions}
      </div>
    )
  }

  const list = (
    <div className="ui-org-table ui-account-org-picker-table">
      <div className="ui-org-table-head" aria-hidden="true">
        <span>No.</span>
        <span>団体</span>
        <span className="ui-account-org-picker-head-go" />
      </div>
      <div className="ui-org-list">
        {orgs.map((org, i) => (
          <button key={org.id} type="button" onClick={() => onSelect(org)} className="ui-org-row ui-account-org-pick-btn">
            <div className="ui-org-index">{pad2(i + 1)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="ui-org-name-row">
                <span className="ui-org-name">{org.name}</span>
              </div>
              {org.description && (
                <div className="ui-org-description">
                  {org.description.slice(0, isDesktop ? 120 : 50)}
                  {org.description.length > (isDesktop ? 120 : 50) ? '…' : ''}
                </div>
              )}
            </div>
            <div className="ui-account-org-pick-go" aria-hidden="true">→</div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className={`ui-account-surface ${isDesktop ? 'ui-account-org-selector-desktop' : ''}`}>
      <div className="ui-kicker" style={{ marginBottom: 12 }}>団体</div>
      {list}
      {actions}
    </div>
  )
}

export default function AccountPage() {
  const { session, ready } = useResolvedSession()
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [artworks, setArtworks] = useState([])
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [worksExhibitionId, setWorksExhibitionId] = useState(null)
  const [createFile, setCreateFile] = useState(null)
  const [preparingWork, setPreparingWork] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editDeleting, setEditDeleting] = useState(false)
  const [editError, setEditError] = useState('')
  const [loading, setLoading] = useState(true)
  const [profileMissing, setProfileMissing] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!ready) return undefined
    if (!supabase || !session) {
      setProfile(null)
      setOrgs([])
      setArtworks([])
      setSelectedArtwork(null)
      setWorksExhibitionId(null)
      setProfileMissing(false)
      setLoadError('')
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const [{ data: profileData, error: profileError }, { data: membershipRows, error: membershipError }, { data: artworkRows, error: artworkError }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
          supabase
            .from('organization_members')
            .select('role, organizations(*)')
            .eq('profile_id', session.user.id),
          supabase
            .from('artwork_creators')
            .select('display_order, artworks(id, title, description, image_url, order, artwork_creators(profile_id, display_order, is_visible, profiles(id, slug, display_name)), exhibitions(id, title, slug, organization_id, profile_id, organizations(id, name, slug), profiles(id, display_name, slug)))')
            .eq('profile_id', session.user.id)
            .order('display_order', { ascending: true }),
        ])
        if (cancelled) return
        if (profileError) {
          setProfile(null)
          setProfileMissing(false)
          setLoadError(profileError.message || 'プロフィールの読み込みに失敗しました。')
          setOrgs([])
          setArtworks([])
          return
        }
        setProfile(normalizeProfile(profileData))
        setProfileMissing(!profileData)
        setLoadError(membershipError?.message || artworkError?.message || '')
        setOrgs((membershipRows || []).map((row) => row.organizations).filter(Boolean))
        setArtworks((artworkRows || []).map((row) => attachNormalizedCreators(row.artworks)).filter((artwork) => artwork?.image_url))
      } catch {
        if (!cancelled) {
          setProfile(null)
          setOrgs([])
          setArtworks([])
          setProfileMissing(false)
          setLoadError('アカウント情報の読み込みに失敗しました。')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [session, ready])

  function handleSelectOrg(org) {
    navigate(`/${org.slug}/dashboard`)
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    navigate('/')
  }

  async function prepareWorksExhibition() {
    if (!supabase || !profile?.id) throw new Error('プロフィールを読み込めていません。')
    if (worksExhibitionId) return worksExhibitionId
    setPreparingWork(true)
    try {
      const exhibition = await ensureProfileWorksExhibition(supabase, profile.id)
      setWorksExhibitionId(exhibition.id)
      return exhibition.id
    } finally {
      setPreparingWork(false)
    }
  }

  async function handleAddWork(file) {
    try {
      await prepareWorksExhibition()
      if (file instanceof File) setCreateFile(file)
      return true
    } catch (error) {
      setLoadError(error?.message || '作品追加の準備に失敗しました。')
      return false
    }
  }

  function openEditArtwork(artwork) {
    setEditTarget(artwork)
    setEditTitle(artwork.title || '')
    setEditDescription(artwork.description || '')
    setEditError('')
  }

  async function handleEditSave() {
    if (!editTarget || !supabase) return
    setEditSaving(true)
    setEditError('')
    const updates = { title: editTitle.trim(), description: editDescription.trim() || null }
    const { error } = await supabase.from('artworks').update(updates).eq('id', editTarget.id)
    setEditSaving(false)
    if (error) {
      setEditError(error.message || '保存に失敗しました。')
      return
    }
    const updated = { ...editTarget, ...updates }
    setArtworks((prev) => prev.map((artwork) => artwork.id === editTarget.id ? updated : artwork))
    setSelectedArtwork((prev) => prev?.id === editTarget.id ? updated : prev)
    setEditTarget(null)
  }

  async function handleEditDelete() {
    if (!editTarget || !supabase) return
    const ok = window.confirm(editTarget.title?.trim() ? `「${editTarget.title}」を削除しますか？` : 'この作品を削除しますか？')
    if (!ok) return
    setEditDeleting(true)
    setEditError('')
    const { error } = await supabase.from('artworks').delete().eq('id', editTarget.id)
    setEditDeleting(false)
    if (error) {
      setEditError(error.message || '削除に失敗しました。')
      return
    }
    setArtworks((prev) => prev.filter((artwork) => artwork.id !== editTarget.id))
    setSelectedArtwork((prev) => prev?.id === editTarget.id ? null : prev)
    setEditTarget(null)
  }

  const showLoading = !ready || loading
  if (!showLoading && session && profileMissing) return <Navigate to="/account/setup" replace />

  function renderContent() {
    if (showLoading) {
      return (
        <div style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
          <span style={{ fontFamily: T.mono, color: T.inkMuted, fontSize: 11 }}>...</span>
        </div>
      )
    }

    if (!session) return <LoggedOut isDesktop={isDesktop} />

    if (!profile) {
      return (
        <div className="ui-account-surface">
          <div className="ui-kicker">プロフィール</div>
          <div style={{ marginTop: 8, fontFamily: T.serif, fontSize: 22, color: T.ink }}>プロフィールを読み込めませんでした</div>
          <div style={{ marginTop: 8, fontSize: 12, color: T.accent, lineHeight: 1.7 }}>{loadError || '時間をおいて再度お試しください。'}</div>
          <button type="button" onClick={handleSignOut} className="ui-pill-action" style={{ marginTop: 18, background: T.paperAlt, color: T.ink }}>
            ログアウト
          </button>
        </div>
      )
    }

    return (
      <>
        <ProfileSummary profile={profile} onAddWork={handleAddWork} preparingWork={preparingWork} />
        {loadError && (
          <div className="ui-app-card" style={{ padding: 14, marginBottom: 14, borderColor: T.accent, color: T.accent, fontSize: 12 }}>
            {loadError}
          </div>
        )}
        <OrganizationSelector orgs={orgs} onSelect={handleSelectOrg} onSignOut={handleSignOut} isDesktop={isDesktop} />
        {artworks.length > 0 && (
          <>
            <div className="ui-app-topline" style={{ marginTop: 18 }}>
              <div>
                <div className="ui-screen-title" style={{ fontSize: 22 }}>作品</div>
              </div>
            </div>
            <div className="ui-profile-artwork-grid ui-account-artwork-grid">
              {artworks.map((artwork) => (
                <AccountArtworkCard key={artwork.id} artwork={artwork} onOpen={setSelectedArtwork} onEdit={openEditArtwork} />
              ))}
            </div>
          </>
        )}
      </>
    )
  }

  if (isDesktop) return (
    <div className="ui-page-shell">
      <Header activeTab="account" />
      <main className="ui-app-main">{renderContent()}</main>
      <ArtworkModal
        artwork={selectedArtwork}
        artworks={artworks}
        onSelectArtwork={setSelectedArtwork}
        onClose={() => setSelectedArtwork(null)}
      />
      <ArtworkCreateModal
        open={Boolean(createFile)}
        file={createFile}
        exhibitionId={worksExhibitionId}
        nextOrder={artworks.length > 0 ? Math.max(...artworks.map((artwork) => artwork.order ?? 0)) + 1 : 1}
        creatorOptions={profile ? [profile] : []}
        defaultCreatorIds={profile ? [profile.id] : []}
        onClose={() => setCreateFile(null)}
        onCreated={(newWork) => {
          if (!newWork) return
          setArtworks((prev) => [...prev, {
            ...newWork,
            exhibitions: { id: worksExhibitionId, title: '作品', slug: 'works', profile_id: profile.id, profiles: { id: profile.id, slug: profile.slug, display_name: profile.display_name } },
          }])
          setCreateFile(null)
        }}
      />
      <AccountArtworkEditModal
        artwork={editTarget}
        title={editTitle}
        description={editDescription}
        saving={editSaving}
        deleting={editDeleting}
        error={editError}
        onTitleChange={setEditTitle}
        onDescriptionChange={setEditDescription}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
        onClose={() => setEditTarget(null)}
      />
    </div>
  )

  return (
    <div className="ui-page-shell" style={{ paddingBottom: 92 }}>
      <Header activeTab="account" />
      {renderContent()}
      <ArtworkModal
        artwork={selectedArtwork}
        artworks={artworks}
        onSelectArtwork={setSelectedArtwork}
        onClose={() => setSelectedArtwork(null)}
      />
      <ArtworkCreateModal
        open={Boolean(createFile)}
        file={createFile}
        exhibitionId={worksExhibitionId}
        nextOrder={artworks.length > 0 ? Math.max(...artworks.map((artwork) => artwork.order ?? 0)) + 1 : 1}
        creatorOptions={profile ? [profile] : []}
        defaultCreatorIds={profile ? [profile.id] : []}
        onClose={() => setCreateFile(null)}
        onCreated={(newWork) => {
          if (!newWork) return
          setArtworks((prev) => [...prev, {
            ...newWork,
            exhibitions: { id: worksExhibitionId, title: '作品', slug: 'works', profile_id: profile.id, profiles: { id: profile.id, slug: profile.slug, display_name: profile.display_name } },
          }])
          setCreateFile(null)
        }}
      />
      <AccountArtworkEditModal
        artwork={editTarget}
        title={editTitle}
        description={editDescription}
        saving={editSaving}
        deleting={editDeleting}
        error={editError}
        onTitleChange={setEditTitle}
        onDescriptionChange={setEditDescription}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
        onClose={() => setEditTarget(null)}
      />
      <BottomNav active="account" />
    </div>
  )
}
