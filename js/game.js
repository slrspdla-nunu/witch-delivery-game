(function () {
  const IDLE_SRC = "image/luna_game_broom_pose_side.png";
  const MOVE_SRC = "image/luna_game_broom_pose_climb_dive_cat.png";
  const HIT_SRC = "image/luna_game_broom_pose_hit_cat.png";
  const DESTINATION_BG_SRC = "image/play_background_skycity_panorama2.png";
  const GAME_BGM_SRC = "audio/Cake Before Sunrise.mp3";
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
  const DELIVERY_TIME_LIMIT = 50;
  const DELIVERY_SPEED = 26;
  const DASH_MP_COST = 25;
  const DASH_DURATION = 2.8;
  const DASH_COOLDOWN = 5;
  const DASH_SPEED_MULTIPLIER = 1.75;
  const SPAWN_STOP_BEFORE_ARRIVAL = 1;
  const SHIELD_MP_COST = 35;
  const SHIELD_DURATION = 4;
  const SHIELD_COOLDOWN = 8;
  const destinationBackgroundPreload = new Image();
  destinationBackgroundPreload.src = DESTINATION_BG_SRC;
  const gameBgm = new Audio(encodeURI(GAME_BGM_SRC));
  gameBgm.loop = true;
  gameBgm.volume = 0;
  gameBgm.preload = "auto";

  const state = {
    running: false,
    paused: false,
    phase: "idle",
    x: 11,
    y: 39,
    xVelocity: 0,
    velocity: 0,
    horizontalDirection: 0,
    direction: 0,
    lastTime: 0,
    hp: 100,
    mp: 100,
    timeLeft: DELIVERY_TIME_LIMIT,
    distance: 0,
    totalDistance: 1200,
    packageCondition: 100,
    speed: DELIVERY_SPEED,
    bgX: 0,
    runId: 0,
    dragStartX: 0,
    dragPointerId: null,
    controlPointerId: null,
    obstacles: [],
    items: [],
    nextCrowIn: 0,
    nextItemIn: 0,
    hitTime: 0,
    invincibleTime: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashTrailIn: 0,
    shieldTime: 0,
    shieldCooldown: 0,
    shieldCharges: 0,
  };

  const els = {};
  let effectAudioContext = null;
  let gameBgmFadeId = null;

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
    els.skill = document.querySelector(".play-skill");
    els.shield = document.querySelector(".play-shield");
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
    els.countdown = document.querySelector(".play-countdown");
    els.countdownText = document.querySelector(".play-countdown-text");
  }

  function setDirection(direction) {
    if (state.phase === "arrival" || state.phase === "countdown") return;
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
    if (state.phase === "arrival" || state.phase === "countdown") return;
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

  function updateSkillButton(button, cooldown, maxCooldown, cost, active) {
    if (!button) return;
    const isCooling = cooldown > 0.05;
    const unavailable = state.phase === "flying" && state.mp < cost && !isCooling && !active;
    button.classList.toggle("is-cooling", isCooling);
    button.classList.toggle("is-unavailable", unavailable);
    button.classList.toggle("is-skill-active", active);
    button.style.setProperty("--cooldown-progress", `${clamp(cooldown / maxCooldown, 0, 1) * 100}%`);
    button.dataset.cooldown = isCooling ? String(Math.ceil(cooldown)) : "";
  }

  function updateSkillButtons() {
    updateSkillButton(els.skill, state.dashCooldown, DASH_COOLDOWN, DASH_MP_COST, state.dashTime > 0);
    updateSkillButton(els.shield, state.shieldCooldown, SHIELD_COOLDOWN, SHIELD_MP_COST, state.shieldCharges > 0);
  }

  function resetSkillState() {
    state.dashTime = 0;
    state.dashCooldown = 0;
    state.dashTrailIn = 0;
    state.shieldTime = 0;
    state.shieldCooldown = 0;
    state.shieldCharges = 0;
    els.luna?.classList.remove("is-dashing", "is-shielded", "is-shield-break");
    els.stage?.classList.remove("is-dash-active");
    updateSkillButtons();
  }

  function canUseSkill(cost, cooldown) {
    return state.running && !state.paused && state.phase === "flying" && cooldown <= 0 && state.mp >= cost;
  }

  function useDash() {
    if (!canUseSkill(DASH_MP_COST, state.dashCooldown)) return;
    state.mp = Math.max(0, state.mp - DASH_MP_COST);
    state.dashTime = DASH_DURATION;
    state.dashCooldown = DASH_COOLDOWN;
    state.dashTrailIn = 0;
    state.x = Math.min(RIGHT_BOUNDARY, state.x + 9);
    state.xVelocity = Math.max(state.xVelocity, 24);
    els.luna?.classList.add("is-dashing");
    els.stage?.classList.add("is-dash-active");
    createDashBurst();
    playSkillSound("dash");
    applyLunaPose();
    updateHud();
  }

  function useShield() {
    if (!canUseSkill(SHIELD_MP_COST, state.shieldCooldown)) return;
    state.mp = Math.max(0, state.mp - SHIELD_MP_COST);
    state.shieldTime = SHIELD_DURATION;
    state.shieldCooldown = SHIELD_COOLDOWN;
    state.shieldCharges = 1;
    els.luna?.classList.remove("is-shield-break");
    els.luna?.classList.add("is-shielded");
    playSkillSound("shield");
    updateHud();
  }

  function breakShield() {
    if (state.shieldCharges <= 0) return false;
    state.shieldCharges = 0;
    state.shieldTime = 0;
    state.invincibleTime = 0.45;
    if (els.luna) {
      els.luna.classList.remove("is-shielded");
      els.luna.classList.add("is-shield-break");
      window.setTimeout(() => els.luna?.classList.remove("is-shield-break"), 420);
    }
    playSkillSound("shieldBreak");
    updateSkillButtons();
    return true;
  }

  function updateSkillTimers(dt) {
    const hadDash = state.dashTime > 0;
    const hadShield = state.shieldTime > 0 && state.shieldCharges > 0;
    state.dashTime = Math.max(0, state.dashTime - dt);
    state.dashCooldown = Math.max(0, state.dashCooldown - dt);
    state.dashTrailIn = Math.max(0, state.dashTrailIn - dt);
    state.shieldTime = Math.max(0, state.shieldTime - dt);
    state.shieldCooldown = Math.max(0, state.shieldCooldown - dt);

    if (state.dashTime > 0 && state.dashTrailIn === 0) {
      createDashTrail();
      state.dashTrailIn = 0.055;
    }

    if (hadDash && state.dashTime === 0) {
      els.luna?.classList.remove("is-dashing");
      els.stage?.classList.remove("is-dash-active");
    }
    if (hadShield && state.shieldTime === 0) {
      state.shieldCharges = 0;
      els.luna?.classList.remove("is-shielded");
    }
    updateSkillButtons();
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

  function getMovementControlAt(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    return target?.closest?.(".play-up, .play-down, .play-back, .play-front") || null;
  }

  // 손가락 아래 버튼에 맞춰 이동 방향 적용(없으면 정지). 이미지는 state 기반으로 자동 갱신됨.
  function applyMovementControl(control) {
    if (control === els.up) {
      setDirection(-1);
      setHorizontalDirection(0);
    } else if (control === els.down) {
      setDirection(1);
      setHorizontalDirection(0);
    } else if (control === els.back) {
      setDirection(0);
      setHorizontalDirection(-1);
    } else if (control === els.front) {
      setDirection(0);
      setHorizontalDirection(1);
    } else {
      setDirection(0);
      setHorizontalDirection(0);
    }
  }

  // 이동 d-pad를 '컨테이너 단위'로 처리: 컨테이너가 포인터를 캡처하고
  // 손가락 위치로 버튼을 판정 → 버튼 사이를 슬라이드하면 그 버튼이 눌린 것처럼 인식.
  function setupMovementControls() {
    const pad = document.querySelector(".play-controls-left");
    if (!pad) return;

    pad.addEventListener("pointerdown", (event) => {
      if (state.controlPointerId !== null) return; // 이미 다른 손가락이 조작 중
      event.preventDefault();
      state.controlPointerId = event.pointerId;
      try { pad.setPointerCapture?.(event.pointerId); } catch (_) {}
      applyMovementControl(getMovementControlAt(event.clientX, event.clientY));
    });

    pad.addEventListener("pointermove", (event) => {
      if (state.controlPointerId !== event.pointerId) return;
      event.preventDefault();
      applyMovementControl(getMovementControlAt(event.clientX, event.clientY));
    });

    const release = (event) => {
      if (state.controlPointerId !== event.pointerId) return;
      state.controlPointerId = null;
      applyMovementControl(null);
    };
    pad.addEventListener("pointerup", release);
    pad.addEventListener("pointercancel", release);
    pad.addEventListener("lostpointercapture", release);
  }

  function bindSkillButtons() {
    const bindTap = (button, action) => {
      if (!button) return;
      // pointerdown = 손 대는 즉시 발동(모바일에서 click보다 반응 확실). 중복 실행 방지 위해 click은 안 씀.
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        action();
      });
    };
    bindTap(els.skill, useDash);
    bindTap(els.shield, useShield);
  }

  function bindPauseButton() {
    if (!els.pause) return;
    els.pause.addEventListener("click", () => {
      if (!state.running) return;
      state.paused = !state.paused;
      state.direction = 0;
      state.horizontalDirection = 0;
      state.controlPointerId = null;
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
      if (event.code === "Space") {
        event.preventDefault();
        useDash();
      }
      if (event.key === "Shift") useShield();
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

  function isNearArrival() {
    const speedMultiplier = state.dashTime > 0 ? DASH_SPEED_MULTIPLIER : 1;
    const currentSpeed = Math.max(1, state.speed * speedMultiplier);
    const secondsToArrival = (state.totalDistance - state.distance) / currentSpeed;
    return secondsToArrival <= SPAWN_STOP_BEFORE_ARRIVAL;
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

  function createCollectEffect(item) {
    if (!els.objects) return;

    const effect = document.createElement("div");
    effect.className = "play-collect-effect";
    effect.style.left = `${item.x}%`;
    effect.style.top = `${item.y}%`;

    const score = document.createElement("span");
    score.className = "play-collect-score";
    score.textContent = "+10";
    effect.appendChild(score);

    for (let index = 0; index < 8; index += 1) {
      const spark = document.createElement("i");
      spark.className = "play-collect-spark";
      const angle = (Math.PI * 2 * index) / 8 + randomBetween(-0.22, 0.22);
      const distance = randomBetween(18, 34);
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
      spark.style.setProperty("--spark-delay", `${index * 18}ms`);
      effect.appendChild(spark);
    }

    els.objects.appendChild(effect);
    window.setTimeout(() => effect.remove(), 760);
  }

  function createDashBurst() {
    if (!els.objects) return;

    const burst = document.createElement("div");
    burst.className = "play-dash-burst";
    burst.style.left = `${state.x + 4}%`;
    burst.style.top = `${state.y}%`;
    els.objects.appendChild(burst);
    window.setTimeout(() => burst.remove(), 620);
  }

  function createDashTrail() {
    if (!els.objects) return;

    const trail = document.createElement("div");
    trail.className = "play-dash-trail";
    trail.style.left = `${state.x - 6}%`;
    trail.style.top = `${state.y}%`;
    trail.style.setProperty("--trail-y", `${randomBetween(-8, 8)}px`);
    els.objects.appendChild(trail);
    window.setTimeout(() => trail.remove(), 520);
  }

  function createObstacleBreakEffect(obstacle) {
    if (!els.objects) return;

    const effect = document.createElement("div");
    effect.className = "play-obstacle-break";
    effect.style.left = `${obstacle.x}%`;
    effect.style.top = `${obstacle.y}%`;

    for (let index = 0; index < 10; index += 1) {
      const spark = document.createElement("i");
      spark.className = "play-obstacle-break-spark";
      const angle = (Math.PI * 2 * index) / 10 + randomBetween(-0.16, 0.16);
      const distance = randomBetween(16, 38);
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
      spark.style.setProperty("--spark-delay", `${index * 12}ms`);
      effect.appendChild(spark);
    }

    els.objects.appendChild(effect);
    window.setTimeout(() => effect.remove(), 620);
  }

  function playCollectSound(item) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      effectAudioContext ||= new AudioContext();
      const now = effectAudioContext.currentTime;
      const oscillator = effectAudioContext.createOscillator();
      const gain = effectAudioContext.createGain();
      const baseFrequency = item.type === "hourglass" ? 780 : item.type === "potion" ? 660 : 880;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(baseFrequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 1.45, now + 0.11);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      oscillator.connect(gain);
      gain.connect(effectAudioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.24);
    } catch (error) {
      console.warn("[아이템 획득 효과음 실패]", error);
    }
  }

  function playSkillSound(kind) {
    if (kind === "dash") {
      playTone(520, 1120, 0.13, 0.28, "triangle");
      window.setTimeout(() => playTone(980, 1480, 0.08, 0.14, "sine"), 50);
      return;
    }
    if (kind === "dashBreak") {
      playTone(900, 1480, 0.13, 0.16, "triangle");
      window.setTimeout(() => playTone(1320, 720, 0.075, 0.13, "sine"), 42);
      return;
    }
    if (kind === "shield") {
      playTone(420, 780, 0.1, 0.26, "sine");
      return;
    }
    if (kind === "shieldBreak") {
      playTone(760, 320, 0.14, 0.24, "triangle");
      return;
    }
    if (kind === "hit") {
      playTone(180, 92, 0.16, 0.2, "sawtooth");
      window.setTimeout(() => playTone(98, 70, 0.1, 0.16, "square"), 36);
    }
  }

  function playTone(frequency, endFrequency, volume, duration, type) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      effectAudioContext ||= new AudioContext();
      const now = effectAudioContext.currentTime;
      const oscillator = effectAudioContext.createOscillator();
      const gain = effectAudioContext.createGain();
      const safeVolume = Math.max(0.0001, volume);
      const safeDuration = Math.max(0.04, duration);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + safeDuration * 0.62);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(safeVolume, now + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + safeDuration);

      oscillator.connect(gain);
      gain.connect(effectAudioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + safeDuration + 0.02);
    } catch (error) {
      console.warn("[효과음 재생 실패]", error);
    }
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
    createCollectEffect(item);
    playCollectSound(item);
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
    if (breakShield()) return;

    state.hp = Math.max(0, state.hp - CROW_DAMAGE);
    state.packageCondition = Math.max(0, state.packageCondition - PACKAGE_DAMAGE);
    state.invincibleTime = INVINCIBLE_DURATION;
    state.hitTime = HIT_DURATION;
    state.velocity *= -0.28;
    state.xVelocity = Math.max(state.xVelocity, 12);
    playSkillSound("hit");

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
      if (!isNearArrival()) spawnCrow();
      scheduleNextCrow();
    }

    const progress = clamp(state.distance / state.totalDistance, 0, 1);
    state.obstacles.forEach((obstacle) => {
      obstacle.x -= (obstacle.speed + progress * 7) * dt;
      obstacle.y += Math.sin((performance.now() / 230) + obstacle.x) * 0.018;
      applyObstaclePosition(obstacle);

      if (!obstacle.hit && isCollidingWithLuna(obstacle)) {
        obstacle.hit = true;
        if (state.dashTime > 0) {
          createObstacleBreakEffect(obstacle);
          playSkillSound("dashBreak");
          obstacle.el.remove();
          return;
        }
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
      if (!isNearArrival()) spawnItem();
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

  function resetPlayBackground() {
    if (!els.stage) return;
    els.stage.classList.remove("is-destination");
    els.stage.style.backgroundImage = "";
    els.stage.style.backgroundPosition = "";
    els.stage.style.removeProperty("--play-bg-x");
    if (els.screen) els.screen.classList.remove("is-fading");
  }

  function setDestinationBackground() {
    if (!els.stage) return;
    els.stage.classList.add("is-destination");
    els.stage.style.backgroundImage = `url("${DESTINATION_BG_SRC}")`;
    els.stage.style.backgroundPosition = "right center";
    els.stage.style.setProperty("--play-bg-x", "0px");
    if (els.bg) els.bg.style.transform = "translateX(0)";
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
    updateSkillButtons();
  }

  function endGame(result) {
    state.running = false;
    state.paused = false;
    state.phase = "ended";
    state.direction = 0;
    state.hitTime = 0;
    state.invincibleTime = 0;
    state.controlPointerId = null;
    resetSkillState();
    syncPauseButtonImage();
    stopGameBgm();
    clearWorldObjects();
    if (els.luna) {
      els.luna.classList.remove("is-hit", "is-dashing", "is-shielded", "is-shield-break");
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

  function animateLunaTo(targetX, targetY, duration) {
    const startX = state.x;
    const startY = state.y;
    const startedAt = performance.now();
    state.direction = 0;
    state.horizontalDirection = 1;
    if (els.luna) {
      els.luna.classList.remove("is-hit");
      els.luna.src = MOVE_SRC;
    }
    syncDirectionButtonImages();
    syncHorizontalButtonImages();

    return new Promise((resolve) => {
      const step = (now) => {
        if (state.phase !== "arrival") {
          resolve();
          return;
        }

        const progress = clamp((now - startedAt) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        state.x = startX + (targetX - startX) * eased;
        state.y = startY + (targetY - startY) * eased;
        applyLunaPose();

        if (progress < 1) {
          requestAnimationFrame(step);
          return;
        }

        resolve();
      };

      requestAnimationFrame(step);
    });
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function stopMainBgm() {
    if (!window.__bgm) return;
    window.__bgm.pause();
  }

  function fadeGameBgmTo(targetVolume, ms) {
    window.clearInterval(gameBgmFadeId);
    const steps = 32;
    const startVolume = gameBgm.volume;
    const stepMs = ms / steps;
    let step = 0;

    gameBgmFadeId = window.setInterval(() => {
      step += 1;
      const progress = step / steps;
      gameBgm.volume = startVolume + (targetVolume - startVolume) * progress;
      if (step >= steps) {
        gameBgm.volume = targetVolume;
        window.clearInterval(gameBgmFadeId);
        gameBgmFadeId = null;
      }
    }, stepMs);
  }

  function prepareGameBgm() {
    window.clearInterval(gameBgmFadeId);
    gameBgmFadeId = null;
    gameBgm.pause();
    gameBgm.currentTime = 0;
    gameBgm.volume = 0;

    const playPromise = gameBgm.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((error) => {
        console.warn("[게임 BGM 준비 실패]", error);
      });
    }
  }

  function startGameBgm() {
    gameBgm.currentTime = 0;
    const playPromise = gameBgm.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => fadeGameBgmTo(0.46, 900))
        .catch((error) => {
          console.warn("[게임 BGM 재생 실패]", error);
        });
      return;
    }
    fadeGameBgmTo(0.46, 900);
  }

  function stopGameBgm() {
    window.clearInterval(gameBgmFadeId);
    gameBgmFadeId = null;
    gameBgm.pause();
    gameBgm.currentTime = 0;
    gameBgm.volume = 0;
  }

  async function runCountdown(activeRunId) {
    if (!els.countdown || !els.countdownText) return true;

    state.phase = "countdown";
    state.running = false;
    state.direction = 0;
    state.horizontalDirection = 0;
    syncDirectionButtonImages();
    syncHorizontalButtonImages();

    const steps = ["3", "2", "1", "시작!"];
    els.countdown.classList.add("is-visible");
    els.countdown.setAttribute("aria-hidden", "false");

    for (const step of steps) {
      if (state.runId !== activeRunId || state.phase !== "countdown") {
        els.countdown.classList.remove("is-visible");
        els.countdownText.classList.remove("is-popping");
        els.countdown.setAttribute("aria-hidden", "true");
        return false;
      }

      els.countdownText.textContent = step;
      els.countdownText.classList.remove("is-popping", "is-start");
      void els.countdownText.offsetWidth;
      els.countdownText.classList.add("is-popping");
      els.countdownText.classList.toggle("is-start", step === "시작!");
      await wait(step === "시작!" ? 620 : 760);
    }

    els.countdown.classList.remove("is-visible");
    els.countdownText.classList.remove("is-popping", "is-start");
    els.countdown.setAttribute("aria-hidden", "true");
    return state.runId === activeRunId && state.phase === "countdown";
  }

  async function startArrivalSequence() {
    if (state.phase === "arrival") return;
    state.phase = "arrival";
    state.paused = false;
    state.direction = 0;
    state.horizontalDirection = 0;
    state.velocity = 0;
    state.xVelocity = 0;
    state.distance = state.totalDistance;
    state.timeLeft = Math.max(0, state.timeLeft);
    resetSkillState();
    updateHud();

    await animateLunaTo(112, 42, 900);
    if (state.phase !== "arrival") return;

    els.screen?.classList.add("is-fading");
    await wait(430);
    if (state.phase !== "arrival") return;

    clearWorldObjects();
    setDestinationBackground();
    state.x = -12;
    state.y = 47;
    applyLunaPose();
    await wait(120);
    els.screen?.classList.remove("is-fading");

    await animateLunaTo(55, 47, 1700);
    if (state.phase !== "arrival") return;

    state.running = false;
    state.paused = false;
    state.direction = 0;
    state.horizontalDirection = 0;
    syncDirectionButtonImages();
    syncHorizontalButtonImages();
    if (els.luna) els.luna.src = IDLE_SRC;
    console.log("[도착 연출 완료]", {
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
    const speedMultiplier = state.dashTime > 0 ? DASH_SPEED_MULTIPLIER : 1;
    state.distance = Math.min(state.totalDistance, state.distance + state.speed * speedMultiplier * dt);

    updateSkillTimers(dt);
    updateHitState(dt);
    updateObstacles(dt);
    updateItems(dt);
    applyBackground();
    applyLunaPose();
    updateHud();

    if (state.distance >= state.totalDistance) {
      if (state.packageCondition > 0) {
        startArrivalSequence();
      } else {
        endGame("fail");
      }
      return;
    }

    if (state.timeLeft <= 0 || state.hp <= 0 || state.packageCondition <= 0) {
      endGame("fail");
      return;
    }

    requestAnimationFrame((nextNow) => {
      if (state.running && !state.paused && state.runId === activeRunId) tick(nextNow);
    });
  }

  async function start(requestName) {
    cacheElements();
    requestLandscapeMode();
    stopMainBgm();
    prepareGameBgm();
    state.running = false;
    state.paused = false;
    state.phase = "countdown";
    state.x = 11;
    state.y = 39;
    state.xVelocity = 0;
    state.velocity = 0;
    state.horizontalDirection = 0;
    state.direction = 0;
    state.controlPointerId = null;
    syncDirectionButtonImages();
    syncHorizontalButtonImages();
    syncPauseButtonImage();
    state.hp = 100;
    state.mp = 100;
    state.timeLeft = DELIVERY_TIME_LIMIT;
    state.distance = 0;
    state.totalDistance = 1200;
    state.packageCondition = 100;
    state.speed = DELIVERY_SPEED;
    state.bgX = 0;
    state.hitTime = 0;
    state.invincibleTime = 0;
    resetSkillState();
    clearWorldObjects();
    resetPlayBackground();
    scheduleNextCrow();
    scheduleNextItem();
    state.runId += 1;
    const activeRunId = state.runId;
    document.body.dataset.selectedRequest = requestName || "";
    if (els.luna) {
      els.luna.classList.remove("is-hit", "is-dashing", "is-shielded", "is-shield-break");
      els.luna.src = IDLE_SRC;
      applyLunaPose();
    }
    applyBackground();
    updateHud();

    const shouldStart = await runCountdown(activeRunId);
    if (!shouldStart) return;

    state.running = true;
    state.phase = "flying";
    state.lastTime = performance.now();
    startGameBgm();
    requestAnimationFrame((now) => {
      if (state.running && !state.paused && state.runId === activeRunId) tick(now);
    });
  }

  function init() {
    cacheElements();
    bindControlButtonImages();
    setupMovementControls();
    bindSkillButtons();
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
