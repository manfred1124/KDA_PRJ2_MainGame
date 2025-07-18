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

const ChatbotWidget = forwardRef(({ fixedPanel = false, currentRound = 1 }, ref) => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // 초기 메시지 제거
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("recommended"); // "recommended" | "faq"
  const messagesEndRef = useRef(null);

  // 라운드별 추천 질문
  const getRecommendedQuestions = (round) => {
    const questions = {
      1: [
        "이번 라운드 투자 전략은?",
        "리스크 관리 방법은?",
        "어떤 섹터가 유망할까?"
      ],
      2: [
        "시장 동향은 어떨까?",
        "분산 투자 전략은?",
        "수익률 개선 방법은?"
      ],
      3: [
        "최종 투자 전략은?",
        "포트폴리오 점검은?",
        "게임 완료 후 조언은?"
      ]
    };
    return questions[round] || questions[1];
  };

  // 자주 묻는 질문 목록
  const getFAQQuestions = () => {
    return [
      "투자 초보자라면 어떻게 시작해야 할까요?",
      "분산 투자의 중요성은 무엇인가요?",
      "주식 가격이 떨어질 때 어떻게 해야 하나요?",
      "뉴스를 어떻게 해석해야 하나요?",
      "포트폴리오 점검은 언제 하나요?",
      "투자 심리 관리 방법은?",
      "장기 투자 vs 단기 투자 어떤 게 좋나요?",
      "손실을 최소화하는 방법은?",
      "성장주 vs 가치주 차이점은?",
      "시장 변동성에 대처하는 방법은?"
    ];
  };

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
    await sendMessage(trimmed);
  };

  const sendMessage = async (message) => {
    setMessages((msgs) => [...msgs, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/chatbot",
        { message: message },
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

  const handleQuestionClick = (question) => {
    sendMessage(question);
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
            {/* 메시지가 있을 때도 탭 표시 (작게) */}
            {messages.length > 0 && (
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setActiveTab("recommended")}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border ${
                    activeTab === "recommended"
                      ? "bg-[#bfa76a] text-white border-[#a67c3c]"
                      : "bg-[#e6d3a3] text-[#7c5c2b] border-[#bfa76a]"
                  }`}
                >
                  추천
                </button>
                <button
                  onClick={() => setActiveTab("faq")}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors duration-200 border ${
                    activeTab === "faq"
                      ? "bg-[#bfa76a] text-white border-[#a67c3c]"
                      : "bg-[#e6d3a3] text-[#7c5c2b] border-[#bfa76a]"
                  }`}
                >
                  FAQ
                </button>
              </div>
            )}
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[#7c5c2b] mb-4 font-medium">용사에게 궁금한 것을 물어보세요!</p>
                
                {/* 탭 버튼 */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab("recommended")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
                      activeTab === "recommended"
                        ? "bg-[#bfa76a] text-white border-[#a67c3c]"
                        : "bg-[#e6d3a3] text-[#7c5c2b] border-[#bfa76a]"
                    }`}
                  >
                    추천 질문
                  </button>
                  <button
                    onClick={() => setActiveTab("faq")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
                      activeTab === "faq"
                        ? "bg-[#bfa76a] text-white border-[#a67c3c]"
                        : "bg-[#e6d3a3] text-[#7c5c2b] border-[#bfa76a]"
                    }`}
                  >
                    자주 묻는 질문
                  </button>
                </div>

                {/* 탭 내용 */}
                {activeTab === "recommended" && (
                  <div className="space-y-2">
                    {getRecommendedQuestions(currentRound).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionClick(question)}
                        className="block w-full text-left bg-[#e6d3a3] hover:bg-[#bfa76a] text-[#7c5c2b] rounded-lg px-3 py-2 text-sm transition-colors duration-200 border border-[#bfa76a]"
                      >
                        💬 {question}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "faq" && (
                  <div className="space-y-2">
                    {getFAQQuestions().map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionClick(question)}
                        className="block w-full text-left bg-[#e6d3a3] hover:bg-[#bfa76a] text-[#7c5c2b] rounded-lg px-3 py-2 text-sm transition-colors duration-200 border border-[#bfa76a]"
                      >
                        ❓ {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 메시지가 있을 때 탭 클릭 시 질문 목록 표시 */}
            {messages.length > 0 && (
              <>
                {activeTab === "recommended" && (
                  <div className="space-y-2 mb-4">
                    <p className="text-[#7c5c2b] text-sm font-medium mb-2">추천 질문:</p>
                    {getRecommendedQuestions(currentRound).slice(0, 3).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionClick(question)}
                        className="block w-full text-left bg-[#e6d3a3] hover:bg-[#bfa76a] text-[#7c5c2b] rounded-lg px-3 py-2 text-xs transition-colors duration-200 border border-[#bfa76a]"
                      >
                        💬 {question}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "faq" && (
                  <div className="space-y-2 mb-4">
                    <p className="text-[#7c5c2b] text-sm font-medium mb-2">자주 묻는 질문:</p>
                    {getFAQQuestions().slice(0, 3).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionClick(question)}
                        className="block w-full text-left bg-[#e6d3a3] hover:bg-[#bfa76a] text-[#7c5c2b] rounded-lg px-3 py-2 text-xs transition-colors duration-200 border border-[#bfa76a]"
                      >
                        ❓ {question}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
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
