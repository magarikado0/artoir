export default function ArchiveLoading({ rows = 4 }) {
  return (
    <div className="ui-page-shell">
      <main className="ui-app-main ui-archive-loading" aria-label="読み込み中" aria-busy="true">
        <div className="ui-archive-loading-title" />
        <div className="ui-archive-loading-search" />
        {Array.from({ length: rows }, (_, index) => <div key={index} className="ui-archive-loading-row" />)}
      </main>
    </div>
  )
}
