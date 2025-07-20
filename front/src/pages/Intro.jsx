import React from "react";

const introMessages = [
  "용사여, 모의투자 게임에 온 것을 환영하네!<br />이곳은 투자 모험의 세계라네.<br />나와 함께 투자 영웅이 되어보지 않겠는가?",
  "이 게임에서는 다양한 주식과 경제 뉴스를 경험할 수 있네.<br />실전처럼 투자하며 실력을 키워보게.",
  "준비가 되었다면, 다음 버튼을 눌러 모험을 시작하게나!"
];

export default function Intro({ introIndex, handleNextIntro, heroIdx, heroImage1, heroImage2 }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 48 }}>
        <div
          style={{
            background: "#fffbe6",
            borderRadius: 32,
            boxShadow: "0 8px 32px #bfa76a55",
            padding: "2rem",
            width: 600,
            height: 350,
            textAlign: "center",
            position: "relative",
            fontFamily: "Jua, sans-serif",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            transition: "all 0.3s ease",
          }}
        >
          {/* Speech bubble tail */}
          <div
            style={{
              position: "absolute",
              right: -40,
              bottom: 48,
              width: 0,
              height: 0,
              borderTop: "28px solid transparent",
              borderBottom: "28px solid transparent",
              borderLeft: "40px solid #fffbe6",
              filter: "drop-shadow(2px 2px 2px #bfa76a33)",
            }}
          />
          <div
            style={{
              fontSize: 28,
              color: "#7c5c2b",
              marginBottom: 36,
              lineHeight: 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: introMessages[introIndex] }}
          />
          <button
            onClick={handleNextIntro}
            style={{
              padding: "1.1rem 3rem",
              fontSize: "1.3rem",
              fontWeight: "normal",
              backgroundColor: "#001E5A",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
              transition: "transform 0.2s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.transform = "scale(1)")
            }
          >
            {introIndex < introMessages.length - 1 ? "다음" : "게임 시작하기 →"}
          </button>
        </div>
        {/* Hero image */}
        <img
          src={heroIdx === 0 ? heroImage1 : heroImage2}
          alt="hero"
          style={{
            width: 220,
            height: 220,
            objectFit: "contain",
            display: "block",
            marginBottom: 0,
          }}
        />
      </div>
    </div>
  );
} 