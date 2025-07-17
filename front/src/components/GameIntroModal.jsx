import React from "react";
import heroImage from "../assets/mainlogo.png";

const GameIntroModal = ({ onClose }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.45)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "#fffbe6",
        borderRadius: 24,
        boxShadow: "0 8px 32px #bfa76a55",
        padding: "2.5rem 2.5rem 2rem 2.5rem",
        maxWidth: 420,
        minWidth: 320,
        textAlign: "center",
      }}
    >
      <img
        src={heroImage}
        alt="hero"
        style={{ width: 180, margin: "0 auto 1.5rem auto", display: "block" }}
      />
      <div
        style={{
          fontSize: 22,
          color: "#7c5c2b",
          marginBottom: 24,
          fontFamily: "serif",
        }}
      >
        용사여, 모의투자 게임에 온 것을 환영하네!
        <br />
        이곳은 투자 모험의 세계라네.
        <br />
        나와 함께 투자 영웅이 되어보지 않겠는가?
      </div>
      <button
        onClick={onClose}
        style={{
          padding: "0.8rem 2.5rem",
          fontSize: "1.2rem",
          fontWeight: "bold",
          backgroundColor: "#001E5A",
          color: "white",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
          boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
          transition: "transform 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        게임 시작하기 →
      </button>
    </div>
  </div>
);

export default GameIntroModal;
