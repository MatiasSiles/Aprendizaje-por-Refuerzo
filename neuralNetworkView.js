/* ==========================================================================
   neuralNetworkView.js
   ¿Qué problema resuelve? Le da al visitante una imagen fácil de entender
   de "el agente observa → procesa → decide", aunque el algoritmo que
   realmente aprende es Q-Learning tabular (no esta red).

   Es puramente decorativo/educativo: no entrena nada ni influye en las
   decisiones reales del agente. Simplemente refleja, con colores y
   animaciones, la información que el agente tiene disponible (su
   posición y qué paredes lo rodean) y qué acción terminó eligiendo.
   ========================================================================== */

const NeuralNetworkView = {
  svg: null,
  inputNodes: [],
  hiddenNodes: [],
  outputNodes: [],
  edges: [], // { from, to, el }

  inputLabels: ['Pos X', 'Pos Y', 'Pared ↑', 'Pared ↓', 'Pared ←', 'Pared →'],
  outputLabels: ['↑', '↓', '←', '→'],

  init(svgEl) {
    this.svg = svgEl;
    this.svg.innerHTML = '';
    this.inputNodes = [];
    this.hiddenNodes = [];
    this.outputNodes = [];
    this.edges = [];

    const ns = 'http://www.w3.org/2000/svg';
    const W = 480, H = 260;
    const nInput = 6, nHidden = 4, nOutput = 4;

    const layerX = { input: 55, hidden: 240, output: 420 };
    const yPositions = (n, topPad = 25, botPad = 25) => {
      const usable = H - topPad - botPad;
      return Array.from({ length: n }, (_, i) => topPad + (usable * i) / (n - 1));
    };

    const inputY = yPositions(nInput);
    const hiddenY = yPositions(nHidden, 45, 45);
    const outputY = yPositions(nOutput, 45, 45);

    const makeNode = (cx, cy) => {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', 11);
      c.setAttribute('class', 'nn-node');
      c.setAttribute('fill', '#2a3350');
      c.setAttribute('stroke', '#3a4460');
      this.svg.appendChild(c);
      return c;
    };

    const makeEdge = (x1, y1, x2, y2) => {
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('class', 'nn-edge');
      l.setAttribute('stroke', '#3a4460');
      l.setAttribute('stroke-width', 1);
      l.setAttribute('stroke-opacity', 0.5);
      this.svg.insertBefore(l, this.svg.firstChild); // detrás de los nodos
      return l;
    };

    const makeLabel = (x, y, text, anchor = 'middle') => {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', x); t.setAttribute('y', y);
      t.setAttribute('text-anchor', anchor);
      t.setAttribute('class', 'nn-label');
      t.textContent = text;
      this.svg.appendChild(t);
    };

    // --- capa de entrada ---
    for (let i = 0; i < nInput; i++) {
      const node = makeNode(layerX.input, inputY[i]);
      this.inputNodes.push(node);
      makeLabel(layerX.input - 18, inputY[i] + 4, this.inputLabels[i], 'end');
    }

    // --- capa oculta ---
    for (let i = 0; i < nHidden; i++) {
      const node = makeNode(layerX.hidden, hiddenY[i]);
      this.hiddenNodes.push(node);
    }

    // --- capa de salida ---
    for (let i = 0; i < nOutput; i++) {
      const node = makeNode(layerX.output, outputY[i]);
      this.outputNodes.push(node);
      makeLabel(layerX.output + 22, outputY[i] + 5, this.outputLabels[i], 'start');
    }

    // --- conexiones entrada -> oculta ---
    for (let i = 0; i < nInput; i++) {
      for (let h = 0; h < nHidden; h++) {
        const edge = makeEdge(layerX.input, inputY[i], layerX.hidden, hiddenY[h]);
        this.edges.push({ from: 'input', fromIdx: i, to: 'hidden', toIdx: h, el: edge });
      }
    }
    // --- conexiones oculta -> salida ---
    for (let h = 0; h < nHidden; h++) {
      for (let o = 0; o < nOutput; o++) {
        const edge = makeEdge(layerX.hidden, hiddenY[h], layerX.output, outputY[o]);
        this.edges.push({ from: 'hidden', fromIdx: h, to: 'output', toIdx: o, el: edge });
      }
    }

    // Encabezados de capa
    makeLabel(layerX.input, 14, 'ENTRADA');
    makeLabel(layerX.hidden, 14, 'CAPA OCULTA');
    makeLabel(layerX.output, 14, 'SALIDA (acción)');
  },

  // Se llama en cada paso del agente para "iluminar" la red según lo que
  // el agente ve (surroundings) y qué acción terminó eligiendo.
  update(pos, surroundings, chosenActionIdx) {
    if (!this.svg) return;

    // Valores de entrada normalizados 0..1 para variar la intensidad del color.
    const inputValues = [
      pos.x / (GRID_SIZE - 1),
      pos.y / (GRID_SIZE - 1),
      surroundings.wallUp ? 1 : 0.15,
      surroundings.wallDown ? 1 : 0.15,
      surroundings.wallLeft ? 1 : 0.15,
      surroundings.wallRight ? 1 : 0.15,
    ];

    this.inputNodes.forEach((node, i) => {
      node.setAttribute('fill', this.colorForValue(inputValues[i]));
    });

    // La capa oculta no representa nada real: la animamos con una
    // activación pseudo-aleatoria suave para transmitir "está procesando".
    this.hiddenNodes.forEach((node) => {
      const v = 0.3 + Math.random() * 0.6;
      node.setAttribute('fill', this.colorForValue(v));
    });

    this.outputNodes.forEach((node, i) => {
      if (i === chosenActionIdx) {
        node.setAttribute('fill', '#7c9eff');
        node.setAttribute('stroke', '#a9c0ff');
      } else {
        node.setAttribute('fill', '#2a3350');
        node.setAttribute('stroke', '#3a4460');
      }
    });

    // Resaltamos el "camino" hacia la acción elegida.
    this.edges.forEach(({ to, toIdx, el }) => {
      if (to === 'output' && toIdx === chosenActionIdx) {
        el.setAttribute('stroke', '#7c9eff');
        el.setAttribute('stroke-opacity', 0.85);
        el.setAttribute('stroke-width', 2);
      } else {
        el.setAttribute('stroke', '#3a4460');
        el.setAttribute('stroke-opacity', 0.35);
        el.setAttribute('stroke-width', 1);
      }
    });
  },

  colorForValue(v) {
    // Interpola entre un gris apagado y el violeta de acento según intensidad.
    const from = [42, 51, 80];   // #2a3350
    const to = [124, 158, 255];  // #7c9eff
    const mix = from.map((c, i) => Math.round(c + (to[i] - c) * v));
    return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
  },
};
