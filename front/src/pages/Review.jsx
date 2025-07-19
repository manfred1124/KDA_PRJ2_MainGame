import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  // 사용자의 현재 라운드에 따른 기간 계산
  const getCurrentPeriods = () => {
    if (!user || !user.round_periods) {
      return ["2020 H1"]; // 기본값
    }

    const roundPeriods = user.round_periods; // 이미 배열로 받아옴
    const currentRoundIndex = user.current_round_idx || 0;

    // 현재 라운드까지의 기간들만 반환
    return roundPeriods.slice(0, currentRoundIndex + 1);
  };

  const availablePeriods = getCurrentPeriods();
  const currentPeriod = user?.round_periods
    ? user.round_periods[user.current_round_idx || 0]
    : "2020 H1";

  console.log("User round periods:", user?.round_periods);
  console.log("Current round index:", user?.current_round_idx);
  console.log("Calculated current period:", currentPeriod);

  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  const [stockPerformanceData, setStockPerformanceData] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockDetailModal, setStockDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tradingHistory, setTradingHistory] = useState([]); // 거래 기록

  // 사용자 정보가 업데이트되면 선택된 기간도 업데이트
  useEffect(() => {
    if (user?.round_periods) {
      const current = user.round_periods[user.current_round_idx || 0];
      setSelectedPeriod(current);
    }
  }, [user]);

  useEffect(() => {
    fetchStockPerformance();
    fetchTradingHistory();
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

  const fetchTradingHistory = async () => {
    try {
      console.log("Fetching trading history...");
      const response = await axios.get("/api/portfolio/transactions");
      console.log("All transactions:", response.data);

      // 선택된 기간에 해당하는 거래만 필터링
      const filteredHistory = response.data.filter(
        (tx) => tx.period === selectedPeriod
      );
      console.log(
        `Filtered transactions for period ${selectedPeriod}:`,
        filteredHistory
      );
      setTradingHistory(filteredHistory);
    } catch (error) {
      console.error("Failed to fetch trading history:", error);
      toast.error("거래 기록을 불러오는데 실패했습니다.");
      setTradingHistory([]);
    }
  };

  // 라운드 진행 함수
  const handleNextRound = async () => {
    try {
      const response = await axios.post("/api/game/next-round");
      console.log("다음 라운드 응답:", response.data);
      toast.success("다음 라운드로 진행되었습니다!");

      // 사용자 정보 업데이트 이벤트 발생
      window.dispatchEvent(
        new CustomEvent("userUpdated", {
          detail: {
            ...user,
            current_round_idx: response.data.new_round_idx,
            current_period: response.data.current_period,
          },
        })
      );

      // 다음 라운드로 이동
      navigate("/news");
    } catch (error) {
      console.error("라운드 진행 실패:", error);

      // 마지막 라운드인 경우 게임 결과 페이지로 이동
      if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("마지막 라운드")
      ) {
        toast.success("게임이 완료되었습니다! 결과를 확인해보세요.");
        navigate("/game-result");
        return;
      }

      toast.error("라운드 진행에 실패했습니다.");
    }
  };

  // 최종 결과 확인 함수
  const handleShowFinalResult = () => {
    navigate("/game-result");
  };

  // 종목 상세 모달 클릭 핸들러
  const handleStockDetailClick = (tx) => {
    setSelectedStock(tx);
    setStockDetailModal(true);
  };

  // 현재 라운드가 마지막 라운드인지 확인
  const isLastRound = (user?.current_round_idx ?? 0) >= 2; // 3라운드(인덱스 2)가 마지막

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
        <div className="bg-gradient-to-br from-[#f7e6b6] to-[#f3e7c4] p-4 border-2 border-[#e6d3a3] rounded-lg shadow-lg">
          <p
            className="font-bold text-[#7c5c2b]"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            {label}
          </p>
          <p
            className="text-sm text-[#a67c3c]"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            섹터: {data.sector}
          </p>
          <p
            className={`font-bold ${
              data.return >= 0 ? "text-[#3b7c2b]" : "text-[#a63c2b]"
            }`}
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            수익률: {data.return.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ fontFamily: "Jua, sans-serif" }}
    >
      <div className="flex-1 p-6 bg-gradient-to-br from-[#f9f6ef]/30 to-[#f3e7c4]/30">
        {/* 현재 라운드 정보 및 기간 선택기 */}
        <div className="mb-6 bg-gradient-to-br from-[#f7e6b6]/70 to-[#f3e7c4]/70 p-6 rounded-xl border-2 border-[#e6d3a3]/60 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="text-xl font-bold text-[#7c5c2b]"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                현재 진행 상황
              </h3>
              <p
                className="text-[#a67c3c]"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                라운드 {(user?.current_round_idx || 0) + 1} / 3 진행 중
              </p>
            </div>
            <div className="text-right">
              <span
                className="text-sm text-[#a67c3c]"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                현재 기간
              </span>
              <p
                className="text-lg font-bold text-[#7c5c2b]"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                {formatPeriod(currentPeriod)}
              </p>
            </div>
          </div>

          {availablePeriods.length > 1 && (
            <div>
              <label
                className="block text-sm font-medium text-[#7c5c2b] mb-2"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                다른 기간 분석 보기
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-48 px-3 py-2 border-2 border-[#e6d3a3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bfa76a] bg-white text-[#7c5c2b]"
                style={{ fontFamily: "Jua, sans-serif" }}
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
        </div>

        {/* 라운드 상세 리뷰 섹션 */}
        <div className="mb-6 bg-gradient-to-br from-[#f7e6b6] to-[#f3e7c4] p-6 rounded-xl border-2 border-[#e6d3a3] shadow-lg">
          <h3
            className="text-xl font-bold text-[#7c5c2b] mb-4"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            {formatPeriod(selectedPeriod)} 라운드 상세 리뷰
          </h3>

          {/* 종합 설명 */}
          <div className="mb-6 p-4 bg-gradient-to-br from-[#f9f6ef] to-[#f3e7c4] rounded-lg border border-[#e6d3a3]">
            <h4
              className="text-lg font-bold text-[#7c5c2b] mb-3"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              📊 투자 활동 요약
            </h4>
            {tradingHistory.length > 0 ? (
              <div className="space-y-2">
                <p
                  className="text-[#7c5c2b]"
                  style={{ fontFamily: "Jua, sans-serif" }}
                >
                  이번 라운드에서 총{" "}
                  <span className="font-bold text-[#a67c3c]">
                    {tradingHistory.length}건
                  </span>
                  의 거래를 진행하셨습니다.
                </p>
                <p
                  className="text-[#7c5c2b]"
                  style={{ fontFamily: "Jua, sans-serif" }}
                >
                  구매:{" "}
                  <span className="font-bold text-[#3b7c2b]">
                    {
                      tradingHistory.filter(
                        (tx) => tx.transaction_type === "buy"
                      ).length
                    }
                    건
                  </span>{" "}
                  | 판매:{" "}
                  <span className="font-bold text-[#a63c2b]">
                    {
                      tradingHistory.filter(
                        (tx) => tx.transaction_type === "sell"
                      ).length
                    }
                    건
                  </span>
                </p>
                {tradingHistory.filter((tx) => tx.transaction_type === "buy")
                  .length > 0 && (
                  <p
                    className="text-sm text-[#a67c3c]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    주요 투자 종목들의 실제 성과를 아래 버튼을 통해 자세히
                    확인해보세요.
                  </p>
                )}
              </div>
            ) : (
              <p
                className="text-[#a67c3c]"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                이번 라운드에서는 거래 기록이 없습니다. 다음 라운드에서는
                적극적인 투자를 시도해보세요!
              </p>
            )}
          </div>

          {/* 거래한 종목 버튼들 */}
          {tradingHistory.length > 0 && (
            <div>
              <h4
                className="text-lg font-bold text-[#7c5c2b] mb-3"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                💼 거래한 종목 상세 분석
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {/* 중복 제거된 종목들만 표시 */}
                {[
                  ...new Map(
                    tradingHistory.map((tx) => [tx.stock_id, tx])
                  ).values(),
                ].map((tx) => (
                  <button
                    key={tx.stock_id}
                    onClick={() => handleStockDetailClick(tx)}
                    className="bg-gradient-to-r from-[#bfa76a] to-[#a67c3c] hover:from-[#a67c3c] hover:to-[#7c5c2b] text-white px-4 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border border-[#e6d3a3]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    <div className="text-sm font-bold">{tx.stock_name}</div>
                    <div className="text-xs opacity-90">
                      ({tx.stock_symbol})
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 주식 수익률 차트 */}
        <div className="mb-8">
          {/* 매매한 종목 버튼들 */}
          <div className="mb-6">
            <h3
              className="text-lg font-bold text-[#7c5c2b] mb-3"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              💼 내가 매매한 종목
            </h3>

            {/* 디버깅 정보 */}
            <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
              <p>현재 사용자 ID: {user?.id}</p>
              <p>현재 사용자명: {user?.username}</p>
              <p>현재 라운드 인덱스: {user?.current_round_idx}</p>
              <p>전체 거래 기록 수: {tradingHistory.length}</p>
              <p>선택된 기간: {selectedPeriod}</p>
              {tradingHistory.length > 0 && (
                <p>
                  거래 기록:{" "}
                  {tradingHistory
                    .map((tx) => `${tx.stock_name}(${tx.transaction_type})`)
                    .join(", ")}
                </p>
              )}
            </div>

            {tradingHistory.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {[
                  ...new Map(
                    tradingHistory.map((tx) => [tx.stock_id, tx])
                  ).values(),
                ].map((tx) => (
                  <button
                    key={tx.stock_id}
                    onClick={() => handleStockDetailClick(tx)}
                    className="bg-gradient-to-r from-[#bfa76a] to-[#a67c3c] hover:from-[#a67c3c] hover:to-[#7c5c2b] text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border border-[#e6d3a3] text-sm font-bold"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    {tx.stock_name} ({tx.stock_symbol})
                  </button>
                ))}
              </div>
            ) : (
              <p
                className="text-[#a67c3c] text-sm"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                이 기간에 매매한 종목이 없습니다.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-2xl font-bold text-[#7c5c2b]"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              {formatPeriod(selectedPeriod)} 종목별 가격 변화율
            </h2>
            {selectedPeriod === currentPeriod && (
              <span className="bg-gradient-to-r from-[#bfa76a] to-[#a67c3c] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                현재 라운드
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-96 bg-gradient-to-br from-[#f7e6b6] to-[#f3e7c4] rounded-xl border-2 border-[#e6d3a3]">
              <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-[#bfa76a]"></div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#f7e6b6] to-[#f3e7c4] p-6 rounded-xl shadow-lg border-2 border-[#e6d3a3]">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={stockPerformanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6d3a3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                    fill="#7c5c2b"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  />
                  <YAxis
                    label={{
                      value: "가격 변화율 (%)",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        textAnchor: "middle",
                        fill: "#7c5c2b",
                        fontFamily: "Jua, sans-serif",
                      },
                    }}
                    fill="#7c5c2b"
                    style={{ fontFamily: "Jua, sans-serif" }}
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
              <div className="mt-4 text-center">
                <p
                  className="text-sm text-[#7c5c2b]"
                  style={{ fontFamily: "Jua, sans-serif" }}
                >
                  * 막대를 클릭하면 해당 종목의 상세 정보를 확인할 수 있습니다.
                </p>
                {selectedPeriod !== currentPeriod && (
                  <p
                    className="text-sm text-[#a67c3c] mt-1"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    📊 과거 라운드 데이터입니다. 투자 전략 수립에 참고하세요!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 라운드 진행 버튼 */}
        <div className="mb-6 flex justify-center">
          {/* 라운드 진행 버튼 - 현재 라운드를 보고 있을 때만 표시 */}
          {selectedPeriod === currentPeriod &&
            (isLastRound ? (
              <button
                onClick={handleShowFinalResult}
                className="bg-gradient-to-r from-[#3b7c2b] to-[#2d5a21] hover:from-[#2d5a21] hover:to-[#1e3d16] text-white px-8 py-4 rounded-xl transition-all duration-300 font-bold text-lg shadow-lg border-2 border-[#4ade80]"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                🏆 최종 결과 확인하기
              </button>
            ) : (
              <button
                onClick={handleNextRound}
                className="bg-gradient-to-r from-[#3b7c2b] to-[#2d5a21] hover:from-[#2d5a21] hover:to-[#1e3d16] text-white px-8 py-4 rounded-xl transition-all duration-300 font-bold text-lg shadow-lg border-2 border-[#4ade80]"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                ➡️ 다음 라운드 진행하기
              </button>
            ))}
        </div>
      </div>

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

  // 거래 기록 데이터를 stock 형태로 변환
  const stockData = {
    name: stock.stock_name || stock.name,
    symbol: stock.stock_symbol || stock.symbol,
    sector: stock.sector || "정보 없음",
    return: 0, // 임시값, 실제 계산 필요
  };

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
      console.log(`Fetching data for ${stockData.symbol} in period ${period}`);

      // 2년치 데이터 기간 계산
      const { startDate, endDate } = calculateExtendedPeriod(period);
      console.log(`Extended period: ${startDate} to ${endDate}`);

      // 실제 API 호출 URL 로그
      const apiUrl = `/api/stocks/${stockData.symbol}/price-history?start_date=${startDate}&end_date=${endDate}`;
      console.log(`Calling API: ${apiUrl}`);

      // 뉴스는 현재 period만, 가격 데이터는 2년치 가져오기
      const [newsResponse, priceResponse] = await Promise.all([
        axios.get(
          `/api/news/stock/${stockData.symbol}?period=${encodeURIComponent(
            period
          )}`
        ),
        axios.get(
          `/api/stocks/${stockData.symbol}/price-history?start_date=${startDate}&end_date=${endDate}`
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
          title: news.title || `${stockData.name} 관련 뉴스`,
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
      <div className="bg-gradient-to-br from-[#f7e6b6] to-[#f3e7c4] rounded-xl max-w-6xl w-full max-h-[90vh] shadow-2xl flex flex-col border-2 border-[#e6d3a3]">
        {/* 고정 헤더 */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b-2 border-[#e6d3a3] flex-shrink-0">
          <h2
            className="text-xl md:text-2xl font-bold text-[#7c5c2b]"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            {stockData.name} ({formatPeriod(period)})
          </h2>
          <button
            onClick={onClose}
            className="text-[#a67c3c] hover:text-[#7c5c2b] p-2 rounded-lg hover:bg-[#e6d3a3] transition-colors"
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

        {/* 컨텐츠 영역 */}
        <div className="flex-1 p-4 md:p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#bfa76a]"></div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-br from-[#f9f6ef] to-[#f3e7c4] rounded-lg border border-[#e6d3a3]">
                <div>
                  <span
                    className="text-sm text-[#a67c3c]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    섹터
                  </span>
                  <p
                    className="font-semibold text-[#7c5c2b]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    {stockData.sector}
                  </p>
                </div>
                <div>
                  <span
                    className="text-sm text-[#a67c3c]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    거래 정보
                  </span>
                  <p
                    className="font-semibold text-[#7c5c2b]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    {stock.transaction_type === "buy" ? "구매" : "판매"}:{" "}
                    {stock.quantity}주
                  </p>
                </div>
                <div>
                  <span
                    className="text-sm text-[#a67c3c]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    분석 기간
                  </span>
                  <p
                    className="font-semibold text-[#7c5c2b]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    {formatPeriod(period)}
                  </p>
                </div>
              </div>

              {/* 관련 뉴스 */}
              <div>
                <h3
                  className="text-lg font-bold mb-3 text-[#7c5c2b]"
                  style={{ fontFamily: "Jua, sans-serif" }}
                >
                  관련 뉴스
                </h3>
                <div className="space-y-2 md:space-y-3">
                  {stockNews.length > 0 ? (
                    stockNews.map((news, index) => (
                      <div
                        key={index}
                        className={`p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-lg ${
                          news.sentiment === "positive"
                            ? "border-[#4ade80] bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] hover:from-[#dcfce7] hover:to-[#bbf7d0]"
                            : news.sentiment === "negative"
                            ? "border-[#f87171] bg-gradient-to-br from-[#fef2f2] to-[#fee2e2] hover:from-[#fee2e2] hover:to-[#fecaca]"
                            : "border-[#e6d3a3] bg-gradient-to-br from-[#f9f6ef] to-[#f3e7c4] hover:from-[#f7e6b6] hover:to-[#f3e7c4]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4
                              className="font-bold text-[#7c5c2b] mb-1"
                              style={{ fontFamily: "Jua, sans-serif" }}
                            >
                              {news.title}
                            </h4>
                            <p
                              className="text-sm text-[#a67c3c] mb-2"
                              style={{ fontFamily: "Jua, sans-serif" }}
                            >
                              {news.date}
                            </p>
                            <p
                              className="text-sm text-[#7c5c2b]"
                              style={{ fontFamily: "Jua, sans-serif" }}
                            >
                              {news.summary}
                            </p>
                          </div>
                          <div className="ml-3">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${
                                news.sentiment === "positive"
                                  ? "bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white border-[#4ade80]"
                                  : news.sentiment === "negative"
                                  ? "bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white border-[#f87171]"
                                  : "bg-gradient-to-r from-[#bfa76a] to-[#a67c3c] text-white border-[#e6d3a3]"
                              }`}
                              style={{ fontFamily: "Jua, sans-serif" }}
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
                    <div className="text-center py-8 bg-gradient-to-br from-[#f9f6ef] to-[#f3e7c4] rounded-xl border-2 border-[#e6d3a3]">
                      <p
                        className="text-[#a67c3c] mb-2"
                        style={{ fontFamily: "Jua, sans-serif" }}
                      >
                        해당 기간의 관련 뉴스가 없습니다.
                      </p>
                      <p
                        className="text-sm text-[#7c5c2b]"
                        style={{ fontFamily: "Jua, sans-serif" }}
                      >
                        뉴스 데이터가 업데이트되면 여기에 표시됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 가격 차트 */}
              <div>
                <h3
                  className="text-lg font-bold mb-3 text-[#7c5c2b]"
                  style={{ fontFamily: "Jua, sans-serif" }}
                >
                  실제 주가 동향 (OHLC 차트)
                </h3>
                <div
                  className="mb-3 text-xs text-[#a67c3c] flex flex-wrap gap-4"
                  style={{ fontFamily: "Jua, sans-serif" }}
                >
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
                <CandlestickChart
                  data={priceHistory}
                  stock={stockData}
                  period={period}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 라운드 기간에 하이라이트 추가하는 함수
const addRoundPeriodHighlight = (series, period) => {
  if (!series || !period) return;

  try {
    const [year, half] = period.split(" ");
    const currentYear = parseInt(year);
    const isFirstHalf = half === "H1";

    // 기간 시작/끝 날짜 계산
    const startMonth = isFirstHalf ? 1 : 7;
    const endMonth = isFirstHalf ? 6 : 12;

    const startDate = `${currentYear}-${startMonth
      .toString()
      .padStart(2, "0")}-01`;
    const endDate = `${currentYear}-${endMonth.toString().padStart(2, "0")}-30`;

    console.log(
      `Adding period highlight for ${period}: ${startDate} to ${endDate}`
    );

    // 간단한 표시를 위해 콘솔에 기간 정보 출력
    console.log(`🎯 게임 기간: ${startDate} ~ ${endDate} (${period})`);

    // 시리즈 차트 참조 가져오기
    const chart = series.chart && series.chart();
    if (!chart) return;

    // 반투명 배경 영역을 위한 Area 시리즈 추가
    const backgroundSeries = chart.addAreaSeries({
      topColor: "rgba(255, 193, 7, 0.1)", // 연한 노란색 배경
      bottomColor: "rgba(255, 193, 7, 0.05)",
      lineColor: "transparent", // 경계선 없음
      lineWidth: 0,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // 차트 전체 높이를 덮는 배경 데이터 생성
    // 간단한 방법: 매우 높은 값과 0 사이의 영역으로 전체 차트 덮기
    const backgroundData = [
      { time: startDate, value: 999999999 }, // 매우 높은 값
      { time: endDate, value: 999999999 }, // 매우 높은 값
    ];

    backgroundSeries.setData(backgroundData);

    // 차트 제목 업데이트로 기간 표시
    if (chart && chart.applyOptions) {
      chart.applyOptions({
        layout: {
          background: {
            type: "solid",
            color: "#ffffff",
          },
          textColor: "#333",
        },
        // 워터마크로 기간 표시
        watermark: {
          color: "rgba(255, 193, 7, 0.3)",
          visible: true,
          text: `📅 ${period} 라운드 기간`,
          fontSize: 24,
          horzAlign: "center",
          vertAlign: "center",
        },
      });
    }
  } catch (error) {
    console.error("기간 하이라이트 추가 중 오류:", error);
  }
};

// TradingView v4.x 캔들스틱 차트 (검증된 버전) - 통합 차트
const CandlestickChart = ({ data, stock, period }) => {
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

      // 현재 라운드 기간에 하이라이트 추가
      addRoundPeriodHighlight(candlestickSeries.current, period);

      // 차트 뷰 자동 조정
      chart.current.timeScale().fitContent();
    } catch (dataError) {
      console.error("❌ 데이터 설정 에러:", dataError);
    }
  }, [data, period]);

  return (
    <div className="bg-gradient-to-br from-[#f7e6b6] to-[#f3e7c4] p-4 border-2 border-[#e6d3a3] rounded-xl shadow-lg">
      <div
        ref={chartContainerRef}
        className="w-full border-2 border-[#e6d3a3] rounded-lg bg-white"
        style={{ height: "500px" }}
      />
    </div>
  );
};

export default Review;
