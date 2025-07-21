import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

import { useAuth } from "../contexts/AuthContext";
import { GuideMessageContext } from "../App";
import ChatbotWidget from "../components/ChatbotWidget";

const GUIDE_MSG =
  "허허, 용사여!\n이곳은 최신 시장 뉴스가 모이는 곳이구나.\n뉴스를 잘 살펴 투자에 참고하시게!";

const ROUND_TREND_GUIDE = {
  "2020Q1":
    "2020년 1분기에는 코로나19의 영향으로 글로벌 증시가 큰 충격을 받았으니, 그대가 신중하게 판단하시게.",
  "2020Q2":
    "2020년 2분기에는 각국의 경기부양책으로 시장이 반등하기 시작했으니, 과인의 조언을 참고하시게.",
  "2021Q1":
    "2021년 1분기에는 백신 보급과 함께 경기 회복 기대감이 커졌으니, 이런 시기를 잘 활용하시게.",
  "2023H1":
    "2023년 상반기에는 글로벌 경제가 점차 안정을 찾아가고 있으니, 그대가 신중하게 판단하시게. 상반기에는 경기 회복 기대감이 컸으니, 과인의 조언을 참고하시게.",
  "2023H2":
    "2023년 하반기에는 금리 인상과 인플레이션 이슈가 완화되며 시장이 점진적으로 회복되고 있으니, 이런 시기를 잘 활용하시게.",
  // 필요에 따라 실제 period 값에 맞게 추가
};

function getRoundTrendGuide(period, macroNews = null) {
  const formatPeriod = (p) => {
    if (!p || !p.includes(" ")) return p;
    const [year, half] = p.split(" ");
    const halfKorean = half === "H1" ? "상반기" : "하반기";
    return `${year}년 ${halfKorean}`;
  };
  const formattedPeriod = formatPeriod(period);

  if (ROUND_TREND_GUIDE[period]) return ROUND_TREND_GUIDE[period];

  if (macroNews && macroNews.length > 0) {
    // 주요 키워드 추출 및 요약
    const keywords = new Set();
    macroNews.slice(0, 5).forEach((news) => {
      const title = news.title.replace(/ 주요 이슈: /, "");
      // 주요 키워드 추출 (더 많은 키워드 적용)
      if (title.includes("전쟁")) keywords.add("전쟁");
      if (title.includes("경제")) keywords.add("경제 충격");
      if (title.includes("금리")) keywords.add("금리 변동");
      if (title.includes("인플레이션")) keywords.add("인플레이션");
      if (title.includes("에너지")) keywords.add("에너지 위기");
      if (title.includes("식량")) keywords.add("식량 위기");
      if (title.includes("코로나") || title.includes("COVID"))
        keywords.add("코로나19");
      if (title.includes("백신")) keywords.add("백신 보급");
      if (title.includes("부양책") || title.includes("경기부양"))
        keywords.add("경기부양책");
      if (title.includes("회복") || title.includes("반등"))
        keywords.add("경기 회복");
      if (title.includes("성장")) keywords.add("성장주");
      if (title.includes("반도체")) keywords.add("반도체");
      if (title.includes("IT") || title.includes("기술"))
        keywords.add("IT 기술");
      if (title.includes("바이오") || title.includes("제약"))
        keywords.add("바이오/제약");
      if (title.includes("전기차") || title.includes("EV"))
        keywords.add("전기차");
      if (title.includes("친환경") || title.includes("ESG"))
        keywords.add("친환경/ESG");
      if (title.includes("원유") || title.includes("석유"))
        keywords.add("원유/석유");
      if (title.includes("달러") || title.includes("환율"))
        keywords.add("환율 변동");
      if (title.includes("중국") || title.includes("화웨이"))
        keywords.add("중국 경제");
      if (title.includes("미국") || title.includes("연준"))
        keywords.add("미국 경제");
      if (title.includes("유럽") || title.includes("ECB"))
        keywords.add("유럽 경제");
      if (title.includes("부동산") || title.includes("주택"))
        keywords.add("부동산");
      if (title.includes("은행") || title.includes("금융"))
        keywords.add("금융권");
      if (title.includes("통신") || title.includes("5G"))
        keywords.add("통신/5G");
      if (title.includes("소비") || title.includes("유통"))
        keywords.add("소비/유통");
      if (title.includes("건설") || title.includes("인프라"))
        keywords.add("건설/인프라");
      if (title.includes("화학") || title.includes("소재"))
        keywords.add("화학/소재");
      if (title.includes("조선") || title.includes("해운"))
        keywords.add("조선/해운");
      if (title.includes("게임") || title.includes("엔터"))
        keywords.add("게임/엔터");
      if (title.includes("교육") || title.includes("에듀"))
        keywords.add("교육");
      if (title.includes("보험") || title.includes("증권"))
        keywords.add("보험/증권");
      if (title.includes("물가") || title.includes("CPI"))
        keywords.add("물가 상승");
      if (title.includes("고용") || title.includes("실업"))
        keywords.add("고용/실업");
      if (title.includes("무역") || title.includes("수출"))
        keywords.add("무역/수출");
      if (title.includes("투자") || title.includes("자본"))
        keywords.add("투자/자본");
      if (title.includes("규제") || title.includes("정책"))
        keywords.add("규제/정책");
      if (title.includes("합작") || title.includes("M&A"))
        keywords.add("합작/M&A");
      if (title.includes("배당") || title.includes("주주"))
        keywords.add("배당/주주");
      if (title.includes("실적") || title.includes("수익"))
        keywords.add("실적/수익");
      if (title.includes("혁신") || title.includes("신기술"))
        keywords.add("기술 혁신");
      if (title.includes("디지털") || title.includes("메타버스"))
        keywords.add("디지털/메타버스");
      if (title.includes("AI") || title.includes("인공지능"))
        keywords.add("AI/인공지능");
      if (title.includes("블록체인") || title.includes("암호화폐"))
        keywords.add("블록체인/암호화폐");
      if (title.includes("클라우드") || title.includes("클라우드"))
        keywords.add("클라우드");
      if (title.includes("보안") || title.includes("사이버"))
        keywords.add("보안/사이버");
      if (title.includes("의료") || title.includes("헬스케어"))
        keywords.add("의료/헬스케어");
      if (title.includes("식품") || title.includes("농업"))
        keywords.add("식품/농업");
      if (title.includes("자동차") || title.includes("모빌리티"))
        keywords.add("자동차/모빌리티");
      if (title.includes("항공") || title.includes("여행"))
        keywords.add("항공/여행");
      if (title.includes("리테일") || title.includes("온라인"))
        keywords.add("리테일/온라인");
      if (title.includes("물류") || title.includes("배송"))
        keywords.add("물류/배송");
      if (title.includes("재생에너지") || title.includes("태양광"))
        keywords.add("재생에너지");
      if (title.includes("배터리") || title.includes("2차전지"))
        keywords.add("배터리/2차전지");
      if (title.includes("반도체장비") || title.includes("장비"))
        keywords.add("반도체장비");
      if (title.includes("디스플레이") || title.includes("OLED"))
        keywords.add("디스플레이");
      if (title.includes("메모리") || title.includes("DRAM"))
        keywords.add("메모리");
      if (title.includes("파운드리") || title.includes("팹리스"))
        keywords.add("파운드리/팹리스");
    });

    const keywordList = Array.from(keywords).slice(0, 3); // 최대 3개 키워드
    const summary =
      keywordList.length > 0
        ? `${formattedPeriod}에는 ${keywordList.join(
            ", "
          )} 등의 이슈가 있었구나.`
        : `${formattedPeriod}에는 다양한 경제 이슈들이 있었구나.`;

    let tip = "";
    if (currentRound === 3) {
      tip = "허허, 이런 시장 상황을 잘 파악하고 어떤 산업이 기회가 될지 신중하게 판단해보시게. 위기 속에 기회가 숨어있는 법이지!";
    } else {
      tip = "허허, 이런 시장 상황을 잘 파악하고 어떤 산업이 기회가 될지 신중하게 판단해보시게. 위기 속에 기회가 숨어있는 법이지!\n\n뉴스 판단이 어렵다면 카드를 눌러보시게.";
    }
    return `${summary} ${tip}`;
  }

  if (period && period.includes(" ")) {
    const [year, half] = period.split(" ");
    if (half === "H1")
      return `${year}년 상반기에는 글로벌 경제와 산업의 주요 변화를 주목하시게!`;
    if (half === "H2")
      return `${year}년 하반기에는 하반기 시장의 주요 이슈와 트렌드를 살펴보시게!`;
    if (year === "2023")
      return "2023년에는 글로벌 경제가 점차 안정을 찾아가고 있으니, 그대가 신중하게 판단하시게.";
    if (year === "2022")
      return "2022년에는 인플레이션과 금리 인상 이슈로 시장이 조정받고 있으니, 과인의 조언을 참고하시게.";
    if (year === "2021")
      return "2021년에는 경기 회복과 성장주에 대한 기대가 높아졌으니, 이런 시기를 잘 활용하시게.";
    if (year === "2020")
      return "2020년대 초반에는 시장이 큰 변동성을 겪고 있으니, 그대가 조심하시게.";
  }
  if (period && period.length >= 4) {
    const year = period.slice(0, 4);
    if (year === "2023")
      return "2023년에는 글로벌 경제가 점차 안정을 찾아가고 있으니, 그대가 신중하게 판단하시게.";
    if (year === "2022")
      return "2022년에는 인플레이션과 금리 인상 이슈로 시장이 조정받고 있으니, 과인의 조언을 참고하시게.";
    if (year === "2021")
      return "2021년에는 경기 회복과 성장주에 대한 기대가 높아졌으니, 이런 시기를 잘 활용하시게.";
    if (year === "2020")
      return "2020년대 초반에는 시장이 큰 변동성을 겪고 있으니, 그대가 조심하시게.";
  }
  return "허허, 현재 시점의 시장 동향을 잘 살펴 투자 전략을 세워보시게!";
}

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  // 모달 상태 추가
  const [selectedNews, setSelectedNews] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [flippedCards, setFlippedCards] = useState({}); // 카드별 flip 상태
  const navigate = useNavigate(); // 추가
  const { user } = useAuth();
  const { addGuideMessage } = useContext(GuideMessageContext);
  const currentRound = (user?.current_round_idx ?? 0) + 1;
  const [explainedNews, setExplainedNews] = useState({}); // 뉴스별 LLM 설명 완료 여부
  const [explainingNews, setExplainingNews] = useState({}); // 뉴스별 LLM 설명 요청 중 여부
  const requestedNewsRef = useRef({}); // 요청 추적용 ref

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ESC 키로 모달 닫기
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      setSelectedNews(null);
    }
  }, []);

  // 현재 라운드의 period 가져오기
  useEffect(() => {
    const fetchPeriod = async () => {
      try {
        const res = await axios.get("/api/auth/me");
        setCurrentPeriod(res.data.current_period);
      } catch (error) {
        toast.error("라운드 정보를 불러오지 못했습니다.");
        setLoading(false);
      }
    };
    fetchPeriod();
  }, []);

  // period가 준비되면 뉴스 불러오기
  useEffect(() => {
    if (user?.current_period) {
      // Macro 뉴스도 함께 불러와서 가이드 메시지에 활용
      const fetchMacroNewsAndGuide = async () => {
        try {
          const macroRes = await axios.get(
            `/api/news/macro?period=${encodeURIComponent(user.current_period)}`
          );
          addGuideMessage(
            getRoundTrendGuide(user.current_period, macroRes.data)
          );
        } catch (e) {
          addGuideMessage(getRoundTrendGuide(user.current_period));
        }
        fetchNews(user.current_period);
      };
      fetchMacroNewsAndGuide();
    }
  }, [user?.current_period]);

  const fetchNews = async (period) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/news?period=${encodeURIComponent(period)}`
      );
      setNews(response.data);
    } catch (error) {
      toast.error("뉴스를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getImpactIcon = (impactType) => {
    switch (impactType) {
      case "positive":
        return <TrendingUp className="text-green-600" size={20} />;
      case "negative":
        return <TrendingDown className="text-red-600" size={20} />;
      default:
        return <Minus className="text-gray-600" size={20} />;
    }
  };

  const getImpactColor = (impactType) => {
    switch (impactType) {
      case "positive":
        return "bg-green-50 border-green-200";
      case "negative":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  // 카드 클릭 핸들러 (flip + LLM 설명 요청)
  const handleCardFlip = (id) => {
    setFlippedCards((prev) => {
      const wasFlipped = !!prev[id];
      const next = { ...prev, [id]: !wasFlipped };
      // 카드가 처음 뒤집힐 때만 요청
      if (!wasFlipped && !requestedNewsRef.current[id]) {
        if (currentRound === 3) {
          addGuideMessage("이번에는 자네가 스스로 판단해 보시게나");
        } else {
          fetchLlmExplanation(id);
        }
      }
      return next;
    });
  };

  // LLM 설명 요청 함수 (POST /api/chatbot)
  const fetchLlmExplanation = async (id) => {
    // 이미 요청했으면 중복 방지
    if (requestedNewsRef.current[id]) return;
    requestedNewsRef.current[id] = true;
    try {
      const newsItem = news.find((n) => n.id === id);
      if (!newsItem) return;
      const token = localStorage.getItem("token");
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: newsItem.content || newsItem.summary }),
      });
      const data = await res.json();
      const llmText = data.answer || "(설명이 도착하지 않았습니다)";
      console.log("LLM 응답:", llmText);
      addGuideMessage(`${llmText}`);
    } catch (e) {
      addGuideMessage("🧙‍♂️ 용사의 해설을 불러오지 못했습니다.");
      // 실패 시 다시 요청 가능하게
      delete requestedNewsRef.current[id];
    }
  };

  // 감정 분석 한글 및 색상 반환 함수
  const getSentimentLabel = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return { label: "긍정", color: "#22c55e", bg: "#e6f9ed" };
      case "negative":
        return { label: "부정", color: "#ef4444", bg: "#fdeaea" };
      case "neutral":
      default:
        return { label: "중립", color: "#a3a3a3", bg: "#f3f4f6" };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black bg-opacity-30">
        <img
          src="/warrior.png"
          alt="로딩 캐릭터"
          style={{ width: 220, height: 320 }}
          className="mb-6"
        />
        <span className="text-2xl text-white font-bold animate-blink-slow" style={{ fontFamily: 'Jua, sans-serif' }}>
          전투 진행중...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 news-page">
      <style>{`
        .flip-card {
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 1rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .flip-card-back {
          background: #fffbe6;
          color: #7c5c2b;
          transform: rotateY(180deg);
          border: 2px solid #e6d3a3;
          padding: 1.5rem;
        }
      `}</style>
      <div className="flex items-center justify-between mb-6 max-w-screen-xl mx-auto px-4">
  {/* 텍스트 묶음 */}
  <div style={{ transform: "translateY(-16px)" }}>
    <h1
      className="text-2xl font-bold text-[#7c5c2b]"
      style={{ fontFamily: "Jua, sans-serif" }}
    >
      📰 시장 뉴스
    </h1>
    <p
      className="text-[#a67c3c] mt-1"
      style={{ fontFamily: "Jua, sans-serif" }}
    >
      최신 시장 동향을 파악하고 투자에 참고하시게
    </p>
  </div>

  {/* 버튼도 같은 높이로 올림 */}
  <div style={{ transform: "translateY(-16px) translateX(-10px)" }}>
    <button
      className="bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-normal py-3 px-8 rounded-full text-lg shadow-lg transition-all duration-200 border-2 border-[#e6d3a3]"
      style={{ fontFamily: "Jua, sans-serif" }}
      onClick={() => navigate("/select-sector")}
    >
      투자 하러가기
    </button>
  </div>
</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className={`flip-card card news-card transition-all duration-200 h-56 flex flex-col ${getImpactColor(
              item.impact_type
            )} ${flippedCards[item.id] ? "flipped" : ""}`}
            onClick={() => handleCardFlip(item.id)}
            style={{ cursor: "pointer" }}
          >
            <div className="flip-card-inner w-full h-full">
              {/* 앞면 */}
              <div className="flip-card-front w-full h-full p-4">
                <div className="flex items-start justify-between mb-4 flex-1">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-normal rounded-full px-2 py-0.5 mr-2 align-middle">
                        {item.period}
                      </span>
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {item.summary || item.content}
                    </p>
                  </div>
                  <div className="ml-4">{getImpactIcon(item.impact_type)}</div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
                  <div>
                    {item.affected_sectors && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {item.affected_sectors}
                      </span>
                    )}
                  </div>
                  <div>
                    {item.date && (
                      <span className="text-gray-500 text-xs">
                        {new Date(item.date).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* 뒷면 */}
              <div className="flip-card-back w-full h-full flex flex-col items-center justify-center">
                {currentRound === 3 ? (
                  <div className="text-xl font-bold text-[#a67c3c] text-center px-4 py-2">
                    이번에는 스스로 판단해 보시게나
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold mb-2">뉴스 감정 분석 결과</h3>
                    <div
                      className="text-2xl font-bold mb-4 px-4 py-2 rounded-full"
                      style={{
                        color: getSentimentLabel(item.sentiment).color,
                        background: getSentimentLabel(item.sentiment).bg,
                      }}
                    >
                      {getSentimentLabel(item.sentiment).label}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {news.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📰</div>
          <p className="text-gray-500 text-lg">아직 뉴스가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">
            라운드를 진행하면 새로운 뉴스가 발표됩니다.
          </p>
        </div>
      )}

      {/* 뉴스 상세 모달 (상단 인덱스 클릭 시만) */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full min-h-[70vh] py-24 px-16 flex flex-col justify-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* X 닫기 버튼 */}
            <button
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-3xl font-bold focus:outline-none"
              onClick={() => setSelectedNews(null)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-3xl font-medium mb-8 text-gray-900">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-block bg-blue-100 text-blue-700 text-base font-bold rounded-full px-3 py-1 align-middle">
                  {selectedNews.period}
                </span>
                {selectedNews.date && (
                  <span className="text-gray-600 text-base">
                    {new Date(selectedNews.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </span>
                )}
              </div>
              {selectedNews.title}
            </h2>
            <p className="text-gray-700 mb-8 text-lg">{selectedNews.content}</p>
            <div className="text-gray-600 mb-8 text-base font-normal whitespace-pre-line">
              {selectedNews.summary || selectedNews.content}
            </div>
            {selectedNews.affected_sectors && (
              <div className="mb-4">
                <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-base">
                  {selectedNews.affected_sectors}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
