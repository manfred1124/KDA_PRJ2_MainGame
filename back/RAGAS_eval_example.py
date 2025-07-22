# RAGAS 평가 예제 스크립트
# 필요한 패키지: ragas, pandas
# 설치: pip install ragas pandas

import os
from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from ragas import evaluate

# 평가 데이터셋 불러오기
DATA_PATH = "back/rag_eval_data.csv"
df = pd.read_csv(DATA_PATH)

# ragas 공식 평가 파이프라인 사용 (DataFrame 바로 전달)
metrics = [faithfulness, answer_relevancy, context_precision, context_recall]
results = evaluate(df, metrics)

print("\n===== RAGAS 평가 결과 =====")
print(results) 