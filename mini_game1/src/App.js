// C:\Python_basic\F5_Project2_hero\KDA_PRJ2_MainGame\mini_game1\src\App.js

import React, { useState, useEffect } from 'react';
import './App.css'; // 스타일시트 불러오기
import patternsData from './data/patterns'; // 3단계에서 만든 데이터 가져오기

function App() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // 현재 문제 번호 (0부터 시작)
  const [score, setScore] = useState(0); // 사용자의 맞힌 점수
  const [showScore, setShowScore] = useState(false); // 게임 종료 후 점수 화면 표시 여부
  const [shuffledOptions, setShuffledOptions] = useState([]); // 현재 문제의 보기를 섞은 배열
  const [selectedAnswer, setSelectedAnswer] = useState(null); // 사용자가 선택한 답변
  const [isAnswered, setIsAnswered] = useState(false); // 답변했는지 여부
  const [showExplanation, setShowExplanation] = useState(false); // 설명 창 표시 여부
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false); // 정답 여부

  // 컴포넌트가 마운트되거나 'currentQuestionIndex'가 바뀔 때마다 실행
  // 현재 문제의 보기를 랜덤으로 섞어서 'shuffledOptions' 상태에 저장합니다.
  useEffect(() => {
    if (currentQuestionIndex < patternsData.length) {
      const currentPattern = patternsData[currentQuestionIndex];
      // 보기를 랜덤으로 섞는 함수 호출
      const shuffled = shuffleArray([...currentPattern.options]); // 원본 배열 복사 후 섞기
      setShuffledOptions(shuffled);
    }
  }, [currentQuestionIndex]); // currentQuestionIndex가 변경될 때마다 이 효과를 다시 실행

  // 배열을 랜덤으로 섞는 유틸리티 함수 (Fisher-Yates 셔플 알고리즘)
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // 0부터 i까지의 랜덤 인덱스
      [array[i], array[j]] = [array[j], array[i]]; // 요소 교환
    }
    return array;
  };

  // 사용자가 보기를 클릭했을 때 호출되는 함수
  const handleAnswerOptionClick = (selectedOption) => {
    if (isAnswered) return; // 이미 답변했으면 아무것도 하지 않음

    setIsAnswered(true);
    setSelectedAnswer(selectedOption);
    setShowExplanation(true); // 설명 창 표시

    const currentPattern = patternsData[currentQuestionIndex];

    // 선택한 옵션이 정답과 같으면 점수를 1 증가시킵니다.
    if (selectedOption === currentPattern.correctAnswer) {
      setScore(score + 1);
      setIsCorrectAnswer(true);
    } else {
      setIsCorrectAnswer(false);
    }
  };

  // 다음 문제로 넘어가는 함수
  const handleNextQuestion = () => {
    const nextQuestion = currentQuestionIndex + 1;
    if (nextQuestion < patternsData.length) {
      setCurrentQuestionIndex(nextQuestion);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setShowExplanation(false); // 설명 창 숨기기
      setIsCorrectAnswer(false);
    } else {
      setShowScore(true);
    }
  };

  // 게임을 다시 시작하는 함수
  const restartGame = () => {
    setCurrentQuestionIndex(0); // 문제 번호를 처음으로 초기화
    setScore(0); // 점수 초기화
    setShowScore(false); // 점수 화면 숨기기
    setIsAnswered(false);
    setSelectedAnswer(null);
    setShowExplanation(false); // 설명 창 숨기기
    setIsCorrectAnswer(false);
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
    if (isSelected) {
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
            <img 
              src={patternsData[currentQuestionIndex].quizImage} 
              alt="Chart pattern" // alt 속성에 간단한 설명 추가
              className="question-image"
            />
            <div className="question-text">
              이 차트 패턴의 이름은 무엇일까요?
            </div>
          </div>
          <div className="answer-options">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerOptionClick(option)}
                className={getButtonClassName(option)}
                disabled={isAnswered}
              >
                {option}
              </button>
            ))}
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