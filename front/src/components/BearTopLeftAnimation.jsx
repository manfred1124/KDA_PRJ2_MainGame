import React, { useState, useEffect } from "react";

const BearTopLeftAnimation = ({ fallAndSlideOut = false, onGone }) => {
  const [currentBear, setCurrentBear] = useState(0);
  const [falling, setFalling] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (fallAndSlideOut && !falling && !gone) {
      setTimeout(() => setFalling(true), 200); // slight delay for effect
      setTimeout(() => {
        setGone(true);
        if (onGone) onGone();
      }, 1700); // match transition duration
    }
  }, [fallAndSlideOut, falling, gone, onGone]);

  useEffect(() => {
    if (!fallAndSlideOut) {
      const interval = setInterval(() => {
        setCurrentBear((prev) => (prev + 1) % 2);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [fallAndSlideOut]);

  if (gone) return null;

  const bearImages = ["/bear3.png", "/bear4.png"];
  const bearImage = fallAndSlideOut ? bearImages[0] : bearImages[currentBear];

  return (
    <div
      className="fixed z-20"
      style={{
        top: falling ? "10vh" : "2%",
        left: falling ? "-30vw" : "-2%",
        transition:
          "top 0.7s cubic-bezier(.4,2,.6,1), left 1s cubic-bezier(.4,2,.6,1)",
        pointerEvents: "none",
      }}
    >
      <img
        src={bearImage}
        alt="Bear"
        style={{
          width: "20vw",
          height: "20vw",
          transform: falling ? "rotate(-90deg)" : "none",
          transition: "transform 0.7s cubic-bezier(.4,2,.6,1)",
          display: "block",
        }}
        className="object-contain"
      />
    </div>
  );
};

export default BearTopLeftAnimation;
