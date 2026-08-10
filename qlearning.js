/* ==========================================================================
   qlearning.js
   ¿Qué problema resuelve? Es el "cerebro" del proyecto: decide qué acción
   tomar (epsilon-greedy) y aprende de la experiencia actualizando una
   tabla Q con la fórmula clásica de Q-Learning:

       Q(s,a) = Q(s,a) + α [ r + γ · max Q(s',a') − Q(s,a) ]

   Conceptos que representa:
   - Estado (s): la posición (x,y) del agente.
   - Acción (a): arriba / abajo / izquierda / derecha.
   - Recompensa (r): número que premia o castiga el movimiento.
   - Exploración vs explotación: a veces prueba algo nuevo (ε), a veces
     usa lo que ya sabe.
   ========================================================================== */

const ACTIONS = ['up', 'down', 'left', 'right'];

// Recompensas simples y fáciles de explicar en la feria.
const REWARDS = {
  GOAL: 100,
  MOVE: -1,
  WALL_HIT: -5,
  TRAP: -50,
};

const MAX_STEPS_PER_EPISODE = 200;

const QLearning = {
  qTable: {},          // { "x,y": [Qup, Qdown, Qleft, Qright] }
  alpha: 0.1,          // α — qué tan rápido incorpora lo nuevo aprendido
  gamma: 0.9,          // γ — cuánto valora el futuro sobre el presente
  epsilon: 1.0,        // ε — probabilidad de explorar
  epsilonMin: 0.05,
  epsilonDecay: 0.985, // se multiplica al terminar cada episodio

  reset() {
    this.qTable = {};
    this.epsilon = 1.0;
  },

  stateKey(pos) {
    return `${pos.x},${pos.y}`;
  },

  getQ(pos) {
    const key = this.stateKey(pos);
    if (!this.qTable[key]) this.qTable[key] = [0, 0, 0, 0];
    return this.qTable[key];
  },

  // Estrategia epsilon-greedy: con probabilidad ε elige una acción al
  // azar (explorar); si no, elige la de mayor valor Q conocido (explotar).
  chooseAction(pos) {
    const q = this.getQ(pos);
    const explore = Math.random() < this.epsilon;

    if (explore) {
      const idx = Math.floor(Math.random() * ACTIONS.length);
      return { actionIdx: idx, wasExploration: true };
    }

    // Explotación: buscamos el máximo, desempatando al azar entre iguales.
    const max = Math.max(...q);
    const bestIndices = q.map((v, i) => (v === max ? i : -1)).filter(i => i !== -1);
    const idx = bestIndices[Math.floor(Math.random() * bestIndices.length)];
    return { actionIdx: idx, wasExploration: false };
  },

  // Ejecuta un paso completo: mueve (o intenta mover) al agente, calcula
  // la recompensa y actualiza la tabla Q. Devuelve todo lo que la interfaz
  // necesita para explicar la decisión.
  step() {
    const prevPos = { ...Agent.pos };
    const { actionIdx, wasExploration } = this.chooseAction(prevPos);
    const target = Agent.getTargetCell(actionIdx);

    let reward, done, outcome, nextPos;

    if (Maze.isWall(target.x, target.y)) {
      // Choca contra una pared (o el borde del mapa): no se mueve.
      reward = REWARDS.WALL_HIT;
      done = false;
      outcome = 'wall';
      nextPos = prevPos;
    } else if (Maze.isGoal(target.x, target.y)) {
      reward = REWARDS.GOAL;
      done = true;
      outcome = 'goal';
      nextPos = target;
    } else if (Maze.isTrap(target.x, target.y)) {
      reward = REWARDS.TRAP;
      done = true; // caer en la trampa termina el episodio, como un "game over" chico
      outcome = 'trap';
      nextPos = target;
    } else {
      reward = REWARDS.MOVE;
      done = false;
      outcome = 'move';
      nextPos = target;
    }

    // --- Actualización de Q-Learning ---
    const qPrev = this.getQ(prevPos);
    const qNext = this.getQ(nextPos);
    const maxNext = Math.max(...qNext);
    qPrev[actionIdx] = qPrev[actionIdx] + this.alpha * (reward + this.gamma * maxNext - qPrev[actionIdx]);

    Agent.pos = nextPos;

    return {
      prevPos, nextPos, actionIdx, wasExploration, reward, done, outcome,
    };
  },

  decayEpsilon() {
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
  },
};
