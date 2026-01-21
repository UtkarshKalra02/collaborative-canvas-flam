# README.md

## Real-Time Collaborative Drawing Canvas
A real-time, multi-user drawing application where multiple users can draw simultaneously on a shared canvas with live synchronization, global undo/redo, user-selected colors, eraser support, and live cursors.

This project focuses on real-time system design, deterministic state synchronization, and correct WebSocket architecture, rather than UI polish.

---

## Live Demo
- Frontend: https://collaborative-canvas-flam-lemon.vercel.app/
- Backend: https://collaborative-canvas-flam-6ie6.onrender.com

---

## Features

### Core Features
- Real-time collaborative drawing
- Multiple users drawing simultaneously
- User-selected stroke colors
- Live cursor indicators
- Global undo / redo (shared across all users)
- Late-join synchronization (new users see existing canvas)

### Technical Highlights
- Server-authoritative canvas state
- Operation-based synchronization (strokes, not pixels)
- Optimistic client-side rendering
- Deterministic canvas reconstruction

---

## Tech Stack

### Frontend
- React (Hooks)
- HTML Canvas API
- Socket.io Client

### Backend
- Node.js
- Express
- Socket.io (WebSockets)

### Deployment
- Frontend: **Vercel**
- Backend: **Render**

---

## Project Structure
# Project Structure

```text
collaborative-canvas/
├── client/
│   └── cc/
│       ├── src/
│       │   ├── App.js           # Main React canvas + socket logic
│       │   ├── index.js         # React entry point
│       │   └── index.css        # Global styles (optional)
│       ├── public/
│       │   └── index.html       # HTML template
│       ├── package.json         # Client dependencies & scripts
│       └── package-lock.json
├── server/
│   ├── server.js                # Express + Socket.io server
│   ├── package.json             # Server dependencies & scripts
│   └── package-lock.json
├── ARCHITECTURE.md              # System design & data flow
├── README.md                    # Setup, usage & demo instructions
├── .gitignore                   # Git ignored files
└── .env                         # Environment variables (optional)
```

## Architecture Overview
- Drawing actions are stored as stroke operations
- Server maintains the authoritative operation log
- Clients render optimistically for zero-latency drawing
- Undo/redo is handled globally on the server
- Canvas state can be rebuilt at any time by replaying operations

## How to Run Locally

### Prerequisites
- Node.js (v16+)
- npm

### Clone the Repository
```txt
git clone https://github.com/utkarshkalra02/collaborative-canvas-flam.git
cd collaborative-canvas
```

### Start the Backend
```txt
cd server
npm install
npm start
```

Server Runs on: 
http://localhost:3000

### Start the Frontend

Open a new terminal:
```txt
cd client/cc
npm install
npm start
```

Frontend runs on: http://localhost:3001

---

## Testing Multi-User Functionality

- Open the app in two or more browser tabs
- Draw in one tab
- Observe live drawing in other tabs
- Draw simultaneously from multiple tabs

### Controls
- Brush: **B**
- Eraser: **E**
- Undo: **Ctrl + Z**
- Redo: **Ctrl + Y**
- Color Picker: **Top-left UI**

Undo/redo affects all users globally.

## Known Limitations
- Canvas state is stored in memory (no persistence)
- No authentication or user accounts
- Desktop-first (limited mobile support)
- No shapes or text tools

These were intentionally excluded to focus on real-time correctness.

## Time Spent
Approximately 10 hours, focused on:

- Real-time WebSocket architecture
- Deterministic state synchronization
- Global undo/redo
- Multi-user correctness
- Production-safe React hooks

## Future Improvements

- Canvas persistence (snapshots + replay)
- Room-based canvases
- Mobile touch support
- Shape and text tools
- Authentication

## Final Notes

This project demonstrates:

- Real-time system design
- Collaborative state synchronization
- Clean React architecture
- Interview-ready engineering decisions
