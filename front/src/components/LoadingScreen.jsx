import React, { useState, useEffect } from "react";
import walking1 from "../assets/logo1.png";
import walking2 from "../assets/logo2.png";
import "./LoadingScreen.css";

const LoadingScreen = () => {
  const [frame, setFrame] = useState(0);
  const frames = [walking1, walking2];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 500); // 0.5초 간격으로 이미지 전환

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-wrapper">
      <p className="loading-text">loading...</p>
      <img
        src={frames[frame]}
        alt="loading character"
        className="loading-image"
      />
    </div>
  );
};

export default LoadingScreen;
