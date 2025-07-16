import React from "react";

const BannerHeader = ({ title, className = "" }) => (
  <div
    className={`relative w-full h-40 flex items-center justify-center ${className}`}
  >
    <div className="absolute inset-0 flex items-center justify-center">
      {/* RPG 스타일 도형: 금색 테두리, 파치먼트 배경, 약간의 그림자 */}
      <div
        className="w-11/12 h-28 md:h-32 rounded-[2.5rem] border-4 border-[#bfa76a] bg-[#f7e6b6] shadow-lg flex items-center justify-center"
        style={{ boxShadow: "0 4px 24px #c2b28055" }}
      ></div>
    </div>
    <h1
      className="text-3xl md:text-4xl font-bold text-[#7c5c2b] drop-shadow z-10"
      style={{ fontFamily: "serif", letterSpacing: "0.04em" }}
    >
      {title}
    </h1>
  </div>
);

export default BannerHeader;
