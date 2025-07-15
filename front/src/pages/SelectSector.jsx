import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ChatbotWidget from '../components/ChatbotWidget'
import axios from 'axios'
import toast from 'react-hot-toast'

const SelectSector = () => {
  const { user, updateUser } = useAuth()
  const [sectors, setSectors] = useState([])
  const [selected, setSelected] = useState(null)
  const [stocks, setStocks] = useState([])
  const [orderModal, setOrderModal] = useState(null) // {stock, type}
  const [orderType, setOrderType] = useState('buy')
  const [orderQty, setOrderQty] = useState(1)
  const [stockNews, setStockNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [priceUpdateTime, setPriceUpdateTime] = useState(null)
  const [newsModal, setNewsModal] = useState(false) // 뉴스 모달 상태 추가
  const [allNews, setAllNews] = useState([]) // 전체 뉴스 데이터 추가
  const userBalance = user?.total_balance || user?.balance || 0

  useEffect(() => {
    fetchSectors()
    fetchAllNews() // 전체 뉴스 데이터 가져오기
  }, [])

  // 선택된 섹터가 있으면 주기적으로 주식 정보 업데이트 (실제 데이터 연결 전까지 비활성화)
  // useEffect(() => {
  //   if (!selected) return

  //   const interval = setInterval(() => {
  //     fetchStocksBySector(selected)
  //   }, 300000) // 5분마다 업데이트 (30초 → 5분)

  //   return () => clearInterval(interval)
  // }, [selected])

  const fetchSectors = async () => {
    try {
      const response = await axios.get('/api/stocks/sectors')
      setSectors(response.data)
      setLoading(false)
    } catch (error) {
      toast.error('섹터 정보를 불러오는데 실패했습니다.')
      setLoading(false)
    }
  }

  const fetchStocksBySector = async (sector) => {
    try {
      const response = await axios.get(`/api/stocks/sector/${sector}`)
      const newStocks = response.data
      
      // 가격 변동 확인 (실제 데이터 연결 전까지 비활성화)
      // if (stocks.length > 0) {
      //   const priceChanges = newStocks.map(newStock => {
      //     const oldStock = stocks.find(s => s.id === newStock.id)
      //     if (oldStock && oldStock.current_price !== newStock.current_price) {
      //       const change = newStock.current_price - oldStock.current_price
      //       const changePercent = (change / oldStock.current_price) * 100
      //       return {
      //         name: newStock.name,
      //         change,
      //         changePercent,
      //         newPrice: newStock.current_price
      //       }
      //     }
      //     return null
      //   }).filter(Boolean)
        
      //   // 가격 변동이 있으면 알림
      //   if (priceChanges.length > 0) {
      //     const changesText = priceChanges.map(p => 
      //       `${p.name}: ${p.change > 0 ? '+' : ''}${p.change.toLocaleString()}원 (${p.changePercent > 0 ? '+' : ''}${p.changePercent.toFixed(1)}%)`
      //     ).join(', ')
      //     toast.info(`가격 변동: ${changesText}`)
      //   }
      // }
      
      setStocks(newStocks)
      setPriceUpdateTime(new Date())
    } catch (error) {
      toast.error('주식 정보를 불러오는데 실패했습니다.')
    }
  }

  const fetchStockNews = async (stockName) => {
    try {
      const response = await axios.get(`/api/news/stock/${stockName}`)
      setStockNews(response.data)
    } catch (error) {
      setStockNews([])
    }
  }

  const fetchAllNews = async () => {
    try {
      const response = await axios.get('/api/news')
      setAllNews(response.data)
    } catch (error) {
      console.error('뉴스 데이터를 불러오는데 실패했습니다:', error)
      setAllNews([])
    }
  }

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setNewsModal(false)
        setOrderModal(null)
      }
    }

    document.addEventListener('keydown', handleEscKey)
    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [])

  // 모달 밖 클릭으로 닫기
  const handleModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setNewsModal(false)
    }
  }

  const handleOrderModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setOrderModal(null)
    }
  }

  const handleSectorSelect = async (sector) => {
    setSelected(sector)
    await fetchStocksBySector(sector)
  }

  const handleStockClick = async (stock) => {
    // 거래 시점의 가격을 고정
    const fixedStock = {
      ...stock,
      current_price: stock.current_price
    }
    setOrderModal({ stock: fixedStock, type: 'buy' })
    setOrderType('buy')
    setOrderQty(1)
    await fetchStockNews(stock.name)
  }

  const handleOrder = async () => {
    if (!orderModal) return

    try {
      const response = await axios.post(`/api/portfolio/${orderType}`, {
        stock_id: orderModal.stock.id,
        quantity: orderQty,
        price: orderModal.stock.current_price
      })

      toast.success(
        orderType === 'buy' 
          ? `${orderModal.stock.name} ${orderQty}주 구매하기 완료! (${orderModal.stock.current_price.toLocaleString()}원)`
          : `${orderModal.stock.name} ${orderQty}주 판매하기 완료! (${orderModal.stock.current_price.toLocaleString()}원)`
      )
      
      // 사용자 정보 업데이트 (잔고 동기화)
      try {
        const userResponse = await axios.get('/api/auth/me')
        updateUser(userResponse.data)
        
        // 네비게이션 바 잔고 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new Event('transactionComplete'))
      } catch (error) {
        console.error('사용자 정보 업데이트 실패:', error)
      }
      
      setOrderModal(null)
      setOrderQty(1)
    } catch (error) {
      toast.error(error.response?.data?.detail || '주문에 실패했습니다.')
    }
  }

  const handleMaxQuantity = async () => {
    if (orderType === 'buy') {
      const maxQty = Math.floor(userBalance / orderModal.stock.current_price)
      setOrderQty(maxQty)
    } else {
      // 판매하기는 실제 보유 수량 확인
      try {
        const response = await axios.get(`/api/portfolio/stock/${orderModal.stock.id}`)
        setOrderQty(response.data.quantity)
      } catch (error) {
        toast.error('보유 수량을 확인할 수 없습니다.')
      }
    }
  }

  const totalAmount = orderModal ? orderQty * orderModal.stock.current_price : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 relative">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          섹터별 주식 투자
        </h1>

        {!selected ? (
          // 섹터 선택 화면
          <div className="flex flex-wrap justify-center gap-6">
            {sectors.map((sector) => (
              <button
                key={sector}
                onClick={() => handleSectorSelect(sector)}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center min-w-[200px] border-2 border-transparent hover:border-blue-300"
              >
                <div className="text-2xl font-bold text-gray-800 mb-2">{sector}</div>
                <div className="text-gray-600">주식 보기</div>
              </button>
            ))}
          </div>
        ) : (
          // 주식 리스트 화면
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 섹터 리스트 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">섹터</h2>
                <div className="space-y-2">
                  {sectors.map((sector) => (
                    <button
                      key={sector}
                      onClick={() => handleSectorSelect(sector)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selected === sector
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 주식 리스트 */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">{selected} 섹터</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stocks.map((stock) => (
                    <div
                      key={stock.id}
                      onClick={() => handleStockClick(stock)}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-blue-300"
                    >
                      <div className="text-lg font-bold text-gray-800 mb-2">{stock.name}</div>
                      <div className="text-sm text-gray-600 mb-2">{stock.symbol}</div>
                      <div className="text-xl font-bold text-blue-600">
                        {stock.current_price.toLocaleString()}원
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 뉴스 버튼 - 왼쪽 하단 고정 */}
        <button
          onClick={() => setNewsModal(true)}
          className="fixed bottom-16 left-20 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-full shadow-lg transition-all duration-300 z-40 flex items-center space-x-3 text-lg"
        >
          <span className="text-3xl">📰</span>
          <span className="font-semibold text-xl">시장 뉴스</span>
        </button>

        {/* 뉴스 모달 */}
        {newsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleModalBackdropClick}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">📰 시장 뉴스</h2>
                  <button
                    onClick={() => setNewsModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {allNews.length > 0 ? (
                    allNews.map((news, index) => (
                      <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600">라운드 {news.round || 1}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              news.impact === 'positive' ? 'bg-green-100 text-green-800' : 
                              news.impact === 'negative' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {news.impact === 'positive' ? '📈 긍정' : 
                               news.impact === 'negative' ? '📉 부정' : '📊 중립'}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3">{news.title}</h3>
                        <p className="text-gray-600 mb-4">{news.content}</p>
                        <div className="flex flex-wrap gap-2">
                          {news.tags && news.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12">
                      <div className="text-gray-500 text-lg">뉴스가 없습니다.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 주문 모달 */}
        {orderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleOrderModalBackdropClick}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">주식 거래하기</h2>
                  <button
                    onClick={() => setOrderModal(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 주문 폼 */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-lg font-bold text-gray-800 mb-2">{orderModal.stock.name}</div>
                      <div className="text-sm text-gray-600 mb-2">{orderModal.stock.symbol}</div>
                      <div className="text-xl font-bold text-blue-600">
                        {orderModal.stock.current_price.toLocaleString()}원
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">거래 유형</label>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setOrderType('buy')}
                            className={`px-4 py-2 rounded-lg font-medium ${
                              orderType === 'buy'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            구매하기
                          </button>
                          <button
                            onClick={() => setOrderType('sell')}
                            className={`px-4 py-2 rounded-lg font-medium ${
                              orderType === 'sell'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            판매하기
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">수량</label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            value={orderQty}
                            onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                          <button
                            onClick={handleMaxQuantity}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            최대
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">총 거래 금액</div>
                        <div className="text-xl font-bold text-blue-600">
                          {totalAmount.toLocaleString()}원
                        </div>
                      </div>

                      <button
                        onClick={handleOrder}
                        className={`w-full py-3 rounded-lg font-bold text-white ${
                          orderType === 'buy' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {orderType === 'buy' ? '구매하기' : '판매하기'}
                      </button>
                    </div>
                  </div>

                  {/* 뉴스 섹션 */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">관련 뉴스</h3>
                    <div className="space-y-4">
                      {stockNews.length > 0 ? (
                        stockNews.map((news, index) => (
                          <div key={index} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm">
                            <div className="text-sm font-bold text-gray-800 mb-2">{news.title}</div>
                            <div className="text-sm text-gray-600">{news.content}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-center py-8">
                          관련 뉴스가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ChatbotWidget />
    </div>
  )
}

export default SelectSector 