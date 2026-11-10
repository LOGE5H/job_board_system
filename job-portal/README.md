# Job Portal System

A full-stack job portal for candidates and employers, built with React, Express, SQLite, and Google Gemini AI.

## Features

- Candidate and employer authentication with JWT
- Job search, filtering, saving, and applications
- Candidate profiles, resumes, and application tracking
- Employer job and applicant management
- Notifications and analytics
- AI Career Studio powered by Google Gemini
- AI resume analysis, interview kits, job-description help, career plans, and candidate matching

## Tech Stack

- **Frontend:** React, Vite, React Router, Tailwind CSS, Axios
- **Backend:** Node.js, Express, SQLite via `sql.js`
- **AI:** Google Gemini API through `@google/generative-ai`
- **Authentication:** JWT and bcryptjs

## Requirements

- Node.js 18 or newer
- npm
- A Google Gemini API key for live AI responses

## Installation

```powershell
git clone https://github.com/LOGE5H/job_board_system.git
cd job_board_system/job-portal
npm run install:all
```

## Configuration

Create `backend/.env`:

```env
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
LOG_LEVEL=debug
GEMINI_API_KEY=replace_with_your_google_gemini_api_key
```

Never commit `.env` or share your Gemini API key. The repository intentionally excludes local databases, uploaded files, dependencies, and build output.

## Run the Application

Run both frontend and backend:

```powershell
npm run dev
```

Or run them separately:

```powershell
npm run dev:backend
npm run dev:frontend
```

The application is available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health
- AI status: http://localhost:5000/api/ai/status

## Production Build

```powershell
npm run build
```

## Project Structure

```text
job-portal/
├── backend/
│   └── src/
│       ├── config/          # SQLite setup
│       ├── middleware/      # Authentication and uploads
│       ├── routes/          # REST API routes
│       ├── services/        # Gemini and AI matching services
│       └── utils/           # Shared backend utilities
├── frontend/
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Application screens
│       └── services/        # API client
└── start-servers.bat        # Windows launcher
```

## Security

This is a public source repository. Do not add credentials, API keys, user resumes, local databases, or other private data to Git. Configure secrets through environment variables in the runtime environment.

## License

This project is available under the MIT License.
