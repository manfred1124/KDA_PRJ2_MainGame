import React, { createContext, useContext, useRef, useState } from "react";

const AudioContext = createContext();

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = (audioSrc) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(audioSrc);
    audioRef.current.volume = 0.7;
    audioRef.current.loop = false;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        console.log(`오디오 재생: ${audioSrc}`);
      })
      .catch((error) => {
        console.error("오디오 재생 실패:", error);
        setIsPlaying(false);
      });
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("오디오 재개 실패:", error);
        });
    }
  };

  const value = {
    playAudio,
    stopAudio,
    pauseAudio,
    resumeAudio,
    isPlaying,
    audioRef,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};
