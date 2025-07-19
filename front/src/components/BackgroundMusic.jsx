import React, { useState, useRef, useEffect } from "react";

const BackgroundMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [gameStarted, setGameStarted] = useState(false);
  const audioRef = useRef(null);

  // 게임 시작 상태 확인 및 이벤트 감지
  useEffect(() => {
    // 이미 게임을 시작한 적이 있는지 확인
    const hasSeenIntro = localStorage.getItem("hasSeenIntro");
    if (hasSeenIntro) {
      setGameStarted(true);
    }

    const handleGameStart = () => {
      console.log("게임 시작 이벤트 감지 - BGM 자동 재생!");
      setGameStarted(true);

      // 게임 시작 표시를 localStorage에 저장
      localStorage.setItem("hasSeenIntro", "true");

      // 자동으로 음악 재생
      setTimeout(() => {
        autoPlayMusic();
      }, 500);
    };

    window.addEventListener("gameStart", handleGameStart);

    return () => {
      window.removeEventListener("gameStart", handleGameStart);
    };
  }, [volume]);

  // 자동 음악 재생 (게임 시작 후)
  const autoPlayMusic = async () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    try {
      audio.volume = volume;
      await audio.play();
      setIsPlaying(true);
      console.log("BGM 자동 재생 성공!");
    } catch (error) {
      console.log("BGM 자동 재생 실패:", error);
    }
  };

  // 재생/일시정지 토글
  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    try {
      if (isPlaying) {
        // 현재 재생 중이면 일시정지
        audio.pause();
        setIsPlaying(false);
      } else {
        // 현재 정지 중이면 재생
        audio.volume = volume;
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.log("재생/일시정지 실패:", error);
    }
  };

  // 볼륨 변경
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <>
      {/* 오디오 요소 */}
      <audio
        ref={audioRef}
        src="/bgm.mp3"
        preload="auto"
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => console.log("BGM 로드 오류:", e)}
      />

      {/* 좌하단 오디오 컨트롤 - 게임 시작 후에만 표시 */}
      {gameStarted && (
        <div className="fixed bottom-4 left-4 z-50 bg-black bg-opacity-60 backdrop-blur-sm rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-3">
            {/* 재생/일시정지 버튼 */}
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-yellow-300 transition-colors text-lg"
              title={isPlaying ? "일시정지" : "재생"}
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>

            {/* 볼륨 아이콘 */}
            <div className="text-white text-sm">
              {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
            </div>

            {/* 볼륨 슬라이더 */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none 
                         [&::-webkit-slider-thumb]:w-4 
                         [&::-webkit-slider-thumb]:h-4 
                         [&::-webkit-slider-thumb]:rounded-full 
                         [&::-webkit-slider-thumb]:bg-white 
                         [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-moz-range-thumb]:w-4 
                         [&::-moz-range-thumb]:h-4 
                         [&::-moz-range-thumb]:rounded-full 
                         [&::-moz-range-thumb]:bg-white 
                         [&::-moz-range-thumb]:cursor-pointer
                         [&::-moz-range-thumb]:border-none"
              title="볼륨 조절"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default BackgroundMusic;
