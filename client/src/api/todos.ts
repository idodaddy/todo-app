export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: number;
  title: string;
  completed: number;
  priority: Priority;
  created_at: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

const API_BASE = '/api/todos';

export async function fetchTodos(query?: string): Promise<ApiResponse<Todo[]>> {
  const url = query ? `${API_BASE}?q=${encodeURIComponent(query)}` : API_BASE;
  const res = await fetch(url);
  return res.json();
}

export async function createTodo(title: string, priority: Priority = 'medium'): Promise<ApiResponse<Todo>> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, priority }),
  });
  return res.json();
}

export async function updateTodo(id: number, fields: { completed?: boolean; priority?: Priority }): Promise<ApiResponse<Todo>> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return res.json();
}

export async function deleteTodo(id: number): Promise<ApiResponse<{ message: string }>> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}
