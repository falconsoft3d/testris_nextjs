"use client";

import { useEffect, useRef, useState } from "react";

export default function TetrisGame() {
  const gameCanvasRef = useRef(null);
  const nextCanvasRef = useRef(null);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const apiRef = useRef({});

  useEffect(() => {
    const canvas = gameCanvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!canvas || !nextCanvas) return;

    const ctx = canvas.getContext("2d");
    const nextCtx = nextCanvas.getContext("2d");

    // Constantes
    const COLS = 10;
    const ROWS = 20;
    const TILE = 30;

    const COLORS = {
      I: "#00f0f0",
      J: "#1a65ff",
      L: "#ff8c1a",
      O: "#ffdb4d",
      S: "#33cc33",
      T: "#bf5fff",
      Z: "#ff4d4d",
      GHOST: "rgba(255,255,255,0.15)",
    };

    const SHAPES = {
      I: [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      J: [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      L: [
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      O: [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      S: [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
      T: [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      Z: [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
      ],
    };

    const PIECES = Object.keys(SHAPES);

    const state = {
      grid: createGrid(ROWS, COLS),
      current: null,
      next: null,
      score: 0,
      lines: 0,
      level: 1,
      dropIntervalMs: 1000,
      isPaused: false,
      isRunning: false,
      lastDropTime: 0,
      manualLevelOverride: false,
      initialLevelAtStart: 1,
      rafId: null,
    };

    function createGrid(rows, cols) {
      const g = new Array(rows);
      for (let r = 0; r < rows; r++) g[r] = new Array(cols).fill(null);
      return g;
    }

    function levelToInterval(lv) {
      return Math.max(80, 1000 - (lv - 1) * 80);
    }

    function updateHUDReact() {
      setScore(state.score);
      setLines(state.lines);
      setLevel(state.level);
      setIsRunning(state.isRunning);
      setIsPaused(state.isPaused);
    }

    function drawCellOn(context, x, y, size, baseColor) {
      context.fillStyle = baseColor;
      context.fillRect(x, y, size, size);

      const grd = context.createLinearGradient(x, y, x, y + size);
      grd.addColorStop(0, "rgba(255,255,255,0.25)");
      grd.addColorStop(0.5, "rgba(255,255,255,0.05)");
      grd.addColorStop(1, "rgba(0,0,0,0.25)");
      context.fillStyle = grd;
      context.fillRect(x, y, size, size);

      context.strokeStyle = "rgba(255,255,255,0.15)";
      context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    }

    function drawCell(col, row, color) {
      const x = col * TILE;
      const y = row * TILE;
      drawCellOn(ctx, x, y, TILE, color);
    }

    function drawBoard() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0a0c14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE, 0);
        ctx.lineTo(x * TILE, ROWS * TILE);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE);
        ctx.lineTo(COLS * TILE, y * TILE);
        ctx.stroke();
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = state.grid[r][c];
          if (cell) drawCell(c, r, cell);
        }
      }
    }

    function drawNextPreview(piece) {
      nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      nextCtx.fillStyle = "#0a0c14";
      nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
      if (!piece) return;
      const cells = piece.blocks;
      const minX = Math.min(...cells.map((b) => b.x));
      const maxX = Math.max(...cells.map((b) => b.x));
      const minY = Math.min(...cells.map((b) => b.y));
      const maxY = Math.max(...cells.map((b) => b.y));
      const w = (maxX - minX + 1) * 24;
      const h = (maxY - minY + 1) * 24;
      const offsetX = Math.floor((nextCanvas.width - w) / 2) - minX * 24;
      const offsetY = Math.floor((nextCanvas.height - h) / 2) - minY * 24;
      for (const b of cells) {
        drawCellOn(nextCtx, b.x * 24 + offsetX, b.y * 24 + offsetY, 24, piece.color);
      }
    }

    function randomPiece() {
      const type = PIECES[Math.floor(Math.random() * PIECES.length)];
      const blocks = SHAPES[type].map(([x, y]) => ({ x, y }));
      return { type, blocks, x: 3, y: 0, rotation: 0, color: COLORS[type] };
    }

    function isValidPosition(piece, newX, newY) {
      for (const b of piece.blocks) {
        const x = newX + b.x;
        const y = newY + b.y;
        if (x < 0 || x >= COLS || y >= ROWS) return false;
        if (y < 0) continue;
        if (state.grid[y][x]) return false;
      }
      return true;
    }

    function tryMove(dx, dy) {
      if (isValidPosition(state.current, state.current.x + dx, state.current.y + dy)) {
        state.current.x += dx;
        state.current.y += dy;
        return true;
      }
      return false;
    }

    function move(dx, dy) {
      tryMove(dx, dy);
    }

    function rotateBlocks(blocks, dir) {
      return blocks.map((b) => (dir === 1 ? { x: b.y, y: -b.x } : { x: -b.y, y: b.x }));
    }

    function rotate(dir) {
      const rotated = rotateBlocks(state.current.blocks, dir);
      const oldBlocks = state.current.blocks;
      state.current.blocks = rotated;
      const kicks = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
      ];
      for (const k of kicks) {
        if (isValidPosition(state.current, state.current.x + k.x, state.current.y + k.y)) {
          state.current.x += k.x;
          state.current.y += k.y;
          return;
        }
      }
      state.current.blocks = oldBlocks;
    }

    function getGhostY() {
      const p = JSON.parse(JSON.stringify(state.current));
      while (isValidPosition(p, p.x, p.y + 1)) p.y++;
      return p.y;
    }

    function drawGhost() {
      if (!state.current) return;
      const gy = getGhostY();
      ctx.save();
      for (const b of state.current.blocks) {
        drawCellOn(ctx, (state.current.x + b.x) * TILE, (gy + b.y) * TILE, TILE, COLORS.GHOST);
      }
      ctx.restore();
    }

    function lockPiece() {
      for (const b of state.current.blocks) {
        const x = state.current.x + b.x;
        const y = state.current.y + b.y;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) state.grid[y][x] = state.current.color;
      }
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (state.grid[r].every((cell) => cell !== null)) {
          state.grid.splice(r, 1);
          state.grid.unshift(new Array(COLS).fill(null));
          cleared++;
          r++;
        }
      }
      state.lines += cleared;
      return cleared;
    }

    function addScoreForLines(cleared) {
      const base = [0, 100, 300, 500, 800];
      state.score += base[cleared] * state.level;
    }

    function updateLevel() {
      if (state.manualLevelOverride) return;
      const base = state.initialLevelAtStart || 1;
      const target = base + Math.floor(state.lines / 10);
      if (target !== state.level) {
        state.level = target;
        state.dropIntervalMs = levelToInterval(state.level);
      }
    }

    function isTopBlocked() {
      return state.grid[0].some((c) => c !== null);
    }

    function gameOver() {
      state.isRunning = false;
      updateHUDReact();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = "16px Nunito, sans-serif";
      ctx.fillText("Presiona Reiniciar (R) para jugar de nuevo", canvas.width / 2, canvas.height / 2 + 20);
    }

    function spawnPiece() {
      state.current = state.next || randomPiece();
      state.current.x = 3;
      state.current.y = 0;
      state.next = randomPiece();
      drawNextPreview(state.next);
    }

    function softDrop() {
      if (tryMove(0, 1)) {
        state.score += 1;
      }
    }

    function hardDrop() {
      let dropped = 0;
      while (tryMove(0, 1)) dropped++;
      state.score += dropped * 2;
      lockPiece();
      const cleared = clearLines();
      if (cleared > 0) {
        addScoreForLines(cleared);
        updateLevel();
      }
      if (isTopBlocked()) {
        gameOver();
        return;
      }
      spawnPiece();
    }

    function drawPiece(piece) {
      if (!piece) return;
      for (const b of piece.blocks) {
        const x = piece.x + b.x;
        const y = piece.y + b.y;
        if (y >= 0) drawCell(x, y, piece.color);
      }
    }

    function updateHUD() {
      updateHUDReact();
    }

    function gameLoop(now) {
      if (!state.isRunning || state.isPaused) return;
      const elapsed = now - state.lastDropTime;
      if (elapsed >= state.dropIntervalMs) {
        if (!tryMove(0, 1)) {
          lockPiece();
          const cleared = clearLines();
          if (cleared > 0) {
            addScoreForLines(cleared);
            updateLevel();
          }
          if (isTopBlocked()) {
            gameOver();
            return;
          }
          spawnPiece();
        }
        state.lastDropTime = now;
      }
      drawBoard();
      drawGhost();
      drawPiece(state.current);
      state.rafId = requestAnimationFrame(gameLoop);
      updateHUD();
    }

    function startGame() {
      if (state.isRunning) return;
      state.isRunning = true;
      state.isPaused = false;
      if (!state.next) state.next = randomPiece();
      const initialLevel = state.level || 1;
      state.level = initialLevel;
      state.dropIntervalMs = levelToInterval(state.level);
      state.initialLevelAtStart = state.level;
      state.manualLevelOverride = false;
      spawnPiece();
      state.lastDropTime = performance.now();
      updateHUD();
      state.rafId = requestAnimationFrame(gameLoop);
    }

    function togglePause() {
      if (!state.isRunning) return;
      state.isPaused = !state.isPaused;
      updateHUD();
      if (!state.isPaused) {
        state.lastDropTime = performance.now();
        state.rafId = requestAnimationFrame(gameLoop);
      }
    }

    function resetGame(keepRunning = false) {
      state.grid = createGrid(ROWS, COLS);
      state.score = 0;
      state.lines = 0;
      state.level = Math.max(1, Math.min(99, state.level));
      state.dropIntervalMs = levelToInterval(state.level);
      state.isPaused = false;
      state.isRunning = false;
      state.current = null;
      state.next = null;
      state.manualLevelOverride = false;
      state.initialLevelAtStart = state.level;
      drawBoard();
      drawNextPreview(null);
      updateHUD();
      if (keepRunning) startGame();
    }

    function setLevelFromSlider(lv) {
      state.level = Math.max(1, Math.min(99, lv));
      state.dropIntervalMs = levelToInterval(state.level);
      if (state.isRunning) state.manualLevelOverride = true;
      updateHUD();
    }

    function handleKeydown(e) {
      if (!state.isRunning || state.isPaused) return;
      switch (e.key) {
        case "ArrowLeft":
          move(-1, 0);
          break;
        case "ArrowRight":
          move(1, 0);
          break;
        case "ArrowDown":
          softDrop();
          updateHUD();
          break;
        case "ArrowUp":
        case "x":
        case "X":
          rotate(1);
          break;
        case "z":
        case "Z":
          rotate(-1);
          break;
        case " ":
          hardDrop();
          updateHUD();
          break;
        case "p":
        case "P":
          togglePause();
          break;
        case "r":
        case "R":
          resetGame(true);
          break;
      }
    }

    // API pública hacia React
    apiRef.current.startGame = startGame;
    apiRef.current.togglePause = togglePause;
    apiRef.current.resetAndStart = () => resetGame(true);
    apiRef.current.setLevelFromSlider = setLevelFromSlider;

    // Inicialización visual
    drawBoard();
    drawNextPreview(null);
    updateHUD();

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      if (state.rafId) cancelAnimationFrame(state.rafId);
    };
  }, []);

  return (
    <div className="app">
      <div className="panel-izq">
        <canvas ref={gameCanvasRef} id="gameCanvas" width={300} height={600} aria-label="Juego Tetris" />
      </div>
      <div className="panel-der">
        <h1>Tetris</h1>
        <div className="indicadores">
          <div className="indicador">
            <span>Score</span>
            <strong id="score">{score}</strong>
          </div>
          <div className="indicador">
            <span>Líneas</span>
            <strong id="lines">{lines}</strong>
          </div>
          <div className="indicador">
            <span>Nivel</span>
            <strong id="level">{level}</strong>
          </div>
        </div>

        <div className="ajustes">
          <label htmlFor="levelSlider">
            Nivel inicial: <strong id="levelSelected">{level}</strong>
          </label>
          <input
            id="levelSlider"
            type="range"
            min={1}
            max={15}
            step={1}
            value={level}
            onChange={(e) => {
              const lv = parseInt(e.target.value, 10) || 1;
              setLevel(lv);
              apiRef.current.setLevelFromSlider?.(lv);
            }}
          />
        </div>

        <div className="siguiente">
          <span>Siguiente</span>
          <canvas ref={nextCanvasRef} id="nextCanvas" width={120} height={120} aria-label="Siguiente pieza" />
        </div>

        <div className="controles">
          <button className="btn primario" onClick={() => apiRef.current.startGame?.()}>Jugar</button>
          <button className="btn" onClick={() => apiRef.current.togglePause?.()}>{isPaused ? "Reanudar" : "Pausar"}</button>
          <button className="btn" onClick={() => apiRef.current.resetAndStart?.()}>Reiniciar</button>
        </div>

        <div className="ayuda">
          <h2>Controles</h2>
          <ul>
            <li>⭠ / ⭢: Mover</li>
            <li>⭣: Caída suave</li>
            <li>⭡ o X: Rotar</li>
            <li>Z: Rotar inverso</li>
            <li>Espacio: Caída dura</li>
            <li>P: Pausa</li>
            <li>R: Reiniciar</li>
          </ul>
        </div>

        <p className="nota">Portado a Next.js (React + Canvas)</p>
      </div>
    </div>
  );
} 