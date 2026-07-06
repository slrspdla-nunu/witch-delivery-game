// 마녀 배달부의 비상착륙 - 메인 화면 인터랙션
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll("button[data-name]");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      console.log(`[클릭] ${name}`);
      if (btn.classList.contains("start-btn")) {
        document.body.classList.add("game-ui");
        return;
      }
      // 여기에 각 화면 전환 로직을 연결하면 됩니다.
      showToast(name);
    });
  });

  function showToast(text) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      Object.assign(toast.style, {
        position: "fixed",
        left: "50%",
        bottom: "50%",
        transform: "translate(-50%, 50%)",
        background: "rgba(30, 22, 48, 0.92)",
        color: "#f4ecd0",
        padding: "12px 22px",
        borderRadius: "14px",
        fontSize: "16px",
        fontWeight: "600",
        letterSpacing: "1px",
        border: "1px solid rgba(239, 227, 176, 0.5)",
        boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
        zIndex: "999",
        pointerEvents: "none",
        opacity: "0",
        transition: "opacity 0.25s ease",
      });
      document.body.appendChild(toast);
    }
    toast.textContent = `『${text}』 (준비 중)`;
    requestAnimationFrame(() => (toast.style.opacity = "1"));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toast.style.opacity = "0"), 1100);
  }
});
