import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import UndoIcon from '@mui/icons-material/Undo'
import DeleteIcon from '@mui/icons-material/Delete'
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
  status: 'pending' | 'approved' | 'rejected' | 'deleted'
  created_at: string
}

interface UserProfile {
  [userId: string]: string | null
}

function App() {
  const navigate = useNavigate()
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
  const [totalPages, setTotalPages] = useState(0)
  const [profilePictures, setProfilePictures] = useState<UserProfile>({})
  const [adminName, setAdminName] = useState('Admin')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [showApproved, setShowApproved] = useState<'pending' | 'rejected' | 'approved'>('pending')
  const [pendingChanges, setPendingChanges] = useState<Map<number, 'approved' | 'rejected' | 'pending' | 'deleted'>>(new Map())
  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set())
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [availableCourses, setAvailableCourses] = useState<string[]>([])
  const [availableTopics, setAvailableTopics] = useState<string[]>([])
  const questionsPerPage = 10

  useEffect(() => {
    // Get admin name from URL params
    const params = new URLSearchParams(window.location.search)
    const name = params.get('name')
    const superAdmin = params.get('isSuperAdmin')
    if (name) {
      setAdminName(decodeURIComponent(name))
    }
    if (superAdmin === 'true') {
      setIsSuperAdmin(true)
    }

    fetchQuestions()
    fetchFilterOptions()
    
    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [currentPage, showApproved])

  useEffect(() => {
    setHasPendingChanges(pendingChanges.size > 0 || pendingDeletes.size > 0)
  }, [pendingChanges, pendingDeletes])


  // ! CHECKMARK 1.2: Front end that calls the API to ``READ``
  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/getQuestions?page=${currentPage}&limit=${questionsPerPage}&status=${showApproved}`)

      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data = await response.json()
      setQuestions(data.data || [])
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

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/filterOptions')
      if (response.ok) {
        const data = await response.json()
        setAvailableCourses(data.courses || [])
        setAvailableTopics(data.topics || [])
      }
    } catch (err) {
      console.error('Error fetching filter options:', err)
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

  const updateQuestionStatus = (id: number, newStatus: 'approved' | 'rejected' | 'pending' | 'deleted') => {
    // Get the original status from the questions array
    const originalQuestion = questions.find(q => q.id === id)
    const originalStatus = originalQuestion?.status

    const newPendingChanges = new Map(pendingChanges)
    
    // If the new status matches the original, remove from pending changes (undo)
    if (newStatus === originalStatus) {
      newPendingChanges.delete(id)
    } else {
      // Otherwise, add/update the pending change
      newPendingChanges.set(id, newStatus)
    }
    
    setPendingChanges(newPendingChanges)
    setHasPendingChanges(newPendingChanges.size > 0 || pendingDeletes.size > 0)

    // Don't update q.status - keep original server status for filtering
    // The UI will display the pending change via getEffectiveStatus()
  }

  // ! CHECKMARK 1.3: Frontend that calls the API to ``UPDATE``
  const applyChanges = async () => {
    try {
      setLoading(true)
      const changes = Array.from(pendingChanges.entries())
      
      // Send all changes to backend
      for (const [id, status] of changes) {
        await fetch('/api/updateQuestionStatus', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id, status })
        })
      }

      // ! CHECKMARK 1.4: Frontend that calls the API to ``SOFT DELETE``
      for (const id of pendingDeletes) {
        await fetch('/api/updateQuestionStatus', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id, status: 'deleted' })
        })
      }

      // Clear pending changes and deletes
      setPendingChanges(new Map())
      setPendingDeletes(new Set())
      setHasPendingChanges(false)
      
      // Reset to page 1 to show updated questions from the beginning
      setCurrentPage(1)
      
      // Reload with page 1 to get fresh data with current status filter
      const response = await fetch(`/api/getQuestions?page=1&limit=10&status=${showApproved}`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.data || [])
        setTotalPages(data.pagination.totalPages)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error applying changes:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get the effective status of a question (pending change or original status)
  const getEffectiveStatus = (question: Question): 'approved' | 'rejected' | 'pending' | 'deleted' => {
    return pendingChanges.get(question.id) || question.status
  }

  // Get badge styling for pending changes - shows original status with decision color outline
  const getPendingBadgeStyle = (question: Question): React.CSSProperties => {
    const pendingStatus = pendingChanges.get(question.id)
    if (!pendingStatus) {
      return {}
    }
    
    // Add colored outline based on the pending decision
    if (pendingStatus === 'approved') {
      return {
        color: '#558ffcff',
        boxShadow: '0 0 0 3px #558ffcff',
        background: 'black'
      }
    } else if (pendingStatus === 'rejected') {
      return {
        color: '#ff7e7eff',
        background: 'black',
        boxShadow: '0 0 0 3px #ff8686ff'
      }
    }
    return {}
  }

  const getFilteredQuestions = () => {
    // Filter based on ORIGINAL server status, not local changes
    // This keeps locally-changed questions visible until changes are applied
    if (showApproved === 'approved') {
      return questions.filter(q => q.status === 'approved')
    } else if (showApproved === 'rejected') {
      return questions.filter(q => q.status === 'rejected')
    } else {
      // In pending view, show only pending questions
      return questions.filter(q => q.status === 'pending')
    }
  }

  const handleToggleApproved = () => {
    if (showApproved === 'pending') {
      setShowApproved('rejected')
    } else if (showApproved === 'rejected') {
      setShowApproved('approved')
    } else {
      setShowApproved('pending')
    }
    setCurrentPage(1)
  }

  const handleUserClick = (userId: string) => {
    // Navigate to profile page with userId as query parameter
    navigate(`/profile?userId=${userId}`)
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
              <span className="admin-username">{adminName}</span>
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
          <div className="table-wrapper">
            <div className="table-header">
              <h2 className="table-title">
                {showApproved === 'approved' ? 'Approved Questions' : showApproved === 'rejected' ? 'Rejected Questions' : 'Pending Questions'}: 0
              </h2>
              <button onClick={() => fetchQuestions()} className="refresh-btn">
                ↻ Refresh
              </button>
            </div>

            {/* Search and Filter Section */}
            <div className="search-filter-section">
              <div className="filter-left">
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
                    {availableCourses.map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>

                  <select
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Topics</option>
                    {availableTopics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filter-right">
                <button 
                  className={`toggle-approved-btn ${showApproved !== 'pending' ? 'active' : ''}`}
                  onClick={handleToggleApproved}
                  title="Cycle through: Pending → Rejected → Approved"
                  style={{
                    backgroundColor: showApproved === 'rejected' ? 'red' : undefined,
                    color: showApproved === 'rejected' ? 'white' : undefined
                  }}
                >
                  {showApproved === 'approved' ? (
                    '✓ Approved'
                  ) : showApproved === 'rejected' ? (
                    <span style={{ color: 'white', padding: '2px 8px', borderRadius: '6px' }}>✗ Rejected</span>
                  ) : (
                    'Pending'
                  )}
                </button>
                
                {hasPendingChanges && (
                  <button className="apply-changes-btn" onClick={applyChanges}>
                    Apply Changes ({pendingChanges.size + pendingDeletes.size})
                  </button>
                )}
              </div>
            </div>

            <div className="center-content">
              <p className="empty-text">No {showApproved === 'approved' ? 'approved' : showApproved === 'rejected' ? 'rejected' : 'pending'} questions yet. Click the toggle button to view other categories.</p>
            </div>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <div className="table-wrapper">
            <div className="table-header">
              <h2 className="table-title">
                {showApproved === 'approved' ? 'Approved Questions' : showApproved === 'rejected' ? 'Rejected Questions' : 'Pending Questions'}
              </h2>
              <button onClick={() => fetchQuestions()} className="refresh-btn">
                ↻ Refresh
              </button>
            </div>

            {/* Search and Filter Section */}
            <div className="search-filter-section">
              <div className="filter-left">
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
                    {availableCourses.map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>

                  <select
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Topics</option>
                    {availableTopics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>

                <div className="filter-right">
                <button 
                  className={`toggle-approved-btn ${showApproved !== 'pending' ? 'active' : ''}`}
                  onClick={handleToggleApproved}
                  title="Cycle through: Pending → Rejected → Approved"
                  style={{
                  backgroundColor: showApproved === 'rejected' ? 'red' : undefined,
                  color: showApproved === 'rejected' ? 'white' : undefined
                  }}
                >
                  {showApproved === 'approved' ? (
                  '✓ Approved'
                  ) : showApproved === 'rejected' ? (
                  <span style={{ color: 'white', padding: '2px 8px', borderRadius: '6px' }}>✗ Rejected</span>
                  ) : (
                  'Pending'
                  )}
                </button>
                
                {hasPendingChanges && (
                  <button className="apply-changes-btn" onClick={applyChanges}>
                    Apply Changes ({pendingChanges.size + pendingDeletes.size})
                  </button>
                )}
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
                    const filteredQuestions = getFilteredQuestions()
                    return filteredQuestions.map((question) => {
                      const isExpanded = expandedRows.has(question.id)
                      return (
                        <>
                          <tr
                            key={question.id}
                            className={`data-row ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleRowExpansion(question.id)}
                          >
                            <td className="td user-td">
                              <div 
                                className="user-cell"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUserClick(question.user_id)
                                }}
                                style={{ cursor: 'pointer' }}
                              >
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
                              {getEffectiveStatus(question) === 'pending' ? (
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
                              ) : getEffectiveStatus(question) === 'approved' ? (
                                <div className="status-actions">
                                  <span className={`badge ${getStatusClass(question.status)}`} style={getPendingBadgeStyle(question)}>
                                    {getEffectiveStatus(question)}
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
                              ) : getEffectiveStatus(question) === 'rejected' ? (
                                <div className="status-actions">
                                  <span className={`badge ${getStatusClass(question.status)}`} style={getPendingBadgeStyle(question)}>
                                    {getEffectiveStatus(question)}
                                  </span>
                                  {/* // ! CHECKMARK 1.4: Frontend that allows "SUPER ADMIN" to "SOFT DELETE" questions */}
                                  {isSuperAdmin && pendingDeletes.has(question.id) ? (
                                    <Button
                                      variant="contained"
                                      size="small"
                                      className="circle-btn undo-delete-btn"
                                      onClick={(e) => { e.stopPropagation(); setPendingDeletes(prev => { const newSet = new Set(prev); newSet.delete(question.id); return newSet }) }}
                                      style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#f59e0b' }}
                                      title="Undo deletion"
                                    >
                                      <UndoIcon fontSize="small" />
                                    </Button>
                                  ) : isSuperAdmin ? (
                                    <Button
                                      variant="contained"
                                      size="small"
                                      className="circle-btn delete-btn"
                                      onClick={(e) => { e.stopPropagation(); setPendingDeletes(prev => new Set([...prev, question.id])) }}
                                      style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#8b5cf6' }}
                                      title="Delete question"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </Button>
                                  ) : null}
                                  <Button
                                    variant="contained"
                                    size="small"
                                    className="circle-btn undo-btn"
                                    onClick={(e) => { e.stopPropagation(); updateQuestionStatus(question.id, 'pending') }}
                                    style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#6b7280' }}
                                    title="Undo rejection"
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
                                      {getEffectiveStatus(question) === 'pending' ? (
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
                                      ) : getEffectiveStatus(question) === 'approved' ? (
                                        <div className="status-actions">
                                          <span className={`badge ${getStatusClass(question.status)}`} style={getPendingBadgeStyle(question)}>
                                            {getEffectiveStatus(question)}
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
                                      ) : getEffectiveStatus(question) === 'rejected' ? (
                                        <div className="status-actions">
                                          <span className={`badge ${getStatusClass(question.status)}`} style={getPendingBadgeStyle(question)}>
                                            {getEffectiveStatus(question)}
                                          </span>
                                          {isSuperAdmin && pendingDeletes.has(question.id) ? (
                                            <Button
                                              variant="contained"
                                              size="small"
                                              className="circle-btn undo-delete-btn"
                                              onClick={(e) => { e.stopPropagation(); setPendingDeletes(prev => { const newSet = new Set(prev); newSet.delete(question.id); return newSet }) }}
                                              style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#f59e0b' }}
                                              title="Undo deletion"
                                            >
                                              <UndoIcon fontSize="small" />
                                            </Button>
                                          ) : isSuperAdmin ? (
                                            <Button
                                              variant="contained"
                                              size="small"
                                              className="circle-btn delete-btn"
                                              onClick={(e) => { e.stopPropagation(); setPendingDeletes(prev => new Set([...prev, question.id])) }}
                                              style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#8b5cf6' }}
                                              title="Delete question"
                                            >
                                              <DeleteIcon fontSize="small" />
                                            </Button>
                                          ) : null}
                                          <Button
                                            variant="contained"
                                            size="small"
                                            className="circle-btn undo-btn"
                                            onClick={(e) => { e.stopPropagation(); updateQuestionStatus(question.id, 'pending') }}
                                            style={{ minWidth: 0, width: 36, height: 36, borderRadius: '50%', backgroundColor: '#6b7280' }}
                                            title="Undo rejection"
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
                {(() => {
                  const filteredCount = getFilteredQuestions().length
                  const startItem = filteredCount === 0 ? 0 : (currentPage - 1) * questionsPerPage + 1
                  const endItem = Math.min(currentPage * questionsPerPage, filteredCount)
                  return `Showing ${startItem} - ${endItem} of ${filteredCount}`
                })()}
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
