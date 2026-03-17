from __future__ import annotations

from datetime import datetime
from io import StringIO
import csv

from flask import Flask, jsonify, redirect, render_template, request, session, url_for, Response


app = Flask(__name__, template_folder="../frontend")
app.config["SECRET_KEY"] = "adaptive-chess-demo-secret"


def build_nav(active_page: str) -> list[dict[str, str | bool]]:
    return [
        {"label": "Dashboard", "endpoint": "dashboard", "active": active_page == "dashboard"},
        {"label": "Play Game", "endpoint": "game", "active": active_page == "game"},
        {"label": "Opponent Profile", "endpoint": "profile", "active": active_page == "profile"},
        {"label": "Game History", "endpoint": "history", "active": active_page == "history"},
    ]


GAME_HISTORY = [
    {"id": 1042, "result": "Win", "moves": 42, "duration": "24m 15s", "date": "Oct 24, 2023"},
    {"id": 1038, "result": "Loss", "moves": 31, "duration": "18m 05s", "date": "Oct 22, 2023"},
    {"id": 1035, "result": "Draw", "moves": 55, "duration": "45m 20s", "date": "Oct 20, 2023"},
    {"id": 1031, "result": "Win", "moves": 28, "duration": "12m 40s", "date": "Oct 18, 2023"},
    {"id": 1029, "result": "Win", "moves": 37, "duration": "21m 55s", "date": "Oct 15, 2023"},
]

MOVE_HISTORY = [
    {"number": 1, "white": "e4", "black": "e5"},
    {"number": 2, "white": "Nf3", "black": "Nc6"},
    {"number": 3, "white": "Bb5", "black": "a6"},
    {"number": 4, "white": "Ba4", "black": "..."},
]

PROFILE_METRICS = [
    {
        "title": "Aggression Score",
        "value": 72,
        "icon": "swords",
        "description": "Indicates how often the player initiates attacks.",
    },
    {
        "title": "Pawn Push Rate",
        "value": 45,
        "icon": "grid_view",
        "description": "Frequency of advancing pawns in the opening.",
    },
    {
        "title": "Early Queen Moves",
        "value": 15,
        "icon": "star",
        "description": "Likelihood of developing Queen within 10 moves.",
    },
    {
        "title": "Tactical Play Style",
        "value": 88,
        "icon": "psychology",
        "description": "Propensity for sacrificial play and combinations.",
    },
]

PLAYSTYLE_BARS = [
    {"label": "Aggression", "value": 85, "tone": "bg-primary"},
    {"label": "Positional", "value": 40, "tone": "bg-primary/60"},
    {"label": "Tactical", "value": 92, "tone": "bg-primary/80"},
    {"label": "Opening Variety", "value": 55, "tone": "bg-primary/40"},
]

OPENINGS = [
    {"name": "Sicilian Defense", "games": 32},
    {"name": "Ruy Lopez", "games": 18},
    {"name": "Queen's Gambit", "games": 14},
]


def stats_summary() -> dict[str, int]:
    total = len(GAME_HISTORY)
    wins = sum(1 for game in GAME_HISTORY if game["result"] == "Win")
    losses = sum(1 for game in GAME_HISTORY if game["result"] == "Loss")
    draws = sum(1 for game in GAME_HISTORY if game["result"] == "Draw")
    return {"games_played": 128, "wins": 64, "losses": 42, "draws": 22, "recent_total": total, "recent_wins": wins, "recent_losses": losses, "recent_draws": draws}


def dashboard_context() -> dict:
    user_name = session.get("username", "Grandmaster")
    return {
        "current_year": datetime.now().year,
        "nav_items": build_nav("dashboard"),
        "user_name": user_name,
        "stats": stats_summary(),
        "recent_games": GAME_HISTORY[:4],
        "elo_points": ["25%", "40%", "50%", "60%", "80%", "100%"],
        "tactical_dna": [
            {"label": "Aggressive", "value": 78, "tone": "bg-primary"},
            {"label": "Positional", "value": 45, "tone": "bg-primary/60"},
            {"label": "Endgame Accuracy", "value": 92, "tone": "bg-emerald-500"},
        ],
    }


def history_context() -> dict:
    return {
        "current_year": datetime.now().year,
        "nav_items": build_nav("history"),
        "games": GAME_HISTORY,
        "stats": stats_summary(),
    }


def profile_context() -> dict:
    return {
        "nav_items": build_nav("profile"),
        "metrics": PROFILE_METRICS,
        "bars": PLAYSTYLE_BARS,
        "openings": OPENINGS,
        "sync_complete": 75,
    }


def game_context() -> dict:
    board = [{"dark": (row + col) % 2 == 1} for row in range(8) for col in range(8)]
    return {
        "nav_items": build_nav("game"),
        "board_squares": board,
        "moves": MOVE_HISTORY,
        "white_clock": "12:15",
        "black_clock": "08:42",
        "current_turn": "White to move",
        "last_ai_move": "g1f3",
    }


@app.route("/")
def landing() -> str:
    return render_template("landingpage.html", current_year=datetime.now().year)


@app.post("/login")
def login() -> Response:
    username = request.form.get("username", "").strip() or "Grandmaster"
    session["username"] = username
    return redirect(url_for("dashboard"))


@app.route("/dashboard")
def dashboard() -> str:
    return render_template("dashboard.html", **dashboard_context())


@app.route("/game")
def game() -> str:
    return render_template("gamepage.html", **game_context())


@app.route("/history")
def history() -> str:
    return render_template("history.html", **history_context())


@app.route("/profile")
def profile() -> str:
    return render_template("profile.html", **profile_context())


@app.route("/history/export.csv")
def export_history_csv() -> Response:
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["id", "result", "moves", "duration", "date"])
    writer.writeheader()
    writer.writerows(GAME_HISTORY)
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=game-history.csv"},
    )


@app.route("/api/dashboard")
def dashboard_api():
    return jsonify(dashboard_context())


@app.route("/api/history")
def history_api():
    return jsonify(history_context())


@app.route("/api/profile")
def profile_api():
    return jsonify(profile_context())


@app.route("/api/game")
def game_api():
    return jsonify(game_context())


if __name__ == "__main__":
    app.run(debug=True)
