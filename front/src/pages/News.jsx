import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, Minus, MessageCircle } from 'lucide-react'

const News = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  // 모달 상태 추가
  const [selectedNews, setSelectedNews] = useState(null)
  const [showChatbot, setShowChatbot] = useState(false)

  // ESC 키로 모달 닫기
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setSelectedNews(null)
    }
  }, [])

  useEffect(() => {
    if (selectedNews) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedNews, handleKeyDown])

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      const response = await axios.get('/api/news')
      setNews(response.data)
    } catch (error) {
      toast.error('뉴스를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getImpactIcon = (impactType) => {
    switch (impactType) {
             case 'positive':
         return <TrendingUp className="text-green-600" size={20} />
       case 'negative':
         return <TrendingDown className="text-red-600" size={20} />
       default:
         return <Minus className="text-gray-600" size={20} />
    }
  }

  const getImpactColor = (impactType) => {
         switch (impactType) {
       case 'positive':
         return 'bg-green-50 border-green-200'
       case 'negative':
         return 'bg-red-50 border-red-200'
       default:
         return 'bg-gray-50 border-gray-200'
     }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          📰 시장 뉴스
        </h1>
        <p className="text-gray-600">
          최신 경제 뉴스와 시장 동향을 확인하세요!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.map((item) => (
          <div
            key={item.id}
            className={`card news-card cursor-pointer transition-all duration-200 ${getImpactColor(item.impact_type)} hover:shadow-xl hover:bg-blue-50 hover:scale-[1.02]`}
            onClick={() => setSelectedNews(item)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.content}
                </p>
              </div>
              <div className="ml-4">
                {getImpactIcon(item.impact_type)}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                {item.affected_sectors && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {item.affected_sectors}
                  </span>
                )}
              </div>
              <div>
                라운드 {item.round_number}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* next 버튼 */}
      <button
        className="fixed bottom-10 right-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-16 rounded-full text-xl shadow-lg transition-all duration-200 z-50"
        onClick={() => { /* 추후 섹터 선택 페이지 이동 기능 추가 예정 */ }}
        style={{ minWidth: '160px' }}
      >
        next
      </button>

      {/* 뉴스 상세 모달 (닫기 기능은 아직 없음) */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full min-h-[70vh] py-24 px-16 flex flex-col justify-center relative"
            onClick={e => e.stopPropagation()}
          >
            {/* X 닫기 버튼 */}
            <button
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-3xl font-bold focus:outline-none"
              onClick={() => setSelectedNews(null)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-3xl font-bold mb-8 text-gray-900">{selectedNews.title}</h2>
            <p className="text-gray-700 mb-8 text-lg">{selectedNews.content}</p>
            {selectedNews.affected_sectors && (
              <div className="mb-4">
                <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-base">
                  {selectedNews.affected_sectors}
                </span>
              </div>
            )}
            <div className="text-md text-gray-500">라운드 {selectedNews.round_number}</div>
          </div>
        </div>
      )}

      {/* 챗봇 플로팅 버튼 */}
      {!showChatbot && (
        <button
          className="fixed bottom-32 right-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg p-5 z-50 flex items-center justify-center text-3xl"
          onClick={() => setShowChatbot(true)}
          aria-label="챗봇 열기"
        >
          <MessageCircle size={32} />
        </button>
      )}

      {/* 챗봇 창 */}
      {showChatbot && (
        <div className="fixed bottom-32 right-10 w-96 max-w-full bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-blue-200">
          {/* 챗봇 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white rounded-t-2xl">
            <span className="font-bold text-lg">🤖 투자 챗봇</span>
            <button
              className="text-2xl hover:text-blue-200 focus:outline-none"
              onClick={() => setShowChatbot(false)}
              aria-label="챗봇 닫기"
            >
              ×
            </button>
          </div>
          {/* 챗봇 메시지 영역 (더미) */}
          <div className="flex-1 px-6 py-4 space-y-3 bg-blue-50 overflow-y-auto" style={{ minHeight: '200px', maxHeight: '300px' }}>
            <div className="self-start bg-white rounded-xl px-4 py-2 shadow text-gray-800 max-w-[80%]">안녕하세요! 궁금한 점을 물어보세요.</div>
            {/* 유저 메시지 예시 */}
            {/* <div className="self-end bg-blue-100 rounded-xl px-4 py-2 shadow text-gray-800 max-w-[80%]">예시 질문</div> */}
          </div>
          {/* 챗봇 입력창 */}
          <form className="flex items-center border-t px-4 py-3 bg-white">
            <input
              type="text"
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="메시지를 입력하세요..."
              disabled
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-2 font-bold"
              disabled
            >
              전송
            </button>
          </form>
        </div>
      )}

      {news.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📰</div>
          <p className="text-gray-500 text-lg">아직 뉴스가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">
            라운드를 진행하면 새로운 뉴스가 발표됩니다.
          </p>
        </div>
      )}
    </div>
  )
}

export default News 