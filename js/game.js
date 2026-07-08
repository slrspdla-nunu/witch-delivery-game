(function () {
  const IDLE_SRC = "image/luna_game_broom_pose_side.png";
  const MOVE_SRC = "image/luna_game_broom_pose_climb_dive_cat.png";
  const LEFT_BOUNDARY = 6;
  const RIGHT_BOUNDARY = 34;
  const PASSIVE_BACK_DRIFT = 12;

  const state = {
    running: false,
    paused: false,
    x: 11,
    y: 39,
    xVelocity: 0,
    velocity: 0,
    horizontalDirection: 0,
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
    dragStartX: 0,
    dragPointerId: null,
  };

  const els = {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cacheElements() {
    els.screen = document.querySelector(".play-screen");
    els.stage = document.querySelector(".play-stage");
    els.luna = document.querySelector(".play-luna");
    els.up = document.querySelector(".play-up");
    els.down = document.querySelector(".play-down");
    els.back = document.querySelector(".play-back");
    els.front = document.querySelector(".play-front");
    els.bg = document.querySelector(".play-bg-panorama");
    els.hp = document.querySelector(".play-hp");
    els.mp = document.querySelector(".play-mp");
    els.hpValue = document.querySelector(".play-hp-value");
    els.mpValue = document.querySelector(".play-mp-value");
    els.timer = document.querySelector(".play-timer-value");
    els.distance = document.querySelector(".play-distance-value");
    els.pause = document.querySelector(".play-pause");
    els.progress = document.querySelector(".play-progress");
  }

  function setDirection(direction) {
    state.direction = direction;
    if (!els.luna) return;
    els.luna.src = direction === 0 ? IDLE_SRC : MOVE_SRC;
    syncDirectionButtonImages();
  }

  function setHorizontalDirection(direction) {
    state.horizontalDirection = direction;
    syncHorizontalButtonImages();
  }

  function setControlButtonImage(button, pressed) {
    if (!button) return;
    const img = button.querySelector("img");
    if (!img) return;

    const idleSrc = button.dataset.idleSrc;
    const pressedSrc = button.dataset.pressedSrc;
    const nextSrc = pressed && pressedSrc ? pressedSrc : idleSrc;
    if (nextSrc && img.getAttribute("src") !== nextSrc) {
      img.setAttribute("src", nextSrc);
    }

    img.classList.toggle("is-rotated-control", !pressed && button.dataset.idleRotate === "true");
    img.classList.toggle("is-pressed-control", pressed);
  }

  function syncDirectionButtonImages() {
    setControlButtonImage(els.up, state.direction === -1);
    setControlButtonImage(els.down, state.direction === 1);
  }

  function syncHorizontalButtonImages() {
    setControlButtonImage(els.back, state.horizontalDirection === -1);
    setControlButtonImage(els.front, state.horizontalDirection === 1);
  }

  function syncPauseButtonImage() {
    setControlButtonImage(els.pause, state.paused);
    if (!els.pause) return;
    els.pause.setAttribute("aria-label", state.paused ? "재개" : "일시정지");
  }

  function bindControlButtonImages() {
    document.querySelectorAll(".play-control-btn").forEach((button) => {
      const press = () => setControlButtonImage(button, true);
      const release = () => setControlButtonImage(button, false);
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("lostpointercapture", release);
      release();
    });
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

  function bindHorizontalHoldButton(button, direction) {
    if (!button) return;

    const start = (event) => {
      event.preventDefault();
      setHorizontalDirection(direction);
    };
    const stop = () => {
      if (state.horizontalDirection === direction) setHorizontalDirection(0);
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("pointerleave", stop);
    button.addEventListener("lostpointercapture", stop);
  }

  function bindPauseButton() {
    if (!els.pause) return;
    els.pause.addEventListener("click", () => {
      if (!state.running) return;
      state.paused = !state.paused;
      state.direction = 0;
      state.horizontalDirection = 0;
      syncDirectionButtonImages();
      syncHorizontalButtonImages();
      syncPauseButtonImage();

      if (!state.paused) {
        state.lastTime = performance.now();
        const activeRunId = state.runId;
        requestAnimationFrame((now) => {
          if (state.running && !state.paused && state.runId === activeRunId) tick(now);
        });
      }
    });
    syncPauseButtonImage();
  }

  function bindKeyboardControls() {
    window.addEventListener("keydown", (event) => {
      if (!state.running || event.repeat) return;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") setDirection(-1);
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") setDirection(1);
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") setHorizontalDirection(-1);
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") setHorizontalDirection(1);
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        if (state.direction === -1) setDirection(0);
      }
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        if (state.direction === 1) setDirection(0);
      }
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        if (state.horizontalDirection === -1) setHorizontalDirection(0);
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        if (state.horizontalDirection === 1) setHorizontalDirection(0);
      }
    });
  }

  function bindStageDrag() {
    if (!els.stage) return;

    els.stage.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      state.dragPointerId = event.pointerId;
      state.dragStartX = event.clientX;
      els.stage.setPointerCapture?.(event.pointerId);
    });

    els.stage.addEventListener("pointermove", (event) => {
      if (state.dragPointerId !== event.pointerId) return;
      const deltaX = event.clientX - state.dragStartX;
      if (Math.abs(deltaX) < 10) {
        setHorizontalDirection(0);
        return;
      }
      setHorizontalDirection(deltaX > 0 ? 1 : -1);
    });

    const stopDrag = (event) => {
      if (state.dragPointerId !== event.pointerId) return;
      state.dragPointerId = null;
      setHorizontalDirection(0);
    };

    els.stage.addEventListener("pointerup", stopDrag);
    els.stage.addEventListener("pointercancel", stopDrag);
    els.stage.addEventListener("lostpointercapture", stopDrag);
  }

  function applyLunaPose() {
    if (!els.luna) return;

    const verticalAngle = state.direction === -1 ? -10 : state.direction === 1 ? 12 : 0;
    const horizontalAngle = state.horizontalDirection * 3;
    const targetAngle = verticalAngle + horizontalAngle;
    const drift = Math.sin(performance.now() / 420) * 1.4;
    els.luna.style.left = `${state.x}%`;
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
    const progress = clamp(state.distance / state.totalDistance, 0, 1);
    const stageRect = els.stage?.getBoundingClientRect();
    const fallbackOverflow = stageRect ? stageRect.height * 3 - stageRect.width : 0;
    const overflow = Math.max(0, fallbackOverflow);
    const x = -overflow * progress;
    state.bgX = x;
    if (els.stage) els.stage.style.setProperty("--play-bg-x", `${x}px`);
    if (els.bg) els.bg.style.transform = `translateX(${x}px)`;
  }

  function updateHud() {
    const progress = clamp((state.distance / state.totalDistance) * 100, 0, 100);
    const remaining = Math.max(0, Math.ceil(state.totalDistance - state.distance));

    const hp = clamp(state.hp, 0, 100);
    const mp = clamp(state.mp, 0, 100);
    if (els.hp) els.hp.style.setProperty("--meter-value", `${hp * 0.65}%`);
    if (els.mp) els.mp.style.setProperty("--meter-value", `${mp * 0.65}%`);
    if (els.hpValue) els.hpValue.textContent = `${Math.ceil(hp)}/100`;
    if (els.mpValue) els.mpValue.textContent = `${Math.ceil(mp)}/100`;
    if (els.timer) els.timer.textContent = formatTime(state.timeLeft);
    if (els.distance) els.distance.textContent = `${remaining.toLocaleString("ko-KR")}m`;
    if (els.progress) els.progress.style.setProperty("--progress", `${progress}%`);
  }

  function endGame(result) {
    state.running = false;
    state.paused = false;
    state.direction = 0;
    syncPauseButtonImage();
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
    if (!state.running || state.paused) return;
    const activeRunId = state.runId;

    const dt = Math.min((now - state.lastTime) / 1000 || 0, 0.04);
    state.lastTime = now;

    const acceleration = state.direction * 155;
    const horizontalAcceleration = state.horizontalDirection * 92;
    const passiveBackDrift = state.horizontalDirection === 0 ? PASSIVE_BACK_DRIFT : PASSIVE_BACK_DRIFT * 0.38;
    state.velocity += acceleration * dt;
    state.xVelocity += horizontalAcceleration * dt;
    state.xVelocity -= passiveBackDrift * dt;
    state.velocity *= state.direction === 0 ? 0.88 : 0.94;
    state.xVelocity *= state.horizontalDirection === 0 ? 0.86 : 0.93;
    state.velocity = clamp(state.velocity, -42, 42);
    state.xVelocity = clamp(state.xVelocity, -26, 26);
    state.y = clamp(state.y + state.velocity * dt, 22, 78);
    state.x = clamp(state.x + state.xVelocity * dt, LEFT_BOUNDARY, RIGHT_BOUNDARY);

    if (state.y === 22 || state.y === 78) {
      state.velocity = 0;
    }
    if (state.x === LEFT_BOUNDARY || state.x === RIGHT_BOUNDARY) {
      state.xVelocity = 0;
    }

    state.timeLeft = Math.max(0, state.timeLeft - dt);
    state.distance = Math.min(state.totalDistance, state.distance + state.speed * dt);

    applyBackground();
    applyLunaPose();
    updateHud();

    if (state.distance >= state.totalDistance) {
      endGame("success");
      return;
    }

    if (state.timeLeft <= 0 || state.hp <= 0 || state.x <= LEFT_BOUNDARY) {
      endGame("fail");
      return;
    }

    requestAnimationFrame((nextNow) => {
      if (state.running && !state.paused && state.runId === activeRunId) tick(nextNow);
    });
  }

  function start(requestName) {
    cacheElements();
    state.running = true;
    state.paused = false;
    state.x = 11;
    state.y = 39;
    state.xVelocity = 0;
    state.velocity = 0;
    state.horizontalDirection = 0;
    state.direction = 0;
    syncDirectionButtonImages();
    syncHorizontalButtonImages();
    syncPauseButtonImage();
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
      if (state.running && !state.paused && state.runId === activeRunId) tick(now);
    });
  }

  function init() {
    cacheElements();
    bindControlButtonImages();
    bindHoldButton(els.up, -1);
    bindHoldButton(els.down, 1);
    bindHorizontalHoldButton(els.back, -1);
    bindHorizontalHoldButton(els.front, 1);
    bindPauseButton();
    bindKeyboardControls();
    bindStageDrag();
  }

  document.addEventListener("DOMContentLoaded", init);

  window.WitchGame = {
    start,
    setDirection,
    setHorizontalDirection,
  };
})();
