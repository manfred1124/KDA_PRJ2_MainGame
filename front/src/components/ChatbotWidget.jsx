import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { MessageCircle } from "lucide-react";
import axios from "axios";
import heroImage from "../assets/face.png"; // 용사 이미지 가져오기

const ChatbotWidget = forwardRef(({ fixedPanel = false }, ref) => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // 초기 메시지 제거
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 외부에서 가이드 메시지 추가 (중복 방지)
  useImperativeHandle(ref, () => ({
    addGuideMessage: (text) => {
      setMessages((msgs) => {
        if (
          msgs.length > 0 &&
          msgs[msgs.length - 1].role === "bot" &&
          msgs[msgs.length - 1].text === text
        ) {
          return msgs; // 중복 방지
        }
        return [...msgs, { role: "bot", text }];
      });
    },
  }));

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
      {/* 챗봇 창 (fixedPanel이면 항상) */}
      {fixedPanel && (
        <div
          className={
            "w-full bg-[#f7e6b6] rounded-2xl shadow-2xl flex flex-col overflow-hidden border-4 border-[#e6d3a3]"
          }
          style={{ height: "100%" }}
        >
          {/* 챗봇 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#7c5c2b] text-white rounded-t-2xl">
            <span className="font-bold text-lg" style={{ fontFamily: "serif" }}>
              ⚔️ 용사의 조언
            </span>
          </div>
          {/* 챗봇 메시지 영역 */}
          <div
            className="flex-1 px-6 py-4 space-y-4 bg-[#f3e7c4] overflow-y-auto flex flex-col"
            style={{ minHeight: "200px", maxHeight: "540px" }}
          >
            {messages.map((msg, i) => {
              if (msg.role === "user") {
                return (
                  <div
                    key={i}
                    className="self-end bg-[#bfa76a] text-white rounded-xl px-4 py-2 shadow text-gray-800 max-w-[80%]"
                  >
                    {msg.text}
                  </div>
                );
              } else {
                // 봇 메시지 (용사 이미지와 함께)
                return (
                  <div
                    key={i}
                    className="flex items-end gap-3 self-start max-w-[90%]"
                  >
                    <img
                      src={heroImage}
                      alt="hero"
                      className="w-12 h-12 rounded-full border-2 border-[#bfa76a] bg-white"
                    />
                    <div className="bg-[#e6d3a3] text-[#7c5c2b] rounded-xl px-4 py-2 shadow">
                      {msg.text}
                    </div>
                  </div>
                );
              }
            })}
            <div ref={messagesEndRef} />
          </div>
          {/* 챗봇 입력창 */}
          <form
            className="flex items-center border-t-4 border-[#e6d3a3] px-4 py-3 bg-[#f7e6b6]"
            onSubmit={handleSend}
          >
            <input
              className="flex-1 rounded-lg border border-[#bfa76a] px-3 py-2 mr-2 focus:outline-none focus:ring-2 focus:ring-[#bfa76a] bg-white text-[#7c5c2b]"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="용사에게 질문하기..."
              style={{ fontFamily: "serif" }}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-[#bfa76a] hover:bg-[#a67c3c] text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
              disabled={loading || !input.trim()}
              style={{ fontFamily: "serif" }}
            >
              전송
            </button>
          </form>
        </div>
      )}
    </>
  );
});

export default ChatbotWidget;
