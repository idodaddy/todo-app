import { useState, useEffect } from 'react';
import type { Todo, Priority } from '../api/todos';
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../api/todos';

const PRIORITY_CONFIG = {
  high: { label: '높음', badge: 'bg-red-100 text-red-700' },
  medium: { label: '중간', badge: 'bg-yellow-100 text-yellow-700' },
  low: { label: '낮음', badge: 'bg-green-100 text-green-700' },
} as const;

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos(query?: string) {
    const res = await fetchTodos(query);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setTodos(res.data);
    }
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value;
    setSearchQuery(query);
    loadTodos(query || undefined);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const res = await createTodo(newTitle.trim(), newPriority);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setNewTitle('');
      setNewPriority('medium');
      loadTodos(searchQuery || undefined);
    }
  }

  async function handleToggle(todo: Todo) {
    const res = await updateTodo(todo.id, { completed: !todo.completed });
    if (res.data) {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? res.data! : t)));
    }
  }

  async function handlePriorityChange(todo: Todo, priority: Priority) {
    const res = await updateTodo(todo.id, { priority });
    if (res.data) {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? res.data! : t)));
    }
  }

  async function handleDelete(id: number) {
    const res = await deleteTodo(id);
    if (!res.error) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Todo App</h1>

      {error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <input
        type="text"
        value={searchQuery}
        onChange={handleSearch}
        placeholder="검색어를 입력하세요"
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as Priority)}
          className="rounded border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="high">높음</option>
          <option value="medium">중간</option>
          <option value="low">낮음</option>
        </select>
        <button
          type="submit"
          className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          추가
        </button>
      </form>

      <ul className="space-y-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-3 rounded border border-gray-200 p-3"
          >
            <input
              type="checkbox"
              checked={!!todo.completed}
              onChange={() => handleToggle(todo)}
              className="h-4 w-4 accent-blue-500"
            />
            <span
              className={`flex-1 text-sm ${
                todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}
            >
              {todo.title}
            </span>
            <select
              value={todo.priority}
              onChange={(e) => handlePriorityChange(todo, e.target.value as Priority)}
              className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_CONFIG[todo.priority].badge}`}
            >
              <option value="high">높음</option>
              <option value="medium">중간</option>
              <option value="low">낮음</option>
            </select>
            <button
              onClick={() => handleDelete(todo.id)}
              className="text-sm text-red-400 hover:text-red-600"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && (
        <p className="mt-4 text-center text-sm text-gray-400">
          할 일이 없습니다.
        </p>
      )}
    </div>
  );
}
