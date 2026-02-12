import { Router, Request, Response } from "express";
import db from "../db";

const router = Router();

interface Todo {
  id: number;
  title: string;
  completed: number;
  created_at: string;
}

// GET /api/todos - 전체 조회
router.get("/", (_req: Request, res: Response) => {
  try {
    const todos = db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all() as Todo[];
    res.json({ data: todos });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

// POST /api/todos - 생성
router.post("/", (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const result = db.prepare("INSERT INTO todos (title) VALUES (?)").run(title.trim());
    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(result.lastInsertRowid) as Todo;
    res.status(201).json({ data: todo });
  } catch (error) {
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// PATCH /api/todos/:id - 수정 (완료 토글 등)
router.patch("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;

    const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as Todo | undefined;
    if (!existing) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    const newTitle = title !== undefined ? title : existing.title;
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : existing.completed;

    db.prepare("UPDATE todos SET title = ?, completed = ? WHERE id = ?").run(newTitle, newCompleted, id);
    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as Todo;
    res.json({ data: todo });
  } catch (error) {
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// DELETE /api/todos/:id - 삭제
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as Todo | undefined;
    if (!existing) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    db.prepare("DELETE FROM todos WHERE id = ?").run(id);
    res.json({ data: { message: "Todo deleted" } });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

export default router;
