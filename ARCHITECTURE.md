# ARCHITECTURE.md  
## Real-Time Collaborative Drawing Canvas

---

## 1. Overview

This project is a **real-time collaborative drawing application** where multiple users can draw simultaneously on a shared canvas with live synchronization.

The system is designed around **operation-based state synchronization**, where drawing actions are represented as strokes rather than pixels. The server maintains the authoritative canvas state and ensures consistency across all clients.

---

## 2. Tech Stack

### Frontend
- React (functional components + hooks)
- HTML Canvas API
- Socket.io Client

### Backend
- Node.js
- Express
- Socket.io (WebSockets)

### Communication
- WebSocket-based, event-driven protocol

---

## 3. High-Level Architecture

User Input (Mouse / Keyboard)
↓
Client Canvas (Optimistic Draw)
↓
WebSocket Event (Stroke / Cursor)
↓
Server (Authoritative State)
↓
Broadcast to Other Clients
↓
Clients Replay Stroke Incrementally


### Key Design Choice
- **Client draws optimistically** for zero latency
- **Server owns history** to guarantee determinism

---

## 4. Core Design Principles

### 4.1 Server-Authoritative State
- The server is the single source of truth
- Clients never decide global canvas history
- Prevents divergence and conflict

### 4.2 Operation-Based Synchronization
- No pixel data is synced
- Canvas state is rebuilt from stroke operations
- Enables undo/redo and late join synchronization

### 4.3 Deterministic Rendering
- All clients replay strokes in the same order
- Order is defined by server event sequence

---

## 5. Data Model

### 5.1 Stroke Operation

Each stroke is an immutable operation:

```ts
Stroke {
  id: number
  color: string
  tool: "brush" | "eraser"
  points: { x: number, y: number }[]
}
```

**6. WebSocket Protocol**

**6.1 Client -> Server WebSocket Events**
| Event Name       | Payload                          | Description                         |
|------------------|----------------------------------|-------------------------------------|
| STROKE_START     | { point, tool, color }           | Start a new stroke                  |
| STROKE_MOVE      | { point, tool }                  | Stream stroke points in real time   |
| STROKE_END       | —                                | End the current stroke              |
| CURSOR_MOVE      | { x, y }                         | Send live cursor position           |
| UNDO             | —                                | Undo last global stroke             |
| REDO             | —                                | Redo last undone stroke             |

**6.2 Server → Client WebSocket Events**
| Event Name       | Payload                          | Description                         |
|------------------|----------------------------------|-------------------------------------|
| INIT_CANVAS      | Stroke[]                         | Full canvas state sync              |
| STROKE_START     | { point, color, tool }           | Remote stroke started               |
| STROKE_MOVE      | { point, color, tool }           | Remote stroke update                |
| STROKE_END       | —                                | Remote stroke ended                 |
| CURSOR_MOVE      | { userId, x, y, color }          | Remote user cursor position         |

**7. Canvas Rendering Strategy**
**7.1 Incremental Drawing (Normal Case)**

-Canvas is not cleared on every mouse move
-Only the new line segment is drawn
-Ensures smooth performance

**7.2 Full Canvas Rebuild (Rare Case)**
Triggered only on:

-Late join
-Undo
-Redo

Process: Clear canvas → Replay all stroke operations

**8. Cursor Rendering (Overlay Canvas)**
To avoid polluting the drawing canvas:
-Two canvas layers are used:
   Base canvas → persistent drawing
   Overlay canvas → cursors only

The cursor canvas:
-Is cleared every update
-Uses pointer-events: none
-Does not affect undo/redo or replay

**9. Undo / Redo Architecture (Global)**
Undo and redo are global operations, not per-user.

**9.1 Server Data Structures**
operations[]  // visible strokes
undoStack[]   // applied strokes
redoStack[]   // undone strokes

**9.2 Undo Flow**
1. Pop last stroke from undoStack
2. Remove it from operations
3. Push it to redoStack
4. Broadcast full canvas (INIT_CANVAS)

**9.3 Redo Flow**
1. Pop stroke from redoStack
2. Add it back to operations
3. Push to undoStack   
4. Broadcast full canvas

**Why This Works**
-Deterministic ordering
-No conflicts
-All clients remain consistent
Undo is intentionally allowed across users.

**10. Conflict Resolution Strategy**
No explicit conflict resolution is required.

-Overlapping strokes are valid
-Server arrival order defines layering
-Later strokes render on top

This matches behavior of real collaborative tools.

**11. Performance Considerations**

-Lightweight point-based events
-No full redraw during drawing
-Cursor rendering isolated from drawing logic
-Minimal server-side computation

**12. Summary**
This system prioritizes:

-Deterministic synchronization
-Server-authoritative state
-Clean undo/redo semantics
-Real-time performance

The architecture mirrors how real collaborative drawing tools are designed.
