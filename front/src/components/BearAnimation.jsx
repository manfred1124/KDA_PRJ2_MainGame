import React, { useState, useEffect } from "react";

const BearAnimation = () => {
  const [currentBear, setCurrentBear] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBear((prev) => (prev + 1) % 2);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const bearImages = ["/bear.png", "/bear2.png"];

  return (
    <div className="fixed z-10" style={{ top: "1%", right: "7%" }}>
      <img
        src={bearImages[currentBear]}
        alt="Bear"
        style={{ width: "28vw", height: "30vw" }}
        className="object-contain"
      />
    </div>
  );
};

export default BearAnimation;
