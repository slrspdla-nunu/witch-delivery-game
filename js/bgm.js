// 배경 음악 — 화면 진입 시 재생.
// 브라우저 자동재생 정책상 소리 있는 오디오는 사용자 상호작용 전 차단될 수 있어,
// 우선 즉시 재생을 시도하고 막히면 첫 클릭/터치/키입력에서 시작한다.
(function () {
  "use strict";

  const SRC = "audio/main_Moonlit Sky Delivery.mp3";
  const TARGET_VOL = 0.5;
  const audio = new Audio(encodeURI(SRC)); // 공백 등 URL 인코딩
  audio.loop = true;
  audio.volume = 0;                        // 0에서 시작 → 재생되면 부드럽게 페이드인
  audio.preload = "auto";

  // 스플래시 분위기에 맞춰 볼륨을 서서히 올림
  function fadeInVolume(ms) {
    const steps = 40, stepMs = ms / steps;
    let i = 0;
    const id = setInterval(() => {
      i++;
      audio.volume = Math.min(TARGET_VOL, (TARGET_VOL * i) / steps);
      if (i >= steps) clearInterval(id);
    }, stepMs);
  }

  // "떼는" 계열(pointerup/touchend/click)이 오디오 재생 허가(user activation)를
  // 확실히 부여한다. pointerdown/touchstart 만으로는 재생이 막히는 브라우저가 있어 함께 등록.
  const GESTURES = ["pointerup", "touchend", "click", "keydown", "pointerdown", "touchstart"];
  let started = false;

  function removeGestureListeners() {
    GESTURES.forEach((e) => window.removeEventListener(e, tryStart));
  }

  function tryStart() {
    if (started) return;
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        started = true;
        removeGestureListeners();
        fadeInVolume(2500);
        console.log("[bgm] 재생 시작");
      }).catch(() => {
        // 자동재생 차단 — 다음 사용자 제스처를 기다린다 (리스너 유지)
      });
    } else {
      started = true;
      removeGestureListeners();
      fadeInVolume(2500);
    }
  }

  // 첫 상호작용에서 재생되도록 대기 등록 + 로드 시 즉시 시도
  GESTURES.forEach((e) => window.addEventListener(e, tryStart, { passive: true }));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryStart);
  } else {
    tryStart();
  }

  // 다른 스크립트에서 제어할 수 있게 노출 (음소거 버튼 등 확장용)
  window.__bgm = audio;
})();
