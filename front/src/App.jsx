import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Stocks from './pages/Stocks'
import Portfolio from './pages/Portfolio'
import News from './pages/News'
import Quiz from './pages/Quiz'
import Ranking from './pages/Ranking'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
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
              path="/portfolio" 
              element={
                <PrivateRoute>
                  <Portfolio />
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
              path="/quiz" 
              element={
                <PrivateRoute>
                  <Quiz />
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
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

export default App 