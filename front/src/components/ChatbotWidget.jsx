import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { MessageCircle } from "lucide-react";
import axios from "axios";
import heroImage1 from "../assets/hero.png"; // 용사 이미지 1 (입 닫힌 상태)
import heroImage2 from "../assets/hero2.png"; // 용사 이미지 2 (입 열린 상태)

const ChatbotWidget = forwardRef(
  ({ fixedPanel = false, currentRound = 1 }, ref) => {
    const [showChatbot, setShowChatbot] = useState(false);
    const [input, setInput] = useState("");
    const [currentMessage, setCurrentMessage] = useState(""); // 현재 표시되는 메시지
    const [isTyping, setIsTyping] = useState(false); // 타이핑 중인지
    const [isSpeaking, setIsSpeaking] = useState(false); // 말하는 중인지
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("recommended"); // "recommended" | "faq"
    const [showSpeechBubble, setShowSpeechBubble] = useState(false); // 말풍선 표시 여부
    const [heroAnimating, setHeroAnimating] = useState(false); // 캐릭터 애니메이션 여부

    const typingIntervalRef = useRef(null);
    const speechTimeoutRef = useRef(null);
    const animationIntervalRef = useRef(null);
    const messageContainerRef = useRef(null);

    // 라운드별 추천 질문
    const getRecommendedQuestions = (round) => {
      const questions = {
        1: [
          "이번 라운드 투자 전략은?",
          "리스크 관리 방법은?",
          "어떤 섹터가 유망할까?",
        ],
        2: ["시장 동향은 어떨까?", "분산 투자 전략은?", "수익률 개선 방법은?"],
        3: ["최종 투자 전략은?", "포트폴리오 점검은?", "게임 완료 후 조언은?"],
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
        "시장 변동성에 대처하는 방법은?",
      ];
    };

    // 타이핑 효과로 메시지 표시
    const typeMessage = (message) => {
      // 강력한 undefined 체크 및 정제
      let cleanMessage = "";

      if (message === null || message === undefined) {
        cleanMessage = "답변을 불러올 수 없습니다.";
      } else if (typeof message === "string") {
        // 문자열에서 undefined 텍스트 제거 및 정제
        cleanMessage = message
          .replace(/undefined/g, "") // undefined 텍스트 제거
          .replace(/null/g, "") // null 텍스트 제거
          .trim();

        // 빈 문자열인 경우 기본 메시지
        if (!cleanMessage) {
          cleanMessage = "답변을 불러올 수 없습니다.";
        }
      } else {
        // 문자열이 아닌 경우 문자열로 변환 후 정제
        cleanMessage = String(message)
          .replace(/undefined/g, "")
          .replace(/null/g, "")
          .trim();

        if (!cleanMessage) {
          cleanMessage = "답변을 불러올 수 없습니다.";
        }
      }

      setCurrentMessage("");
      setShowSpeechBubble(true);
      setIsTyping(true);
      setIsSpeaking(true);
      startHeroAnimation();

      let index = 0;
      typingIntervalRef.current = setInterval(() => {
        if (index < cleanMessage.length && cleanMessage[index] !== undefined) {
          const char = cleanMessage[index];
          setCurrentMessage((prev) => {
            // 이전 메시지도 undefined 체크
            const safePrev = prev || "";
            return safePrev + char;
          });
          index++;
          // 타이핑될 때마다 스크롤을 아래로
          setTimeout(scrollToBottom, 10);
        } else {
          // 타이핑 완료
          setIsTyping(false);
          clearInterval(typingIntervalRef.current);
          // 타이핑 완료 후 한 번 더 스크롤
          setTimeout(scrollToBottom, 10);

          // 10초 후 말풍선 사라짐
          speechTimeoutRef.current = setTimeout(() => {
            setShowSpeechBubble(false);
            setIsSpeaking(false);
            stopHeroAnimation();
          }, 10000);
        }
      }, 50); // 50ms마다 한 글자씩
    };

    // 용사 캐릭터 애니메이션 시작
    const startHeroAnimation = () => {
      setHeroAnimating(true);
      let toggle = false;
      animationIntervalRef.current = setInterval(() => {
        toggle = !toggle;
        setHeroAnimating(toggle);
      }, 400); // 400ms마다 이미지 변경
    };

    // 용사 캐릭터 애니메이션 중지
    const stopHeroAnimation = () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        setHeroAnimating(false);
      }
    };

    // 스크롤을 맨 아래로 이동
    const scrollToBottom = () => {
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop =
          messageContainerRef.current.scrollHeight;
      }
    };

    // 외부에서 가이드 메시지 추가
    useImperativeHandle(ref, () => ({
      addGuideMessage: (text) => {
        // 강력한 텍스트 처리
        let safeText = "가이드 메시지를 불러올 수 없습니다.";

        if (text !== null && text !== undefined) {
          if (typeof text === "string") {
            const cleanText = text
              .replace(/undefined/g, "")
              .replace(/null/g, "")
              .trim();
            if (cleanText) {
              safeText = cleanText;
            }
          } else {
            const convertedText = String(text)
              .replace(/undefined/g, "")
              .replace(/null/g, "")
              .trim();
            if (convertedText) {
              safeText = convertedText;
            }
          }
        }

        // 이전 타이핑이나 타이머 정리
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        stopHeroAnimation();

        // 새 메시지 타이핑 시작
        typeMessage(safeText);
      },
    }));

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
      return () => {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current);
        }
      };
    }, []);

    const handleSend = async (e) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      await sendMessage(trimmed);
    };

    const sendMessage = async (message) => {
      setInput("");
      setLoading(true);

      // 이전 메시지 정리
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      stopHeroAnimation();

      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          "/api/chatbot",
          { message: message },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        // 강력한 응답 처리
        let answer = "답변을 불러올 수 없습니다.";

        if (res && res.data && res.data.answer) {
          const rawAnswer = res.data.answer;
          if (typeof rawAnswer === "string" && rawAnswer.trim()) {
            answer = rawAnswer.trim();
          } else if (rawAnswer !== null && rawAnswer !== undefined) {
            answer = String(rawAnswer).trim();
          }
        }

        typeMessage(answer);
      } catch (err) {
        typeMessage("답변을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    const handleQuestionClick = (question) => {
      sendMessage(question);
    };

    return (
      <>
        {/* 용사 캐릭터와 말풍선 영역 (fixedPanel이면 항상) */}
        {fixedPanel && (
          <div className="w-full h-full flex flex-col items-center justify-center relative bg-transparent rounded-2xl">
            {/* 용사 캐릭터 */}
            <div className="relative flex flex-col items-end justify-end flex-1 pr-0 pb-4">
              <div className="relative">
                {/* 말풍선 */}
                {showSpeechBubble && (
                  <div className="absolute bottom-full right-0 transform translate-x-8 mb-4 animate-fadeIn">
                    <div className="relative bg-black bg-opacity-50 rounded-3xl px-8 py-6 shadow-xl border-2 border-[#bfa76a] border-opacity-50 w-80 h-48 backdrop-blur-sm">
                      <div
                        ref={messageContainerRef}
                        className="text-white text-sm font-medium leading-relaxed h-full overflow-y-auto game-scrollbar"
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {currentMessage
                            ? currentMessage
                                .replace(/undefined/g, "")
                                .replace(/null/g, "")
                            : ""}
                          {isTyping && <span className="animate-pulse">|</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 용사 캐릭터 이미지 */}
                <div className="relative transform translate-x-16">
                  <img
                    src={isSpeaking && heroAnimating ? heroImage2 : heroImage1}
                    alt="용사"
                    className="w-80 h-80 object-contain transition-all duration-200"
                    style={{
                      filter: isSpeaking ? "brightness(1.1)" : "brightness(1)",
                      transform: isSpeaking ? "scale(1.05)" : "scale(1)",
                    }}
                  />

                  {/* 로딩 스피너 */}
                  {loading && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bfa76a]"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 질문 선택 영역 */}
            {!showSpeechBubble && !loading && (
              <div className="absolute top-4 left-4 right-4 max-w-sm">
                <div className="text-center mb-4 bg-black bg-opacity-40 rounded-2xl p-4 backdrop-blur-sm border border-[#bfa76a] border-opacity-60">
                  <div className="mb-3">
                    <h2
                      className="text-xl font-bold text-[#7c5c2b] text-center drop-shadow-lg"
                      style={{
                        fontFamily: "serif",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                      }}
                    >
                      용사의 조언
                    </h2>
                  </div>

                  {/* 탭 버튼 */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setActiveTab("recommended")}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
                        activeTab === "recommended"
                          ? "bg-[#bfa76a] bg-opacity-90 text-white border-[#a67c3c] shadow-lg"
                          : "bg-white bg-opacity-80 text-[#7c5c2b] border-[#bfa76a] backdrop-blur-sm"
                      }`}
                    >
                      추천 질문
                    </button>
                    <button
                      onClick={() => setActiveTab("faq")}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${
                        activeTab === "faq"
                          ? "bg-[#bfa76a] bg-opacity-90 text-white border-[#a67c3c] shadow-lg"
                          : "bg-white bg-opacity-80 text-[#7c5c2b] border-[#bfa76a] backdrop-blur-sm"
                      }`}
                    >
                      자주 묻는 질문
                    </button>
                  </div>

                  {/* 탭 내용 */}
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {activeTab === "recommended" &&
                      getRecommendedQuestions(currentRound).map(
                        (question, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuestionClick(question)}
                            className="block w-full text-left bg-white bg-opacity-75 hover:bg-[#bfa76a] hover:bg-opacity-90 hover:text-white text-[#7c5c2b] rounded-lg px-3 py-2 text-xs transition-colors duration-200 border border-[#bfa76a] backdrop-blur-sm shadow-sm"
                          >
                            💬 {question}
                          </button>
                        )
                      )}

                    {activeTab === "faq" &&
                      getFAQQuestions()
                        .slice(0, 5)
                        .map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuestionClick(question)}
                            className="block w-full text-left bg-white bg-opacity-75 hover:bg-[#bfa76a] hover:bg-opacity-90 hover:text-white text-[#7c5c2b] rounded-lg px-3 py-2 text-xs transition-colors duration-200 border border-[#bfa76a] backdrop-blur-sm shadow-sm"
                          >
                            ❓ {question}
                          </button>
                        ))}
                  </div>
                </div>
              </div>
            )}

            {/* 입력창 */}
            <form
              className="w-full flex items-center border-t-2 border-[#bfa76a] border-opacity-60 px-4 py-3 bg-black bg-opacity-30 backdrop-blur-sm"
              onSubmit={handleSend}
            >
              <input
                className="flex-1 rounded-lg border border-[#bfa76a] px-3 py-2 mr-2 focus:outline-none focus:ring-2 focus:ring-[#bfa76a] bg-white text-[#7c5c2b] text-sm"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="용사에게 질문하기..."
                style={{ fontFamily: "serif" }}
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-[#bfa76a] hover:bg-[#a67c3c] text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
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
  }
);

export default ChatbotWidget;
