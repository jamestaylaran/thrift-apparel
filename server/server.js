import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categories.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import wishlistRoutes from "./routes/wishlist.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import reviewRoutes from "./routes/reviews.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;
const isVercel = Boolean(process.env.VERCEL);

// CORS — in production the client and the API share one origin (Vercel),
// so this mainly matters for local development.
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      let hostname = "";
      try {
        hostname = new URL(origin).hostname;
      } catch {
        return callback(null, false);
      }

      const allowed =
        origin === clientUrl ||
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || // LAN IP (e.g. 192.168.1.5)
        hostname.endsWith(".vercel.app");

      return callback(null, allowed);
    },
    credentials: true,
  }),
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
if (!isVercel) {
  app.use(morgan("dev"));
}

// Static uploads (legacy local uploads only — new images go to Supabase Storage,
// and express.static is ignored by Vercel anyway).
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Thrift Apparel API running",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    message: "Server error",
    error: err.message,
  });
});

// Start the server locally. On Vercel the app is exported below instead.
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
