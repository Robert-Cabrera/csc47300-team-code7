import { useState, useEffect } from 'react'
import './ProfilePage.css'

interface UserData {
  id: string
  name: string
  email: string
  profilePicture: string | null
  totalQuestions: number
  approvedQuestions: number
  rejectedQuestions: number
  pendingQuestions: number
  joinDate: string
}

interface UserQuestion {
  id: number
  question: string
  correct_answer: string
  course: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userQuestions, setUserQuestions] = useState<UserQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Get userId from URL query parameter

    // ! CHECKMARK 3.1: DYNAMIC ROUTING - PARAMETER EXTRACTION (usrID from URL)
    const params = new URLSearchParams(window.location.search)
    const userId = params.get('userId')
    
    if (userId) {
      fetchUserData(userId)
      fetchUserQuestions(userId)
    } else {
      setError('No user ID provided')
      setLoading(false)
    }

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/getUser/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserData(data)
      } else {
        throw new Error('Failed to fetch user data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching user data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserQuestions = async (userId: string) => {
    try {
      const response = await fetch(`/api/getUserQuestions/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserQuestions(data.questions || [])
      }
    } catch (err) {
      console.error('Error fetching user questions:', err)
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

  const handleGoBack = () => {
    window.history.back()
  }

  if (loading) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-loading">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !userData) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-error">
          <p className="error-title">Error</p>
          <p className="error-text">{error || 'Failed to load user profile'}</p>
          <button onClick={handleGoBack} className="back-btn">← Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page-container">
      <header className="profile-page-header">
        <div className="profile-header-content">
          <div className="profile-header-left">
            <button onClick={handleGoBack} className="back-btn">← Back</button>
            <h1 className="profile-page-title">User Profile</h1>
          </div>
          <div className="profile-header-right">
            <div className="profile-time-info">
              <p className="profile-today-date">{getTodayDate()}</p>
              <p className="profile-current-time">{formatTime(currentTime)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="profile-page-main">
        {/* User Info Section */}
        <div className="profile-user-section">
          <div className="profile-user-header">
            {userData.profilePicture && userData.profilePicture !== null ? (
              <img
                src={userData.profilePicture}
                alt={userData.name}
                className="profile-page-avatar"
              />
            ) : (
              <div className="profile-page-avatar-placeholder">
                {userData.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-user-details">
              <h2 className="profile-user-name">{userData.name}</h2>
              <p className="profile-user-email">{userData.email}</p>
              <p className="profile-user-join-date">Joined {formatDate(userData.joinDate)}</p>
            </div>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <div className="profile-stat-value">{userData.totalQuestions}</div>
              <div className="profile-stat-label">Total Questions</div>
            </div>
            <div className="profile-stat-box">
              <div className="profile-stat-value approved">{userData.approvedQuestions}</div>
              <div className="profile-stat-label">Approved</div>
            </div>
            <div className="profile-stat-box">
              <div className="profile-stat-value rejected">{userData.rejectedQuestions}</div>
              <div className="profile-stat-label">Rejected</div>
            </div>
            <div className="profile-stat-box">
              <div className="profile-stat-value pending">{userData.pendingQuestions}</div>
              <div className="profile-stat-label">Pending</div>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="profile-questions-section">
          <h3 className="profile-section-title">Questions ({userQuestions.length})</h3>
          
          {userQuestions.length === 0 ? (
            <p className="profile-no-questions">No questions submitted yet</p>
          ) : (
            <div className="profile-questions-list">
              {userQuestions.map((question) => {
                const isExpanded = expandedRows.has(question.id)
                return (
                  <div key={question.id} className="profile-question-item">
                    <div
                      className={`profile-question-header ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleRowExpansion(question.id)}
                    >
                      <div className="profile-question-main">
                        <span className="profile-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                        <span className="profile-question-text">{question.question}</span>
                      </div>
                      <div className="profile-question-meta">
                        <span className={`badge ${getDifficultyClass(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className={`badge ${getStatusClass(question.status)}`}>
                          {question.status}
                        </span>
                        <span className="profile-date">{formatDate(question.created_at)}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="profile-question-expanded">
                        <div className="profile-expanded-section">
                          <h5>Full Question</h5>
                          <p>{question.question}</p>
                        </div>
                        <div className="profile-expanded-section">
                          <h5>Correct Answer</h5>
                          <p className="profile-answer-text">{question.correct_answer}</p>
                        </div>
                        <div className="profile-expanded-details">
                          <div className="profile-detail">
                            <span className="profile-label">Course:</span>
                            <span>{question.course}</span>
                          </div>
                          <div className="profile-detail">
                            <span className="profile-label">Topic:</span>
                            <span>{question.topic}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ProfilePage
