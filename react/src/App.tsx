import { useState, useEffect } from 'react'
import Button from '@mui/material/Button'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import UndoIcon from '@mui/icons-material/Undo'
import './App.css'

interface Question {
  id: number
  question: string
  correct_answer: string
  course: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  user_id: string
  user_name: string
  user_email: string
  user_profile_picture: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface UserProfile {
  [userId: string]: string | null
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [profilePictures, setProfilePictures] = useState<UserProfile>({})
  const questionsPerPage = 10

  useEffect(() => {
    fetchQuestions()
    
    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [currentPage])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/getQuestions?page=${currentPage}&limit=${questionsPerPage}`)

      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data = await response.json()
      setQuestions(data.data || [])
      setTotalCount(data.pagination.total)
      setTotalPages(data.pagination.totalPages)

      // Load profile pictures for visible users
      const uniqueUserIds = [...new Set((data.data || []).map((q: Question) => q.user_id))] as string[]
      uniqueUserIds.forEach((userId: string) => {
        if (!profilePictures[userId]) {
          fetchProfilePicture(userId)
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfilePicture = async (userId: string) => {
    try {
      const response = await fetch(`/api/getProfilePicture/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setProfilePictures(prev => ({
          ...prev,
          [userId]: data.profilePicture
        }))
      }
    } catch (err) {
      console.error(`Error fetching profile picture for ${userId}:`, err)
    }
  }

  const updateQuestionStatus = async (id: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      setLoading(true)
      const response = await fetch('/api/updateQuestionStatus', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, status: newStatus })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to update question status')
      }

      await fetchQuestions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error updating question status:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const getDifficultyClass = (difficulty: string) => {
    return `difficulty-${difficulty}`
  }

  const getStatusClass = (status: string) => {
    return `status-${status}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    return `${month} ${day}, ${year}`
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })
  }

  const getTodayDate = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[currentTime.getMonth()]
    const day = currentTime.getDate()
    const year = currentTime.getFullYear()
    return `${month} ${day}, ${year}`
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/NoteSmith_logo_dark.png" alt="NoteSmith Logo" className="header-logo" />
            <div className="logo-divider"></div>
            <h1 className="app-title">Admin Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="admin-info">
              <span className="admin-username">Alice</span>
              <div className="clock-container">
                <p className="today-date">{getTodayDate()}</p>
                <p className="current-time">{formatTime(currentTime)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading && (
          <div className="center-content">
            <div className="spinner"></div>
            <p className="loading-text">Loading questions...</p>
          </div>
        )}

        {error && (
          <div className="error-box">
            <p className="error-title">Error</p>
            <p className="error-text">{error}</p>
          </div>
        )}

        {!loading && questions.length === 0 && !error && (
          <div className="center-content">
            <p className="empty-text">No questions submitted yet</p>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <div className="table-wrapper">
            <div className="table-header">
              <h2 className="table-title">Total Questions: {totalCount}</h2>
              <button onClick={() => fetchQuestions()} className="refresh-btn">
                ↻ Refresh
              </button>
            </div>

            {/* Search and Filter Section */}
            <div className="search-filter-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search by question, course, topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-controls">
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Courses</option>
                </select>

                <select
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Topics</option>
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="questions-table">
                <thead>
                  <tr className="header-row">
                    <th className="th">User</th>
                    <th className="th">Question</th>
                    <th className="th">Course</th>
                    <th className="th">Topic</th>
                    <th className="th">Difficulty</th>
                    <th className="th">Status</th>
                    <th className="th">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    return questions.map((question) => {
                      const isExpanded = expandedRows.has(question.id)
                      return (
                        <>
                          <tr
                            key={question.id}
                            className={`data-row ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleRowExpansion(question.id)}
                          >
                            <td className="td user-td">
                              <div className="user-cell">
                                {profilePictures[question.user_id] && profilePictures[question.user_id] !== null ? (
                                  <img
                                    src={profilePictures[question.user_id] || ''}
                                    alt={question.user_name}
                                    className="profile-img"
                                  />
                                ) : (
                                  <div className="profile-placeholder">
                                    {question.user_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="user-name">{question.user_name}</span>
                              </div>
                            </td>
                            <td className="td question-cell">
                              <span className="question-text">{question.question}</span>
                              <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                            </td>
                            <td className="td">{question.course}</td>
                            <td className="td">{question.topic}</td>
                            <td className="td">
                              <span className={`badge ${getDifficultyClass(question.difficulty)}`}>
                                {question.difficulty}
                              </span>
                            </td>
                            <td className="td">
                              {question.status === 'pending' ? (
                                <div className="status-actions">
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    className="circle-btn accept-btn"
                                    onClick={(e) => { e.stopPropagation(); updateQuestionStatus(question.id, 'approved') }}
                                    style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%' }}

                                  >
                                    <DoneIcon fontSize="medium" />
                                  </Button>
                                  <Button
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    className="circle-btn reject-btn"
                                    onClick={(e) => { e.stopPropagation(); updateQuestionStatus(question.id, 'rejected') }}
                                    style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%' }}

                                  >
                                    <CloseIcon fontSize="medium" />
                                  </Button>
                                </div>
                              ) : question.status === 'approved' ? (
                                <div className="status-actions">
                                  <span className={`badge ${getStatusClass(question.status)}`}>
                                    {question.status}
                                  </span>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    className="circle-btn undo-btn"
                                    onClick={(e) => { e.stopPropagation(); updateQuestionStatus(question.id, 'pending') }}
                                    style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#6b7280' }}
                                    title="Undo approval"
                                  >
                                    <UndoIcon fontSize="small" />
                                  </Button>
                                </div>
                              ) : (
                                <span className={`badge ${getStatusClass(question.status)}`}>
                                  {question.status}
                                </span>
                              )}
                            </td>
                            <td className="td">{formatDate(question.created_at)}</td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${question.id}-expanded`} className="expanded-row">
                              <td colSpan={7} className="expanded-content">
                                <div className="expanded-details">
                                  <div className="detail-section">
                                    <h4 className="detail-title">Full Question</h4>
                                    <p className="detail-text">{question.question}</p>
                                  </div>
                                  <div className="detail-section">
                                    <h4 className="detail-title">Correct Answer</h4>
                                    <p className="detail-text answer-highlight">{question.correct_answer}</p>
                                  </div>
                                  <div className="detail-grid">
                                    <div className="detail-item">
                                      <span className="detail-label">Submitted by:</span>
                                      <span className="detail-value">{question.user_email}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="detail-label">Course:</span>
                                      <span className="detail-value">{question.course}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="detail-label">Topic:</span>
                                      <span className="detail-value">{question.topic}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="detail-label">Difficulty:</span>
                                      <span className={`badge ${getDifficultyClass(question.difficulty)}`}>
                                        {question.difficulty}
                                      </span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="detail-label">Status:</span>
                                      {question.status === 'pending' ? (
                                        <div className="status-actions">
                                          <Button
                                            variant="contained"
                                            color="success"
                                            size="small"
                                            className="circle-btn accept-btn"
                                            onClick={(e) => { e.stopPropagation(); updateQuestionStatus(question.id, 'approved') }}
                                            style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%' }}
                                          >
                                            <DoneIcon fontSize="medium" />
                                          </Button>
                                          <Button
                                            variant="contained"
                                            color="error"
                                            size="small"
                                            className="circle-btn reject-btn"
                                            onClick={(e) => { e.stopPropagation(); updateQuestionStatus(question.id, 'rejected') }}
                                            style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%' }}
                                          >
                                            <CloseIcon fontSize="medium" />
                                          </Button>
                                        </div>
                                      ) : question.status === 'approved' ? (
                                        <div className="status-actions">
                                          <span className={`badge ${getStatusClass(question.status)}`}>
                                            {question.status}
                                          </span>
                                          <Button
                                            variant="contained"
                                            size="small"
                                            className="circle-btn undo-btn"
                                            onClick={(e) => { e.stopPropagation(); updateQuestionStatus(question.id, 'pending') }}
                                            style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#6b7280' }}
                                            title="Undo approval"
                                          >
                                            <UndoIcon fontSize="small" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className={`badge ${getStatusClass(question.status)}`}>
                                          {question.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {questions.length === 0 ? 0 : (currentPage - 1) * questionsPerPage + 1} - {Math.min(currentPage * questionsPerPage, totalCount)} of {totalCount}
              </div>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <span className="page-number">Page {currentPage} of {totalPages}</span>
                <button
                  className="pagination-btn"
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1))
                  }}
                  disabled={currentPage >= totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
