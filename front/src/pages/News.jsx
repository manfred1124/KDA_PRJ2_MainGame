import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  // 모달 상태 추가
  const [selectedNews, setSelectedNews] = useState(null);

  // ESC 키로 모달 닫기
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      setSelectedNews(null);
    }
  }, []);

  useEffect(() => {
    if (selectedNews) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedNews, handleKeyDown]);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await axios.get("/api/news");
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
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📰 시장 뉴스</h1>
        <p className="text-gray-600">
          최신 경제 뉴스와 시장 동향을 확인하세요!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.map((item) => (
          <div
            key={item.id}
            className={`card news-card cursor-pointer transition-all duration-200 ${getImpactColor(
              item.impact_type
            )} hover:shadow-xl hover:bg-blue-50 hover:scale-[1.02]`}
            onClick={() => setSelectedNews(item)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold rounded-full px-2 py-0.5 mr-2 align-middle">
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
              <div>라운드 {item.round_number}</div>
            </div>
          </div>
        ))}
      </div>

      {/* next 버튼 */}
      <button
        className="fixed bottom-10 right-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-16 rounded-full text-xl shadow-lg transition-all duration-200 z-50"
        onClick={() => {
          window.location.href = "/select-sector";
        }}
        style={{ minWidth: "200px" }}
      >
        주식 하러가기
      </button>

      {/* 뉴스 상세 모달 (닫기 기능은 아직 없음) */}
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
            <h2 className="text-3xl font-bold mb-8 text-gray-900">
              <span className="inline-block bg-blue-100 text-blue-700 text-base font-bold rounded-full px-3 py-1 mr-3 align-middle">
                {selectedNews.period}
              </span>
              {selectedNews.title}
            </h2>
            <p className="text-gray-700 mb-8 text-lg">{selectedNews.content}</p>
            <div className="text-gray-600 mb-8 text-base whitespace-pre-line">
              {selectedNews.summary || selectedNews.content}
            </div>
            {selectedNews.affected_sectors && (
              <div className="mb-4">
                <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-base">
                  {selectedNews.affected_sectors}
                </span>
              </div>
            )}
            <div className="text-md text-gray-500">
              라운드 {selectedNews.round_number}
            </div>
          </div>
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
  );
};

export default News;
