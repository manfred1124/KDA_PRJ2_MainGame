import React, { useState, useEffect } from "react";

const BearTopLeftAnimation = () => {
  const [currentBear, setCurrentBear] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBear((prev) => (prev + 1) % 2);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const bearImages = ["/bear3.png", "/bear4.png"];

  return (
    <div className="fixed z-10" style={{ top: "2%", left: "-2%" }}>
      <img
        src={bearImages[currentBear]}
        alt="Bear"
        style={{ width: "20vw", height: "20vw" }}
        className="object-contain"
      />
    </div>
  );
};

export default BearTopLeftAnimation;
