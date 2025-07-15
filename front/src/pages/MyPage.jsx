import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, DollarSign, Package, User, Calendar, Trophy, TrendingUp as StockIcon, Newspaper } from 'lucide-react'

const MyPage = () => {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPortfolio()
    fetchUserInfo()
  }, [])

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get('/api/portfolio')
      setPortfolio(response.data)
    } catch (error) {
      toast.error('포트폴리오를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      updateUser(response.data)
    } catch (error) {
      console.error('사용자 정보 업데이트 실패:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!portfolio) {
    return <div>포트폴리오를 불러올 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      {/* 사용자 정보 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-full">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{user?.username}</h1>
            <p className="text-blue-100">투자자</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar size={20} />
            <span>현재 라운드: {user?.current_round || 1}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Trophy size={20} />
            <span>총 수익률: {portfolio.total_profit_percentage >= 0 ? '+' : ''}{portfolio.total_profit_percentage.toFixed(2)}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign size={20} />
            <span>총 자산: {(portfolio.total_balance + portfolio.total_portfolio_value).toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 빠른 이동 버튼 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">빠른 이동</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/select-sector')}
            className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg hover:from-blue-100 hover:to-indigo-200 transition-all duration-200 border border-blue-200 hover:border-blue-300"
          >
            <StockIcon className="text-blue-600 mb-2" size={24} />
            <span className="text-sm font-semibold text-blue-800">주식 투자</span>
          </button>
          
          <button
            onClick={() => navigate('/news')}
            className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg hover:from-green-100 hover:to-emerald-200 transition-all duration-200 border border-green-200 hover:border-green-300"
          >
            <Newspaper className="text-green-600 mb-2" size={24} />
            <span className="text-sm font-semibold text-green-800">뉴스</span>
          </button>
          
          <button
            onClick={() => navigate('/ranking')}
            className="flex flex-col items-center p-4 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg hover:from-yellow-100 hover:to-amber-200 transition-all duration-200 border border-yellow-200 hover:border-yellow-300"
          >
            <Trophy className="text-yellow-600 mb-2" size={24} />
            <span className="text-sm font-semibold text-yellow-800">랭킹</span>
          </button>
        </div>
      </div>

      {/* 포트폴리오 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">보유 현금</p>
              <p className="text-xl font-bold text-gray-900">
                {portfolio.total_balance.toLocaleString()}원
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">포트폴리오 가치</p>
              <p className="text-xl font-bold text-gray-900">
                {portfolio.total_portfolio_value.toLocaleString()}원
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="text-blue-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">미실현 손익</p>
              <p className={`text-xl font-bold ${
                portfolio.total_profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolio.total_profit_loss >= 0 ? '+' : ''}
                {portfolio.total_profit_loss.toLocaleString()}원
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              portfolio.total_profit_loss >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {portfolio.total_profit_loss >= 0 ? (
                <TrendingUp className="text-green-600" size={20} />
              ) : (
                <TrendingDown className="text-red-600" size={20} />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">실현 수익</p>
              <p className={`text-xl font-bold ${
                portfolio.realized_profit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolio.realized_profit >= 0 ? '+' : ''}
                {portfolio.realized_profit.toLocaleString()}원
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              portfolio.realized_profit >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {portfolio.realized_profit >= 0 ? (
                <TrendingUp className="text-green-600" size={20} />
              ) : (
                <TrendingDown className="text-red-600" size={20} />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 수익</p>
              <p className={`text-xl font-bold ${
                portfolio.total_profit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolio.total_profit >= 0 ? '+' : ''}
                {portfolio.total_profit.toLocaleString()}원
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              portfolio.total_profit >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {portfolio.total_profit >= 0 ? (
                <TrendingUp className="text-green-600" size={20} />
              ) : (
                <TrendingDown className="text-red-600" size={20} />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 수익률</p>
              <p className={`text-xl font-bold ${
                portfolio.total_profit_percentage >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolio.total_profit_percentage >= 0 ? '+' : ''}
                {portfolio.total_profit_percentage.toFixed(2)}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              portfolio.total_profit_percentage >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {portfolio.total_profit_percentage >= 0 ? (
                <TrendingUp className="text-green-600" size={20} />
              ) : (
                <TrendingDown className="text-red-600" size={20} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 보유 주식 목록 */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            보유 주식 ({portfolio.items.length}종목)
          </h3>
        </div>
        
        {portfolio.items.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">아직 보유한 주식이 없습니다.</p>
            <p className="text-sm text-gray-400">
              주식 투자를 시작해보세요!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">종목</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">보유수량</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">평균단가</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">현재가</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">평가금액</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">손익</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">수익률</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.items.map((item) => (
                  <tr key={item.stock_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-gray-900">{item.stock_name}</p>
                        <p className="text-sm text-gray-500">{item.stock_symbol}</p>
                      </div>
                    </td>
                    <td className="text-right py-4 px-6 font-semibold text-gray-900">
                      {(item.quantity ?? 0).toLocaleString()}주
                    </td>
                    <td className="text-right py-4 px-6 text-gray-600">
                      {(item.average_price ?? 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-4 px-6 font-semibold text-gray-900">
                      {(item.current_price ?? 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-4 px-6 font-semibold text-gray-900">
                      {(item.total_value ?? 0).toLocaleString()}원
                    </td>
                    <td className={`text-right py-4 px-6 font-semibold ${
                      (item.profit_loss ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(item.profit_loss ?? 0) >= 0 ? '+' : ''}
                      {(item.profit_loss ?? 0).toLocaleString()}원
                    </td>
                    <td className={`text-right py-4 px-6 font-semibold ${
                      (item.profit_loss_percentage ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(item.profit_loss_percentage ?? 0) >= 0 ? '+' : ''}
                      {(item.profit_loss_percentage ?? 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyPage 