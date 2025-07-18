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
import PrivateRoute from "./components/PrivateRoute";
import ChatbotWidget from "./components/ChatbotWidget";
import LoadingScreen from "./components/LoadingScreen";
import heroImage1 from "./assets/mainlogo.png";
import heroImage2 from "./assets/mainlogo2.png";
import boardImage1 from "./assets/board1.png";
import ScrollToTop from "./components/ScrollToTop";
import BackgroundMusic from "./components/BackgroundMusic";
import { useAuth } from "./contexts/AuthContext";

// 가이드 메시지 Context 생성
export const GuideMessageContext = createContext({ addGuideMessage: () => {} });
export const IntroContext = createContext({
  showIntro: false,
  setShowIntro: () => {},
});

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
    "/stocks",
    "/news",
    "/ranking",
    "/select-sector",
    "/my-page",
    "/game-result",
    "/review",
  ].includes(location.pathname);

  // 현재 라운드 계산
  const currentRound = (user?.current_round_idx ?? 0) + 1;

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

  return (
    <>
      <IntroContext.Provider value={{ showIntro, setShowIntro }}>
        {!showLoading && showIntro && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: "url('/bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", gap: 48 }}>
              {/* Speech bubble (left, larger) */}
              <div
                style={{
                  background: "#fffbe6",
                  borderRadius: 32,
                  boxShadow: "0 8px 32px #bfa76a55",
                  padding: "3.2rem 3.2rem 2.2rem 3.2rem",
                  maxWidth: 600,
                  minWidth: 400,
                  textAlign: "center",
                  position: "relative",
                  fontFamily: "Jua, sans-serif",
                }}
              >
                {/* Speech bubble tail (right side) */}
                <div
                  style={{
                    position: "absolute",
                    right: -40,
                    bottom: 48,
                    width: 0,
                    height: 0,
                    borderTop: "28px solid transparent",
                    borderBottom: "28px solid transparent",
                    borderLeft: "40px solid #fffbe6",
                    filter: "drop-shadow(2px 2px 2px #bfa76a33)",
                  }}
                />
                <div
                  style={{
                    fontSize: 28,
                    color: "#7c5c2b",
                    marginBottom: 36,
                    lineHeight: 1.6,
                  }}
                >
                  용사여, 모의투자 게임에 온 것을 환영하네!
                  <br />
                  이곳은 투자 모험의 세계라네.
                  <br />
                  나와 함께 투자 영웅이 되어보지 않겠는가?
                </div>
                <button
                  onClick={handleCloseIntro}
                  style={{
                    padding: "1.1rem 3rem",
                    fontSize: "1.3rem",
                    fontWeight: "normal",
                    backgroundColor: "#001E5A",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
                    transition: "transform 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.transform = "scale(1.05)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  게임 시작하기 →
                </button>
              </div>
              {/* Hero image (right, outside speech bubble) */}
              <img
                src={heroIdx === 0 ? heroImage1 : heroImage2}
                alt="hero"
                style={{
                  width: 220,
                  height: 220,
                  objectFit: "contain",
                  display: "block",
                  marginBottom: 0,
                }}
              />
            </div>
          </div>
        )}
        {showLoading ? (
          <LoadingScreen />
        ) : (
          <GuideMessageContext.Provider value={{ addGuideMessage }}>
            <ScrollToTop />
            <div className="h-screen bg-[url('/bg.jpg')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col overflow-hidden">
              <Navbar />
              <div className="flex-1 container mx-auto px-4 py-4 flex flex-row gap-8 items-stretch min-h-0">
                {/* 왼쪽: 메인 컨텐츠 */}
                <main className="flex-1 min-w-0 flex items-start justify-center">
                  <div
                    ref={showGameBox ? gameBoxRef : null}
                    className={`w-full max-w-2xl game-scrollbar flex flex-col items-center justify-center ${
                      showGameBox ? "" : "p-4"
                    }`}
                    style={
                      showBoardBg
                        ? {
                            backgroundImage: `url(${boardImage1})`,
                            backgroundSize: "700px 600px",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            maxHeight: 3500,
                            width: "120%",
                          }
                        : showGameBox
                        ? {
                            backgroundColor: "rgba(255, 255, 255, 0.4)",
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
                              <News />
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
                              <Ranking />
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
                              <SelectSector />
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
                    </Routes>
                  </div>
                </main>
                {/* 오른쪽: 챗봇 영역 */}
                {isLoggedIn && (
                  <aside className="w-[420px] max-w-full flex-shrink-0 flex flex-col justify-start h-full">
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
          </GuideMessageContext.Provider>
        )}
      </IntroContext.Provider>
      <BackgroundMusic />
    </>
  );
}
export default App;
