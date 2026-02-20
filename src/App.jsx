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
  const [openSessionMenuId, setOpenSessionMenuId] = useState(null)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editingSessionName, setEditingSessionName] = useState('')
  const [editingSessionSource, setEditingSessionSource] = useState(null)

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

  useEffect(() => {
    if (openSessionMenuId == null) return

    const handleOutsideClick = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.session-history__menu-panel')) return
      if (target.closest('.session-history__menu')) return
      setOpenSessionMenuId(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [openSessionMenuId])

  const currentSession = sessions.find((s) => s.id === activeSessionId) ?? null
  const currentSessionNote = currentSession ? currentSession.note : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    const isNewSession = !activeSessionId
    const noteToSave = text.trim()
    const notesToSend = [noteToSave]
    const sessionId = isNewSession ? Date.now() : activeSessionId
    const sessionName = isNewSession ? randomSessionName() : currentSession.name

    if (isNewSession) {
      await window.electronAPI.createSession(sessionId, sessionName, noteToSave)
      setSessions((prev) => [
        ...prev,
        { id: sessionId, name: sessionName, note: noteToSave, summary: null }
      ])
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, note: noteToSave } : s
        )
      )
      await window.electronAPI.updateSessionNote(sessionId, noteToSave)
    }
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
    setText('')
  }

  const handleRestoreSession = (sessionId) => {
    if (editingSessionId) return
    const session = sessions.find((s) => s.id === sessionId)
    setActiveSessionId(sessionId)
    setSelectedSessionId(sessionId)
    setOpenSessionMenuId(null)
    if (session) {
      setText(session.note || '')
    }
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!askQuestion.trim()) return
    const sessionIdToShow = selectedSessionId ?? currentSession?.id ?? null
    const session = sessions.find((s) => s.id === sessionIdToShow)
    if (!session || !session.note?.trim()) return

    setAskLoading(true)
    setAskAnswer('')
    try {
      const result = await window.electronAPI.summarize(
        [session.note, `\n\nQuestion: ${askQuestion.trim()}\nAnswer the above question based on the notes provided.`]
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
      if (currentSessionNote.trim() && !summariesBySessionId[currentSession.id]) {
        setLoading(true)
        try {
          const result = await window.electronAPI.summarize([currentSessionNote])
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

  const startRenameSession = (session, source) => {
    setOpenSessionMenuId(null)
    setEditingSessionId(session.id)
    setEditingSessionName(session.name)
    setEditingSessionSource(source)
  }

  const cancelRenameSession = () => {
    setEditingSessionId(null)
    setEditingSessionName('')
    setEditingSessionSource(null)
  }

  const submitRenameSession = async (sessionId) => {
    const nextName = editingSessionName.trim()
    if (!nextName) {
      cancelRenameSession()
      return
    }
    try {
      await window.electronAPI.updateSessionName(sessionId, nextName)
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, name: nextName } : s))
      )
      cancelRenameSession()
    } catch (err) {
      // Keep editor open so user can retry if persistence fails.
      // eslint-disable-next-line no-console
      console.error('Failed to persist session rename:', err)
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
            <form onSubmit={handleSubmit} className="note-form">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="Type a note..."
                rows={3}
              />
              <div className="note-form__row">
                {activeSessionId && currentSession ? (
                  <div className="session-bar">
                    {editingSessionId === currentSession.id && editingSessionSource === 'active' ? (
                      <input
                        type="text"
                        className="session-bar__name-input"
                        value={editingSessionName}
                        onChange={(e) => setEditingSessionName(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void submitRenameSession(currentSession.id)
                          } else if (e.key === 'Escape') {
                            cancelRenameSession()
                          }
                        }}
                        onBlur={() => {
                          if (editingSessionId === currentSession.id) {
                            cancelRenameSession()
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="session-bar__name"
                        onDoubleClick={() => startRenameSession(currentSession, 'active')}
                        title={currentSession.name}
                      >
                        {currentSession.name.length > 30
                          ? `${currentSession.name.slice(0, 30)}...`
                          : currentSession.name}
                      </span>
                    )}
                    <button
                      type="button"
                      className="session-bar__close"
                      onClick={handleEndSession}
                      aria-label="End session"
                    >
                      <span className="session-bar__close-icon">×</span>
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <button type="submit">Submit</button>
              </div>
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
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        startRenameSession(s, 'history')
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleRestoreSession(s.id)}
                      role="button"
                      tabIndex={0}
                    >
                      {editingSessionId === s.id && editingSessionSource === 'history' ? (
                        <input
                          type="text"
                          className="session-history__name-input"
                          value={editingSessionName}
                          onChange={(e) => setEditingSessionName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void submitRenameSession(s.id)
                            } else if (e.key === 'Escape') {
                              cancelRenameSession()
                            }
                          }}
                          onBlur={() => {
                            if (editingSessionId === s.id) {
                              cancelRenameSession()
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="session-history__name" title={s.name}>
                          {s.name.length > 60 ? `${s.name.slice(0, 60)}...` : s.name}
                        </span>
                      )}
                      <button
                        type="button"
                        className="session-history__menu"
                        aria-label="Session options"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenSessionMenuId((prev) => (prev === s.id ? null : s.id))
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        ⋮
                      </button>
                      {openSessionMenuId === s.id && (
                        <div
                          className="session-history__menu-panel"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="session-history__menu-item"
                            onClick={() => startRenameSession(s, 'history')}
                          >
                            Rename
                          </button>
                          <button type="button" className="session-history__menu-item">
                            Delete
                          </button>
                        </div>
                      )}
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
