// 배경 음악 — 화면 진입 시 재생.
// 브라우저 자동재생 정책상 소리 있는 오디오는 사용자 상호작용 전 차단될 수 있어,
// 우선 즉시 재생을 시도하고 막히면 첫 클릭/터치/키입력에서 시작한다.
(function () {
  "use strict";

  const SRC = "audio/main_Moonlit Sky Delivery.mp3";
  const audio = new Audio(encodeURI(SRC)); // 공백 등 URL 인코딩
  audio.loop = true;
  audio.volume = 0.5;
  audio.preload = "auto";

  const GESTURES = ["pointerdown", "touchstart", "keydown"];
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
        console.log("[bgm] 재생 시작");
      }).catch(() => {
        // 자동재생 차단 — 다음 사용자 제스처를 기다린다 (리스너 유지)
      });
    } else {
      started = true;
      removeGestureListeners();
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
