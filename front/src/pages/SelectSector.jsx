import React, { useState, useEffect, useCallback, useContext } from "react";
import { useAuth } from "../contexts/AuthContext";
import ChatbotWidget from "../components/ChatbotWidget";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import BannerHeader from "../components/BannerHeader";
import { GuideMessageContext } from "../App";

const GUIDE_MSG =
  "여기는 다양한 산업의 주식이 모여있는 투자판이네. 신중히 섹터를 골라 투자해보게!";

const SECTOR_GUIDE = {
  IT: "IT·반도체 섹터는 첨단 기술과 혁신의 중심지라네. 빠르게 변화하는 트렌드를 이끄는 기업들이 모여 있지.",
  반도체:
    "반도체 섹터는 전자제품의 두뇌를 만드는 핵심 산업이라네. 첨단 기술과 글로벌 경쟁이 치열하지.",
  금융: "금융 섹터는 은행, 보험, 증권 등 자본의 흐름을 책임지는 곳이네.",
  소비재:
    "소비재·유통 섹터는 일상생활과 밀접한 기업들이 모여있네. 경기 변동에 민감하지.",
  유통: "소비재·유통 섹터는 일상생활과 밀접한 기업들이 모여있네. 경기 변동에 민감하지.",
  에너지:
    "에너지 섹터는 산업의 동력을 공급하는 곳이네. 원유, 가스, 발전 기업들이 이끌고 있지.",
  헬스케어:
    "헬스케어·바이오 섹터는 건강과 생명을 지키는 기업들이 모여 있네. 제약, 바이오, 의료기기 분야가 중심이지.",
  바이오:
    "헬스케어 섹터는 건강과 생명을 지키는 기업들이 모여 있네. 제약, 바이오, 의료기기 분야가 중심이지.",
  산업재:
    "산업재 섹터는 사회의 기반을 다지는 기업들이 모여 있네. 건설, 기계, 운송 등 다양한 산업이 속해 있지.",
  소재: "소재·2차전지 섹터는 다양한 산업의 기초가 되는 원자재와 부품을 공급하는 곳이네.",
  "2차전지":
    "2차전지 섹터는 미래 에너지 저장의 핵심이라네. 전기차와 친환경 산업의 성장동력이 되지.",
  커뮤니케이션:
    "커뮤니케이션 섹터는 정보와 소통을 책임지는 기업들이 모여 있네. 통신, 미디어, 인터넷 기업이 중심이지.",
  "공공·유틸리티":
    "공공·유틸리티 섹터는 전기, 수도, 가스 등 생활에 꼭 필요한 서비스를 제공하는 곳이네. 안정적인 수익이 특징이지.",
  // 필요에 따라 섹터명을 추가하세요
};

function getSectorGuide(sector) {
  if (SECTOR_GUIDE[sector]) return SECTOR_GUIDE[sector];
  for (const key of Object.keys(SECTOR_GUIDE)) {
    if (sector.includes(key)) return SECTOR_GUIDE[key];
  }
  return `${sector} 섹터에 오신 것을 환영합니다!`;
}

const ROUND_TREND_GUIDE = {
  "2020Q1":
    "2020년 1분기에는 코로나19의 영향으로 세계 증시가 큰 충격을 받았네.",
  "2020Q2":
    "2020년 2분기에는 여러 나라의 경기 부양책 덕분에 시장이 다시 살아나기 시작했지.",
  "2021Q1":
    "2021년 1분기에는 백신이 퍼지면서 경기가 좋아질 거라는 기대감이 커졌네.",
  "2023H1":
    "2023년 상반기에는 중국 경제가 다시 문을 열면서 세계가 성장할 거라는 기대감이 부풀었지.",
  // 필요에 따라 실제 period 값에 맞게 추가
};

function getRoundTrendGuide(period) {
  if (ROUND_TREND_GUIDE[period]) return ROUND_TREND_GUIDE[period];
  if (period && period.length >= 4) {
    const year = period.slice(0, 4);
    if (year === "2020") return "2020년대 초반, 시장이 큰 변동성을 겪고 있네.";
    if (year === "2021")
      return "2021년, 경기 회복과 성장주에 대한 기대가 높아졌지.";
    if (year === "2022")
      return "2022년, 인플레이션과 금리 인상 이슈로 시장이 조정받고 있네.";
    if (year === "2023")
      return "2023년, 글로벌 경제가 점차 안정을 찾아가고 있네.";
  }
  return "현재 시점의 시장 동향을 잘 살펴 투자 전략을 세워보게!";
}

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
  const { addGuideMessage } = useContext(GuideMessageContext);
  const [showAllNews, setShowAllNews] = useState(false);

  useEffect(() => {
    addGuideMessage(GUIDE_MSG);
    // 라운드/시점 동향 메시지 출력 제거 (메인에서만 출력)
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
    // 섹터별 설명 챗봇에 출력 (부분 일치 포함)
    if (addGuideMessage) {
      addGuideMessage(getSectorGuide(sector));
    }
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
      navigate("/my-page");
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
      className="min-h-screen p-2 relative flex flex-row"
      style={{ fontFamily: "Jua, sans-serif" }}
    >
      {/* 메인 컨텐츠 */}
      <div className="flex-1">
        {/* 헤더와 백버튼을 flex로 묶어서 왼쪽에 배치 */}
        <div className="max-w-7xl mx-auto w-full grid grid-cols-3 items-center mb-2">
          <button
            onClick={() => navigate(-1)}
            className="justify-self-start bg-[#bfa76a] hover:bg-[#a67c3c] text-white px-6 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center space-x-2 text-lg border-2 border-[#e6d3a3]"
            style={{ fontFamily: "Jua, sans-serif" }}
          >
            <span className="text-2xl">←</span>
          </button>
          <div className="flex items-center justify-center mb-2 w-full">
            <BannerHeader
              title="섹터별 주식 투자"
              className="w-full max-w-7xl mx-auto"
            />
          </div>
          <div /> {/* 오른쪽 빈칸 */}
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="flex gap-8 p-8">
            {/* 왼쪽 섹터 버튼 영역 */}
            <div className="flex flex-col items-center gap-6 w-full">
              {/* 섹터 버튼 5개 */}
              <div className="flex flex-row gap-4 justify-center w-full">
                {sectors.slice(0, 5).map((sector) => (
                  <button
                    key={sector}
                    onClick={() => handleSectorSelect(sector)}
                    className={`flex-1 min-w-[150px] max-w-xs w-full h-20 rounded-xl shadow-md transition-all duration-300 flex items-center justify-center text-center bg-gradient-to-br ${
                      selected === sector
                        ? "from-[#f7e6b6] to-[#f3e7c4] border-4 border-[#bfa76a] shadow-lg"
                        : "from-[#f9f6ef] to-[#f3e7c4] hover:from-[#f7e6b6] hover:to-[#f3e7c4]"
                    } font-bold text-lg text-[#7c5c2b] tracking-wide hover:shadow-xl whitespace-normal`}
                    style={{ fontFamily: "Jua, sans-serif", lineHeight: "1.2" }}
                  >
                    {sector}
                  </button>
                ))}
              </div>
              {/* 안내/정보 영역: 안내 박스는 버튼 5개 아래에만 렌더링, 기존 오른쪽 안내 박스 완전 삭제 */}
              <div className="w-full">
                {selected ? (
                  <div className="bg-yellow-50 rounded-lg p-8 shadow-2xl border-2 border-[#e6d3a3] min-h-[400px]">
                    <h3 className="text-2xl font-medium text-[#7c5c2b] mb-6" style={{ fontFamily: "Jua, sans-serif" }}>
                      {selected}
                    </h3>
                    <div className="flex gap-2 mb-6" onClick={() => setShowAllNews(false)}>
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border-2 ${
                          sectorViewTab[selected] === "news"
                            ? "bg-[#bfa76a] text-white border-[#a67c3c]"
                            : "bg-white text-[#7c5c2b] border-[#e6d3a3]"
                        }`}
                        style={{ fontFamily: "Jua, sans-serif" }}
                        onClick={() =>
                          setSectorViewTab((prev) => ({
                            ...prev,
                            [selected]: prev[selected] === "news" ? undefined : "news",
                          }))
                        }
                      >
                        뉴스 보기
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border-2 ${
                          sectorViewTab[selected] === "stocks"
                            ? "bg-[#bfa76a] text-white border-[#a67c3c]"
                            : "bg-white text-[#7c5c2b] border-[#e6d3a3]"
                        }`}
                        style={{ fontFamily: "Jua, sans-serif" }}
                        onClick={() =>
                          setSectorViewTab((prev) => ({
                            ...prev,
                            [selected]: prev[selected] === "stocks" ? undefined : "stocks",
                          }))
                        }
                      >
                        종목 보기
                      </button>
                    </div>
                    {/* 탭별 내용 */}
                    {sectorViewTab[selected] === "news" && (
                      <>
                        <ul className="space-y-3">
                          {(showAllNews
                            ? allSectorNews[selected] || []
                            : (allSectorNews[selected] || []).slice(0, 5)
                          ).map((news) => (
                            <li
                              key={news.id}
                              className="bg-white rounded-lg p-4 shadow border-2 border-[#e6d3a3]"
                            >
                              <div className="text-xs text-[#a67c3c] mb-2">
                                {news.date?.slice(0, 10)}
                              </div>
                              <div className="font-medium text-[#7c5c2b] text-base">
                                {news.title}
                              </div>
                            </li>
                          ))}
                        </ul>
                        {(allSectorNews[selected] || []).length > 5 && !showAllNews && (
                          <button
                            className="mt-8 px-4 py-2 rounded bg-[#bfa76a] text-white font-normal mx-auto block"
                            onClick={() => setShowAllNews(true)}
                          >
                            더보기
                          </button>
                        )}
                      </>
                    )}
                    {sectorViewTab[selected] === "stocks" &&
                      (stocks.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="text-lg font-medium text-[#7c5c2b]">
                            종목 리스트
                          </h4>
                          <ul className="space-y-3">
                            {stocks.map((stock) => {
                              // 내 포트폴리오에서 해당 종목의 보유 수량 찾기
                              const owned = portfolio?.items?.find((item) => item.stock_id === stock.id);
                              const hasStock = owned && owned.quantity > 0;

                              return (
                                <li
                                  key={stock.id}
                                  className="flex items-center justify-between bg-white rounded-lg p-4 shadow border border-[#e6d3a3]"
                                >
                                  <div>
                                    <div className="font-medium text-[#7c5c2b]">
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
                                      className="px-4 py-2 bg-[#bfa76a] hover:bg-[#a67c3c] text-white rounded-lg font-normal border-2 border-[#e6d3a3]"
                                      style={{ fontFamily: "Jua, sans-serif" }}
                                    >
                                      구매
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!hasStock) return;
                                        setOrderModal({ stock, type: "sell" });
                                        setOrderType("sell");
                                        setOrderQty(1);
                                        fetchStockNews(stock.symbol);
                                      }}
                                      className={`px-4 py-2 bg-[#7c5c2b] hover:bg-[#a67c3c] text-white rounded-lg font-normal border-2 border-[#e6d3a3] ${!hasStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      style={{ fontFamily: "Jua, sans-serif" }}
                                      disabled={!hasStock}
                                      title={!hasStock ? 'Insufficient stock quantity' : ''}
                                    >
                                      판매
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                        <div className="text-[#a67c3c] text-center py-8">
                          종목 정보가 없습니다.
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="bg-[#f7e6b6] rounded-xl p-6 shadow-lg border-2 border-[#e6d3a3] min-h-[400px] flex items-center justify-center w-full">
                    <div className="text-[#a67c3c] text-xl font-medium" style={{ fontFamily: "Jua, sans-serif" }}>
                      섹터를 골라 관련 뉴스를 확인해보게!
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽 안내 박스 완전 삭제 */}
          </div>
        </div>
        {/* 뉴스 버튼 - 왼쪽 하단 고정 */}
        {/* 우하단 고정 '다음 라운드' 버튼 */}
        <div className="w-full flex justify-center gap-8 mt-12 mb-4">
          <button
            className={`${
              user?.current_round_idx + 1 === 10
                ? "bg-[#bfa76a] hover:bg-[#a67c3c]"
                : "bg-[#7c5c2b] hover:bg-[#a67c3c]"
            } text-white font-normal py-4 px-12 rounded-full text-xl shadow-lg transition-all duration-200 border-4 border-[#e6d3a3]`}
            style={{
              minWidth: "180px",
              fontFamily: "Jua, sans-serif",
            }}
            onClick={
              user?.current_round_idx + 1 === 10
                ? () => navigate("/game-result")
                : handleNextRound
            }
            disabled={advancing}
          >
            {advancing
              ? "진행 중..."
              : user?.current_round_idx + 1 === 10
              ? "결과 보기"
              : "결과 확인"}
          </button>
        </div>
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
                  <h2 className="text-2xl font-semibold text-gray-800">
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
                      <div className="text-lg font-semibold text-gray-800 mb-2">
                        {orderModal.stock.name}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {orderModal.stock.symbol}
                      </div>
                      <div className={`text-xl font-medium ${orderType === "buy" ? "text-red-600" : "text-blue-600"}`}>
                        {orderModal.stock.current_price.toLocaleString()}원
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-normal text-gray-700 mb-2">
                          거래 유형
                        </label>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setOrderType("buy")}
                            className={`px-4 py-2 rounded-lg font-normal ${
                              orderType === "buy"
                                ? "bg-red-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            구매하기
                          </button>
                          <button
                            onClick={() => setOrderType("sell")}
                            className={`px-4 py-2 rounded-lg font-normal ${
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

                      <div className={`${orderType === "buy" ? "bg-red-50" : "bg-blue-50"} rounded-lg p-4`}>
                        <div className="text-sm text-gray-600">
                          총 거래 금액
                        </div>
                        <div className={`text-xl font-bold ${orderType === "buy" ? "text-red-600" : "text-blue-600"}`}>
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
                            <div className="text-sm font-normal text-gray-800 mb-2">
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

        <ChatbotWidget />
      </div>
      {/* 오른쪽 보유종목 사이드바 */}
      {/* 아래 코드(보유종목 사이드바) 전체를 삭제 */}
      {/* <div
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
      </div> */}
    </div>
  );
};

export default SelectSector;
