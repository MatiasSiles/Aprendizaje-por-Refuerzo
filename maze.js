/* ==========================================================================
   maze.js
   ¿Qué problema resuelve? Guarda y dibuja el "mundo" donde vive el agente:
   una grilla de 10x10 con paredes, trampas, un inicio y una meta. También
   permite que el visitante lo edite tocando/clickeando celdas, y valida
   que el laberinto tenga sentido antes de entrenar.
   ========================================================================== 

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
  agentCount: 1,
  visibleAgents: [],

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

  // Recorrido en anchura (BFS) para comprobar que existe un camino seguro
  // entre el inicio y la meta, sin atravesar paredes ni trampas.
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
        if (
          this.isInBounds(nx, ny) &&
          !this.isWall(nx, ny) &&
          !this.isTrap(nx, ny) &&
          !visited.has(key)
        ) {
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

  getVisibleAgentPositions(basePos = this.startPos) {
    const positions = [];
    const count = Math.max(0, Math.min(8, Number(this.agentCount) || 1));

    if (count === 0) return [];
    if (count === 1) return [{ x: basePos.x, y: basePos.y }];

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = basePos.x + (col - 1);
      const y = basePos.y + (row - 1);

      if (!this.isInBounds(x, y)) continue;
      if (this.isWall(x, y)) continue;
      if (this.isGoal(x, y) || this.isTrap(x, y)) continue;
      positions.push({ x, y });
    }

    if (!positions.length) {
      positions.push({ x: basePos.x, y: basePos.y });
    }

    return positions;
  },

  setAgentCount(count) {
    this.agentCount = Math.max(0, Math.min(8, Number(count) || 1));
    this.visibleAgents = this.getVisibleAgentPositions(this.startPos);
  },

  // Vuelve a pintar todas las celdas según el estado actual del laberinto.
  render(agentPos) {
    const visualAgents = this.getVisibleAgentPositions(agentPos || this.startPos);
    this.visibleAgents = visualAgents;

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

        const hasAgent = visualAgents.some((pos) => pos.x === x && pos.y === y);
        if (hasAgent) el.classList.add('cell-agent');
      }
    }
  },

  // Mueve solamente la marca visual del agente entre dos celdas (rápido).
  updateAgentCell(prevPos, newPos) {
    if (prevPos) {
      const prevAgents = this.getVisibleAgentPositions(prevPos);
      prevAgents.forEach(({ x, y }) => {
        if (this.cellEls[y] && this.cellEls[y][x]) this.cellEls[y][x].classList.remove('cell-agent');
      });
    }

    const nextAgents = this.getVisibleAgentPositions(newPos);
    nextAgents.forEach(({ x, y }) => {
      if (this.cellEls[y] && this.cellEls[y][x]) this.cellEls[y][x].classList.add('cell-agent');
    });
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
}; */

/* ==========================================================================
   maze.js
   Mundo y renderizado del laberinto.
   ========================================================================== */

const GRID_SIZE = 10;

const CELL = {
  EMPTY: 'empty',
  WALL: 'wall',
  TRAP: 'trap',
};


const Maze = {

  grid: [],

  startPos: { x: 0, y: 0 },

  goalPos: { x: 9, y: 9 },

  cellEls: [],

  editable: true,

  agentCount: 1,

  visibleAgents: [],


  reset() {

    this.grid = Array.from(
      { length: GRID_SIZE },
      () =>
        Array.from(
          { length: GRID_SIZE },
          () => CELL.EMPTY
        )
    );

    this.startPos = { x: 0, y: 0 };

    this.goalPos = {
      x: GRID_SIZE - 1,
      y: GRID_SIZE - 1
    };

    this.visibleAgents = [];
  },


  isInBounds(x, y) {
    return (
      x >= 0 &&
      y >= 0 &&
      x < GRID_SIZE &&
      y < GRID_SIZE
    );
  },


  isWall(x, y) {

    if (!this.isInBounds(x, y)) {
      return true;
    }

    return this.grid[y][x] === CELL.WALL;
  },


  isTrap(x, y) {

    return (
      this.isInBounds(x, y) &&
      this.grid[y][x] === CELL.TRAP
    );
  },


  isStart(x, y) {
    return (
      this.startPos.x === x &&
      this.startPos.y === y
    );
  },


  isGoal(x, y) {
    return (
      this.goalPos.x === x &&
      this.goalPos.y === y
    );
  },


  setCell(x, y, tool) {

    if (!this.isInBounds(x, y)) {
      return;
    }


    if (tool === 'agent') {

      this.startPos = { x, y };

      if (this.grid[y][x] !== CELL.EMPTY) {
        this.grid[y][x] = CELL.EMPTY;
      }

      return;
    }


    if (tool === 'goal') {

      this.goalPos = { x, y };

      if (this.grid[y][x] !== CELL.EMPTY) {
        this.grid[y][x] = CELL.EMPTY;
      }

      return;
    }


    if (
      this.isStart(x, y) ||
      this.isGoal(x, y)
    ) {
      return;
    }


    if (tool === 'wall') {
      this.grid[y][x] = CELL.WALL;
    }

    else if (tool === 'trap') {
      this.grid[y][x] = CELL.TRAP;
    }

    else if (tool === 'erase') {
      this.grid[y][x] = CELL.EMPTY;
    }
  },


  hasPath() {

    const visited = new Set();

    const queue = [this.startPos];

    visited.add(
      `${this.startPos.x},${this.startPos.y}`
    );

    const dirs = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0]
    ];


    while (queue.length) {

      const { x, y } = queue.shift();

      if (
        x === this.goalPos.x &&
        y === this.goalPos.y
      ) {
        return true;
      }


      for (const [dx, dy] of dirs) {

        const nx = x + dx;
        const ny = y + dy;

        const key = `${nx},${ny}`;


        if (
          this.isInBounds(nx, ny) &&
          !this.isWall(nx, ny) &&
          !this.isTrap(nx, ny) &&
          !visited.has(key)
        ) {

          visited.add(key);

          queue.push({
            x: nx,
            y: ny
          });
        }
      }
    }

    return false;
  },


  validate() {

    if (
      this.startPos.x === this.goalPos.x &&
      this.startPos.y === this.goalPos.y
    ) {

      return {
        valid: false,
        message:
          'El agente y la meta no pueden estar en el mismo lugar.'
      };
    }


    if (!this.hasPath()) {

      return {
        valid: false,
        message:
          'El agente no puede llegar a la meta. Modificá algunas paredes.'
      };
    }


    return {
      valid: true,
      message: 'Laberinto válido ✓'
    };
  },


  buildDOM(container) {

    container.innerHTML = '';

    this.cellEls = [];


    for (
      let y = 0;
      y < GRID_SIZE;
      y++
    ) {

      const row = [];


      for (
        let x = 0;
        x < GRID_SIZE;
        x++
      ) {

        const cell =
          document.createElement('div');

        cell.className = 'cell editable';

        cell.dataset.x = x;
        cell.dataset.y = y;

        /*
         * Necesario para poder colocar varios agentes
         * visualmente dentro de una misma celda.
         */
        cell.style.position = 'relative';


        container.appendChild(cell);

        row.push(cell);
      }


      this.cellEls.push(row);
    }
  },


  setAgentCount(count) {

    this.agentCount =
      Math.max(
        1,
        Math.min(
          8,
          Number(count) || 1
        )
      );
  },


  /*
   * Render normal para compatibilidad con el modo de un agente.
   */
  render(agentPos) {

    const fakeAgent = {
      id: 1,
      pos: agentPos || this.startPos
    };

    this.renderAgents([fakeAgent]);
  },


  /*
   * NUEVO:
   * Renderiza todos los agentes reales.
   */
  renderAgents(agents = []) {

    this.visibleAgents = agents;


    // Limpiar agentes anteriores

    for (
      let y = 0;
      y < GRID_SIZE;
      y++
    ) {

      for (
        let x = 0;
        x < GRID_SIZE;
        x++
      ) {

        const cell = this.cellEls[y][x];

        cell.classList.remove('cell-agent');

        cell
          .querySelectorAll('.agent-token')
          .forEach(token => token.remove());
      }
    }


    // Renderizar tablero

    for (
      let y = 0;
      y < GRID_SIZE;
      y++
    ) {

      for (
        let x = 0;
        x < GRID_SIZE;
        x++
      ) {

        const el = this.cellEls[y][x];

        el.className = 'cell';

        if (this.editable) {
          el.classList.add('editable');
        }


        const type = this.grid[y][x];

        if (type === CELL.WALL) {
          el.classList.add('cell-wall');
        }

        if (type === CELL.TRAP) {
          el.classList.add('cell-trap');
        }

        if (this.isStart(x, y)) {
          el.classList.add('cell-start');
        }

        if (this.isGoal(x, y)) {
          el.classList.add('cell-goal');
        }
      }
    }


    // Renderizar agentes

    agents.forEach((agent, index) => {

      if (!agent || !agent.pos) {
        return;
      }

      const {
        x,
        y
      } = agent.pos;


      if (!this.isInBounds(x, y)) {
        return;
      }


      const cell = this.cellEls[y][x];

      cell.classList.add('cell-agent');

      if (this.agentCount === 1) {
        return;
      }

      /*
       * Token independiente.
       * Permite que varios agentes sean visibles
       * aunque estén en la misma celda.
       */

    const token =
      document.createElement('div');

    token.className = 'agent-token';

    token.dataset.agentId = agent.id;

    token.textContent =
      this.agentCount > 1
        ? agent.id
        : '';

        /*
        * Diferenciación visual.
        */
        const hue =
          (agent.id - 1) * 70;

        token.style.position = 'absolute';

        token.style.left = '72%';

        token.style.top = '28%';

        token.style.transform =
          'translate(-50%, -50%)';

        token.style.width = '33%';

        token.style.height = '33%';

        token.style.borderRadius = '50%';

        token.style.display = 'flex';

        token.style.alignItems = 'center';

        token.style.justifyContent = 'center';

        token.style.fontWeight = '900';

        token.style.fontSize =
          this.agentCount > 1
            ? '0.65rem'
            : '0.8rem';

        token.style.zIndex = '20';

        token.style.background =
          `hsl(${hue}, 85%, 60%)`;

        token.style.border =
          '2px solid rgba(255,255,255,0.9)';

        token.style.boxShadow =
          '0 0 12px rgba(255,255,255,0.45)';


        cell.appendChild(token);
      });
    },


  /*
   * Actualización rápida para compatibilidad.
   */
  updateAgentCell(prevPos, newPos) {

    this.render({
      pos: newPos
    });
  },


  /*
   * Flechas de mejores acciones.
   */
  renderBestActionArrows(qTable, show) {

    const arrows = [
      '↑',
      '↓',
      '←',
      '→'
    ];


    for (
      let y = 0;
      y < GRID_SIZE;
      y++
    ) {

      for (
        let x = 0;
        x < GRID_SIZE;
        x++
      ) {

        const el = this.cellEls[y][x];

        const existing =
          el.querySelector('.cell-best-arrow');

        if (existing) {
          existing.remove();
        }


        if (!show) {
          continue;
        }


        if (
          this.isWall(x, y) ||
          this.isGoal(x, y) ||
          this.isTrap(x, y)
        ) {
          continue;
        }


        const key = `${x},${y}`;

        const qs = qTable[key];

        if (!qs) {
          continue;
        }


        const max = Math.max(...qs);

        if (max <= 0) {
          continue;
        }


        const bestIdx =
          qs.indexOf(max);


        const arrowEl =
          document.createElement('span');

        arrowEl.className =
          'cell-best-arrow';

        arrowEl.textContent =
          arrows[bestIdx];

        el.appendChild(arrowEl);
      }
    }
  }
};
