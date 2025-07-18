import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BannerHeader from "../components/BannerHeader";
import { useAuth } from "../contexts/AuthContext";
import { GuideMessageContext } from "../App";
import ChatbotWidget from "../components/ChatbotWidget";

const GUIDE_MSG =
  "용사여, 이곳은 최신 시장 뉴스가 모이는 곳이네. 뉴스를 잘 살펴 투자에 참고하게!";

const ROUND_TREND_GUIDE = {
  "2020Q1": "2020년 1분기, 코로나19의 영향으로 글로벌 증시가 큰 충격을 받았네.",
  "2020Q2": "2020년 2분기, 각국의 경기부양책으로 시장이 반등하기 시작했지.",
  "2021Q1": "2021년 1분기, 백신 보급과 함께 경기 회복 기대감이 커졌네.",
  "2023H1":
    "2023년 상반기, 글로벌 경제가 점차 안정을 찾아가고 있네. 상반기에는 경기 회복 기대감이 컸지.",
  "2023H2":
    "2023년 하반기, 금리 인상과 인플레이션 이슈가 완화되며 시장이 점진적으로 회복되고 있네.",
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
    // 최대 5개의 뉴스 제목을 요약
    const newsTitles = macroNews
      .slice(0, 5)
      .map((news) => news.title.replace(/ 주요 이슈: /, "")); // "주요 이슈: " 부분 제거
    const summary = `${formattedPeriod}에는 이런 소식들이 있었네: "${newsTitles.join(
      '", "'
    )}".`;
    const tip =
      "이러한 시장의 흐름을 잘 읽고, 어떤 산업이 유망할지 신중하게 판단해서 투자해보게나. 기회는 언제나 위기 속에 숨어있는 법이지.";
    return `${summary} ${tip}`;
  }

  if (period && period.includes(" ")) {
    const [year, half] = period.split(" ");
    if (half === "H1")
      return `${year}년 상반기, 글로벌 경제와 산업의 주요 변화를 주목해보게!`;
    if (half === "H2")
      return `${year}년 하반기, 하반기 시장의 주요 이슈와 트렌드를 살펴보게!`;
    if (year === "2023")
      return "2023년, 글로벌 경제가 점차 안정을 찾아가고 있네.";
    if (year === "2022")
      return "2022년, 인플레이션과 금리 인상 이슈로 시장이 조정받고 있네.";
    if (year === "2021")
      return "2021년, 경기 회복과 성장주에 대한 기대가 높아졌지.";
    if (year === "2020") return "2020년대 초반, 시장이 큰 변동성을 겪고 있네.";
  }
  if (period && period.length >= 4) {
    const year = period.slice(0, 4);
    if (year === "2023")
      return "2023년, 글로벌 경제가 점차 안정을 찾아가고 있네.";
    if (year === "2022")
      return "2022년, 인플레이션과 금리 인상 이슈로 시장이 조정받고 있네.";
    if (year === "2021")
      return "2021년, 경기 회복과 성장주에 대한 기대가 높아졌지.";
    if (year === "2020") return "2020년대 초반, 시장이 큰 변동성을 겪고 있네.";
  }
  return "현재 시점의 시장 동향을 잘 살펴 투자 전략을 세워보게!";
}

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  // 모달 상태 추가
  const [selectedNews, setSelectedNews] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const navigate = useNavigate(); // 추가
  const { user } = useAuth();
  const { addGuideMessage } = useContext(GuideMessageContext);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 news-page">
      <BannerHeader title="시장 뉴스" className="mb-16" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className={`card news-card transition-all duration-200 ${getImpactColor(
              item.impact_type
            )}`}
          >
            <div className="flex items-start justify-between mb-4">
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

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                {item.affected_sectors && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {item.affected_sectors}
                  </span>
                )}
              </div>
              
            </div>
          </div>
        ))}
      </div>

      {/* next 버튼 */}
      <button
        className="mt-12 bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-normal py-4 px-12 rounded-full text-xl shadow-lg transition-all duration-200 border-4 border-[#e6d3a3] mx-auto block"
        onClick={() => navigate("/select-sector")}
      >
        투자 하러가기
      </button>

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
              <span className="inline-block bg-blue-100 text-blue-700 text-base font-bold rounded-full px-3 py-1 mr-3 align-middle">
                {selectedNews.period}
              </span>
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
