import React, { useState, useEffect } from "react";

const SwordAnimation = () => {
  const [currentSword, setCurrentSword] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSword((prev) => (prev + 1) % 2);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const swordImages = ["/sword.png", "/sword(2).png"];

  return (
    <div className="fixed z-10" style={{ bottom: "0%", left: "7%" }}>
      <img
        src={swordImages[currentSword]}
        alt="Sword"
        style={{ width: "40vw", height: "40vw" }}
        className="object-contain"
      />
    </div>
  );
};

export default SwordAnimation;
