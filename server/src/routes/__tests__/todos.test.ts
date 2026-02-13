import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import Database from "better-sqlite3";

// Mock the db module to use test database
vi.mock("../../db", () => {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return { default: db };
});

// Import app after mocking
import app from "../../index";

// Get reference to test database for cleanup
const db = (await vi.importMock<{ default: Database.Database }>("../../db")).default;

describe("Todo API Routes", () => {
  beforeEach(() => {
    // Clean up database before each test
    db.exec("DELETE FROM todos");
  });

  afterAll(() => {
    db.close();
  });

  describe("GET /api/todos", () => {
    it("should return empty array when no todos exist", async () => {
      // Arrange & Act
      const response = await request(app).get("/api/todos");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    });

    it("should return all todos with correct structure", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      insert.run("First todo", "high");
      insert.run("Second todo", "low");

      // Act
      const response = await request(app).get("/api/todos");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        id: expect.any(Number),
        title: expect.any(String),
        completed: expect.any(Number),
        priority: expect.any(String),
        created_at: expect.any(String),
      });
    });

    it("should return todos in descending order by created_at", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority, created_at) VALUES (?, ?, ?)");
      insert.run("Oldest", "medium", "2024-01-01 10:00:00");
      insert.run("Newest", "medium", "2024-01-01 10:01:00");

      // Act
      const response = await request(app).get("/api/todos");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe("Newest");
      expect(response.body.data[1].title).toBe("Oldest");
    });
  });

  describe("GET /api/todos?q=query", () => {
    it("should return todos matching the search query", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      insert.run("Buy groceries", "high");
      insert.run("Clean the house", "medium");
      insert.run("Buy books", "low");

      // Act
      const response = await request(app).get("/api/todos?q=buy");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((todo: any) =>
        todo.title.toLowerCase().includes("buy")
      )).toBe(true);
    });

    it("should return empty array when no todos match", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      insert.run("Buy groceries", "high");
      insert.run("Clean the house", "medium");

      // Act
      const response = await request(app).get("/api/todos?q=nonexistent");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    });

    it("should be case-insensitive", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      insert.run("Buy GROCERIES", "high");
      insert.run("buy books", "medium");
      insert.run("BUY tickets", "low");

      // Act
      const response = await request(app).get("/api/todos?q=BuY");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
    });

    it("should return all todos when q is empty string", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      insert.run("First todo", "high");
      insert.run("Second todo", "low");

      // Act
      const response = await request(app).get("/api/todos?q=");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("should return all todos when q is only whitespace", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      insert.run("First todo", "high");
      insert.run("Second todo", "low");

      // Act
      const response = await request(app).get("/api/todos?q=   ");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("should support partial matching", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      insert.run("Important meeting at 3pm", "high");
      insert.run("Send meeting notes", "medium");
      insert.run("Buy groceries", "low");

      // Act
      const response = await request(app).get("/api/todos?q=meet");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((todo: any) =>
        todo.title.toLowerCase().includes("meet")
      )).toBe(true);
    });
  });

  describe("POST /api/todos", () => {
    it("should create todo with valid title", async () => {
      // Arrange
      const newTodo = { title: "New todo" };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        title: "New todo",
        completed: 0,
        priority: "medium",
        created_at: expect.any(String),
      });
    });

    it("should default priority to medium when not provided", async () => {
      // Arrange
      const newTodo = { title: "Default priority todo" };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.priority).toBe("medium");
    });

    it("should create todo with specified priority", async () => {
      // Arrange
      const newTodo = { title: "High priority todo", priority: "high" };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.priority).toBe("high");
    });

    it("should trim whitespace from title", async () => {
      // Arrange
      const newTodo = { title: "  Whitespace todo  " };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe("Whitespace todo");
    });

    it("should return 400 when title is missing", async () => {
      // Arrange
      const newTodo = {};

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title is required" });
    });

    it("should return 400 when title is empty string", async () => {
      // Arrange
      const newTodo = { title: "" };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title is required" });
    });

    it("should return 400 when title is only whitespace", async () => {
      // Arrange
      const newTodo = { title: "   " };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title is required" });
    });

    it("should return 400 when title is not a string", async () => {
      // Arrange
      const newTodo = { title: 123 };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title is required" });
    });

    it("should return 400 when title exceeds 500 characters", async () => {
      // Arrange
      const longTitle = "a".repeat(501);
      const newTodo = { title: longTitle };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title must be 500 characters or less" });
    });

    it("should accept title with exactly 500 characters", async () => {
      // Arrange
      const validTitle = "a".repeat(500);
      const newTodo = { title: validTitle };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe(validTitle);
    });

    it("should return 400 when priority is invalid", async () => {
      // Arrange
      const newTodo = { title: "Invalid priority", priority: "urgent" };

      // Act
      const response = await request(app)
        .post("/api/todos")
        .send(newTodo);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Priority must be high, medium, or low" });
    });
  });

  describe("PATCH /api/todos/:id", () => {
    it("should update title when valid", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original title", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: "Updated title" });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Updated title");
      expect(response.body.data.id).toBe(todoId);
    });

    it("should toggle completed status", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Todo to complete", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ completed: true });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.completed).toBe(1);
    });

    it("should update priority when valid", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Todo", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ priority: "high" });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.priority).toBe("high");
    });

    it("should update multiple fields at once", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "low");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: "Updated", completed: true, priority: "high" });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Updated");
      expect(response.body.data.completed).toBe(1);
      expect(response.body.data.priority).toBe("high");
    });

    it("should trim whitespace from updated title", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: "  Trimmed  " });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Trimmed");
    });

    it("should return 400 when ID is invalid (non-numeric)", async () => {
      // Arrange & Act
      const response = await request(app)
        .patch("/api/todos/invalid")
        .send({ title: "Updated" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid ID" });
    });

    it("should return 400 when ID is zero", async () => {
      // Arrange & Act
      const response = await request(app)
        .patch("/api/todos/0")
        .send({ title: "Updated" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid ID" });
    });

    it("should return 400 when ID is negative", async () => {
      // Arrange & Act
      const response = await request(app)
        .patch("/api/todos/-1")
        .send({ title: "Updated" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid ID" });
    });

    it("should return 404 when todo does not exist", async () => {
      // Arrange & Act
      const response = await request(app)
        .patch("/api/todos/9999")
        .send({ title: "Updated" });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Todo not found" });
    });

    it("should return 400 when title is empty string", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: "" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title must be a non-empty string" });
    });

    it("should return 400 when title is only whitespace", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: "   " });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title must be a non-empty string" });
    });

    it("should return 400 when title is not a string", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: 123 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title must be a non-empty string" });
    });

    it("should return 400 when completed is not a boolean", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ completed: "yes" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Completed must be a boolean" });
    });

    it("should return 400 when priority is invalid", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ priority: "urgent" });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Priority must be high, medium, or low" });
    });

    it("should return 400 when title exceeds 500 characters", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "medium");
      const todoId = result.lastInsertRowid;
      const longTitle = "a".repeat(501);

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: longTitle });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Title must be 500 characters or less" });
    });

    it("should preserve unchanged fields when updating", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("Original", "high");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: "Updated title" });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Updated title");
      expect(response.body.data.priority).toBe("high");
      expect(response.body.data.completed).toBe(0);
    });
  });

  describe("DELETE /api/todos/:id", () => {
    it("should delete todo and return deleted data", async () => {
      // Arrange
      const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");
      const result = insert.run("To be deleted", "medium");
      const todoId = result.lastInsertRowid;

      // Act
      const response = await request(app).delete(`/api/todos/${todoId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: todoId,
        title: "To be deleted",
        priority: "medium",
      });

      // Verify deletion
      const todos = db.prepare("SELECT * FROM todos WHERE id = ?").get(todoId);
      expect(todos).toBeUndefined();
    });

    it("should return 400 when ID is invalid (non-numeric)", async () => {
      // Arrange & Act
      const response = await request(app).delete("/api/todos/invalid");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid ID" });
    });

    it("should return 400 when ID is zero", async () => {
      // Arrange & Act
      const response = await request(app).delete("/api/todos/0");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid ID" });
    });

    it("should return 400 when ID is negative", async () => {
      // Arrange & Act
      const response = await request(app).delete("/api/todos/-1");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid ID" });
    });

    it("should return 404 when todo does not exist", async () => {
      // Arrange & Act
      const response = await request(app).delete("/api/todos/9999");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Todo not found" });
    });
  });
});
