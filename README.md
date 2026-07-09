# Adaptive Chess AI

> A full-stack chess training platform with a React chessboard, Flask API, MongoDB-backed player profiles, PGN replay/export, and a local Transformer move model.

Adaptive Chess AI is built to feel like a real product, not a toy demo. Players can register, play timed games against an AI opponent, review their match history, export PGNs, replay stored games move by move, and track evolving playstyle metrics such as aggression, king safety, calculation depth, opening prep, and endgame accuracy.

## Why This Project Stands Out

- **End-to-end product thinking:** authentication, gameplay, profile analytics, historical records, replay, and export all live in one coherent app.
- **AI system integration:** a local Hugging Face Transformer model is loaded by the Flask backend to predict chess moves from UCI move history.
- **Chess correctness:** `python-chess` and `chess.js` validate legal moves, board state, PGN generation, checkmate, draw, promotion, and replay flows.
- **Persistent player intelligence:** MongoDB stores users, game results, recent games, tactical DNA, opening trends, and adaptive profile metrics.
- **Production-aware structure:** React/Vite frontend, Flask API, CORS configuration, environment-driven API URLs, and backend deployment support with Gunicorn.

## Product Preview

Players move through a complete training loop:

1. Create an account or log in.
2. Play a timed chess game against the adaptive AI.
3. Save the final result and move sequence.
4. Review performance on the dashboard.
5. Replay any saved game move by move.
6. Export finished games as PGN for external analysis.
7. Track playstyle metrics on the profile page.

## Core Features

| Area | Highlights |
| --- | --- |
| Gameplay | Interactive chessboard, drag/click movement, legal-move validation, timers, AI turn handling, promotion support |
| AI Backend | Transformer-based move selection, local model loading, fallback legal move selection when inference fails |
| User System | Register/login endpoints, password hashing, MongoDB user documents, last-login tracking |
| Analytics | Win/loss/draw totals, estimated ELO progression, tactical DNA, behavior metrics, opening trends |
| History | Stored game records, UCI move history, replay screen, PGN download |
| Engineering | React Router pages, Vite proxying, Flask REST API, CORS allowlist, MongoDB indexes |

## Tech Stack

**Frontend**

- React 19
- Vite
- Tailwind CSS
- React Router
- `chess.js`
- `react-chessboard`

**Backend**

- Python
- Flask
- Flask-CORS
- PyMongo
- `python-chess`
- Hugging Face Transformers
- PyTorch
- Gunicorn

**Data and AI**

- MongoDB for users, game history, profile metrics, and replay data
- Local Transformer model files under `backend/vishy_trans`
- UCI move notation for model input, replay, and PGN reconstruction

## Architecture

```text
React + Vite frontend
        |
        | REST calls through Vite proxy or VITE_API_URL
        v
Flask API
        |
        |-- MongoDB: users, stats, recent games, game history
        |-- python-chess: legal move validation, PGN export, board state
        |-- Transformer model: AI move prediction from UCI move history
```

## API Snapshot

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/move` | Predict the AI's next move from a list of UCI moves |
| `POST` | `/api/auth/register` | Create an authenticated user with a hashed password |
| `POST` | `/api/auth/login` | Validate credentials and return the username |
| `POST` | `/api/users/register` | Create or load a lightweight user profile |
| `GET` | `/api/dashboard` | Return player stats, recent games, ELO progression, and tactical DNA |
| `GET` | `/api/profile` | Return behavior metrics, playstyle bars, openings, and sync progress |
| `GET` | `/api/history` | Return saved game history |
| `GET` | `/api/history/:gameId` | Return one stored game for replay |
| `GET` | `/api/history/:gameId/pgn` | Export a stored game as PGN |
| `POST` | `/api/games/record` | Save a completed game result and move sequence |

## Repository Structure

```text
.
+-- backend/
|   +-- app.py                 # Flask API, AI move endpoint, MongoDB persistence
|   +-- requirements.txt       # Python dependencies
|   +-- vishy_trans/           # Local Transformer model/tokenizer files
+-- frontend/
|   +-- src/
|   |   +-- pages/             # Landing, auth, dashboard, game, history, replay, profile
|   |   +-- components/        # Shared layout
|   |   +-- main.jsx
|   +-- package.json
|   +-- vite.config.js
+-- test_chess.js              # Small chess.js validation script
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 20+
- MongoDB connection string
- Local model files in `backend/vishy_trans`
- Stockfish (`stockfish` on `PATH`, or set `STOCKFISH_PATH`)

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set MONGODB_URI=your_mongodb_connection_string
set STOCKFISH_PATH=C:\path\to\stockfish.exe
python app.py
```

The backend runs on:

```text
http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

For a deployed backend, set:

```bash
set VITE_API_URL=https://your-backend-url
```

### Stockfish accuracy gate

Every legal model move is evaluated against Stockfish. The model move is used
when its centipawn loss is within the configured threshold; otherwise the
Stockfish move replaces it.

```text
MODEL_MAX_CENTIPAWN_LOSS=50
STOCKFISH_DEPTH=12
```

`50` means the model may be at most half a pawn worse than Stockfish. Lower the
threshold for stronger play, or raise it to preserve more of the model's style.
The `/move` response includes `source`, `model_move`, `stockfish_move`, and
`centipawn_loss` so the decision can be inspected.

### Deploy the backend on Render

The root `render.yaml` and `Dockerfile` install Stockfish and run the Flask app
with Gunicorn. In Render, create a Blueprint from this repository and provide:

- `MONGODB_URI`: the MongoDB connection string
- `ALLOWED_ORIGIN`: the deployed frontend URL

The Stockfish threshold and depth already have defaults in `render.yaml`. Point
the frontend's `VITE_API_URL` at the deployed backend URL.

## Verification

Useful checks while developing:

```bash
cd frontend
npm run lint
npm run build
node test_moves.cjs
```

```bash
cd backend
python app.py
```

## Recruiter Notes

This project demonstrates practical full-stack engineering across UI, API design, persistence, and applied machine learning. The strongest engineering signals are the integration boundaries: chess move validation across frontend and backend, model inference guarded by legal fallback behavior, MongoDB-backed user analytics, and replay/PGN features that require consistent data modeling from gameplay through export.

## Security Note

Keep credentials in environment variables such as `MONGODB_URI`. Do not commit database passwords, API keys, or production secrets to source control.
