import React, { useState, useEffect } from "react";
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

const MyPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeHistory, setTradeHistory] = useState([]); // 거래내역

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
    <div className="space-y-6 min-h-screen pb-12">
      {/* 라운드 요약 제목 및 계속 진행하기 버튼 */}
      <div className="flex flex-col items-center gap-4 mt-4 mb-2">
        <h2
          className="text-3xl font-bold text-[#7c5c2b] drop-shadow"
          style={{ fontFamily: "serif" }}
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
              style={{ fontFamily: "serif" }}
            >
              {user?.username}
            </h1>
            <p className="text-[#a67c3c]">모험가</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-[#7c5c2b]">
            <Calendar size={20} />
            <span>현재 라운드: {(user?.current_round_idx ?? 0) + 1}</span>
          </div>
          <div className="flex items-center space-x-2 text-[#7c5c2b]">
            <Trophy size={20} />
            <span>
              총 수익률: {portfolio.total_profit_percentage >= 0 ? "+" : ""}
              {portfolio.total_profit_percentage.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[#7c5c2b]">
            <DollarSign size={20} />
            <span>
              총 자산:{" "}
              {(
                portfolio.total_balance + portfolio.total_portfolio_value
              ).toLocaleString()}
              원
            </span>
          </div>
        </div>
      </div>
      {/* 빠른 이동 버튼 */}
      <div className="rounded-xl shadow-lg border border-[#e6d3a3] p-6 bg-[#f3e7c4]">
        <h3
          className="text-lg font-bold text-[#a67c3c] mb-4"
          style={{ fontFamily: "serif" }}
        >
          빠른 이동
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/select-sector")}
            className="flex flex-col items-center p-4 bg-gradient-to-br from-[#f7e6b6] to-[#e6d3a3] rounded-lg hover:from-[#f3e7c4] hover:to-[#e6d3a3] transition-all duration-200 border border-[#bfa76a] hover:border-[#a67c3c]"
            style={{ fontFamily: "serif" }}
          >
            <StockIcon className="text-[#a67c3c] mb-2" size={24} />
            <span className="text-sm font-semibold text-[#7c5c2b]">
              주식 매매하기
            </span>
          </button>
          <button
            onClick={() => navigate("/news")}
            className="flex flex-col items-center p-4 bg-gradient-to-br from-[#f7e6b6] to-[#e6d3a3] rounded-lg hover:from-[#f3e7c4] hover:to-[#e6d3a3] transition-all duration-200 border border-[#bfa76a] hover:border-[#a67c3c]"
          >
            <Newspaper className="text-[#a67c3c] mb-2" size={24} />
            <span className="text-sm font-semibold text-[#7c5c2b]">뉴스</span>
          </button>
          <button
            onClick={() => navigate("/ranking")}
            className="flex flex-col items-center p-4 bg-gradient-to-br from-[#f7e6b6] to-[#e6d3a3] rounded-lg hover:from-[#f3e7c4] hover:to-[#e6d3a3] transition-all duration-200 border border-[#bfa76a] hover:border-[#a67c3c]"
          >
            <Trophy className="text-[#a67c3c] mb-2" size={24} />
            <span className="text-sm font-semibold text-[#7c5c2b]">랭킹</span>
          </button>
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
            <div className="p-3 bg-[#e6d3a3] rounded-full border-2 border-[#bfa76a]">
              <DollarSign className="text-[#a67c3c]" size={20} />
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
            <div className="p-3 bg-[#e6d3a3] rounded-full border-2 border-[#bfa76a]">
              <Package className="text-[#a67c3c]" size={20} />
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
            <div
              className={`p-3 rounded-full ${
                portfolio.total_profit_loss >= 0
                  ? "bg-[#e6f3d3]"
                  : "bg-[#f3d3d3]"
              } border-2 border-[#bfa76a]`}
            >
              {portfolio.total_profit_loss >= 0 ? (
                <TrendingUp className="text-[#3b7c2b]" size={20} />
              ) : (
                <TrendingDown className="text-[#a63c2b]" size={20} />
              )}
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
            <div
              className={`p-3 rounded-full ${
                portfolio.realized_profit >= 0 ? "bg-[#e6f3d3]" : "bg-[#f3d3d3]"
              } border-2 border-[#bfa76a]`}
            >
              {portfolio.realized_profit >= 0 ? (
                <TrendingUp className="text-[#3b7c2b]" size={20} />
              ) : (
                <TrendingDown className="text-[#a63c2b]" size={20} />
              )}
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
            <div
              className={`p-3 rounded-full ${
                portfolio.total_profit >= 0 ? "bg-[#e6f3d3]" : "bg-[#f3d3d3]"
              } border-2 border-[#bfa76a]`}
            >
              {portfolio.total_profit >= 0 ? (
                <TrendingUp className="text-[#3b7c2b]" size={20} />
              ) : (
                <TrendingDown className="text-[#a63c2b]" size={20} />
              )}
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
            <div
              className={`p-3 rounded-full ${
                portfolio.total_profit_percentage >= 0
                  ? "bg-[#e6f3d3]"
                  : "bg-[#f3d3d3]"
              } border-2 border-[#bfa76a]`}
            >
              {portfolio.total_profit_percentage >= 0 ? (
                <TrendingUp className="text-[#3b7c2b]" size={20} />
              ) : (
                <TrendingDown className="text-[#a63c2b]" size={20} />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* 보유 주식 목록 */}
      <div className="rounded-xl shadow-lg border border-[#e6d3a3] bg-[#f3e7c4]">
        <div className="p-6 border-b border-[#e6d3a3]">
          <h3
            className="text-xl font-bold text-[#a67c3c]"
            style={{ fontFamily: "serif" }}
          >
            보유 주식 ({portfolio.items.length}종목)
          </h3>
        </div>
        {portfolio.items.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="text-[#d6c08a] mx-auto mb-4" />
            <p className="text-[#a67c3c] text-lg mb-2">
              아직 보유한 주식이 없습니다.
            </p>
            <p className="text-sm text-[#bfa76a]">주식 투자를 시작해보세요!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontFamily: "serif" }}>
              <thead>
                <tr className="border-b border-[#e6d3a3] bg-[#f7e6b6]">
                  <th className="text-left py-4 px-6 font-semibold text-[#a67c3c]">
                    종목
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-[#a67c3c]">
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
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-[#7c5c2b]">
                          {item.stock_name}
                        </p>
                        <p className="text-sm text-[#a67c3c]">
                          {item.stock_symbol}
                        </p>
                      </div>
                    </td>
                    <td className="text-right py-4 px-6 font-semibold text-[#7c5c2b]">
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
      <div className="rounded-xl shadow-lg border border-[#e6d3a3] bg-[#f7e6b6] p-6 mt-8">
        <h3
          className="text-xl font-bold text-[#a67c3c] mb-4"
          style={{ fontFamily: "serif" }}
        >
          매매 기록
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#e6d3a3] bg-[#f3e7c4]">
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">종목</th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">유형</th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">수량</th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">
                  거래가
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">
                  라운드
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">
                  거래시점
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">
                  현재가
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">
                  수익률
                </th>
                <th className="py-3 px-4 font-semibold text-[#a67c3c]">
                  매도 후 현재가 대비(%)
                </th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[#a67c3c]">
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
                      <td className="py-3 px-4 text-right">{tx.quantity}</td>
                      <td className="py-3 px-4 text-right">
                        {tx.price.toLocaleString()}원
                      </td>
                      <td className="py-3 px-4 text-right">
                        {tx.round_number}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {tx.period || "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {currentPrice
                          ? currentPrice.toLocaleString() + "원"
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {profitRate ? profitRate.toFixed(2) + "%" : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {opportunityCost !== null
                          ? opportunityCost.toFixed(2) + "%"
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 계속 진행하기 버튼을 페이지 맨 아래로 이동 */}
      <div className="flex justify-center mt-8 mb-4">
        <button
          onClick={() => navigate("/")}
          className="bg-gradient-to-b from-[#bfa76a] to-[#7c5c2b] text-white font-bold py-3 px-10 rounded-full text-lg shadow border-4 border-[#e6d3a3] tracking-wider transition-all duration-200 hover:from-[#d6c08a] hover:to-[#a67c3c]"
          style={{ fontFamily: "serif", letterSpacing: "0.05em" }}
        >
          계속 진행하기
        </button>
      </div>
    </div>
  );
};

export default MyPage;
