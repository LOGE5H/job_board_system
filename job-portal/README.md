# 💼 Job Portal System

A full-stack job portal application that connects employers with job seekers. Built with React, Node.js, Express, and MongoDB.

![Job Portal](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### For Candidates
- 🔍 Search and filter jobs by category, location, salary, and job type
- 📝 Create and manage professional profile
- 📄 Upload and manage resume
- 💾 Save jobs for later
- 📨 Apply to jobs with cover letter
- 📊 Track application status (Pending, Reviewed, Shortlisted, Rejected)
- 🔔 Real-time notifications for application updates
- 💡 Personalized job recommendations based on skills

### For Employers
- 📢 Post and manage job listings
- 👥 View and manage applicants
- 📋 Review candidate profiles and resumes
- ✅ Update application status
- 🏢 Create company profile with logo
- 📈 Dashboard with analytics
- 🔔 Notifications for new applications

### General
- 🔐 Secure authentication with JWT
- 📱 Fully responsive design
- 🎨 Modern UI with Tailwind CSS
- 🔒 Role-based access control
- 📧 Email verification system

## 🛠 Tech Stack

### Frontend
| Technology | Description |
|------------|-------------|
| React 18.2 | UI Library |
| Vite 5.0 | Build Tool |
| React Router DOM 6 | Routing |
| Tailwind CSS 3.4 | Styling |
| Axios | HTTP Client |
| Lucide React | Icons |
| React Hot Toast | Notifications |

### Backend
| Technology | Description |
|------------|-------------|
| Node.js | Runtime |
| Express.js | Web Framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| Multer | File Uploads |
| express-validator | Validation |

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6.0 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **MongoDB Compass** (Optional, for GUI) - [Download](https://www.mongodb.com/try/download/compass)
- **Git** - [Download](https://git-scm.com/)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aswin32156/job_board_system.git
   cd job_board_system
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

   Or use the shortcut:
   ```bash
   npm run install:all
   ```

## ⚙️ Configuration

1. **Create environment file for backend**
   
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/jobportal
   JWT_SECRET=your_super_secret_jwt_key_here
   NODE_ENV=development
   ```

2. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # Windows (if installed as service)
   net start MongoDB

   # Or start manually
   mongod
   ```

## 🏃 Running the Application

### Development Mode

**Option 1: Run both servers together**
```bash
cd job-portal
npm run dev
```

**Option 2: Run servers separately**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option 3: Use the batch file (Windows)**
```bash
# Double-click start-servers.bat
# Or run from command line
start-servers.bat
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Health Check**: http://localhost:5000/api/health

## 📁 Project Structure

```
job-portal/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── mongodb.js         # Database connection
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT authentication
│   │   │   └── upload.js          # File upload config
│   │   ├── models/
│   │   │   ├── User.js            # User model
│   │   │   ├── Job.js             # Job model
│   │   │   ├── Application.js     # Application model
│   │   │   ├── CandidateProfile.js
│   │   │   ├── EmployerProfile.js
│   │   │   ├── SavedJob.js
│   │   │   ├── Notification.js
│   │   │   └── JobReport.js
│   │   ├── routes/
│   │   │   ├── auth.js            # Authentication routes
│   │   │   ├── jobs.js            # Job routes
│   │   │   ├── employer.js        # Employer routes
│   │   │   ├── candidate.js       # Candidate routes
│   │   │   ├── notifications.js   # Notification routes
│   │   │   └── analytics.js       # Analytics routes
│   │   └── server.js              # Express server
│   ├── uploads/                   # Uploaded files
│   │   ├── resumes/
│   │   ├── logos/
│   │   └── profiles/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/            # Reusable components
│   │   │   ├── jobs/              # Job-related components
│   │   │   └── layout/            # Layout components
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Authentication context
│   │   ├── pages/
│   │   │   ├── auth/              # Authentication pages
│   │   │   ├── candidate/         # Candidate pages
│   │   │   ├── employer/          # Employer pages
│   │   │   ├── Home.jsx
│   │   │   ├── Jobs.jsx
│   │   │   └── JobDetails.jsx
│   │   ├── services/
│   │   │   └── api.js             # API service
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── start-servers.bat              # Windows startup script
├── package.json                   # Root package.json
└── README.md
```

## 🔗 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/employer` | Register employer |
| POST | `/api/auth/register/candidate` | Register candidate |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/verify/:token` | Verify email |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | Get all jobs (with filters) |
| GET | `/api/jobs/:id` | Get job by ID |
| POST | `/api/jobs` | Create job (Employer) |
| PUT | `/api/jobs/:id` | Update job (Employer) |
| DELETE | `/api/jobs/:id` | Delete job (Employer) |

### Candidate
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidate/dashboard` | Get dashboard data |
| GET | `/api/candidate/profile` | Get profile |
| PUT | `/api/candidate/profile` | Update profile |
| POST | `/api/candidate/apply/:jobId` | Apply to job |
| GET | `/api/candidate/applications` | Get applications |
| POST | `/api/candidate/saved-jobs/:jobId` | Save job |
| GET | `/api/candidate/saved-jobs` | Get saved jobs |

### Employer
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employer/dashboard` | Get dashboard data |
| GET | `/api/employer/jobs` | Get employer's jobs |
| GET | `/api/employer/jobs/:id/applications` | Get job applicants |
| PUT | `/api/employer/applications/:id/status` | Update application status |

## 📸 Screenshots

### Home Page
- Modern landing page with job search
- Featured jobs and categories
- Platform statistics

### Job Search
- Advanced filtering options
- Job cards with key information
- Pagination support

### Candidate Dashboard
- Application tracking
- Job recommendations
- Profile completion tips

### Employer Dashboard
- Job posting management
- Applicant management
- Analytics overview

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Aswin** - [GitHub](https://github.com/aswin32156)

## 🙏 Acknowledgments

- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Express.js](https://expressjs.com/)

---

<p align="center">
  Made with ❤️ for job seekers and employers
</p>
