/* global document, window, fetch, EventSource, setTimeout, console */

const STATUS_COLORS = {
  pending: '#4b5563',
  rendered: '#24478d',
  generating: '#d27c3e',
  complete: '#1f8a5a',
  failed: '#c13c34',
};

const STATUS_LABELS = {
  pending: 'Pending',
  rendered: 'Rendered',
  generating: 'Generating',
  complete: 'Complete',
  failed: 'Failed',
};

const state = {
  tiles: new Map(),
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  tileSize: 14,
  selectedId: null,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  panStart: { x: 0, y: 0 },
  filters: {
    pending: true,
    rendered: true,
    generating: true,
    complete: true,
    failed: true,
  },
  generation: {
    status: 'idle',
    lastError: null,
    lastRunAt: null,
  },
};

const canvas = document.getElementById('gridCanvas');
const overlay = document.getElementById('gridOverlay');
const progressStats = document.getElementById('progressStats');
const generatingList = document.getElementById('generatingList');
const queueList = document.getElementById('queueList');
const errorList = document.getElementById('errorList');
const tileDetail = document.getElementById('tileDetail');
const lastUpdate = document.getElementById('lastUpdate');
const liveStatus = document.getElementById('liveStatus');
const startButton = document.getElementById('startBtn');
const pauseButton = document.getElementById('pauseBtn');
const retryButton = document.getElementById('retryBtn');

const ctx = canvas.getContext('2d');

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  renderGrid();
}

function setOverlay(message) {
  if (!message) {
    overlay.style.display = 'none';
  } else {
    overlay.style.display = 'flex';
    overlay.textContent = message;
  }
}

function updateBounds() {
  const tiles = Array.from(state.tiles.values());
  if (tiles.length === 0) {
    return;
  }
  state.minX = Math.min(...tiles.map((tile) => tile.coord.x));
  state.maxX = Math.max(...tiles.map((tile) => tile.coord.x));
  state.minY = Math.min(...tiles.map((tile) => tile.coord.y));
  state.maxY = Math.max(...tiles.map((tile) => tile.coord.y));
}

function centerView() {
  const width = state.maxX - state.minX + 1;
  const height = state.maxY - state.minY + 1;
  const gridWidth = width * state.tileSize * state.zoom;
  const gridHeight = height * state.tileSize * state.zoom;
  const rect = canvas.getBoundingClientRect();
  state.panX = (rect.width - gridWidth) / 2;
  state.panY = (rect.height - gridHeight) / 2;
}

function renderGrid() {
  if (!ctx) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  const tileSize = state.tileSize;
  const width = state.maxX - state.minX + 1;
  const height = state.maxY - state.minY + 1;

  ctx.strokeStyle = 'rgba(90, 83, 74, 0.12)';
  ctx.lineWidth = 1 / state.zoom;

  for (let x = 0; x <= width; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * tileSize, 0);
    ctx.lineTo(x * tileSize, height * tileSize);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * tileSize);
    ctx.lineTo(width * tileSize, y * tileSize);
    ctx.stroke();
  }

  for (const tile of state.tiles.values()) {
    const offsetX = (tile.coord.x - state.minX) * tileSize;
    const offsetY = (tile.coord.y - state.minY) * tileSize;
    const status = tile.status;
    const isVisible = state.filters[status] === true;
    const alpha = isVisible ? 0.95 : 0.12;

    ctx.fillStyle = withAlpha(STATUS_COLORS[status], alpha);
    ctx.fillRect(offsetX + 0.5, offsetY + 0.5, tileSize - 1, tileSize - 1);
  }

  if (state.selectedId && state.tiles.has(state.selectedId)) {
    const tile = state.tiles.get(state.selectedId);
    const offsetX = (tile.coord.x - state.minX) * tileSize;
    const offsetY = (tile.coord.y - state.minY) * tileSize;
    ctx.strokeStyle = '#1f6f6b';
    ctx.lineWidth = 2 / state.zoom;
    ctx.strokeRect(offsetX, offsetY, tileSize, tileSize);
  }

  ctx.restore();
}

function getTileFromCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left - state.panX) / state.zoom;
  const y = (event.clientY - rect.top - state.panY) / state.zoom;

  const tileX = Math.floor(x / state.tileSize) + state.minX;
  const tileY = Math.floor(y / state.tileSize) + state.minY;

  const id = `tile_${tileX}_${tileY}`;
  return state.tiles.get(id) || null;
}

function updateDetail(tile) {
  if (!tile) {
    tileDetail.innerHTML = '<p class="subtext">Click a tile to see metadata.</p>';
    return;
  }

  tileDetail.innerHTML = [
    '<div class="detail-row"><span class="detail-label">Tile</span><span>' +
      tile.id +
      '</span></div>',
    '<div class="detail-row"><span class="detail-label">Status</span><span>' +
      STATUS_LABELS[tile.status] +
      '</span></div>',
    '<div class="detail-row"><span class="detail-label">Bounds</span><span>' +
      `${tile.bounds.north.toFixed(4)}, ${tile.bounds.west.toFixed(4)}` +
      '</span></div>',
    '<div class="detail-row"><span class="detail-label">Updated</span><span>' +
      new Date(tile.updatedAt).toLocaleString() +
      '</span></div>',
  ].join('');
}

function updateProgress(stats) {
  for (const [key, value] of Object.entries(stats)) {
    const target = progressStats.querySelector(`[data-stat="${key}"]`);
    if (!target) {
      continue;
    }

    if (key === 'rate') {
      target.textContent = value;
    } else if (key === 'eta') {
      target.textContent = value;
    } else {
      target.textContent = value.toLocaleString();
    }
  }
}

function formatRate(ratePerHour) {
  if (!ratePerHour || ratePerHour <= 0) {
    return 'n/a';
  }
  return `${ratePerHour.toFixed(1)}/hr`;
}

function formatEta(etaMinutes) {
  if (etaMinutes === null || etaMinutes === undefined) {
    return 'n/a';
  }
  if (etaMinutes < 60) {
    return `${etaMinutes} min`;
  }
  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function refreshLists() {
  const tiles = Array.from(state.tiles.values());

  const generating = tiles
    .filter((tile) => tile.status === 'generating')
    .slice(0, 6);
  generatingList.innerHTML = '';
  if (generating.length === 0) {
    generatingList.innerHTML = '<li><span>No active tiles</span></li>';
  } else {
    for (const tile of generating) {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${tile.id}</strong><span>${tile.coord.x}, ${tile.coord.y}</span>`;
      generatingList.appendChild(item);
    }
  }

  const pending = tiles
    .filter((tile) => tile.status === 'pending')
    .sort((a, b) => (a.coord.y - b.coord.y) || (a.coord.x - b.coord.x))
    .slice(0, 8);

  queueList.innerHTML = '';
  if (pending.length === 0) {
    queueList.innerHTML = '<li><span>Queue is clear</span></li>';
  } else {
    for (const tile of pending) {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${tile.id}</strong><span>${tile.coord.x}, ${tile.coord.y}</span>`;
      queueList.appendChild(item);
    }
  }
}

function updateLastUpdate(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  lastUpdate.textContent = `Last update: ${date.toLocaleString()}`;
}

function updateLiveStatus() {
  const status = state.generation.status;
  if (!liveStatus) {
    return;
  }
  if (status === 'running') {
    liveStatus.textContent = 'Running';
    liveStatus.classList.add('running');
  } else if (status === 'stopping') {
    liveStatus.textContent = 'Stopping';
    liveStatus.classList.add('running');
  } else {
    liveStatus.textContent = 'Idle';
    liveStatus.classList.remove('running');
  }
}

function updateControlButtons() {
  const isRunning = state.generation.status === 'running';
  const isStopping = state.generation.status === 'stopping';
  const hasFailed = Array.from(state.tiles.values()).some((tile) => tile.status === 'failed');

  if (startButton) {
    startButton.disabled = isRunning || isStopping;
  }
  if (pauseButton) {
    pauseButton.disabled = !isRunning;
  }
  if (retryButton) {
    retryButton.disabled = isRunning || isStopping || !hasFailed;
  }
}

function setGenerationState(nextState) {
  state.generation = {
    status: nextState.status ?? 'idle',
    lastError: nextState.lastError ?? null,
    lastRunAt: nextState.lastRunAt ?? null,
  };
  updateLiveStatus();
  updateControlButtons();
  if (state.generation.lastError) {
    addError({ tileId: 'generation', message: state.generation.lastError });
  }
}

function addError(error) {
  if (!error) {
    return;
  }
  const item = document.createElement('li');
  item.innerHTML = `<strong>${error.tileId}</strong><span>${error.message}</span>`;
  errorList.prepend(item);

  while (errorList.children.length > 6) {
    errorList.removeChild(errorList.lastChild);
  }
}

async function fetchTile(tileId) {
  const response = await fetch(`/api/tiles/${tileId}`);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function fetchGenerationState() {
  try {
    const response = await fetch('/api/generate/status');
    if (!response.ok) {
      return;
    }
    const status = await response.json();
    setGenerationState(status);
  } catch (error) {
    console.error(error);
  }
}

function normalizeTile(tile) {
  return {
    ...tile,
    createdAt: tile.createdAt ? new Date(tile.createdAt) : new Date(),
    updatedAt: tile.updatedAt ? new Date(tile.updatedAt) : new Date(),
  };
}

async function loadTiles() {
  try {
    const response = await fetch('/api/tiles');
    if (!response.ok) {
      throw new Error('Failed to load tiles');
    }
    const tiles = await response.json();
    state.tiles.clear();
    for (const tile of tiles) {
      const normalized = normalizeTile(tile);
      state.tiles.set(normalized.id, normalized);
    }
    updateBounds();
    centerView();
    resizeCanvas();
    refreshLists();
    updateControlButtons();
    renderGrid();
    setOverlay('');
  } catch (error) {
    setOverlay('Unable to load tiles.');
    console.error(error);
  }
}

async function loadProgress() {
  try {
    const response = await fetch('/api/progress');
    if (!response.ok) {
      return;
    }
    const progress = await response.json();
    updateProgress({
      total: progress.total,
      complete: progress.complete,
      pending: progress.pending,
      rendered: progress.rendered,
      generating: progress.generating,
      failed: progress.failed,
      rate: formatRate(progress.ratePerHour),
      eta: formatEta(progress.etaMinutes),
    });
  } catch (error) {
    console.error(error);
  }
}

async function startGeneration() {
  try {
    const response = await fetch('/api/generate/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const payload = await response.json();
      addError({ tileId: 'generation', message: payload.error || 'Failed to start' });
      return;
    }
    const status = await response.json();
    setGenerationState(status);
  } catch (error) {
    console.error(error);
  }
}

async function pauseGeneration() {
  try {
    const response = await fetch('/api/generate/pause', { method: 'POST' });
    if (!response.ok) {
      const payload = await response.json();
      addError({ tileId: 'generation', message: payload.error || 'Failed to pause' });
      return;
    }
    const status = await response.json();
    setGenerationState(status);
  } catch (error) {
    console.error(error);
  }
}

function pickFailedTile() {
  if (state.selectedId) {
    const selected = state.tiles.get(state.selectedId);
    if (selected && selected.status === 'failed') {
      return selected.id;
    }
  }
  const failed = Array.from(state.tiles.values()).find((tile) => tile.status === 'failed');
  return failed ? failed.id : null;
}

async function retryFailed() {
  const tileId = pickFailedTile();
  if (!tileId) {
    return;
  }
  try {
    const response = await fetch(`/api/generate/retry/${tileId}`, { method: 'POST' });
    if (!response.ok) {
      const payload = await response.json();
      addError({ tileId, message: payload.error || 'Failed to retry' });
      return;
    }
    const status = await response.json();
    setGenerationState(status);
  } catch (error) {
    console.error(error);
  }
}

function connectEvents() {
  const source = new EventSource('/api/events');

  source.onmessage = async (event) => {
    if (!event.data) {
      return;
    }

    const update = JSON.parse(event.data);
    updateLastUpdate(update.timestamp);

    if (update.type === 'progress' && update.progress) {
      updateProgress({
        total: update.progress.total,
        complete: update.progress.complete,
        pending: update.progress.pending,
        rendered: update.progress.rendered,
        generating: update.progress.generating,
        failed: update.progress.failed,
        rate: formatRate(update.progress.ratePerHour),
        eta: formatEta(update.progress.etaMinutes),
      });
      return;
    }

    if (update.type === 'tile_status' && update.tileId) {
      if (!state.tiles.has(update.tileId)) {
        const tile = await fetchTile(update.tileId);
        if (tile) {
          state.tiles.set(tile.id, normalizeTile(tile));
          updateBounds();
        }
      } else {
        const tile = state.tiles.get(update.tileId);
        tile.status = update.status;
        tile.updatedAt = new Date(update.timestamp);
      }
      refreshLists();
      updateControlButtons();
      renderGrid();
      if (state.selectedId === update.tileId) {
        updateDetail(state.tiles.get(update.tileId));
      }
    }

    if (update.type === 'error') {
      addError(update.error);
    }
  };

  source.onerror = () => {
    source.close();
    setTimeout(connectEvents, 2000);
  };
}

function setupFilters() {
  document.querySelectorAll('input[data-status]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const target = event.target;
      const status = target.dataset.status;
      state.filters[status] = target.checked;
      renderGrid();
    });
  });
}

function setupCanvasInteractions() {
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) {
      return;
    }
    state.isDragging = true;
    state.dragStart = { x: event.clientX, y: event.clientY };
    state.panStart = { x: state.panX, y: state.panY };
  });

  window.addEventListener('mouseup', () => {
    state.isDragging = false;
  });

  window.addEventListener('mousemove', (event) => {
    if (!state.isDragging) {
      return;
    }
    state.panX = state.panStart.x + (event.clientX - state.dragStart.x);
    state.panY = state.panStart.y + (event.clientY - state.dragStart.y);
    renderGrid();
  });

  canvas.addEventListener('click', (event) => {
    const tile = getTileFromCanvas(event);
    if (!tile) {
      return;
    }
    state.selectedId = tile.id;
    updateDetail(tile);
    renderGrid();
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoomDelta = event.deltaY < 0 ? 1.08 : 0.92;
    const nextZoom = Math.min(Math.max(state.zoom * zoomDelta, 0.4), 5);

    const worldX = (mouseX - state.panX) / state.zoom;
    const worldY = (mouseY - state.panY) / state.zoom;

    state.zoom = nextZoom;
    state.panX = mouseX - worldX * state.zoom;
    state.panY = mouseY - worldY * state.zoom;

    renderGrid();
  }, { passive: false });
}

function setupZoomButtons() {
  document.getElementById('zoomIn').addEventListener('click', () => {
    state.zoom = Math.min(state.zoom * 1.2, 5);
    renderGrid();
  });

  document.getElementById('zoomOut').addEventListener('click', () => {
    state.zoom = Math.max(state.zoom * 0.8, 0.4);
    renderGrid();
  });

  document.getElementById('resetView').addEventListener('click', () => {
    state.zoom = 1;
    centerView();
    renderGrid();
  });
}

async function init() {
  resizeCanvas();
  setOverlay('Loading tiles...');
  setupFilters();
  setupCanvasInteractions();
  setupZoomButtons();
  if (startButton) {
    startButton.addEventListener('click', () => {
      void startGeneration();
    });
  }
  if (pauseButton) {
    pauseButton.addEventListener('click', () => {
      void pauseGeneration();
    });
  }
  if (retryButton) {
    retryButton.addEventListener('click', () => {
      void retryFailed();
    });
  }
  await loadTiles();
  await loadProgress();
  await fetchGenerationState();
  connectEvents();
}

window.addEventListener('resize', () => {
  resizeCanvas();
  centerView();
  renderGrid();
});

init();
