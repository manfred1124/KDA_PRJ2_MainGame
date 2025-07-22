FROM python:3.10-slim

WORKDIR /app

# 1. 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. 소스코드 전체 복사
COPY . .

# 3. 엔트리포인트
#    만약 FastAPI 진입점이 back/main.py 라면 다음처럼 조정
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
