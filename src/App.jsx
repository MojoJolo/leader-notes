import { useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import './App.css'
import { ADJECTIVES, NOUNS } from './data/wordLists'

function randomSessionName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj} ${noun}`
}

function App() {
  const [text, setText] = useState('')
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [summariesBySessionId, setSummariesBySessionId] = useState({})
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [askQuestion, setAskQuestion] = useState('')
  const [askAnswer, setAskAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askOpen, setAskOpen] = useState(false)

  useEffect(() => {
    window.electronAPI.getSessions().then((loaded) => {
      setSessions(loaded)
      const withSummary = {}
      loaded.forEach((s) => {
        if (s.summary) withSummary[s.id] = s.summary
      })
      setSummariesBySessionId(withSummary)
    })
  }, [])

  const currentSession = sessions.find((s) => s.id === activeSessionId) ?? null
  const currentSessionNotes = currentSession ? currentSession.notes : []
  const recentNotes = currentSessionNotes.slice(-3)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    const isNewSession = !activeSessionId
    const notesToSend = isNewSession ? [text.trim()] : [...currentSessionNotes, text.trim()]
    const sessionId = isNewSession ? Date.now() : activeSessionId
    const sessionName = isNewSession ? randomSessionName() : currentSession.name

    if (isNewSession) {
      await window.electronAPI.createSession(sessionId, sessionName)
      setSessions((prev) => [
        ...prev,
        { id: sessionId, name: sessionName, notes: [text.trim()] }
      ])
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, notes: [...s.notes, text.trim()] } : s
        )
      )
    }
    await window.electronAPI.addNote(sessionId, text.trim())
    setText('')
    setActiveSessionId(sessionId)

    if (expanded) {
      setLoading(true)
      setSelectedSessionId(sessionId)
      try {
        const result = await window.electronAPI.summarize(notesToSend)
        setSummariesBySessionId((prev) => ({ ...prev, [sessionId]: result }))
        await window.electronAPI.updateSummary(sessionId, result)
      } catch (err) {
        setSummariesBySessionId((prev) => ({ ...prev, [sessionId]: `Error: ${err.message}` }))
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEndSession = () => {
    setActiveSessionId(null)
  }

  const handleRestoreSession = (sessionId) => {
    setActiveSessionId(sessionId)
    setSelectedSessionId(sessionId)
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!askQuestion.trim()) return
    const sessionIdToShow = selectedSessionId ?? currentSession?.id ?? null
    const session = sessions.find((s) => s.id === sessionIdToShow)
    if (!session || session.notes.length === 0) return

    setAskLoading(true)
    setAskAnswer('')
    try {
      const result = await window.electronAPI.summarize(
        [...session.notes, `\n\nQuestion: ${askQuestion.trim()}\nAnswer the above question based on the notes provided.`]
      )
      setAskAnswer(result)
    } catch (err) {
      setAskAnswer(`Error: ${err.message}`)
    } finally {
      setAskLoading(false)
      setAskQuestion('')
    }
  }

  const handleToggle = async () => {
    const isExpanded = await window.electronAPI.toggleExpand()
    setExpanded(isExpanded)

    if (isExpanded && currentSession) {
      setSelectedSessionId(currentSession.id)
      if (currentSessionNotes.length > 0 && !summariesBySessionId[currentSession.id]) {
        setLoading(true)
        try {
          const result = await window.electronAPI.summarize(currentSessionNotes)
          setSummariesBySessionId((prev) => ({ ...prev, [currentSession.id]: result }))
          await window.electronAPI.updateSummary(currentSession.id, result)
        } catch (err) {
          setSummariesBySessionId((prev) => ({ ...prev, [currentSession.id]: `Error: ${err.message}` }))
        } finally {
          setLoading(false)
        }
      }
    }
  }

  return (
    <div className="app">
      <div className="toolbar">
        <span className="app-title">Leader Notes</span>
        <button className="expand-btn" onClick={handleToggle}>
          {expanded ? '←' : '→'}
        </button>
      </div>
      <div className={`content ${expanded ? 'expanded' : ''}`}>
        <div className="content__left">
          <div className="notes-panel">
            {recentNotes.length > 0 ? (
              <ul className="recent-notes">
                {recentNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">No notes yet</div>
            )}
            {activeSessionId && currentSession && (
              <div className="session-bar">
                <span className="session-bar__name">{currentSession.name}</span>
                <button
                  type="button"
                  className="session-bar__close"
                  onClick={handleEndSession}
                  aria-label="End session"
                >
                  ×
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="note-form">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="Type a note..."
                rows={3}
              />
              <button type="submit">Submit</button>
            </form>
          </div>
          {expanded && (
            <div className="session-history">
              <h4 className="session-history__title">Session history</h4>
              {sessions.length === 0 ? (
                <p className="session-history__empty">No sessions yet</p>
              ) : (
                <ul className="session-history__list">
                  {[...sessions].reverse().map((s) => (
                    <li
                      key={s.id}
                      className={`session-history__item ${activeSessionId === s.id ? 'session-history__item--active' : ''} ${selectedSessionId === s.id ? 'session-history__item--selected' : ''}`}
                      onClick={() => handleRestoreSession(s.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRestoreSession(s.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="session-history__name">{s.name}</span>
                      <span className="session-history__count">{s.notes.length} note{s.notes.length !== 1 ? 's' : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {expanded && (() => {
          const sessionIdToShow = selectedSessionId ?? currentSession?.id ?? null
          const summaryToShow = sessionIdToShow ? summariesBySessionId[sessionIdToShow] : null
          return (
            <div className="summary-panel">
              {askOpen ? (
                <div className="ask-section">
                  <form onSubmit={handleAsk} className="ask-form">
                    <input
                      type="text"
                      value={askQuestion}
                      onChange={(e) => setAskQuestion(e.target.value)}
                      onBlur={() => setTimeout(() => setAskOpen(false), 150)}
                      placeholder="Ask about your notes..."
                      autoFocus
                    />
                    <button type="submit">Ask</button>
                  </form>
                  {askLoading && <p className="summary-loading">Thinking...</p>}
                  {askAnswer && (
                    <div className="ask-answer">
                      <h3>Answer</h3>
                      <div className="summary-content">
                        <Markdown>{askAnswer}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" className="ask-trigger" onClick={() => setAskOpen(true)}>
                  {askQuestion.trim()
                    ? (askQuestion.trim().length > 50 ? `${askQuestion.trim().slice(0, 50)}…` : askQuestion.trim())
                    : 'Ask about notes...'}
                </button>
              )}
              <h3>Summary</h3>
              {loading ? (
                <p className="summary-loading">Thinking...</p>
              ) : summaryToShow ? (
                <div className="summary-content">
                  <Markdown>{summaryToShow}</Markdown>
                </div>
              ) : sessionIdToShow ? (
                <p className="summary-empty">No summary for this session yet</p>
              ) : (
                <p className="summary-empty">Submit a note to see a summary</p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default App
