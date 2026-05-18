# Edu Box (LMS)
## Mostafa Abo-Hamar
<!-- Badges -->
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/License-ISC-green.svg)](LICENSE)

A modern, full-stack Learning Management System built with React, Express, MongoDB, and Socket.io. Edu Box provides a complete platform for educational institutions with real-time features, AI-powered grading, and comprehensive analytics.

## Features

### Core Learning
- **Course Management**: Create and manage courses with unique join codes
- **Quiz System**: Timed quizzes with automatic grading and configurable attempts
- **Notes & Comments**: Collaborative learning tools for course discussions
- **Calendar Events**: Schedule and track course-related events

### Real-time Communication
- **Live Chat**: Socket.io-powered messaging between students and teachers
- **Notifications**: Real-time alerts for quiz deadlines and new content
- **Instant Updates**: Changes sync immediately across all connected clients

### Analytics & Gamification
- **Dashboard Analytics**: Student performance metrics and progress tracking
- **Leaderboard**: Gamified competition with rankings by points
- **Grade Management**: Detailed grade tracking per course and quiz

### AI & Performance
- **AI Auto-Grading**: Gemini-powered grading for quiz answers
- **Redis Caching**: Fast response times with intelligent caching
- **Background Tasks**: Automated quiz scheduling and deadline management

### Administration
- **User Management**: Admin panel for managing users and roles
- **Activity Logs**: Full audit trail of system actions
- **Support Tickets**: Built-in ticket system for user support

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| TailwindCSS 4 | Styling |
| Zustand | State management |
| React Router 6 | Navigation |
| Socket.io Client | Real-time communication |
| Framer Motion | Animations |
| Recharts | Charts & analytics |
| FullCalendar | Calendar component |

### Backend
| Technology | Purpose |
|------------|---------|
| Express 5 | Web framework |
| TypeScript 5.9 | Type safety |
| MongoDB + Mongoose | Database |
| Socket.io | Real-time WebSocket server |
| JWT | Authentication |
| bcrypt | Password hashing |
| Joi | Request validation |
| Swagger | API documentation |
| Upstash Redis | Caching layer |
| Gemini AI | AI-powered grading |
| node-cron | Background scheduling |

## Project Structure

```
├── frontend/                      # React frontend application
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── admin/            # Admin panel components
│   │   │   ├── chat/             # Chat components
│   │   │   ├── common/           # Shared UI components
│   │   │   ├── dashboard/       # Dashboard widgets
│   │   │   ├── layout/           # Layout (Navbar, Sidebar, etc.)
│   │   │   ├── notifications/    # Notification components
│   │   │   ├── quiz/             # Quiz components
│   │   │   ├── search/           # Global search
│   │   │   ├── student/         # Student-specific components
│   │   │   └── teacher/         # Teacher-specific components
│   │   ├── contexts/            # React contexts
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities and API client
│   │   ├── pages/               # Page components
│   │   │   ├── admin/           # Admin pages
│   │   │   └── *.jsx            # Main pages
│   │   ├── stores/              # Zustand state stores
│   │   ├── App.jsx              # Main app component
│   │   └── main.jsx             # Entry point
│   └── package.json
│
├── backend/                      # Express backend API
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Express middleware
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # API route definitions
│   │   ├── services/            # Business logic
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Utility functions
│   │   ├── server/              # Server configuration
│   │   │   ├── config/         # Database config
│   │   │   ├── socket.ts        # Socket.io setup
│   │   │   ├── chat.ts          # Chat functionality
│   │   │   ├── quizScheduler.ts # Quiz timing
│   │   │   └── systemScheduler.ts # Background tasks
│   │   └── server.ts            # Entry point
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local installation or MongoDB Atlas)
- **Redis** (for Upstash caching, optional)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GradProj
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

Create the backend `.env` file with the following variables:

```bash
cd backend
cp .env.example .env
```

Or create `backend/.env` manually:

```env
# Server
PORT=3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/edubox

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production
JWT_LIFETIME=1h
JWT_REFRESH_LIFETIME=7d

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# AI Grading (Gemini)
GEMINI_API_KEY=your-gemini-api-key

# Environment
NODE_ENV=development
```

> **Note**: The `.env` file is excluded from git. Never commit secrets.

### Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
- Compiles TypeScript and starts server on `http://localhost:3000`
- Auto-rebuilds on file changes
- Kills existing process on port 3000 before starting

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
- Starts dev server on `http://localhost:5173`
- Proxies `/api` requests to backend

### Building for Production

**Backend:**
```bash
cd backend
npm run build    # Compiles TypeScript to dist/
npm run start    # Runs compiled JS
```

**Frontend:**
```bash
cd frontend
npm run build    # Creates production build
```

## User Roles

### Student
- Browse and join courses using join codes
- Take quizzes within time limits
- View grades and progress
- Participate in course discussions
- Chat with teachers
- View personal analytics
- Submit support tickets

### Teacher
- Create and manage courses
- Add quizzes with multiple-choice questions
- View student progress and grades
- Manage course enrollments
- Post notes and announcements
- Chat with students
- View course analytics
- Manage calendar events

### Admin
- Full system access
- User management (create, view, delete)
- System-wide analytics dashboard
- Activity logs
- Support ticket management

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh access token |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List courses |
| POST | `/api/courses` | Create course |
| GET | `/api/courses/:id` | Get course details |
| PUT | `/api/courses/:id` | Update course |
| DELETE | `/api/courses/:id` | Delete course |
| POST | `/api/courses/join` | Join course with code |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quizzes` | List quizzes |
| POST | `/api/quizzes` | Create quiz |
| GET | `/api/quizzes/:id` | Get quiz details |
| PUT | `/api/quizzes/:id` | Update quiz |
| DELETE | `/api/quizzes/:id` | Delete quiz |
| POST | `/api/quizzes/:id/submit` | Submit quiz attempt |

### Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/questions` | Add question |
| PUT | `/api/questions/:id` | Update question |
| DELETE | `/api/questions/:id` | Delete question |

### Attempts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attempts` | List attempts |
| GET | `/api/attempts/:id` | Get attempt details |

### Grades
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grades` | Get grades |
| GET | `/api/grades/course/:id` | Get course grades |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List notes |
| POST | `/api/notes` | Create note |
| GET | `/api/notes/:id` | Get note |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Delete note |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comments` | List comments |
| POST | `/api/comments` | Add comment |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | Get chat messages |
| POST | `/api/chats` | Send message |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Dashboard overview |
| GET | `/api/analytics/course/:id` | Course analytics |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Get rankings |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |

### Calendar Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets |
| POST | `/api/tickets` | Create ticket |
| PUT | `/api/tickets/:id` | Update ticket |
| DELETE | `/api/tickets/:id` | Delete ticket |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=query` | Global search |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/logs` | Get activity logs |

## Real-time Features

### Socket.io Events

**Server → Client:**
| Event | Description |
|-------|-------------|
| `new-quiz` | Quiz published notification |
| `new-note` | Note posted notification |
| `chat-message` | New chat message received |
| `notification` | New notification |
| `quiz-update` | Quiz status changed |

**Client → Server:**
| Event | Description |
|-------|-------------|
| `join-course` | Join course chat room |
| `leave-course` | Leave course chat room |
| `send-message` | Send chat message |

## Database Models

### User
```typescript
{
  name: string;           // 6-40 characters
  email: string;          // Unique, valid email
  password: string;       // 6+ chars, bcrypt hashed
  role: 'teacher' | 'student' | 'admin';
  points?: number;       // Leaderboard points
  createdAt: Date;
}
```

### Course
```typescript
{
  title: string;
  description?: string;
  joinCode: string;       // Unique, for students to join
  teacher: ObjectId;      // Reference to User
  students: ObjectId[];   // Enrolled students
  createdAt: Date;
}
```

### Quiz
```typescript
{
  course: ObjectId;
  title: string;
  description?: string;
  openAt: Date;
  closeAt: Date;
  durationMinutes: number;
  attemptsAllowed: number;
  questionsPerAttempt?: number;
  published: boolean;
  gradingMode: 'onSubmit' | 'onClose';
  aiGrading?: boolean;   // Use AI for grading
}
```

### Question
```typescript
{
  quiz: ObjectId;
  text: string;
  options: string[];     // Array of choices
  correctOption: number; // Index of correct answer
  points: number;
}
```

### Attempt
```typescript
{
  quiz: ObjectId;
  student: ObjectId;
  answers: Array<{
    questionId: ObjectId;
    selectedOption: number;
  }>;
  score?: number;
  gradedBy?: 'auto' | 'ai';
  startedAt: Date;
  submittedAt?: Date;
}
```

### Note
```typescript
{
  course: ObjectId;
  title: string;
  content: string;       // Markdown supported
  teacher: ObjectId;
  createdAt: Date;
}
```

### Ticket
```typescript
{
  user: ObjectId;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}
```

## State Management (Zustand)

### Stores
| Store | Purpose |
|-------|---------|
| `Authstore` | User authentication state |
| `Quizstore` | Quiz data and attempts |
| `Teacherstore` | Teacher-specific data |
| `NotificationStore` | Notifications |
| `ChatStore` | Chat messages |
| `SocketStore` | Socket.io connection |
| `ThemeStore` | UI theme preferences |
| `uiStore` | UI state (modals, sidebar) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `MONGO_URI` | Yes | - | MongoDB connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `JWT_LIFETIME` | No | 1h | Access token lifetime |
| `JWT_REFRESH_LIFETIME` | No | 7d | Refresh token lifetime |
| `UPSTASH_REDIS_REST_URL` | No | - | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | No | - | Upstash Redis token |
| `GEMINI_API_KEY` | No | - | Gemini API key for AI grading |
| `NODE_ENV` | No | development | Environment mode |

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running (`mongod` or check Atlas dashboard)
- Verify `MONGO_URI` in `.env` is correct
- Check network/firewall settings

### Port Already in Use
```bash
# Windows - kill process on port
npx kill-port 3000
npx kill-port 5173

# Or change PORT in .env
```

### CORS Errors
- Backend CORS is configured to allow frontend origin
- Ensure frontend is running on port 5173 (or update CORS config)

### Socket.io Connection Issues
- Ensure backend is running
- Check WebSocket connectivity in browser DevTools
- Verify no firewall blocking WebSocket upgrades

### AI Grading Not Working
- Verify `GEMINI_API_KEY` is set in `.env`
- Check Gemini API quota/limits
- Ensure quiz has `aiGrading: true`

### Redis Caching Issues
- Upstash Redis is optional
- If not configured, the app works without caching
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

## Development

### Backend Testing
```bash
cd backend
npm test          # Run tests once
npm run test:watch # Watch mode
npm run test:ui    # UI mode
```

### Frontend Linting
```bash
cd frontend
npm run lint
```

### API Documentation
Swagger docs available at `http://localhost:3000/api-docs` when backend is running.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
