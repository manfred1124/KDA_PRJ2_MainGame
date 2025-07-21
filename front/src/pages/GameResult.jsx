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
  const [overlayHeight, setOverlayHeight] = useState('100vh');

  useEffect(() => {
    addGuideMessage(GUIDE_MSG);
    fetchGameResult();
  }, []);

  useEffect(() => {
    if (gifLoaded) {
      // GIF 로드 완료 후 5초 뒤에 GIF 오버레이 숨김
      const timer = setTimeout(() => {
        setShowGif(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [gifLoaded]);

  useEffect(() => {
    if (showGif) {
      setOverlayHeight(`${Math.max(document.body.scrollHeight, window.innerHeight)}px`);
    }
  }, [showGif]);

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

  // 사용자 랭킹 정보 계산
  const userRank = ranking.find((r) => r.username === user?.username);
  const rank = userRank ? userRank.rank : "N/A";
  const isFirstPlace = rank === 1;

  const INITIAL_ASSET = 10000000;
  const finalAsset = userRank?.total_portfolio_value || 0;
  const totalReturnPercent = ((finalAsset - INITIAL_ASSET) / INITIAL_ASSET) * 100;

  // GIF 오버레이
  const gifOverlay = showGif && (
    <>
      {/* 블러 배경만 전체 덮기 */}
      <div
        className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-black bg-opacity-30 pointer-events-none"
        style={{
          minHeight: '1300px',
          height: '100%',
          width: '100%',
          minWidth: '100vw',
        }}
      />
      {/* 캐릭터/애니메이션은 중앙에 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="text-center relative transform -translate-x-16">
          <img
            src="/result.gif"
            alt="결과 애니메이션"
            className="max-w-full max-h-screen object-contain"
            onLoad={() => setGifLoaded(true)}
          />
          {/* 장군의 말풍선 - 1등과 나머지 구분 */}
          <div className="absolute top-1/3 right-0 transform translate-x-full -translate-y-1/2">
            <div className="bg-white rounded-2xl p-4 shadow-2xl border-4 border-[#bfa76a] max-w-xs">
              <div className="text-center">
                <p className="text-lg font-bold text-[#7c5c2b] text-center" style={{ fontFamily: "Jua, sans-serif" }}>
                  {isFirstPlace ? (
                    <>
                      "공포의 곰조차 그대의 앞길을<br/>
                      막지 못했도다<br/>
                      전장을 지배한 이는 단 한 사람<br/>
                      영광의 1등, 바로 그대다!"
                    </>
                  ) : (
                    <>
                      "전장을 완주한 모두가 전사이니라.<br/>
                      검을 거두지 말라, 전사여.<br/>
                      다음 싸움이 곧 시작될 것이다."
                    </>
                  )}
                </p>
              </div>
              {/* 말풍선 꼬리 - 왼쪽으로 향하도록 수정 */}
              <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-[#bfa76a]"></div>
            </div>
          </div>
        </div>
      </div>
    </>
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
              {/* 1위 달성 시 장군의 특별 메시지 */}
              {isFirstPlace && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-300">
                  <p className="text-lg font-bold text-[#7c5c2b]" style={{ fontFamily: "Jua, sans-serif" }}>
                    "공포의 곰조차 그대의 앞길을 막지 못했도다.<br/>
                    전장을 지배한 이는 단 한 사람—영광의 1등, 바로 그대다!"
                  </p>
                  <div className="mt-4 text-center">
                    <a 
                      href="https://www3.kiwoom.com/h/main" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block px-6 py-3 bg-[#3b7c2b] hover:bg-[#2d5a1f] text-white rounded-full font-bold border-2 border-[#2d5a1f] transition-colors"
                      style={{ fontFamily: "Jua, sans-serif" }}
                    >
                      투자금 받으러 가기
                    </a>
                  </div>
                </div>
              )}
              {/* 1위가 아닐 때의 메시지 */}
              {!isFirstPlace && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-300">
                  <p className="text-lg font-bold text-[#7c5c2b]" style={{ fontFamily: "Jua, sans-serif" }}>
                    "전장을 완주한 모두가 전사이니라.<br/>
                    검을 거두지 말라, 전사여.<br/>
                    다음 싸움이 곧 시작될 것이다."
                  </p>
                  <div className="mt-4 text-center">
                    <a 
                      href="https://www3.kiwoom.com/h/main" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block px-6 py-3 bg-[#3b7c2b] hover:bg-[#2d5a1f] text-white rounded-full font-bold border-2 border-[#2d5a1f] transition-colors"
                      style={{ fontFamily: "Jua, sans-serif" }}
                    >
                      투자금 받으러 가기
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="absolute top-1/4 right-8 transform -translate-y-1/2">
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
                        totalReturnPercent >= 0 ? "text-[#e53a40]" : "text-[#2563eb]"
                      }`}
                    >
                      {totalReturnPercent >= 0 ? "+" : ""}
                      {isNaN(totalReturnPercent) ? "0.00" : totalReturnPercent.toFixed(2)}%
                    </p>
                  </div>
                  {totalReturnPercent >= 0 ? (
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
                        gameState.total_profit >= 0 ? "text-[#e53a40]" : "text-[#2563eb]"
                      }`}
                    >
                      {gameState?.total_profit >= 0 ? "+" : ""}
                      {gameState?.total_profit?.toLocaleString() || "0"}원
                    </p>
                  </div>
                  <DollarSign className="text-[#bfa76a] text-3xl" />
                </div>
              </div>

              {/* 미실현 손익 */}
              <div className="bg-[#f3e7c4] rounded-xl p-6 border-2 border-[#e6d3a3]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a67c3c]">미실현 손익</p>
                    <p
                      className={`text-2xl font-bold ${
                        (gameState?.total_profit_loss || 0) >= 0 ? "text-[#e53a40]" : "text-[#2563eb]"
                      }`}
                    >
                      {(gameState?.total_profit_loss || 0) >= 0 ? "+" : ""}
                      {gameState?.total_profit_loss?.toLocaleString() || "0"}원
                    </p>
                  </div>
                  <span className="text-3xl">💰</span>
                </div>
              </div>

              {/* 최종 자산 */}
              <div className="bg-[#f3e7c4] rounded-xl p-6 border-2 border-[#e6d3a3]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a67c3c]">최종 자산</p>
                    <p className="text-2xl font-bold text-[#7c5c2b]">
                      {(userRank?.total_portfolio_value || 0).toLocaleString()}원
                    </p>
                  </div>
                  <span className="text-3xl">🏦</span>
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
              {ranking.slice(0, 5).map((rankItem, index) => {
                const INITIAL_ASSET = 10000000;
                const percent = ((rankItem.total_portfolio_value - INITIAL_ASSET) / INITIAL_ASSET) * 100;
                return (
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
                         수익률: {percent >= 0 ? "+" : ""}{isNaN(percent) ? "0.00" : percent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#7c5c2b]">
                        {rankItem.total_portfolio_value.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                );
              })}
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
                         수익률: {(() => {
                           const percent = ((userRank.total_portfolio_value - 10000000) / 10000000) * 100;
                           return `${percent >= 0 ? "+" : ""}${isNaN(percent) ? "0.00" : percent.toFixed(2)}%`;
                         })()}
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
