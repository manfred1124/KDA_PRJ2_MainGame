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
  ChevronUp,
} from "lucide-react";
import menu1Bg from "../assets/menu1.png";
import navbarBg from "../assets/navbar.png";
import menu2Bg from "../assets/menu2.png";

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
        return "🎮 조선왕조 투자실록";
    }
  };

  useEffect(() => {
    // 사용자 잔고 정보 가져오기
    fetchUserBalance();

    // 거래 완료 이벤트 리스너 추가
    const handleTransactionComplete = () => {
      fetchUserBalance();
    };

    window.addEventListener("transactionComplete", handleTransactionComplete);

    return () => {
      window.removeEventListener(
        "transactionComplete",
        handleTransactionComplete
      );
    };
  }, []);

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

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
      setUserBalance(user.total_balance || 0);
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
    logout();
    navigate("/login");
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

  // 잔고 정보(예시: user.balance 또는 user.total_balance)
  // 실제 잔고 필드명에 맞게 수정 필요
  const balance = user.total_balance || user.balance || 0;

  return (
    <nav
      className="py-2 lg:py-4 relative bg-gradient-to-r from-[#f7e6b6]/60 to-[#f3e7c4]/60 shadow-lg"
      style={{
        fontFamily: "Jua, sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto px-3 lg:px-4">
        {/* 데스크톱 레이아웃 */}
        <div className="hidden lg:flex items-center gap-6">
          {/* 왼쪽: 홈 버튼 */}
          <div className="flex-shrink-0">
            <Link
              to="/"
              className="flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <span className="text-3xl">🏠</span>
            </Link>
          </div>

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

          {/* 잔고 정보 */}
          <div className="flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-md px-6 py-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#a67c3c] font-medium">잔고</span>
                <span className="text-2xl font-bold text-[#7c5c2b]">
                  {userBalance.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* 유저 드롭다운 */}
          <div className="flex-shrink-0 relative dropdown-container">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
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
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200 w-full text-left"
                    style={{ fontFamily: "Jua, sans-serif" }}
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
          {/* 상단: 홈 + 뉴스 */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 flex-shrink-0"
            >
              <span className="text-2xl">🏠</span>
            </Link>

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

            {/* 잔고 정보 */}
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-md px-3 py-2">
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-xs text-[#a67c3c] font-medium">
                    잔고
                  </span>
                  <span className="text-sm font-bold text-[#7c5c2b] truncate">
                    {userBalance.toLocaleString()}원
                  </span>
                </div>
              </div>
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
                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
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
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors duration-200 w-full text-left"
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
