/* ========================================================================== 
   main.js
   Punto de entrada del proyecto. Orquesta los módulos del laberinto,
   el agente, Q-Learning, métricas y visualización para que la interfaz
   funcione desde un único lugar.
   ========================================================================== 

(() => {
  const state = {
    currentTool: 'wall',
    isTraining: false,
    timerId: null,
    speedLevel: 2,
    agentCount: 1,
  };

  function getSpeedDelay() {
    const delays = [1000, 600, 250, 100, 50];
    return delays[state.speedLevel] ?? 250;
  }

  function getSpeedMultiplier() {
    // Retorna un multiplicador para acelerar las animaciones
    // Velocidades: [0.3, 0.5, 1, 1.5, 2]
    const multipliers = [0.3, 0.5, 1, 1.5, 2];
    return multipliers[state.speedLevel] ?? 1;
  }

  function setTrainingButtons() {
    const playBtn = document.getElementById('btn-play');
    const pauseBtn = document.getElementById('btn-pause');
    const resetBtn = document.getElementById('btn-reset');
    if (!playBtn || !pauseBtn || !resetBtn) return;

    playBtn.disabled = state.isTraining;
    pauseBtn.disabled = !state.isTraining;
    resetBtn.disabled = false;
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 1400);
  }

  function updateDecisionBox(result) {
    const tag = document.getElementById('decision-tag');
    const detail = document.getElementById('decision-detail');
    if (!tag || !detail) return;

    const stateKey = QLearning.stateKey(Agent.pos);
    const actionLabels = ['↑', '↓', '←', '→'];
    const actionLabel = actionLabels[result?.actionIdx ?? 0] ?? '—';
    const reward = result?.reward ?? '—';
    const nextState = result ? QLearning.stateKey(result.nextPos) : '—';

    tag.textContent = result ? `Paso ${Metrics.stepsThisEpisode}` : '— Esperando inicio —';
    detail.innerHTML = `Estado: ${stateKey} &nbsp;→&nbsp; Acción: ${actionLabel} &nbsp;→&nbsp; Recompensa: ${reward} &nbsp;→&nbsp; Nuevo estado: ${nextState}`;
  }

  function renderQTable() {
    const qtable = document.getElementById('qtable-current');
    const stateLabel = document.getElementById('qtable-state');
    if (!qtable || !stateLabel) return;

    const values = QLearning.getQ(Agent.pos);
    const labels = ['↑', '↓', '←', '→'];
    stateLabel.textContent = QLearning.stateKey(Agent.pos);

    qtable.innerHTML = labels.map((label, i) => {
      const value = values[i].toFixed(2);
      return `<div class="qtable-row"><span>${label}</span><strong>${value}</strong></div>`;
    }).join('');
  }

  function updateEditorValidation() {
    const validation = document.getElementById('editor-validation');
    if (!validation) return;

    const result = Maze.validate();
    validation.textContent = result.message;
    validation.classList.toggle('invalid', !result.valid);
  }

  function setActiveTool(tool) {
    state.currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  function handleBoardClick(event) {
    if (state.isTraining) return;

    const cell = event.target.closest('.cell');
    if (!cell) return;

    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    Maze.setCell(x, y, state.currentTool);
    Maze.render(Agent.pos);
    updateEditorValidation();
  }

  function resetSimulation(keepMaze = true) {
    state.isTraining = false;
    clearTimeout(state.timerId);
    state.timerId = null;

    if (!keepMaze) {
      Maze.reset();
    }

    Maze.editable = true;
    Maze.setAgentCount(state.agentCount);
    Agent.resetToStart();
    QLearning.reset();
    Metrics.reset();
    Maze.render(Agent.pos);
    Metrics.render();
    renderQTable();
    updateDecisionBox(null);
    NeuralNetworkView.init(document.getElementById('nn-svg'));
    setTrainingButtons();
    updateEditorValidation();
  }

  function startEpisode() {
    if (!Maze.validate().valid) {
      showToast('El laberinto aún no es válido.');
      return;
    }

    state.isTraining = true;
    Maze.editable = false;
    Metrics.startEpisode();
    Metrics.render();
    setTrainingButtons();
    updateDecisionBox(null);
    stepSimulation();
  }

  function pauseTraining() {
    if (!state.isTraining) return;
    state.isTraining = false;
    clearTimeout(state.timerId);
    state.timerId = null;
    Maze.editable = true;
    setTrainingButtons();
    showToast('Entrenamiento pausado');
  }

  async function stepSimulation() {
    if (!state.isTraining) return;

    const result = QLearning.step();
    Metrics.registerStep(result.reward);

    // Ejecutar la secuencia de animaciones con multiplicador de velocidad
    const speedMult = getSpeedMultiplier();
    await Animations.playActionSequence(result, speedMult);

    // Actualizar la UI DESPUÉS de que las animaciones terminen
    NeuralNetworkView.update(Agent.pos, Agent.getSurroundings(), result.actionIdx);
    updateDecisionBox(result);
    renderQTable();
    Metrics.render();
    Maze.renderBestActionArrows(QLearning.qTable, document.getElementById('toggle-arrows')?.checked);

    if (result.done) {
      const success = result.outcome === 'goal';
      Metrics.finishEpisode(success);
      QLearning.decayEpsilon();
      Metrics.render();
      Maze.renderBestActionArrows(QLearning.qTable, document.getElementById('toggle-arrows')?.checked);

      // Mostrar mensaje según el resultado
      const message = success 
        ? '¡🎉 META ALCANZADA! 🎉' 
        : (result.outcome === 'trap' ? '⚠️ ¡TRAMPA! Episodio terminado.' : '⏹️ Fin del episodio');
      await Animations.showEpisodeMessage(message, success ? 'success' : 'failure');

      // Resetear para el siguiente episodio
      Agent.resetToStart();
      Maze.updateAgentCell(result.nextPos, Agent.pos);
      Metrics.startEpisode();
      Metrics.render();
      updateDecisionBox(null);
      renderQTable();
      renderBoard();

      // Esperar antes del siguiente episodio (mucho más corto)
      await Animations.delay(Math.max(10, getSpeedDelay() / 2));

      state.timerId = setTimeout(() => {
        if (state.isTraining) stepSimulation();
      }, 10);
      return;
    }

    // Esperar según el nivel de velocidad (muy reducido para mantener fluidez)
    await Animations.delay(Math.max(10, getSpeedDelay() / 3));

    state.timerId = setTimeout(() => {
      if (state.isTraining) stepSimulation();
    }, 10);
  }

  function renderBoard() {
    Maze.render(Agent.pos);
    Maze.renderBestActionArrows(QLearning.qTable, document.getElementById('toggle-arrows')?.checked);
  }

  function bindEvents() {
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
    });

    const board = document.getElementById('maze-board');
    if (board) {
      board.addEventListener('click', handleBoardClick);
    }

    const startBtn = document.getElementById('btn-start-training');
    const playBtn = document.getElementById('btn-play');
    const pauseBtn = document.getElementById('btn-pause');
    const resetBtn = document.getElementById('btn-reset');
    const newMazeBtn = document.getElementById('btn-new-maze');
    const speedSlider = document.getElementById('speed-slider');
    const speedLabel = document.getElementById('speed-label');
    const agentCountInput = document.getElementById('agent-count');
    const agentCountLabel = document.getElementById('agent-count-label');
    const toggleArrows = document.getElementById('toggle-arrows');

    if (startBtn) startBtn.addEventListener('click', startEpisode);
    if (playBtn) playBtn.addEventListener('click', startEpisode);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTraining);
    if (resetBtn) resetBtn.addEventListener('click', () => resetSimulation(true));
    if (newMazeBtn) newMazeBtn.addEventListener('click', () => resetSimulation(false));

    if (speedSlider && speedLabel) {
      speedSlider.addEventListener('input', () => {
        state.speedLevel = Number(speedSlider.value);
        const labels = ['Muy lento', 'Lento', 'Normal', 'Rápido', 'Muy rápido'];
        speedLabel.textContent = labels[state.speedLevel] ?? 'Normal';
      });
    }

    if (agentCountInput && agentCountLabel) {
      agentCountInput.addEventListener('input', () => {
        state.agentCount = Number(agentCountInput.value);
        agentCountLabel.textContent = String(state.agentCount);
        Maze.setAgentCount(state.agentCount);
        Maze.render(Agent.pos);
      });
    }

    if (toggleArrows) {
      toggleArrows.addEventListener('change', renderBoard);
    }
  }

  function init() {
    const board = document.getElementById('maze-board');
    if (board) {
      Maze.buildDOM(board);
      Maze.setAgentCount(state.agentCount);
    }

    Maze.reset();
    Maze.editable = true;
    Maze.render(Agent.pos);
    updateEditorValidation();
    NeuralNetworkView.init(document.getElementById('nn-svg'));
    Metrics.render();
    renderQTable();
    bindEvents();
    setActiveTool(state.currentTool);
    setTrainingButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); */

/* ==========================================================================
   main.js
   Punto de entrada del proyecto.
   Soporta uno o múltiples agentes independientes.
   ========================================================================== */

(() => {

  const state = {

    currentTool: 'wall',

    isTraining: false,

    timerId: null,

    speedLevel: 2,

    agentCount: 1,

    agents: [],

    learners: [],

    currentAgentIndex: 0,
  };


  /*
   * Exponemos los agentes para Animations y Metrics.
   */
  window.trainingAgents =
    state.agents;


  function getSpeedDelay() {

    const delays = [
      1000,
      600,
      250,
      40,
      10
    ];

    return (
      delays[state.speedLevel] ??
      250
    );
  }


  function getSpeedMultiplier() {

    const multipliers = [
      0.25,
      0.5,
      1,
      4,
      10
    ];

    return (
      multipliers[state.speedLevel] ??
      1
    );
  }


  function setTrainingButtons() {

    const playBtn =
      document.getElementById(
        'btn-play'
      );

    const pauseBtn =
      document.getElementById(
        'btn-pause'
      );

    const resetBtn =
      document.getElementById(
        'btn-reset'
      );


    if (
      !playBtn ||
      !pauseBtn ||
      !resetBtn
    ) {
      return;
    }


    playBtn.disabled =
      state.isTraining;

    pauseBtn.disabled =
      !state.isTraining;

    resetBtn.disabled =
      false;
  }


  function showToast(message) {

    const toast =
      document.getElementById(
        'toast'
      );


    if (!toast) {
      return;
    }


    toast.textContent =
      message;


    toast.classList.remove(
      'hidden'
    );


    clearTimeout(
      showToast._timer
    );


    showToast._timer =
      setTimeout(() => {

        toast.classList.add(
          'hidden'
        );

      }, 1400);
  }


  /*
   * Obtiene el agente que acaba de realizar
   * la acción más reciente.
   */
  function getCurrentAgent() {

    return (
      state.agents[
        state.currentAgentIndex
      ] ||
      state.agents[0]
    );
  }


  function updateDecisionBox(
    result
  ) {

    const tag =
      document.getElementById(
        'decision-tag'
      );

    const detail =
      document.getElementById(
        'decision-detail'
      );


    if (
      !tag ||
      !detail
    ) {
      return;
    }


    if (!result) {

      tag.textContent =
        '— Esperando inicio —';

      detail.innerHTML =
        'El agente está listo para aprender.';

      return;
    }


    const agent =
      state.agents.find(
        a => a.id === result.agentId
      );


    if (!agent) {
      return;
    }


    const learner =
      state.learners.find(
        q => q.agent === agent
      );


    const stateKey =
      learner.stateKey(
        result.prevPos
      );


    const actionLabels = [
      '↑',
      '↓',
      '←',
      '→'
    ];


    const actionLabel =
      actionLabels[
        result.actionIdx
      ] ?? '—';


    const reward =
      result.reward;


    const nextState =
      learner.stateKey(
        result.nextPos
      );


    tag.textContent =
      `Agente ${agent.id} · Paso ${agent.stepsThisEpisode}`;


    detail.innerHTML =
      `Estado: ${stateKey} ` +
      `&nbsp;→&nbsp; ` +
      `Acción: ${actionLabel} ` +
      `&nbsp;→&nbsp; ` +
      `Recompensa: ${reward} ` +
      `&nbsp;→&nbsp; ` +
      `Nuevo estado: ${nextState}`;
  }


  function renderQTable() {

    /*
     * En modo multiagente mostramos
     * la Q-table del agente que acaba
     * de actuar.
     */

    const agent =
      getCurrentAgent();


    const learner =
      state.learners.find(
        q => q.agent === agent
      );


    if (!agent || !learner) {
      return;
    }


    const qtable =
      document.getElementById(
        'qtable-current'
      );

    const stateLabel =
      document.getElementById(
        'qtable-state'
      );


    if (
      !qtable ||
      !stateLabel
    ) {
      return;
    }


    const values =
      learner.getQ(
        agent.pos
      );


    const labels = [
      '↑',
      '↓',
      '←',
      '→'
    ];


    stateLabel.textContent =
      `A${agent.id}: ${learner.stateKey(agent.pos)}`;


    qtable.innerHTML =
      labels
        .map(
          (label, i) => {

            const value =
              values[i].toFixed(2);


            return `
              <div class="qtable-row">
                <span>${label}</span>
                <strong>${value}</strong>
              </div>
            `;
          }
        )
        .join('');
  }


  function updateEditorValidation() {

    const validation =
      document.getElementById(
        'editor-validation'
      );


    if (!validation) {
      return;
    }


    const result =
      Maze.validate();


    validation.textContent =
      result.message;


    validation.classList.toggle(
      'invalid',
      !result.valid
    );
  }


  function setActiveTool(tool) {

    state.currentTool =
      tool;


    document
      .querySelectorAll(
        '.tool-btn'
      )
      .forEach(btn => {

        btn.classList.toggle(
          'active',
          btn.dataset.tool === tool
        );
      });
  }


  function handleBoardClick(event) {

    if (
      state.isTraining
    ) {
      return;
    }


    const cell =
      event.target.closest(
        '.cell'
      );


    if (!cell) {
      return;
    }


    const x =
      Number(cell.dataset.x);

    const y =
      Number(cell.dataset.y);


    Maze.setCell(
      x,
      y,
      state.currentTool
    );


    renderBoard();

    updateEditorValidation();
  }


  /*
   * Crea/recrea todos los agentes.
   */
  function createAgents() {

    state.agents = [];

    state.learners = [];


    for (
      let i = 0;
      i < state.agentCount;
      i++
    ) {

      const agent =
        new AgentModel(
          i + 1
        );


      agent.resetToStart();


      const learner =
        new QLearningModel(
          agent
        );


      state.agents.push(
        agent
      );


      state.learners.push(
        learner
      );
    }


    /*
     * Compatibilidad con código
     * que todavía utiliza Agent/QLearning.
     */
    if (
      state.agents.length === 1
    ) {

      Agent.pos =
        state.agents[0].pos;

      QLearning.qTable =
        state.learners[0].qTable;
    }


    window.trainingAgents =
      state.agents;
  }


  function renderBoard() {

    /*
     * Mostrar agentes reales.
     */
    Maze.renderAgents(
      state.agents
    );


    /*
     * Flechas SOLO para un agente.
     */
    if (
      state.agentCount === 1
    ) {

      const learner =
        state.learners[0];


      Maze.renderBestActionArrows(
        learner.qTable,
        document.getElementById(
          'toggle-arrows'
        )?.checked
      );

    } else {

      Maze.renderBestActionArrows(
        {},
        false
      );
    }


    Metrics.render();
  }


  function resetSimulation(
    keepMaze = true
  ) {

    state.isTraining =
      false;


    clearTimeout(
      state.timerId
    );


    state.timerId =
      null;


    if (!keepMaze) {
      Maze.reset();
    }


    Maze.editable =
      true;


    createAgents();


    state.agents.forEach(
      agent =>
        agent.resetToStart()
    );


    state.learners.forEach(
      learner =>
        learner.reset()
    );


    Metrics.reset();


    renderBoard();


    renderQTable();


    updateDecisionBox(
      null
    );


    NeuralNetworkView.init(
      document.getElementById(
        'nn-svg'
      )
    );


    setTrainingButtons();


    updateEditorValidation();
  }


  function startEpisode() {

    if (
      !Maze.validate().valid
    ) {

      showToast(
        'El laberinto aún no es válido.'
      );

      return;
    }


    state.isTraining =
      true;


    Maze.editable =
      false;


    /*
     * Todos los agentes comienzan
     * un nuevo episodio.
     */
    state.agents.forEach(
      agent =>
        agent.startEpisode()
    );


    state.currentAgentIndex = 0;


    Metrics.startEpisode();

    Metrics.render();


    setTrainingButtons();


    updateDecisionBox(
      null
    );


    stepSimulation();
  }


  function pauseTraining() {

    if (
      !state.isTraining
    ) {
      return;
    }


    state.isTraining =
      false;


    clearTimeout(
      state.timerId
    );


    state.timerId =
      null;


    Maze.editable =
      true;


    setTrainingButtons();


    showToast(
      'Entrenamiento pausado'
    );
  }


  /*
   * Ejecuta UN paso de UN agente.
   *
   * Los agentes se van alternando:
   *
   * A1 → A2 → A3 → A4 → A1...
   *
   * Esto permite observarlos individualmente
   * sin bloquear toda la interfaz.
   */
  async function stepSimulation() {

    if (
      !state.isTraining
    ) {
      return;
    }


    if (
      state.agents.length === 0
    ) {
      return;
    }


    const index =
      state.currentAgentIndex;


    const agent =
      state.agents[index];


    const learner =
      state.learners[index];


    if (
      !agent ||
      !learner
    ) {
      return;
    }


    /*
     * Si terminó su episodio anteriormente,
     * comienza uno nuevo.
     */
    if (!agent.active) {

      agent.startEpisode();
    }


    state.currentAgentIndex =
      index;


    const result =
      learner.step();


    agent.registerReward(
      result.reward
    );


    /*
     * Métricas globales.
     */
    Metrics.registerStep(
      result.reward
    );


    const speedMult =
      getSpeedMultiplier();


    /*
     * Animación SOLO de este agente.
     */
    await Animations.playActionSequence(
      result,
      speedMult
    );


    /*
     * Actualizar UI.
     */
    renderBoard();

    updateDecisionBox(
      result
    );

    renderQTable();


    /*
     * Red neuronal:
     * mostrar el agente que acaba de actuar.
     */
    NeuralNetworkView.update(
      agent.pos,
      agent.getSurroundings(),
      result.actionIdx
    );


    /*
     * Si terminó el episodio.
     */
    if (
      result.done
    ) {

      const success =
        result.outcome === 'goal';


      learner.decayEpsilon();


      /*
       * Mostrar mensaje solamente
       * cuando hay un agente.
       *
       * Con varios agentes sería demasiado
       * invasivo mostrar un mensaje gigante
       * por cada agente.
       */
      if (
        state.agentCount === 1
      ) {

        Metrics.finishEpisode(
          success
        );


        const message =
          success
            ? '¡🎉 META ALCANZADA! 🎉'
            : (
              result.outcome === 'trap'
                ? '⚠️ ¡TRAMPA! Episodio terminado.'
                : '⏹️ Fin del episodio'
            );


        await Animations.showEpisodeMessage(
          message,
          success
            ? 'success'
            : 'failure'
        );
      }


      /*
       * El agente que terminó vuelve
       * a su propio punto inicial.
       *
       * Los demás NO se reinician.
       */
      await Animations.delay(
        Math.max(
          10,
          getSpeedDelay() / 3
        )
      );


      agent.startEpisode();


      renderBoard();


      /*
       * En multiagente, mostramos
       * brevemente el evento en toast.
       */
      if (
        state.agentCount > 1
      ) {

        if (
          result.outcome === 'goal'
        ) {

          showToast(
            `Agente ${agent.id} llegó a la meta: +${result.reward}`
          );

        } else if (
          result.outcome === 'trap'
        ) {

          showToast(
            `Agente ${agent.id} cayó en una trampa: ${result.reward}`
          );
        }
      }
    }


    /*
     * Siguiente agente.
     */
    state.currentAgentIndex =
      (
        state.currentAgentIndex + 1
      ) %
      state.agents.length;


    Metrics.render();


    /*
     * Mantener las flechas únicamente
     * en modo de un agente.
     */
    if (
      state.agentCount === 1
    ) {

      const learner =
        state.learners[0];


      Maze.renderBestActionArrows(
        learner.qTable,
        document.getElementById(
          'toggle-arrows'
        )?.checked
      );

    } else {

      Maze.renderBestActionArrows(
        {},
        false
      );
    }


    await Animations.delay(
      Math.max(
        10,
        getSpeedDelay() /
          (
            state.agentCount > 1
              ? 5
              : 3
          )
      )
    );


    state.timerId =
      setTimeout(
        () => {

          if (
            state.isTraining
          ) {
            stepSimulation();
          }

        },
        10
      );
  }


  function bindEvents() {

    document
      .querySelectorAll(
        '.tool-btn'
      )
      .forEach(btn => {

        btn.addEventListener(
          'click',
          () =>
            setActiveTool(
              btn.dataset.tool
            )
        );
      });


    const board =
      document.getElementById(
        'maze-board'
      );


    if (board) {

      board.addEventListener(
        'click',
        handleBoardClick
      );
    }


    const startBtn =
      document.getElementById(
        'btn-start-training'
      );

    const playBtn =
      document.getElementById(
        'btn-play'
      );

    const pauseBtn =
      document.getElementById(
        'btn-pause'
      );

    const resetBtn =
      document.getElementById(
        'btn-reset'
      );

    const newMazeBtn =
      document.getElementById(
        'btn-new-maze'
      );

    const infoToggle =
      document.getElementById(
        'btn-info-toggle'
      );

    const infoPanel =
      document.getElementById(
        'panel-info'
      );

    const speedSlider =
      document.getElementById(
        'speed-slider'
      );

    const speedLabel =
      document.getElementById(
        'speed-label'
      );

    const agentCountInput =
      document.getElementById(
        'agent-count'
      );

    const agentCountLabel =
      document.getElementById(
        'agent-count-label'
      );

    const toggleArrows =
      document.getElementById(
        'toggle-arrows'
      );

    const toggleNn =
      document.getElementById(
        'toggle-nn'
      );

    const toggleQtable =
      document.getElementById(
        'toggle-qtable'
      );


    if (startBtn) {

      startBtn.addEventListener(
        'click',
        startEpisode
      );
    }


    if (playBtn) {

      playBtn.addEventListener(
        'click',
        startEpisode
      );
    }


    if (pauseBtn) {

      pauseBtn.addEventListener(
        'click',
        pauseTraining
      );
    }


    if (resetBtn) {

      resetBtn.addEventListener(
        'click',
        () =>
          resetSimulation(true)
      );
    }


    if (newMazeBtn) {

      newMazeBtn.addEventListener(
        'click',
        () =>
          resetSimulation(false)
      );
    }

    if (infoToggle && infoPanel) {

      infoToggle.addEventListener(
        'click',
        () => {
          const isHidden =
            infoPanel.classList.toggle('hidden');

          infoToggle.setAttribute(
            'aria-expanded',
            String(!isHidden)
          );
        }
      );
    }


    if (
      speedSlider &&
      speedLabel
    ) {

      speedSlider.addEventListener(
        'input',
        () => {

          state.speedLevel =
            Number(
              speedSlider.value
            );


          const labels = [
            'Muy lento',
            'Lento',
            'Normal',
            'Rápido',
            'Muy rápido'
          ];


          speedLabel.textContent =
            labels[
              state.speedLevel
            ] ??
            'Normal';
        }
      );
    }


    if (
      agentCountInput &&
      agentCountLabel
    ) {

      agentCountInput.addEventListener(
        'input',
        () => {

          /*
           * Si está entrenando, no
           * modificamos la cantidad.
           */
          if (
            state.isTraining
          ) {
            return;
          }


          state.agentCount =
            Math.max(
              1,
              Math.min(
                8,
                Number(
                  agentCountInput.value
                ) || 1
              )
            );


          agentCountLabel.textContent =
            String(
              state.agentCount
            );


          Maze.setAgentCount(
            state.agentCount
          );


          /*
           * Crear realmente los agentes.
           */
          createAgents();


          renderBoard();

          renderQTable();
        }
      );
    }


    if (toggleArrows) {

      toggleArrows.addEventListener(
        'change',
        renderBoard
      );
    }

    if (toggleNn) {

      toggleNn.addEventListener(
        'change',
        () => {
          document
            .getElementById('panel-nn')
            ?.classList.toggle(
              'panel-hidden',
              !toggleNn.checked
            );
        }
      );
    }

    if (toggleQtable) {

      toggleQtable.addEventListener(
        'change',
        () => {
          document
            .getElementById('panel-qtable')
            ?.classList.toggle(
              'panel-hidden',
              !toggleQtable.checked
            );
        }
      );
    }
  }


  function init() {

    const board =
      document.getElementById(
        'maze-board'
      );


    if (board) {

      Maze.buildDOM(
        board
      );
    }


    Maze.reset();


    Maze.editable =
      true;


    Maze.setAgentCount(
      state.agentCount
    );


    createAgents();


    renderBoard();


    updateEditorValidation();


    NeuralNetworkView.init(
      document.getElementById(
        'nn-svg'
      )
    );


    Metrics.render();


    renderQTable();


    bindEvents();


    setActiveTool(
      state.currentTool
    );


    setTrainingButtons();
  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();
  }

})();
