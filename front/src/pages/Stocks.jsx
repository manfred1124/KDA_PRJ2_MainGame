import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Tag } from 'lucide-react'

const Stocks = () => {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStock, setSelectedStock] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [transactionType, setTransactionType] = useState('buy')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchStocks()
  }, [])

  const fetchStocks = async () => {
    try {
      const response = await axios.get('/api/stocks')
      setStocks(response.data)
    } catch (error) {
      toast.error('주식 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleTransaction = async () => {
    if (!quantity || quantity <= 0) {
      toast.error('수량을 입력해주세요.')
      return
    }

    try {
      const response = await axios.post(`/api/portfolio/${transactionType}`, {
        stock_id: selectedStock.id,
        quantity: parseInt(quantity),
        price: selectedStock.current_price
      })

      toast.success(response.data.message)
      setShowModal(false)
      setQuantity('')
      setSelectedStock(null)
    } catch (error) {
      toast.error(error.response?.data?.detail || '거래에 실패했습니다.')
    }
  }

  const openTransactionModal = (stock, type) => {
    setSelectedStock(stock)
    setTransactionType(type)
    setShowModal(true)
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
          전투 준비중...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          📈 주식 거래
        </h1>
        <p className="text-gray-600">
          한국 대표 주식들을 거래해보세요!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stocks.map((stock) => (
          <div key={stock.id} className="card stock-chart">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {stock.name}
                </h3>
                <p className="text-sm text-gray-600">{stock.symbol}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Tag size={16} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{stock.sector}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {stock.current_price.toLocaleString()}원
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => openTransactionModal(stock, 'buy')}
                className="btn-danger flex-1 flex items-center justify-center space-x-2"
              >
                <ShoppingCart size={16} />
                <span>구매하기</span>
              </button>
              <button
                onClick={() => openTransactionModal(stock, 'sell')}
                className="btn-success flex-1 flex items-center justify-center space-x-2"
              >
                <Tag size={16} />
                <span>판매하기</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 거래 모달 */}
      {showModal && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {transactionType === 'buy' ? '구매하기' : '판매하기'} 거래
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">종목</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedStock.name} ({selectedStock.symbol})
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">현재가</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedStock.current_price.toLocaleString()}원
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수량
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field"
                  placeholder="수량을 입력하세요"
                  min="1"
                />
              </div>
              
              {quantity && (
                <div>
                  <p className="text-sm font-medium text-gray-700">총 거래금액</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(selectedStock.current_price * parseInt(quantity)).toLocaleString()}원
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setTransactionType('buy')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  transactionType === 'buy'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                구매하기
              </button>
              <button
                onClick={() => setTransactionType('sell')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  transactionType === 'sell'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                판매하기
              </button>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleTransaction}
                className={`flex-1 ${
                  transactionType === 'buy' ? 'btn-danger' : 'btn-success'
                }`}
              >
                {transactionType === 'buy' ? '구매하기' : '판매하기'} 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Stocks 