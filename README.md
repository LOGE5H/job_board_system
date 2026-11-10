# Job Portal System

A full-stack job portal for candidates and employers, built with React, Express, SQLite, and Google Gemini AI.

## Features

- Candidate and employer authentication with JWT
- Job search, applications, saved jobs, profiles, and notifications
- Employer job and applicant management
- AI Career Studio powered by Google Gemini

## Requirements

- Node.js 18+
- npm
- Google Gemini API key for live AI responses

## Installation

```powershell
git clone https://github.com/LOGE5H/job_board_system.git
cd job_board_system/job-portal
npm run install:all
```

Create `job-portal/backend/.env` using `job-portal/backend/.env.example`:

```env
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
GEMINI_API_KEY=replace_with_your_google_gemini_api_key
```

Never commit `.env` or share your Gemini API key.

## Run

```powershell
cd job-portal
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health
- AI status: http://localhost:5000/api/ai/status

Build the frontend with:

```powershell
cd job-portal
npm run build
```

## Structure

```text
job-portal/
├── backend/   # Express API, SQLite storage, Gemini integration
└── frontend/  # React/Vite client
```

Local secrets, databases, uploads, dependencies, and build output are excluded from this public repository.
