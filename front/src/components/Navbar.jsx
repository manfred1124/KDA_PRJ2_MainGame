import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Home,
  TrendingUp,
  Newspaper,
  Trophy,
  LogOut,
  User,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import logoImage from "../assets/logoimage.png";

const Navbar = () => {
  const { user, logout, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 뉴스 데이터 상태
  const [newsList, setNewsList] = useState([]);
  const [newsIdx, setNewsIdx] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [newsBanner, setNewsBanner] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  // 마지막으로 fetch한 포트폴리오 데이터를 저장
  const [cachedPortfolioData, setCachedPortfolioData] = useState(null);

  // 현재 기간을 한국어로 변환
  const formatPeriod = (period) => {
    if (!period || !period.includes(" ")) return "";
    const [year, half] = period.split(" ");
    const halfKorean = half === "H1" ? "상반기" : "하반기";
    return `${year}년 ${halfKorean}`;
  };

  // 라운드 정보가 필요한 페이지인지 확인
  const shouldShowPeriod = () => {
    const path = location.pathname;
    return ["/", "/news", "/select-sector", "/my-page", "/review"].includes(
      path
    );
  };

  // 현재 페이지 제목 가져기기 (세종대왕 컨셉, 라운드별)
  const getPageTitle = () => {
    const path = location.pathname;
    const currentRound = (user?.current_round_idx ?? 0) + 1;

    switch (path) {
      case "/":
        if (currentRound === 1) return "🏰 첫 번째 모험을 시작하시게";
        if (currentRound === 2) return "🏰 두 번째 모험이 기다리고 있소";
        if (currentRound === 3) return "🏰 마지막 모험을 완수하시게";
        return "🏰 투자 모험의 전당";

      case "/news":
        if (currentRound === 1) return "📜 시장의 소식을 들어보시게";
        if (currentRound === 2) return "📜 천하의 정세를 파악하시게";
        if (currentRound === 3) return "📜 모든 정보를 수집하시게";
        return "📜 조선의 시장 소식";

      case "/select-sector":
        if (currentRound === 1) return "📈 차트를 보며 현명하게 투자하시게";
        if (currentRound === 2) return "📈 차트와 뉴스로 지혜롭게 투자하시게";
        if (currentRound === 3) return "📈 모든 정보로 완벽하게 투자하시게";
        return "📈 조선 상업의 중심지";

      case "/my-page":
        if (currentRound === 1) return "📊 첫 번째 모험의 성과를 살펴보시게";
        if (currentRound === 2) return "📊 두 번째 모험의 성과를 살펴보시게";
        if (currentRound === 3) return "📊 마지막 모험의 성과를 살펴보시게";
        return "📊 그대의 투자 여정";

      case "/review":
        if (currentRound === 1) return "📋 첫 모험의 교훈을 되새기시게";
        if (currentRound === 2) return "📋 두 번째 모험의 지혜를 쌓으시게";
        if (currentRound === 3) return "📋 모든 모험의 깨달음을 얻으시게";
        return "📋 투자의 교훈과 지혜";

      case "/ranking":
        return "🏆 조선 최고의 상인을 가리는 곳";

      case "/game-result":
        return "🎉 위대한 모험의 대단원";

      default:
        if (currentRound === 1)
          return "🚩 첫 번째 투자 여정: 차트 속 흐름을 읽어보시게";
        if (currentRound === 2)
          return "🚩 두 번째 투자 여정: 소문 속 기회를 엿보시게";
        if (currentRound === 3)
          return "🚩 세 번째 투자 여정: 장부 속 진실을 꿰뚫어보시게";
        return "🚩 조선왕조 투자실록";
    }
  };

  useEffect(() => {
    // 사용자 잔고 정보 가져오기 (항상 최신 자산 표시)
    fetchUserBalance();

    // 거래 완료 이벤트 리스너 추가
    const handleTransactionComplete = () => {
      // 거래 완료 시 총자산 업데이트
      fetchUserBalance();
      // 포트폴리오 데이터도 업데이트 (캐시 갱신)
      fetchPortfolioData();
    };

    window.addEventListener("transactionComplete", handleTransactionComplete);

    return () => {
      window.removeEventListener(
        "transactionComplete",
        handleTransactionComplete
      );
    };
  }, [isPortfolioOpen]);

  // 뉴스 배너는 user.current_period가 준비된 후에만 호출
  useEffect(() => {
    if (user?.current_period) {
      fetchBannerNews(user.current_period);
    }
  }, [user?.current_period]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest(".dropdown-container")) {
        setIsDropdownOpen(false);
      }
      if (isPortfolioOpen && !event.target.closest(".portfolio-container")) {
        setIsPortfolioOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, isPortfolioOpen]);

  const fetchBannerNews = async (period) => {
    try {
      const response = await fetch(
        `/api/news?period=${encodeURIComponent(period)}`
      );
      const newsData = await response.json();
      if (newsData.length > 0) {
        setNewsList(newsData);
        setNewsIdx(0);
        setNewsBanner(newsData[0].title);
      } else {
        setNewsList([]);
        setNewsBanner("");
      }
    } catch (e) {
      setNewsList([]);
      setNewsBanner("");
    }
  };

  // 사용자 정보가 변경될 때마다 잔고 업데이트
  useEffect(() => {
    if (user) {
      // 최신 자산 정보 가져오기
      fetchUserBalance();
    }
  }, [user]);

  const fetchUserBalance = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/portfolio", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserBalance(response.data.total_balance);
    } catch (error) {
      console.error("Failed to fetch user balance:", error);
      setUserBalance(user?.total_balance || 0);
    }
  };

  // 최초 마운트 시 한 번만 포트폴리오 데이터 fetch
  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    setPortfolioLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/portfolio", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPortfolioData(response.data);
      setCachedPortfolioData(response.data); // 항상 캐시도 갱신
    } catch (error) {
      setPortfolioData(null);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handlePortfolioClick = () => {
    setIsPortfolioOpen(!isPortfolioOpen);
    
    // 포트폴리오를 열 때 항상 최신 데이터 가져오기
    if (!isPortfolioOpen) {
      setPortfolioData(null); // 데이터 초기화
      fetchPortfolioData();
    }
  };

  // 10초마다 뉴스 인덱스 순환
  useEffect(() => {
    if (newsList.length <= 1) return;
    const timer = setInterval(() => {
      setNewsIdx((idx) => {
        const newIdx = (idx + 1) % newsList.length;
        setNewsBanner(newsList[newIdx].title);
        return newIdx;
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [newsList]);

  const handleLogout = () => {
    console.log("로그아웃 시도...");
    try {
      logout();
      console.log("로그아웃 성공");
      navigate("/login");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  const handleNextRound = async () => {
    try {
      console.log("다음 라운드 진행 시도...");

      // 3라운드 완료 후 체크 (current_round_idx가 3 이상이면 게임 완료)
      if ((user?.current_round_idx || 0) >= 3) {
        // 게임 종료 - 결과 페이지로 이동
        navigate("/game-result");
        return;
      }

      const response = await axios.post("/api/game/next-round");
      console.log("다음 라운드 응답:", response.data);
      toast.success("다음 라운드로 진행되었습니다!");

      // 사용자 정보 즉시 업데이트
      try {
        const userResponse = await axios.get("/api/auth/me");
        console.log("사용자 정보 업데이트:", userResponse.data);

        // AuthContext의 사용자 정보 업데이트
        window.dispatchEvent(
          new CustomEvent("userUpdated", {
            detail: userResponse.data,
          })
        );

        // 네비게이션 바 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new Event("transactionComplete"));

        // 3라운드 완료 후 게임 결과 페이지로 이동
        if (userResponse.data.current_round_idx >= 3) {
          navigate("/game-result");
        }
      } catch (userError) {
        console.error("사용자 정보 업데이트 실패:", userError);
      }
    } catch (error) {
      console.error("다음 라운드 진행 실패:", error);

      // 마지막 라운드인 경우 게임 결과 페이지로 이동
      if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("마지막 라운드")
      ) {
        navigate("/game-result");
        return;
      }

      toast.error("다음 라운드 진행에 실패했습니다.");
    }
  };

  const navItems = [
    { path: "/", label: "대시보드", icon: Home },
    { path: "/stocks", label: "주식", icon: TrendingUp },
    { path: "/select-sector", label: "주식 투자", icon: BarChart3 },
    { path: "/news", label: "뉴스", icon: Newspaper },
    { path: "/ranking", label: "랭킹", icon: Trophy },
  ];

  if (!user) return null;

  return (
    <nav
      className="py-2 lg:py-4 relative shadow-lg"
      style={{
        fontFamily: "Jua, sans-serif",
        backgroundColor: "rgba(0, 30, 90, 0.3)",
        backdropFilter: "blur(8px)",
        zIndex: 10,
        position: "relative",
      }}
    >
      <div className="max-w-7xl mx-auto px-3 lg:px-4">
        {/* 데스크톱 레이아웃 */}
        <div className="hidden lg:flex items-center gap-6">
          {/* 왼쪽: 뒤로가기 버튼 */}
          {location.pathname !== "/game-result" && (
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  if (!location.pathname.startsWith("/roundintro") && location.pathname !== "/my-page") {
                    navigate(-1);
                  }
                }}
                className="flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <img
                  src={logoImage}
                  alt="Back"
                  className="w-[52px] h-[52px] object-contain"
                  onError={(e) => {
                    // 로고가 없으면 이모지로 대체
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
                <span className="text-3xl" style={{ display: "none" }}>
                  🏠
                </span>
              </button>
            </div>
          )}

          {/* 중앙: 페이지 제목 */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-md px-6 py-4 max-w-2xl mx-auto relative">
              <div className="flex items-center justify-center gap-3">
                <span className="text-[#7c5c2b] font-bold text-xl text-center">
                  {getPageTitle()}
                </span>
                {shouldShowPeriod() && user?.current_period && (
                  <div className="bg-gradient-to-r from-[#bfa76a] to-[#a67c3c] text-white px-3 py-1 rounded-lg text-sm font-medium shadow-sm">
                    {formatPeriod(user.current_period)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 라운드 정보 */}
          <div className="flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-md px-6 py-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#a67c3c] font-medium">
                  라운드
                </span>
                <span className="text-2xl font-bold text-[#7c5c2b]">
                  {(user?.current_round_idx ?? 0) + 1}
                </span>
              </div>
            </div>
          </div>

          {/* 총자산 정보 */}
          <div className="flex-shrink-0 relative portfolio-container">
            <button
              onClick={handlePortfolioClick}
              className="bg-white rounded-2xl shadow-md px-6 py-4 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#a67c3c] font-medium">총자산</span>
                <span className="text-2xl font-bold text-[#7c5c2b]">
                  {userBalance.toLocaleString()}원
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#a67c3c] transition-transform duration-200 ${
                    isPortfolioOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* 포트폴리오 드롭다운 */}
            {isPortfolioOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-[#7c5c2b]" style={{ fontFamily: "Jua, sans-serif" }}>
                      보유 종목
                    </h3>
                    <button
                      onClick={() => setIsPortfolioOpen(false)}
                      className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                      ×
                    </button>
                  </div>
                  {portfolioLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bfa76a]"></div>
                    </div>
                  ) : portfolioData && portfolioData.items && portfolioData.items.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {portfolioData.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('openSellModal', {
                                detail: {
                                  stock_id: item.stock_id,
                                  stock_name: item.stock_name,
                                  stock_symbol: item.stock_symbol,
                                  current_price: item.current_price,
                                  quantity: item.quantity,
                                  average_price: item.average_price
                                }
                              }));
                              setIsPortfolioOpen(false);
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-[#7c5c2b] truncate">
                                  {item.stock_name}
                                </span>
                                <span className="text-xs text-[#a67c3c] bg-gray-200 px-2 py-1 rounded">
                                  {item.stock_symbol}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-[#a67c3c]">
                                  {item.quantity.toLocaleString()}주
                                </span>
                                <span className="text-xs text-[#a67c3c]">
                                  평균 {item.average_price.toLocaleString()}원
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-3">
                              <div className={`text-sm font-bold ${
                                item.profit_loss >= 0 ? 'text-[#e53a40]' : 'text-[#2563eb]'
                              }`}>
                                {item.profit_loss >= 0 ? '+' : ''}{item.profit_loss.toLocaleString()}원
                              </div>
                              <div className={`text-xs ${
                                item.profit_loss_percentage >= 0 ? 'text-[#e53a40]' : 'text-[#2563eb]'
                              }`}>
                                {item.profit_loss_percentage >= 0 ? '+' : ''}{item.profit_loss_percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#a67c3c]">
                      <div className="text-2xl mb-2">📊</div>
                      <p className="text-sm">보유 종목이 없습니다.</p>
                    </div>
                  )}
                  {portfolioData && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#a67c3c]">총 평가금액:</span>
                        <span className="font-bold text-[#7c5c2b]">
                          {portfolioData.total_portfolio_value?.toLocaleString() || 0}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-[#a67c3c]">총 손익:</span>
                        <span className={`font-bold ${
                          portfolioData.total_profit_loss >= 0 ? 'text-[#e53a40]' : 'text-[#2563eb]'
                        }`}>
                          {portfolioData.total_profit_loss >= 0 ? '+' : ''}{portfolioData.total_profit_loss?.toLocaleString() || 0}원
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 유저 드롭다운 */}
          <div className="flex-shrink-0 relative dropdown-container">
            <button
              onClick={() => {
                console.log("드롭다운 버튼 클릭됨, 현재 상태:", isDropdownOpen);
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="flex items-center space-x-2 px-6 py-4 bg-white hover:bg-gray-50 text-[#7c5c2b] rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
              style={{ fontFamily: "Jua, sans-serif" }}
            >
              <User className="w-5 h-5" />
              <span>{user.username}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* 드롭다운 메뉴 */}
            {isDropdownOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 pointer-events-auto"
                style={{
                  position: "absolute",
                  top: "100%",
                  right: "0",
                  marginTop: "8px",
                  width: "192px",
                  backgroundColor: "white",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                  border: "1px solid #e5e7eb",
                  zIndex: 10000,
                  pointerEvents: "auto",
                }}
              >
                {console.log("드롭다운 메뉴가 표시됨")}
                <div className="py-2">
                  <Link
                    to="/my-page"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-[#7c5c2b] hover:bg-[#f7e6b6] transition-colors duration-200"
                    style={{ fontFamily: "Jua, sans-serif" }}
                  >
                    <User className="w-5 h-5" />
                    <span className="font-normal">마이페이지</span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("로그아웃 버튼 클릭됨");
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200 w-full text-left cursor-pointer"
                    style={{
                      fontFamily: "Jua, sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      color: "#dc2626",
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      border: "none",
                      background: "transparent",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#fef2f2";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-normal">로그아웃</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 레이아웃 */}
        <div className="lg:hidden space-y-3">
          {/* 상단: 뒤로가기 + 뉴스 */}
          <div className="flex items-center gap-3">
            {location.pathname !== "/game-result" && (
              <button
                onClick={() => {
                  if (!location.pathname.startsWith("/roundintro") && location.pathname !== "/my-page") {
                    navigate(-1);
                  }
                }}
                className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 flex-shrink-0"
              >
                <img
                  src={logoImage}
                  alt="Back"
                  className="w-[42px] h-[42px] object-contain"
                  onError={(e) => {
                    // 로고가 없으면 이모지로 대체
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
                <span className="text-2xl" style={{ display: "none" }}>
                  🏠
                </span>
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl shadow-md px-4 py-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📰</span>
                  <div className="overflow-hidden">
                    <span
                      key={newsIdx}
                      className="text-[#7c5c2b] font-semibold text-sm truncate block animate-fade-in"
                    >
                      {newsBanner || "최근 뉴스가 없습니다."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 하단: 라운드 + 잔고 + 유저 */}
          <div className="flex items-center gap-2">
            {/* 라운드 정보 */}
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-md px-3 py-2">
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-xs text-[#a67c3c] font-medium">
                    라운드
                  </span>
                  <span className="text-lg font-bold text-[#7c5c2b]">
                    {(user?.current_round_idx ?? 0) + 1}
                  </span>
                </div>
              </div>
            </div>

            {/* 총자산 정보 */}
            <div className="flex-1 relative portfolio-container">
              <button
                onClick={handlePortfolioClick}
                className="bg-white rounded-xl shadow-md px-3 py-2 hover:shadow-lg transition-all duration-300 cursor-pointer w-full"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-xs text-[#a67c3c] font-medium">
                    총자산
                  </span>
                  <span className="text-sm font-bold text-[#7c5c2b] truncate">
                    {userBalance.toLocaleString()}원
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-[#a67c3c] transition-transform duration-200 ${
                      isPortfolioOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* 모바일 포트폴리오 드롭다운 */}
              {isPortfolioOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-[#7c5c2b]" style={{ fontFamily: "Jua, sans-serif" }}>
                        보유 종목
                      </h3>
                      <button
                        onClick={() => setIsPortfolioOpen(false)}
                        className="text-gray-400 hover:text-gray-600 text-lg"
                      >
                        ×
                      </button>
                    </div>
                    
                    {portfolioLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#bfa76a]"></div>
                      </div>
                    ) : portfolioData && portfolioData.items && portfolioData.items.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {portfolioData.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                              onClick={() => {
                                // 보유 종목 클릭 시 판매하기 모달 열기 이벤트 발생
                                window.dispatchEvent(new CustomEvent('openSellModal', {
                                  detail: {
                                    stock_id: item.stock_id,
                                    stock_name: item.stock_name,
                                    stock_symbol: item.stock_symbol,
                                    current_price: item.current_price,
                                    quantity: item.quantity,
                                    average_price: item.average_price
                                  }
                                }));
                                setIsPortfolioOpen(false); // 포트폴리오 드롭다운 닫기
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs font-bold text-[#7c5c2b] truncate">
                                    {item.stock_name}
                                  </span>
                                  <span className="text-xs text-[#a67c3c] bg-gray-200 px-1 py-0.5 rounded">
                                    {item.stock_symbol}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-[#a67c3c]">
                                    {item.quantity.toLocaleString()}주
                                  </span>
                                  <span className="text-xs text-[#a67c3c]">
                                    평균 {item.average_price.toLocaleString()}원
                                  </span>
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <div className={`text-xs font-bold ${
                                  item.profit_loss >= 0 ? 'text-[#e53a40]' : 'text-[#2563eb]'
                                }`}>
                                  {item.profit_loss >= 0 ? '+' : ''}{item.profit_loss.toLocaleString()}원
                                </div>
                                <div className={`text-xs ${
                                  item.profit_loss_percentage >= 0 ? 'text-[#e53a40]' : 'text-[#2563eb]'
                                }`}>
                                  {item.profit_loss_percentage >= 0 ? '+' : ''}{item.profit_loss_percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-[#a67c3c]">
                        <div className="text-xl mb-1">📊</div>
                        <p className="text-xs">보유 종목이 없습니다.</p>
                      </div>
                    )}
                    
                    {portfolioData && (
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#a67c3c]">총 평가금액:</span>
                          <span className="font-bold text-[#7c5c2b]">
                            {portfolioData.total_portfolio_value?.toLocaleString() || 0}원
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs mt-1">
                          <span className="text-[#a67c3c]">총 손익:</span>
                          <span className={`font-bold ${
                            portfolioData.total_profit_loss >= 0 ? 'text-[#e53a40]' : 'text-[#2563eb]'
                          }`}>
                            {portfolioData.total_profit_loss >= 0 ? '+' : ''}{portfolioData.total_profit_loss?.toLocaleString() || 0}원
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 유저 드롭다운 */}
            <div className="flex-shrink-0 relative dropdown-container">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-center w-12 h-12 bg-white hover:bg-gray-50 text-[#7c5c2b] rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                style={{ fontFamily: "serif" }}
              >
                <User className="w-5 h-5" />
              </button>

              {/* 드롭다운 메뉴 */}
              {isDropdownOpen && (
                <div
                  className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 pointer-events-auto"
                  style={{ zIndex: 10000 }}
                >
                  <div className="py-2">
                    <div className="px-3 py-2 text-sm text-[#7c5c2b] font-semibold border-b border-gray-100">
                      {user.username}
                    </div>
                    <Link
                      to="/my-page"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 text-[#7c5c2b] hover:bg-[#f7e6b6] transition-colors duration-200"
                      style={{ fontFamily: "serif" }}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-semibold">마이페이지</span>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("모바일 로그아웃 버튼 클릭됨");
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors duration-200 w-full text-left cursor-pointer"
                      style={{ fontFamily: "serif" }}
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-semibold">로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 뉴스 상세 모달 (네비 뉴스 배너 클릭 시) */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full min-h-[70vh] py-24 px-16 flex flex-col justify-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* X 닫기 버튼 */}
            <button
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 text-3xl font-bold focus:outline-none"
              onClick={() => setSelectedNews(null)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-3xl font-semibold mb-8 text-gray-900">
              <span className="inline-block bg-blue-100 text-blue-700 text-base font-normal rounded-full px-3 py-1 mr-3 align-middle">
                {selectedNews.period}
              </span>
              {selectedNews.title}
            </h2>
            <p className="text-gray-700 mb-8 text-lg">{selectedNews.content}</p>
            <div className="text-gray-600 mb-8 text-xl whitespace-pre-line">
              {selectedNews.summary || selectedNews.content}
            </div>
            {selectedNews.affected_sectors && (
              <div className="mb-4">
                <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-base">
                  {selectedNews.affected_sectors}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
