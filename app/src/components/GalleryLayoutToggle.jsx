/**
 * 作品一覧の表示切り替え。保存配置がある展覧会だけ curated を追加する。
 */
export default function GalleryLayoutToggle({ value, onChange, showCurated = false }) {
  return (
    <div className="ui-gallery-layout-toggle" role="group" aria-label="作品の表示方法">
      {showCurated && (
        <button
          type="button"
          className={value === 'curated' ? 'is-active' : ''}
          aria-pressed={value === 'curated'}
          aria-label="自由配置"
          title="自由配置"
          onClick={() => onChange('curated')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <rect x="3" y="5" width="9" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="11" rx="1" />
            <rect x="6" y="15" width="11" height="6" rx="1" />
          </svg>
        </button>
      )}
      <button
        type="button"
        className={value === 'wall' ? 'is-active' : ''}
        aria-pressed={value === 'wall'}
        aria-label="ウォール"
        title="ウォール"
        onClick={() => onChange('wall')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="4" y="4" width="7" height="10" rx="1" />
          <rect x="13" y="4" width="7" height="6" rx="1" />
          <rect x="4" y="16" width="7" height="4" rx="1" />
          <rect x="13" y="12" width="7" height="8" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        className={value === 'grid' ? 'is-active' : ''}
        aria-pressed={value === 'grid'}
        aria-label="グリッド"
        title="グリッド"
        onClick={() => onChange('grid')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="4" y="4" width="7" height="7" rx="1" />
          <rect x="13" y="4" width="7" height="7" rx="1" />
          <rect x="4" y="13" width="7" height="7" rx="1" />
          <rect x="13" y="13" width="7" height="7" rx="1" />
        </svg>
      </button>
    </div>
  )
}
