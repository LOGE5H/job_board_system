# Job Portal - Copilot Instructions

## Architecture Overview

This is a **monorepo** job portal with two workspaces:
- **Backend** (`backend/`): Express.js REST API with MongoDB (Mongoose)
- **Frontend** (`frontend/`): React 18 + Vite + Tailwind CSS SPA

**Two user roles**: `employer` and `candidate` - each has distinct models, routes, and UI pages.

## Developer Workflow

```bash
# Install all dependencies (from root)
npm run install:all

# Run both servers concurrently (backend:5000, frontend:3000)
npm run dev

# Or run individually
npm run dev:backend   # Express on port 5000
npm run dev:frontend  # Vite on port 3000
```

Vite proxies `/api` and `/uploads` to the backend - see [vite.config.js](frontend/vite.config.js).

## Backend Patterns

### Route → Middleware → Handler Flow
Routes use middleware chains: `auth` → role check (`isEmployer`/`isCandidate`) → optional `isVerifiedEmployer` → handler.
```javascript
// Example: POST /api/jobs requires verified employer
router.post('/', auth, isVerifiedEmployer, [...validators], handler);
```

### Models Structure
All models exported from [backend/src/models/index.js](backend/src/models/index.js):
- **User**: Auth only (email, password, role, emailVerified)
- **EmployerProfile / CandidateProfile**: Role-specific profile data linked via `userId`
- **Job**: Posted by employers, references `employerId`
- **Application**: Links `jobId`, `candidateId`, `employerId` with status workflow: `pending` → `reviewed` → `shortlisted` → `rejected`/`hired`

### File Uploads
Use multer middleware from [backend/src/middleware/upload.js](backend/src/middleware/upload.js):
- Resumes: `/uploads/resumes/` (PDF, DOC, DOCX, max 5MB)
- Logos: `/uploads/logos/` (PNG, JPG)
- Profiles: `/uploads/profiles/` (PNG, JPG)

Files use UUID naming: `resume-{uuid}.pdf`, `logo-{uuid}.png`

### Validation
Use `express-validator` for request validation. Always check `validationResult(req)` before processing.

## Frontend Patterns

### Auth Context
[frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx) provides:
- `user`, `isAuthenticated`, `isEmployer`, `isCandidate`, `isEmailVerified`
- Token stored in `localStorage` under keys `token` and `user`

### API Service Layer
[frontend/src/services/api.js](frontend/src/services/api.js) groups endpoints:
- `authAPI` - registration, login, email verification
- `jobsAPI` - CRUD operations, categories
- `employerAPI` - dashboard, applicant management
- `candidateAPI` - profile, applications, saved jobs

Axios interceptors auto-attach JWT token and redirect to `/login` on 401.

### Route Protection
[frontend/src/App.jsx](frontend/src/App.jsx) uses:
- `<ProtectedRoute allowedRoles={['employer']}>` - role-based protection
- `<PublicOnlyRoute>` - redirects authenticated users to their dashboard

### Page Organization
- `/pages/auth/` - Login, Register, VerifyEmail
- `/pages/employer/` - Dashboard, Jobs, Applicants, Profile
- `/pages/candidate/` - Dashboard, Applications, SavedJobs, Profile

## Key Conventions

1. **Separate registration endpoints**: `/auth/register/employer` and `/auth/register/candidate` create User + corresponding Profile
2. **Skills stored as JSON string** in Job.requiredSkills - parse with `JSON.parse()` when reading
3. **Application uniqueness**: Compound index prevents duplicate applications (same job + candidate)
4. **Email verification required** for employers to post jobs - enforced by `isVerifiedEmployer` middleware
5. **Job auto-hiding**: Jobs with `reportCount >= 5` are automatically hidden

## Environment Variables

Backend requires `.env`:
```
MONGODB_URI=mongodb://localhost:27017/jobportal
JWT_SECRET=your-secret-key
PORT=5000
```
