import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
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
import ChatbotWidget from "./components/ChatbotWidget";
import LoadingScreen from "./components/LoadingScreen";
import GameIntro from "./components/GameIntro";

function App() {
  const [showLoading, setShowLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(() => {
    // 최초 마운트 시 localStorage에서 introShown 확인
    return !localStorage.getItem("introShown");
  });
  // 로그인 여부 확인하기 - 토큰으로
  const isLoggedIn = !!localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showLoading) {
    return <LoadingScreen />;
  }

  if (showIntro) {
    return (
      <GameIntro
        onStart={() => {
          setShowIntro(false);
          localStorage.setItem("introShown", "true");
          navigate("/login");
        }}
      />
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[url('/bg.jpg')] bg-cover bg-center bg-no-repeat bg-fixed">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <News />
                </PrivateRoute>
              }
            />
            <Route
              path="/stocks"
              element={
                <PrivateRoute>
                  <Stocks />
                </PrivateRoute>
              }
            />
            <Route
              path="/news"
              element={
                <PrivateRoute>
                  <News />
                </PrivateRoute>
              }
            />
            <Route
              path="/ranking"
              element={
                <PrivateRoute>
                  <Ranking />
                </PrivateRoute>
              }
            />
            <Route
              path="/select-sector"
              element={
                <PrivateRoute>
                  <SelectSector />
                </PrivateRoute>
              }
            />
            <Route
              path="/my-page"
              element={
                <PrivateRoute>
                  <MyPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/game-result"
              element={
                <PrivateRoute>
                  <GameResult />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
        {isLoggedIn && <ChatbotWidget />}
      </div>
    </AuthProvider>
  );
}

export default App;
