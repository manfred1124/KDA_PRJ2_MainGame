import React, { useEffect, useState } from "react";

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showGlow, setShowGlow] = useState(false);

  useEffect(() => {
    const updatePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const hideCursor = () => setIsVisible(false);
    const showCursor = () => setIsVisible(true);

    // 호버 가능한 요소들 감지
    const handleMouseEnter = (e) => {
      if (e.target.matches('button, a, [role="button"], .cursor-pointer, input[type="button"], input[type="submit"]')) {
        setIsHovering(true);
        setShowGlow(true);
        // 1초 후에 빛나는 효과 제거
        setTimeout(() => {
          setShowGlow(false);
        }, 1000);
      }
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      setShowGlow(false);
    };

    window.addEventListener("mousemove", updatePosition);
    window.addEventListener("mouseenter", showCursor);
    window.addEventListener("mouseleave", hideCursor);
    document.addEventListener("mouseover", handleMouseEnter);
    document.addEventListener("mouseout", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", updatePosition);
      window.removeEventListener("mouseenter", showCursor);
      window.removeEventListener("mouseleave", hideCursor);
      document.removeEventListener("mouseover", handleMouseEnter);
      document.removeEventListener("mouseout", handleMouseLeave);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: "32px",
        height: "32px",
        pointerEvents: "none",
        zIndex: 9999,
        transform: "translate(-50%, -50%)",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.1s ease",
      }}
    >
      {/* 기본 칼 커서 */}
      <img
        src={isHovering ? "/sword_star_thicker_45x45.png" : "/sword_cursor2.png"}
        alt="cursor"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          transition: "all 0.2s ease",
        }}
      />
      
      {/* 호버 시에만 한 번 빛나는 효과들 */}
      {showGlow && (
        <>
          {/* 빛나는 효과 */}
          <div
            style={{
              position: "absolute",
              top: "-2px",
              left: "-2px",
              width: "36px",
              height: "36px",
              background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 30%, transparent 70%)",
              borderRadius: "50%",
              animation: "cursorGlow 1s ease-in-out forwards",
              pointerEvents: "none",
            }}
          />
          
          {/* 추가 빛나는 효과 */}
          <div
            style={{
              position: "absolute",
              top: "-4px",
              left: "-4px",
              width: "40px",
              height: "40px",
              background: "radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0.3) 40%, transparent 80%)",
              borderRadius: "50%",
              animation: "cursorGlow2 1s ease-in-out forwards",
              pointerEvents: "none",
            }}
          />
        </>
      )}
      
      <style jsx>{`
        @keyframes cursorGlow {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(1.5);
          }
        }
        
        @keyframes cursorGlow2 {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
          100% {
            opacity: 0;
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  );
};

export default CustomCursor; 