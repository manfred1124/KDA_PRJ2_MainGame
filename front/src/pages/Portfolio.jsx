import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react'

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPortfolio()
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black bg-opacity-30">
        <img
          src="/warrior.png"
          alt="로딩 캐릭터"
          style={{ width: 220, height: 320 }}
          className="mb-6"
        />
        <span className="text-2xl text-white font-bold animate-blink-slow" style={{ fontFamily: 'Jua, sans-serif' }}>
          전투 진행중...
        </span>
      </div>
    );
  }

  if (!portfolio) {
    return <div>포트폴리오를 불러올 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          💼 포트폴리오
        </h1>
        <p className="text-gray-600">
          현재 보유 주식과 투자 성과를 확인하세요!
        </p>
      </div>

      {/* 포트폴리오 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">보유 현금</p>
              <p className="text-2xl font-bold text-gray-900">
                {portfolio.total_balance.toLocaleString()}원
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
                {portfolio.total_portfolio_value.toLocaleString()}원
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">미실현 손익</p>
              <p className={`text-2xl font-bold ${
                portfolio.total_profit_loss >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {portfolio.total_profit_loss >= 0 ? '+' : ''}
                {portfolio.total_profit_loss.toLocaleString()}원
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              portfolio.total_profit_loss >= 0 ? 'bg-success-100' : 'bg-danger-100'
            }`}>
              {portfolio.total_profit_loss >= 0 ? (
                <TrendingUp className="text-success-600" size={24} />
              ) : (
                <TrendingDown className="text-danger-600" size={24} />
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">실현 수익</p>
              <p className={`text-2xl font-bold ${
                portfolio.realized_profit >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {portfolio.realized_profit >= 0 ? '+' : ''}
                {portfolio.realized_profit.toLocaleString()}원
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              portfolio.realized_profit >= 0 ? 'bg-success-100' : 'bg-danger-100'
            }`}>
              {portfolio.realized_profit >= 0 ? (
                <TrendingUp className="text-success-600" size={24} />
              ) : (
                <TrendingDown className="text-danger-600" size={24} />
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 수익</p>
              <p className={`text-2xl font-bold ${
                portfolio.total_profit >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {portfolio.total_profit >= 0 ? '+' : ''}
                {portfolio.total_profit.toLocaleString()}원
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              portfolio.total_profit >= 0 ? 'bg-success-100' : 'bg-danger-100'
            }`}>
              {portfolio.total_profit >= 0 ? (
                <TrendingUp className="text-success-600" size={24} />
              ) : (
                <TrendingDown className="text-danger-600" size={24} />
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 수익률</p>
              <p className={`text-2xl font-bold ${
                portfolio.total_profit_percentage >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {portfolio.total_profit_percentage >= 0 ? '+' : ''}
                {portfolio.total_profit_percentage.toFixed(2)}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              portfolio.total_profit_percentage >= 0 ? 'bg-success-100' : 'bg-danger-100'
            }`}>
              {portfolio.total_profit_percentage >= 0 ? (
                <TrendingUp className="text-success-600" size={24} />
              ) : (
                <TrendingDown className="text-danger-600" size={24} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 보유 주식 목록 */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          보유 주식 ({portfolio.items.length}종목)
        </h3>
        
        {portfolio.items.length === 0 ? (
          <div className="text-center py-8">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">아직 보유한 주식이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">
              주식 페이지에서 구매하기해보세요!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">종목</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">보유수량</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">평균단가</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">현재가</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">평가금액</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">손익</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">수익률</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.items.map((item) => (
                  <tr key={item.stock_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.stock_name}</p>
                        <p className="text-sm text-gray-500">{item.stock_symbol}</p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">
                      {(item.quantity ?? 0).toLocaleString()}주
                    </td>
                    <td className="text-right py-3 px-4 text-gray-600">
                      {(item.average_price ?? 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">
                      {(item.current_price ?? 0).toLocaleString()}원
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">
                      {(item.total_value ?? 0).toLocaleString()}원
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${
                      (item.profit_loss ?? 0) >= 0 ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {(item.profit_loss ?? 0) >= 0 ? '+' : ''}
                      {(item.profit_loss ?? 0).toLocaleString()}원
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${
                      (item.profit_loss_percentage ?? 0) >= 0 ? 'text-success-600' : 'text-danger-600'
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

export default Portfolio 