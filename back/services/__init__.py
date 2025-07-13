from .auth_service import AuthService
from .stock_service import StockService
from .portfolio_service import PortfolioService
from .news_service import NewsService
from .quiz_service import QuizService
from .game_service import GameService

# 서비스 인스턴스들
auth_service = AuthService()
stock_service = StockService()
portfolio_service = PortfolioService()
news_service = NewsService()
quiz_service = QuizService()
game_service = GameService() 