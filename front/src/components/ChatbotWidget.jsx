import React, { useState, useRef, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import axios from "axios";

const ChatbotWidget = () => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: "안녕하세요! 궁금한 점을 물어보세요." },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 스크롤 항상 아래로
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChatbot]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((msgs) => [...msgs, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/chatbot",
        { message: trimmed },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      setMessages((msgs) => [...msgs, { role: "bot", text: res.data.answer }]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { role: "bot", text: "답변을 불러오지 못했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 챗봇 플로팅 버튼 */}
      {!showChatbot && (
        <button
          className="fixed bottom-32 right-10 bg-[#7c5c2b] hover:bg-[#a67c3c] text-white rounded-full shadow-lg p-5 z-50 flex items-center justify-center text-3xl"
          onClick={() => setShowChatbot(true)}
          aria-label="챗봇 열기"
        >
          <MessageCircle size={32} />
        </button>
      )}

      {/* 챗봇 창 */}
      {showChatbot && (
        <div className="fixed bottom-32 right-10 w-96 max-w-full bg-[#f7e6b6] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border-4 border-[#e6d3a3]">
          {/* 챗봇 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#7c5c2b] text-white rounded-t-2xl">
            <span className="font-bold text-lg" style={{ fontFamily: "serif" }}>🤖 투자 챗봇</span>
            <button
              className="text-2xl hover:text-[#e6d3a3] focus:outline-none"
              onClick={() => setShowChatbot(false)}
              aria-label="챗봇 닫기"
            >
              ×
            </button>
          </div>
          {/* 챗봇 메시지 영역 */}
          <div
            className="flex-1 px-6 py-4 space-y-3 bg-[#f3e7c4] overflow-y-auto flex flex-col"
            style={{ minHeight: "200px", maxHeight: "300px" }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  (msg.role === "user"
                    ? "self-end bg-[#bfa76a] text-white"
                    : "self-start bg-[#e6d3a3] text-[#7c5c2b]") +
                  " rounded-xl px-4 py-2 shadow text-gray-800 max-w-[80%]"
                }
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* 챗봇 입력창 */}
          <form
            className="flex items-center border-t-4 border-[#e6d3a3] px-4 py-3 bg-[#f7e6b6]"
            onSubmit={handleSend}
          >
            <input
              type="text"
              className="flex-1 rounded-full border-2 border-[#e6d3a3] px-4 py-2 mr-2 focus:outline-none focus:ring-2 focus:ring-[#bfa76a] bg-[#f3e7c4] text-[#7c5c2b] placeholder-[#a67c3c]"
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="bg-[#7c5c2b] hover:bg-[#a67c3c] text-white rounded-full px-4 py-2 font-bold border-2 border-[#e6d3a3]"
              disabled={loading || !input.trim()}
              style={{ fontFamily: "serif" }}
            >
              {loading ? "..." : "전송"}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
