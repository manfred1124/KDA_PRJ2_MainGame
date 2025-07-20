import React, { useState, useEffect, useContext } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
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
import faceImage from "../assets/face.png";
import { GuideMessageContext } from "../App";

const MyPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { addGuideMessage } = useContext(GuideMessageContext);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeHistory, setTradeHistory] = useState([]); // 거래내역

  useEffect(() => {
    fetchPortfolio();
    fetchUserInfo();
    fetchTradeHistory();
  }, []);

  // 마이페이지 진입 시 LLM 기반 라운드 성과 피드백 표시
  useEffect(() => {
    if (portfolio && user && !loading && addGuideMessage) {
      // 약간의 지연 후 피드백 표시 (UI 렌더링 완료 후)
      const timer = setTimeout(async () => {
        try {
          const feedback = await generateLLMFeedback();
          if (feedback) {
            addGuideMessage(feedback);
          }
        } catch (error) {
          console.error("피드백 표시 실패:", error);
          // 에러 발생 시 기본 피드백 사용
          const basicFeedback = generateBasicFeedback();
          if (basicFeedback) {
            addGuideMessage(basicFeedback);
          }
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [portfolio, user, loading, addGuideMessage]);

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

  // LLM 기반 라운드 성과 피드백 생성
  const generateLLMFeedback = async () => {
    try {
      const response = await axios.post("/api/chatbot/mypage-feedback");
      return response.data.feedback;
    } catch (error) {
      console.error("LLM 피드백 생성 실패:", error);
      // LLM 실패 시 기본 피드백 반환
      return generateBasicFeedback();
    }
  };

  // 기본 피드백 생성 (LLM 실패 시 사용)
  const generateBasicFeedback = () => {
    if (!portfolio || !user) return "";

    const currentRound = (user.current_round_idx ?? 0) + 1;
    const totalProfitPercentage = portfolio.total_profit_percentage;
    const totalBalance = portfolio.total_balance;
    const totalPortfolioValue = portfolio.total_portfolio_value;
    const totalAssets = totalBalance + totalPortfolioValue;
    const cashRatio = (totalBalance / totalAssets) * 100;

    let feedback = `허허, 용사 ${user.username}이여! ${currentRound}라운드 투자 성과를 살펴보니 `;

    // 수익률에 따른 간단한 격려
    if (totalProfitPercentage >= 20) {
      feedback +=
        "훌륭한 성과로다! 20% 이상의 수익률을 달성하셨으니 진정한 투자 고수라 할 수 있겠나이다.";
    } else if (totalProfitPercentage >= 10) {
      feedback +=
        "좋은 성과로다! 10% 이상의 수익률로 안정적인 투자를 보여주셨으니 현명한 투자자라 할 수 있겠나이다.";
    } else if (totalProfitPercentage >= 0) {
      feedback +=
        "양호한 성과로다. 손실 없이 투자를 마무리하셨으니 신중한 투자라 할 수 있겠나이다.";
    } else {
      feedback +=
        "손실이 있으나 이는 투자의 길에서 반드시 겪어야 할 시련이라 할 수 있겠나이다.";
    }

    // 가장 중요한 한 가지 조언 (우선순위 순서)
    if (totalProfitPercentage < 0) {
      feedback +=
        " 과인의 조언: 다음 라운드에서는 분산 투자와 리스크 관리에 집중하시게.";
    } else if (cashRatio > 30) {
      feedback +=
        " 과인의 조언: 현금 비중이 높으니 적극적인 투자 기회를 찾아보시게.";
    } else if (cashRatio < 10) {
      feedback +=
        " 과인의 조언: 현금 비중이 낮으니 현금 유동성을 확보하는 것도 고려해보시게.";
    } else if (tradeHistory.length > 10) {
      feedback += " 과인의 조언: 거래가 빈번하니 신중한 매매를 하시게.";
    } else if (tradeHistory.length < 3) {
      feedback += " 과인의 조언: 더 적극적인 투자 기회를 찾아보시게.";
    } else {
      feedback +=
        " 과인의 조언: 현재 전략을 유지하되 더욱 신중하게 접근하시게.";
    }

    return feedback;
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

  return (
    <div
      className="space-y-6 min-h-screen pb-12"
      style={{ fontFamily: "Jua, sans-serif" }}
    >
      {/* 라운드 요약 제목 및 계속 진행하기 버튼 */}
      <div className="flex flex-col items-center gap-4 mt-4 mb-2"></div>
      {/* 사용자 정보 헤더 */}
      <div
        className="rounded-xl p-8 mb-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(230, 211, 163, 0.6) 60%, rgba(191, 167, 106, 0.6) 100%)",
          boxShadow: "0 2px 8px rgba(194, 178, 128, 0.3)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#e6d3a3] bg-opacity-80 rounded-full border-2 border-[#bfa76a] overflow-hidden">
              <img
                src={faceImage}
                alt="User Avatar"
                className="w-8 h-8 object-cover"
              />
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
                용사
              </p>
            </div>
          </div>
          {/* 우상단 라운드 리뷰 버튼 */}
          <button
            onClick={() => navigate("/review")}
            className="bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-normal py-3 px-6 rounded-full text-base shadow-lg transition-all duration-200 border-2 border-[#e6d3a3]"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            라운드 리뷰
          </button>
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
          className="rounded-xl p-4 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-xs font-medium text-[#a67c3c] mb-1">
                보유 현금
              </p>
              <p className="text-sm font-bold text-[#7c5c2b] whitespace-nowrap overflow-hidden text-ellipsis">
                {portfolio.total_balance.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-4 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-xs font-medium text-[#a67c3c] mb-1">
                포트폴리오 가치
              </p>
              <p className="text-sm font-bold text-[#7c5c2b] whitespace-nowrap overflow-hidden text-ellipsis">
                {portfolio.total_portfolio_value.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl p-4 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-xs font-medium text-[#a67c3c] mb-1">
                미실현 손익
              </p>
              <p
                className={`text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis ${
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
          className="rounded-xl p-4 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-xs font-medium text-[#a67c3c] mb-1">
                실현 수익
              </p>
              <p
                className={`text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis ${
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
          className="rounded-xl p-4 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-xs font-medium text-[#a67c3c] mb-1">총 수익</p>
              <p
                className={`text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis ${
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
          className="rounded-xl p-4 border-2 border-[#e6d3a3] bg-[#f7e6b6] shadow"
          style={{ boxShadow: "0 2px 8px #c2b28033" }}
        >
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-xs font-medium text-[#a67c3c] mb-1">
                총 수익률
              </p>
              <p
                className={`text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis ${
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
                  <th className="text-center py-4 px-6 font-semibold text-[#a67c3c] whitespace-nowrap">
                    종목
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-[#a67c3c] whitespace-nowrap">
                    보유수량
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c] whitespace-nowrap">
                    평균단가
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c] whitespace-nowrap">
                    현재가
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c] whitespace-nowrap">
                    평가금액
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c] whitespace-nowrap">
                    손익
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c] whitespace-nowrap">
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
                    <td className="text-center py-4 px-6 font-semibold text-[#7c5c2b] whitespace-nowrap">
                      {(item.quantity ?? 0).toLocaleString()}주
                    </td>
                    <td className="text-right py-4 px-6 text-[#a67c3c] whitespace-nowrap text-sm">
                      {(item.average_price ?? 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-4 px-6 font-semibold text-[#7c5c2b] whitespace-nowrap text-sm">
                      {(item.current_price ?? 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-4 px-6 font-semibold text-[#7c5c2b] whitespace-nowrap text-sm">
                      {(item.total_value ?? 0).toLocaleString()}원
                    </td>
                    <td
                      className={`text-right py-4 px-6 font-semibold whitespace-nowrap text-sm ${
                        (item.profit_loss ?? 0) >= 0
                          ? "text-[#3b7c2b]"
                          : "text-[#a63c2b]"
                      }`}
                    >
                      {(item.profit_loss ?? 0) >= 0 ? "+" : ""}
                      {(item.profit_loss ?? 0).toLocaleString()}원
                    </td>
                    <td
                      className={`text-right py-4 px-6 font-semibold whitespace-nowrap text-sm ${
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
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-24 whitespace-nowrap">
                  종목
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-16 whitespace-nowrap">
                  유형
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-16 whitespace-nowrap">
                  수량
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-24 whitespace-nowrap">
                  거래가
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-16 whitespace-nowrap">
                  라운드
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-24 whitespace-nowrap">
                  거래시점
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-24 whitespace-nowrap">
                  현재가
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-20 whitespace-nowrap">
                  수익률
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c] w-32 whitespace-nowrap text-xs">
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
                  // 현재가, 수익률, 기회비용(매도 후 현재가 대비) 계산
                  let currentPrice = tx.current_price;
                  let profitRate = null;
                  let opportunityCost = null;

                  // 매수 거래의 경우: 해당 기간의 현재가와 비교하여 수익률 계산
                  if (
                    tx.transaction_type === "buy" &&
                    currentPrice !== null &&
                    currentPrice > 0
                  ) {
                    profitRate = ((currentPrice - tx.price) / tx.price) * 100;
                  }

                  // 매도 거래의 경우: 매도가와 매수가 비교하여 실현 수익률 계산
                  if (tx.transaction_type === "sell") {
                    // 매도 거래는 이미 실현된 거래이므로 수익률 계산
                    // 매도가가 거래가격이므로, 매수가는 이전 매수 거래에서 찾아야 함
                    const buyTransaction = tradeHistory.find(
                      (t) =>
                        t.stock_id === tx.stock_id &&
                        t.transaction_type === "buy" &&
                        t.round_number < tx.round_number
                    );
                    if (buyTransaction) {
                      profitRate =
                        ((tx.price - buyTransaction.price) /
                          buyTransaction.price) *
                        100;
                    }

                    // 기회비용 계산: 매도 후 현재가와 매도가 비교
                    // 매도 거래의 경우, 해당 기간의 현재가와 매도가 비교
                    if (currentPrice && currentPrice > 0) {
                      opportunityCost =
                        ((currentPrice - tx.price) / tx.price) * 100;
                    }
                  }

                  return (
                    <tr
                      key={idx}
                      className="border-b border-[#f3e7c4] hover:bg-[#f7f3e8] transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-[#7c5c2b] whitespace-nowrap">
                        <div className="max-w-[80px] overflow-hidden">
                          {tx.stock_name.length <= 6 ? (
                            <span className="whitespace-nowrap">
                              {tx.stock_name}
                            </span>
                          ) : (
                            <span className="whitespace-normal break-words">
                              {tx.stock_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#a67c3c]">
                        {tx.transaction_type === "buy" ? "매수" : "매도"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.quantity}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        {tx.price.toLocaleString()}원
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.round_number}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        {tx.period || "-"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        {currentPrice !== null && currentPrice > 0
                          ? currentPrice.toLocaleString() + "원"
                          : "-"}
                      </td>
                      <td
                        className={`py-3 px-4 whitespace-nowrap text-xs ${
                          profitRate !== null
                            ? profitRate >= 0
                              ? "text-[#3b7c2b]"
                              : "text-[#a63c2b]"
                            : ""
                        }`}
                      >
                        {profitRate !== null
                          ? (profitRate >= 0 ? "+" : "") +
                            profitRate.toFixed(2) +
                            "%"
                          : "-"}
                      </td>
                      <td
                        className={`py-3 px-4 whitespace-nowrap text-xs ${
                          tx.transaction_type === "sell" &&
                          opportunityCost !== null
                            ? opportunityCost >= 0
                              ? "text-[#3b7c2b]"
                              : "text-[#a63c2b]"
                            : ""
                        }`}
                      >
                        {tx.transaction_type === "sell" &&
                        opportunityCost !== null
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
              // 현재가, 수익률, 기회비용(매도 후 현재가 대비) 계산
              let currentPrice = tx.current_price;
              let profitRate = null;
              let opportunityCost = null;

              // 매수 거래의 경우: 해당 기간의 현재가와 비교하여 수익률 계산
              if (
                tx.transaction_type === "buy" &&
                currentPrice !== null &&
                currentPrice > 0
              ) {
                profitRate = ((currentPrice - tx.price) / tx.price) * 100;
              }

              // 매도 거래의 경우: 매도가와 매수가 비교하여 실현 수익률 계산
              if (tx.transaction_type === "sell") {
                const buyTransaction = tradeHistory.find(
                  (t) =>
                    t.stock_id === tx.stock_id &&
                    t.transaction_type === "buy" &&
                    t.round_number < tx.round_number
                );
                if (buyTransaction) {
                  profitRate =
                    ((tx.price - buyTransaction.price) / buyTransaction.price) *
                    100;
                }

                // 기회비용 계산: 매도 후 현재가와 매도가 비교
                // 매도 거래의 경우, 해당 기간의 현재가와 매도가 비교
                if (currentPrice && currentPrice > 0) {
                  opportunityCost =
                    ((currentPrice - tx.price) / tx.price) * 100;
                }
              }
              return (
                <div
                  key={idx}
                  className="bg-[#f3e7c4] rounded-lg p-4 border border-[#e6d3a3]"
                  style={{ fontFamily: "Jua, sans-serif" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[#7c5c2b] text-lg max-w-[120px] overflow-hidden">
                      {tx.stock_name.length <= 6 ? (
                        <span className="whitespace-nowrap">
                          {tx.stock_name}
                        </span>
                      ) : (
                        <span className="whitespace-normal break-words">
                          {tx.stock_name}
                        </span>
                      )}
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
      {/* 버튼 제거됨 */}

      {/* 라운드 리뷰 모달 제거됨 */}
    </div>
  );
};

export default MyPage;
