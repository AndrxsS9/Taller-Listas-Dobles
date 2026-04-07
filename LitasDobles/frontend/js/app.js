"use strict";

const API_BASE = "http://localhost:5000/api";
const POLL_INTERVAL_MS = 5000;
const MAX_SEISMO_POINTS = 350;

const state = {
  direction: "asc",
  layers: [],
  events: [],
  seismoPoints: [],
  seismoBaseY: 0,
  animFrameId: null,
  pollTimerId: null,
  knownEventIds: new Set(),
};

const $ = (id) => document.getElementById(id);
const dom = {
  statusDot:           $("status-dot"),
  statusText:          $("status-text"),
  statLayersVal:       $("stat-layers-val"),
  statEventsVal:       $("stat-events-val"),
  statMaxVal:          $("stat-max-val"),
  linkedListCont:      $("linked-list-container"),
  traverseBadge:       document.querySelector(".traverse-badge"),
  toggleDir:           $("btn-toggle-direction"),
  crossSection:        $("cross-section"),
  seismoCanvas:        $("seismograph-canvas"),
  eventsTbody:         $("events-tbody"),
  eventsCountBadge:    $("events-count-badge"),
  layerForm:           $("layer-form"),
  layerName:           $("layer-name"),
  layerDepth:          $("layer-depth"),
  layerThickness:      $("layer-thickness"),
  layerRock:           $("layer-rock"),
  layerDensity:        $("layer-density"),
  layerVelocity:       $("layer-velocity"),
  layerDesc:           $("layer-desc"),
  layerFeedback:       $("layer-feedback"),
  eventForm:           $("event-form"),
  eventLayer:          $("event-layer"),
  eventMagRange:       $("event-magnitude-range"),
  eventMagLabel:       $("event-magnitude-label"),
  eventMagClass:       $("event-mag-class"),
  eventMagHidden:      $("event-magnitude"),
  eventDepth:          $("event-depth"),
  eventWave:           $("event-wave"),
  eventLat:            $("event-lat"),
  eventLon:            $("event-lon"),
  eventFeedback:       $("event-feedback"),
  simulationScenarios: $("simulation-scenarios"),
  simulationResult:    $("simulation-result"),
  simResultName:       $("sim-result-name"),
  simResultEvents:     $("sim-result-events"),
  btnClearSeismo:      $("btn-clear-seismo"),
  toastContainer:      $("toast-container"),
};

const ctx = dom.seismoCanvas.getContext("2d");

function resizeCanvas() {
  const rect = dom.seismoCanvas.getBoundingClientRect();
  dom.seismoCanvas.width  = rect.width  * window.devicePixelRatio;
  dom.seismoCanvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  state.seismoBaseY = rect.height / 2;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function toast(message, type = "info", duration = 3500) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  el.innerHTML = `<span>${icons[type] || "📢"}</span><span>${message}</span>`;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add("hide");
    el.addEventListener("animationend", () => el.remove());
  }, duration);
}

function setFeedback(el, message, type) {
  el.textContent = message;
  el.className = `form-feedback ${type}`;
  if (type === "success") {
    setTimeout(() => { el.textContent = ""; el.className = "form-feedback"; }, 3000);
  }
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "Z");
    return d.toLocaleTimeString("es-CO", { hour12: false });
  } catch { return iso.slice(11, 19); }
}

function magnitudeClass(mag) {
  if (mag < 2.0) return "Micro";
  if (mag < 4.0) return "Menor";
  if (mag < 5.0) return "Ligero";
  if (mag < 6.0) return "Moderado";
  if (mag < 7.0) return "Fuerte";
  if (mag < 8.0) return "Mayor";
  return "Gran terremoto";
}

function magnitudeColor(mag) {
  if (mag < 2.0) return "#4ade80";
  if (mag < 4.0) return "#a3e635";
  if (mag < 5.0) return "#facc15";
  if (mag < 6.0) return "#fb923c";
  if (mag < 7.0) return "#f87171";
  if (mag < 8.0) return "#dc2626";
  return "#7c3aed";
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function refreshStats() {
  try {
    const data = await apiFetch("/stats");
    dom.statLayersVal.textContent = data.total_layers ?? "—";
    dom.statEventsVal.textContent = data.total_events ?? "—";
    dom.statMaxVal.textContent    = data.max_magnitude != null
      ? `M ${data.max_magnitude.toFixed(1)}` : "—";
    setOnline(true);
  } catch {
    setOnline(false);
  }
}

function setOnline(online) {
  dom.statusDot.className    = `status-indicator ${online ? "online" : "offline"}`;
  dom.statusText.textContent = online ? "Servidor activo" : "Sin conexión";
}

async function populateRockTypes() {
  try {
    const data = await apiFetch("/rock-types");
    dom.layerRock.innerHTML = '<option value="" disabled selected>Seleccionar tipo…</option>';
    data.rock_types.forEach((rt) => {
      const opt = document.createElement("option");
      opt.value = rt;
      opt.textContent = rt;
      dom.layerRock.appendChild(opt);
    });
  } catch {}
}

async function populateWaveTypes() {
  try {
    const data = await apiFetch("/wave-types");
    dom.eventWave.innerHTML = '<option value="" disabled selected>Onda…</option>';
    data.wave_types.forEach((wt) => {
      const opt = document.createElement("option");
      opt.value = wt;
      opt.textContent = wt;
      dom.eventWave.appendChild(opt);
    });
  } catch {}
}

function populateLayerSelect(layers) {
  const current = dom.eventLayer.value;
  dom.eventLayer.innerHTML = '<option value="" disabled selected>Seleccionar capa…</option>';
  layers.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.name;
    opt.textContent = `${l.name} (${l.depth_km} km)`;
    if (l.name === current) opt.selected = true;
    dom.eventLayer.appendChild(opt);
  });
}

const SCENARIO_ICONS = ["🟢", "🟡", "🟠", "🔴"];
const SCENARIO_DESCS = [
  "M 1.0 – 3.0 · 3 eventos aleatorios",
  "M 3.0 – 5.5 · 2 eventos aleatorios",
  "M 5.5 – 7.0 · 1 evento aleatorio",
  "M 7.0 – 9.5 · 1 evento catastrófico",
];

async function loadSimulationScenarios() {
  try {
    const data = await apiFetch("/simulate/scenarios");
    dom.simulationScenarios.innerHTML = "";
    data.scenarios.forEach((sc) => {
      const btn = document.createElement("button");
      btn.className = "btn-scenario";
      btn.id = `scenario-btn-${sc.index}`;
      btn.setAttribute("aria-label", `Simular escenario: ${sc.label}`);
      btn.innerHTML = `
        <span class="scenario-icon">${SCENARIO_ICONS[sc.index] ?? "⚡"}</span>
        <span class="scenario-info">
          <span class="scenario-label">${sc.label}</span>
          <span class="scenario-desc">${SCENARIO_DESCS[sc.index] ?? ""}</span>
        </span>`;
      btn.addEventListener("click", () => runSimulation(sc.index));
      dom.simulationScenarios.appendChild(btn);
    });
  } catch {
    dom.simulationScenarios.innerHTML = `<p style="color:var(--text-muted);font-size:.8rem;padding:8px 0">Sin escenarios disponibles.</p>`;
  }
}

async function runSimulation(index) {
  const btn = $(`scenario-btn-${index}`);
  if (btn) { btn.disabled = true; btn.style.opacity = "0.6"; }
  try {
    const data = await apiFetch("/simulate", {
      method: "POST",
      body: JSON.stringify({ scenario_index: index }),
    });
    dom.simulationResult.hidden = false;
    dom.simResultName.textContent   = data.scenario ?? "Escenario ejecutado";
    dom.simResultEvents.textContent = `${data.events_generated ?? 0} evento(s) generado(s)`;
    (data.events || []).forEach((ev) => {
      pushSeismoPoint(ev.magnitude, ev.risk_color);
    });
    toast(`Simulación "${data.scenario}" completada — ${data.events_generated} evento(s)`, "success");
    await refreshAll();
  } catch (err) {
    toast(`Error al simular: ${err.message}`, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = "1"; }
  }
}

async function fetchLayers() {
  const data = await apiFetch(`/layers?direction=${state.direction}`);
  state.layers = data.layers || [];
  return state.layers;
}

async function fetchListStructure() {
  const data = await apiFetch("/layers/structure");
  return data.structure || [];
}

async function refreshLayersPanel() {
  try {
    const [layers, structure] = await Promise.all([fetchLayers(), fetchListStructure()]);
    renderLinkedList(structure);
    renderCrossSection(layers);
    populateLayerSelect(layers);
  } catch (err) {
    dom.linkedListCont.innerHTML = `<div class="list-loading" style="color:var(--accent-red)">Error al cargar capas: ${err.message}</div>`;
  }
}

function renderLinkedList(structure) {
  if (!structure.length) {
    dom.linkedListCont.innerHTML = `<div class="list-loading">No hay capas en la lista.</div>`;
    return;
  }
  const isDesc = state.direction === "desc";
  dom.traverseBadge.textContent = isDesc ? "Núcleo → Superficie" : "Superficie → Núcleo";
  const frag = document.createDocumentFragment();
  structure.forEach((node, i) => {
    if (i > 0) {
      const arrow = document.createElement("div");
      arrow.className = "list-arrow";
      arrow.innerHTML = `
        <span class="arrow-prev">← prev</span>
        <span style="color:var(--text-muted)">|</span>
        <span class="arrow-next">next →</span>`;
      frag.appendChild(arrow);
    }
    const card = document.createElement("div");
    card.className = "node-card";
    card.id = `node-card-${encodeURIComponent(node.name)}`;
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", `Capa: ${node.name}`);
    const eventBadgeClass = node.event_count > 0 ? "has-events" : "";
    const eventBadgeText  = node.event_count > 0 ? `${node.event_count} evento(s)` : "Sin eventos";
    card.innerHTML = `
      <div class="node-top">
        <div class="node-color-bar" style="background:${node.color}"></div>
        <div class="node-info">
          <div class="node-name">${node.name}</div>
          <div class="node-meta">${node.depth_km} km · ${node.rock_type}</div>
        </div>
        <span class="node-badge ${eventBadgeClass}">${eventBadgeText}</span>
      </div>
      <div class="node-pointers">
        <span class="pointer-tag ${node.has_prev ? "active" : ""}">⬆ prev: ${node.prev_name ? node.prev_name.split(" ")[0] : "NULL"}</span>
        <span class="pointer-tag ${node.has_next ? "active" : ""}">⬇ next: ${node.next_name ? node.next_name.split(" ")[0] : "NULL"}</span>
      </div>
      <button class="node-btn-delete" data-layer="${node.name}" title="Eliminar capa" aria-label="Eliminar capa ${node.name}">🗑</button>`;
    card.querySelector(".node-btn-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteLayer(node.name);
    });
    frag.appendChild(card);
  });
  dom.linkedListCont.innerHTML = "";
  dom.linkedListCont.appendChild(frag);
}

function renderCrossSection(layers) {
  if (!layers.length) { dom.crossSection.innerHTML = ""; return; }
  dom.crossSection.innerHTML = "";
  const totalThickness = layers.reduce((s, l) => s + (l.thickness_km || 1), 0);
  layers.forEach((l) => {
    const pct = Math.max(2, ((l.thickness_km || 1) / totalThickness) * 100);
    const div = document.createElement("div");
    div.className = "cross-layer";
    div.style.cssText = `flex: 0 0 ${pct}%; background: ${l.color}cc;`;
    div.title = `${l.name} · ${l.depth_km}–${l.bottom_depth_km} km`;
    div.innerHTML = `<span class="cross-layer-label">${l.name}</span>`;
    dom.crossSection.appendChild(div);
  });
}

async function deleteLayer(name) {
  if (!confirm(`¿Eliminar la capa "${name}" de la lista doblemente enlazada?`)) return;
  try {
    await apiFetch(`/layers/${encodeURIComponent(name)}`, { method: "DELETE" });
    toast(`Capa "${name}" eliminada de la lista.`, "warning");
    await refreshAll();
  } catch (err) {
    toast(`Error al eliminar: ${err.message}`, "error");
  }
}

dom.layerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name:            dom.layerName.value.trim(),
    depth_km:        parseFloat(dom.layerDepth.value),
    thickness_km:    parseFloat(dom.layerThickness.value),
    rock_type:       dom.layerRock.value,
    density_g_cm3:   parseFloat(dom.layerDensity.value),
    p_wave_velocity: parseFloat(dom.layerVelocity.value),
    description:     dom.layerDesc.value.trim(),
  };
  if (!payload.name || !payload.rock_type || isNaN(payload.depth_km)) {
    setFeedback(dom.layerFeedback, "Por favor completa todos los campos requeridos.", "error");
    return;
  }
  try {
    const $btn = $("btn-add-layer");
    $btn.textContent = "Agregando…";
    $btn.disabled = true;
    await apiFetch("/layers", { method: "POST", body: JSON.stringify(payload) });
    setFeedback(dom.layerFeedback, `✅ Capa "${payload.name}" insertada en la lista.`, "success");
    dom.layerForm.reset();
    toast(`Capa "${payload.name}" agregada.`, "success");
    await refreshAll();
  } catch (err) {
    setFeedback(dom.layerFeedback, `❌ ${err.message}`, "error");
  } finally {
    const $btn = $("btn-add-layer");
    $btn.textContent = "Agregar Capa";
    $btn.disabled = false;
  }
});

dom.toggleDir.addEventListener("click", async () => {
  state.direction = state.direction === "asc" ? "desc" : "asc";
  await refreshLayersPanel();
});

async function refreshEvents() {
  try {
    const data = await apiFetch("/events");
    state.events = data.events || [];
    renderEventsTable(state.events);
  } catch {}
}

function renderEventsTable(events) {
  dom.eventsCountBadge.textContent = `${events.length} eventos`;
  if (!events.length) {
    dom.eventsTbody.innerHTML = `<tr class="no-events-row"><td colspan="8">No hay eventos registrados aún.</td></tr>`;
    return;
  }
  const frag = document.createDocumentFragment();
  events.slice(0, 80).forEach((ev) => {
    const isNew = !state.knownEventIds.has(ev.event_id);
    if (isNew) state.knownEventIds.add(ev.event_id);
    const tr = document.createElement("tr");
    if (isNew) tr.classList.add("new-event-row");
    const mag = parseFloat(ev.magnitude);
    const color = ev.risk_color || magnitudeColor(mag);
    tr.innerHTML = `
      <td><code style="font-size:.7rem;color:var(--text-muted)">${ev.event_id}</code></td>
      <td><span class="mag-badge" style="background:${color}22;color:${color}">M ${mag.toFixed(1)}</span></td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis">${ev.layer_name}</td>
      <td><code style="font-size:.72rem;color:var(--text-code)">${ev.wave_type}</code></td>
      <td style="font-family:var(--font-mono);font-size:.73rem">${parseFloat(ev.depth_km).toFixed(1)}</td>
      <td><span class="risk-badge" style="color:${color}">${ev.risk_classification}</span></td>
      <td class="time-cell">${formatTime(ev.timestamp)}</td>
      <td><button class="btn-delete-event" data-id="${ev.event_id}" title="Eliminar evento" aria-label="Eliminar evento ${ev.event_id}">🗑</button></td>`;
    tr.querySelector(".btn-delete-event").addEventListener("click", () => deleteEvent(ev.event_id));
    frag.appendChild(tr);
  });
  dom.eventsTbody.innerHTML = "";
  dom.eventsTbody.appendChild(frag);
}

async function deleteEvent(eventId) {
  if (!confirm(`¿Eliminar el evento ${eventId}?`)) return;
  try {
    await apiFetch(`/events/${eventId}`, { method: "DELETE" });
    state.knownEventIds.delete(eventId);
    toast(`Evento ${eventId} eliminado.`, "warning");
    await refreshAll();
  } catch (err) {
    toast(`Error al eliminar evento: ${err.message}`, "error");
  }
}

dom.eventMagRange.addEventListener("input", () => {
  const val = parseFloat(dom.eventMagRange.value);
  dom.eventMagLabel.textContent = val.toFixed(1);
  dom.eventMagHidden.value      = val;
  dom.eventMagClass.textContent = magnitudeClass(val);
  dom.eventMagClass.style.color = magnitudeColor(val);
});

dom.eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    layer_name: dom.eventLayer.value,
    magnitude:  parseFloat(dom.eventMagHidden.value),
    depth_km:   parseFloat(dom.eventDepth.value),
    wave_type:  dom.eventWave.value,
    latitude:   parseFloat(dom.eventLat.value),
    longitude:  parseFloat(dom.eventLon.value),
  };
  if (!payload.layer_name || !payload.wave_type || isNaN(payload.depth_km)) {
    setFeedback(dom.eventFeedback, "Por favor completa todos los campos.", "error");
    return;
  }
  try {
    const $btn = $("btn-register-event");
    $btn.textContent = "Registrando…";
    $btn.disabled = true;
    await apiFetch("/events", { method: "POST", body: JSON.stringify(payload) });
    setFeedback(dom.eventFeedback, `✅ Evento M${payload.magnitude.toFixed(1)} registrado en "${payload.layer_name}".`, "success");
    pushSeismoPoint(payload.magnitude, magnitudeColor(payload.magnitude));
    toast(`Evento sísmico M${payload.magnitude.toFixed(1)} registrado.`, "success");
    await refreshAll();
  } catch (err) {
    setFeedback(dom.eventFeedback, `❌ ${err.message}`, "error");
  } finally {
    const $btn = $("btn-register-event");
    $btn.textContent = "Registrar Evento";
    $btn.disabled = false;
  }
});

function pushSeismoPoint(magnitude, color) {
  const spike = Math.max(0.02, magnitude / 10);
  const points = [0, spike * 0.3, spike, spike * 0.5, -spike * 0.6, -spike * 0.2, 0, 0];
  points.forEach((v) => {
    state.seismoPoints.push({ value: v, color });
  });
  while (state.seismoPoints.length > MAX_SEISMO_POINTS) state.seismoPoints.shift();
}

function drawSeismograph() {
  const canvas = dom.seismoCanvas;
  const w = canvas.width  / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  const baseY = h / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#060a10";
  ctx.fillRect(0, 0, w, h);

  ctx.beginPath();
  ctx.strokeStyle = "rgba(56,139,253,0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.moveTo(0, baseY);
  ctx.lineTo(w, baseY);
  ctx.stroke();
  ctx.setLineDash([]);

  [0.25, 0.5, 0.75].forEach((f) => {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.moveTo(0, baseY - baseY * f);
    ctx.lineTo(w, baseY - baseY * f);
    ctx.moveTo(0, baseY + baseY * f);
    ctx.lineTo(w, baseY + baseY * f);
    ctx.stroke();
  });

  if (!state.seismoPoints.length) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(32,213,178,0.4)";
    ctx.lineWidth = 1.5;
    for (let x = 0; x < w; x++) {
      const y = baseY + Math.sin(x * 0.12 + Date.now() * 0.001) * 2 + (Math.random() - 0.5) * 1.5;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    return;
  }

  const pts = state.seismoPoints;
  const step = w / MAX_SEISMO_POINTS;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.lineCap  = "round";
  let prevColor = null;
  ctx.beginPath();
  pts.forEach((pt, i) => {
    const x = i * step;
    const y = baseY - pt.value * (baseY * 0.9);
    if (pt.color !== prevColor) {
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = pt.color;
      ctx.moveTo(x, y);
      prevColor = pt.color;
    } else {
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  const last = pts[pts.length - 1];
  if (last) {
    const x = (pts.length - 1) * step;
    const y = baseY - last.value * (baseY * 0.9);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = last.color;
    ctx.shadowColor = last.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  state.animFrameId = requestAnimationFrame(drawSeismograph);
}

function startSeismograph() {
  if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
  const addIdleNoise = () => {
    if (state.seismoPoints.length < 30) {
      for (let i = 0; i < 5; i++) {
        state.seismoPoints.push({ value: (Math.random() - 0.5) * 0.015, color: "#20d5b233" });
      }
    }
    setTimeout(addIdleNoise, 200);
  };
  addIdleNoise();
  drawSeismograph();
}

dom.btnClearSeismo.addEventListener("click", () => {
  state.seismoPoints = [];
  toast("Sismógrafo limpiado.", "info", 2000);
});

async function refreshAll() {
  await Promise.all([
    refreshStats(),
    refreshLayersPanel(),
    refreshEvents(),
  ]);
}

function startPolling() {
  state.pollTimerId = setInterval(async () => {
    const prevCount = state.events.length;
    await refreshEvents();
    await refreshStats();
    if (state.events.length > prevCount) {
      const newEvs = state.events.slice(0, state.events.length - prevCount);
      newEvs.forEach((ev) => pushSeismoPoint(ev.magnitude, ev.risk_color || magnitudeColor(ev.magnitude)));
    }
  }, POLL_INTERVAL_MS);
}

async function init() {
  await Promise.all([populateRockTypes(), populateWaveTypes(), loadSimulationScenarios()]);
  dom.eventMagClass.textContent = magnitudeClass(parseFloat(dom.eventMagRange.value));
  dom.eventMagClass.style.color = magnitudeColor(parseFloat(dom.eventMagRange.value));
  await refreshAll();
  startSeismograph();
  startPolling();
}

init().catch(console.error);
