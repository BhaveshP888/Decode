# 🔍 Decode — Know What You Consume

**Decode** is a premium, AI-powered ingredient analysis web application. It allows users to scan, break down, and evaluate ingredient labels from food, drinks, and medicines. By utilizing advanced AI, Decode exposes harmful additives, reveals nutritional value, and gives users a clear understanding of what they are consuming—all within a beautiful, dynamic, and intuitive interface.

---

## 🌟 Key Features

- **📸 Intelligent Label Scanning**: Upload or capture ingredient labels to instantly receive a structured analysis of the contents.
- **🔬 Deep Chemical Breakdown**: Uncovers artificial colors, preservatives, and obscure additives with clear, layman-friendly explanations.
- **📊 Health Scoring**: Receive a calculated safety rating based on the presence of harmful or ultra-processed ingredients.
- **📚 Historical Scans**: Save your past analyses to your account, allowing you to build up a personal catalog of product reviews.
- **🎨 Premium UI/UX**: Designed with sleek glassmorphism, fluid micro-animations, and a highly responsive layout (Tailwind CSS, framer-motion).

---

## 🛠️ Technology Stack

Decode is built to be fast, reliable, and visually stunning using modern web technologies:

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS, Lucide Icons, Phosphor Icons
- **Backend**: Next.js Server Actions & API Routes
- **Database**: PostgreSQL (hosted via [Supabase](https://supabase.com/)), managed using [Prisma ORM](https://www.prisma.io/)
- **Authentication**: Supabase Auth (Google OAuth & Magic Links)
- **AI Integration**: [Google Gemini API](https://deepmind.google/technologies/gemini/) (for multi-modal label analysis)
- **Package Manager**: [Bun](https://bun.sh/)

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- [Bun](https://bun.sh/) (v1.x or higher)
- A [Supabase](https://supabase.com/) account and project
- A [Google Gemini API](https://aistudio.google.com/) key

### 1. Clone the repository

```bash
git clone <repository-url>
cd decode
```

### 2. Install dependencies

Since we use Bun, dependency installation is lightning fast:

```bash
bun install
```

### 3. Environment Variables

Create a `.env` file in the root directory and populate it with your Supabase and Gemini credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Prisma Database Configuration
DATABASE_URL=your_postgres_connection_string

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Database Setup

Ensure your Prisma schema is synced with your Supabase Postgres database.

```bash
# Push the schema to your database
bunx prisma db push

# (Optional) generate the Prisma client
bunx prisma generate
```

### 5. Start the Development Server

Run the local development server:

```bash
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser to start scanning!

---

## 💻 Commands Reference

- `bun run dev`: Start the Next.js development server
- `bun run build`: Create a production-ready Next.js build
- `bun run start`: Start the Next.js production server
- `bun run lint`: Run ESLint checks
- `bunx prisma db push`: Push schema changes to the database
- `bunx prisma studio`: Open the visual database browser for Prisma

---

## 📂 Project Structure

```text
├── app/                  # Next.js App Router (pages, layouts, API routes)
├── components/           # Reusable React UI components
├── lib/                  # Utility functions, Supabase clients, Gemini helpers
├── prisma/               # Prisma schema and configuration
├── public/               # Static assets (images, icons)
└── package.json          # Dependencies and scripts
```

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

> Designed & Engineered with focus on **Doubt-Driven Development**, high-end aesthetics, and robust AI integration.
