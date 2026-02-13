import express from "express";
import cors from "cors";
import todosRouter from "./routes/todos";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use("/api/todos", todosRouter);

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
