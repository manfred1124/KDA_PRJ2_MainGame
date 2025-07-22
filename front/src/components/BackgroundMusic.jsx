import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

const BackgroundMusic = forwardRef((props, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [gameStarted, setGameStarted] = useState(false);
  const audioRef = useRef(null);

  useImperativeHandle(ref, () => ({
    pauseMusic: () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    },
    playMusic: () => {
      if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.play();
        setIsPlaying(true);
      }
    },
  }));

  // 게임 시작 상태 확인 및 이벤트 감지
  useEffect(() => {
    // 이미 게임을 시작한 적이 있는지 확인
    const hasSeenIntro = localStorage.getItem("hasSeenIntro");
    if (hasSeenIntro) {
      setGameStarted(true);
    }

    const handleGameStart = () => {
      setGameStarted(true);
      localStorage.setItem("hasSeenIntro", "true");
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
    } catch (error) {}
  };

  // 재생/일시정지 토글
  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.volume = volume;
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {}
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
        onError={(e) => {}}
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
              className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              title="볼륨 조절"
            />
          </div>
        </div>
      )}
    </>
  );
});

export default BackgroundMusic;
