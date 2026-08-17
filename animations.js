/* ==========================================================================
   animations.js
   ¿Qué problema resuelve? Centraliza todas las animaciones visuales para
   hacer que el proceso de Reinforcement Learning sea visible y educativo.
   
   Funciones principales:
   - animateAgentMove(): movimiento suave del agente
   - showRewardFloat(): recompensa flotante con número
   - showTrapEffect(): efecto visual de trampa (explosión)
   - showGoalEffect(): efecto visual de meta (celebración)
   - showActionIndicator(): flecha de dirección de acción
   - playActionSequence(): orquesta toda la secuencia de una acción
   ========================================================================== 

const Animations = {
  // Configuración base
  config: {
    moveAnimationDuration: 350,    // ms de animación de movimiento
    rewardDisplayDuration: 1500,   // ms que la recompensa permanece visible
    trapEffectDuration: 500,       // ms del efecto de trampa
    goalEffectDuration: 1000,      // ms del efecto de meta
    actionIndicatorDuration: 600,  // ms del indicador de acción
    pauseBetweenAnimations: 120,   // ms entre animaciones para que se vea bien
  },

  // Estado actual del multiplicador de velocidad
  currentSpeedMultiplier: 1,

  // Obtiene el timing ajustado según la velocidad
  getAdjustedTiming(baseTiming) {
    return Math.round(baseTiming / this.currentSpeedMultiplier);
  },

  // ========== ANIMACIÓN DE MOVIMIENTO DEL AGENTE ==========
  animateAgentMove(prevPos, nextPos) {
    return new Promise((resolve) => {
      if (!Maze.cellEls[prevPos.y] || !Maze.cellEls[nextPos.y]) {
        resolve();
        return;
      }

      const prevEl = Maze.cellEls[prevPos.y][prevPos.x];
      const nextEl = Maze.cellEls[nextPos.y][nextPos.x];

      // Actualizar visualmente el agente
      prevEl.classList.remove('cell-agent');
      nextEl.classList.add('cell-agent');

      // Agregar clase de animación al elemento destino
      nextEl.classList.add('cell-agent-moving');

      // Remover la clase de animación después de que termine
      const duration = this.getAdjustedTiming(this.config.moveAnimationDuration);
      setTimeout(() => {
        nextEl.classList.remove('cell-agent-moving');
        resolve();
      }, duration);
    });
  },

  // ========== MOSTRAR RECOMPENSA FLOTANTE ==========
  showRewardFloat(pos, value) {
    return new Promise((resolve) => {
      if (!Maze.cellEls[pos.y] || !Maze.cellEls[pos.y][pos.x]) {
        resolve();
        return;
      }

      const cell = Maze.cellEls[pos.y][pos.x];
      const rewardEl = document.createElement('div');
      rewardEl.className = 'reward-float';
      rewardEl.textContent = value >= 0 ? `+${value}` : `${value}`;
      rewardEl.classList.add(value >= 0 ? 'reward-positive' : 'reward-negative');

      cell.appendChild(rewardEl);

      // Remover después de que la animación termine
      const duration = this.getAdjustedTiming(this.config.rewardDisplayDuration);
      setTimeout(() => {
        rewardEl.remove();
        resolve();
      }, duration);
    });
  },

  // ========== EFECTO VISUAL DE TRAMPA ==========
  showTrapEffect(pos) {
    return new Promise((resolve) => {
      if (!Maze.cellEls[pos.y] || !Maze.cellEls[pos.y][pos.x]) {
        resolve();
        return;
      }

      const cell = Maze.cellEls[pos.y][pos.x];

      // Crear elemento de impacto
      const impactEl = document.createElement('div');
      impactEl.className = 'trap-impact';
      cell.appendChild(impactEl);

      // Agregar clase de animación
      setTimeout(() => impactEl.classList.add('trap-impact-active'), 10);

      // Remover después de la animación
      const duration = this.getAdjustedTiming(this.config.trapEffectDuration);
      setTimeout(() => {
        impactEl.remove();
        resolve();
      }, duration);
    });
  },

  // ========== EFECTO VISUAL DE META ==========
  showGoalEffect(pos) {
    return new Promise((resolve) => {
      if (!Maze.cellEls[pos.y] || !Maze.cellEls[pos.y][pos.x]) {
        resolve();
        return;
      }

      const cell = Maze.cellEls[pos.y][pos.x];

      // Crear elemento de celebración
      const celebrationEl = document.createElement('div');
      celebrationEl.className = 'goal-celebration';
      cell.appendChild(celebrationEl);

      // Crear partículas de celebración
      for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.className = 'goal-particle';
        particle.textContent = '✨';
        particle.style.setProperty('--particle-delay', `${i * 80}ms`);
        celebrationEl.appendChild(particle);
      }

      // Agregar clase de animación
      setTimeout(() => celebrationEl.classList.add('goal-celebration-active'), 10);

      // Remover después de la animación
      const duration = this.getAdjustedTiming(this.config.goalEffectDuration);
      setTimeout(() => {
        celebrationEl.remove();
        resolve();
      }, duration);
    });
  },

  // ========== INDICADOR DE ACCIÓN (flecha dirección) ==========
  showActionIndicator(actionIdx) {
    return new Promise((resolve) => {
      const indicators = ['↑', '↓', '←', '→'];
      const indicator = indicators[actionIdx] ?? '—';

      // Crear elemento de indicador
      const indicatorEl = document.createElement('div');
      indicatorEl.className = 'action-indicator';
      indicatorEl.textContent = indicator;

      // Posicionar en el centro de la pantalla aproximadamente
      const board = document.getElementById('maze-board');
      if (board) {
        const boardRect = board.getBoundingClientRect();
        indicatorEl.style.left = boardRect.left + boardRect.width / 2 + 'px';
        indicatorEl.style.top = boardRect.top + boardRect.height / 2 + 'px';
      }

      document.body.appendChild(indicatorEl);

      // Agregar clase de animación
      setTimeout(() => indicatorEl.classList.add('action-indicator-active'), 10);

      // Remover después de la animación
      const duration = this.getAdjustedTiming(this.config.actionIndicatorDuration);
      setTimeout(() => {
        indicatorEl.remove();
        resolve();
      }, duration);
    });
  },

  // ========== EFECTO GENERAL DE IMPACTO ==========
  showImpactEffect(pos) {
    return new Promise((resolve) => {
      if (!Maze.cellEls[pos.y] || !Maze.cellEls[pos.y][pos.x]) {
        resolve();
        return;
      }

      const cell = Maze.cellEls[pos.y][pos.x];
      const impactEl = document.createElement('div');
      impactEl.className = 'impact-effect';
      cell.appendChild(impactEl);

      setTimeout(() => impactEl.classList.add('impact-effect-active'), 10);

      const duration = this.getAdjustedTiming(300);
      setTimeout(() => {
        impactEl.remove();
        resolve();
      }, duration);
    });
  },

  // ========== MENSAJE DE EPISODIO ==========
  showEpisodeMessage(message, type = 'info') {
    return new Promise((resolve) => {
      const messageEl = document.createElement('div');
      messageEl.className = `episode-message episode-message-${type}`;
      messageEl.textContent = message;

      const board = document.getElementById('maze-board');
      if (board) {
        board.appendChild(messageEl);
      }

      setTimeout(() => messageEl.classList.add('episode-message-active'), 10);

      const duration = this.getAdjustedTiming(2000);
      setTimeout(() => {
        messageEl.remove();
        resolve();
      }, duration);
    });
  },

  // ========== ORQUESTADOR PRINCIPAL ==========
  // Ejecuta toda la secuencia visual de una acción con velocidad ajustable
  async playActionSequence(result, speedMultiplier = 1) {
    // Actualizar el multiplicador de velocidad
    this.currentSpeedMultiplier = speedMultiplier;

    const { actionIdx, reward, done, outcome, prevPos, nextPos } = result;
    const pause = this.getAdjustedTiming(this.config.pauseBetweenAnimations);

    try {
      // 1. Mostrar indicador de acción (pequeña flecha)
      await this.showActionIndicator(actionIdx);

      // 2. Esperar un poco
      await this.delay(pause);

      // 3. Animar movimiento del agente
      await this.animateAgentMove(prevPos, nextPos);

      // 4. Mostrar efecto según el resultado
      if (outcome === 'trap') {
        // Impacto + efecto de trampa
        await this.showTrapEffect(nextPos);
        await this.delay(pause);
        await this.showRewardFloat(nextPos, reward);
      } else if (outcome === 'goal') {
        // Celebración + recompensa
        await this.showGoalEffect(nextPos);
        await this.delay(pause);
        await this.showRewardFloat(nextPos, reward);
      } else if (outcome === 'wall') {
        // Impacto leve + recompensa
        await this.showImpactEffect(prevPos);
        await this.delay(pause);
        await this.showRewardFloat(prevPos, reward);
      } else {
        // Movimiento normal: solo mostrar recompensa discreta
        await this.showRewardFloat(nextPos, reward);
      }

      return true;
    } catch (error) {
      console.error('Error en secuencia de animación:', error);
      return false;
    }
  },

  // ========== UTILIDADES ==========
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  // Pausar agente un tiempo sin hacer nada (efecto de "pensamiento")
  thinkingPause() {
    return this.delay(200);
  },
}; */

/* ==========================================================================
   animations.js
   Animaciones independientes para cada agente.
   ========================================================================== */

const Animations = {

  config: {
    moveAnimationDuration: 350,
    rewardDisplayDuration: 1500,
    trapEffectDuration: 500,
    goalEffectDuration: 1000,
    actionIndicatorDuration: 600,
    pauseBetweenAnimations: 120,
  },


  currentSpeedMultiplier: 1,


  getAdjustedTiming(baseTiming) {

    return Math.round(
      baseTiming /
      this.currentSpeedMultiplier
    );
  },


  animateAgentMove(
    prevPos,
    nextPos,
    agentId = 1
  ) {

    return new Promise(resolve => {

      if (
        !Maze.cellEls[prevPos.y] ||
        !Maze.cellEls[nextPos.y]
      ) {
        resolve();
        return;
      }


      /*
       * Para múltiples agentes hacemos un render completo.
       * Esto evita que un agente borre visualmente a otro.
       */
      const agent =
        window.trainingAgents?.find(
          a => a.id === agentId
        );


      if (agent) {
        Maze.renderAgents(
          window.trainingAgents
        );
      }


      const nextEl =
        Maze.cellEls[nextPos.y][nextPos.x];


      nextEl.classList.add(
        'cell-agent-moving'
      );


      const duration =
        this.getAdjustedTiming(
          this.config.moveAnimationDuration
        );


      setTimeout(() => {

        nextEl.classList.remove(
          'cell-agent-moving'
        );

        resolve();

      }, duration);
    });
  },


  showRewardFloat(
    pos,
    value,
    agentId = 1
  ) {

    return new Promise(resolve => {

      if (
        !Maze.cellEls[pos.y] ||
        !Maze.cellEls[pos.y][pos.x]
      ) {
        resolve();
        return;
      }


      const cell =
        Maze.cellEls[pos.y][pos.x];


      const rewardEl =
        document.createElement('div');

      rewardEl.className =
        'reward-float';


      rewardEl.textContent =
        value >= 0
          ? `+${value}`
          : `${value}`;


      rewardEl.classList.add(
        value >= 0
          ? 'reward-positive'
          : 'reward-negative'
      );


      if (agentId) {
        rewardEl.dataset.agentId =
          agentId;
      }


      cell.appendChild(rewardEl);


      const duration =
        this.getAdjustedTiming(
          this.config.rewardDisplayDuration
        );


      setTimeout(() => {

        rewardEl.remove();

        resolve();

      }, duration);
    });
  },


  showTrapEffect(pos) {

    return new Promise(resolve => {

      if (
        !Maze.cellEls[pos.y] ||
        !Maze.cellEls[pos.y][pos.x]
      ) {
        resolve();
        return;
      }


      const cell =
        Maze.cellEls[pos.y][pos.x];


      const impactEl =
        document.createElement('div');

      impactEl.className =
        'trap-impact';


      cell.appendChild(impactEl);


      setTimeout(() => {

        impactEl.classList.add(
          'trap-impact-active'
        );

      }, 10);


      const duration =
        this.getAdjustedTiming(
          this.config.trapEffectDuration
        );


      setTimeout(() => {

        impactEl.remove();

        resolve();

      }, duration);
    });
  },


  showGoalEffect(pos) {

    return new Promise(resolve => {

      if (
        !Maze.cellEls[pos.y] ||
        !Maze.cellEls[pos.y][pos.x]
      ) {
        resolve();
        return;
      }


      const cell =
        Maze.cellEls[pos.y][pos.x];


      const celebrationEl =
        document.createElement('div');

      celebrationEl.className =
        'goal-celebration';


      for (
        let i = 0;
        i < 6;
        i++
      ) {

        const particle =
          document.createElement('div');

        particle.className =
          'goal-particle';

        particle.textContent =
          '✨';

        particle.style.setProperty(
          '--particle-delay',
          `${i * 80}ms`
        );

        celebrationEl.appendChild(
          particle
        );
      }


      cell.appendChild(
        celebrationEl
      );


      setTimeout(() => {

        celebrationEl.classList.add(
          'goal-celebration-active'
        );

      }, 10);


      const duration =
        this.getAdjustedTiming(
          this.config.goalEffectDuration
        );


      setTimeout(() => {

        celebrationEl.remove();

        resolve();

      }, duration);
    });
  },


  showActionIndicator(
    actionIdx,
    agentId = 1
  ) {

    return new Promise(resolve => {

      const indicators = [
        '↑',
        '↓',
        '←',
        '→'
      ];


      const indicator =
        indicators[actionIdx] ?? '—';


      const indicatorEl =
        document.createElement('div');


      indicatorEl.className =
        'action-indicator';


      indicatorEl.textContent = indicator;


      const board =
        document.getElementById(
          'maze-board'
        );


      if (board) {

        const boardRect =
          board.getBoundingClientRect();


        indicatorEl.style.left =
          boardRect.left +
          boardRect.width / 2 +
          'px';


        indicatorEl.style.top =
          boardRect.top +
          boardRect.height / 2 +
          'px';
      }


      document.body.appendChild(
        indicatorEl
      );


      setTimeout(() => {

        indicatorEl.classList.add(
          'action-indicator-active'
        );

      }, 10);


      const duration =
        this.getAdjustedTiming(
          this.config.actionIndicatorDuration
        );


      setTimeout(() => {

        indicatorEl.remove();

        resolve();

      }, duration);
    });
  },


  showImpactEffect(pos) {

    return new Promise(resolve => {

      if (
        !Maze.cellEls[pos.y] ||
        !Maze.cellEls[pos.y][pos.x]
      ) {
        resolve();
        return;
      }


      const cell =
        Maze.cellEls[pos.y][pos.x];


      const impactEl =
        document.createElement('div');

      impactEl.className =
        'impact-effect';


      cell.appendChild(
        impactEl
      );


      setTimeout(() => {

        impactEl.classList.add(
          'impact-effect-active'
        );

      }, 10);


      const duration =
        this.getAdjustedTiming(300);


      setTimeout(() => {

        impactEl.remove();

        resolve();

      }, duration);
    });
  },


  showEpisodeMessage(
    message,
    type = 'info'
  ) {

    return new Promise(resolve => {

      const messageEl =
        document.createElement('div');

      messageEl.className =
        `episode-message episode-message-${type}`;


      messageEl.textContent =
        message;


      const board =
        document.getElementById(
          'maze-board'
        );


      if (board) {
        board.appendChild(
          messageEl
        );
      }


      setTimeout(() => {

        messageEl.classList.add(
          'episode-message-active'
        );

      }, 10);


      const duration =
        this.getAdjustedTiming(2000);


      setTimeout(() => {

        messageEl.remove();

        resolve();

      }, duration);
    });
  },


  /*
   * Secuencia completa para UN agente.
   */
  async playActionSequence(
    result,
    speedMultiplier = 1
  ) {

    this.currentSpeedMultiplier =
      speedMultiplier;


    const {
      actionIdx,
      reward,
      outcome,
      prevPos,
      nextPos,
      agentId
    } = result;


    const pause =
      this.getAdjustedTiming(
        this.config.pauseBetweenAnimations
      );


    try {

      /*
       * Con múltiples agentes ocultamos
       * el indicador central para no saturar.
       */
      if (
        window.trainingAgents?.length <= 1
      ) {

        await this.showActionIndicator(
          actionIdx,
          agentId
        );

        await this.delay(pause);
      }


      await this.animateAgentMove(
        prevPos,
        nextPos,
        agentId
      );


      if (outcome === 'trap') {

        await this.showTrapEffect(
          nextPos
        );

        await this.delay(pause);

        await this.showRewardFloat(
          nextPos,
          reward,
          agentId
        );

      }

      else if (outcome === 'goal') {

        await this.showGoalEffect(
          nextPos
        );

        await this.delay(pause);

        await this.showRewardFloat(
          nextPos,
          reward,
          agentId
        );

      }

      else if (outcome === 'wall') {

        await this.showImpactEffect(
          prevPos
        );

        await this.delay(pause);

        await this.showRewardFloat(
          prevPos,
          reward,
          agentId
        );

      }

      else {

        /*
         * Para movimiento normal mantenemos
         * la recompensa, pero más discretamente.
         */
        await this.showRewardFloat(
          nextPos,
          reward,
          agentId
        );
      }


      return true;

    } catch (error) {

      console.error(
        'Error en secuencia de animación:',
        error
      );

      return false;
    }
  },


  delay(ms) {

    return new Promise(resolve =>
      setTimeout(resolve, ms)
    );
  },


  thinkingPause() {

    return this.delay(200);
  },
};
