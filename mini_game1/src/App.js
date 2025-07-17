// C:\Python_basic\F5_Project2_hero\KDA_PRJ2_MainGame\mini_game1\src\App.js

import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // 스타일시트 불러오기
import patternsData from './data/patterns'; // 3단계에서 만든 데이터 가져오기

const TIME_LIMIT = 15; // 각 문제당 시간 제한 (초)

function App() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // 현재 문제 번호 (0부터 시작)
  const [score, setScore] = useState(0); // 사용자의 맞힌 점수
  const [showScore, setShowScore] = useState(false); // 게임 종료 후 점수 화면 표시 여부
  const [shuffledOptions, setShuffledOptions] = useState([]); // 현재 문제의 보기를 섞은 배열
  const [selectedAnswer, setSelectedAnswer] = useState(null); // 사용자가 선택한 답변
  const [isAnswered, setIsAnswered] = useState(false); // 답변했는지 여부
  const [showExplanation, setShowExplanation] = useState(false); // 설명 창 표시 여부
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false); // 정답 여부
  const [timer, setTimer] = useState(TIME_LIMIT); // 타이머 상태
  const timerIntervalRef = useRef(null); // 타이머 인터벌 ID를 저장할 ref

  // 컴포넌트가 마운트되거나 'currentQuestionIndex'가 바뀔 때마다 실행
  // 현재 문제의 보기를 랜덤으로 섞어서 'shuffledOptions' 상태에 저장하고 타이머를 시작합니다.
  useEffect(() => {
    if (currentQuestionIndex < patternsData.length) {
      const currentPattern = patternsData[currentQuestionIndex];
      const shuffled = shuffleArray([...currentPattern.options]);
      setShuffledOptions(shuffled);
      setTimer(TIME_LIMIT); // 새 문제 시작 시 타이머 초기화

      // 기존 타이머가 있다면 정리
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      // 새 타이머 시작
      timerIntervalRef.current = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            clearInterval(timerIntervalRef.current);
            // 시간이 다 되면 자동으로 다음 문제로 넘어감 (오답 처리)
            handleNextQuestion(true); // isTimeUp = true
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentQuestionIndex]); // currentQuestionIndex가 변경될 때마다 이 효과를 다시 실행

  // 배열을 랜덤으로 섞는 유틸리티 함수 (Fisher-Yates 셔플 알고리즘)
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // 사용자가 보기를 클릭했을 때 호출되는 함수
  const handleAnswerOptionClick = (selectedOption) => {
    if (isAnswered) return;

    // 답변 선택 시 타이머 중지
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setIsAnswered(true);
    setSelectedAnswer(selectedOption);
    setShowExplanation(true);

    const currentPattern = patternsData[currentQuestionIndex];

    if (selectedOption === currentPattern.correctAnswer) {
      setScore(score + 1);
      setIsCorrectAnswer(true);
    } else {
      setIsCorrectAnswer(false);
    }
  };

  // 다음 문제로 넘어가는 함수 (isTimeUp은 타이머 만료 여부)
  const handleNextQuestion = (isTimeUp = false) => {
    // 타이머가 만료되어 호출된 경우, 이미 답변된 상태가 아니면 오답 처리
    if (isTimeUp && !isAnswered) {
      setIsAnswered(true); // 답변 처리
      setSelectedAnswer(null); // 선택된 답변 없음
      setIsCorrectAnswer(false); // 오답 처리
      setShowExplanation(true); // 설명 창 표시
      // 여기서 바로 다음 문제로 넘어가지 않고, 설명 창을 보여준 후 '다음' 버튼을 누르면 넘어가도록 함
      return; 
    }

    const nextQuestion = currentQuestionIndex + 1;
    if (nextQuestion < patternsData.length) {
      setCurrentQuestionIndex(nextQuestion);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsCorrectAnswer(false);
      setTimer(TIME_LIMIT); // 다음 문제 시작 시 타이머 초기화
    } else {
      setShowScore(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current); // 게임 종료 시 타이머 정리
      }
    }
  };

  // 게임을 다시 시작하는 함수
  const restartGame = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setShowScore(false);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setIsCorrectAnswer(false);
    setTimer(TIME_LIMIT); // 게임 재시작 시 타이머 초기화
    // 새 게임 시작 시 useEffect가 타이머를 다시 시작할 것임
  };

  // 버튼의 클래스 이름을 결정하는 함수
  const getButtonClassName = (option) => {
    if (!isAnswered) {
      return 'option-button';
    }

    const currentPattern = patternsData[currentQuestionIndex];
    const isCorrect = option === currentPattern.correctAnswer;
    const isSelected = option === selectedAnswer;

    if (isCorrect) {
      return 'option-button correct';
    }
    if (isSelected && !isCorrect) { // 선택했지만 오답인 경우
      return 'option-button incorrect';
    }
    return 'option-button';
  };

  return (
    <div className="app-container">
      <h1 className="game-title">
        📊 차트 패턴 맞추기 게임
      </h1>

      {showScore ? (
        <div className="score-section">
          <h2>게임 종료! 🎉</h2>
          <p>
            당신은 {patternsData.length}문제 중{' '}
            <span className="score-highlight">{score}개</span>
            를 맞췄습니다!
          </p>
          <button onClick={restartGame} className="restart-button">
            다시 시작하기
          </button>
        </div>
      ) : (
        <div className="question-section">
          <div className="question-header">
            <div className="question-count">
              <span>문제 {currentQuestionIndex + 1}</span>/{patternsData.length}
            </div>
            <div className="timer">남은 시간: {timer}초</div> {/* 타이머 표시 */}
            <img 
              src={patternsData[currentQuestionIndex].quizImage} 
              alt="Chart pattern"
              className="question-image"
            />
            <div className="question-text">
              이 차트 패턴의 이름은 무엇일까요?
            </div>
          </div>
          <div className="answer-options">
            {shuffledOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleAnswerOptionClick(option)}
                className={getButtonClassName(option)}
                disabled={isAnswered}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${((currentQuestionIndex + 1) / patternsData.length) * 100}%` }}
            ></div>
          </div>

          {showExplanation && (
            <div className="explanation-modal-overlay">
              <div className="explanation-modal-content">
                <h2 className={isCorrectAnswer ? 'correct-text' : 'incorrect-text'}>
                  {isCorrectAnswer ? '정답입니다! 🎉' : '오답입니다. 😅'}
                </h2>
                <h3>정답: {patternsData[currentQuestionIndex].correctAnswer}</h3>
                <img 
                  src={patternsData[currentQuestionIndex].image} 
                  alt="Chart pattern explanation" 
                  className="explanation-image"
                />
                <p><strong>생김새:</strong> {patternsData[currentQuestionIndex].description}</p>
                <p><strong>의미:</strong> <span dangerouslySetInnerHTML={{ __html: patternsData[currentQuestionIndex].meaning }}></span></p>
                <button onClick={handleNextQuestion} className="next-button">
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;