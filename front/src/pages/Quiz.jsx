import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'

const Quiz = () => {
  const [quiz, setQuiz] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetchQuiz()
  }, [])

  const fetchQuiz = async () => {
    try {
      const response = await axios.get('/api/quiz')
      setQuiz(response.data)
    } catch (error) {
      toast.error('퀴즈를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAnswer) {
      toast.error('답을 선택해주세요.')
      return
    }

    setSubmitting(true)
    try {
      const response = await axios.post('/api/quiz/submit', {
        answer: selectedAnswer
      })
      
      setSubmitted(true)
      setResult(response.data)
      toast.success(response.data.is_correct ? '정답입니다!' : '틀렸습니다.')
    } catch (error) {
      toast.error('답안 제출에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetQuiz = () => {
    setSelectedAnswer(null)
    setSubmitted(false)
    setResult(null)
    fetchQuiz()
  }

  const getOptionLabel = (index) => {
    return ['A', 'B', 'C', 'D'][index - 1]
  }

  const getOptionText = (index) => {
    switch (index) {
      case 1: return quiz.option_a
      case 2: return quiz.option_b
      case 3: return quiz.option_c
      case 4: return quiz.option_d
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!quiz) {
    return <div>퀴즈를 불러올 수 없습니다.</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🧠 투자 퀴즈
        </h1>
        <p className="text-gray-600">
          투자 지식을 쌓고 실력을 향상시켜보세요!
        </p>
      </div>

      <div className="card">
        <div className="flex items-center space-x-2 mb-6">
          <HelpCircle className="text-blue-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">오늘의 퀴즈</h2>
        </div>

        <div className="mb-6">
          <p className="text-lg text-gray-700 leading-relaxed">
            {quiz.question}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {[1, 2, 3, 4].map((index) => (
            <button
              key={index}
              onClick={() => !submitted && setSelectedAnswer(index)}
              disabled={submitted}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                selectedAnswer === index
                  ? submitted
                    ? index === quiz.correct_answer
                      ? 'border-success-500 bg-success-50'
                      : 'border-danger-500 bg-danger-50'
                    : 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  selectedAnswer === index
                    ? submitted
                      ? index === quiz.correct_answer
                        ? 'bg-success-500 text-white'
                        : 'bg-danger-500 text-white'
                      : 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {getOptionLabel(index)}
                </div>
                <span className="text-gray-700">{getOptionText(index)}</span>
                {submitted && index === quiz.correct_answer && (
                  <div className="ml-auto">
                    <CheckCircle className="text-success-600" size={20} />
                  </div>
                )}
                {submitted && selectedAnswer === index && selectedAnswer !== quiz.correct_answer && (
                  <div className="ml-auto">
                    <XCircle className="text-danger-600" size={20} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {submitted && result && (
          <div className="text-center space-y-4">
            <div className={`p-4 rounded-lg ${
              result.is_correct
                ? 'bg-success-50 border border-success-200'
                : 'bg-danger-50 border border-danger-200'
            }`}>
              <p className={`font-semibold ${
                result.is_correct
                  ? 'text-success-700'
                  : 'text-danger-700'
              }`}>
                {result.is_correct ? '정답입니다!' : '틀렸습니다.'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                정답: {result.correct_text ? result.correct_text : '알 수 없음'}
                {!result.is_correct && result.correct_answer && (
                  <><br/>정답 번호: {result.correct_answer}번</>
                )}
              </p>
            </div>
            <button onClick={resetQuiz} className="btn-primary">
              다음 퀴즈
            </button>
          </div>
        )}
        {submitted ? (
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer || submitting}
              className="btn-primary"
            >
              {submitting ? '제출 중...' : '답안 제출'}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer || submitting}
              className="btn-primary"
            >
              {submitting ? '제출 중...' : '답안 제출'}
            </button>
          </div>
        )}
      </div>

      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          💡 투자 퀴즈의 중요성
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 투자 기본 개념을 이해할 수 있습니다</li>
          <li>• 실제 투자에서 활용할 수 있는 지식을 쌓을 수 있습니다</li>
          <li>• 리스크 관리와 포트폴리오 구성에 도움이 됩니다</li>
          <li>• 감정적 투자를 방지하는 데 도움이 됩니다</li>
        </ul>
      </div>
    </div>
  )
}

export default Quiz 