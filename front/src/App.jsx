import React from "react";
import { Routes, Route } from "react-router-dom";
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

function App() {
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
        <ChatbotWidget />
      </div>
    </AuthProvider>
  );
}

export default App;
