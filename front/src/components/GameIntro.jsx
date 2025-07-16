import React from "react";
import { useNavigate } from "react-router-dom"; // ✅ 추가
import "./GameIntro.css";

import bgImage from "../assets/start2.jpg";
import boardImage1 from "../assets/board1.png";
import boardImage2 from "../assets/board2.png";
import heroImage from "../assets/mainlogo.png"; // 영웅 이미지

const GameIntro = ({ onStart }) => {
  const navigate = useNavigate(); // ✅ 라우터 이동 훅

  const handleStart = () => {
    if (onStart) {
      onStart();
    } else {
      navigate("/login"); // 로그인 페이지로 이동
    }
  };

  return (
    <div
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0",
      }}
    >
      {/* board2 영역 */}
      <div
        style={{
          position: "relative",
          width: "35%",
          maxWidth: "500px",
          marginBottom: "-10px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#222",
            fontSize: "2.5rem",
            fontWeight: "bold",
            textShadow: "1px 1px 3px rgba(0, 0, 0, 0.6)",
            zIndex: 2,
          }}
        >
          게임 설명
        </div>
        <img
          src={boardImage2}
          alt="board2"
          style={{
            width: "100%",
            height: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* board1 + 텍스트 & 영웅 이미지 */}
      <div
        style={{
          position: "relative",
          width: "60%",
          maxWidth: "800px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "85%",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            zIndex: 2,
          }}
        >
          <img
            src={heroImage}
            alt="hero"
            className="fade-up"
            style={{
              width: "250px",
              height: "auto",
              objectFit: "contain",
              flexShrink: 0,
              marginTop: "1.7rem",
            }}
          />

          <div
            style={{
              flex: 1,
              color: "#222",
              fontSize: "1.1rem",
              fontWeight: "500",
              textAlign: "left",
              lineHeight: "1.7",
              whiteSpace: "pre-line",
            }}
          >
            <strong style={{ fontSize: "1.5rem", color: "#222" }}>
              나와 함께 투자 영웅이 되어보자!
            </strong>
            {"\n\n"}이 게임은 실제 뉴스와 주식 정보를 기반으로, <br />
            직접 투자 결정을 내려 수익률을 올리는 <br />
            모의 주식 투자 게임이야.
            {"\n\n"}
            📆 총 10라운드 (2020.01 ~ 2024.12){"\n"}
            📰 시장 분석 → 섹터 선택 → 종목 선택{"\n"}
            💬 종목 뉴스 + 챗봇의 보조지표 제공{"\n"}
            📈 매수/매도 후 수익률 확인{"\n"}
            🏆 최종 수익률 상위 10%에게 투자 지원금 제공
          </div>
        </div>

        <img
          src={boardImage1}
          alt="board1"
          style={{
            width: "100%",
            height: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />

        {/* ✅ 버튼 추가 */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={handleStart}
            style={{
              padding: "0.8rem 2rem",
              fontSize: "1.2rem",
              fontWeight: "bold",
              backgroundColor: "#001E5A",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
              transition: "transform 0.2s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            게임 시작하기 →
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameIntro;
