import { useState, useEffect } from 'react'
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

function App() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/getQuestions')
      
      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }
      
      const data = await response.json()
      setQuestions(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyClass = (difficulty: string) => {
    return `difficulty-${difficulty}`
  }

  const getStatusClass = (status: string) => {
    return `status-${status}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Question Review Center</h1>
          <p className="app-subtitle">View all submitted questions for review</p>
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
              <h2 className="table-title">Total Questions: {questions.length}</h2>
              <button onClick={fetchQuestions} className="refresh-btn">
                ↻ Refresh
              </button>
            </div>

            <div className="table-container">
              <table className="questions-table">
                <thead>
                  <tr className="header-row">
                    <th className="th profile-th">Profile</th>
                    <th className="th">Question</th>
                    <th className="th">Correct Answer</th>
                    <th className="th">Course</th>
                    <th className="th">Topic</th>
                    <th className="th">Difficulty</th>
                    <th className="th">Status</th>
                    <th className="th">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question) => (
                    <tr key={question.id} className="data-row">
                      <td className="td profile-td">
                        <div className="profile-cell">
                          {question.user_profile_picture ? (
                            <img
                              src={question.user_profile_picture}
                              alt={question.user_name}
                              className="profile-img"
                              title={question.user_name}
                            />
                          ) : (
                            <div className="profile-placeholder">{question.user_name.charAt(0).toUpperCase()}</div>
                          )}
                          <div className="profile-info">
                            <p className="user-name">{question.user_name}</p>
                            <p className="user-email">{question.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td">{question.question}</td>
                      <td className="td">{question.correct_answer}</td>
                      <td className="td">{question.course}</td>
                      <td className="td">{question.topic}</td>
                      <td className="td">
                        <span className={`badge ${getDifficultyClass(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                      </td>
                      <td className="td">
                        <span className={`badge ${getStatusClass(question.status)}`}>
                          {question.status}
                        </span>
                      </td>
                      <td className="td">{formatDate(question.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
