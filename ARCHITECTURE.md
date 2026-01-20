Real-Time Collaborative Drawing Canvas
1. High-Level Architecture

This application is a real-time collaborative drawing system built using a client-server model.

Client: React + HTML Canvas

Server: Node.js + Express + Socket.io

Transport: WebSockets (Socket.io)

The server acts as the single source of truth for canvas state, while clients perform optimistic rendering for low-latency drawing.

User Action
   ↓
Client Canvas (optimistic draw)
   ↓
WebSocket Event
   ↓
Server (authoritative state)
   ↓
Broadcast to other clients
   ↓
Other clients replay stroke

2. Core Design Principles
2.1 Server-Authoritative State

The server maintains the authoritative operation log

Clients never decide global history (undo/redo)

All users remain deterministic and consistent

2.2 Operation-Based Sync (Not Pixels)

We never sync raw pixels

All drawing is represented as stroke operations

Canvas state can be rebuilt at any time by replaying operations

2.3 Optimistic Rendering

The local user draws immediately on the canvas

Server only relays events

This avoids perceptible latency during drawing

3. Data Model
3.1 Stroke Operation

Each stroke is treated as an immutable operation:

Stroke {
  id: number
  color: string
  tool: "brush" | "eraser"
  points: { x: number, y: number }[]
}


color is captured at stroke start

tool determines rendering mode

points are streamed incrementally

4. WebSocket Protocol
4.1 Client → Server Events
Event	Payload	Description
STROKE_START	{ point, tool, color }	Start new stroke
STROKE_MOVE	{ point, tool }	Add point to stroke
STROKE_END	—	End stroke
CURSOR_MOVE	{ x, y }	Cursor position
UNDO	—	Global undo
REDO	—	Global redo
4.2 Server → Client Events
Event	Payload	Description
INIT_CANVAS	Stroke[]	Full canvas state
STROKE_START	{ point, color, tool }	Remote stroke start
STROKE_MOVE	{ point, color, tool }	Remote stroke update
STROKE_END	—	Remote stroke end
CURSOR_MOVE	{ userId, x, y, color }	Remote cursor
5. Canvas Rendering Strategy
5.1 Incremental Drawing

Canvas is not cleared per mouse move

Each mouse movement draws only the new line segment

This avoids unnecessary redraws and improves performance

5.2 Full Redraw (Rare)

Full canvas redraw happens only when:

A user joins late

Global undo is performed

Global redo is performed

Clear canvas → replay operations in order

6. Cursor Rendering (Overlay Canvas)

To prevent cursor artifacts from polluting the drawing:

Two canvas layers are used:

Base canvas → persistent drawing

Overlay canvas → cursors only

The cursor layer is:

Cleared every frame

Marked pointer-events: none

Completely independent of undo/redo

This ensures cursor visuals are ephemeral, not permanent.

7. Undo / Redo Architecture (Global)

Undo and redo are global operations, not per-user.

7.1 Server Data Structures
operations[]  // visible strokes
undoStack[]   // applied strokes
redoStack[]   // undone strokes

7.2 Undo Flow

Remove last stroke from undoStack

Remove it from operations

Push it to redoStack

Broadcast full canvas (INIT_CANVAS)

7.3 Redo Flow

Pop stroke from redoStack

Add it back to operations

Push to undoStack

Broadcast full canvas

Why this works

Deterministic order

No conflicts

All users remain in sync

Undo is allowed across users by design.

8. Eraser Tool Design

The eraser is implemented as a special stroke, not pixel deletion.

Technique Used
globalCompositeOperation = "destination-out"

Benefits

Eraser participates in operation log

Undo/redo works naturally

Late joiners see correct erased state

This avoids special-case logic.

9. Conflict Resolution Strategy

There is no stroke-level conflict resolution.

Reason:

Overlapping strokes are valid

Order is determined by server arrival

Later strokes render on top

This matches real collaborative tools (e.g., Figma, Excalidraw).

10. Performance Considerations

Mouse move events are lightweight

Only point deltas are transmitted

Full redraws are rare

Cursor rendering isolated from drawing logic

This allows smooth drawing even with multiple users.

11. Scalability Discussion (Interview)

To scale beyond a single server:

Use Redis Pub/Sub for Socket.io

Shard rooms across instances

Periodic canvas snapshots + delta replay

Rate-limit cursor events

12. Known Limitations

Canvas state is in-memory (no persistence)

No authentication

No mobile touch optimizations

No shape tools

These were intentionally excluded to focus on real-time correctness.

13. Summary

This system prioritizes:

Deterministic synchronization

Server-authoritative state

Clean undo/redo semantics

Real-time performance

The architecture mirrors how real collaborative drawing tools are designed.
