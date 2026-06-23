import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useResolvedSession } from '../lib/useResolvedSession'
import Header, { Icon } from '../components/Header'
import BottomNav from '../components/BottomNav'
import ArtworkMedia from '../components/ArtworkMedia'
import ArtworkModal from '../components/ArtworkModal'
import ImageUploader from '../components/ImageUploader'
import ArtworkCreateModal from '../components/ArtworkCreateModal'
import ArtworkEditModal from '../components/ArtworkEditModal'
import LoadingFrames from '../components/LoadingFrames'
import { useDelayedLoading } from '../lib/useDelayedLoading'
import { T, pad2 } from '../lib/tokens'
import { useIsDesktop } from '../lib/useIsDesktop'
import { attachNormalizedCreators, normalizeProfile } from '../lib/profile'
import { getGalleryThumbnailUrl } from '../lib/imageUrl'
import { ensureProfileWorksExhibition } from '../lib/profileWorks'
import { getArtworkUploadConfigError, uploadArtworkImage } from '../lib/artworkUpload'
import { profilePath } from '../lib/profileRoutes'

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
      <button onClick={() => navigate('/login')} className="ui-btn ui-btn--primary ui-btn-block" style={{ marginTop: isDesktop ? 0 : 22, justifyContent: 'space-between' }}>
        <span>ログイン / 新規登録</span>
        <span aria-hidden="true">→</span>
      </button>
      <div className="ui-account-benefits" style={{ marginTop: isDesktop ? undefined : 32 }}>
        <div className="ui-section-label" style={{ margin: '0 0 8px', paddingBottom: 8, borderBottom: `1px solid ${T.lineSoft}` }}>ログインでできること</div>
        {benefits.map(([n, title, desc]) => (
          <div key={n} className="ui-account-row" style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 }}>
            <div style={{ fontSize: 12, color: isDesktop ? T.inkMuted : T.accent }}>{n}</div>
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

function ProfileSummary({ profile }) {
  return (
    <section className="ui-account-section">
      <div className="ui-account-section-head">
        <div className="ui-kicker">プロフィール</div>
        <div className="ui-profile-summary-actions">
          <Link to={profilePath(profile.slug)} className="ui-inline-edit-action">
            <span>公開ページ</span>
          </Link>
          <Link to="/account/setup" className="ui-inline-edit-action">
            <span>プロフィール編集</span>
          </Link>
        </div>
      </div>
      <div className="ui-screen-title" style={{ fontSize: 28 }}>{profile.display_name}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: T.inkMuted }}>@{profile.slug}</div>
      {profile.bio && <p className="ui-screen-subtitle" style={{ marginTop: 10 }}>{profile.bio}</p>}
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
      <div className="ui-account-artwork-media">
        <button type="button" onClick={() => onOpen(artwork)} className="ui-account-artwork-preview">
          <ArtworkMedia
            src={getGalleryThumbnailUrl(artwork.image_url)}
            alt=""
            decorative
            loading="lazy"
            aspectRatio="1 / 1"
            fit="contain"
            className="ui-profile-artwork-media"
            wrapperStyle={{ background: T.surfaceMuted }}
          />
        </button>
        {isOwnProfileWork && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(artwork) }}
            className="ui-account-artwork-edit"
            aria-label="作品を編集"
          >
            <Icon name="edit" size={15} />
          </button>
        )}
      </div>
      {hasTitle && (
        <div className="ui-profile-artwork-card-body">
          <div className="ui-profile-artwork-title">{artwork.title}</div>
        </div>
      )}
    </div>
  )
}

function OrganizationSelector({ orgs, onSelect, isDesktop }) {
  return (
    <section className="ui-account-section">
      <div className="ui-account-section-head">
        <div className="ui-kicker">団体</div>
        <Link to="/account/organizations/new" className="ui-btn ui-btn--accent">
          <Icon name="plus" size={15} />
          <span>団体を作成</span>
        </Link>
      </div>
      {orgs.length === 0 ? (
        <p className="ui-panel" style={{ color: T.inkMuted, fontSize: 13 }}>管理している団体はまだありません</p>
      ) : (
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
      )}
    </section>
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
        const [{ data: profileData, error: profileError }, { data: membershipRows, error: membershipError }, { data: worksExhibition, error: worksExhibitionError }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
          supabase
            .from('organization_members')
            .select('role, organizations(*)')
            .eq('profile_id', session.user.id),
          supabase
            .from('exhibitions')
            .select('id, title, slug, organization_id, profile_id')
            .eq('profile_id', session.user.id)
            .eq('slug', 'works')
            .maybeSingle(),
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
        setLoadError(membershipError?.message || worksExhibitionError?.message || '')
        setOrgs((membershipRows || []).map((row) => row.organizations).filter(Boolean))
        setWorksExhibitionId(worksExhibition?.id || null)
        if (worksExhibition?.id) {
          const { data: artworkRows, error: artworkError } = await supabase
            .from('artworks')
            .select('id, title, description, image_url, file_name, file_size, order, artwork_creators(profile_id, display_order, profiles(id, slug, display_name))')
            .eq('exhibition_id', worksExhibition.id)
            .order('order')
          if (cancelled) return
          if (artworkError) setLoadError(artworkError.message || '')
          setArtworks((artworkRows || []).map((artwork) => attachNormalizedCreators({
            ...artwork,
            exhibitions: {
              ...worksExhibition,
              organizations: null,
              profiles: profileData,
            },
          })).filter((artwork) => artwork?.image_url))
        } else {
          setArtworks([])
        }
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

  async function handleEditSave(imageBlob) {
    if (!editTarget || !supabase) return
    setEditSaving(true)
    setEditError('')
    try {
      let imageUpdates = {}
      if (imageBlob) {
        const configError = getArtworkUploadConfigError()
        if (configError) throw new Error(configError)
        const baseName = editTarget.file_name?.replace(/\.[^.]+$/, '') || `artwork-${editTarget.id}`
        const uploadName = `${baseName}-edit.${imageBlob.type === 'image/png' ? 'png' : 'jpg'}`
        const imageUrl = await uploadArtworkImage(imageBlob, uploadName)
        imageUpdates = { image_url: imageUrl, file_size: imageBlob.size }
      }

      const updates = { title: editTitle.trim(), description: editDescription.trim() || null, ...imageUpdates }
      const { error } = await supabase.from('artworks').update(updates).eq('id', editTarget.id)
      if (error) throw error

      const updated = { ...editTarget, ...updates }
      setArtworks((prev) => prev.map((artwork) => artwork.id === editTarget.id ? updated : artwork))
      setSelectedArtwork((prev) => prev?.id === editTarget.id ? updated : prev)
      setEditTarget(null)
    } catch (error) {
      setEditError(error.message || '保存に失敗しました。')
    } finally {
      setEditSaving(false)
    }
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

  const showSessionLoading = useDelayedLoading(!ready)
  if (!showSessionLoading && !loading && session && profileMissing) return <Navigate to="/account/setup" replace />

  function renderContent() {
    if (showSessionLoading) {
      return (
        <div style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
          <LoadingFrames />
        </div>
      )
    }

    if (!session) return <LoggedOut isDesktop={isDesktop} />

    if (loading) {
      return (
        <div style={{ minHeight: 240 }} />
      )
    }

    if (!profile) {
      return (
        <div className="ui-account-surface">
          <div className="ui-kicker">プロフィール</div>
          <div style={{ marginTop: 8, fontFamily: T.serif, fontSize: 22, color: T.ink }}>プロフィールを読み込めませんでした</div>
          <div style={{ marginTop: 8, fontSize: 12, color: T.accent, lineHeight: 1.7 }}>{loadError || '時間をおいて再度お試しください。'}</div>
          <button type="button" onClick={handleSignOut} className="ui-btn ui-btn--ghost" style={{ marginTop: 18 }}>
            ログアウト
          </button>
        </div>
      )
    }

    return (
      <>
        <ProfileSummary profile={profile} />
        {loadError && (
          <div className="ui-alert ui-alert--error" style={{ marginBottom: 16 }}>{loadError}</div>
        )}
        <OrganizationSelector orgs={orgs} onSelect={handleSelectOrg} isDesktop={isDesktop} />

        <section className="ui-account-section">
          <div className="ui-account-section-head">
            <div className="ui-kicker">作品</div>
            <ImageUploader
              variant="button"
              buttonClassName="ui-pill-action--accent"
              buttonLabel="作品を追加"
              onFileSelected={handleAddWork}
            >
              <Icon name="plus" size={15} />
              <span>{preparingWork ? '準備中…' : '作品を追加'}</span>
            </ImageUploader>
          </div>
          {artworks.length > 0 ? (
            <div className="ui-profile-artwork-grid ui-account-artwork-grid">
              {artworks.map((artwork) => (
                <AccountArtworkCard key={artwork.id} artwork={artwork} onOpen={setSelectedArtwork} onEdit={openEditArtwork} />
              ))}
            </div>
          ) : (
            <p className="ui-panel" style={{ color: T.inkMuted, fontSize: 13 }}>作品がまだありません</p>
          )}
        </section>

        <button type="button" onClick={handleSignOut} className="ui-btn ui-btn--ghost" style={{ marginTop: 20 }}>
          ログアウト
        </button>
      </>
    )
  }

  if (isDesktop) return (
    <div className="ui-page-shell">
      <Header activeTab="account" />
      <main className="ui-app-main ui-account-main">{renderContent()}</main>
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
      {editTarget && (
        <ArtworkEditModal
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
      )}
    </div>
  )

  return (
    <div className="ui-page-shell">
      <Header activeTab="account" />
      <main className="ui-app-main ui-account-main">{renderContent()}</main>
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
      {editTarget && (
        <ArtworkEditModal
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
      )}
      <BottomNav active="account" />
    </div>
  )
}
