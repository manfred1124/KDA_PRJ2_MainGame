import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GuideMessageContext } from "../App";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAudio } from "../contexts/AudioContext";

// CSS 애니메이션 스타일
const fadeInStyle = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.8s ease-out;
  }
`;

const RoundIntro = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentRound, setCurrentRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addGuideMessage } = useContext(GuideMessageContext);
  const { playAudio } = useAudio();

  // 라운드별 효과음 파일 매핑
  const getRoundSound = (round) => {
    const soundFiles = {
      1: "/Take1-6_지금의 시장은 안개 속 전장과도 같소. 신중하게 정보를 살피시오._2025-07-19.wav",
      2: "/Take1-10_적의 함정일 수도 있소. 탐욕은 항상 덫이 되지_2025-07-19.wav",
      3: "/Take1-15_아주 좋소. 승패는 계속되니 중심을 잃지 마시오._2025-07-19.wav",
    };
    return soundFiles[round] || soundFiles[1];
  };

  // 효과음 재생 함수
  const playRoundSound = (round) => {
    const soundSrc = getRoundSound(round);
    playAudio(soundSrc);
  };

  // 라운드별 용사 조언
  const getHeroAdvice = (round) => {
    const adviceData = {
      1: "허허, 1라운드에서는 차트 분석 기초 마스터에 집중하시게!\n\n차트 정보를 적절히 활용하여 현명한 투자 결정을 내려서, 공포의 곰을 물리치시길 바라네.\n\n아직 시작이니 천천히 배워가시게!",
      2: "허허, 2라운드에서는 뉴스와 차트 종합 분석에 집중하시게!\n\n차트와 뉴스 정보를 적절히 활용하여 현명한 투자 결정을 내려서, 공포의 곰을 물리치시길 바라네.\n\n이제 절반을 넘어왔으니 더욱 신중하게 접근하시게!",
      3: "허허, 3라운드에서는 완전한 투자 분석 마스터에 집중하시게!\n\n차트와 뉴스, 재무정보를 적절히 활용하여 현명한 투자 결정을 내리시고, 공포의 곰을 물리치시길 바라네.\n\n거의 다 왔으니 마지막까지 집중하시게!",
    };
    return adviceData[round] || adviceData[1];
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    // URL 파라미터에서 라운드 정보 가져오기
    const urlParams = new URLSearchParams(location.search);
    const roundFromUrl = urlParams.get("round");

    if (roundFromUrl) {
      setCurrentRound(parseInt(roundFromUrl));
    } else if (user?.current_round_idx !== undefined) {
      // current_round_idx는 0-based이므로 1을 더해서 표시
      setCurrentRound(user.current_round_idx + 1);
    } else {
      // 기본값은 1라운드
      setCurrentRound(1);
    }

    setLoading(false);
  }, [location.search, user]);

  // 라운드가 변경될 때 효과음 재생 및 용사의 조언 표시
  useEffect(() => {
    if (!loading) {
      // 라운드별 효과음 재생 (0.5초 후)
      setTimeout(() => {
        playRoundSound(currentRound);
      }, 500);

      const heroAdvice = getHeroAdvice(currentRound);
      // 1초 후에 용사의 조언을 표시
      setTimeout(() => {
        addGuideMessage(heroAdvice);
      }, 1000);
    }
  }, [currentRound, loading, addGuideMessage]);

  // 라운드별 설명 데이터
  const getRoundInfo = (round) => {
    const roundData = {
      1: {
        title: "라운드 1 - 차트 분석의 기초",
        subtitle: "차트만 보고 투자해보기",
        background:
          "첫 번째 라운드에서는 주식 차트만을 보고 투자하는 방법을 배워보겠습니다. 차트의 기본 패턴, 이동평균선, 거래량 등을 분석하여 주가의 움직임을 예측해보세요.",
        keyEvents: [
          "차트 패턴 분석 (지지선, 저항선)",
          "이동평균선 활용법",
          "거래량과 가격의 관계",
          "기술적 지표 해석",
          "매수/매도 타이밍 포착",
        ],
        investmentFocus:
          "이 라운드에서는 순수하게 차트 분석만으로 투자 결정을 내려야 합니다. 뉴스나 재무정보는 참고하지 말고, 차트의 기술적 신호에 집중해보세요.",
        period: "1라운드",
        roundObjective: "차트 분석 기초 마스터",
        tips: [
          "지지선과 저항선을 먼저 찾아보세요",
          "거래량이 증가하는 구간을 주목하세요",
          "이동평균선의 교차점을 활용하세요",
          "과매수/과매도 구간을 파악하세요",
        ],
      },
      2: {
        title: "라운드 2 - 뉴스와 차트의 조화",
        subtitle: "차트와 뉴스를 함께 분석하기",
        background:
          "두 번째 라운드에서는 차트 분석에 뉴스 분석을 더해보겠습니다. 시장의 뉴스와 이벤트가 주가에 미치는 영향을 파악하고, 차트와 뉴스를 종합적으로 분석해보세요.",
        keyEvents: [
          "뉴스 이벤트의 시장 영향 분석",
          "차트와 뉴스의 연관성 파악",
          "뉴스 발표 전후 차트 변화 관찰",
          "섹터별 뉴스 영향도 분석",
          "글로벌 이벤트의 국내 시장 영향",
        ],
        investmentFocus:
          "이제 차트 분석에 뉴스 분석을 더해 더 정확한 투자 판단을 내릴 수 있습니다. 뉴스의 시장 영향력을 파악하고 차트와 연계해서 분석해보세요.",
        period: "2라운드",
        roundObjective: "뉴스와 차트 종합 분석",
        tips: [
          "뉴스 발표 시간을 체크하세요",
          "섹터별 뉴스 영향도를 분석하세요",
          "글로벌 뉴스의 국내 영향력을 파악하세요",
          "차트 패턴과 뉴스의 연관성을 찾아보세요",
        ],
      },
      3: {
        title: "라운드 3 - 완전한 투자 분석",
        subtitle: "차트, 뉴스, 재무정보 종합 분석",
        background:
          "마지막 라운드에서는 차트, 뉴스, 재무정보를 모두 활용한 완전한 투자 분석을 해보겠습니다. 기업의 재무상태, 성장성, 수익성을 파악하고 이를 차트와 뉴스와 함께 종합 분석해보세요.",
        keyEvents: [
          "재무제표 분석 (손익계산서, 재무상태표)",
          "기업 가치 평가 지표 활용",
          "차트, 뉴스, 재무정보 종합 분석",
          "장기 투자 관점에서의 분석",
          "리스크 관리와 포트폴리오 구성",
        ],
        investmentFocus:
          "이제 모든 분석 도구를 활용하여 가장 정확하고 체계적인 투자 결정을 내릴 수 있습니다. 단기적 차트 분석과 장기적 재무 분석을 조화롭게 활용해보세요.",
        period: "3라운드",
        roundObjective: "완전한 투자 분석 마스터",
        tips: [
          "재무제표의 핵심 지표를 파악하세요",
          "기업의 성장성과 수익성을 평가하세요",
          "차트, 뉴스, 재무를 종합적으로 분석하세요",
          "장기적 관점에서 투자 가치를 판단하세요",
        ],
      },
    };

    return roundData[round] || roundData[1];
  };

  const roundInfo = getRoundInfo(currentRound);

  const handleStartRound = () => {
    // 오디오 정지
    // 라운드에 따라 적절한 페이지로 이동
    if (currentRound === 1) {
      navigate("/news");
    } else {
      navigate("/news");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ fontFamily: "Jua, sans-serif" }}
    >
      <style>{fadeInStyle}</style>
      <div className="container mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1
            className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            {roundInfo.title}
          </h1>
          <p
            className="text-lg md:text-xl text-white mb-3"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            {roundInfo.subtitle}
          </p>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-4xl mx-auto">
          {/* 용사의 조언 */}
          <div className="bg-white rounded-2xl shadow-xl p-5 mb-5 border-4 border-[#bfa76a] animate-fade-in">
            <h2
              className="text-lg font-bold text-[#7c5c2b] mb-3 flex items-center justify-center"
              style={{ fontFamily: "Jua, sans-serif", fontSize: "1.5rem" }}
            >
              🗡️ 용사의 조언
            </h2>
            <p
              className="text-[#7c5c2b] text-lg leading-relaxed mb-4 text-center whitespace-pre-line"
              style={{ fontFamily: "serif" }}
            >
              {currentRound === 1 &&
                `1라운드에서는 차트 분석 기초 마스터에 집중하시게!\n차트 정보를 적절히 활용하여 현명한 투자 결정을 내리고\n공포의 곰을 물리치시길 바라네.\n아직 시작이니 천천히 배워가시게!`}
              {currentRound === 2 &&
                `2라운드에서는 뉴스와 차트 종합 분석에 집중하시게!\n차트와 뉴스 정보를 적절히 활용하여 현명한 투자 결정을 내리고\n공포의 곰을 물리치시길 바라네.\n이제 절반을 넘어가셨으니 더욱 신중하게 접근하시게!`}
              {currentRound === 3 &&
                `3라운드에서는 완전한 투자 분석 마스터에 집중하시게!\n차트와 뉴스, 재무정보를 적절히 활용하여 현명한 투자 결정을 내리고\n공포의 곰을 물리치시길 바라네.\n거의 다 왔으니 마지막까지 집중하시게!`}
            </p>

            {/* 팁 섹션 */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-[#e6d3a3]">
              <h3
                className="text-lg font-bold text-[#7c5c2b] mb-3"
                style={{ fontFamily: "Jua, sans-serif", fontSize: "1.5rem" }}
              >
                💡 실전 팁
              </h3>
              <div className="grid gap-3">
                {roundInfo.tips.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span
                      className="text-[#bfa76a] font-bold"
                      style={{ fontFamily: "Jua, sans-serif" }}
                    >
                      •
                    </span>
                    <p
                      className="text-[#7c5c2b] text-lg"
                      style={{
                        fontFamily: "Jua, sans-serif",
                        fontSize: "1.25rem",
                      }}
                    >
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 시작 버튼 */}
          <div className="text-center mt-6 animate-fade-in">
            <button
              onClick={handleStartRound}
              className="bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-bold py-3 px-10 rounded-full text-lg shadow-lg transition-all duration-200 border-4 border-[#e6d3a3] transform hover:scale-105"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              {currentRound === 1 ? "게임 시작하기" : "라운드 진행하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundIntro;
