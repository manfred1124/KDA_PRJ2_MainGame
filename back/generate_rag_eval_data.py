import os
import pandas as pd
from datasets import Dataset
from ragas import evaluate

# 현재 파일 위치 기준으로 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KB_PATH = os.path.join(BASE_DIR, "data", "knowledge_base.txt")
CSV_PATH = os.path.join(BASE_DIR, "rag_eval_data.csv")

# knowledge_base.txt 전체 읽기
with open(KB_PATH, encoding="utf-8") as f:
    kb_text = f.read().strip().replace('\r\n', '\n').replace('\r', '\n')

# 평가용 CSV 불러오기
# (question, answer, context 컬럼이 있다고 가정)
df = pd.read_csv(CSV_PATH)

# context 컬럼을 knowledge_base 전체로 덮어쓰기
# (모든 row에 동일하게 적용)
df["context"] = kb_text

# 덮어쓴 결과 저장 (덮어쓰기)
df.to_csv(CSV_PATH, index=False)

# pandas DataFrame을 datasets.Dataset으로 변환
dataset = Dataset.from_pandas(df)

# 평가 메트릭 정의 (필요에 따라 수정)
# 예: from ragas.metrics import faithfulness, answer_relevancy, context_precision
metrics = [
    # 여기에 사용할 메트릭 추가, 예: faithfulness, answer_relevancy 등
    # faithfulness,
    # answer_relevancy,
    # context_precision
]

# RAGAS 평가 실행
results = evaluate(dataset=dataset, metrics=metrics)

print(f"모든 context 컬럼을 knowledge_base.txt 전체로 덮어썼습니다. 결과: {CSV_PATH}")
print("평가 결과:")
print(results)