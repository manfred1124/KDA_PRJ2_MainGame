import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const News = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      const response = await axios.get('/api/news')
      setNews(response.data)
    } catch (error) {
      toast.error('뉴스를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getImpactIcon = (impactType) => {
    switch (impactType) {
             case 'positive':
         return <TrendingUp className="text-green-600" size={20} />
       case 'negative':
         return <TrendingDown className="text-red-600" size={20} />
       default:
         return <Minus className="text-gray-600" size={20} />
    }
  }

  const getImpactColor = (impactType) => {
         switch (impactType) {
       case 'positive':
         return 'bg-green-50 border-green-200'
       case 'negative':
         return 'bg-red-50 border-red-200'
       default:
         return 'bg-gray-50 border-gray-200'
     }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          📰 시장 뉴스
        </h1>
        <p className="text-gray-600">
          최신 경제 뉴스와 시장 동향을 확인하세요!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.map((item) => (
          <div key={item.id} className={`card news-card ${getImpactColor(item.impact_type)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.content}
                </p>
              </div>
              <div className="ml-4">
                {getImpactIcon(item.impact_type)}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                {item.affected_sectors && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {item.affected_sectors}
                  </span>
                )}
              </div>
              <div>
                라운드 {item.round_number}
              </div>
            </div>
          </div>
        ))}
      </div>

      {news.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📰</div>
          <p className="text-gray-500 text-lg">아직 뉴스가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">
            라운드를 진행하면 새로운 뉴스가 발표됩니다.
          </p>
        </div>
      )}
    </div>
  )
}

export default News 