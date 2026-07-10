// 배경 음악 — 첫 사용자 제스처(터치/클릭/키)에서만 재생 시작.
// 로드 즉시 재생은 하지 않는다: 볼륨 0으로 시작하면 브라우저가 "음소거 자동재생"으로
// 허용해 터치 전에 몰래 곡이 깔리고, 이후 제스처에서 다시 걸리며 처음부터 재시작되는
// 문제가 있어서다. 그래서 자동재생 시도 없이 첫 제스처에서 딱 한 번만 재생한다.
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
  let started = false;   // 재생 성공 후 true
  let starting = false;  // play() 진행 중(중복 터치 재생 방지)

  function removeGestureListeners() {
    GESTURES.forEach((e) => window.removeEventListener(e, tryStart));
  }

  function tryStart() {
    if (started || starting) return;   // 이미 시작했거나 시작 중이면 무시 → 처음부터 재시작·중복재생 방지
    starting = true;
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        started = true;
        starting = false;
        removeGestureListeners();
        fadeInVolume(2500);
        console.log("[bgm] 재생 시작");
      }).catch(() => {
        // 재생 차단 — 다음 사용자 제스처를 기다린다 (리스너 유지)
        starting = false;
      });
    } else {
      started = true;
      starting = false;
      removeGestureListeners();
      fadeInVolume(2500);
    }
  }

  // 자동재생은 하지 않는다(볼륨 0이라 음소거 자동재생으로 허용돼 터치 전에 몰래 시작되는 문제).
  // 오직 첫 사용자 제스처에서만 한 번 재생.
  GESTURES.forEach((e) => window.addEventListener(e, tryStart, { passive: true }));

  // 다른 스크립트에서 제어할 수 있게 노출 (음소거 버튼 등 확장용)
  window.__bgm = audio;
})();
