import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Trophy, Medal, TrendingUp, TrendingDown, Home } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Ranking = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const response = await axios.get("/api/ranking");
      setRankings(response.data);
    } catch (error) {
      toast.error("랭킹을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="text-[#bfa76a]" size={24} />;
      case 2:
        return <Medal className="text-[#a67c3c]" size={24} />;
      case 3:
        return <Medal className="text-[#7c5c2b]" size={24} />;
      default:
        return <span className="text-lg font-bold text-[#a67c3c]" style={{ fontFamily: "Jua, sans-serif" }}>{rank}</span>;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-[#f7e6b6] to-[#e6d3a3] border-[#bfa76a]";
      case 2:
        return "bg-gradient-to-r from-[#f3e7c4] to-[#e6d3a3] border-[#a67c3c]";
      case 3:
        return "bg-gradient-to-r from-[#f7f3e8] to-[#f3e7c4] border-[#7c5c2b]";
      default:
        return "bg-[#f7e6b6] border-[#e6d3a3]";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#bfa76a]"></div>
      </div>
    );
  }

  // 상위 10위만
  const top10 = rankings.slice(0, 10);
  // 내 랭킹(로그인 유저)
  const myRanking = user
    ? rankings.find((r) => r.username === user.username)
    : null;

  return (
    <div className="space-y-6" style={{ fontFamily: "Jua, sans-serif" }}>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: "Jua, sans-serif" }}>🏆 투자 랭킹</h1>
        <p className="text-gray-700" style={{ fontFamily: "Jua, sans-serif" }}>
          다른 플레이어들과 경쟁하며 실력을 확인하세요!
        </p>
      </div>

      <div className="card bg-[#f7e6b6] border-2 border-[#e6d3a3] shadow-lg">
        <div className="flex items-center space-x-2 mb-6">
          <Trophy className="text-[#bfa76a]" size={24} />
          <h2 className="text-xl font-semibold text-[#7c5c2b]" style={{ fontFamily: "Jua, sans-serif" }}>상위 10위</h2>
        </div>

        {top10.length === 0 ? (
          <div className="text-center py-12">
            <Trophy size={48} className="text-[#d6c08a] mx-auto mb-4" />
            <p className="text-[#a67c3c] text-lg" style={{ fontFamily: "Jua, sans-serif" }}>
              아직 랭킹 데이터가 없습니다.
            </p>
            <p className="text-sm text-[#bfa76a] mt-2" style={{ fontFamily: "Jua, sans-serif" }}>
              게임을 시작하고 투자해보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {top10.map((ranking, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getRankColor(
                  ranking.rank
                )}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12">
                      {getRankIcon(ranking.rank)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#7c5c2b]" style={{ fontFamily: "Jua, sans-serif" }}>
                        {ranking.username}
                      </h3>
                      <p className="text-sm text-[#a67c3c]" style={{ fontFamily: "Jua, sans-serif" }}>
                        포트폴리오 가치:{" "}
                        {ranking.total_portfolio_value.toLocaleString()}원
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`flex items-center space-x-2 ${
                        ranking.total_profit_loss_percentage >= 0
                          ? "text-[#3b7c2b]"
                          : "text-[#a63c2b]"
                      }`}
                    >
                      {ranking.total_profit_loss_percentage >= 0 ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                      <span className="text-xl font-bold" style={{ fontFamily: "Jua, sans-serif" }}>
                        {ranking.total_profit_loss_percentage >= 0 ? "+" : ""}
                        {ranking.total_profit_loss_percentage.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-sm text-[#a67c3c] mt-1" style={{ fontFamily: "Jua, sans-serif" }}>수익률 기준</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 내 랭킹 별도 표시 */}
      {myRanking && (
        <div className="card border-4 border-[#bfa76a] bg-[#f3e7c4] mt-8 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12">
              {getRankIcon(myRanking.rank)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#7c5c2b]" style={{ fontFamily: "Jua, sans-serif" }}>
                내 랭킹: {myRanking.rank}위 ({myRanking.username})
              </h3>
              <p className="text-sm text-[#a67c3c]" style={{ fontFamily: "Jua, sans-serif" }}>
                포트폴리오 가치:{" "}
                {myRanking.total_portfolio_value.toLocaleString()}원
              </p>
            </div>
            <div className="flex-1 text-right">
              <div
                className={`flex items-center space-x-2 ${
                  myRanking.total_profit_loss_percentage >= 0
                    ? "text-[#3b7c2b]"
                    : "text-[#a63c2b]"
                }`}
              >
                {myRanking.total_profit_loss_percentage >= 0 ? (
                  <TrendingUp size={20} />
                ) : (
                  <TrendingDown size={20} />
                )}
                <span className="text-xl font-bold" style={{ fontFamily: "Jua, sans-serif" }}>
                  {myRanking.total_profit_loss_percentage >= 0 ? "+" : ""}
                  {myRanking.total_profit_loss_percentage.toFixed(2)}%
                </span>
              </div>
              <p className="text-sm text-[#a67c3c] mt-1" style={{ fontFamily: "Jua, sans-serif" }}>수익률 기준</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-gradient-to-r from-[#f7e6b6] to-[#e6d3a3] border-2 border-[#bfa76a] shadow-lg">
          <h3 className="text-lg font-semibold text-[#7c5c2b] mb-3" style={{ fontFamily: "Jua, sans-serif" }}>
            🥇 1등의 비밀
          </h3>
          <ul className="space-y-2 text-sm text-[#a67c3c]" style={{ fontFamily: "Jua, sans-serif" }}>
            <li>• 분산 투자로 리스크를 줄입니다</li>
            <li>• 뉴스와 시장 동향을 꼼꼼히 분석합니다</li>
            <li>• 감정에 휘둘리지 않고 차분히 판단합니다</li>
            <li>• 장기적인 관점으로 투자합니다</li>
          </ul>
        </div>

        <div className="card bg-gradient-to-r from-[#f3e7c4] to-[#e6d3a3] border-2 border-[#a67c3c] shadow-lg">
          <h3 className="text-lg font-semibold text-[#7c5c2b] mb-3" style={{ fontFamily: "Jua, sans-serif" }}>
            📊 랭킹 시스템
          </h3>
          <ul className="space-y-2 text-sm text-[#a67c3c]" style={{ fontFamily: "Jua, sans-serif" }}>
            <li>• 수익률 기준으로 순위가 결정됩니다</li>
            <li>• 포트폴리오 가치와 현금을 합산합니다</li>
            <li>• 실시간으로 업데이트됩니다</li>
            <li>• 다른 플레이어들과 경쟁하며 실력을 키우세요</li>
          </ul>
        </div>
      </div>

      {/* 홈으로 돌아가기 버튼 */}
      <button
        className="fixed bottom-10 left-10 bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-bold py-4 px-16 rounded-full text-xl shadow-lg transition-all duration-200 z-50 border-4 border-[#e6d3a3]"
        onClick={() => navigate("/")}
        style={{ minWidth: "200px", fontFamily: "Jua, sans-serif" }}
      >
        <Home className="inline-block mr-2" size={24} /> 홈으로 돌아가기
      </button>
    </div>
  );
};

export default Ranking;
