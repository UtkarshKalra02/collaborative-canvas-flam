import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";


// Connect to backend
const socket = io("https://collaborative-canvas-flam-6ie6.onrender.com");

function App() {
  const canvasRef = useRef(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef(null);

  // User state
  const [userColor, setUserColor] = useState("black");
  const [tool, setTool] = useState("brush"); // brush | eraser

  // Remote drawing + cursors
  const remoteLastPointRef = useRef(null);
  const cursorsRef = useRef({});

  const cursorCanvasRef = useRef(null);

  const applyTool = (ctx, tool, color) => {
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 20;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
    }
  };

  const redrawFromOperations = useCallback((operations) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    operations.forEach((stroke) => {
      applyTool(ctx, stroke.tool, stroke.color);

      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    });

    ctx.globalCompositeOperation = "source-over";
  }, []);

  useEffect(() => {
    const cursorCanvas = cursorCanvasRef.current;
    if (!cursorCanvas) return;

    cursorCanvas.width = window.innerWidth;
    cursorCanvas.height = window.innerHeight;
  }, []);

  /**
   * =========================
   * SOCKET SETUP
   * =========================
   */
  useEffect(() => {

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    // Receive assigned color
    socket.on("USER_COLOR", (color) => {
      setUserColor(color);
    });

    // Full canvas sync (late join / undo / redo)
    socket.on("INIT_CANVAS", (operations) => {
      redrawFromOperations(operations);
    });

    // Remote stroke start
    socket.on("STROKE_START", ({ point, color, tool }) => {
      remoteLastPointRef.current = { point, color, tool };
    });

    // Remote stroke move
    socket.on("STROKE_MOVE", ({ point, color, tool }) => {
      const ctx = canvasRef.current.getContext("2d");
      const last = remoteLastPointRef.current;
      if (!last) return;

      applyTool(ctx, tool, color);

      ctx.beginPath();
      ctx.moveTo(last.point.x, last.point.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      remoteLastPointRef.current = { point, color, tool };
    });

    socket.on("STROKE_END", () => {
      remoteLastPointRef.current = null;
    });

    // Cursor updates
    socket.on("CURSOR_MOVE", ({ userId, x, y, color }) => {
      cursorsRef.current[userId] = { x, y, color };
      drawCursors();
    });

    return () => socket.disconnect();
  }, [redrawFromOperations]);

  /**
   * =========================
   * CANVAS INIT
   * =========================
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  /**
   * =========================
   * KEYBOARD SHORTCUTS
   * =========================
   */
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === "z") socket.emit("UNDO");
      if (e.ctrlKey && e.key === "y") socket.emit("REDO");

      if (e.key === "e") setTool("eraser");
      if (e.key === "b") setTool("brush");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /**
   * =========================
   * HELPERS
   * =========================
   */
  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };


  /**
   * =========================
   * LOCAL DRAWING
   * =========================
   */
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const point = getPoint(e);
    lastPointRef.current = point;

    socket.emit("STROKE_START", {
      point,
      tool,
      color: userColor,
    });

  };

  const handleMouseMove = (e) => {
    const point = getPoint(e);

    // Cursor broadcast
    socket.emit("CURSOR_MOVE", { x: point.x, y: point.y });

    if (!isDrawing) return;

    const ctx = canvasRef.current.getContext("2d");
    applyTool(ctx, tool, userColor);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    socket.emit("STROKE_MOVE", { point, tool });
    lastPointRef.current = point;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    socket.emit("STROKE_END");
  };

  /**
   * =========================
   * CANVAS REPLAY
   * =========================
   */


  const drawCursors = () => {
    const canvas = cursorCanvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear cursor layer every time
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    Object.values(cursorsRef.current).forEach(({ x, y, color }) => {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Color Picker UI */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 10,
          background: "white",
          padding: "6px",
          borderRadius: "6px",
          boxShadow: "0 0 5px rgba(0,0,0,0.2)",
        }}
      >
        <input
          type="color"
          value={userColor}
          onChange={(e) => setUserColor(e.target.value)}
          title="Pick brush color"
        />
        <div style={{ fontSize: "12px", marginTop: "4px" }}>
          Tool: {tool}
        </div>
      </div>

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
          cursor: "crosshair",
        }}
      />

      {/* Cursor overlay canvas */}
      <canvas
        ref={cursorCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default App;
