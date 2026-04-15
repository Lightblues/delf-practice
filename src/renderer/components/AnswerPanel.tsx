import { useState, useEffect } from 'react'
import type { Answer, Part } from '../../shared/types'
import { NoteEditor } from './NoteEditor'

interface AnswerPanelProps {
  part: Part
  exercise: string
  activity: string
  questionCount: number
  correctAnswers: Answer[]
  onSubmit: (answers: (Answer | null)[]) => void
}

const OPTIONS: Answer[] = ['A', 'B', 'C']

export function AnswerPanel({ part, exercise, activity, questionCount, correctAnswers, onSubmit }: AnswerPanelProps) {
  const [userAnswers, setUserAnswers] = useState<(Answer | null)[]>([])
  const [submitted, setSubmitted] = useState(false)

  // Reset when activity changes
  useEffect(() => {
    setUserAnswers(Array(questionCount).fill(null))
    setSubmitted(false)
  }, [activity, questionCount])

  const handleSelect = (qIndex: number, answer: Answer) => {
    if (submitted) return
    setUserAnswers(prev => {
      const updated = [...prev]
      updated[qIndex] = answer
      return updated
    })
  }

  const handleSubmit = () => {
    setSubmitted(true)
    onSubmit(userAnswers)
  }

  const handleReset = () => {
    setUserAnswers(Array(questionCount).fill(null))
    setSubmitted(false)
  }

  const allAnswered = userAnswers.every(a => a !== null)
  const correctCount = submitted
    ? userAnswers.filter((a, i) => a === correctAnswers[i]).length
    : 0
  const scorePercent = submitted ? Math.round((correctCount / questionCount) * 100) : 0

  return (
    <div className="answer-panel">
      <div className="answer-header">
        <h2>{activity.replace('_', ' ')}</h2>
        <p>{questionCount} questions</p>
      </div>

      {submitted && (
        <div className="score-display">
          <div className={`score-value ${scorePercent >= 70 ? 'good' : 'bad'}`}>
            {scorePercent}%
          </div>
          <div className="score-label">{correctCount} / {questionCount} correct</div>
        </div>
      )}

      <div className="questions">
        {Array.from({ length: questionCount }).map((_, qIndex) => {
          const userAnswer = userAnswers[qIndex]
          const correctAnswer = correctAnswers[qIndex]
          const isCorrect = submitted && userAnswer === correctAnswer

          return (
            <div
              key={qIndex}
              className={`question ${submitted ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
            >
              <div className="question-label">
                <span>Question {qIndex + 1}</span>
                {submitted && (
                  <span className={`question-result ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? 'Correct' : `Answer: ${correctAnswer}`}
                  </span>
                )}
              </div>
              <div className="options">
                {OPTIONS.map(opt => (
                  <button
                    key={opt}
                    className={`option ${userAnswer === opt ? 'selected' : ''} ${
                      submitted && opt === correctAnswer ? 'correct-answer' : ''
                    }`}
                    onClick={() => handleSelect(qIndex, opt)}
                    disabled={submitted}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="answer-actions">
        {!submitted ? (
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={!allAnswered}
          >
            {allAnswered ? 'Submit Answers' : `Answer all questions (${userAnswers.filter(a => a).length}/${questionCount})`}
          </button>
        ) : (
          <button className="reset-btn" onClick={handleReset}>
            Try Again
          </button>
        )}
      </div>

      {/* Note Editor */}
      <NoteEditor part={part} exercise={exercise} activity={activity} />
    </div>
  )
}
