(function () {
  const IDLE_SRC = "image/luna_game_broom_pose_side.png";
  const MOVE_SRC = "image/luna_game_broom_pose_climb_dive_cat.png";

  const state = {
    running: false,
    y: 39,
    velocity: 0,
    direction: 0,
    lastTime: 0,
    hp: 100,
    mp: 100,
    timeLeft: 90,
    distance: 0,
    totalDistance: 1200,
    speed: 105,
    bgX: 0,
    runId: 0,
  };

  const els = {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cacheElements() {
    els.screen = document.querySelector(".play-screen");
    els.luna = document.querySelector(".play-luna");
    els.up = document.querySelector(".play-up");
    els.down = document.querySelector(".play-down");
    els.bgA = document.querySelector(".play-bg-a");
    els.bgB = document.querySelector(".play-bg-b");
    els.hp = document.querySelector(".play-hp");
    els.mp = document.querySelector(".play-mp");
    els.timer = document.querySelector(".play-timer");
    els.distance = document.querySelector(".play-distance");
    els.progress = document.querySelector(".play-progress");
  }

  function setDirection(direction) {
    state.direction = direction;
    if (!els.luna) return;
    els.luna.src = direction === 0 ? IDLE_SRC : MOVE_SRC;
  }

  function bindHoldButton(button, direction) {
    if (!button) return;

    const start = (event) => {
      event.preventDefault();
      setDirection(direction);
    };
    const stop = () => {
      if (state.direction === direction) setDirection(0);
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("pointerleave", stop);
    button.addEventListener("lostpointercapture", stop);
  }

  function applyLunaPose() {
    if (!els.luna) return;

    const targetAngle = state.direction === -1 ? -10 : state.direction === 1 ? 12 : 0;
    const drift = Math.sin(performance.now() / 420) * 1.4;
    els.luna.style.top = `${state.y}%`;
    els.luna.style.transform = `translateY(-50%) translateY(${drift}px) rotate(${targetAngle}deg)`;
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function applyBackground() {
    const x = state.bgX;
    if (els.bgA) els.bgA.style.transform = `translateX(${x}%)`;
    if (els.bgB) els.bgB.style.transform = `translateX(${x}%)`;
  }

  function updateHud() {
    const progress = clamp((state.distance / state.totalDistance) * 100, 0, 100);
    const remaining = Math.max(0, Math.ceil(state.totalDistance - state.distance));

    if (els.hp) els.hp.style.setProperty("--meter-value", `${clamp(state.hp, 0, 100)}%`);
    if (els.mp) els.mp.style.setProperty("--meter-value", `${clamp(state.mp, 0, 100)}%`);
    if (els.timer) els.timer.textContent = formatTime(state.timeLeft);
    if (els.distance) els.distance.textContent = `${remaining.toLocaleString("ko-KR")}m`;
    if (els.progress) els.progress.style.setProperty("--progress", `${progress}%`);
  }

  function endGame(result) {
    state.running = false;
    state.direction = 0;
    if (els.luna) els.luna.src = result === "success" ? "image/luna_game_success_cat.png" : IDLE_SRC;
    console.log(`[게임 종료] ${result}`, {
      request: document.body.dataset.selectedRequest,
      hp: Math.round(state.hp),
      mp: Math.round(state.mp),
      timeLeft: Math.ceil(state.timeLeft),
      distance: Math.round(state.distance),
    });
  }

  function tick(now) {
    if (!state.running) return;
    const activeRunId = state.runId;

    const dt = Math.min((now - state.lastTime) / 1000 || 0, 0.04);
    state.lastTime = now;

    const acceleration = state.direction * 155;
    state.velocity += acceleration * dt;
    state.velocity *= state.direction === 0 ? 0.88 : 0.94;
    state.velocity = clamp(state.velocity, -42, 42);
    state.y = clamp(state.y + state.velocity * dt, 22, 78);

    if (state.y === 22 || state.y === 78) {
      state.velocity = 0;
    }

    state.timeLeft = Math.max(0, state.timeLeft - dt);
    state.distance = Math.min(state.totalDistance, state.distance + state.speed * dt);
    state.bgX -= state.speed * dt * 0.018;
    if (state.bgX <= -100) state.bgX += 100;

    applyBackground();
    applyLunaPose();
    updateHud();

    if (state.distance >= state.totalDistance) {
      endGame("success");
      return;
    }

    if (state.timeLeft <= 0 || state.hp <= 0) {
      endGame("fail");
      return;
    }

    requestAnimationFrame((nextNow) => {
      if (state.running && state.runId === activeRunId) tick(nextNow);
    });
  }

  function start(requestName) {
    cacheElements();
    state.running = true;
    state.y = 39;
    state.velocity = 0;
    state.direction = 0;
    state.hp = 100;
    state.mp = 100;
    state.timeLeft = 90;
    state.distance = 0;
    state.totalDistance = 1200;
    state.speed = 105;
    state.bgX = 0;
    state.runId += 1;
    state.lastTime = performance.now();
    document.body.dataset.selectedRequest = requestName || "";
    if (els.luna) {
      els.luna.src = IDLE_SRC;
      applyLunaPose();
    }
    applyBackground();
    updateHud();
    const activeRunId = state.runId;
    requestAnimationFrame((now) => {
      if (state.running && state.runId === activeRunId) tick(now);
    });
  }

  function init() {
    cacheElements();
    bindHoldButton(els.up, -1);
    bindHoldButton(els.down, 1);
  }

  document.addEventListener("DOMContentLoaded", init);

  window.WitchGame = {
    start,
    setDirection,
  };
})();
