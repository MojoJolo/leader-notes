function TitleBar({ expanded, onToggle }) {
  return (
    <div className="title-bar">
      <span className="title-bar__title">Briefing</span>
      <button className="expand-btn" onClick={onToggle}>
        {expanded ? '─' : '☰'}
      </button>
    </div>
  )
}

export default TitleBar
