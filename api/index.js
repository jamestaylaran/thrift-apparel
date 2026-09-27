// Vercel serverless entry point: the whole Express API runs as one function.
// All requests under /api/* are rewritten to this file (see vercel.json).
import app from "../server/server.js";

export default app;
