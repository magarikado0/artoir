import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LpHeader, LpFooter, LpGlyph } from '../components/LandingChrome'
import ExhibitionListCard from '../components/ExhibitionListCard'
import { mapExhibitionListRow } from '../lib/exhibition'
import { isProfileWorksExhibition } from '../lib/profileWorks'
import heroGallery from '../assets/lp-hero-gallery.webp'

const FEATURES = [
  {
    icon: 'create',
    title: '展覧会ページを作成',
    text: '展覧会ごとに専用ページを作成。作品・会期・コンセプトなどをまとめて紹介できます。',
  },
  {
    icon: 'cube',
    title: '3Dで巡る展示体験',
    text: '実際の展示空間を3Dで再現。自宅からでも、会場を歩くように作品を鑑賞できます。',
  },
  {
    icon: 'archive',
    title: 'いつでも見られるアーカイブ',
    text: '過去の展覧会も美しく保存。代替わりしても、活動の記録を未来へつなげます。',
  },
  {
    icon: 'reach',
    title: '多くの人に届ける',
    text: 'ポータルサイトで多くの人に発見され、新しい出会いやつながりを生み出します。',
  },
]

export default function LandingPage() {
  const [cases, setCases] = useState([])

  useEffect(() => {
    document.title = 'Artoir — 展覧会の記録を、いつまでも美しく。'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) return
      try {
        const { data, error } = await supabase
          .from('exhibitions')
          .select('*, organizations(id, name, slug), profiles(id, display_name, slug), artworks(image_url, order)')
          .order('start_date', { ascending: false })
          .limit(9)
        if (error) throw error
        if (cancelled) return
        setCases((data || [])
          .filter((exh) => !isProfileWorksExhibition(exh))
          .slice(0, 3)
          .map((exh) => {
            const { organizations: org, profiles: profile, ...rest } = exh
            const exhibition = mapExhibitionListRow(rest)
            return { exhibition, org, profile, artworkCount: exhibition.artworkCount }
          }))
      } catch {
        /* 事例セクションはリンクのみ表示 */
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="ui-lp-shell">
      <LpHeader />
      <main className="ui-lp-main">
        <section className="ui-lp-hero" id="about" aria-labelledby="lp-hero-title">
          <div className="ui-lp-rise">
            <p className="ui-lp-eyebrow">展示の体験ごと、未来へつなぐアーカイブ</p>
            <h1 className="ui-lp-headline" id="lp-hero-title">
              展覧会の記録を、<br />いつまでも<em>美しく</em>。
            </h1>
            <p className="ui-lp-lead">
              Artoirは、展覧会をWeb上に残し、いつでも誰でも作品や展示空間を体験できるアートアーカイブプラットフォームです。
            </p>
            <div className="ui-lp-cta-row">
              <Link to="/exhibitions" className="ui-lp-btn ui-lp-btn--accent ui-lp-btn--large">展覧会を探す</Link>
              <Link to="/publish" className="ui-lp-btn ui-lp-btn--ghost ui-lp-btn--large">掲載団体を募集しています</Link>
            </div>
          </div>
          <div className="ui-lp-hero-art ui-lp-rise ui-lp-rise--2">
            <img src={heroGallery} alt="作品が並ぶ展示室" width="506" height="416" decoding="async" fetchPriority="high" />
          </div>
        </section>

        <section className="ui-lp-section" id="features" aria-labelledby="lp-features-title">
          <div className="ui-lp-section-head">
            <h2 className="ui-lp-section-title" id="lp-features-title">Artoirでできること</h2>
          </div>
          <div className="ui-lp-features">
            {FEATURES.map((f) => (
              <div className="ui-lp-feature" key={f.icon}>
                <span className="ui-lp-feature-icon"><LpGlyph name={f.icon} /></span>
                <h3 className="ui-lp-feature-title">{f.title}</h3>
                <p className="ui-lp-feature-text">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-lp-section" id="cases" aria-labelledby="lp-cases-title">
          <div className="ui-lp-section-head">
            <h2 className="ui-lp-section-title" id="lp-cases-title">掲載事例</h2>
          </div>
          {cases.length > 0 && (
            <div className="ui-exhibition-list-grid">
              {cases.map((row) => (
                <ExhibitionListCard
                  key={row.exhibition.id}
                  exhibition={row.exhibition}
                  org={row.org}
                  profile={row.profile}
                  artworkCount={row.artworkCount}
                />
              ))}
            </div>
          )}
          <div className="ui-lp-cases-more">
            <Link to="/exhibitions" className="ui-lp-btn ui-lp-btn--ghost">展覧会をもっと見る</Link>
          </div>
        </section>

        <section className="ui-lp-section" aria-labelledby="lp-join-title">
          <div className="ui-lp-band">
            <p className="ui-lp-eyebrow">掲載団体募集中</p>
            <h2 className="ui-lp-band-title" id="lp-join-title">あなたの展覧会を、Artoirで公開しませんか？</h2>
            <p className="ui-lp-band-text">
              これからの展覧会も、過去の展覧会も掲載できます。<br />
              まずはお気軽にご相談ください。
            </p>
            <div className="ui-lp-cta-row">
              <Link to="/publish" className="ui-lp-btn ui-lp-btn--accent ui-lp-btn--large">掲載について詳しく見る</Link>
            </div>
          </div>
        </section>
      </main>
      <LpFooter />
    </div>
  )
}
