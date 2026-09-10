import os
import sqlite3
import base64
from datetime import datetime
from typing import Literal
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
DB_PATH = "/workspace/data/app.db"
MATERIALS = {"연필", "볼펜", "색연필", "사인펜"}
def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
def init_db():
    with get_db() as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS session_state (id INTEGER PRIMARY KEY CHECK(id=1), step INTEGER NOT NULL DEFAULT 1)")
        conn.execute("INSERT OR IGNORE INTO session_state(id, step) VALUES(1, 1)")
        conn.execute("""CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, student_name TEXT NOT NULL, image_id INTEGER NOT NULL,
            material TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_name, image_id))""")
        conn.execute("""CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, student_name TEXT NOT NULL, kind TEXT NOT NULL,
            material TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
        conn.execute("""CREATE TABLE IF NOT EXISTS drawings (
            image_id INTEGER PRIMARY KEY, art TEXT NOT NULL, detail TEXT NOT NULL, image_data TEXT,
            answer_material TEXT, answer_revealed INTEGER NOT NULL DEFAULT 0)""")
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(drawings)")}
        if "image_data" not in columns:
            conn.execute("ALTER TABLE drawings ADD COLUMN image_data TEXT")
        if "answer_material" not in columns:
            conn.execute("ALTER TABLE drawings ADD COLUMN answer_material TEXT")
        if "answer_revealed" not in columns:
            conn.execute("ALTER TABLE drawings ADD COLUMN answer_revealed INTEGER NOT NULL DEFAULT 0")
        for image_id, art, detail in [
            (1, "🌳", "연필로 그린 나무와 작은 새"),
            (2, "🐟", "볼펜으로 그린 물고기와 물결"),
            (3, "🌈", "색연필로 채운 무지개"),
            (4, "🌻", "사인펜으로 그린 해바라기"),
        ]:
            conn.execute("INSERT OR IGNORE INTO drawings(image_id, art, detail) VALUES(?,?,?)", (image_id, art, detail))
app = FastAPI()
init_db()
clients: set[WebSocket] = set()
class VoteIn(BaseModel):
    student_name: str = Field(min_length=1, max_length=30)
    image_id: int = Field(ge=1, le=4)
    material: str
class MessageIn(BaseModel):
    student_name: str = Field(min_length=1, max_length=30)
    material: str
    text: str = Field(min_length=1, max_length=60)
class DrawingIn(BaseModel):
    image_id: int = Field(ge=1, le=4)
    art: str = Field(min_length=1, max_length=4)
    detail: str = Field(min_length=1, max_length=80)
class DrawingImageIn(BaseModel):
    image_id: int = Field(ge=1, le=4)
    image_data: str = Field(min_length=20, max_length=7_000_000)
class DrawingAnswerIn(BaseModel):
    image_id: int = Field(ge=1, le=4)
    answer_material: str
async def broadcast(event: str):
    dead = []
    for ws in clients:
        try:
            await ws.send_json({"type": event})
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)
@app.get("/api/health")
def health():
    return {"ok": True}
@app.get("/api/state")
def state():
    with get_db() as conn:
        step = conn.execute("SELECT step FROM session_state WHERE id=1").fetchone()["step"]
        votes = [dict(row) for row in conn.execute("SELECT student_name, image_id, material, created_at FROM votes ORDER BY created_at DESC")]
        messages = [dict(row) for row in conn.execute("SELECT id, student_name, kind, material, text, created_at FROM messages ORDER BY id DESC LIMIT 160")]
        drawings = [dict(row) for row in conn.execute("SELECT image_id, art, detail, image_data, answer_material, answer_revealed FROM drawings ORDER BY image_id")]
    return {"step": step, "votes": votes, "messages": messages, "drawings": drawings}
@app.post("/api/step/{step}")
async def set_step(step: int):
    if step not in (1, 2):
        raise HTTPException(400, "올바른 단계가 아닙니다.")
    with get_db() as conn:
        conn.execute("UPDATE session_state SET step=? WHERE id=1", (step,))
    await broadcast("refresh")
    return {"step": step}
@app.post("/api/reset-session")
async def reset_session():
    with get_db() as conn:
        conn.execute("DELETE FROM votes")
        conn.execute("DELETE FROM messages")
        conn.execute("UPDATE session_state SET step=1 WHERE id=1")
        conn.execute("UPDATE drawings SET answer_revealed=0")
    await broadcast("refresh")
    return {"ok": True, "step": 1}
@app.post("/api/drawings")
async def update_drawing(payload: DrawingIn):
    with get_db() as conn:
        conn.execute("UPDATE drawings SET art=?, detail=? WHERE image_id=?", (payload.art, payload.detail.strip(), payload.image_id))
    await broadcast("refresh")
    return {"ok": True}
@app.post("/api/drawing-image")
async def update_drawing_image(payload: DrawingImageIn):
    try:
        header, encoded = payload.image_data.split(",", 1)
        if not header.startswith("data:image/"):
            raise ValueError()
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 4_500_000:
            raise ValueError()
    except Exception:
        raise HTTPException(400, "사진 파일을 확인해 주세요.")
    with get_db() as conn:
        conn.execute("UPDATE drawings SET image_data=? WHERE image_id=?", (payload.image_data, payload.image_id))
    await broadcast("refresh")
    return {"ok": True}
@app.post("/api/drawing-answer")
async def update_drawing_answer(payload: DrawingAnswerIn):
    if payload.answer_material not in MATERIALS:
        raise HTTPException(400, "재료를 확인해 주세요.")
    with get_db() as conn:
        conn.execute("UPDATE drawings SET answer_material=?, answer_revealed=0 WHERE image_id=?", (payload.answer_material, payload.image_id))
    await broadcast("refresh")
    return {"ok": True}
@app.post("/api/drawing-answers/reveal-all")
async def reveal_all_drawing_answers():
    with get_db() as conn:
        missing = conn.execute("SELECT COUNT(*) AS count FROM drawings WHERE answer_material IS NULL OR answer_material='' ").fetchone()["count"]
        if missing:
            raise HTTPException(400, "네 그림의 정답을 모두 설정해 주세요.")
        conn.execute("UPDATE drawings SET answer_revealed=1")
    await broadcast("refresh")
    return {"ok": True}
@app.post("/api/votes")
async def vote(payload: VoteIn):
    if payload.material not in MATERIALS:
        raise HTTPException(400, "재료를 확인해 주세요.")
    with get_db() as conn:
        conn.execute("""INSERT INTO votes(student_name,image_id,material,created_at) VALUES(?,?,?,?)
        ON CONFLICT(student_name,image_id) DO UPDATE SET material=excluded.material, created_at=excluded.created_at""",
        (payload.student_name.strip(), payload.image_id, payload.material, datetime.now().isoformat(timespec="seconds")))
    await broadcast("refresh")
    return {"ok": True}
@app.post("/api/questions")
async def question(payload: MessageIn):
    return await save_message(payload, "question")
async def save_message(payload: MessageIn, kind: Literal["question"]):
    if payload.material not in MATERIALS:
        raise HTTPException(400, "재료를 확인해 주세요.")
    with get_db() as conn:
        conn.execute("INSERT INTO messages(student_name,kind,material,text,created_at) VALUES(?,?,?,?,?)",
        (payload.student_name.strip(), kind, payload.material, payload.text.strip(), datetime.now().isoformat(timespec="seconds")))
    await broadcast("refresh")
    return {"ok": True}
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)
    except Exception:
        clients.discard(websocket)
