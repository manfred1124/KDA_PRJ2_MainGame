from .auth_service import AuthService
from .stock_service import StockService
from .portfolio_service import PortfolioService
from .news_service import NewsService
from .game_service import GameService
from .financial_service import FinancialService

# 서비스 인스턴스들
auth_service = AuthService()
stock_service = StockService()
portfolio_service = PortfolioService()
news_service = NewsService()
game_service = GameService()
financial_service = FinancialService() 