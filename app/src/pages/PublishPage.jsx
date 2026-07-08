import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LpHeader, LpFooter, LpGlyph } from '../components/LandingChrome'
import { INSTAGRAM_URL, SIGNUP_PATH } from '../lib/siteLinks'
import lpDevices from '../assets/lp-devices.webp'

const AUDIENCES = [
  {
    title: '学生美術団体',
    text: '美術部・美術サークルの部展やOB・OG展の記録に。代替わりしても活動の歩みが残ります。',
  },
  {
    title: 'アート団体・グループ',
    text: 'グループ展や公募展の作品をまとめて公開。会期が終わっても作品を届けられます。',
  },
  {
    title: 'ギャラリー・展示スペース',
    text: '企画展のアーカイブとして。過去の展覧会を、いつでも案内できるページにします。',
  },
]

const STEPS = [
  {
    num: '一',
    title: 'アカウントを作成',
    text: '無料で作成できます。団体でも個人でも利用できます。',
  },
  {
    num: '二',
    title: '展覧会ページを作成',
    text: '会期・会場・紹介文とサムネイルを設定します。過去に開催した展覧会もそのまま掲載できます。',
  },
  {
    num: '三',
    title: '作品を掲載して公開',
    text: '作品画像をアップロードすれば公開完了。シェアリンクで来場者やSNSに案内できます。',
  },
]

export default function PublishPage() {
  useEffect(() => {
    document.title = '掲載団体募集 | Artoir'
    return () => { document.title = 'Artoir' }
  }, [])

  return (
    <div className="ui-lp-shell">
      <LpHeader />
      <main className="ui-lp-main">
        <section className="ui-lp-page-hero" aria-labelledby="publish-title">
          <p className="ui-lp-eyebrow">掲載団体募集</p>
          <h1 className="ui-lp-headline" id="publish-title">
            あなたの展覧会を、<br />Artoirで公開しませんか？
          </h1>
          <p className="ui-lp-lead">
            これからの展覧会はもちろん、過去に開催した展覧会も掲載できます。
            作品と展示の記録を、いつでも見返せる美しいページとして残しましょう。掲載は無料です。
          </p>
          <div className="ui-lp-publish-visual ui-lp-rise ui-lp-rise--2">
            <img src={lpDevices} alt="Artoirの展覧会ページをPCとスマートフォンで表示した例" width="676" height="328" loading="lazy" decoding="async" />
          </div>
        </section>

        <section className="ui-lp-section" aria-labelledby="publish-audience-title">
          <div className="ui-lp-section-head">
            <h2 className="ui-lp-section-title" id="publish-audience-title">こんな団体・方へ</h2>
          </div>
          <div className="ui-lp-audience">
            {AUDIENCES.map((a) => (
              <div className="ui-lp-audience-card" key={a.title}>
                <h3 className="ui-lp-audience-title">{a.title}</h3>
                <p className="ui-lp-audience-text">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-lp-section" aria-labelledby="publish-steps-title">
          <div className="ui-lp-section-head">
            <h2 className="ui-lp-section-title" id="publish-steps-title">掲載までの流れ</h2>
          </div>
          <div className="ui-lp-steps">
            {STEPS.map((s) => (
              <div className="ui-lp-step" key={s.num}>
                <span className="ui-lp-step-num" aria-hidden="true">{s.num}</span>
                <h3 className="ui-lp-step-title">{s.title}</h3>
                <p className="ui-lp-step-text">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-lp-section" aria-labelledby="publish-contact-title">
          <div className="ui-lp-band">
            <h2 className="ui-lp-band-title" id="publish-contact-title">まずはお気軽にご相談ください</h2>
            <p className="ui-lp-band-text">DMでの相談も、自分でのアカウント作成・投稿も、どちらからでも始められます。</p>
            <div className="ui-lp-contact-grid">
              <a className="ui-lp-contact-card" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
                <span className="ui-lp-contact-card-icon"><LpGlyph name="send" size={22} /></span>
                <span>
                  <span className="ui-lp-contact-card-title">DMで相談する</span>
                  <span className="ui-lp-contact-card-text">Instagram @artoir_archive へメッセージ。掲載の相談や過去の展覧会の掲載もお手伝いします。</span>
                </span>
              </a>
              <Link className="ui-lp-contact-card" to={SIGNUP_PATH}>
                <span className="ui-lp-contact-card-icon"><LpGlyph name="user-plus" size={22} /></span>
                <span>
                  <span className="ui-lp-contact-card-title">アカウントを作成して投稿する</span>
                  <span className="ui-lp-contact-card-text">無料でアカウントを作成し、自分で展覧会ページを作成・投稿できます。</span>
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LpFooter />
    </div>
  )
}
