import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import ChatbotWidget from "../components/ChatbotWidget";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import BannerHeader from "../components/BannerHeader";

const SelectSector = () => {
  const { user, updateUser } = useAuth();
  const [sectors, setSectors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [orderModal, setOrderModal] = useState(null); // {stock, type}
  const [orderType, setOrderType] = useState("buy");
  const [orderQty, setOrderQty] = useState(1);
  const [stockNews, setStockNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceUpdateTime, setPriceUpdateTime] = useState(null);
  const [newsModal, setNewsModal] = useState(false); // 뉴스 모달 상태 추가
  const [allNews, setAllNews] = useState([]); // 전체 뉴스 데이터 추가
  const [sectorNews, setSectorNews] = useState([]);
  const [allSectorNews, setAllSectorNews] = useState({}); // {섹터명: [뉴스, ...]}
  const userBalance = user?.total_balance || user?.balance || 0;
  const navigate = useNavigate();
  const [advancing, setAdvancing] = useState(false);
  const [sectorViewTab, setSectorViewTab] = useState({}); // {섹터명: 'news' | 'stocks'}
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  useEffect(() => {
    fetchSectors();
    fetchAllNews(); // 전체 뉴스 데이터 가져오기
    fetchPortfolio();
  }, []);

  useEffect(() => {
    if (selected) {
      fetchSectorNews(selected);
    }
  }, [selected]);

  useEffect(() => {
    if (!selected && sectors.length > 0 && user?.current_period) {
      fetchAllSectorsNews();
    }
  }, [selected, sectors, user?.current_period]);

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
      const response = await axios.get("/api/stocks/sectors");
      setSectors(response.data);
      setLoading(false);
    } catch (error) {
      toast.error("섹터 정보를 불러오는데 실패했습니다.");
      setLoading(false);
    }
  };

  const fetchStocksBySector = async (sector) => {
    try {
      const response = await axios.get(`/api/stocks/sector/${sector}`);
      const newStocks = response.data;

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

      setStocks(newStocks);
      setPriceUpdateTime(new Date());
    } catch (error) {
      toast.error("주식 정보를 불러오는데 실패했습니다.");
    }
  };

  const fetchStockNews = async (ticker) => {
    try {
      const period = user?.current_period;
      const response = await axios.get(
        `/api/news/stock/by-ticker?ticker=${ticker}&period=${encodeURIComponent(
          period
        )}`
      );
      setStockNews(response.data);
    } catch (error) {
      setStockNews([]);
    }
  };

  const fetchAllNews = async () => {
    try {
      const response = await axios.get("/api/news");
      setAllNews(response.data);
    } catch (error) {
      console.error("뉴스 데이터를 불러오는데 실패했습니다:", error);
      setAllNews([]);
    }
  };

  const fetchSectorNews = async (sector) => {
    try {
      const token = localStorage.getItem("token");
      const period = user?.current_period;
      const response = await axios.get(
        `/api/news/sector/${sector}?period=${encodeURIComponent(period)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSectorNews(response.data);
    } catch (error) {
      setSectorNews([]);
    }
  };

  const fetchAllSectorsNews = async () => {
    const token = localStorage.getItem("token");
    const period = user?.current_period;
    const newsBySector = {};
    for (const sector of sectors) {
      try {
        const response = await axios.get(
          `/api/news/sector/${sector}?period=${encodeURIComponent(period)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        newsBySector[sector] = response.data;
      } catch {
        newsBySector[sector] = [];
      }
    }
    setAllSectorNews(newsBySector);
  };

  const fetchPortfolio = async () => {
    try {
      const response = await axios.get("/api/portfolio");
      setPortfolio(response.data);
    } catch (error) {
      // 에러 무시(없어도 동작)
    }
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        setNewsModal(false);
        setOrderModal(null);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, []);

  // 모달 밖 클릭으로 닫기
  const handleModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setNewsModal(false);
    }
  };

  const handleOrderModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setOrderModal(null);
    }
  };

  const handleSectorSelect = async (sector) => {
    if (selected === sector) {
      setSelected(null);
      // 탭도 닫기
      setSectorViewTab((prev) => ({ ...prev, [sector]: undefined }));
      return;
    }
    setSelected(sector);
    setSectorViewTab((prev) => ({ ...prev, [sector]: prev[sector] || "news" }));
    await fetchStocksBySector(sector);
    await fetchSectorNews(sector);
  };

  const handleStockClick = async (stock) => {
    // 거래 시점의 가격을 고정
    const fixedStock = {
      ...stock,
      current_price: stock.current_price,
    };
    setOrderModal({ stock: fixedStock, type: "buy" });
    setOrderType("buy");
    setOrderQty(1);
    await fetchStockNews(stock.symbol);
  };

  const handleOrder = async () => {
    if (!orderModal) return;

    try {
      const response = await axios.post(`/api/portfolio/${orderType}`, {
        stock_id: orderModal.stock.id,
        quantity: orderQty,
        price: orderModal.stock.current_price,
      });

      toast.success(
        orderType === "buy"
          ? `${
              orderModal.stock.name
            } ${orderQty}주 구매하기 완료! (${orderModal.stock.current_price.toLocaleString()}원)`
          : `${
              orderModal.stock.name
            } ${orderQty}주 판매하기 완료! (${orderModal.stock.current_price.toLocaleString()}원)`
      );

      // 사용자 정보 업데이트 (잔고 동기화)
      try {
        const userResponse = await axios.get("/api/auth/me");
        updateUser(userResponse.data);

        // 네비게이션 바 잔고 업데이트를 위한 이벤트 발생
        window.dispatchEvent(new Event("transactionComplete"));
      } catch (error) {
        console.error("사용자 정보 업데이트 실패:", error);
      }

      setOrderModal(null);
      setOrderQty(1);
    } catch (error) {
      toast.error(error.response?.data?.detail || "주문에 실패했습니다.");
    }
  };

  const handleMaxQuantity = async () => {
    if (orderType === "buy") {
      const maxQty = Math.floor(userBalance / orderModal.stock.current_price);
      setOrderQty(maxQty);
    } else {
      // 판매하기는 실제 보유 수량 확인
      try {
        const response = await axios.get(
          `/api/portfolio/stock/${orderModal.stock.id}`
        );
        setOrderQty(response.data.quantity);
      } catch (error) {
        toast.error("보유 수량을 확인할 수 없습니다.");
      }
    }
  };

  const totalAmount = orderModal
    ? orderQty * orderModal.stock.current_price
    : 0;

  // 다음 라운드 진행 및 포트폴리오 이동
  const handleNextRound = async () => {
    setAdvancing(true);
    try {
      await axios.post("/api/game/next-round");
      navigate("/my-page");
    } catch (error) {
      toast.error("다음 라운드 진행에 실패했습니다.");
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6 relative flex flex-row"
      style={{ fontFamily: "serif" }}
    >
      {/* 메인 컨텐츠 */}
      <div className="flex-1">
        <BannerHeader
          title={
            <span
              className="text-[#7c5c2b] font-bold drop-shadow"
              style={{ fontFamily: "serif" }}
            >
              섹터별 주식 투자
            </span>
          }
        />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-6 p-8">
            {sectors.map((sector) => (
              <div key={sector} className="w-full max-w-md">
                <button
                  onClick={() => handleSectorSelect(sector)}
                  className={`w-full rounded-xl shadow-md transition-all duration-300 p-8 text-left border bg-gradient-to-br ${
                    selected === sector
                      ? "from-[#f7e6b6] to-[#f3e7c4] border-[#bfa76a]"
                      : "from-[#f9f6ef] to-[#f3e7c4] border-[#e6d3a3] hover:border-[#bfa76a] hover:from-[#f7e6b6] hover:to-[#f3e7c4]"
                  } font-bold text-2xl text-[#7c5c2b] tracking-wide mb-2 hover:shadow-xl`}
                  style={{ fontFamily: "serif" }}
                >
                  {sector}
                  <div className="text-[#a67c3c] text-base mt-2 font-normal">
                    주식 보기
                  </div>
                </button>
                {/* 선택된 섹터: 탭 버튼 + 탭별 내용 */}
                {selected === sector && (
                  <div className="mt-3">
                    <div className="flex gap-2 mb-3">
                      <button
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 border-2 ${
                          sectorViewTab[sector] === "news"
                            ? "bg-[#bfa76a] text-white border-[#a67c3c]"
                            : "bg-[#f3e7c4] text-[#7c5c2b] border-[#e6d3a3]"
                        }`}
                        style={{ fontFamily: "serif" }}
                        onClick={() =>
                          setSectorViewTab((prev) => ({
                            ...prev,
                            [sector]:
                              prev[sector] === "news" ? undefined : "news",
                          }))
                        }
                      >
                        뉴스 보기
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 border-2 ${
                          sectorViewTab[sector] === "stocks"
                            ? "bg-[#bfa76a] text-white border-[#a67c3c]"
                            : "bg-[#f3e7c4] text-[#7c5c2b] border-[#e6d3a3]"
                        }`}
                        style={{ fontFamily: "serif" }}
                        onClick={() =>
                          setSectorViewTab((prev) => ({
                            ...prev,
                            [sector]:
                              prev[sector] === "stocks" ? undefined : "stocks",
                          }))
                        }
                      >
                        종목 보기
                      </button>
                    </div>
                    {/* 탭별 내용: sectorViewTab[sector]가 있을 때만 렌더 */}
                    {sectorViewTab[sector] === "news" && (
                      <ul className="space-y-2 mt-2">
                        {(allSectorNews[sector] || []).map((news) => (
                          <li
                            key={news.id}
                            className="bg-[#f7e6b6] rounded-lg p-3 shadow border-2 border-[#e6d3a3]"
                          >
                            <div className="text-xs text-[#a67c3c] mb-1">
                              {news.date?.slice(0, 10)}
                            </div>
                            <div className="font-semibold text-[#7c5c2b] text-base">
                              {news.title}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {sectorViewTab[sector] === "stocks" &&
                      (stocks.length > 0 ? (
                        <div className="mt-4 bg-[#f7e6b6] rounded-xl p-4 shadow-inner border-2 border-[#e6d3a3]">
                          <h4 className="text-lg font-bold mb-2 text-[#7c5c2b]">
                            종목 리스트
                          </h4>
                          <ul className="space-y-2">
                            {stocks.map((stock) => (
                              <li
                                key={stock.id}
                                className="flex items-center justify-between bg-[#f3e7c4] rounded-lg p-3 shadow border border-[#e6d3a3]"
                              >
                                <div>
                                  <div className="font-semibold text-[#7c5c2b]">
                                    {stock.name}{" "}
                                    <span className="text-xs text-[#a67c3c]">
                                      ({stock.symbol})
                                    </span>
                                  </div>
                                  <div className="text-[#a67c3c] font-bold">
                                    {stock.current_price.toLocaleString()}원
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleStockClick(stock)}
                                    className="px-4 py-2 bg-[#bfa76a] hover:bg-[#a67c3c] text-white rounded-lg font-bold border-2 border-[#e6d3a3]"
                                    style={{ fontFamily: "serif" }}
                                  >
                                    구매
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOrderModal({ stock, type: "sell" });
                                      setOrderType("sell");
                                      setOrderQty(1);
                                      fetchStockNews(stock.symbol);
                                    }}
                                    className="px-4 py-2 bg-[#7c5c2b] hover:bg-[#a67c3c] text-white rounded-lg font-bold border-2 border-[#e6d3a3]"
                                    style={{ fontFamily: "serif" }}
                                  >
                                    판매
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="text-[#a67c3c] text-center py-4">
                          종목 정보가 없습니다.
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* 뉴스 버튼 - 왼쪽 하단 고정 */}
        <button
          onClick={() => navigate("/")}
          className="fixed bottom-16 left-20 bg-[#bfa76a] hover:bg-[#a67c3c] text-white px-6 py-4 rounded-full shadow-lg transition-all duration-300 z-40 flex items-center space-x-3 text-lg border-2 border-[#e6d3a3]"
          style={{ fontFamily: "serif" }}
        >
          <span className="text-3xl">📰</span>
          <span className="font-semibold text-xl">시장 뉴스</span>
        </button>
        {/* 뉴스 모달 */}
        {newsModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={handleModalBackdropClick}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    📰 시장 뉴스
                  </h2>
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
                      <div
                        key={index}
                        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600">
                              라운드 {news.round || 1}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                news.impact === "positive"
                                  ? "bg-green-100 text-green-800"
                                  : news.impact === "negative"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {news.impact === "positive"
                                ? "📈 긍정"
                                : news.impact === "negative"
                                ? "📉 부정"
                                : "📊 중립"}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3">
                          {news.title}
                        </h3>
                        <p className="text-gray-600 mb-4">{news.content}</p>
                        <div className="flex flex-wrap gap-2">
                          {news.tags &&
                            news.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12">
                      <div className="text-gray-500 text-lg">
                        뉴스가 없습니다.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 주문 모달 */}
        {orderModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={handleOrderModalBackdropClick}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    주식 거래하기
                  </h2>
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
                      <div className="text-lg font-bold text-gray-800 mb-2">
                        {orderModal.stock.name}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {orderModal.stock.symbol}
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        {orderModal.stock.current_price.toLocaleString()}원
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          거래 유형
                        </label>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setOrderType("buy")}
                            className={`px-4 py-2 rounded-lg font-medium ${
                              orderType === "buy"
                                ? "bg-red-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            구매하기
                          </button>
                          <button
                            onClick={() => setOrderType("sell")}
                            className={`px-4 py-2 rounded-lg font-medium ${
                              orderType === "sell"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            판매하기
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          수량
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            value={orderQty}
                            onChange={(e) =>
                              setOrderQty(parseInt(e.target.value) || 1)
                            }
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
                        <div className="text-sm text-gray-600">
                          총 거래 금액
                        </div>
                        <div className="text-xl font-bold text-blue-600">
                          {totalAmount.toLocaleString()}원
                        </div>
                      </div>

                      <button
                        onClick={handleOrder}
                        className={`w-full py-3 rounded-lg font-bold text-white ${
                          orderType === "buy"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {orderType === "buy" ? "구매하기" : "판매하기"}
                      </button>
                    </div>
                  </div>

                  {/* 뉴스 섹션 */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      관련 뉴스
                    </h3>
                    <div className="space-y-4">
                      {stockNews.length > 0 ? (
                        stockNews.map((news, index) => (
                          <div
                            key={index}
                            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm"
                          >
                            <div className="text-sm font-bold text-gray-800 mb-2">
                              {news.title}
                            </div>
                            <div className="text-sm text-gray-600">
                              {news.content}
                            </div>
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

        {/* 우하단 고정 '다음 라운드' 버튼 */}
        <button
          className={`fixed bottom-10 right-10 ${
            user?.current_round_idx + 1 === 10
              ? "bg-[#bfa76a] hover:bg-[#a67c3c]"
              : "bg-[#7c5c2b] hover:bg-[#a67c3c]"
          } text-white font-bold py-4 px-16 rounded-full text-xl shadow-lg transition-all duration-200 z-50 border-4 border-[#e6d3a3]`}
          onClick={
            user?.current_round_idx + 1 === 10
              ? () => navigate("/game-result")
              : handleNextRound
          }
          disabled={advancing}
          style={{ minWidth: "200px", fontFamily: "serif" }}
        >
          {advancing
            ? "진행 중..."
            : user?.current_round_idx + 1 === 10
            ? "결과 보기"
            : "다음 라운드"}
        </button>

        <ChatbotWidget />
      </div>
      {/* 오른쪽 보유종목 사이드바 */}
      <div
        className="w-80 min-w-[320px] max-w-xs ml-8 bg-[#f3e7c4] rounded-xl shadow-lg border-2 border-[#e6d3a3] p-6 h-fit sticky top-8 self-start hidden lg:block"
        style={{ fontFamily: "serif" }}
      >
        <button
          className="w-full flex items-center justify-between text-xl font-bold text-[#7c5c2b] mb-2 focus:outline-none border-b-2 border-[#e6d3a3] pb-2"
          onClick={() => setPortfolioOpen((open) => !open)}
          style={{ fontFamily: "serif" }}
        >
          내 보유종목
          <span
            className={`ml-2 transition-transform duration-200 ${
              portfolioOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            portfolioOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {portfolio && portfolio.items.length > 0 ? (
            <ul className="space-y-3 mt-2">
              {portfolio.items.map((item) => (
                <li
                  key={item.stock_id}
                  className="flex flex-col gap-1 border-b border-[#e6d3a3] pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="font-semibold text-[#7c5c2b]">
                    {item.stock_name}{" "}
                    <span className="text-xs text-[#a67c3c]">
                      ({item.stock_symbol})
                    </span>
                  </div>
                  <div className="text-sm text-[#a67c3c]">
                    보유수량:{" "}
                    <span className="font-bold">
                      {item.quantity.toLocaleString()}주
                    </span>
                  </div>
                  <div className="text-sm text-[#a67c3c]">
                    평균단가:{" "}
                    <span className="font-bold">
                      {item.average_price.toLocaleString()}원
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[#a67c3c] text-center py-8">
              보유한 종목이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectSector;
