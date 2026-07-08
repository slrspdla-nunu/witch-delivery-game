(function () {
  const IDLE_SRC = "image/luna_game_broom_pose_side.png";
  const MOVE_SRC = "image/luna_game_broom_pose_climb_dive_cat.png";
  const HIT_SRC = "image/luna_game_broom_pose_hit_cat.png";
  const CROW_SRC = "image/game_obstacle_crow.png";
  const ITEM_TYPES = [
    { type: "star", src: "image/game_item_star.png", label: "별사탕" },
    { type: "hourglass", src: "image/game_item_hourglass.png", label: "모래시계" },
    { type: "potion", src: "image/game_item_potion.png", label: "포션" },
  ];
  const LEFT_BOUNDARY = 6;
  const RIGHT_BOUNDARY = 34;
  const PASSIVE_BACK_DRIFT = 12;
  const CROW_DAMAGE = 18;
  const PACKAGE_DAMAGE = 12;
  const HIT_DURATION = 0.7;
  const INVINCIBLE_DURATION = 1.12;

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
    timeLeft: 120,
    distance: 0,
    totalDistance: 1200,
    packageCondition: 100,
    speed: 105,
    bgX: 0,
    runId: 0,
    dragStartX: 0,
    dragPointerId: null,
    obstacles: [],
    items: [],
    nextCrowIn: 0,
    nextItemIn: 0,
    hitTime: 0,
    invincibleTime: 0,
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
    els.objects = document.querySelector(".play-object-layer");
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
    if (state.hitTime > 0) {
      syncDirectionButtonImages();
      return;
    }
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

  function syncLandscapeFallback() {
    const shouldRotate =
      window.matchMedia?.("(max-width: 700px) and (orientation: portrait)").matches &&
      window.matchMedia?.("(pointer: coarse)").matches;
    document.body.classList.toggle("play-landscape-fallback", Boolean(shouldRotate));
  }

  async function requestLandscapeMode() {
    syncLandscapeFallback();

    const isMobileLike = window.matchMedia?.("(pointer: coarse)").matches;
    if (!isMobileLike) return;

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }

      if (screen.orientation?.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (error) {
      console.warn("[화면 방향 잠금 실패]", error);
    } finally {
      window.setTimeout(syncLandscapeFallback, 250);
    }
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

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function scheduleNextCrow() {
    const progress = clamp(state.distance / state.totalDistance, 0, 1);
    state.nextCrowIn = randomBetween(1.8, 2.8) - progress * 0.42;
  }

  function scheduleNextItem() {
    const progress = clamp(state.distance / state.totalDistance, 0, 1);
    state.nextItemIn = randomBetween(1.45, 2.35) - progress * 0.2;
  }

  function clearWorldObjects() {
    state.obstacles.forEach((obstacle) => obstacle.el?.remove());
    state.items.forEach((item) => item.el?.remove());
    state.obstacles = [];
    state.items = [];
    if (els.objects) els.objects.innerHTML = "";
  }

  function spawnCrow() {
    if (!els.objects) return;

    const img = document.createElement("img");
    img.className = "play-obstacle play-obstacle-crow";
    img.src = CROW_SRC;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");

    const obstacle = {
      type: "crow",
      x: 116,
      y: randomBetween(24, 74),
      speed: randomBetween(17, 22),
      el: img,
      hit: false,
    };

    els.objects.appendChild(img);
    state.obstacles.push(obstacle);
    applyObstaclePosition(obstacle);
  }

  function applyObstaclePosition(obstacle) {
    obstacle.el.style.left = `${obstacle.x}%`;
    obstacle.el.style.top = `${obstacle.y}%`;
  }

  function spawnItem() {
    if (!els.objects) return;

    const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    const img = document.createElement("img");
    img.className = `play-item play-item-${itemType.type}`;
    img.src = itemType.src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");

    const item = {
      type: itemType.type,
      x: 112,
      y: randomBetween(26, 72),
      speed: randomBetween(13, 17),
      el: img,
      collected: false,
    };

    els.objects.appendChild(img);
    state.items.push(item);
    applyWorldObjectPosition(item);
  }

  function applyWorldObjectPosition(object) {
    object.el.style.left = `${object.x}%`;
    object.el.style.top = `${object.y}%`;
  }

  function isCollidingWithLuna(obstacle) {
    if (!els.luna || !obstacle.el) return false;

    const lunaRect = els.luna.getBoundingClientRect();
    const obstacleRect = obstacle.el.getBoundingClientRect();
    const lunaPaddingX = lunaRect.width * 0.225;
    const lunaPaddingY = lunaRect.height * 0.19;
    const obstaclePaddingX = obstacleRect.width * 0.175;
    const obstaclePaddingY = obstacleRect.height * 0.21;

    return !(
      obstacleRect.right - obstaclePaddingX < lunaRect.left + lunaPaddingX ||
      obstacleRect.left + obstaclePaddingX > lunaRect.right - lunaPaddingX ||
      obstacleRect.bottom - obstaclePaddingY < lunaRect.top + lunaPaddingY ||
      obstacleRect.top + obstaclePaddingY > lunaRect.bottom - lunaPaddingY
    );
  }

  function isCollectingItem(item) {
    if (!els.luna || !item.el) return false;

    const lunaRect = els.luna.getBoundingClientRect();
    const itemRect = item.el.getBoundingClientRect();
    const lunaPaddingX = lunaRect.width * 0.18;
    const lunaPaddingY = lunaRect.height * 0.15;
    const itemPaddingX = itemRect.width * 0.04;
    const itemPaddingY = itemRect.height * 0.04;

    return !(
      itemRect.right - itemPaddingX < lunaRect.left + lunaPaddingX ||
      itemRect.left + itemPaddingX > lunaRect.right - lunaPaddingX ||
      itemRect.bottom - itemPaddingY < lunaRect.top + lunaPaddingY ||
      itemRect.top + itemPaddingY > lunaRect.bottom - lunaPaddingY
    );
  }

  function collectItem(item) {
    if (item.collected) return;
    item.collected = true;
    item.el.classList.add("is-collected");

    if (item.type === "star") {
      state.mp = Math.min(100, state.mp + 18);
    }
    if (item.type === "hourglass") {
      state.timeLeft = Math.min(150, state.timeLeft + 10);
    }
    if (item.type === "potion") {
      state.hp = Math.min(100, state.hp + 16);
    }

    updateHud();
    window.setTimeout(() => item.el.remove(), 140);
  }

  function recoverLunaFromHit() {
    if (!els.luna || state.hitTime > 0) return;
    els.luna.classList.remove("is-hit");
    els.luna.src = state.direction === 0 ? IDLE_SRC : MOVE_SRC;
  }

  function hitLuna() {
    if (state.invincibleTime > 0) return;

    state.hp = Math.max(0, state.hp - CROW_DAMAGE);
    state.packageCondition = Math.max(0, state.packageCondition - PACKAGE_DAMAGE);
    state.invincibleTime = INVINCIBLE_DURATION;
    state.hitTime = HIT_DURATION;
    state.velocity *= -0.28;
    state.xVelocity = Math.max(state.xVelocity, 12);

    if (els.luna) {
      els.luna.src = HIT_SRC;
      els.luna.classList.add("is-hit");
    }
    updateHud();
  }

  function updateHitState(dt) {
    state.invincibleTime = Math.max(0, state.invincibleTime - dt);
    const wasHit = state.hitTime > 0;
    state.hitTime = Math.max(0, state.hitTime - dt);
    if (wasHit && state.hitTime === 0) recoverLunaFromHit();
  }

  function updateObstacles(dt) {
    state.nextCrowIn -= dt;
    if (state.nextCrowIn <= 0) {
      spawnCrow();
      scheduleNextCrow();
    }

    const progress = clamp(state.distance / state.totalDistance, 0, 1);
    state.obstacles.forEach((obstacle) => {
      obstacle.x -= (obstacle.speed + progress * 7) * dt;
      obstacle.y += Math.sin((performance.now() / 230) + obstacle.x) * 0.018;
      applyObstaclePosition(obstacle);

      if (!obstacle.hit && isCollidingWithLuna(obstacle)) {
        obstacle.hit = true;
        obstacle.el.remove();
        hitLuna();
      }
    });

    state.obstacles = state.obstacles.filter((obstacle) => {
      const alive = !obstacle.hit && obstacle.x > -12;
      if (!alive) obstacle.el.remove();
      return alive;
    });
  }

  function updateItems(dt) {
    state.nextItemIn -= dt;
    if (state.nextItemIn <= 0) {
      spawnItem();
      scheduleNextItem();
    }

    const progress = clamp(state.distance / state.totalDistance, 0, 1);
    state.items.forEach((item) => {
      item.x -= (item.speed + progress * 4) * dt;
      item.y += Math.sin((performance.now() / 310) + item.x) * 0.015;
      applyWorldObjectPosition(item);

      if (!item.collected && isCollectingItem(item)) {
        collectItem(item);
      }
    });

    state.items = state.items.filter((item) => {
      const alive = !item.collected && item.x > -10;
      if (!alive && !item.collected) item.el.remove();
      return alive;
    });
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
    const hp = clamp(state.hp, 0, 100);
    const mp = clamp(state.mp, 0, 100);
    if (els.hp) els.hp.style.setProperty("--meter-value", `${hp * 0.65}%`);
    if (els.mp) els.mp.style.setProperty("--meter-value", `${mp * 0.65}%`);
    if (els.hpValue) els.hpValue.textContent = `${Math.ceil(hp)}/100`;
    if (els.mpValue) els.mpValue.textContent = `${Math.ceil(mp)}/100`;
    if (els.timer) els.timer.textContent = formatTime(state.timeLeft);
    if (els.distance) els.distance.textContent = `${Math.ceil(state.packageCondition)}%`;
    if (els.progress) els.progress.style.setProperty("--progress", `${progress}%`);
  }

  function endGame(result) {
    state.running = false;
    state.paused = false;
    state.direction = 0;
    state.hitTime = 0;
    state.invincibleTime = 0;
    syncPauseButtonImage();
    clearWorldObjects();
    if (els.luna) {
      els.luna.classList.remove("is-hit");
      els.luna.src = result === "success" ? "image/luna_game_success_cat.png" : IDLE_SRC;
    }
    console.log(`[게임 종료] ${result}`, {
      request: document.body.dataset.selectedRequest,
      hp: Math.round(state.hp),
      mp: Math.round(state.mp),
      packageCondition: Math.round(state.packageCondition),
      timeLeft: Math.ceil(state.timeLeft),
      distance: Math.round(state.distance),
    });
  }

  function tick(now) {
    if (!state.running || state.paused) return;
    const activeRunId = state.runId;

    const dt = Math.min((now - state.lastTime) / 1000 || 0, 0.04);
    state.lastTime = now;

    const acceleration = state.direction * 184;
    const horizontalAcceleration = state.horizontalDirection * 92;
    const passiveBackDrift = state.horizontalDirection === 0 ? PASSIVE_BACK_DRIFT : PASSIVE_BACK_DRIFT * 0.38;
    state.velocity += acceleration * dt;
    state.xVelocity += horizontalAcceleration * dt;
    state.xVelocity -= passiveBackDrift * dt;
    state.velocity *= state.direction === 0 ? 0.88 : 0.94;
    state.xVelocity *= state.horizontalDirection === 0 ? 0.86 : 0.93;
    state.velocity = clamp(state.velocity, -49, 49);
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

    updateHitState(dt);
    updateObstacles(dt);
    updateItems(dt);
    applyBackground();
    applyLunaPose();
    updateHud();

    if (state.distance >= state.totalDistance) {
      endGame(state.packageCondition > 0 ? "success" : "fail");
      return;
    }

    if (state.timeLeft <= 0 || state.hp <= 0 || state.packageCondition <= 0 || state.x <= LEFT_BOUNDARY) {
      endGame("fail");
      return;
    }

    requestAnimationFrame((nextNow) => {
      if (state.running && !state.paused && state.runId === activeRunId) tick(nextNow);
    });
  }

  function start(requestName) {
    cacheElements();
    requestLandscapeMode();
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
    state.timeLeft = 120;
    state.distance = 0;
    state.totalDistance = 1200;
    state.packageCondition = 100;
    state.speed = 105;
    state.bgX = 0;
    state.hitTime = 0;
    state.invincibleTime = 0;
    clearWorldObjects();
    scheduleNextCrow();
    scheduleNextItem();
    state.runId += 1;
    state.lastTime = performance.now();
    document.body.dataset.selectedRequest = requestName || "";
    if (els.luna) {
      els.luna.classList.remove("is-hit");
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
    window.addEventListener("resize", syncLandscapeFallback);
    window.addEventListener("orientationchange", syncLandscapeFallback);
  }

  document.addEventListener("DOMContentLoaded", init);

  window.WitchGame = {
    start,
    setDirection,
    setHorizontalDirection,
  };
})();
