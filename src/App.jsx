import { useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import './App.css'
import { ADJECTIVES, NOUNS } from './data/wordLists'
import { SessionType } from './constants/sessionTypes.js'
import TitleBar from './components/TitleBar.jsx'

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
    window.electronAPI.getExpandedState().then((isExpanded) => {
      setExpanded(isExpanded)
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
      await window.electronAPI.createSession(sessionId, sessionName, noteToSave, SessionType.NOTE)
      setSessions((prev) => [
        ...prev,
        { id: sessionId, name: sessionName, note: noteToSave, summary: null, session_type: SessionType.NOTE }
      ])
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, note: noteToSave } : s
        )
      )
      await window.electronAPI.updateSessionNote(sessionId, noteToSave)
    }
    setActiveSessionId(sessionId)

    // Open summary panel if not expanded
    if (!expanded) {
      const isExpanded = await window.electronAPI.toggleExpand()
      setExpanded(isExpanded)
    }

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

  const handleEndSession = () => {
    setActiveSessionId(null)
    setText('')
  }

  const handleRestoreSession = (sessionId) => {
    if (editingSessionId) return
    const session = sessions.find((s) => s.id === sessionId)
    setOpenSessionMenuId(null)
    setSelectedSessionId(sessionId)
    if (session) {
      if (session.session_type === SessionType.NOTE) {
        // Note sessions can be edited
        setActiveSessionId(sessionId)
        setText(session.note || '')
      } else {
        // Ask sessions are read-only - clear active session and textarea
        setActiveSessionId(null)
        setText('')
      }
    }
  }

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!askQuestion.trim()) return
    if (sessions.length === 0) {
      return
    }

    const questionText = askQuestion.trim()
    const sessionId = Date.now()
    const sessionName = `Ask: ${questionText}`

    setAskOpen(false)
    setLoading(true)
    try {
      // Build context from note sessions only (exclude ask sessions to prevent redundancy)
      const sessionsContext = sessions
        .filter((s) => s.session_type === SessionType.NOTE)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((s) => {
          let sessionText = `Session: ${s.name}\nDate: ${s.created_at}\n`
          if (s.summary) {
            sessionText += `Summary: ${s.summary}\n`
          }
          sessionText += `Notes: ${s.note}`
          return sessionText
        })
        .join('\n\n---\n\n')

      const prompt = `${sessionsContext}\n\nQuestion: ${questionText}\n\nAnswer the question based on ALL the sessions above. Provide specific details and reference which session the information came from when relevant. If the information is not available in the sessions, say so clearly.`

      const result = await window.electronAPI.summarize([prompt])

      // Create a new session for this Q&A
      await window.electronAPI.createSession(sessionId, sessionName, questionText, SessionType.ASK)
      await window.electronAPI.updateSummary(sessionId, result)
      setSessions((prev) => [
        ...prev,
        { id: sessionId, name: sessionName, note: questionText, summary: result, session_type: SessionType.ASK }
      ])
      setSummariesBySessionId((prev) => ({ ...prev, [sessionId]: result }))
      setActiveSessionId(null)
      setSelectedSessionId(sessionId)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to answer question:', err)
    } finally {
      setLoading(false)
      setAskQuestion('')
    }
  }

  const handleToggle = async () => {
    const isExpanded = await window.electronAPI.toggleExpand()
    setExpanded(isExpanded)
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

  const handleDeleteSession = async (sessionId) => {
    try {
      await window.electronAPI.deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      setOpenSessionMenuId(null)

      // If deleting the active session, clear it
      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
        setText('')
      }

      // If deleting the selected session, clear it
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null)
      }

      // Remove from summaries
      setSummariesBySessionId((prev) => {
        const { [sessionId]: _, ...rest } = prev
        return rest
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete session:', err)
    }
  }

  return (
    <div className="app">
      <TitleBar expanded={expanded} onToggle={handleToggle} />
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
                <button type="submit">Generate Brief</button>
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
                          <button
                            type="button"
                            className="session-history__menu-item"
                            onClick={() => handleDeleteSession(s.id)}
                          >
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
                </div>
              ) : (
                <button type="button" className="ask-trigger" onClick={() => setAskOpen(true)}>
                  {askQuestion.trim()
                    ? (askQuestion.trim().length > 50 ? `${askQuestion.trim().slice(0, 50)}…` : askQuestion.trim())
                    : 'Ask about notes...'}
                </button>
              )}
              <h3>Brief</h3>
              {loading ? (
                <p className="summary-loading">Thinking...</p>
              ) : summaryToShow ? (
                <div className="summary-content">
                  <Markdown>{summaryToShow}</Markdown>
                </div>
              ) : sessionIdToShow ? (
                <p className="summary-empty">No summary for this session yet</p>
              ) : (
                <p className="summary-empty">Submit a note to see the brief</p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default App
