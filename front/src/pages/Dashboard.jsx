import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  ArrowRight,
  RefreshCw
} from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    fetchGameState()
  }, [])

  const fetchGameState = async () => {
    try {
      const response = await axios.get('/api/game/state')
      setGameState(response.data)
    } catch (error) {
      toast.error('게임 상태를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const advanceRound = async () => {
    setAdvancing(true)
    try {
      const response = await axios.post('/api/game/next-round')
      toast.success(`라운드 ${response.data.new_round}로 진행되었습니다!`)
      fetchGameState()
    } catch (error) {
      toast.error('라운드 진행에 실패했습니다.')
    } finally {
      setAdvancing(false)
    }
  }

  const restartGame = async () => {
    if (!window.confirm('정말로 게임을 다시 시작하시겠습니까?\n모든 진행 상황이 초기화됩니다.')) {
      return
    }
    
    setRestarting(true)
    try {
      const response = await axios.post('/api/game/restart')
      toast.success('게임이 성공적으로 재시작되었습니다!')
      fetchGameState()
    } catch (error) {
      toast.error('게임 재시작에 실패했습니다.')
    } finally {
      setRestarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!gameState) {
    return <div>게임 상태를 불러올 수 없습니다.</div>
  }

  const profitLossColor = gameState.total_profit_loss >= 0 ? 'text-success-600' : 'text-danger-600'
  const profitLossIcon = gameState.total_profit_loss >= 0 ? <TrendingUp /> : <TrendingDown />

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🎮 대시보드
        </h1>
        <p className="text-gray-600">
          {user.username}님, 주식 투자 시뮬레이션을 즐겨보세요!
        </p>
      </div>

      {/* 게임 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">현재 라운드</p>
              <p className="text-2xl font-bold text-gray-900">
                {gameState.current_round} / {gameState.total_rounds}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{gameState.current_date}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">보유 현금</p>
              <p className="text-2xl font-bold text-gray-900">
                {gameState.total_balance.toLocaleString()}원
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">포트폴리오 가치</p>
              <p className="text-2xl font-bold text-gray-900">
                {gameState.total_portfolio_value.toLocaleString()}원
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 손익</p>
              <p className={`text-2xl font-bold ${profitLossColor}`}>
                {gameState.total_profit_loss >= 0 ? '+' : ''}
                {gameState.total_profit_loss.toLocaleString()}원
              </p>
              <p className={`text-sm ${profitLossColor}`}>
                ({gameState.total_profit_loss_percentage >= 0 ? '+' : ''}
                {gameState.total_profit_loss_percentage.toFixed(2)}%)
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              gameState.total_profit_loss >= 0 ? 'bg-success-100' : 'bg-danger-100'
            }`}>
              <div className={profitLossColor}>
                {profitLossIcon}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 라운드 진행 버튼 */}
      {gameState.can_advance_round && (
        <div className="card text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            다음 라운드로 진행하시겠습니까?
          </h3>
          <p className="text-gray-600 mb-6">
            라운드를 진행하면 주식 가격이 변동되고 새로운 뉴스가 발표됩니다.
          </p>
          <button
            onClick={advanceRound}
            disabled={advancing}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            {advancing ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                <span>진행 중...</span>
              </>
            ) : (
              <>
                <ArrowRight size={20} />
                <span>다음 라운드 진행</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 게임 완료 메시지 */}
      {gameState.is_game_completed && (
        <div className="card text-center bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 게임 완료!
          </h3>
          <p className="text-gray-600 mb-4">
            모든 라운드를 완료하셨습니다. 최종 성과를 확인해보세요!
          </p>
          <div className="text-lg font-semibold text-gray-900 mb-6">
            최종 수익률: {gameState.total_profit_percentage.toFixed(2)}%
          </div>
          <button
            onClick={restartGame}
            disabled={restarting}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            {restarting ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                <span>재시작 중...</span>
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                <span>게임 다시하기</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 게임 가이드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 게임 진행 방법
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 주식 페이지에서 원하는 종목을 매수/매도하세요</li>
            <li>• 뉴스 페이지에서 시장 동향을 확인하세요</li>
            <li>• 퀴즈를 풀어 투자 지식을 쌓으세요</li>
            <li>• 준비가 되면 다음 라운드로 진행하세요</li>
            <li>• 총 10라운드 동안 최고의 수익률을 달성하세요!</li>
          </ul>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎯 투자 팁
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• 분산 투자로 리스크를 줄이세요</li>
            <li>• 뉴스와 시장 동향을 잘 파악하세요</li>
            <li>• 감정에 휘둘리지 말고 차분히 판단하세요</li>
            <li>• 장기적인 관점으로 투자하세요</li>
            <li>• 다른 플레이어들과 경쟁하며 실력을 키우세요</li>
          </ul>
        </div>
      </div>

      {/* 게임 관리 */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ⚙️ 게임 관리
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">
              게임을 처음부터 다시 시작하고 싶으시다면 아래 버튼을 클릭하세요.
            </p>
            <p className="text-xs text-gray-500">
              ⚠️ 주의: 모든 진행 상황이 초기화됩니다.
            </p>
          </div>
          <button
            onClick={restartGame}
            disabled={restarting}
            className="btn-secondary flex items-center space-x-2 whitespace-nowrap"
          >
            {restarting ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                <span>재시작 중...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span>게임 재시작</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 