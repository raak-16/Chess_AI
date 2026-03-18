from __future__ import annotations

import os
from io import StringIO
from datetime import UTC, datetime
from urllib.parse import quote_plus

import chess
import chess.pgn
import torch
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from pymongo import ASCENDING, MongoClient
from pymongo.errors import PyMongoError
from transformers import AutoModelForCausalLM, AutoTokenizer
from werkzeug.security import check_password_hash, generate_password_hash


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173"]}})


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MONGODB_URI_TEMPLATE = "mongodb+srv://n8nconnection:{db_password}@cluster0.br6jjhc.mongodb.net/?appName=Cluster0"
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "chess_db")

_MONGO_CLIENT = None
_MONGO_DB = None


def _resolve_model_dir() -> str:
    # Prefer model files placed directly under backend/vishy_trans.
    candidates = [
        os.path.join(BASE_DIR, "vishy_trans"),
        os.path.join(BASE_DIR, "..", "vishy_trans"),
    ]
    for path in candidates:
        if os.path.isdir(path):
            return path
    # Return the expected primary path for clearer startup logs.
    return candidates[0]


MODEL_DIR = _resolve_model_dir()


def _build_mongodb_uri() -> str | None:
    mongodb_uri = os.getenv("MONGODB_URI")
    if mongodb_uri:
        return mongodb_uri

    db_password = "yoyoHoney123"
    if db_password:
        return MONGODB_URI_TEMPLATE.replace("{db_password}", quote_plus(db_password))

    return None





def _get_db():
    global _MONGO_CLIENT, _MONGO_DB

    if _MONGO_DB is not None:
        return _MONGO_DB

    mongodb_uri = _build_mongodb_uri()

    if not mongodb_uri:
        raise RuntimeError("MongoDB is not configured. Set MONGODB_URI or MONGODB_PASSWORD.")

    try:
        _MONGO_CLIENT = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        _MONGO_CLIENT.admin.command("ping")
        _MONGO_DB = _MONGO_CLIENT[MONGODB_DB_NAME]
        _MONGO_DB.users.create_index([("username", ASCENDING)], unique=True)
        # Keep username_key indexed for lookups; avoid unique build failures on legacy null docs.
        _MONGO_DB.users.create_index([("username_key", ASCENDING)], name="username_key_lookup")
        return _MONGO_DB
    except PyMongoError as exc:
        raise RuntimeError(f"Failed to connect to MongoDB: {exc}") from exc


def _default_user_document(username: str) -> dict:
    now = datetime.now(UTC)
    return {
        "username": username,
        "created_at": now,
        "stats": {
            "games_played": 0,
            "wins": 0,
            "losses": 0,
            "draws": 0,
        },
        "recent_games": [],
        "history_games": [],
        "elo_points": ["0%", "0%", "0%", "0%", "0%", "0%"],
        "tactical_dna": [
            {"label": "Aggression", "value": 0, "tone": "bg-rose-500"},
            {"label": "Positional Play", "value": 0, "tone": "bg-blue-500"},
            {"label": "Endgame Accuracy", "value": 0, "tone": "bg-emerald-500"},
            {"label": "Opening Prep", "value": 0, "tone": "bg-amber-500"},
        ],
        "metrics": [
            {
                "icon": "local_fire_department",
                "value": 0,
                "title": "Tactical Aggression",
                "description": "How often you choose tactical complications.",
            },
            {
                "icon": "shield",
                "value": 0,
                "title": "King Safety",
                "description": "How consistently you protect your king.",
            },
            {
                "icon": "target",
                "value": 0,
                "title": "Calculation Depth",
                "description": "How deep your candidate move analysis goes.",
            },
            {
                "icon": "psychology",
                "value": 0,
                "title": "Positional Patience",
                "description": "How often you improve your position before tactics.",
            },
        ],
        "bars": [
            {"label": "Openings", "value": 0, "tone": "bg-blue-500"},
            {"label": "Middlegame", "value": 0, "tone": "bg-rose-500"},
            {"label": "Endgame", "value": 0, "tone": "bg-emerald-500"},
            {"label": "Tactics", "value": 0, "tone": "bg-amber-500"},
        ],
        "openings": [],
        "sync_complete": 0,
    }


def _resolve_username() -> str:
    user_name = request.args.get("user_name") or request.headers.get("X-User-Name")
    user_name = (user_name or "guest").strip()
    if not user_name:
        user_name = "guest"
    return user_name[:60]


def _normalize_username(user_name: str) -> str:
    return user_name.strip().lower()


def _validate_auth_input(user_name: str, password: str) -> str | None:
    if len(user_name) < 3:
        return "user_name must be at least 3 characters"
    if len(password) < 6:
        return "password must be at least 6 characters"
    return None


def _get_or_create_user(username: str) -> dict:
    db = _get_db()
    users = db.users
    now = datetime.now(UTC)
    username_key = _normalize_username(username)

    try:
        # Migrate old docs that were stored before username_key existed.
        legacy_user = users.find_one({"username": username}, {"_id": 1, "username_key": 1})
        if legacy_user and not legacy_user.get("username_key"):
            users.update_one({"_id": legacy_user["_id"]}, {"$set": {"username_key": username_key}})

        users.update_one(
            {"username_key": username_key},
            {
                "$setOnInsert": {
                    **_default_user_document(username),
                    "username_key": username_key,
                },
                "$set": {"last_active_at": now, "updated_at": now},
            },
            upsert=True,
        )

        user = users.find_one({"username_key": username_key}, {"_id": 0})
    except PyMongoError as exc:
        raise RuntimeError(f"MongoDB user query failed: {exc}") from exc

    if not user:
        raise RuntimeError("Failed to load user profile from MongoDB")
    return user


def _get_user_by_username(username: str) -> dict | None:
    db = _get_db()
    users = db.users
    username_key = _normalize_username(username)

    user = users.find_one({"username_key": username_key})
    if user:
        return user

    legacy_user = users.find_one({"username": username})
    if legacy_user:
        users.update_one({"_id": legacy_user["_id"]}, {"$set": {"username_key": username_key}})
        legacy_user["username_key"] = username_key
    return legacy_user


def _format_duration(seconds: int) -> str:
    safe_seconds = max(0, int(seconds))
    minutes = safe_seconds // 60
    rem_seconds = safe_seconds % 60
    return f"{minutes:02d}:{rem_seconds:02d}"


def _clamp_percent(value: float) -> int:
    return max(0, min(100, int(round(value))))


def _get_metric_value(metrics: list[dict], title: str, default: int = 0) -> int:
    for metric in metrics:
        if metric.get("title") == title:
            try:
                return int(metric.get("value", default))
            except (TypeError, ValueError):
                return default
    return default


def _smooth_metric(previous: int, signal: int, games_played: int, alpha: float = 0.25) -> int:
    if games_played <= 1:
        return _clamp_percent(signal)
    smoothed = (1 - alpha) * previous + alpha * signal
    return _clamp_percent(smoothed)


def _build_updated_profile_fields(
    user: dict,
    result: str,
    moves: int,
    duration_seconds: int,
    ended_by: str,
    games_played: int,
    wins: int,
    losses: int,
    draws: int,
) -> dict:
    safe_moves = max(0, int(moves))
    safe_duration = max(0, int(duration_seconds))

    prev_metrics = list(user.get("metrics", []))

    aggression_signal = 50
    if safe_moves <= 20:
        aggression_signal += 18
    elif safe_moves <= 40:
        aggression_signal += 8
    else:
        aggression_signal -= 6
    if result == "Win":
        aggression_signal += 10
    elif result == "Loss":
        aggression_signal -= 4
    if ended_by == "resign" and result == "Loss":
        aggression_signal -= 8

    king_safety_signal = 55
    if result == "Win":
        king_safety_signal += 8
    elif result == "Loss":
        king_safety_signal -= 10
    if ended_by == "resign":
        king_safety_signal -= 6
    if safe_moves >= 40:
        king_safety_signal += 6
    if safe_duration <= 90 and result == "Loss":
        king_safety_signal -= 8

    calc_depth_signal = 25 + min(55, safe_moves * 1.4)
    if result == "Win":
        calc_depth_signal += 8
    if ended_by == "resign":
        calc_depth_signal -= 6

    positional_signal = 20 + min(60, safe_moves * 1.5)
    if result == "Draw":
        positional_signal += 8
    if ended_by == "resign":
        positional_signal -= 10
    if safe_duration > 600:
        positional_signal += 6

    aggression = _smooth_metric(
        _get_metric_value(prev_metrics, "Tactical Aggression"),
        _clamp_percent(aggression_signal),
        games_played,
    )
    king_safety = _smooth_metric(
        _get_metric_value(prev_metrics, "King Safety"),
        _clamp_percent(king_safety_signal),
        games_played,
    )
    calculation_depth = _smooth_metric(
        _get_metric_value(prev_metrics, "Calculation Depth"),
        _clamp_percent(calc_depth_signal),
        games_played,
    )
    positional_patience = _smooth_metric(
        _get_metric_value(prev_metrics, "Positional Patience"),
        _clamp_percent(positional_signal),
        games_played,
    )

    endgame_accuracy = _clamp_percent((king_safety + positional_patience) / 2)
    opening_prep = _clamp_percent(calculation_depth * 0.6 + max(20, 100 - safe_moves) * 0.4)

    tactical_dna = [
        {"label": "Aggression", "value": aggression, "tone": "bg-rose-500"},
        {"label": "Positional Play", "value": positional_patience, "tone": "bg-blue-500"},
        {"label": "Endgame Accuracy", "value": endgame_accuracy, "tone": "bg-emerald-500"},
        {"label": "Opening Prep", "value": opening_prep, "tone": "bg-amber-500"},
    ]

    metrics = [
        {
            "icon": "local_fire_department",
            "value": aggression,
            "title": "Tactical Aggression",
            "description": "How often you choose tactical complications.",
        },
        {
            "icon": "shield",
            "value": king_safety,
            "title": "King Safety",
            "description": "How consistently you protect your king.",
        },
        {
            "icon": "target",
            "value": calculation_depth,
            "title": "Calculation Depth",
            "description": "How deep your candidate move analysis goes.",
        },
        {
            "icon": "psychology",
            "value": positional_patience,
            "title": "Positional Patience",
            "description": "How often you improve your position before tactics.",
        },
    ]

    bars = [
        {"label": "Openings", "value": opening_prep, "tone": "bg-blue-500"},
        {"label": "Middlegame", "value": _clamp_percent((aggression + calculation_depth) / 2), "tone": "bg-rose-500"},
        {"label": "Endgame", "value": endgame_accuracy, "tone": "bg-emerald-500"},
        {"label": "Tactics", "value": _clamp_percent(aggression * 0.65 + calculation_depth * 0.35), "tone": "bg-amber-500"},
    ]

    win_rate = (wins / games_played) if games_played else 0
    elo_base = _clamp_percent(20 + (win_rate * 55) + min(20, games_played * 2))
    start = max(5, elo_base - 20)
    step = max(2, (elo_base - start) // 5)
    elo_points = [f"{_clamp_percent(start + (i * step))}%" for i in range(6)]

    sync_complete = _clamp_percent(min(100, games_played * 8))

    return {
        "metrics": metrics,
        "tactical_dna": tactical_dna,
        "bars": bars,
        "elo_points": elo_points,
        "sync_complete": sync_complete,
    }


def _record_game_result(
    username: str,
    result: str,
    moves: int,
    duration_seconds: int,
    ended_by: str,
    moves_uci: list[str] | None = None,
) -> int:
    db = _get_db()
    users = db.users
    user = _get_or_create_user(username)

    stats = user.get("stats", {})
    games_played = int(stats.get("games_played", 0)) + 1
    wins = int(stats.get("wins", 0))
    losses = int(stats.get("losses", 0))
    draws = int(stats.get("draws", 0))

    if result == "Win":
        wins += 1
    elif result == "Loss":
        losses += 1
    elif result == "Draw":
        draws += 1

    now = datetime.now(UTC)
    game_id = int(now.timestamp() * 1000)
    date_str = now.date().isoformat()
    duration_label = _format_duration(duration_seconds)

    history_entry = {
        "id": game_id,
        "result": result,
        "moves": max(0, int(moves)),
        "duration": duration_label,
        "date": date_str,
        "ended_by": ended_by,
        "moves_uci": moves_uci or [],
    }
    recent_entry = {
        "id": game_id,
        "result": result,
        "moves": max(0, int(moves)),
        "date": date_str,
    }

    history_games = [history_entry] + list(user.get("history_games", []))
    recent_games = [recent_entry] + list(user.get("recent_games", []))
    profile_fields = _build_updated_profile_fields(
        user,
        result,
        moves,
        duration_seconds,
        ended_by,
        games_played,
        wins,
        losses,
        draws,
    )

    users.update_one(
        {"username_key": _normalize_username(username)},
        {
            "$set": {
                "stats": {
                    "games_played": games_played,
                    "wins": wins,
                    "losses": losses,
                    "draws": draws,
                },
                "history_games": history_games[:200],
                "recent_games": recent_games[:20],
                "metrics": profile_fields["metrics"],
                "tactical_dna": profile_fields["tactical_dna"],
                "bars": profile_fields["bars"],
                "elo_points": profile_fields["elo_points"],
                "sync_complete": profile_fields["sync_complete"],
                "last_active_at": now,
                "updated_at": now,
            }
        },
    )

    return game_id


def _load_model():
    if not os.path.isdir(MODEL_DIR):
        print(f"Model directory not found: {MODEL_DIR}")
        return None, None

    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR,
        torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
        local_files_only=True,
    )
    model.to(DEVICE)
    model.eval()
    print(f"Model loaded from {MODEL_DIR} on {DEVICE}")
    return tokenizer, model


TOKENIZER, MODEL = _load_model()


def _select_move_with_model(board: chess.Board, moves: list[str], difficulty: int = 0) -> str:
    if TOKENIZER is None or MODEL is None:
        raise RuntimeError("Model is not available")

    text = " ".join(moves)
    inputs = TOKENIZER(text, return_tensors="pt", truncation=True, max_length=512)
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = MODEL(**inputs)

    logits = outputs.logits[:, -1, :]
    probs = torch.softmax(logits, dim=-1)
    _, sorted_ids = torch.sort(probs, descending=True)
    sorted_ids = sorted_ids[0]

    legal_moves = {m.uci() for m in board.legal_moves}
    start = difficulty if 0 <= difficulty < len(sorted_ids) else 0

    for i in range(start, len(sorted_ids)):
        token_id = sorted_ids[i].item()
        move = TOKENIZER.decode([token_id]).strip()
        if len(move) < 4:
            continue
        move = move[:4]
        if move in legal_moves:
            return move
    print("moved")
    return next(iter(legal_moves))


def _fallback_move(board: chess.Board) -> str:
    legal = list(board.legal_moves)
    print("fallback model")
    if not legal:
        raise ValueError("No legal moves available")
    return legal[0].uci()


@app.get("/")
def health():
    return jsonify({
        "status": "ok",
        "model": "vishy_trans",
        "device": DEVICE,
        "model_loaded": TOKENIZER is not None and MODEL is not None,
    })


@app.get("/api/dashboard")
def dashboard():
    try:
        user = _get_or_create_user(_resolve_username())
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500

    return jsonify({
        "user_name": user.get("username", "guest"),
        "stats": user.get("stats", {}),
        "recent_games": user.get("recent_games", []),
        "elo_points": user.get("elo_points", []),
        "tactical_dna": user.get("tactical_dna", []),
    })


@app.get("/api/history")
def history():
    try:
        user = _get_or_create_user(_resolve_username())
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500

    return jsonify({
        "games": user.get("history_games", []),
        "stats": user.get("stats", {}),
    })


@app.get("/api/profile")
def profile():
    try:
        user = _get_or_create_user(_resolve_username())
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500

    return jsonify({
        "metrics": user.get("metrics", []),
        "bars": user.get("bars", []),
        "openings": user.get("openings", []),
        "sync_complete": user.get("sync_complete", 0),
    })


@app.post("/api/users/register")
def register_user():
    payload = request.get_json(silent=True) or {}
    user_name = (payload.get("user_name") or "").strip()
    if not user_name:
        return jsonify({"detail": "user_name is required"}), 400

    try:
        user = _get_or_create_user(user_name[:60])
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500

    return jsonify({"user_name": user.get("username")})


@app.post("/api/auth/register")
def auth_register():
    payload = request.get_json(silent=True) or {}
    user_name = (payload.get("user_name") or "").strip()
    password = str(payload.get("password") or "")

    validation_error = _validate_auth_input(user_name, password)
    if validation_error:
        return jsonify({"detail": validation_error}), 400

    try:
        db = _get_db()
        users = db.users
        now = datetime.now(UTC)
        username_key = _normalize_username(user_name)

        existing = users.find_one(
            {"$or": [{"username_key": username_key}, {"username": user_name}]},
            {"_id": 1},
        )
        if existing:
            return jsonify({"detail": "User already exists"}), 409

        user_doc = {
            **_default_user_document(user_name[:60]),
            "username_key": username_key,
            "password_hash": generate_password_hash(password),
            "created_at": now,
            "updated_at": now,
            "last_active_at": now,
            "last_login_at": now,
        }

        users.insert_one(user_doc)
        return jsonify({"user_name": user_name[:60]}), 201
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500
    except PyMongoError as exc:
        return jsonify({"detail": f"MongoDB register failed: {exc}"}), 500


@app.post("/api/auth/login")
def auth_login():
    payload = request.get_json(silent=True) or {}
    user_name = (payload.get("user_name") or "").strip()
    password = str(payload.get("password") or "")

    if not user_name or not password:
        return jsonify({"detail": "user_name and password are required"}), 400

    try:
        user = _get_user_by_username(user_name)
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500

    if not user or not user.get("password_hash"):
        return jsonify({"detail": "Invalid credentials"}), 401

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"detail": "Invalid credentials"}), 401

    try:
        _get_db().users.update_one(
            {"username_key": _normalize_username(user_name)},
            {"$set": {"last_login_at": datetime.now(UTC), "last_active_at": datetime.now(UTC)}},
        )
    except PyMongoError:
        pass

    return jsonify({"user_name": user.get("username", user_name[:60])})


@app.post("/move")
def get_move():
    payload = request.get_json(silent=True) or {}
    moves = payload.get("moves", [])
    difficulty = payload.get("difficulty", 0)
    print("asked for move")

    if not isinstance(moves, list) or any(not isinstance(move, str) for move in moves):
        return jsonify({"detail": "moves must be a list of UCI strings"}), 400

    try:
        difficulty = int(difficulty or 0)
    except (TypeError, ValueError):
        difficulty = 0

    board = chess.Board()
    try:
        for move in moves:
            board.push_uci(move)
    except ValueError as exc:
        return jsonify({"detail": f"Invalid move history: {exc}"}), 400

    if board.is_game_over():
        return jsonify({"detail": "Game is already over"}), 400

    try:
        move = _select_move_with_model(board, moves, difficulty)
    except Exception as exc:
        print(f"Model inference failed, using fallback move: {exc}")
        try:
            move = _fallback_move(board)
        except ValueError as fallback_exc:
            return jsonify({"detail": str(fallback_exc)}), 400

    return jsonify({"move": move})


@app.post("/api/games/record")
def record_game_result():
    payload = request.get_json(silent=True) or {}

    user_name = (payload.get("user_name") or _resolve_username()).strip()[:60]
    result = str(payload.get("result") or "").strip()
    ended_by = str(payload.get("ended_by") or "manual").strip() or "manual"

    if result not in {"Win", "Loss", "Draw"}:
        return jsonify({"detail": "result must be one of Win, Loss, Draw"}), 400

    try:
        moves = int(payload.get("moves", 0))
        duration_seconds = int(payload.get("duration_seconds", 0))
    except (TypeError, ValueError):
        return jsonify({"detail": "moves and duration_seconds must be integers"}), 400

    moves_uci = payload.get("moves_uci", [])
    if not isinstance(moves_uci, list) or any(not isinstance(move, str) for move in moves_uci):
        return jsonify({"detail": "moves_uci must be a list of UCI move strings"}), 400

    try:
        game_id = _record_game_result(
            user_name or "guest",
            result,
            moves,
            duration_seconds,
            ended_by,
            moves_uci,
        )
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500
    except PyMongoError as exc:
        return jsonify({"detail": f"MongoDB game record failed: {exc}"}), 500

    return jsonify({"ok": True, "game_id": game_id})


@app.get("/api/history/<int:game_id>")
def history_game(game_id: int):
    try:
        user = _get_or_create_user(_resolve_username())
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500

    for game in user.get("history_games", []):
        try:
            current_id = int(game.get("id"))
        except (TypeError, ValueError):
            continue
        if current_id == game_id:
            return jsonify({"game": game})

    return jsonify({"detail": "Game not found"}), 404


@app.get("/api/history/<int:game_id>/pgn")
def history_game_pgn(game_id: int):
    try:
        user = _get_or_create_user(_resolve_username())
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 500

    selected_game = None
    for game in user.get("history_games", []):
        try:
            current_id = int(game.get("id"))
        except (TypeError, ValueError):
            continue
        if current_id == game_id:
            selected_game = game
            break

    if not selected_game:
        return jsonify({"detail": "Game not found"}), 404

    moves_uci = selected_game.get("moves_uci", [])
    if not isinstance(moves_uci, list) or not moves_uci:
        return jsonify({"detail": "No move list available for PGN export"}), 400

    board = chess.Board()
    game = chess.pgn.Game()
    game.headers["Event"] = "Adaptive Chess AI"
    game.headers["Site"] = "Local"
    game.headers["Date"] = str(selected_game.get("date", "????.??.??")).replace("-", ".")
    game.headers["Round"] = "-"
    game.headers["White"] = str(user.get("username", "User"))
    game.headers["Black"] = "AdaptiveAI"

    result_map = {"Win": "1-0", "Loss": "0-1", "Draw": "1/2-1/2"}
    game.headers["Result"] = result_map.get(str(selected_game.get("result")), "*")

    node = game
    try:
        for uci in moves_uci:
            move = chess.Move.from_uci(uci)
            if move not in board.legal_moves:
                return jsonify({"detail": f"Illegal move in stored history: {uci}"}), 400
            board.push(move)
            node = node.add_variation(move)
    except ValueError:
        return jsonify({"detail": "Invalid UCI move found in stored history"}), 400

    pgn_io = StringIO()
    exporter = chess.pgn.FileExporter(pgn_io)
    game.accept(exporter)
    pgn_text = pgn_io.getvalue().strip() + "\n"

    filename = f"game_{game_id}.pgn"
    return Response(
        pgn_text,
        mimetype="application/x-chess-pgn",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
