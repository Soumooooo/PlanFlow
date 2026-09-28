# PlanFlow - Collaborative Project Management Tool

PlanFlow is a full-stack, real-time collaborative project management application modeled after Trello and Asana. It provides team workspaces, interactive Kanban boards with 4 workflow stages, task assignment, real-time task discussions, in-app notifications, and instant WebSocket updates.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, WebSocket (`ws`)
- **Database**: SQLite (via `sql.js` WebAssembly with persistent file storage in `./data/kanban.sqlite`)
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing

---

## Features

### 1. Authentication & User Profiles
- User registration and login with encrypted password storage.
- JWT-based authorization protecting all API endpoints and WebSocket channels.
- User profiles with personalized avatar colors.
- Quick 1-click test user switcher on the login screen for testing multi-user collaboration across browser tabs.

### 2. Project Workspaces & Member Management
- Create, view, edit, and delete projects.
- Project ownership and member access controls (only members can access projects; only owners can delete them or manage roles).
- Add or remove existing users from projects with role badges (Owner / Member).
- Automatic notification when added to a project.

### 3. Interactive Kanban Board
- 4 workflow columns: **To Do**, **In Progress**, **Review**, **Done**.
- Native HTML5 Drag-and-Drop to move tasks between columns.
- Quick column dropdown selector on each card for mobile or keyboard accessibility.
- Set priority (Low, Medium, High) with distinct color coding.
- Set due dates with visual overdue alerts.
- Assign tasks to project members with avatar indicators.
- Filter tasks by keyword search, assignee, or priority.

### 4. Real-Time Task Comments & Activity
- Open any task to inspect details and discussion.
- Post comments with markdown or text.
- Authors can edit or delete their own comments.
- Project owners have moderation capabilities.
- Live timestamp and comment counters on task cards.

### 5. In-App Notifications
- Instant alerts when:
  - A task is assigned to you.
  - You are added as a member to a project.
  - A new comment is posted on a task assigned to or created by you.
- Unread counter badges, "Mark all as read" action, and direct navigation to tasks.

### 6. Personal "My Tasks" Dashboard
- View all tasks assigned to the logged-in user across all accessible projects.
- Filter by Project, Column Status, or Priority.
- Quick status updater directly from the table view.

### 7. Overview Dashboard
- High-level project metrics: Total Projects, Assigned Tasks, Upcoming Deadlines, Overall Completion.
- Project progress bars with completed task percentage.
- "Due Soon" feed displaying tasks with deadlines in the next 7 days.
- "Recently Updated Tasks" feed.

### 8. Real-Time WebSocket Updates
- Real-time event broadcasting over `/ws`.
- When a teammate creates, edits, moves, or deletes a task, changes appear immediately on all active screens without refreshing.
- Instant comment additions and member changes broadcast to project viewers.
- In-app toast banners notify users of incoming assignments or mentions in real-time.

---

## Project Structure

```
├── server.ts                       # Express + Vite middleware + WebSocket server
├── src/
│   ├── server/
│   │   ├── db.ts                   # SQLite schema, queries, and seed data
│   │   ├── websocket.ts            # WebSocket manager & room broadcasting
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT authentication middleware
│   │   └── routes/
│   │       ├── auth.ts             # Register, login, profile routes
│   │       ├── users.ts            # User list for member assignment
│   │       ├── projects.ts         # Project CRUD and member routes
│   │       ├── tasks.ts            # Task CRUD, move status, and My Tasks
│   │       ├── comments.ts         # Task comment CRUD routes
│   │       ├── notifications.ts    # In-app notifications endpoints
│   │       └── dashboard.ts        # Dashboard metrics and aggregations
│   ├── components/
│   │   ├── auth/AuthPage.tsx       # Sign in & registration view
│   │   ├── layout/                 # Sidebar and Navbar components
│   │   ├── dashboard/              # Dashboard overview view
│   │   ├── kanban/                 # KanbanBoard component
│   │   ├── projects/               # Projects view & project modals
│   │   ├── tasks/                  # TaskDetailModal, CreateTaskModal, MyTasksView
│   │   ├── notifications/          # NotificationsView
│   │   └── common/                 # UserAvatar, ToastContainer
│   ├── context/
│   │   ├── AuthContext.tsx         # User authentication state
│   │   ├── WebSocketContext.tsx    # Live WebSocket connection & events
│   │   └── NotificationContext.tsx # Notification alerts & toast state
│   ├── lib/api.ts                  # Typed REST API client
│   ├── types/index.ts              # TypeScript domain types
│   ├── App.tsx                     # Main application container
│   ├── main.tsx                    # Client entry point
│   └── index.css                   # Tailwind CSS styling
├── data/
│   └── kanban.sqlite               # Persistent SQLite database file
├── .env.example                    # Environment variable template
└── package.json                    # Dependencies and run scripts
```

---

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure the following variables are configured (defaults are provided for development):
```env
PORT=3000
JWT_SECRET=planflow_dev_super_secret_jwt_key_2026
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```

The application will start on `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Demo Accounts

The database comes pre-seeded with sample projects, tasks across all 4 columns, and 3 demo team members:

| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | `alex@planflow.io` | `password123` | Product Lead |
| **Sarah Chen** | `sarah@planflow.io` | `password123` | Senior Engineer |
| **David Kim** | `david@planflow.io` | `password123` | UI/UX Designer |

*Tip: Open two browser windows or an incognito tab to log in as different users and see real-time Kanban moves and comments update instantaneously!*
