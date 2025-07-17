import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const RoundReview = ({ period, onClose }) => {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("final"); // 'final', 'macro', 'sector', 'stocks'
  const { user } = useAuth();

  useEffect(() => {
    fetchReview();
  }, [period]);

  const fetchReview = async () => {
    try {
      // 리뷰가 없으면 생성 시도
      await axios.post("/api/game/round-review");

      // 리뷰 조회
      const response = await axios.get(
        `/api/game/round-review/by-period/${encodeURIComponent(period)}`
      );
      setReview(response.data);
    } catch (error) {
      toast.error("라운드 리뷰를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full">
          <h2 className="text-2xl font-bold mb-4">리뷰를 찾을 수 없습니다</h2>
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {review.period} 라운드 리뷰
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex space-x-2 mb-6">
          <button
            className={`px-4 py-2 rounded ${
              selectedSection === "final"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedSection("final")}
          >
            종합 리뷰
          </button>
          <button
            className={`px-4 py-2 rounded ${
              selectedSection === "macro"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedSection("macro")}
          >
            거시경제
          </button>
          <button
            className={`px-4 py-2 rounded ${
              selectedSection === "sector"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedSection("sector")}
          >
            섹터별
          </button>
          <button
            className={`px-4 py-2 rounded ${
              selectedSection === "stocks"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setSelectedSection("stocks")}
          >
            주목할 종목
          </button>
        </div>

        {/* 리뷰 내용 */}
        <div className="prose max-w-none">
          {selectedSection === "final" && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">종합 시장 분석</h3>
              <p className="whitespace-pre-line">{review.final_review}</p>
            </div>
          )}

          {selectedSection === "macro" && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">거시경제 동향</h3>
              <p className="whitespace-pre-line">{review.macro_review}</p>
            </div>
          )}

          {selectedSection === "sector" && (
            <div className="space-y-6">
              {Object.entries(review.sector_reviews).map(([sector, review]) => (
                <div key={sector} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-4">{sector} 섹터</h3>
                  <p className="whitespace-pre-line">{review}</p>
                </div>
              ))}
            </div>
          )}

          {selectedSection === "stocks" && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">주목할 만한 종목들</h3>
              <p className="whitespace-pre-line">{review.stocks_review}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundReview;
