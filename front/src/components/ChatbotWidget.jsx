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
import heroThinking from "../assets/hero_thinking.png"; // 용사 이미지 3 (생각하는 상태)
import heroThinking2 from "../assets/hero_thinking2.png"; // 용사 이미지 4 (생각하는 상태 2)

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
    const [loadingAnimating, setLoadingAnimating] = useState(false); // 로딩 애니메이션 여부

    const typingIntervalRef = useRef(null);
    const speechTimeoutRef = useRef(null);
    const animationIntervalRef = useRef(null);
    const loadingAnimationRef = useRef(null);
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

      // 이전 타이핑 정리
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      setCurrentMessage("");
      setShowSpeechBubble(true);
      setIsTyping(true);
      setIsSpeaking(true);
      startHeroAnimation();

      let index = 0;
      let currentText = ""; // 로컬 변수로 현재 텍스트 관리

      typingIntervalRef.current = setInterval(() => {
        if (index < cleanMessage.length && cleanMessage[index] !== undefined) {
          const char = cleanMessage[index];
          currentText += char; // 로컬 변수에 추가
          setCurrentMessage(currentText); // 전체 텍스트를 한 번에 설정
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

    // 로딩 애니메이션 시작
    const startLoadingAnimation = () => {
      setLoadingAnimating(true);
      let toggle = false;
      loadingAnimationRef.current = setInterval(() => {
        toggle = !toggle;
        setLoadingAnimating(toggle);
      }, 600); // 600ms마다 이미지 변경
    };

    // 로딩 애니메이션 중지
    const stopLoadingAnimation = () => {
      if (loadingAnimationRef.current) {
        clearInterval(loadingAnimationRef.current);
        setLoadingAnimating(false);
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

        // 이전 타이핑이나 타이머 정리 - 더 강력한 정리
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        stopHeroAnimation();
        stopLoadingAnimation();

        // 현재 메시지와 말풍선 상태 초기화
        setCurrentMessage("");
        setShowSpeechBubble(false);
        setIsTyping(false);
        setIsSpeaking(false);

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
        if (loadingAnimationRef.current) {
          clearInterval(loadingAnimationRef.current);
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
      startLoadingAnimation(); // 로딩 애니메이션 시작

      // 이전 메시지 정리 - 더 강력한 정리
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      stopHeroAnimation();

      // 현재 메시지와 말풍선 상태 초기화
      setCurrentMessage("");
      setShowSpeechBubble(false);
      setIsTyping(false);
      setIsSpeaking(false);

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
        stopLoadingAnimation(); // 로딩 애니메이션 중지
      }
    };

    const handleQuestionClick = (question) => {
      sendMessage(question);
    };

    // 키워드 클릭 핸들러
    const handleKeywordClick = async (keyword) => {
      try {
        setLoading(true);
        startLoadingAnimation(); // 로딩 애니메이션 시작

        // 이전 메시지 정리 - 더 강력한 정리
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        stopHeroAnimation();

        // 현재 메시지와 말풍선 상태 초기화
        setCurrentMessage("");
        setShowSpeechBubble(false);
        setIsTyping(false);
        setIsSpeaking(false);

        // 해당 라운드의 키워드 관련 뉴스 정보를 요청
        const token = localStorage.getItem("token");
        const response = await axios.post(
          "/api/chatbot/keyword-analysis",
          {
            keyword: keyword,
            round: currentRound,
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        console.log("API Response:", response);
        console.log("Response data:", response.data);
        console.log("Analysis field:", response.data?.analysis);

        if (response.data && response.data.analysis) {
          const analysis = response.data.analysis;
          console.log("Analysis content:", analysis);
          console.log("Analysis type:", typeof analysis);
          console.log("Analysis length:", analysis?.length);

          // 응답이 이상한 경우 기본 질문으로 대체
          if (
            analysis &&
            typeof analysis === "string" &&
            analysis.length > 10 &&
            !analysis.includes("허허") &&
            !analysis.includes("과인이") &&
            !analysis.includes("그대가")
          ) {
            console.log("Detected abnormal response, using fallback question");
            // 이상한 응답인 경우 기본 질문으로 대체
            const questions = [
              `${keyword}에 대해 자세히 설명해주세요.`,
              `${keyword}가 투자에 미치는 영향은?`,
              `${keyword} 관련 투자 전략은?`,
              `${keyword}가 시장에 미치는 영향은?`,
              `${keyword} 관련 주목할 만한 기업은?`,
            ];
            const randomQuestion =
              questions[Math.floor(Math.random() * questions.length)];
            sendMessage(randomQuestion);
          } else {
            console.log("Using normal response:", analysis);
            typeMessage(analysis);
          }
        } else {
          console.log("No analysis field in response, using fallback question");
          // API 응답이 없을 경우 기본 질문으로 대체
          const questions = [
            `${keyword}에 대해 자세히 설명해주세요.`,
            `${keyword}가 투자에 미치는 영향은?`,
            `${keyword} 관련 투자 전략은?`,
            `${keyword}가 시장에 미치는 영향은?`,
            `${keyword} 관련 주목할 만한 기업은?`,
          ];
          const randomQuestion =
            questions[Math.floor(Math.random() * questions.length)];
          sendMessage(randomQuestion);
        }
      } catch (error) {
        console.error("키워드 분석 요청 실패:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config,
        });
        // 에러 발생 시 기본 질문으로 대체
        const questions = [
          `${keyword}에 대해 자세히 설명해주세요.`,
          `${keyword}가 투자에 미치는 영향은?`,
          `${keyword} 관련 투자 전략은?`,
          `${keyword}가 시장에 미치는 영향은?`,
          `${keyword} 관련 주목할 만한 기업은?`,
        ];
        const randomQuestion =
          questions[Math.floor(Math.random() * questions.length)];
        sendMessage(randomQuestion);
      } finally {
        setLoading(false);
        stopLoadingAnimation(); // 로딩 애니메이션 중지
      }
    };

    // 키워드 강조 및 클릭 가능한 텍스트로 변환
    const highlightKeywords = (text) => {
      if (!text) return "";

      // 키워드 목록 (긴 키워드부터 정렬하여 우선 매칭)
      const keywords = [
        "블록체인/암호화폐",
        "AI/인공지능",
        "디지털/메타버스",
        "기술 혁신",
        "경제 충격",
        "에너지 위기",
        "식량 위기",
        "금리 변동",
        "환율 변동",
        "물가 상승",
        "경기부양책",
        "경기 회복",
        "IT 기술",
        "바이오/제약",
        "친환경/ESG",
        "원유/석유",
        "중국 경제",
        "미국 경제",
        "유럽 경제",
        "통신/5G",
        "소비/유통",
        "건설/인프라",
        "화학/소재",
        "조선/해운",
        "게임/엔터",
        "보험/증권",
        "고용/실업",
        "무역/수출",
        "투자/자본",
        "규제/정책",
        "합작/M&A",
        "배당/주주",
        "실적/수익",
        "클라우드",
        "보안/사이버",
        "의료/헬스케어",
        "식품/농업",
        "자동차/모빌리티",
        "항공/여행",
        "리테일/온라인",
        "물류/배송",
        "재생에너지",
        "배터리/2차전지",
        "반도체장비",
        "파운드리/팹리스",
        "전쟁",
        "인플레이션",
        "코로나19",
        "백신 보급",
        "성장주",
        "반도체",
        "전기차",
        "부동산",
        "금융권",
        "교육",
        "디스플레이",
        "메모리",
      ];

      // 모든 매칭을 찾아서 위치별로 정렬
      const matches = [];
      keywords.forEach((keyword) => {
        const regex = new RegExp(
          keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "gi"
        );
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            keyword,
            start: match.index,
            end: regex.lastIndex,
            text: match[0],
          });
        }
      });

      // 시작 위치로 정렬하고 중복 제거
      matches.sort((a, b) => a.start - b.start);

      const filteredMatches = [];
      for (const match of matches) {
        // 이미 포함된 범위와 겹치는지 확인
        const isOverlapping = filteredMatches.some(
          (existing) =>
            (match.start >= existing.start && match.start < existing.end) ||
            (match.end > existing.start && match.end <= existing.end) ||
            (match.start <= existing.start && match.end >= existing.end)
        );

        if (!isOverlapping) {
          filteredMatches.push(match);
        }
      }

      // React 요소로 변환
      const parts = [];
      let lastIndex = 0;

      filteredMatches.forEach((match) => {
        // 매칭 이전 텍스트 추가
        if (match.start > lastIndex) {
          parts.push(text.slice(lastIndex, match.start));
        }

        // 키워드 추가 (클릭 가능한 span)
        parts.push(
          <span
            key={`${match.keyword}-${match.start}`}
            className="keyword-highlight cursor-pointer hover:bg-[#bfa76a] hover:bg-opacity-30 px-1 rounded transition-colors duration-200"
            onClick={() => handleKeywordClick(match.keyword)}
          >
            {match.text}
          </span>
        );

        lastIndex = match.end;
      });

      // 남은 텍스트 추가
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }

      return parts.length > 0 ? parts : text;
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
                  <div className="absolute bottom-full right-0 transform translate-x-8 mb-4 animate-fadeIn -z-50">
                    <div className="relative bg-black bg-opacity-50 rounded-3xl px-8 py-6 shadow-xl border-2 border-[#bfa76a] border-opacity-50 w-[416px] h-[312px] backdrop-blur-sm">
                      <div
                        ref={messageContainerRef}
                        className="text-white font-medium leading-relaxed h-full overflow-y-auto game-scrollbar"
                        style={{ fontSize: "19px", fontFamily: "serif" }}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {currentMessage
                            ? highlightKeywords(
                                currentMessage
                                  .replace(/undefined/g, "")
                                  .replace(/null/g, "")
                              )
                            : ""}
                        </div>
                        {isTyping && <span className="animate-pulse">|</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* 용사 캐릭터 이미지 */}
                <div className="relative transform translate-x-16">
                  <img
                    src={
                      loading
                        ? loadingAnimating
                          ? heroThinking
                          : heroThinking2
                        : isSpeaking && heroAnimating
                        ? heroImage2
                        : heroImage1
                    }
                    alt="용사"
                    className="object-contain transition-all duration-200"
                    style={{
                      width: "25vw",
                      height: "20vw",
                      filter: isSpeaking ? "brightness(1.1)" : "brightness(1)",
                      transform: isSpeaking ? "scale(1.05)" : "scale(1)",
                    }}
                  />
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
