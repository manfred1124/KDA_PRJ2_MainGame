import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Stocks from "./pages/Stocks";
import News from "./pages/News";
import Ranking from "./pages/Ranking";
import SelectSector from "./pages/SelectSector";
import MyPage from "./pages/MyPage";
import GameResult from "./pages/GameResult";
import Review from "./pages/Review";
import GameIntro from "./pages/GameIntro";
import RoundIntro from "./pages/RoundIntro";
import PrivateRoute from "./components/PrivateRoute";
import ChatbotWidget from "./components/ChatbotWidget";
import LoadingScreen from "./components/LoadingScreen";
import heroImage1 from "./assets/mainlogo.png";
import heroImage2 from "./assets/mainlogo2.png";
import boardImage1 from "./assets/board1.png";
import ScrollToTop from "./components/ScrollToTop";
import BackgroundMusic from "./components/BackgroundMusic";
import BearTopLeftAnimation from "./components/BearTopLeftAnimation";
import { useAuth } from "./contexts/AuthContext";
import { AudioProvider } from "./contexts/AudioContext";

// 가이드 메시지 Context 생성
export const GuideMessageContext = createContext({ addGuideMessage: () => {} });
export const IntroContext = createContext({
  showIntro: false,
  setShowIntro: () => {},
});

export const BearDefeatedContext = createContext({ isBearDefeated: false, setIsBearDefeated: () => {} });

function App() {
  const [showLoading, setShowLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const isLoggedIn = !!localStorage.getItem("token");
  const navigate = useNavigate();
  const chatbotRef = useRef();
  const gameBoxRef = useRef();
  const location = useLocation();
  const { user } = useAuth();
  const showBoardBg = ["/login", "/register"].includes(location.pathname);
  const showGameBox = [
    "/",
    "/dashboard",
    "/stocks",
    "/news",
    "/ranking",
    "/select-sector",
    "/my-page",
    "/game-result",
    "/review",
    "/roundintro",
  ].includes(location.pathname);

  // 현재 라운드 계산
  const currentRound = (user?.current_round_idx ?? 0) + 1;

  const [isBearDefeated, setIsBearDefeated] = useState(false);

  // 가이드 메시지 추가 함수
  const addGuideMessage = (text) => {
    if (chatbotRef.current && chatbotRef.current.addGuideMessage) {
      chatbotRef.current.addGuideMessage(text);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 페이지 변경 시 게임 박스 스크롤 리셋
  useEffect(() => {
    if (gameBoxRef.current && showGameBox) {
      gameBoxRef.current.scrollTop = 0;
    }
  }, [location.pathname, showGameBox]);

  // Hero talking animation
  useEffect(() => {
    if (!showIntro) return;
    const interval = setInterval(() => {
      setHeroIdx((prev) => (prev === 0 ? 1 : 0));
    }, 400);
    return () => clearInterval(interval);
  }, [showIntro]);

  // localStorage의 showIntro가 true로 바뀌면 모달을 띄움
  useEffect(() => {
    if (localStorage.getItem("showIntro") === "true") {
      setShowIntro(true);
    }
  }, []);

  const handleCloseIntro = () => {
    setShowIntro(false);
    localStorage.removeItem("showIntro");
  };

  // 로그인 상태에 따른 페이지 리다이렉트
  useEffect(() => {
    // 로그인하지 않은 상태에서 보호된 페이지 접근 시 로그인 페이지로
    if (!isLoggedIn && showGameBox) {
      navigate("/login");
    }

    // 메인 페이지에서 로그인하지 않은 경우 로그인 페이지로
    if (!isLoggedIn && location.pathname === "/") {
      navigate("/login");
    }
  }, [isLoggedIn, location.pathname, navigate, showGameBox]);

  return (
    <>
      <IntroContext.Provider value={{ showIntro, setShowIntro }}>
        {/* 기존 인트로 모달 */}
        {showIntro && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-2xl mx-4 text-center shadow-2xl">
              <div className="relative">
                <img
                  src={heroIdx === 0 ? heroImage1 : heroImage2}
                  alt="Hero"
                  className="w-32 h-32 mx-auto mb-4 object-contain transition-all duration-300"
                />
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  🎮 투자 시뮬레이션 게임
                </h2>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  {(() => {
                    const messages = [
                      "허허, 용사여!\n주식 투자의 세계로 떠나는 모험을 시작하시게나!\n과인과 함께 현명한 투자자가 되어보지 않겠는가?",
                      "그대가 투자의 길에 발을 들여놓으셨구나!\n이곳은 위대한 투자 영웅이 탄생하는 곳이라네!",
                      "투자 시뮬레이션의 세계로 오신 것을 환영하네!\n이곳에서 그대의 투자 지혜를 키워보시게!",
                      "투자 모험의 세계에 발을 들여놓으셨구나!\n과인과 함께 현명한 투자 전략을 세워보시게!",
                    ];
                    return messages[
                      Math.floor(Math.random() * messages.length)
                    ];
                  })()}
                </p>
                <button
                  onClick={handleCloseIntro}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors duration-200 shadow-lg"
                >
                  게임 시작하기
                </button>
              </div>
            </div>
          </div>
        )}
        {showLoading ? (
          <LoadingScreen />
        ) : (
          <GuideMessageContext.Provider value={{ addGuideMessage, chatbotRef }}>
            <BearDefeatedContext.Provider value={{ isBearDefeated, setIsBearDefeated }}>
            <AudioProvider>
              <ScrollToTop />
              <div className="h-screen bg-[url('/bg.jpg')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col overflow-hidden">
                {/* 게임 화면에서만 Bear 애니메이션 표시 */}
                {showGameBox && <BearTopLeftAnimation />}
                {/* Navbar 표시 */}
                <Navbar />
                <div
                  className={`flex-1 container mx-auto px-4 py-4 flex flex-row gap-8 items-stretch min-h-0 ${
                    location.pathname === "/" ? "p-0" : ""
                  }`}
                >
                  {/* 메인 컨텐츠 */}
                  <main
                    className={`flex-1 min-w-0 flex items-start justify-center ${
                      location.pathname === "/" ? "w-full" : ""
                    }`}
                  >
                    <div
                      ref={showGameBox ? gameBoxRef : null}
                      className={`w-full max-w-2xl game-scrollbar flex flex-col items-center justify-center relative z-30`}
                      style={
                        showBoardBg
                          ? {
                              backgroundImage: `url(${boardImage1})`,
                              backgroundSize: "contain",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              maxHeight: 3500,
                              width: "120%",
                            }
                          : showGameBox
                          ? {
                              backgroundColor: "rgba(0, 30, 90, 0.3)",
                              border: "3px solid rgba(139, 69, 19, 0.6)",
                              borderRadius: "15px",
                              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                              backdropFilter: "blur(8px)",
                              height: "100%",
                              width: "100%",
                              maxWidth: "900px",
                              overflow: "auto",
                              padding: "20px",
                              display: "flex",
                              flexDirection: "column",
                            }
                          : {}
                      }
                    >
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* 메인 페이지 */}
                        <Route
                          path="/"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <GameIntro />
                              </div>
                            </PrivateRoute>
                          }
                        />

                        <Route
                          path="/dashboard"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <Dashboard />
                              </div>
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/stocks"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <Stocks />
                              </div>
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/news"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <News />
                              </div>
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/ranking"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <Review />
                              </div>
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/select-sector"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <SelectSector chatbotRef={chatbotRef} />
                              </div>
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/my-page"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <MyPage />
                              </div>
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/game-result"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <GameResult />
                              </div>
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/review"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <Review />
                              </div>
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/roundintro"
                          element={
                            <PrivateRoute>
                              <div
                                className={
                                  showGameBox
                                    ? "flex-1 flex flex-col h-full w-full"
                                    : ""
                                }
                              >
                                <RoundIntro />
                              </div>
                            </PrivateRoute>
                          }
                        />
                      </Routes>
                    </div>
                  </main>
                  {/* 챗봇 표시 */}
                  {isLoggedIn && (
                    <aside
                      className="w-[420px] max-w-full flex-shrink-0 flex flex-col justify-start h-full"
                      style={{ zIndex: 5 }}
                    >
                      <div className="h-full flex flex-col">
                        <ChatbotWidget
                          ref={chatbotRef}
                          fixedPanel
                          currentRound={currentRound}
                        />
                      </div>
                    </aside>
                  )}
                </div>
              </div>
            </AudioProvider>
          </BearDefeatedContext.Provider>
          </GuideMessageContext.Provider>
        )}
      </IntroContext.Provider>
      <BackgroundMusic />
    </>
  );
}
export default App;
