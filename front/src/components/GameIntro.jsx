import React from "react";

const GameIntro = ({ onStart }) => (
  <div
    style={{
      background: "#fffbe6",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <img
      src={require("../assets/mainlogo.png")}
      alt="hero"
      style={{ width: 200 }}
    />
    <div style={{ fontSize: 24, color: "#7c5c2b", margin: 32 }}>
      용사여, 모의투자 게임에 온 것을 환영하네!
    </div>
    <button onClick={onStart} style={{ fontSize: 20, padding: "1rem 2rem" }}>
      게임 시작하기
    </button>
  </div>
);

export default GameIntro;
