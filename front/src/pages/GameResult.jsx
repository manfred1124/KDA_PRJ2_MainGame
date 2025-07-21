import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Home,
} from "lucide-react";
import { GuideMessageContext } from "../App";
import ChatbotWidget from "../components/ChatbotWidget";

const GUIDE_MSG = "모험의 끝에 도달했네! 그대의 투자 여정을 돌아보게.";

const GameResult = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGif, setShowGif] = useState(true);
  const [gifLoaded, setGifLoaded] = useState(false);
  const { addGuideMessage } = useContext(GuideMessageContext);

  useEffect(() => {
    addGuideMessage(GUIDE_MSG);
    fetchGameResult();
  }, []);

  useEffect(() => {
    if (gifLoaded) {
      // GIF 로드 완료 후 3초 뒤에 GIF 오버레이 숨김
      const timer = setTimeout(() => {
        setShowGif(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [gifLoaded]);

  const fetchGameResult = async () => {
    try {
      // 게임 상태 조회
      const gameResponse = await axios.get("/api/game/state");
      setGameState(gameResponse.data);

      // 랭킹 조회
      const rankingResponse = await axios.get("/api/ranking");
      setRanking(rankingResponse.data);
    } catch (error) {
      console.error("게임 결과 조회 실패:", error);
      toast.error("게임 결과를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
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

        navigate("/roundintro?round=1");
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

          navigate("/roundintro?round=1");
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

  const handleGoHome = () => {
    navigate("/");
  };

  // GIF 오버레이
  const gifOverlay = showGif && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="text-center">
        <img
          src="/result.gif"
          alt="결과 애니메이션"
          className="max-w-full max-h-screen object-contain"
          onLoad={() => setGifLoaded(true)}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#bfa76a]"></div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-[#7c5c2b] mb-4"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            게임 결과를 불러올 수 없습니다.
          </h1>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-[#bfa76a] text-white rounded-full font-bold border-2 border-[#e6d3a3] hover:bg-[#a67c3c] transition-all"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const userRank = ranking.find((r) => r.username === user?.username);
  const rank = userRank ? userRank.rank : "N/A";

  return (
    <div className="min-h-screen p-6" style={{ fontFamily: "Jua, sans-serif" }}>
      {gifOverlay}
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="bg-[#f7e6b6] rounded-2xl shadow-xl p-8 border-4 border-[#bfa76a] w-full max-w-6xl mx-auto relative">
            <div className="text-center">
              <h1
                className="text-4xl font-bold text-[#7c5c2b] mb-4 drop-shadow"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                🎉 게임 완료! 🎉
              </h1>
              <p className="text-xl text-[#a67c3c]" style={{ fontFamily: "Jua, sans-serif" }}>
                {user?.username}님의 투자 여정이 끝났습니다!
              </p>
            </div>
            <div className="absolute top-1/2 right-8 transform -translate-y-1/2">
              <button
                onClick={handleRestartGame}
                className="px-6 py-3 bg-[#bfa76a] hover:bg-[#a67c3c] text-white rounded-full font-bold flex items-center space-x-2 transition-colors border-2 border-[#e6d3a3]"
                style={{ fontFamily: "Jua, sans-serif" }}
              >
                <RefreshCw className="w-5 h-5" />
                <span>새 게임 시작</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 투자 결과 */}
          <div className="bg-[#f7e6b6] rounded-2xl shadow-xl p-8 border-4 border-[#bfa76a]">
            <h2
              className="text-2xl font-bold text-[#7c5c2b] mb-6 flex items-center"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              <Trophy className="mr-3 text-[#bfa76a]" />
              투자 결과
            </h2>

            <div className="space-y-6">
              {/* 총 수익률 */}
              <div className="bg-[#f3e7c4] rounded-xl p-6 border-2 border-[#e6d3a3]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a67c3c]">총 수익률</p>
                    <p
                      className={`text-3xl font-bold ${
                        gameState.total_profit_percentage >= 0
                          ? "text-[#3b7c2b]"
                          : "text-[#a63c2b]"
                      }`}
                    >
                      {gameState?.total_profit_percentage >= 0 ? "+" : ""}
                      {gameState?.total_profit_percentage?.toFixed(2) || "0.00"}
                      %
                    </p>
                  </div>
                  {gameState.total_profit_percentage >= 0 ? (
                    <TrendingUp className="text-[#3b7c2b] text-4xl" />
                  ) : (
                    <TrendingDown className="text-[#a63c2b] text-4xl" />
                  )}
                </div>
              </div>

              {/* 총 수익 */}
              <div className="bg-[#f3e7c4] rounded-xl p-6 border-2 border-[#e6d3a3]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a67c3c]">총 수익</p>
                    <p
                      className={`text-2xl font-bold ${
                        gameState.total_profit >= 0
                          ? "text-[#3b7c2b]"
                          : "text-[#a63c2b]"
                      }`}
                    >
                      {gameState?.total_profit >= 0 ? "+" : ""}
                      {gameState?.total_profit?.toLocaleString() || "0"}원
                    </p>
                  </div>
                  <DollarSign className="text-[#bfa76a] text-3xl" />
                </div>
              </div>

              {/* 최종 자산 */}
              <div className="bg-[#f3e7c4] rounded-xl p-6 border-2 border-[#e6d3a3]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a67c3c]">최종 자산</p>
                    <p className="text-2xl font-bold text-[#7c5c2b]">
                      {(
                        (gameState?.total_balance || 0) +
                        (gameState?.total_portfolio_value || 0)
                      ).toLocaleString()}
                      원
                    </p>
                  </div>
                  <span className="text-3xl">🏦</span>
                </div>
              </div>

              {/* 미실현 손익 */}
              <div className="bg-[#f3e7c4] rounded-xl p-6 border-2 border-[#e6d3a3]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a67c3c]">미실현 손익</p>
                    <p
                      className={`text-2xl font-bold ${
                        (gameState?.total_profit_loss || 0) >= 0
                          ? "text-[#3b7c2b]"
                          : "text-[#a63c2b]"
                      }`}
                    >
                      {(gameState?.total_profit_loss || 0) >= 0 ? "+" : ""}
                      {gameState?.total_profit_loss?.toLocaleString() || "0"}원
                    </p>
                  </div>
                  <span className="text-3xl">💰</span>
                </div>
              </div>
            </div>
          </div>

          {/* 랭킹 */}
          <div className="bg-[#f7e6b6] rounded-2xl shadow-xl p-8 border-4 border-[#bfa76a]">
            <h2
              className="text-2xl font-bold text-[#7c5c2b] mb-6 flex items-center"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              <Trophy className="mr-3 text-[#bfa76a]" />
              전체 랭킹
            </h2>

            <div className="space-y-4">
              {ranking.slice(0, 5).map((rankItem, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    rankItem.username === user?.username
                      ? "bg-[#f3e7c4] border-[#bfa76a]"
                      : "bg-[#f7f3e8] border-[#e6d3a3]"
                  } ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-100 border-yellow-300"
                      : index === 1
                      ? "bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 border-gray-300"
                      : index === 2
                      ? "bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100 border-orange-300"
                      : ""
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg border-2 border-yellow-300"
                          : index === 1
                          ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg border-2 border-gray-200"
                          : index === 2
                          ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg border-2 border-orange-300"
                          : "bg-[#f3e7c4] text-[#7c5c2b]"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p
                        className={`font-semibold ${
                          rankItem.username === user?.username
                            ? "text-[#7c5c2b]"
                            : "text-[#a67c3c]"
                        }`}
                      >
                        {rankItem.username}
                        {rankItem.username === user?.username && " (나)"}
                      </p>
                      <p className="text-sm text-[#a67c3c]">
                        수익률:{" "}
                        {rankItem.total_profit_loss_percentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#7c5c2b]">
                      {rankItem.total_portfolio_value.toLocaleString()}원
                    </p>
                  </div>
                </div>
              ))}
              {userRank && rank > 5 && (
                <div className="mt-6 p-4 bg-[#f3e7c4] rounded-lg border-2 border-[#bfa76a]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[#f3e7c4] text-[#7c5c2b]">
                        {rank}
                      </div>
                      <div>
                        <p className="font-semibold text-[#7c5c2b]">
                          {userRank.username} (나)
                        </p>
                        <p className="text-sm text-[#a67c3c]">
                          수익률:{" "}
                          {userRank.total_profit_loss_percentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#7c5c2b]">
                        {userRank.total_portfolio_value.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-center space-x-4 mt-8">
          {/* 결과보기 버튼 제거됨 */}
        </div>
      </div>
    </div>
  );
};

export default GameResult;
