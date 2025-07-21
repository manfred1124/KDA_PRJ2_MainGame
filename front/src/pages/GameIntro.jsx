import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GuideMessageContext } from "../App";
import { Play } from "lucide-react";
import pathOfHeroLogo from "../assets/pathofhero.png";
import { useAudio } from "../contexts/AudioContext";

// 다양한 환영 메시지 배열
const WELCOME_MESSAGES = [
  "허허, 용사여!\n투자 모험의 세계에 온 것을 환영하네!\n과인과 함께 현명한 투자자가 되어보지 않겠는가?",

  "그대가 투자의 길에 발을 들여놓으셨구나!\n이곳은 위대한 투자 영웅이 탄생하는 곳이라네!\n과인의 조언을 참고하시면 좋겠네!",

  "투자 시뮬레이션의 세계로 오신 것을 환영하네!\n이곳에서 그대의 투자 지혜를 키워보시게!",

  "투자 모험의 세계에 발을 들여놓으셨구나!\n과인과 함께 현명한 투자 전략을 세워보시게!",

  "허허, 용사여!\n이곳은 투자의 지혜를 배우는 성소라네!\n그대가 신중하게 판단하시면 반드시 성공하리라!",

  "그대가 투자의 길을 선택하신 것이 현명하구나!\n이곳에서 투자의 비밀을 배우고 영웅이 되어보시게!",

  "투자 시뮬레이션의 세계에 온 것을 환영하네!\n과인의 조언을 참고하시면 좋겠네!",

  "투자 모험의 세계로 오신 것을 환영하네!\n이곳에서 그대의 투자 실력을 향상시켜보시게!",
];

// 랜덤하게 환영 메시지 선택
const getRandomWelcomeMessage = () => {
  const randomIndex = Math.floor(Math.random() * WELCOME_MESSAGES.length);
  return WELCOME_MESSAGES[randomIndex];
};

const GUIDE_MSG = getRandomWelcomeMessage();

const GameIntro = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addGuideMessage } = useContext(GuideMessageContext);
  const { playAudio } = useAudio();

  useEffect(() => {
    window.scrollTo(0, 0);
    addGuideMessage(GUIDE_MSG);
    // 홈페이지 진입 시 오디오 재생
    playAudio("/Take1-9_감정을 뒤로하고 근거에 집중하시오._2025-07-19.wav");
  }, [addGuideMessage, playAudio]);

  const handleStartGame = () => {
    // 게임 시작 이벤트 발생 (BGM 재생 트리거)
    window.dispatchEvent(new CustomEvent("gameStart"));

    // 인트로 페이지를 본 것으로 표시
    localStorage.setItem("hasSeenIntro", "true");

    // 사용자의 현재 라운드 정보 확인
    const currentRound = user?.current_round_idx
      ? user.current_round_idx + 1
      : 1;

    // 라운드 소개 페이지로 이동 (사용자의 현재 라운드로)
    navigate(`/roundintro?round=${currentRound}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 news-page">
      {/* 로고 섹션 */}
      <div className="text-center -mb-16">
        <div className="flex justify-center -mb-8">
          <img
            src={pathOfHeroLogo}
            alt="Path of Hero"
            className="w-[480px] h-[240px] md:w-[576px] md:h-[288px] lg:w-[750px] lg:h-[375px] object-contain drop-shadow-2xl"
            onError={(e) => {
              // 로고가 없으면 텍스트로 대체
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "block";
            }}
          />
          <h1
            className="text-6xl md:text-8xl lg:text-9xl font-bold text-[#7c5c2b] drop-shadow-lg"
            style={{ display: "none" }}
          >
            Path of Hero
          </h1>
        </div>
      </div>

      {/* 환영 메시지 */}
      <div className="text-center mb-4">
        <div
          className="inline-block bg-white bg-opacity-90 border-4 border-[#7c5c2b] rounded-2xl p-6 shadow-xl max-w-4xl mx-auto"
          style={{ fontFamily: "Jua, sans-serif" }}
        >
          <h2 className="text-xl md:text-2xl font-bold text-[#7c5c2b] mb-4 welcome-message-serif">
            {user ? (
              <>
                <span className="text-[#1e3a8a]">{user.username}</span> 용사여,
                이제
                <br />
                전장은 숫자로 싸우는 곳이 되었노라.
              </>
            ) : (
              "용사여, 투자 모험의 세계에 온 것을 환영하네!"
            )}
          </h2>
          <p className="text-lg text-[#7c5c2b] leading-relaxed welcome-message-serif">
            과인과 함께 현명한 투자자가 되어보지 않겠는가?
            <br />
            공포의 곰을 꿰뚫고, 승리의 깃발을 꽂을 차례다.
          </p>
        </div>
      </div>

      {/* 게임 버튼들 */}
      <div className="text-center flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          className="bg-[#7c5c2b] hover:bg-[#a67c3c] text-white font-normal py-4 px-12 rounded-full text-xl shadow-lg transition-all duration-200 border-4 border-[#e6d3a3] flex items-center space-x-3 group"
          onClick={handleStartGame}
        >
          <Play
            className="text-white group-hover:scale-110 transition-transform duration-200"
            size={24}
          />
          <span>게임 시작하기</span>
        </button>

        <button
          className="bg-[#bfa76a] hover:bg-[#a67c3c] text-white font-normal py-4 px-12 rounded-full text-xl shadow-lg transition-all duration-200 border-4 border-[#e6d3a3] flex items-center space-x-3 group"
          onClick={() =>
            addGuideMessage(
              "허허, 게임 설명을 궁금해하시는구나!\n\n이 게임은 2020년부터 2024년까지의 실제 주식 데이터를 기반으로 한 투자 시뮬레이션 게임이라네.\n\n분기별로 나뉜 라운드를 진행하며, 각 라운드마다 새로운 뉴스와 시장 상황이 제공되네.\n\n뉴스를 분석하고 전략적으로 포트폴리오를 구성하여 다른 플레이어들과 경쟁하며 투자 실력을 향상시켜보시게!\n\n현명한 투자로 공포의 곰을 물리치고 과인의 조언도 참고하시면 좋겠네!"
            )
          }
        >
          <span className="text-2xl">📖</span>
          <span>게임 설명</span>
        </button>
      </div>
    </div>
  );
};

export default GameIntro;
