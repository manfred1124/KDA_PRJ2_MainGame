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
} from "lucide-react";

const Navbar = () => {
  const { user, logout, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 뉴스 데이터 상태
  const [newsList, setNewsList] = useState([]);
  const [newsIdx, setNewsIdx] = useState(0);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    axios
      .get("/api/news")
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setNewsList(res.data);
          setNewsIdx(0);
        } else {
          // 뉴스가 없으면 기본 메시지 설정
          setNewsList([
            {
              title: "주식 투자 시뮬레이션 게임",
              content: "안전한 환경에서 투자 경험을 쌓아보세요!",
            },
          ]);
          setNewsIdx(0);
        }
      })
      .catch(() => {
        // 에러 시 기본 메시지 설정
        setNewsList([
          {
            title: "주식 투자 시뮬레이션 게임",
            content: "안전한 환경에서 투자 경험을 쌓아보세요!",
          },
        ]);
        setNewsIdx(0);
      });

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
      setNewsIdx((idx) => (idx + 1) % newsList.length);
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

      // 현재 라운드가 10인지 확인
      const currentRound = user?.current_round || 1;
      if (currentRound >= 10) {
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

        // 네비게이션 바 잔고 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new Event("transactionComplete"));
      } catch (userError) {
        console.error("사용자 정보 업데이트 실패:", userError);
        window.location.reload();
      }
    } catch (error) {
      console.error("다음 라운드 진행 실패:", error);
      console.error("에러 응답:", error.response?.data);
      console.error("에러 상태:", error.response?.status);
      // 여기서 detail이 '이미 마지막 라운드입니다.'면 결과 페이지로 이동
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data?.detail === "이미 마지막 라운드입니다."
      ) {
        toast.success("마지막 라운드입니다. 결과 페이지로 이동합니다.");
        navigate("/game-result");
      } else {
        toast.error(
          error.response?.data?.detail || "라운드 진행에 실패했습니다."
        );
      }
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
    <nav className="py-2 relative" style={{ fontFamily: "serif" }}>
      {/* RPG 스타일 배경 박스 */}
      <div
        className="absolute inset-0 w-full h-full z-0 rounded-b-[2.5rem] bg-[#f7e6b6] border-b-4 border-x-4 border-[#bfa76a] shadow-2xl"
        style={{ boxShadow: "0 8px 32px #c2b28055" }}
      ></div>
      <div className="w-full flex flex-col md:flex-row items-stretch md:h-28 gap-3 md:gap-4 px-2 md:px-6 relative z-10">
        {/* 왼쪽: 홈+제목 - 홈 버튼에 맞게 크기 조정 */}
        <div
          className="flex items-center px-3 md:px-4 rounded-[2rem] shadow-md bg-[#f3e7c4] border-4 border-[#bfa76a] flex-shrink-0 md:min-w-[120px] md:max-w-[140px] w-full md:w-auto mr-0 md:mr-2"
          style={{ fontFamily: "inherit" }}
        >
          <Link
            to="/"
            className="flex items-center space-x-2 w-full justify-center"
          >
            <span className="text-2xl md:text-3xl">🏠</span>
          </Link>
        </div>

        {/* 중앙: 뉴스배너 */}
        <div className="flex-1 flex items-center justify-center rounded-[2rem] shadow-md bg-[#f3e7c4] border-4 border-[#bfa76a] px-2 md:px-6 mx-0 md:mx-2 min-w-0">
          <div className="w-full flex items-center justify-center min-w-0">
            <div
              className="flex items-center bg-[#f7e6b6] border-2 border-[#e6d3a3] rounded-xl px-2 md:px-4 py-2 md:py-3 shadow text-[#7c5c2b] font-semibold text-sm md:text-base w-full max-w-xl min-w-0"
              style={{ fontFamily: "serif" }}
            >
              <span className="mr-2 md:mr-3 text-lg md:text-xl">📰</span>
              <span className="truncate min-w-0">
                {newsList.length > 0
                  ? newsList[newsIdx]?.title
                  : "최근 뉴스가 없습니다."}
              </span>
            </div>
          </div>
        </div>

        {/* 라운드 정보 - 크기 확대 및 다음 라운드 버튼 추가 */}
        <div className="flex flex-col items-center justify-center rounded-[2rem] shadow-md bg-[#f3e7c4] border-4 border-[#bfa76a] px-3 md:px-4 py-2 md:py-3 ml-0 md:ml-2 flex-shrink-0 md:min-w-[140px] md:max-w-[160px] w-full md:w-auto">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg md:text-xl">🎯</span>
            <div className="text-center">
              <div className="text-xs font-medium text-[#a67c3c]">라운드</div>
              <div className="text-lg md:text-xl font-bold text-[#7c5c2b]">
                {(user?.current_round_idx ?? 0) + 1}
              </div>
            </div>
          </div>
          <button
            onClick={handleNextRound}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors duration-200 border-2 ${
              (user?.current_round || 1) >= 10
                ? "bg-[#bfa76a] hover:bg-[#a67c3c] text-white border-[#a67c3c]"
                : "bg-[#7c5c2b] hover:bg-[#a67c3c] text-white border-[#e6d3a3]"
            }`}
            style={{ fontFamily: "serif" }}
          >
            {(user?.current_round || 1) >= 10 ? "결과 보기" : "다음 라운드"}
          </button>
        </div>

        {/* 오른쪽: 잔고 + 유저 정보 + 로그아웃 */}
        <div className="flex flex-col justify-center rounded-[2rem] shadow-md bg-[#f3e7c4] border-4 border-[#bfa76a] px-3 md:px-6 py-2 md:py-4 ml-0 md:ml-2 flex-shrink-0 md:min-w-[200px] md:max-w-[280px] w-full md:w-auto">
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-baseline space-x-1 md:space-x-2">
              <span className="text-sm md:text-base font-bold text-[#7c5c2b]">
                잔고:
              </span>
              <span className="text-lg md:text-2xl text-[#a67c3c] font-extrabold">
                {userBalance.toLocaleString()}
              </span>
              <span className="text-sm md:text-base font-bold text-[#7c5c2b]">
                원
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between w-full mt-1">
            <Link
              to="/my-page"
              className="text-base md:text-lg text-[#7c5c2b] font-semibold hover:text-[#a67c3c] transition-colors cursor-pointer"
              style={{ fontFamily: "serif" }}
            >
              {user.username}
            </Link>
            <button
              onClick={handleLogout}
              className="ml-2 md:ml-4 px-3 md:px-4 py-1.5 md:py-2 bg-[#f7e6b6] hover:bg-[#a67c3c] hover:text-white text-[#7c5c2b] rounded-full transition-colors duration-200 font-bold border-2 border-[#e6d3a3] shadow text-sm md:text-base text-center flex items-center justify-center whitespace-nowrap"
              style={{ minWidth: "70px", fontFamily: "serif" }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
