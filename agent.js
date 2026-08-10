/* ==========================================================================
   agent.js
   ¿Qué problema resuelve? Representa "quién" se mueve por el laberinto:
   simplemente guarda la posición actual del agente y sabe volver al inicio.
   No decide nada por sí mismo — quien decide es qlearning.js.
   ========================================================================== */

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
};
