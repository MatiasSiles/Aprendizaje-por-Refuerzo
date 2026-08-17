/* ==========================================================================
   agent.js
   ¿Qué problema resuelve? Representa "quién" se mueve por el laberinto:
   simplemente guarda la posición actual del agente y sabe volver al inicio.
   No decide nada por sí mismo — quien decide es qlearning.js.
   ========================================================================== 

const Agent = {
  pos: { x: 0, y: 0 },

  resetToStart() {
    this.pos = { x: Maze.startPos.x, y: Maze.startPos.y };
  },

  // Dado un índice de acción (0=arriba,1=abajo,2=izquierda,3=derecha)
  // devuelve la celda destino (todavía sin comprobar paredes).
  getTargetCell(actionIdx) {
    const deltas = [
      { dx: 0, dy: -1 }, // arriba
      { dx: 0, dy: 1 },  // abajo
      { dx: -1, dy: 0 }, // izquierda
      { dx: 1, dy: 0 },  // derecha
    ];
    const d = deltas[actionIdx];
    return { x: this.pos.x + d.dx, y: this.pos.y + d.dy };
  },

  // Informa qué paredes rodean al agente ahora mismo. Esto es lo que
  // "ve" el agente y es lo que alimenta la visualización de red neuronal.
  getSurroundings() {
    const { x, y } = this.pos;
    return {
      wallUp: Maze.isWall(x, y - 1),
      wallDown: Maze.isWall(x, y + 1),
      wallLeft: Maze.isWall(x - 1, y),
      wallRight: Maze.isWall(x + 1, y),
    };
  },
}; *\

/* ==========================================================================
   agent.js
   Representa un agente individual dentro del laberinto.

   Cada agente posee:
   - posición propia
   - ID
   - estado de episodio
   - contador de pasos
   - recompensa acumulada

   Q-Learning se mantiene separado y recibe el agente correspondiente.
   ========================================================================== */

class AgentModel {
  constructor(id = 1) {
    this.id = id;
    this.pos = { x: 0, y: 0 };
    this.startPos = { x: 0, y: 0 };
    this.episode = 0;
    this.stepsThisEpisode = 0;
    this.rewardThisEpisode = 0;
    this.lastReward = 0;
    this.active = true;
  }

  resetToStart() {
    this.pos = { ...Maze.startPos };
    this.startPos = { ...Maze.startPos };
    this.stepsThisEpisode = 0;
    this.rewardThisEpisode = 0;
    this.lastReward = 0;
    this.active = true;
  }

  startEpisode() {
    this.episode += 1;
    this.pos = { ...Maze.startPos };
    this.stepsThisEpisode = 0;
    this.rewardThisEpisode = 0;
    this.lastReward = 0;
    this.active = true;
  }

  registerReward(reward) {
    this.stepsThisEpisode += 1;
    this.rewardThisEpisode += reward;
    this.lastReward = reward;
  }

  getTargetCell(actionIdx) {
    const deltas = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    const d = deltas[actionIdx];

    return {
      x: this.pos.x + d.dx,
      y: this.pos.y + d.dy,
    };
  }

  getSurroundings() {
    const { x, y } = this.pos;

    return {
      wallUp: Maze.isWall(x, y - 1),
      wallDown: Maze.isWall(x, y + 1),
      wallLeft: Maze.isWall(x - 1, y),
      wallRight: Maze.isWall(x + 1, y),
    };
  }
}


/*
 * Compatibilidad con el código antiguo.
 *
 * Algunas partes del proyecto todavía utilizan:
 *
 * Agent.pos
 * Agent.resetToStart()
 * Agent.getSurroundings()
 *
 * Por eso mantenemos un agente principal.
 */
const Agent = new AgentModel(1);
