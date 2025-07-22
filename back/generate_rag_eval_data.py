import os
import pandas as pd
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import answer_relevancy
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

# OpenAI API 키 확인
if not os.getenv("OPENAI_API_KEY"):
    print("오류: OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")
    exit(1)

# 현재 파일 위치를 기준으로 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KB_PATH = os.path.join(BASE_DIR, "data", "knowledge_base.txt")
CSV_PATH = os.path.join(BASE_DIR, "rag_eval_data.csv")

# knowledge_base.txt 파일 전체 읽기
try:
    with open(KB_PATH, encoding="utf-8") as f:
        kb_text = f.read().strip().replace('\r\n', '\n').replace('\r', '\n')
except FileNotFoundError:
    print(f"오류: {KB_PATH} 파일을 찾을 수 없습니다. 경로를 확인하세요.")
    exit(1)

# 평가용 CSV 파일 불러오기
try:
    df = pd.read_csv(CSV_PATH)
    # 필요한 컬럼 확인
    required_columns = ["question", "answer", "context"]
    if not all(col in df.columns for col in required_columns):
        print(f"오류: CSV 파일에 다음 컬럼이 필요합니다: {required_columns}")
        exit(1)
except FileNotFoundError:
    print(f"오류: {CSV_PATH} 파일을 찾을 수 없습니다. 경로를 확인하세요.")
    exit(1)

# context 컬럼을 knowledge_base.txt 내용으로 덮어쓰기
df["context"] = kb_text

# 수정된 CSV 파일 저장
df.to_csv(CSV_PATH, index=False)

# pandas DataFrame을 datasets.Dataset으로 변환
dataset = Dataset.from_pandas(df)

# 평가 메트릭 정의 (context_precision과 faithfulness 제외)
metrics = [answer_relevancy]

# RAGAS 평가 실행
try:
    results = evaluate(dataset=dataset, metrics=metrics)
    print(f"모든 context 컬럼을 knowledge_base.txt 전체로 덮어썼습니다. 결과: {CSV_PATH}")
    print("평가 결과:")
    print(results)
except Exception as e:
    print(f"평가 중 오류 발생: {str(e)}")