FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends stockfish \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend

ENV STOCKFISH_PATH=/usr/games/stockfish
ENV PYTHONUNBUFFERED=1

CMD ["gunicorn", "--chdir", "backend", "--bind", "0.0.0.0:10000", "--workers", "1", "--threads", "2", "--timeout", "120", "app:app"]
