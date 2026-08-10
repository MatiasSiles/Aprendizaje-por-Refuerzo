/* ========================================================================== 
   main.js
   Punto de entrada del proyecto. Orquesta los módulos del laberinto,
   el agente, Q-Learning, métricas y visualización para que la interfaz
   funcione desde un único lugar.
   ========================================================================== */

(() => {
  const state = {
    currentTool: 'wall',
    isTraining: false,
    timerId: null,
    speedLevel: 2,
  };

  function getSpeedDelay() {
    const delays = [1000, 600, 250, 100, 50];
    return delays[state.speedLevel] ?? 250;
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

  function stepSimulation() {
    if (!state.isTraining) return;

    const result = QLearning.step();
    Metrics.registerStep(result.reward);
    Maze.updateAgentCell(result.prevPos, result.nextPos);
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
      showToast(success ? '¡Meta alcanzada!' : 'Episodio terminado');
      Agent.resetToStart();
      Maze.updateAgentCell(result.nextPos, Agent.pos);
      Metrics.startEpisode();
      Metrics.render();
      updateDecisionBox(null);
      renderQTable();
      renderBoard();
      state.timerId = setTimeout(() => {
        if (state.isTraining) stepSimulation();
      }, getSpeedDelay());
      return;
    }

    state.timerId = setTimeout(() => {
      if (state.isTraining) stepSimulation();
    }, getSpeedDelay());
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

    if (toggleArrows) {
      toggleArrows.addEventListener('change', renderBoard);
    }
  }

  function init() {
    const board = document.getElementById('maze-board');
    if (board) {
      Maze.buildDOM(board);
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
})();
