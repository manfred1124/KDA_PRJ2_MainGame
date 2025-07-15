import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Trophy, TrendingUp, TrendingDown, DollarSign, RefreshCw, Home } from 'lucide-react'

const GameResult = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [gameState, setGameState] = useState(null)
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGameResult()
  }, [])

  const fetchGameResult = async () => {
    try {
      // 게임 상태 조회
      const gameResponse = await axios.get('/api/game/state')
      setGameState(gameResponse.data)

      // 랭킹 조회
      const rankingResponse = await axios.get('/api/ranking')
      setRanking(rankingResponse.data)
    } catch (error) {
      console.error('게임 결과 조회 실패:', error)
      toast.error('게임 결과를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRestartGame = async () => {
    try {
      const response = await axios.post('/api/game/restart')
      console.log('게임 재시작 응답:', response.data)
      toast.success('게임이 재시작되었습니다!')
      
      // API 응답에서 사용자 정보 업데이트
      if (response.data.user) {
        console.log('게임 재시작 후 사용자 정보:', response.data.user)
        
        // AuthContext의 사용자 정보 업데이트
        window.dispatchEvent(new CustomEvent('userUpdated', { 
          detail: response.data.user 
        }))
        
        // 네비게이션 바 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new Event('transactionComplete'))
        
        navigate('/')
      } else {
        // 백업: 사용자 정보 직접 조회
        try {
          const userResponse = await axios.get('/api/auth/me')
          console.log('게임 재시작 후 사용자 정보 (백업):', userResponse.data)
          
          window.dispatchEvent(new CustomEvent('userUpdated', { 
            detail: userResponse.data 
          }))
          
          window.dispatchEvent(new Event('transactionComplete'))
          
          navigate('/')
        } catch (userError) {
          console.error('사용자 정보 업데이트 실패:', userError)
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('게임 재시작 실패:', error)
      toast.error('게임 재시작에 실패했습니다.')
    }
  }

  const handleGoHome = () => {
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">게임 결과를 불러올 수 없습니다.</h1>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const userRank = ranking.find(r => r.username === user?.username)
  const rank = userRank ? userRank.rank : 'N/A'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🎉 게임 완료! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            {user?.username}님의 투자 여정이 끝났습니다!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 투자 결과 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Trophy className="mr-3 text-yellow-500" />
              투자 결과
            </h2>

            <div className="space-y-6">
              {/* 총 수익률 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">총 수익률</p>
                    <p className={`text-3xl font-bold ${
                      gameState.total_profit_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {gameState.total_profit_percentage >= 0 ? '+' : ''}{gameState.total_profit_percentage.toFixed(2)}%
                    </p>
                  </div>
                  {gameState.total_profit_percentage >= 0 ? (
                    <TrendingUp className="text-green-500 text-4xl" />
                  ) : (
                    <TrendingDown className="text-red-500 text-4xl" />
                  )}
                </div>
              </div>

              {/* 총 수익 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">총 수익</p>
                    <p className={`text-2xl font-bold ${
                      gameState.total_profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {gameState.total_profit >= 0 ? '+' : ''}{gameState.total_profit.toLocaleString()}원
                    </p>
                  </div>
                  <DollarSign className="text-green-500 text-3xl" />
                </div>
              </div>

              {/* 최종 자산 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                <div>
                  <p className="text-sm text-gray-600">최종 자산</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(gameState.total_balance + gameState.total_portfolio_value).toLocaleString()}원
                  </p>
                </div>
              </div>

              {/* 실현 수익 */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6">
                <div>
                  <p className="text-sm text-gray-600">실현 수익</p>
                  <p className={`text-xl font-bold ${
                    gameState.realized_profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {gameState.realized_profit >= 0 ? '+' : ''}{gameState.realized_profit.toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 랭킹 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Trophy className="mr-3 text-yellow-500" />
              전체 랭킹
            </h2>

            <div className="space-y-4">
              {ranking.slice(0, 10).map((rankItem, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    rankItem.username === user?.username
                      ? 'bg-blue-100 border-2 border-blue-300'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-500 text-white' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className={`font-semibold ${
                        rankItem.username === user?.username ? 'text-blue-700' : 'text-gray-800'
                      }`}>
                        {rankItem.username}
                        {rankItem.username === user?.username && ' (나)'}
                      </p>
                      <p className="text-sm text-gray-600">
                        수익률: {rankItem.total_profit_loss_percentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">
                      {rankItem.total_portfolio_value.toLocaleString()}원
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 내 순위 */}
            {userRank && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-center text-blue-800 font-semibold">
                  내 순위: <span className="text-2xl font-bold">{rank}</span>위
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={handleRestartGame}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <span>새 게임 시작</span>
          </button>
          <button
            onClick={handleGoHome}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center space-x-2 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>홈으로</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameResult 