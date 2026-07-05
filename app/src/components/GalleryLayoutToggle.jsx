/**
 * 作品一覧の表示切り替え（ウォール＝可変サイズ / 均質な行列）。
 * value: 'wall' | 'grid'、onChange(next) で切り替える。
 */
export default function GalleryLayoutToggle({ value, onChange }) {
  return (
    <div className="ui-gallery-layout-toggle" role="group" aria-label="作品の表示方法">
      <button
        type="button"
        className={value === 'wall' ? 'is-active' : ''}
        aria-pressed={value === 'wall'}
        aria-label="ウォール表示"
        title="ウォール表示"
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
        aria-label="均質な行列表示"
        title="均質な行列表示"
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
