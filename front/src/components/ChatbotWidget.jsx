import React, { useState } from 'react'
import { MessageCircle } from 'lucide-react'

const ChatbotWidget = () => {
  const [showChatbot, setShowChatbot] = useState(false)

  return (
    <>
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
    </>
  )
}

export default ChatbotWidget 