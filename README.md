# Thrift Apparel

A full-stack thrift fashion e-commerce application built with React, Express, and MySQL.

## Features

- Customer storefront and product catalog
- Customer registration and login
- Admin login and protected dashboard
- Product, inventory, order, and customer management
- Wishlist and cart flows with stock validation
- Checkout with database-backed order creation
- Responsive design for desktop, tablet, and mobile

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL
- Authentication: JWT + bcrypt

## Project Structure

- `client/` – React frontend
- `server/` – Express API
- `database/` – MySQL schema and seed SQL

## Setup

1. Install dependencies:
   
   npm install
   cd client && npm install && cd ..

2. Create MySQL database:

   mysql -u root -p
   CREATE DATABASE thrift_apparel;

3. Configure environment variables:

   copy `.env.example` to `.env` and update values.

4. Import database schema:

   mysql -u root -p thrift_apparel < database/schema.sql

5. Seed sample products and categories:

   mysql -u root -p thrift_apparel < database/seed.sql

6. Create your first admin account:

   INSERT INTO users (name, email, password_hash, role, phone, address, created_at)
   VALUES ('Admin User', 'admin@thriftapparel.com', '$2a$10$QwR6tJx2eWj3lVwjgslKaeSk8vE7QI4e9M3A4g4nJ5PmcA5h4J2r6', 'admin', '09171234567', 'Main Office', NOW());

   Replace the hash with a bcrypt hash generated from your password.

7. Start backend:

   npm run server

8. Start frontend:

   npm run client

9. Open the app:

   - Customer storefront: http://localhost:5173
   - Admin login: http://localhost:5173/admin/login

## Default Admin Login

- Email: admin@thriftapparel.com
- Password: use the password tied to your bcrypt hash

## Important Notes

- The database is the source of truth for stock.
- Checkout validates stock and transaction safety before order creation.
- Admin routes are protected via JWT middleware.

## Deploying the storefront to Vercel

The React storefront can be deployed to Vercel from the `client/` folder.

1. Push this project to GitHub.
2. In Vercel, import the repository and set **Root Directory** to `client`.
3. Set the production environment variable `VITE_API_URL` to the public URL of the deployed API, for example `https://your-api.example.com/api`.
4. Deploy.

The API cannot use `localhost` in production. Deploy the Express server to a Node host such as Render, Railway, or Fly.io, and use a hosted MySQL database such as Railway MySQL, Aiven, or PlanetScale. Set the API variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and `CLIENT_URL` on that host.

### Gmail order notifications

To email customers after checkout, enable 2-Step Verification on the Gmail account that will send messages, create a Gmail App Password, and add these values to `.env`:

```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_APP_PASSWORD=your-16-character-app-password
```

Restart the backend after changing `.env`. Checkout still succeeds if email is not configured; the server logs that the notification was skipped.
