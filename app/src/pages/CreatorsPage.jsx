import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { T } from '../lib/tokens'

export default function CreatorsPage() {
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    document.title = '作家一覧 | Artoir'
    return () => { document.title = 'Artoir' }
  }, [])

  useEffect(() => {
    async function load() {
      if (!supabase) return setLoading(false)
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, slug, display_name, bio')
          .order('display_name')
        // slug が無いと公開ページに飛べないため除外。
        setCreators((data || []).filter((p) => p.slug))
      } catch {
        /* unavailable */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // user名（display_name）・ID（slug）・プロフィールメッセージ（bio）を対象に検索。
  // 入力が空のときは候補を一切出さない（検索したときだけ結果を表示）。
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return creators.filter((c) =>
      [c.display_name, c.slug, c.bio].filter(Boolean).join(' ').toLowerCase().includes(q),
    )
  }, [creators, query])

  if (loading) return <div className="ui-page-shell" />

  return (
    <div className="ui-page-shell">
      <Header activeTab="creators" />
      <main className="ui-app-main">
        <h1 className="ui-sr-only">作家一覧</h1>

        <div className="ui-toolbar-grid">
          <input
            className="ui-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前・ID・プロフィールで検索"
            aria-label="作家を検索"
          />
        </div>

        <div className="ui-creator-list">
          {filtered.map((c) => (
            <Link key={c.id} to={`/@${c.slug}`} className="ui-creator-row">
              <div className="ui-creator-name-row">
                <span className="ui-creator-name">{c.display_name || c.slug}</span>
                <span className="ui-creator-handle">@{c.slug}</span>
              </div>
              {c.bio && <div className="ui-creator-bio">{c.bio}</div>}
            </Link>
          ))}
        </div>

        {query.trim() && filtered.length === 0 && (
          <div className="ui-panel" style={{ textAlign: 'center', color: T.inkMuted, fontSize: 13 }}>
            作家が見つかりません
          </div>
        )}
      </main>
      <BottomNav active="creators" />
    </div>
  )
}
