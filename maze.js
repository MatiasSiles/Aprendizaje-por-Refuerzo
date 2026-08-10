/* ==========================================================================
   maze.js
   ¿Qué problema resuelve? Guarda y dibuja el "mundo" donde vive el agente:
   una grilla de 10x10 con paredes, trampas, un inicio y una meta. También
   permite que el visitante lo edite tocando/clickeando celdas, y valida
   que el laberinto tenga sentido antes de entrenar.
   ========================================================================== */

const GRID_SIZE = 10;

// Tipos de celda posibles. 'empty' es el valor por defecto.
const CELL = {
  EMPTY: 'empty',
  WALL: 'wall',
  TRAP: 'trap',
};

const Maze = {
  grid: [],                 // grid[y][x] = CELL.*
  startPos: { x: 0, y: 0 },
  goalPos: { x: 9, y: 9 },
  cellEls: [],              // referencia a los <div> de cada celda, para actualizar rápido
  editable: true,

  // Crea un laberinto vacío con inicio y meta en esquinas opuestas.
  reset() {
    this.grid = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => CELL.EMPTY)
    );
    this.startPos = { x: 0, y: 0 };
    this.goalPos = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
  },

  isInBounds(x, y) {
    return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
  },

  isWall(x, y) {
    if (!this.isInBounds(x, y)) return true; // fuera del mapa = pared
    return this.grid[y][x] === CELL.WALL;
  },

  isTrap(x, y) {
    return this.isInBounds(x, y) && this.grid[y][x] === CELL.TRAP;
  },

  isStart(x, y) {
    return this.startPos.x === x && this.startPos.y === y;
  },

  isGoal(x, y) {
    return this.goalPos.x === x && this.goalPos.y === y;
  },

  // Coloca una herramienta del editor en una celda, respetando las reglas:
  // - agente y meta son únicos en todo el mapa.
  // - no se puede poner pared/trampa encima del agente o la meta.
  setCell(x, y, tool) {
    if (!this.isInBounds(x, y)) return;

    if (tool === 'agent') {
      this.startPos = { x, y };
      if (this.grid[y][x] !== CELL.EMPTY) this.grid[y][x] = CELL.EMPTY;
      return;
    }
    if (tool === 'goal') {
      this.goalPos = { x, y };
      if (this.grid[y][x] !== CELL.EMPTY) this.grid[y][x] = CELL.EMPTY;
      return;
    }
    // No dejamos tapar el inicio o la meta con pared/trampa.
    if (this.isStart(x, y) || this.isGoal(x, y)) return;

    if (tool === 'wall') this.grid[y][x] = CELL.WALL;
    else if (tool === 'trap') this.grid[y][x] = CELL.TRAP;
    else if (tool === 'erase') this.grid[y][x] = CELL.EMPTY;
  },

  // Recorrido en anchura (BFS) para comprobar que existe al menos un
  // camino entre el inicio y la meta (las trampas se pueden pisar).
  hasPath() {
    const visited = new Set();
    const queue = [this.startPos];
    visited.add(`${this.startPos.x},${this.startPos.y}`);
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (queue.length) {
      const { x, y } = queue.shift();
      if (x === this.goalPos.x && y === this.goalPos.y) return true;

      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (this.isInBounds(nx, ny) && !this.isWall(nx, ny) && !visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  },

  // Valida el laberinto completo. Devuelve { valid, message }.
  validate() {
    if (this.startPos.x === this.goalPos.x && this.startPos.y === this.goalPos.y) {
      return { valid: false, message: 'El agente y la meta no pueden estar en el mismo lugar.' };
    }
    if (!this.hasPath()) {
      return { valid: false, message: 'El agente no puede llegar a la meta. Modificá algunas paredes.' };
    }
    return { valid: true, message: 'Laberinto válido ✓' };
  },

  // Construye el DOM del tablero una sola vez.
  buildDOM(container) {
    container.innerHTML = '';
    this.cellEls = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell editable';
        cell.dataset.x = x;
        cell.dataset.y = y;
        container.appendChild(cell);
        row.push(cell);
      }
      this.cellEls.push(row);
    }
  },

  // Vuelve a pintar todas las celdas según el estado actual del laberinto.
  // Se usa poco (al entrar/salir de edición); durante el entrenamiento
  // sólo movemos al agente con updateAgentCell para que rinda mejor.
  render(agentPos) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const el = this.cellEls[y][x];
        el.className = 'cell';
        if (this.editable) el.classList.add('editable');

        const type = this.grid[y][x];
        if (type === CELL.WALL) el.classList.add('cell-wall');
        if (type === CELL.TRAP) el.classList.add('cell-trap');
        if (this.isStart(x, y)) el.classList.add('cell-start');
        if (this.isGoal(x, y)) el.classList.add('cell-goal');
        if (agentPos && agentPos.x === x && agentPos.y === y) el.classList.add('cell-agent');
      }
    }
  },

  // Mueve solamente la marca visual del agente entre dos celdas (rápido).
  updateAgentCell(prevPos, newPos) {
    if (prevPos) this.cellEls[prevPos.y][prevPos.x].classList.remove('cell-agent');
    this.cellEls[newPos.y][newPos.x].classList.add('cell-agent');
  },

  // Dibuja (o borra) flechitas semitransparentes con la mejor acción
  // aprendida para cada celda, según la tabla Q.
  renderBestActionArrows(qTable, show) {
    const arrows = ['↑', '↓', '←', '→'];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const el = this.cellEls[y][x];
        const existing = el.querySelector('.cell-best-arrow');
        if (existing) existing.remove();

        if (!show) continue;
        if (this.isWall(x, y) || this.isGoal(x, y) || this.isTrap(x, y)) continue;

        const key = `${x},${y}`;
        const qs = qTable[key];
        if (!qs) continue;
        const max = Math.max(...qs);
        if (max <= 0) continue; // todavía no aprendió nada útil acá

        const bestIdx = qs.indexOf(max);
        const arrowEl = document.createElement('span');
        arrowEl.className = 'cell-best-arrow';
        arrowEl.textContent = arrows[bestIdx];
        el.appendChild(arrowEl);
      }
    }
  },
};
