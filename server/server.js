/**
 * SERVER: Express + Socket.io
 * Authoritative canvas state + undo/redo
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

/**
 * =========================
 * GLOBAL STATE
 * =========================
 */
const operations = [];
const undoStack = [];
const redoStack = [];

const COLORS = ["red", "blue", "green", "purple", "orange", "brown"];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // Assign color
  socket.userColor = randomColor();
  socket.emit("USER_COLOR", socket.userColor);

  // Send full canvas
  socket.emit("INIT_CANVAS", operations);

  /**
   * =========================
   * STROKES
   * =========================
   */
  socket.on("STROKE_START", ({ point, tool, color }) => {
    const stroke = {
      id: Date.now() + Math.random(),
      color,
      tool,
      points: [point],
    };
  
    socket.currentStroke = stroke;
  
    operations.push(stroke);
    undoStack.push(stroke);
    redoStack.length = 0;
  
    socket.broadcast.emit("STROKE_START", {
      point,
      color,
      tool,
    });
  });
  

  socket.on("STROKE_MOVE", ({ point, tool }) => {
    if (!socket.currentStroke) return;

    socket.currentStroke.points.push(point);

    socket.broadcast.emit("STROKE_MOVE", {
        point,
        color: socket.currentStroke.color,
        tool,
      });      
  });

  socket.on("STROKE_END", () => {
    socket.currentStroke = null;
    socket.broadcast.emit("STROKE_END");
  });

  /**
   * =========================
   * CURSORS
   * =========================
   */
  socket.on("CURSOR_MOVE", ({ x, y }) => {
    socket.broadcast.emit("CURSOR_MOVE", {
      userId: socket.id,
      x,
      y,
      color: socket.userColor,
    });
  });

  /**
   * =========================
   * UNDO / REDO
   * =========================
   */
  socket.on("UNDO", () => {
    if (!undoStack.length) return;

    const stroke = undoStack.pop();
    const idx = operations.findIndex((s) => s.id === stroke.id);
    if (idx !== -1) operations.splice(idx, 1);

    redoStack.push(stroke);
    io.emit("INIT_CANVAS", operations);
  });

  socket.on("REDO", () => {
    if (!redoStack.length) return;

    const stroke = redoStack.pop();
    operations.push(stroke);
    undoStack.push(stroke);

    io.emit("INIT_CANVAS", operations);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
