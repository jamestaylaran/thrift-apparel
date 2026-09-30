import express from "express";
import { supabase } from "../../lib/supabase.js";
import { hasBestPickColumn, parseBestPick } from "../../lib/best-pick.js";

const router = express.Router();

// GET all products
router.get("/", async (req, res) => {
  try {
    const {
      category,
      size,
      brand,
      color,
      condition,
      q,
      sort,
      minPrice,
      maxPrice,
    } = req.query;

    // `!inner` makes PostgREST drop products whose category does not match
    // the filter below (mirrors the old SQL JOIN + WHERE behaviour).
    const selectClause = category
      ? `*, categories!inner(name)`
      : `*, categories(name)`;

    let query = supabase
      .from("products")
      .select(selectClause)
      .neq("status", "archived")
      .gt("stock_quantity", 0);

    // Filters
    if (category) {
      query = query.eq("categories.name", category);
    }

    if (size) {
      query = query.eq("size", size);
    }

    if (brand) {
      query = query.eq("brand", brand);
    }

    if (color) {
      query = query.eq("color", color);
    }

    if (condition) {
      query = query.eq("condition_name", condition);
    }

    if (minPrice) {
      query = query.gte("price", Number(minPrice));
    }

    if (maxPrice) {
      query = query.lte("price", Number(maxPrice));
    }

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%`,
      );
    }

    // Sorting
    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const products = data.map((product) => ({
      ...product,
      category_name: product.categories?.name || null,
      stock_status:
        product.stock_quantity > 5
          ? "In Stock"
          : product.stock_quantity > 0
            ? "Low Stock"
            : "Out of Stock",
    }));

    res.json(products);
  } catch (error) {
    console.error("Products error:", error);

    res.status(500).json({
      message: "Failed to fetch products.",
      error: error.message,
    });
  }
});

// GET featured products
router.get("/featured", async (req, res) => {
  try {
    let query = supabase
      .from("products")
      .select("*")
      .neq("status", "archived")
      .gt("stock_quantity", 0);

    // The admin's chosen Best Pick always surfaces first in every section
    // that renders this list.
    if (await hasBestPickColumn()) {
      query = query.order("is_best_pick", { ascending: false });
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error("Featured products error:", error);

    res.status(500).json({
      message: "Failed to fetch featured products.",
      error: error.message,
    });
  }
});

// GET single product
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        categories (
          name
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          message: "Product not found.",
        });
      }

      throw error;
    }

    const product = {
      ...data,
      category_name: data.categories?.name || null,
      stock_status:
        data.stock_quantity > 5
          ? "In Stock"
          : data.stock_quantity > 0
            ? "Low Stock"
            : "Out of Stock",
    };

    res.json(product);
  } catch (error) {
    console.error("Product error:", error);

    res.status(500).json({
      message: "Failed to fetch product.",
      error: error.message,
    });
  }
});

export default router;
