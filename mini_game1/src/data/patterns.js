// C:\Python_basic\F5_Project2_hero\KDA_PRJ2_MainGame\mini_game1\src\data\patterns.js

const patterns = [
    {
      id: 1,
      image: '/images/patterns/pattern_double_bottom.png',
      quizImage: '/images/patterns_for_practice/double bottom chart pattern1.png',
      correctAnswer: '쌍바닥 (Double Bottom)',
      options: [
        '쌍바닥 (Double Bottom)',
        '쌍봉 (Double Top)',
        '헤드앤숄더 (Head and Shoulders)',
        '상승 삼각형 (Ascending Triangle)'
      ],
      description: "마치 'W'자 모양처럼 두 번의 저점을 찍고 상승하는 형태입니다.",
      meaning: "하락 추세가 끝나고 **상승 추세로 전환될 가능성**을 시사하는 대표적인 **상승 반전 패턴**입니다."
    },
    {
      id: 2,
      image: '/images/patterns/double top chart pattern.png',
      quizImage: '/images/patterns_for_practice/double top chart pattern1.jpg',
      correctAnswer: '쌍봉 (Double Top)',
      options: [
        '쌍봉 (Double Top)',
        '쌍바닥 (Double Bottom)',
        '역헤드앤숄더 (Inverse Head and Shoulders)',
        '하락 삼각형 (Descending Triangle)'
      ],
      description: "'M'자 모양처럼 두 번의 고점을 찍고 하락하는 형태입니다.",
      meaning: "상승 추세가 끝나고 **하락 추세로 전환될 가능성**을 시사하는 대표적인 **하락 반전 패턴**입니다."
    },
    {
      id: 3,
      image: '/images/patterns/head and shoulders chart pattern.png',
      quizImage: '/images/patterns_for_practice/head and shoulders chart pattern1.png',
      correctAnswer: '헤드앤숄더 (Head and Shoulders)',
      options: [
        '헤드앤숄더 (Head and Shoulders)',
        '역헤드앤숄더 (Inverse Head and Shoulders)',
        '깃발형 (Flag)',
        '쌍봉 (Double Top)'
      ],
      description: "가운데 봉우리가 가장 높고, 양쪽에 조금 낮은 봉우리(어깨)가 있는 사람의 어깨와 머리 모양과 비슷합니다.",
      meaning: "상승 추세가 끝나고 **하락 추세로 전환될 가능성**을 시사하는 강력한 **하락 반전 패턴**입니다."
    },
    {
      id: 4,
      image: '/images/patterns/inverse head and shoulders chart pattern.png',
      quizImage: '/images/patterns_for_practice/inverse head and shoulders chart pattern1.jpg',
      correctAnswer: '역헤드앤숄더 (Inverse Head and Shoulders)',
      options: [
        '역헤드앤숄더 (Inverse Head and Shoulders)',
        '헤드앤숄더 (Head and Shoulders)',
        '상승 삼각형 (Ascending Triangle)',
        '쌍바닥 (Double Bottom)'
      ],
      description: "헤드앤숄더를 뒤집어 놓은 형태로, 가운데 움푹 들어간 부분이 가장 깊고 양쪽에 얕은 움푹 들어간 부분이 있습니다.",
      meaning: "하락 추세가 끝나고 **상승 추세로 전환될 가능성**을 시사하는 강력한 **상승 반전 패턴**입니다."
    },
    {
      id: 5,
      image: '/images/patterns/ascending triangle chart pattern.png',
      quizImage: '/images/patterns_for_practice/ascending triangle chart pattern1.jpg',
      correctAnswer: '상승 삼각형 (Ascending Triangle)',
      options: [
        '상승 삼각형 (Ascending Triangle)',
        '하락 삼각형 (Descending Triangle)',
        '깃발형 (Flag)',
        '쌍봉 (Double Top)'
      ],
      description: "주가가 하단은 상승 추세를, 상단은 수평 저항선을 만드는 삼각형 형태입니다.",
      meaning: "매수세가 강해지면서 **추가적인 상승이 예상되는 지속 패턴**입니다. 돌파 후 강한 상승을 기대할 수 있습니다."
    },
    {
      id: 6,
      image: '/images/patterns/Descending Triangle.png',
      quizImage: '/images/patterns_for_practice/descending triangle chart pattern1.png',
      correctAnswer: '하락 삼각형 (Descending Triangle)',
      options: [
        '하락 삼각형 (Descending Triangle)',
        '상승 삼각형 (Ascending Triangle)',
        '쌍바닥 (Double Bottom)',
        '헤드앤숄더 (Head and Shoulders)'
      ],
      description: "주가가 상단은 하락 추세를, 하단은 수평 지지선을 만드는 삼각형 형태입니다.",
      meaning: "매도세가 강해지면서 **추가적인 하락이 예상되는 지속 패턴**입니다. 돌파 후 강한 하락을 기대할 수 있습니다."
    },
    {
      id: 7,
      image: '/images/patterns/flag chart pattern.png',
      quizImage: '/images/patterns_for_practice/flag chart pattern1.png',
      correctAnswer: '깃발형 (Flag)',
      options: [
        '깃발형 (Flag)',
        '쌍봉 (Double Top)',
        '하락 삼각형 (Descending Triangle)',
        '역헤드앤숄더 (Inverse Head and Shoulders)'
      ],
      description: "가파른 상승(또는 하락) 후 잠시 옆으로 횡보하거나 반대 방향으로 약하게 움직이는 직사각형/평행사변형 형태입니다. 마치 깃대와 깃발 같습니다.",
      meaning: "단기적인 휴식 후 **기존 추세(상승 또는 하락)를 이어갈 가능성**이 높은 **지속 패턴**입니다."
    },
  ];
  
  export default patterns;