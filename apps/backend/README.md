# Backend Documentation

## Overview

The backend is a RESTful API built with Express 5 and TypeScript, using MongoDB for data storage and Socket.io for real-time features.

## Architecture

```
backend/src/
├── server.ts              # Entry point - starts the server
├── server/
│   ├── app.ts             # Express app configuration
│   ├── config/
│   │   └── db.ts          # MongoDB connection
│   ├── socket.ts          # Socket.io initialization
│   ├── chat.ts            # Real-time chat logic
│   ├── quizScheduler.ts   # Quiz timing management
│   └── systemScheduler.ts # Background tasks
├── controllers/           # Request handlers
│   ├── auth.controller.ts
│   ├── course.controller.ts
│   ├── quiz.controller.ts
│   ├── attempt.controller.ts
│   ├── note.controller.ts
│   ├── comment.controller.ts
│   ├── chat.controller.ts
│   ├── analytics.controller.ts
│   ├── leaderboard.controller.ts
│   ├── notification.controller.ts
│   ├── admin.controller.ts
│   └── user.controller.ts
├── models/                # Mongoose schemas
│   ├── user.ts
│   ├── course.ts
│   ├── quiz.ts
│   ├── question.ts
│   ├── attempt.ts
│   ├── note.ts
│   ├── comment.ts
│   ├── chat.ts
│   ├── notification.ts
│   ├── enrollment.ts
│   └── activityLog.ts
├── routes/                # API route definitions
│   ├── auth.routes.ts
│   ├── course.routes.ts
│   ├── quiz.routes.ts
│   ├── attempt.routes.ts
│   ├── note.routes.ts
│   ├── comment.routes.ts
│   ├── chat.routes.ts
│   ├── analytics.routes.ts
│   ├── leaderboard.routes.ts
│   ├── notification.routes.ts
│   └── admin.routes.ts
├── middleware/
│   └── auth.ts            # JWT authentication & RBAC
├── services/
│   └── logger.ts          # Logging service
└── types/
    └── authRequest.ts      # TypeScript types
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login user | No |
| GET | /api/auth/me | Get current user | Yes |

### Courses

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/courses | List all courses | Yes |
| POST | /api/courses | Create course | Teacher |
| GET | /api/courses/:id | Get course details | Yes |
| PUT | /api/courses/:id | Update course | Teacher |
| DELETE | /api/courses/:id | Delete course | Teacher |
| POST | /api/courses/join | Join course with code | Student |
| GET | /api/courses/:id/students | List enrolled students | Teacher |

### Quizzes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/quizzes | List quizzes | Yes |
| POST | /api/quizzes | Create quiz | Teacher |
| GET | /api/quizzes/:id | Get quiz details | Yes |
| PUT | /api/quizzes/:id | Update quiz | Teacher |
| DELETE | /api/quizzes/:id | Delete quiz | Teacher |
| POST | /api/quizzes/:id/submit | Submit quiz attempt | Student |
| GET | /api/quizzes/:id/attempts | List quiz attempts | Teacher |

### Questions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/questions | Add question | Teacher |
| PUT | /api/questions/:id | Update question | Teacher |
| DELETE | /api/questions/:id | Delete question | Teacher |

### Attempts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/attempts | List attempts | Yes |
| GET | /api/attempts/:id | Get attempt details | Yes |

### Notes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/notes | List notes | Yes |
| POST | /api/notes | Create note | Teacher |
| GET | /api/notes/:id | Get note | Yes |
| PUT | /api/notes/:id | Update note | Teacher |
| DELETE | /api/notes/:id | Delete note | Teacher |

### Comments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/comments?noteId=... | List comments | Yes |
| POST | /api/comments | Add comment | Student |

### Chat

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/chats?courseId=... | Get chat messages | Yes |
| POST | /api/chats | Send message | Yes |

### Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/analytics/overview | Dashboard overview | Teacher |
| GET | /api/analytics/course/:id | Course analytics | Teacher |

### Leaderboard

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/leaderboard | Get leaderboard | Yes |

### Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/notifications | Get notifications | Yes |
| PUT | /api/notifications/:id/read | Mark as read | Yes |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/admin/users | List all users | Admin |
| DELETE | /api/admin/users/:id | Delete user | Admin |

## Authentication

### JWT Token

The backend uses JWT (JSON Web Tokens) for authentication:

1. **Login**: User provides email/password
2. **Server**: Validates credentials, generates JWT token
3. **Client**: Stores token in localStorage
4. **Subsequent Requests**: Include token in Authorization header

```
Authorization: Bearer <token>
```

### Token Payload
```json
{
  "_id": "user-id",
  "role": "student" | "teacher" | "admin"
}
```

### Token Expiration
- Default: 1 hour (configurable via JWT_LIFETIME)

## Role-Based Access Control (RBAC)

### Middleware Functions

```typescript
// Check if user is authenticated
authMiddleware

// Check user has specific role
requireRole('teacher' | 'student' | 'admin')
```

### Access Rules

| Endpoint | Required Role |
|----------|---------------|
| POST /api/courses | teacher |
| PUT /api/courses/:id | teacher (owner) |
| DELETE /api/courses/:id | teacher (owner) |
| POST /api/quizzes | teacher |
| PUT /api/quizzes/:id | teacher (owner) |
| DELETE /api/quizzes/:id | teacher (owner) |
| POST /api/questions | teacher |
| PUT /api/questions/:id | teacher |
| DELETE /api/questions/:id | teacher |
| POST /api/notes | teacher |
| PUT /api/notes/:id | teacher (owner) |
| DELETE /api/notes/:id | teacher (owner) |
| GET /api/analytics/* | teacher |
| GET /api/admin/* | admin |

## Real-time Features (Socket.io)

### Connection Setup

```typescript
// In socket.ts
const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  // Handle connection
});
```

### Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| join-course | { courseId } | Join course room |
| send-message | { courseId, message } | Send chat message |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| new-quiz | { title, courseTitle } | Quiz published |
| new-note | { title } | Note posted |
| chat-message | { ...message } | New chat message |

### Rooms

- Each course has a Socket.io room: `course:{courseId}`
- Teachers and enrolled students join their course rooms

## Background Tasks

### Quiz Scheduler (quizScheduler.ts)

- Checks for quizzes that should open/close
- Emits notifications when quizzes become available
- Auto-publishes quizzes at openAt time

### System Scheduler (systemScheduler.ts)

- Daily cleanup tasks
- Activity log rotation
- Notification cleanup

## Error Handling

### Error Response Format

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Database

### Connection

```typescript
// In server/config/db.ts
import mongoose from "mongoose";

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};
```

### Indexes

```typescript
// Quiz closes at index for efficient queries
quizSchema.index({ closeAt: 1 });

// User email unique index
userSchema.index({ email: 1 }, { unique: true });

// Course join code unique index
courseSchema.index({ joinCode: 1 }, { unique: true });
```

## Development

### Running in Development

```bash
npm run dev
```

This runs:
1. `npm run clean` - Remove dist folder
2. `npm run build` - Compile TypeScript
3. `node dist/server.js` - Start server

### Building for Production

```bash
npm run build    # Compile TypeScript to dist/
npm run start    # Run compiled JavaScript
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Environment Variables

### Quick Start

```bash
# 1. Copy the example env file
cp .env.example .env

# 2. Generate strong JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Edit .env and paste the generated secrets into JWT_SECRET and JWT_REFRESH_SECRET

# 4. (Optional) Add Gemini API key for AI-powered grading
#    Get one at: https://aistudio.google.com/app/apikey
```

### Variable Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `PORT` | No | Server port | `3000` |
| `MONGODB_URI` | Yes | MongoDB connection string (Atlas or local) | `mongodb://localhost:27017/edubox` |
| `MONGODB_URI_FALLBACK` | No | Fallback MongoDB when primary is unavailable | `mongodb://localhost:27017/edubox` |
| `JWT_SECRET` | Yes | Secret for signing access tokens (generate a strong random string) | — |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens (generate a strong random string) | — |
| `JWT_LIFETIME` | No | Access token expiration duration | `1h` |
| `JWT_REFRESH_LIFETIME` | No | Refresh token expiration duration | `7d` |
| `GEMINI_API_KEY` | No | Google Gemini AI key for auto-grading written answers | — |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL for caching admin analytics | — |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis auth token | — |

### Generating Secrets

```bash
# Generate a cryptographically strong 256-bit secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use OpenSSL
openssl rand -base64 32
```

## Logging

### Logger Service

```typescript
// In services/logger.ts
import logger from "./services/logger";

logger.info("Server started");
logger.error("Database connection failed", error);
```

## Testing

### API Testing

Use tools like Postman or curl:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get courses (with token)
curl -X GET http://localhost:3000/api/courses \
  -H "Authorization: Bearer <token>"
```

## Security Considerations

1. **Password Hashing**: bcrypt with salt factor 10
2. **JWT Secret**: Must be set in environment variables
3. **Input Validation**: All inputs validated server-side
4. **CORS**: Configured to allow frontend origin
5. **No Answer Exposure**: Quiz answers never sent to client before submission