/* ==========================================================================
   metrics.js
   ¿Qué problema resuelve? Junta los números que ayudan a "ver" el
   aprendizaje (episodios, recompensa, % de éxito, etc.) y dibuja dos
   gráficos simples con <canvas>, sin librerías externas.
   ========================================================================== */

const Metrics = {
  episode: 0,
  stepsThisEpisode: 0,
  rewardThisEpisode: 0,
  wins: 0,
  totalFinished: 0,
  bestSteps: null,

  rewardHistory: [],   // recompensa total de cada episodio terminado
  stepsHistory: [],    // pasos de cada episodio terminado
  successWindow: [],   // últimos N resultados (true/false) para % de éxito
  WINDOW_SIZE: 50,
  MAX_HISTORY: 150,     // cuántos episodios recientes se grafican

  reset() {
    this.episode = 0;
    this.stepsThisEpisode = 0;
    this.rewardThisEpisode = 0;
    this.wins = 0;
    this.totalFinished = 0;
    this.bestSteps = null;
    this.rewardHistory = [];
    this.stepsHistory = [];
    this.successWindow = [];
  },

  startEpisode() {
    this.episode += 1;
    this.stepsThisEpisode = 0;
    this.rewardThisEpisode = 0;
  },

  registerStep(reward) {
    this.stepsThisEpisode += 1;
    this.rewardThisEpisode += reward;
  },

  finishEpisode(success) {
    this.totalFinished += 1;
    if (success) {
      this.wins += 1;
      if (this.bestSteps === null || this.stepsThisEpisode < this.bestSteps) {
        this.bestSteps = this.stepsThisEpisode;
      }
    }
    this.rewardHistory.push(this.rewardThisEpisode);
    this.stepsHistory.push(this.stepsThisEpisode);
    if (this.rewardHistory.length > this.MAX_HISTORY) this.rewardHistory.shift();
    if (this.stepsHistory.length > this.MAX_HISTORY) this.stepsHistory.shift();

    this.successWindow.push(success);
    if (this.successWindow.length > this.WINDOW_SIZE) this.successWindow.shift();
  },

  successRate() {
    if (this.successWindow.length === 0) return 0;
    const wins = this.successWindow.filter(Boolean).length;
    return Math.round((wins / this.successWindow.length) * 100);
  },

  // Actualiza los números en pantalla.
  renderNumbers() {
    document.getElementById('m-episode').textContent = this.episode;
    document.getElementById('m-steps').textContent = this.stepsThisEpisode;
    document.getElementById('m-reward').textContent = this.rewardThisEpisode;
    document.getElementById('m-epsilon').textContent = QLearning.epsilon.toFixed(2);
    document.getElementById('m-alpha').textContent = QLearning.alpha.toFixed(2);
    document.getElementById('m-gamma').textContent = QLearning.gamma.toFixed(2);
    document.getElementById('m-wins').textContent = this.wins;
    document.getElementById('m-success').textContent = `${this.successRate()}%`;
    document.getElementById('m-best').textContent = this.bestSteps === null ? '—' : this.bestSteps;
  },

  // Dibuja un gráfico de línea simple dentro de un <canvas>.
  drawLineChart(canvas, data, color) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (data.length < 2) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 8;

    ctx.beginPath();
    data.forEach((val, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((val - min) / range) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // línea base sutil en cero (si aplica)
    if (min < 0 && max > 0) {
      const zeroY = h - pad - ((0 - min) / range) * (h - pad * 2);
      ctx.beginPath();
      ctx.moveTo(pad, zeroY);
      ctx.lineTo(w - pad, zeroY);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },

  renderCharts() {
    const rewardCanvas = document.getElementById('chart-reward');
    const stepsCanvas = document.getElementById('chart-steps');
    this.drawLineChart(rewardCanvas, this.rewardHistory, '#7c9eff');
    this.drawLineChart(stepsCanvas, this.stepsHistory, '#f5b942');
  },

  render() {
    this.renderNumbers();
    this.renderCharts();
  },
};
