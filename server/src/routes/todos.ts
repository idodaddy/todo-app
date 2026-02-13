import { Router, Request, Response } from "express";
import db from "../db";

const router = Router();

type Priority = "high" | "medium" | "low";

interface Todo {
  id: number;
  title: string;
  completed: number;
  priority: Priority;
  created_at: string;
}

const VALID_PRIORITIES: Priority[] = ["high", "medium", "low"];
const MAX_TITLE_LENGTH = 500;

function parseId(raw: string): number | null {
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

// Prepared statements
const stmts = {
  selectAll: db.prepare("SELECT * FROM todos ORDER BY created_at DESC"),
  search: db.prepare("SELECT * FROM todos WHERE title LIKE ? ORDER BY created_at DESC"),
  selectById: db.prepare("SELECT * FROM todos WHERE id = ?"),
  insert: db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)"),
  update: db.prepare("UPDATE todos SET title = ?, completed = ?, priority = ? WHERE id = ?"),
  delete: db.prepare("DELETE FROM todos WHERE id = ?"),
};

// GET /api/todos - 전체 조회 (검색 지원)
router.get("/", (req: Request, res: Response) => {
  try {
    const q = req.query.q;
    let todos: Todo[];
    if (typeof q === "string" && q.trim().length > 0) {
      todos = stmts.search.all(`%${q.trim()}%`) as Todo[];
    } else {
      todos = stmts.selectAll.all() as Todo[];
    }
    res.json({ data: todos });
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

// POST /api/todos - 생성
router.post("/", (req: Request, res: Response) => {
  try {
    const { title, priority } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "Title is required" });
      return;
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or less` });
      return;
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      res.status(400).json({ error: "Priority must be high, medium, or low" });
      return;
    }

    const result = stmts.insert.run(title.trim(), priority || "medium");
    const todo = stmts.selectById.get(result.lastInsertRowid) as Todo;
    res.status(201).json({ data: todo });
  } catch (error) {
    console.error("Failed to create todo:", error);
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// PATCH /api/todos/:id - 수정 (완료 토글 등)
router.patch("/:id", (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id as string);
    if (!id) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const { title, completed, priority } = req.body;

    const existing = stmts.selectById.get(id) as Todo | undefined;
    if (!existing) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }
    if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
      res.status(400).json({ error: "Title must be a non-empty string" });
      return;
    }
    if (title !== undefined && title.trim().length > MAX_TITLE_LENGTH) {
      res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or less` });
      return;
    }
    if (completed !== undefined && typeof completed !== "boolean") {
      res.status(400).json({ error: "Completed must be a boolean" });
      return;
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      res.status(400).json({ error: "Priority must be high, medium, or low" });
      return;
    }

    const newTitle = title !== undefined ? title.trim() : existing.title;
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : existing.completed;
    const newPriority = priority !== undefined ? priority : existing.priority;

    stmts.update.run(newTitle, newCompleted, newPriority, id);
    const todo = stmts.selectById.get(id) as Todo;
    res.json({ data: todo });
  } catch (error) {
    console.error("Failed to update todo:", error);
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// DELETE /api/todos/:id - 삭제
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id as string);
    if (!id) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const existing = stmts.selectById.get(id) as Todo | undefined;
    if (!existing) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    stmts.delete.run(id);
    res.json({ data: existing });
  } catch (error) {
    console.error("Failed to delete todo:", error);
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

export default router;
