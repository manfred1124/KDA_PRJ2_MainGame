import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { 
  Home, 
  TrendingUp, 
  Briefcase, 
  Newspaper, 
  HelpCircle, 
  Trophy,
  LogOut,
  User
} from 'lucide-react'

const Navbar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // 뉴스 데이터 상태
  const [newsList, setNewsList] = useState([])
  const [newsIdx, setNewsIdx] = useState(0)

  useEffect(() => {
    axios.get('/api/news')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setNewsList(res.data)
          setNewsIdx(0)
        } else {
          setNewsList([])
          setNewsIdx(0)
        }
      })
      .catch(() => {
        setNewsList([])
        setNewsIdx(0)
      })
  }, [])

  // 10초마다 뉴스 인덱스 순환
  useEffect(() => {
    if (newsList.length <= 1) return
    const timer = setInterval(() => {
      setNewsIdx(idx => (idx + 1) % newsList.length)
    }, 10000)
    return () => clearInterval(timer)
  }, [newsList])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/', label: '대시보드', icon: Home },
    { path: '/stocks', label: '주식', icon: TrendingUp },
    { path: '/portfolio', label: '포트폴리오', icon: Briefcase },
    { path: '/news', label: '뉴스', icon: Newspaper },
    { path: '/quiz', label: '퀴즈', icon: HelpCircle },
    { path: '/ranking', label: '랭킹', icon: Trophy },
  ]

  if (!user) return null

  // 잔고 정보(예시: user.balance 또는 user.total_balance)
  // 실제 잔고 필드명에 맞게 수정 필요
  const balance = user.total_balance || user.balance || 0

  return (
    <nav className="bg-gradient-to-r from-blue-50 to-white py-2">
      <div className="w-full flex flex-col md:flex-row items-stretch md:h-28 gap-3 md:gap-6 px-2 md:px-8">
        {/* 왼쪽: 홈+제목 */}
        <div className="flex items-center px-4 md:px-8 rounded-2xl shadow-md bg-white border-2 border-blue-200 flex-shrink-0 flex-grow md:flex-grow-0 min-w-0 md:min-w-[180px] md:max-w-[240px] w-full md:w-1/4 mr-0 md:mr-2" style={{fontFamily:'inherit'}}>
          <Link to="/" className="flex items-center space-x-2 md:space-x-3 w-full overflow-hidden">
            <span className="text-3xl md:text-4xl mr-2">🏠</span>
            <span className="text-lg md:text-2xl font-extrabold text-blue-800 tracking-tight whitespace-nowrap">모의투자</span>
          </Link>
        </div>
        {/* 중앙: 뉴스배너 */}
        <div className="flex-1 flex items-center justify-center rounded-2xl shadow-md bg-white border-2 border-blue-200 px-2 md:px-8 mx-0 md:mx-2 min-w-0">
          <div className="w-full flex items-center justify-center min-w-0">
            <div className="flex items-center bg-blue-100 border border-blue-300 rounded-xl px-2 md:px-6 py-2 md:py-3 shadow text-blue-900 font-semibold text-base md:text-lg w-full max-w-2xl min-w-0">
              <span className="mr-2 md:mr-3 text-xl md:text-2xl">📰</span>
              <span className="truncate min-w-0">
                {newsList.length > 0 ? newsList[newsIdx]?.title : '최근 뉴스가 없습니다.'}
              </span>
            </div>
          </div>
        </div>
        {/* 오른쪽: 잔고 + 유저 정보 + 로그아웃 */}
        <div className="flex flex-col justify-center rounded-2xl shadow-md bg-white border-2 border-blue-200 px-4 md:px-8 py-2 md:py-4 ml-0 md:ml-2 flex-shrink-0 flex-grow md:flex-grow-0 min-w-0 md:min-w-[220px] md:max-w-[340px] w-full md:w-1/4">
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-baseline space-x-1 md:space-x-2">
              <span className="text-sm md:text-base font-bold text-gray-700">잔고:</span>
              <span className="text-lg md:text-2xl text-blue-700 font-extrabold">{balance.toLocaleString()}</span>
              <span className="text-sm md:text-base font-bold text-gray-700">원</span>
            </div>
          </div>
          <div className="flex items-center justify-between w-full mt-1">
            <span className="text-base md:text-lg text-gray-700 font-semibold">{user.username}</span>
            <button
              onClick={handleLogout}
              className="ml-2 md:ml-4 px-4 md:px-6 py-1.5 md:py-2 bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-700 rounded-full transition-colors duration-200 font-bold border-2 border-blue-200 shadow text-base md:text-lg text-center flex items-center justify-center whitespace-nowrap"
              style={{minWidth:'80px'}}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 