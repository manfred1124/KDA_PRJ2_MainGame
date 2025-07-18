import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import RoundReview from "../components/RoundReview";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  User,
  Calendar,
  Trophy,
  TrendingUp as StockIcon,
  Newspaper,
} from "lucide-react";

const MyPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeHistory, setTradeHistory] = useState([]); // 거래내역
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    fetchPortfolio();
    fetchUserInfo();
    fetchTradeHistory();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get("/api/portfolio");
      setPortfolio(response.data);
    } catch (error) {
      toast.error("포트폴리오를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get("/api/auth/me");
      updateUser(response.data);
    } catch (error) {
      console.error("사용자 정보 업데이트 실패:", error);
    }
  };

  // 거래내역 불러오기 (백엔드에 /api/portfolio/transactions 엔드포인트가 있다고 가정)
  const fetchTradeHistory = async () => {
    try {
      const response = await axios.get("/api/portfolio/transactions");
      setTradeHistory(response.data);
    } catch (error) {
      // 엔드포인트가 없으면 빈 배열 유지
      setTradeHistory([]);
    }
  };

  const handleRestartGame = async () => {
    try {
      const response = await axios.post("/api/game/restart");
      console.log("게임 재시작 응답:", response.data);
      toast.success("게임이 재시작되었습니다!");

      // API 응답에서 사용자 정보 업데이트
      if (response.data.user) {
        console.log("게임 재시작 후 사용자 정보:", response.data.user);

        // AuthContext의 사용자 정보 업데이트
        window.dispatchEvent(
          new CustomEvent("userUpdated", {
            detail: response.data.user,
          })
        );

        // 네비게이션 바 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new Event("transactionComplete"));

        navigate("/");
      } else {
        // 백업: 사용자 정보 직접 조회
        try {
          const userResponse = await axios.get("/api/auth/me");
          console.log("게임 재시작 후 사용자 정보 (백업):", userResponse.data);

          window.dispatchEvent(
            new CustomEvent("userUpdated", {
              detail: userResponse.data,
            })
          );

          window.dispatchEvent(new Event("transactionComplete"));

          navigate("/");
        } catch (userError) {
          console.error("사용자 정보 업데이트 실패:", userError);
          window.location.reload();
        }
      }
    } catch (error) {
      console.error("게임 재시작 실패:", error);
      toast.error("게임 재시작에 실패했습니다.");
    }
  };

  const handleNextRound = async () => {
    try {
      const response = await axios.post("/api/game/next-round");
      console.log("다음 라운드 응답:", response.data);
      toast.success("다음 라운드로 진행되었습니다!");

      // 사용자 정보 업데이트
      updateUser((prev) => ({
        ...prev,
        current_round_idx: response.data.new_round_idx,
        current_period: response.data.current_period,
      }));

      // 3라운드 완료 후 게임 결과 페이지로 이동
      if (response.data.new_round_idx >= 3) {
        navigate("/game-result");
      } else {
        navigate("/news");
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!portfolio) {
    return <div>포트폴리오를 불러올 수 없습니다.</div>;
  }

  const isLastRound = (user?.current_round_idx ?? 0) >= 3;

  return (
    <div
      className="space-y-6 min-h-screen pb-12"
      style={{ fontFamily: "Jua, sans-serif" }}
    >
      {/* 라운드 요약 제목 및 계속 진행하기 버튼 */}
      <div className="flex flex-col items-center gap-4 mt-4 mb-2">
        <h2
          className="text-3xl font-bold text-[#7c5c2b] drop-shadow"
          style={{ fontFamily: "Jua, sans-serif" }}
        >
          {(user?.current_round_idx ?? 0) + 1}라운드 요약
        </h2>
      </div>
      {/* 사용자 정보 헤더 */}
      <div
        className="rounded-xl p-8 mb-2"
        style={{
          background: "linear-gradient(135deg, #e6d3a3 60%, #bfa76a 100%)",
          boxShadow: "0 2px 8px #c2b28055",
        }}
      >
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-[#e6d3a3] bg-opacity-80 rounded-full border-2 border-[#bfa76a]">
            <User size={32} className="text-[#7c5c2b]" />
          </div>
          <div>
            <h1
              className="text-3xl font-bold text-[#7c5c2b]"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              {user?.username}
            </h1>
            <p
              className="text-[#a67c3c]"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              모험가
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-[#7c5c2b]">
            <Calendar size={20} />
            <span style={{ fontFamily: "Jua, sans-serif" }}>
              현재 라운드: {(user?.current_round_idx ?? 0) + 1}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[#7c5c2b]">
            <Trophy size={20} />
            <span style={{ fontFamily: "Jua, sans-serif" }}>
              총 수익률: {portfolio.total_profit_percentage >= 0 ? "+" : ""}
              {portfolio.total_profit_percentage.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[#7c5c2b]">
            <DollarSign size={20} />
            <span style={{ fontFamily: "Jua, sans-serif" }}>
              총 자산:{" "}
              {(
                portfolio.total_balance + portfolio.total_portfolio_value
              ).toLocaleString()}
              원
            </span>
          </div>
        </div>
      </div>

      {/* 포트폴리오 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/** 카드 반복: 각 카드에 RPG풍 스타일 적용 **/}
        <div
          className="rounded-xl p-6 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#a67c3c]">보유 현금</p>
              <p className="text-xl font-bold text-[#7c5c2b]">
                {portfolio.total_balance.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-6 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#a67c3c]">
                포트폴리오 가치
              </p>
              <p className="text-xl font-bold text-[#7c5c2b]">
                {portfolio.total_portfolio_value.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-6 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#a67c3c]">미실현 손익</p>
              <p
                className={`text-xl font-bold ${
                  portfolio.total_profit_loss >= 0
                    ? "text-[#3b7c2b]"
                    : "text-[#a63c2b]"
                }`}
              >
                {portfolio.total_profit_loss >= 0 ? "+" : ""}
                {portfolio.total_profit_loss.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-6 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#a67c3c]">실현 수익</p>
              <p
                className={`text-xl font-bold ${
                  portfolio.realized_profit >= 0
                    ? "text-[#3b7c2b]"
                    : "text-[#a63c2b]"
                }`}
              >
                {portfolio.realized_profit >= 0 ? "+" : ""}
                {portfolio.realized_profit.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-6 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#a67c3c]">총 수익</p>
              <p
                className={`text-xl font-bold ${
                  portfolio.total_profit >= 0
                    ? "text-[#3b7c2b]"
                    : "text-[#a63c2b]"
                }`}
              >
                {portfolio.total_profit >= 0 ? "+" : ""}
                {portfolio.total_profit.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-6 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#a67c3c]">총 수익률</p>
              <p
                className={`text-xl font-bold ${
                  portfolio.total_profit_percentage >= 0
                    ? "text-[#3b7c2b]"
                    : "text-[#a63c2b]"
                }`}
              >
                {portfolio.total_profit_percentage >= 0 ? "+" : ""}
                {portfolio.total_profit_percentage.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* 라운드 리뷰 */}
      <div className="rounded-xl shadow-lg border border-[#e6d3a3] bg-[#fffbe6] p-6 mb-6 flex items-center gap-4">
        <div className="flex-shrink-0">
          <Calendar size={36} className="text-[#bfa76a]" />
        </div>
        <div>
          <h3
            className="text-xl font-bold text-[#a67c3c] mb-1"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            라운드 리뷰
          </h3>
          <p
            className="text-[#7c5c2b] text-base"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            {/* 간단한 라운드 요약. 필요시 더 상세하게 수정 가능 */}
            {(() => {
              const period = user?.current_period;
              if (!period) return "이번 라운드의 시장 동향을 잘 살펴보세요!";
              // 간단한 getRoundTrendGuide 로직 (2020Q1, 2020Q2 등)
              const guides = {
                "2020Q1":
                  "2020년 1분기, 코로나19의 영향으로 글로벌 증시가 큰 충격을 받았네.",
                "2020Q2":
                  "2020년 2분기, 각국의 경기부양책으로 시장이 반등하기 시작했지.",
                "2021Q1":
                  "2021년 1분기, 백신 보급과 함께 경기 회복 기대감이 커졌네.",
                "2023H1":
                  "2023년 상반기, 글로벌 경제가 점차 안정을 찾아가고 있네. 상반기에는 경기 회복 기대감이 컸지.",
                "2023H2":
                  "2023년 하반기, 금리 인상과 인플레이션 이슈가 완화되며 시장이 점진적으로 회복되고 있네.",
              };
              if (guides[period]) return guides[period];
              if (period.includes("H1"))
                return `${period.slice(
                  0,
                  4
                )}년 상반기, 글로벌 경제와 산업의 주요 변화를 주목해보게!`;
              if (period.includes("H2"))
                return `${period.slice(
                  0,
                  4
                )}년 하반기, 하반기 시장의 주요 이슈와 트렌드를 살펴보게!`;
              return "현재 시점의 시장 동향을 잘 살펴 투자 전략을 세워보게!";
            })()}
          </p>
        </div>
      </div>
      {/* 보유 주식 목록 */}
      <div className="rounded-xl shadow-lg border border-[#e6d3a3] bg-[#f3e7c4]">
        <div className="p-6 border-b border-[#e6d3a3]">
          <h3
            className="text-xl font-bold text-[#a67c3c]"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            보유 주식 ({portfolio.items.length}종목)
          </h3>
        </div>
        {portfolio.items.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="text-[#d6c08a] mx-auto mb-4" />
            <p
              className="text-[#a67c3c] text-lg mb-2"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              아직 보유한 주식이 없습니다.
            </p>
            <p
              className="text-sm text-[#bfa76a]"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              주식 투자를 시작해보세요!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 game-scrollbar">
            <table className="w-full" style={{ fontFamily: "Jua, sans-serif" }}>
              <thead className="sticky top-0 bg-[#f3e7c4] z-10">
                <tr className="border-b border-[#e6d3a3]">
                  <th className="text-center py-4 px-6 font-semibold text-[#a67c3c]">
                    종목
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-[#a67c3c]">
                    보유수량
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c]">
                    평균단가
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c]">
                    현재가
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c]">
                    평가금액
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c]">
                    손익
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c]">
                    수익률
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolio.items.map((item) => (
                  <tr
                    key={item.stock_id}
                    className="border-b border-[#f3e7c4] hover:bg-[#f7f3e8] transition-colors"
                  >
                    <td className="py-4 px-6 text-center">
                      <div>
                        <p className="font-semibold text-[#7c5c2b]">
                          {item.stock_name}
                        </p>
                        <p className="text-sm text-[#a67c3c]">
                          {item.stock_symbol}
                        </p>
                      </div>
                    </td>
                    <td className="text-center py-4 px-6 font-semibold text-[#7c5c2b]">
                      {(item.quantity ?? 0).toLocaleString()}주
                    </td>
                    <td className="text-right py-4 px-6 text-[#a67c3c]">
                      {(item.average_price ?? 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-4 px-6 font-semibold text-[#7c5c2b]">
                      {(item.current_price ?? 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-4 px-6 font-semibold text-[#7c5c2b]">
                      {(item.total_value ?? 0).toLocaleString()}원
                    </td>
                    <td
                      className={`text-right py-4 px-6 font-semibold ${
                        (item.profit_loss ?? 0) >= 0
                          ? "text-[#3b7c2b]"
                          : "text-[#a63c2b]"
                      }`}
                    >
                      {(item.profit_loss ?? 0) >= 0 ? "+" : ""}
                      {(item.profit_loss ?? 0).toLocaleString()}원
                    </td>
                    <td
                      className={`text-right py-4 px-6 font-semibold ${
                        (item.profit_loss_percentage ?? 0) >= 0
                          ? "text-[#3b7c2b]"
                          : "text-[#a63c2b]"
                      }`}
                    >
                      {(item.profit_loss_percentage ?? 0) >= 0 ? "+" : ""}
                      {(item.profit_loss_percentage ?? 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 매매 기록 테이블 */}
      <div className="rounded-xl shadow-lg border border-[#e6d3a3] bg-[#f3e7c4] p-6 mt-8">
        <h3
          className="text-xl font-bold text-[#a67c3c] mb-4"
          style={{ fontFamily: "Jua, sans-serif" }}
        >
          매매 기록
        </h3>

        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden md:block overflow-x-auto max-h-96 game-scrollbar">
          <table
            className="min-w-full text-sm text-center"
            style={{ tableLayout: "fixed" }}
          >
            <thead className="sticky top-0 bg-[#f3e7c4] z-10">
              <tr className="border-b border-[#e6d3a3]">
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-24">
                  종목
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-16">
                  유형
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-16">
                  수량
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-24">
                  거래가
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-16">
                  라운드
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-24">
                  거래시점
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-24">
                  현재가
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-20">
                  수익률
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-32">
                  매도 후 현재가 대비(%)
                </th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-8 text-[#a67c3c]"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    거래 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                tradeHistory.map((tx, idx) => {
                  // 현재가, 수익률, 기회비용(매도 후 현재가 대비) 계산 예시
                  // 실제 데이터 구조에 맞게 수정 필요
                  const currentPrice = tx.current_price ?? 0;
                  const profitRate =
                    tx.transaction_type === "buy"
                      ? ((currentPrice - tx.price) / tx.price) * 100
                      : ((tx.price - tx.sell_price) / tx.sell_price) * 100;
                  const opportunityCost =
                    tx.transaction_type === "sell" && currentPrice
                      ? ((currentPrice - tx.price) / tx.price) * 100
                      : null;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-[#f3e7c4] hover:bg-[#f7f3e8] transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-[#7c5c2b]">
                        {tx.stock_name}
                      </td>
                      <td className="py-3 px-4 text-[#a67c3c]">
                        {tx.transaction_type === "buy" ? "매수" : "매도"}
                      </td>
                      <td className="py-3 px-4">{tx.quantity}</td>
                      <td className="py-3 px-4">
                        {tx.price.toLocaleString()}원
                      </td>
                      <td className="py-3 px-4">{tx.round_number}</td>
                      <td className="py-3 px-4">{tx.period || "-"}</td>
                      <td className="py-3 px-4">
                        {currentPrice
                          ? currentPrice.toLocaleString() + "원"
                          : "-"}
                      </td>
                      <td
                        className={`py-3 px-4 ${
                          profitRate >= 0 ? "text-[#3b7c2b]" : "text-[#a63c2b]"
                        }`}
                      >
                        {profitRate
                          ? (profitRate >= 0 ? "+" : "") +
                            profitRate.toFixed(2) +
                            "%"
                          : "-"}
                      </td>
                      <td
                        className={`py-3 px-4 ${
                          opportunityCost !== null
                            ? opportunityCost >= 0
                              ? "text-[#3b7c2b]"
                              : "text-[#a63c2b]"
                            : ""
                        }`}
                      >
                        {opportunityCost !== null
                          ? (opportunityCost >= 0 ? "+" : "") +
                            opportunityCost.toFixed(2) +
                            "%"
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="md:hidden space-y-4">
          {tradeHistory.length === 0 ? (
            <div
              className="text-center py-8 text-[#a67c3c]"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              거래 내역이 없습니다.
            </div>
          ) : (
            tradeHistory.map((tx, idx) => {
              // 현재가, 수익률, 기회비용(매도 후 현재가 대비) 계산 예시
              // 실제 데이터 구조에 맞게 수정 필요
              const currentPrice = tx.current_price ?? 0;
              const profitRate =
                tx.transaction_type === "buy"
                  ? ((currentPrice - tx.price) / tx.price) * 100
                  : ((tx.price - tx.sell_price) / tx.sell_price) * 100;
              const opportunityCost =
                tx.transaction_type === "sell" && currentPrice
                  ? ((currentPrice - tx.price) / tx.price) * 100
                  : null;
              return (
                <div
                  key={idx}
                  className="bg-[#f3e7c4] rounded-lg p-4 border border-[#e6d3a3]"
                  style={{ fontFamily: "Jua, sans-serif" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[#7c5c2b] text-lg">
                      {tx.stock_name}
                    </h4>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        tx.transaction_type === "buy"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {tx.transaction_type === "buy" ? "매수" : "매도"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#a67c3c] font-medium">수량:</span>
                      <span className="text-[#7c5c2b] ml-2">
                        {tx.quantity}주
                      </span>
                    </div>
                    <div>
                      <span className="text-[#a67c3c] font-medium">
                        거래가:
                      </span>
                      <span className="text-[#7c5c2b] ml-2">
                        {tx.price.toLocaleString()}원
                      </span>
                    </div>
                    <div>
                      <span className="text-[#a67c3c] font-medium">
                        라운드:
                      </span>
                      <span className="text-[#7c5c2b] ml-2">
                        {tx.round_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#a67c3c] font-medium">
                        거래시점:
                      </span>
                      <span className="text-[#7c5c2b] ml-2">
                        {tx.period || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#a67c3c] font-medium">
                        현재가:
                      </span>
                      <span className="text-[#7c5c2b] ml-2">
                        {currentPrice
                          ? currentPrice.toLocaleString() + "원"
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#a67c3c] font-medium">
                        수익률:
                      </span>
                      <span
                        className={`ml-2 font-semibold ${
                          profitRate >= 0 ? "text-[#3b7c2b]" : "text-[#a63c2b]"
                        }`}
                      >
                        {profitRate
                          ? (profitRate >= 0 ? "+" : "") +
                            profitRate.toFixed(2) +
                            "%"
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {opportunityCost !== null && (
                    <div className="mt-3 pt-3 border-t border-[#e6d3a3]">
                      <span className="text-[#a67c3c] font-medium">
                        매도 후 현재가 대비:
                      </span>
                      <span
                        className={`ml-2 font-semibold ${
                          opportunityCost >= 0
                            ? "text-[#3b7c2b]"
                            : "text-[#a63c2b]"
                        }`}
                      >
                        {(opportunityCost >= 0 ? "+" : "") +
                          opportunityCost.toFixed(2)}
                        %
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 계속 진행하기 버튼을 페이지 맨 아래로 이동 */}
      {isLastRound ? (
        <button
          onClick={handleRestartGame}
          className="fixed z-30 bg-gradient-to-b from-[#bfa76a] to-[#7c5c2b] text-white font-bold py-3 px-10 rounded-full text-lg shadow border-4 border-[#e6d3a3] tracking-wider transition-all duration-200 hover:from-[#d6c08a] hover:to-[#a67c3c]"
          style={{
            right: "calc(50vw - 640px/2 + 2rem)",
            bottom: "2rem",
            fontFamily: "Jua, sans-serif",
            letterSpacing: "0.05em",
            minWidth: "180px",
          }}
        >
          새 게임 시작
        </button>
      ) : (
        <button
          onClick={handleNextRound}
          className="fixed z-30 bg-gradient-to-b from-[#bfa76a] to-[#7c5c2b] text-white font-bold py-3 px-10 rounded-full text-lg shadow border-4 border-[#e6d3a3] tracking-wider transition-all duration-200 hover:from-[#d6c08a] hover:to-[#a67c3c]"
          style={{
            right: "calc(50vw - 640px/2 + 2rem)",
            bottom: "2rem",
            fontFamily: "Jua, sans-serif",
            letterSpacing: "0.05em",
            minWidth: "180px",
          }}
        >
          계속 진행하기
        </button>
      )}

      {/* 라운드 리뷰 버튼 */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowReview(true)}
          className="bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg transition-all duration-200 border-4 border-[#e6d3a3]"
          style={{ minWidth: "180px", fontFamily: "serif" }}
        >
          라운드 리뷰
        </button>
        {isLastRound ? (
          <button
            onClick={() => navigate("/game-result")}
            className="bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg transition-all duration-200 border-4 border-[#e6d3a3]"
            style={{ minWidth: "180px", fontFamily: "serif" }}
          >
            결과 보기
          </button>
        ) : (
          <button
            onClick={handleNextRound}
            className="bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg transition-all duration-200 border-4 border-[#e6d3a3]"
            style={{ minWidth: "180px", fontFamily: "serif" }}
          >
            계속 진행하기
          </button>
        )}
      </div>

      {/* 라운드 리뷰 모달 */}
      {showReview && (
        <RoundReview
          period={user?.current_period}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
};

export default MyPage;
