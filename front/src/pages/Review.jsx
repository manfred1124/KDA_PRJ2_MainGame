import React, { useState, useEffect, useRef } from "react";
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
  LineChart,
  Line,
  ComposedChart,
  ReferenceLine,
  Area,
  AreaChart,
  Customized,
} from "recharts";
import toast from "react-hot-toast";

// TradingView Lightweight Charts import
import { createChart, ColorType } from "lightweight-charts";

// v4.x에서는 SeriesType import가 필요 없음 - 메서드로 직접 생성

// 기간 형식 변환 함수
const formatPeriod = (period) => {
  if (!period) return period;
  const [year, half] = period.split(" ");
  if (half === "H1") {
    return `${year}년 상반기`;
  } else if (half === "H2") {
    return `${year}년 하반기`;
  }
  return period;
};

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

  // 고정된 더미 데이터 (일관된 값)
  const generateDummyData = () => {
    const fixedStockData = [
      { name: "삼성전자", symbol: "005930", sector: "반도체", return: 15.8 },
      { name: "SK하이닉스", symbol: "000660", sector: "반도체", return: -8.2 },
      { name: "NAVER", symbol: "035420", sector: "IT서비스", return: 45.3 },
      { name: "카카오", symbol: "035720", sector: "IT서비스", return: 12.7 },
      {
        name: "삼성바이오로직스",
        symbol: "207940",
        sector: "바이오",
        return: 35.2,
      },
      { name: "셀트리온", symbol: "068270", sector: "바이오", return: 22.1 },
      { name: "LG화학", symbol: "051910", sector: "화학", return: -5.4 },
      { name: "삼성SDI", symbol: "006400", sector: "배터리", return: 18.9 },
      { name: "POSCO", symbol: "005490", sector: "철강", return: 8.5 },
      { name: "KB금융", symbol: "105560", sector: "금융", return: -12.3 },
      { name: "하나금융", symbol: "086790", sector: "금융", return: -10.7 },
      { name: "신한지주", symbol: "055550", sector: "금융", return: -9.2 },
      {
        name: "LG생활건강",
        symbol: "051900",
        sector: "생활용품",
        return: 25.6,
      },
      {
        name: "아모레퍼시픽",
        symbol: "090430",
        sector: "화장품",
        return: -15.8,
      },
      { name: "CJ대한통운", symbol: "000120", sector: "물류", return: 7.3 },
    ];

    return fixedStockData;
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
              <p className="text-lg font-bold text-blue-800">
                {formatPeriod(currentPeriod)}
              </p>
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
                    {formatPeriod(period)}{" "}
                    {period === currentPeriod ? "(현재)" : ""}
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
              {formatPeriod(selectedPeriod)} 종목별 가격 변화율
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

  // 2년치 데이터 기간 계산 함수 (실제 데이터 범위 고려)
  const calculateExtendedPeriod = (currentPeriod) => {
    const [year, half] = currentPeriod.split(" ");
    const currentYear = parseInt(year);
    const isFirstHalf = half === "H1";

    // 현재 기간의 끝 날짜 계산
    const endMonth = isFirstHalf ? 6 : 12;
    const endYear = currentYear;

    // 시작 날짜 계산 (2019년 이후로 제한, 최대 2년치)
    let startYear = Math.max(currentYear - 2, 2019);
    let startMonth = isFirstHalf ? 6 : 12;

    // 만약 시작년도가 2019년이면 1월부터 시작
    if (startYear === 2019) {
      startMonth = 1;
    }

    // YYYY-MM-DD 형식으로 반환
    const startDate = `${startYear}-${startMonth
      .toString()
      .padStart(2, "0")}-01`;
    const endDate = `${endYear}-${endMonth.toString().padStart(2, "0")}-30`;

    console.log(
      `Period calculation: ${currentPeriod} -> ${startDate} to ${endDate}`
    );
    return { startDate, endDate };
  };

  const fetchStockDetail = async () => {
    try {
      console.log(`Fetching data for ${stock.symbol} in period ${period}`);

      // 2년치 데이터 기간 계산
      const { startDate, endDate } = calculateExtendedPeriod(period);
      console.log(`Extended period: ${startDate} to ${endDate}`);

      // 실제 API 호출 URL 로그
      const apiUrl = `/api/stocks/${stock.symbol}/price-history?start_date=${startDate}&end_date=${endDate}`;
      console.log(`Calling API: ${apiUrl}`);

      // 뉴스는 현재 period만, 가격 데이터는 2년치 가져오기
      const [newsResponse, priceResponse] = await Promise.all([
        axios.get(
          `/api/news/stock/${stock.symbol}?period=${encodeURIComponent(period)}`
        ),
        axios.get(
          `/api/stocks/${stock.symbol}/price-history?start_date=${startDate}&end_date=${endDate}`
        ),
      ]);

      console.log("News response:", newsResponse.data);
      console.log("Price response:", priceResponse.data);

      // 뉴스 데이터 처리
      const newsData = Array.isArray(newsResponse.data)
        ? newsResponse.data
        : [];
      const processedNews = newsData.map((news) => {
        // 날짜 처리 개선
        let displayDate = new Date().toLocaleDateString();
        if (news.date) {
          try {
            const newsDate = new Date(news.date);
            if (!isNaN(newsDate.getTime())) {
              displayDate = newsDate.toLocaleDateString();
            }
          } catch (e) {
            console.warn("Invalid date format:", news.date);
          }
        }

        return {
          title: news.title || `${stock.name} 관련 뉴스`,
          date: displayDate,
          summary: news.summary || "상세 내용이 없습니다.",
          sentiment: news.sentiment || "neutral",
        };
      });

      // 가격 데이터 처리
      const priceData = Array.isArray(priceResponse.data)
        ? priceResponse.data
        : [];
      const processedPrices = priceData.map((item) => {
        const price =
          typeof item.price === "number"
            ? item.price
            : parseFloat(item.price) || 0;
        return {
          date: item.date,
          price: price,
          open:
            typeof item.open === "number"
              ? item.open
              : parseFloat(item.open) || price,
          high:
            typeof item.high === "number"
              ? item.high
              : parseFloat(item.high) || price,
          low:
            typeof item.low === "number"
              ? item.low
              : parseFloat(item.low) || price,
          volume:
            typeof item.volume === "number"
              ? item.volume
              : parseInt(item.volume) || 0,
        };
      });

      setStockNews(processedNews);

      // 실제 DB 데이터 우선 사용
      if (processedPrices.length > 0) {
        setPriceHistory(processedPrices);
      } else {
        // 실제 데이터가 없을 때는 빈 배열로 설정
        setPriceHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch stock detail:", error);

      // API 호출이 실패했을 때는 빈 데이터로 설정
      setStockNews([]);
      setPriceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] shadow-2xl flex flex-col">
        {/* 고정 헤더 */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            {stock.name} ({formatPeriod(period)})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
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

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
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
                    {stock.return >= 0 ? "+" : ""}
                    {stock.return.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">분석 기간</span>
                  <p className="font-semibold">{formatPeriod(period)}</p>
                </div>
              </div>

              {/* 관련 뉴스 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">관련 뉴스</h3>
                <div className="space-y-2 md:space-y-3 max-h-60 md:max-h-80 overflow-y-auto">
                  {stockNews.length > 0 ? (
                    stockNews.map((news, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg transition-colors hover:shadow-md ${
                          news.sentiment === "positive"
                            ? "border-green-200 bg-green-50 hover:bg-green-100"
                            : news.sentiment === "negative"
                            ? "border-red-200 bg-red-50 hover:bg-red-100"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {news.title}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {news.date}
                            </p>
                            <p className="text-sm text-gray-700">
                              {news.summary}
                            </p>
                          </div>
                          <div className="ml-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                news.sentiment === "positive"
                                  ? "bg-green-100 text-green-800"
                                  : news.sentiment === "negative"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {news.sentiment === "positive"
                                ? "긍정적"
                                : news.sentiment === "negative"
                                ? "부정적"
                                : "중립"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">
                        해당 기간의 관련 뉴스가 없습니다.
                      </p>
                      <p className="text-sm text-gray-400">
                        뉴스 데이터가 업데이트되면 여기에 표시됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 가격 차트 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  실제 주가 동향 (OHLC 차트)
                </h3>
                <div className="mb-3 text-xs text-gray-600 flex flex-wrap gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-red-600"></div>
                    <span>상승</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-blue-600"></div>
                    <span>하락</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-3 bg-gray-600"></div>
                    <span>고가-저가</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 bg-gray-400"></div>
                    <span>거래량</span>
                  </div>
                </div>
                <CandlestickChart data={priceHistory} stock={stock} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// TradingView v4.x 캔들스틱 차트 (검증된 버전) - 통합 차트
const CandlestickChart = ({ data, stock }) => {
  const chartContainerRef = useRef();
  const chart = useRef();
  const candlestickSeries = useRef();
  const volumeSeries = useRef();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      // 통합 차트 생성
      chart.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#ffffff" },
          textColor: "#333",
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
        grid: {
          vertLines: { color: "#f0f0f0" },
          horzLines: { color: "#f0f0f0" },
        },
        crosshair: {
          mode: 1, // Normal crosshair
        },
        rightPriceScale: {
          borderColor: "#cccccc",
        },
        timeScale: {
          borderColor: "#cccccc",
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // v4.x 캔들스틱 시리즈 추가 (주가)
      candlestickSeries.current = chart.current.addCandlestickSeries({
        upColor: "#dc2626", // 빨강 (상승)
        downColor: "#2563eb", // 파랑 (하락)
        borderVisible: false,
        wickUpColor: "#dc2626",
        wickDownColor: "#2563eb",
      });

      // 거래량 히스토그램 시리즈 추가 (하단 영역)
      volumeSeries.current = chart.current.addHistogramSeries({
        color: "#a3a3a3",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "volume", // 별도 가격 스케일 사용
      });

      // 거래량용 별도 가격 스케일 설정 (하단 20% 영역)
      chart.current.priceScale("volume").applyOptions({
        scaleMargins: {
          top: 0.8, // 거래량을 차트 하단 20%에 표시
          bottom: 0,
        },
      });
    } catch (error) {
      console.error("❌ 차트 생성 에러:", error);
    }

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chart.current && chartContainerRef.current) {
        chart.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chart.current) {
        chart.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!candlestickSeries.current || !volumeSeries.current) return;

    let candleData = [];
    let volumeData = [];

    // 실제 DB 데이터 변환
    if (data && Array.isArray(data) && data.length > 0) {
      data.forEach((item) => {
        // v4.x에서는 날짜를 YYYY-MM-DD 문자열로 사용
        const dateStr = item.date;

        const candlePoint = {
          time: dateStr,
          open: parseFloat(item.open) || parseFloat(item.price) || 50000,
          high: parseFloat(item.high) || parseFloat(item.price) || 55000,
          low: parseFloat(item.low) || parseFloat(item.price) || 45000,
          close: parseFloat(item.close || item.price) || 50000,
        };

        // 데이터 검증 및 보정
        if (candlePoint.high < Math.max(candlePoint.open, candlePoint.close)) {
          candlePoint.high =
            Math.max(candlePoint.open, candlePoint.close) * 1.01;
        }
        if (candlePoint.low > Math.min(candlePoint.open, candlePoint.close)) {
          candlePoint.low =
            Math.min(candlePoint.open, candlePoint.close) * 0.99;
        }

        candleData.push(candlePoint);
        volumeData.push({
          time: dateStr,
          value: parseInt(item.volume) || 1000000,
          color:
            candlePoint.close >= candlePoint.open ? "#dc262620" : "#2563eb20",
        });
      });

      candleData.sort((a, b) => new Date(a.time) - new Date(b.time));
      volumeData.sort((a, b) => new Date(a.time) - new Date(b.time));
    } else {
      // 실제 데이터가 없을 때는 빈 차트 표시
      console.warn("No price data available for this stock and period");
    }

    try {
      // 데이터 설정
      candlestickSeries.current.setData(candleData);
      volumeSeries.current.setData(volumeData);

      // 차트 뷰 자동 조정
      chart.current.timeScale().fitContent();
    } catch (dataError) {
      console.error("❌ 데이터 설정 에러:", dataError);
    }
  }, [data]);

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg">
      <div
        ref={chartContainerRef}
        className="w-full border border-gray-200 rounded"
        style={{ height: "500px" }}
      />
    </div>
  );
};

export default Review;
