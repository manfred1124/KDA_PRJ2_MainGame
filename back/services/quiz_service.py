from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from models import Quiz, UserQuiz
from schemas import QuizResponse
import random

class QuizService:
    async def get_daily_quiz(self, db: AsyncSession) -> QuizResponse:
        """일일 퀴즈 조회"""
        result = await db.execute(select(Quiz).order_by(Quiz.id.desc()))
        quizzes = result.scalars().all()
        
        if not quizzes:
            # 퀴즈가 없으면 기본 퀴즈 반환
            return QuizResponse(
                id=1,
                question="주식 투자에서 '분산 투자'의 의미는?",
                option_a="한 종목에만 투자하기",
                option_b="여러 종목에 나누어 투자하기",
                option_c="고위험 종목만 투자하기",
                option_d="단기 투자만 하기",
                round_number=1
            )
        
        # 랜덤하게 퀴즈 선택
        quiz = random.choice(quizzes)
        return QuizResponse.from_orm(quiz)
    
    async def submit_answer(self, db: AsyncSession, username: str, answer: int):
        """퀴즈 답안 제출"""
        # 사용자 조회
        from models import User, Quiz
        user_result = await db.execute(select(User).where(User.username == username))
        user = user_result.scalar_one_or_none()
        if not user:
            return {"error": "User not found"}
        
        # 오늘의 퀴즈(가장 최근 퀴즈) DB 모델로 가져오기
        quiz_result = await db.execute(select(Quiz).order_by(Quiz.id.desc()))
        quiz = quiz_result.scalars().first()
        if not quiz:
            return {"error": "Quiz not found"}
        
        # 답안 검증
        if answer < 1 or answer > 4:
            return {"error": "Invalid answer"}
        
        # 정답 여부 확인
        is_correct = (answer == quiz.correct_answer)
        
        # 정답 텍스트 구하기
        option_key = f"option_{chr(96 + quiz.correct_answer)}"  # 1->a, 2->b, ...
        correct_text = getattr(quiz, option_key, "")

        # 답안 기록
        user_quiz = UserQuiz(
            user_id=user.id,
            quiz_id=quiz.id,
            user_answer=answer,
            is_correct=is_correct
        )
        db.add(user_quiz)
        await db.commit()
        
        return {
            "is_correct": is_correct,
            "correct_answer": quiz.correct_answer,
            "correct_text": correct_text,
            "explanation": quiz.explanation
        }
    
    async def insert_initial_quizzes(self, db: AsyncSession):
        """초기 퀴즈 데이터 삽입"""
        result = await db.execute(select(Quiz))
        existing_quizzes = result.scalars().all()
        
        if existing_quizzes:
            return
        
        # 초기 퀴즈 데이터
        initial_quizzes = [
            {
                "question": "주식 투자에서 '분산 투자'의 의미는?",
                "option_a": "한 종목에만 투자하기",
                "option_b": "여러 종목에 나누어 투자하기",
                "option_c": "고위험 종목만 투자하기",
                "option_d": "단기 투자만 하기",
                "correct_answer": 2,
                "explanation": "분산 투자는 여러 종목에 나누어 투자하여 리스크를 줄이는 전략입니다.",
                "round_number": 1
            },
            {
                "question": "PER(주가수익비율)이 낮을수록 의미하는 것은?",
                "option_a": "주가가 비싸다",
                "option_b": "주가가 싸다",
                "option_c": "수익성이 좋다",
                "option_d": "성장성이 높다",
                "correct_answer": 2,
                "explanation": "PER이 낮을수록 주가가 상대적으로 싸다는 의미입니다.",
                "round_number": 2
            },
            {
                "question": "배당수익률이 높은 주식의 특징은?",
                "option_a": "성장성이 높다",
                "option_b": "안정적이지만 성장성이 낮다",
                "option_c": "고위험 고수익이다",
                "option_d": "단기 투자에 적합하다",
                "correct_answer": 2,
                "explanation": "배당수익률이 높은 주식은 보통 안정적이지만 성장성이 낮은 기업입니다.",
                "round_number": 3
            },
            {
                "question": "주식 시장에서 '골든크로스'란?",
                "option_a": "단기 이평선이 장기 이평선을 상향 돌파",
                "option_b": "단기 이평선이 장기 이평선을 하향 돌파",
                "option_c": "주가가 급등하는 현상",
                "option_d": "거래량이 급증하는 현상",
                "correct_answer": 1,
                "explanation": "골든크로스는 단기 이동평균선이 장기 이동평균선을 상향 돌파하는 기술적 신호입니다.",
                "round_number": 4
            },
            {
                "question": "투자에서 '리스크 관리'의 핵심은?",
                "option_a": "모든 자금을 한 번에 투자하기",
                "option_b": "손실을 최소화하는 전략",
                "option_c": "고위험 고수익 투자만 하기",
                "option_d": "단기 투자만 하기",
                "correct_answer": 2,
                "explanation": "리스크 관리의 핵심은 손실을 최소화하면서 수익을 극대화하는 것입니다.",
                "round_number": 5
            }
        ]
        
        for quiz_data in initial_quizzes:
            quiz = Quiz(**quiz_data)
            db.add(quiz)
        
        await db.commit() 