import React from "react";

const BannerHeader = ({ title, className = "" }) => (
  <div
    className={`relative w-full h-40 flex items-center justify-center bg-[url('/banner.png')] bg-contain bg-no-repeat bg-center ${className}`}
  >
    <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg z-10">
      {title}
    </h1>
  </div>
);

export default BannerHeader;
