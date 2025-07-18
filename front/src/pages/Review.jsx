import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import BannerHeader from "../components/BannerHeader";
import RoundReview from "../components/RoundReview";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import toast from "react-hot-toast";

const Review = () => {
  const { user } = useAuth();

  // 사용자의 현재 라운드에 따른 기간 계산
  const getCurrentPeriods = () => {
    if (!user || !user.round_periods) {
      return ["2020 H1"]; // 기본값
    }

    const roundPeriods = JSON.parse(user.round_periods);
    const currentRoundIndex = user.current_round_idx || 0;

    // 현재 라운드까지의 기간들만 반환
    return roundPeriods.slice(0, currentRoundIndex + 1);
  };

  const availablePeriods = getCurrentPeriods();
  const currentPeriod = user?.round_periods
    ? JSON.parse(user.round_periods)[user.current_round_idx || 0]
    : "2020 H1";

  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [stockPerformanceData, setStockPerformanceData] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetailModal, setStockDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 사용자 정보가 업데이트되면 선택된 기간도 업데이트
  useEffect(() => {
    if (user?.round_periods) {
      const periods = JSON.parse(user.round_periods);
      const current = periods[user.current_round_idx || 0];
      setSelectedPeriod(current);
    }
  }, [user]);

  useEffect(() => {
    fetchStockPerformance();
  }, [selectedPeriod]);

  const fetchStockPerformance = async () => {
    setLoading(true);
    try {
      // 선택된 기간의 주식 수익률 데이터 가져오기
      const response = await axios.get(
        `/api/stocks/performance/${encodeURIComponent(selectedPeriod)}`
      );
      setStockPerformanceData(response.data);
    } catch (error) {
      console.error("Failed to fetch stock performance:", error);
      toast.error("주식 수익률 데이터를 불러오는데 실패했습니다.");
      // 더미 데이터로 대체
      setStockPerformanceData(generateDummyData());
    } finally {
      setLoading(false);
    }
  };

  // 더미 데이터 생성 (백엔드 API 준비 전까지 사용)
  const generateDummyData = () => {
    const stocks = [
      "삼성전자",
      "SK하이닉스",
      "NAVER",
      "카카오",
      "삼성바이오로직스",
      "셀트리온",
      "LG화학",
      "삼성SDI",
      "POSCO",
      "KB금융",
      "하나금융",
      "신한지주",
      "LG생활건강",
      "아모레퍼시픽",
      "CJ대한통운",
    ];

    return stocks.map((stock) => ({
      name: stock,
      return: (Math.random() - 0.5) * 150, // -75% ~ +75% 랜덤
      symbol: stock.replace(/[^ㄱ-ㅎ가-힣a-zA-Z0-9]/g, ""),
      sector: getSectorByStock(stock),
    }));
  };

  const getSectorByStock = (stockName) => {
    const sectorMap = {
      삼성전자: "반도체",
      SK하이닉스: "반도체",
      NAVER: "IT서비스",
      카카오: "IT서비스",
      삼성바이오로직스: "바이오",
      셀트리온: "바이오",
      LG화학: "화학",
      삼성SDI: "배터리",
      POSCO: "철강",
      KB금융: "금융",
      하나금융: "금융",
      신한지주: "금융",
      LG생활건강: "생활용품",
      아모레퍼시픽: "화장품",
      CJ대한통운: "물류",
    };
    return sectorMap[stockName] || "기타";
  };

  // 수익률에 따른 색상 결정
  const getBarColor = (value) => {
    if (value > 50) return "#22c55e"; // 초록 (높은 상승)
    if (value > 20) return "#84cc16"; // 연두 (중간 상승)
    if (value > 0) return "#eab308"; // 노랑 (낮은 상승)
    if (value > -20) return "#f97316"; // 주황 (낮은 하락)
    if (value > -50) return "#ef4444"; // 빨강 (중간 하락)
    return "#dc2626"; // 진빨강 (높은 하락)
  };

  // 차트 클릭 핸들러
  const handleBarClick = (data) => {
    setSelectedStock(data);
    setStockDetailModal(true);
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-gray-600">섹터: {data.sector}</p>
          <p
            className={`font-bold ${
              data.return >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            수익률: {data.return.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <BannerHeader title="라운드 리뷰" />

      <div className="flex-1 p-6 overflow-auto">
        {/* 현재 라운드 정보 및 기간 선택기 */}
        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">
                현재 진행 상황
              </h3>
              <p className="text-blue-600">
                라운드 {(user?.current_round_idx || 0) + 1} / 3 진행 중
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-blue-600">현재 기간</span>
              <p className="text-lg font-bold text-blue-800">{currentPeriod}</p>
            </div>
          </div>

          {availablePeriods.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
                다른 기간 분석 보기
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-48 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {availablePeriods.map((period) => (
                  <option key={period} value={period}>
                    {period} {period === currentPeriod ? "(현재)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availablePeriods.length === 1 && (
            <p className="text-sm text-blue-600">
              💡 더 많은 라운드를 진행하면 이전 기간들도 분석할 수 있습니다!
            </p>
          )}
        </div>

        {/* 주식 수익률 차트 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {selectedPeriod} 종목별 가격 변화율
            </h2>
            {selectedPeriod === currentPeriod && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                현재 라운드
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={stockPerformanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis
                    label={{
                      value: "가격 변화율 (%)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="return"
                    onClick={handleBarClick}
                    cursor="pointer"
                  >
                    {stockPerformanceData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getBarColor(entry.return)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 text-center">
                <p className="text-sm text-gray-600">
                  * 막대를 클릭하면 해당 종목의 상세 정보를 확인할 수 있습니다.
                </p>
                {selectedPeriod !== currentPeriod && (
                  <p className="text-sm text-blue-600 mt-1">
                    📊 과거 라운드 데이터입니다. 투자 전략 수립에 참고하세요!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 라운드 리뷰 버튼 */}
        <div className="mb-6">
          <button
            onClick={() => setShowReview(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {selectedPeriod} 라운드 상세 리뷰 보기
          </button>
        </div>
      </div>

      {/* 라운드 리뷰 모달 */}
      {showReview && (
        <RoundReview
          period={selectedPeriod}
          onClose={() => setShowReview(false)}
        />
      )}

      {/* 종목 상세 모달 */}
      {stockDetailModal && selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          period={selectedPeriod}
          onClose={() => setStockDetailModal(false)}
        />
      )}
    </div>
  );
};

// 종목 상세 모달 컴포넌트
const StockDetailModal = ({ stock, period, onClose }) => {
  const [stockNews, setStockNews] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockDetail();
  }, [stock, period]);

  const fetchStockDetail = async () => {
    try {
      // 종목 뉴스와 가격 히스토리 가져오기
      const [newsResponse, priceResponse] = await Promise.all([
        axios.get(
          `/api/news/stock/${stock.symbol}?period=${encodeURIComponent(period)}`
        ),
        axios.get(
          `/api/stocks/${
            stock.symbol
          }/price-history?period=${encodeURIComponent(period)}`
        ),
      ]);

      setStockNews(newsResponse.data);
      setPriceHistory(priceResponse.data);
    } catch (error) {
      console.error("Failed to fetch stock detail:", error);
      // 더미 데이터
      setStockNews([
        {
          title: `${stock.name} 관련 주요 뉴스 1`,
          date: "2024-01-15",
          summary: "긍정적인 실적 발표",
        },
        {
          title: `${stock.name} 관련 주요 뉴스 2`,
          date: "2024-01-20",
          summary: "신제품 출시 소식",
        },
      ]);
      setPriceHistory(generateDummyPriceHistory());
    } finally {
      setLoading(false);
    }
  };

  const generateDummyPriceHistory = () => {
    // 더미 가격 히스토리 생성
    const dates = [];
    const prices = [];
    const basePrice = 50000;

    for (let i = 0; i < 30; i++) {
      const date = new Date(2024, 0, i + 1);
      dates.push(date.toISOString().split("T")[0]);

      const randomChange = (Math.random() - 0.5) * 0.1;
      const price = i === 0 ? basePrice : prices[i - 1] * (1 + randomChange);
      prices.push(Math.round(price));
    }

    return dates.map((date, index) => ({
      date,
      price: prices[index],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {stock.name} ({period})
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-600">섹터</span>
                <p className="font-semibold">{stock.sector}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">기간 수익률</span>
                <p
                  className={`font-bold text-lg ${
                    stock.return >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stock.return.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* 관련 뉴스 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">관련 뉴스</h3>
              <div className="space-y-2">
                {stockNews.length > 0 ? (
                  stockNews.map((news, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded"
                    >
                      <h4 className="font-medium">{news.title}</h4>
                      <p className="text-sm text-gray-600">{news.date}</p>
                      <p className="text-sm mt-1">{news.summary}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">
                    해당 기간의 관련 뉴스가 없습니다.
                  </p>
                )}
              </div>
            </div>

            {/* 향후 개선: 가격 차트 추가 가능 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">가격 동향</h3>
              <p className="text-gray-600">
                * 가격 차트 기능은 향후 추가될 예정입니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Review;
