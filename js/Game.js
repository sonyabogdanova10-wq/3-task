import Player from "./Player.js";
import Input from "./input.js";
import { rectsIntersect } from "./collision.js";

const STORAGE_KEY = "catPlatformerBestScore";

export default class Game {
  constructor(canvas, ui = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.ui = {
      startBtn: ui.startBtn || null,
      pauseBtn: ui.pauseBtn || null,
      resumeBtn: ui.resumeBtn || null,
      restartBtn: ui.restartBtn || null,

      stateEl: ui.stateEl || null,
      fishEl: ui.fishEl || null,
      bestEl: ui.bestEl || null,

      leftBtn: ui.leftBtn || null,
      rightBtn: ui.rightBtn || null,
      jumpBtn: ui.jumpBtn || null
    };

    this.input = new Input();

    // Состояния игры:
    // stopped — остановлено
    // running — идёт игра
    // paused  — пауза
    // won     — победа
    // lost    — поражение
    this.state = "stopped";

    // ID текущего requestAnimationFrame.
    this.rafId = null;

    // Время последнего кадра.
    this.lastTime = 0;

    // Если true, после возврата во вкладку игра продолжится сама.
    // Для сдачи лучше оставить false.
    this.autoResumeOnVisible = false;

    // Камера для длинного уровня.
    this.camera = {
      x: 0,
      y: 0
    };

    // Счёт и рекорд.
    this.score = 0;
    this.bestScore = 0;
    this.totalItems = 0;

    // Время для анимации лавы и рыбок.
    this.lavaTime = 0;

    // Текст результата для победы/поражения.
    this.result = {
      title: "",
      text: ""
    };

    const levelWidth = 2650;
    const lavaY = canvas.height - 40;

    this.level = {
      width: levelWidth,
      height: canvas.height,

      // Платформы теперь — островки и уступы над лавой.
      platforms: [
        // Стартовый остров
        {
          x: 30,
          y: 385,
          width: 170,
          height: 65,
          type: "island"
        },

        // Платформа 1
        {
          x: 260,
          y: 345,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 2
        {
          x: 430,
          y: 300,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 3
        {
          x: 610,
          y: 255,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 4
        {
          x: 800,
          y: 310,
          width: 130,
          height: 20,
          type: "platform"
        },

        // Платформа 5
        {
          x: 990,
          y: 360,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 6
        {
          x: 1160,
          y: 300,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 7
        {
          x: 1340,
          y: 245,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 8
        {
          x: 1530,
          y: 300,
          width: 130,
          height: 20,
          type: "platform"
        },

        // Платформа 9
        {
          x: 1720,
          y: 355,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 10
        {
          x: 1900,
          y: 300,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 11
        {
          x: 2080,
          y: 245,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 12
        {
          x: 2270,
          y: 300,
          width: 130,
          height: 20,
          type: "platform"
        },

        // Финишный остров
        {
          x: 2450,
          y: 350,
          width: 180,
          height: 100,
          type: "island"
        }
      ],

      // Три собираемые рыбки.
      items: [
        {
          x: 658,
          y: 130,
          width: 24,
          height: 24,
          collected: false,
          type: "fish"
        },
        {
          x: 1388,
          y: 130,
          width: 24,
          height: 24,
          collected: false,
          type: "fish"
        },
        {
          x: 2128,
          y: 130,
          width: 24,
          height: 24,
          collected: false,
          type: "fish"
        }
      ],

      // Лава на весь пол.
      hazards: [
        {
          x: 0,
          y: lavaY,
          width: levelWidth,
          height: 400,
          type: "lava"
        }
      ],

      // Финишный флажок на последнем острове.
      finish: {
        x: 2545,
        y: 260,
        width: 40,
        height: 90,
        type: "finish"
      }
    };

    this.totalItems = this.level.items.length;

    this.player = new Player(70, 0);

    // Ставим героя на стартовый остров.
    const startIsland = this.level.platforms[0];
    this.player.startX = 70;
    this.player.startY = startIsland.y - this.player.height;
    this.player.reset(this.player.startX, this.player.startY);

    this.bestScore = this.loadBestScore();

    // Пока игра не запущена, ввод не активен.
    this.input.setActive(false);

    this.bindEvents();
    this.updateUI();
    this.render();
  }

  bindEvents() {
    if (this.ui.startBtn) {
      this.ui.startBtn.addEventListener("click", this.onStartClick);
    }

    if (this.ui.pauseBtn) {
      this.ui.pauseBtn.addEventListener("click", this.onPauseClick);
    }

    if (this.ui.resumeBtn) {
      this.ui.resumeBtn.addEventListener("click", this.onResumeClick);
    }

    if (this.ui.restartBtn) {
      this.ui.restartBtn.addEventListener("click", this.onRestartClick);
    }

    // Сенсорное управление.
    this.input.attachTouchControls({
      left: this.ui.leftBtn,
      right: this.ui.rightBtn,
      jump: this.ui.jumpBtn
    });

    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("keydown", this.onGlobalKeyDown);
  }

  blurTarget(event) {
    if (
      event &&
      event.currentTarget &&
      typeof event.currentTarget.blur === "function"
    ) {
      event.currentTarget.blur();
    }
  }

  onStartClick = (event) => {
    this.blurTarget(event);

    if (this.state === "stopped") {
      this.start();
    } else if (this.state === "paused") {
      this.resume();
    } else if (this.state === "won" || this.state === "lost") {
      this.restart();
    }
  };

  onPauseClick = (event) => {
    this.blurTarget(event);
    this.pause();
  };

  onResumeClick = (event) => {
    this.blurTarget(event);
    this.resume();
  };

  onRestartClick = (event) => {
    this.blurTarget(event);
    this.restart();
  };

  onVisibilityChange = () => {
    if (document.hidden) {
      if (this.state === "running") {
        this.pause();
      }
    } else {
      if (this.autoResumeOnVisible && this.state === "paused") {
        this.resume();
      }
    }
  };

  onGlobalKeyDown = (event) => {
    const tag = event.target && event.target.tagName ? event.target.tagName : "";

    // Не мешаем вводу в поля, если они когда-нибудь появятся.
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    // Enter:
    // - в stopped запускает игру;
    // - в paused продолжает;
    // - в won/lost перезапускает.
    if (event.code === "Enter" || event.code === "NumpadEnter") {
      // Если фокус на кнопке, пусть кнопка сама обработает Enter.
      if (tag === "BUTTON") return;

      event.preventDefault();

      if (this.state === "paused") {
        this.resume();
      } else if (this.state === "stopped") {
        this.start();
      } else if (this.state === "won" || this.state === "lost") {
        this.restart();
      }
    }

    // R — быстрый рестарт.
    if (event.code === "KeyR") {
      event.preventDefault();

      // Если фокус был на кнопке, убираем его, чтобы потом стрелки работали комфортно.
      if (event.target && typeof event.target.blur === "function") {
        event.target.blur();
      }

      this.restart();
    }

    // Чтобы страница не прокручивалась игровыми клавишами,
    // когда игра не активна.
    const preventWhenInactive = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space"
    ];

    if (
      this.state !== "running" &&
      tag !== "BUTTON" &&
      preventWhenInactive.includes(event.code)
    ) {
      event.preventDefault();
    }
  };

  start() {
    if (this.state === "running") return;

    if (this.state === "paused") {
      this.resume();
      return;
    }

    if (this.state === "won" || this.state === "lost") {
      this.restart();
      return;
    }

    this.state = "running";
    this.input.setActive(true);

    this.lastTime = performance.now();

    this.updateUI();
    this.schedule();
  }

  stop() {
    this.cancelLoop();
    this.state = "stopped";

    this.input.clear();
    this.input.setActive(false);

    this.updateUI();
    this.render();
  }

  pause() {
    if (this.state !== "running") return;

    this.cancelLoop();
    this.state = "paused";

    this.input.clear();
    this.input.setActive(false);

    this.updateUI();
    this.render();
  }

  resume() {
    if (this.state !== "paused") return;

    this.state = "running";
    this.input.setActive(true);

    // Важно: сбрасываем время, чтобы после паузы не было рывка.
    this.lastTime = performance.now();

    this.updateUI();
    this.schedule();
  }

  restart() {
    this.cancelLoop();
    this.resetLevel();

    this.state = "stopped";
    this.start();
  }

  resetLevel() {
    this.player.reset(this.player.startX, this.player.startY);

    this.camera.x = 0;
    this.score = 0;
    this.lavaTime = 0;

    this.result.title = "";
    this.result.text = "";

    for (const item of this.level.items) {
      item.collected = false;
    }
  }

  schedule() {
    this.cancelLoop();
    this.rafId = requestAnimationFrame(this.loop);
  }

  cancelLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  loop = (currentTime) => {
    if (this.state !== "running") {
      this.rafId = null;
      return;
    }

    let dt = (currentTime - this.lastTime) / 1000;

    if (!Number.isFinite(dt) || dt < 0) {
      dt = 0;
    }

    // Ограничиваем слишком большой шаг времени.
    dt = Math.min(dt, 0.05);

    this.lastTime = currentTime;

    this.update(dt);

    // Если во время update наступила победа/поражение,
    // не запрашиваем следующий кадр.
    if (this.state !== "running") {
      this.render();
      this.rafId = null;
      return;
    }

    this.render();
    this.schedule();
  };

  update(dt) {
    this.lavaTime += dt;

    this.player.update(dt, this.input, this.level);

    // 1. Поражение при падении.
    if (this.player.fallen) {
      this.lose("Поражение", "Кот упал в лаву.");
      return;
    }

    // 2. Поражение при касании опасности.
    for (const hazard of this.level.hazards) {
      if (rectsIntersect(this.player, hazard)) {
        this.lose("Поражение", "Кот коснулся лавы.");
        return;
      }
    }

    // 3. Сбор предметов.
    for (const item of this.level.items) {
      if (!item.collected && rectsIntersect(this.player, item)) {
        item.collected = true;
        this.score += 1;

        this.saveBestScore();
        this.updateUI();
      }
    }

    // 4. Победа: все предметы собраны + касание финиша.
    if (
      this.score === this.totalItems &&
      rectsIntersect(this.player, this.level.finish)
    ) {
      this.win("Победа", "Кот собрал все рыбки и добрался до флажка!");
      return;
    }

    this.updateCamera(dt);
  }

  win(title, text) {
    if (this.state !== "running") return;

    this.cancelLoop();
    this.state = "won";

    this.result.title = title;
    this.result.text = text;

    this.input.clear();
    this.input.setActive(false);

    this.saveBestScore();
    this.updateUI();
    this.render();
  }

  lose(title, text) {
    if (this.state !== "running") return;

    this.cancelLoop();
    this.state = "lost";

    this.result.title = title;
    this.result.text = text;

    this.input.clear();
    this.input.setActive(false);

    this.saveBestScore();
    this.updateUI();
    this.render();
  }

  loadBestScore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw === null) return 0;

      const value = Number(raw);

      if (!Number.isFinite(value) || value < 0) {
        return 0;
      }

      return Math.min(Math.floor(value), this.totalItems);
    } catch (error) {
      // Если localStorage недоступен, просто играем без сохранения рекорда.
      return 0;
    }
  }

  saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;

      try {
        localStorage.setItem(STORAGE_KEY, String(this.bestScore));
      } catch (error) {
        // Игнорируем ошибки хранения: например, приватный режим браузера.
      }
    }
  }

  updateCamera(dt) {
    const targetX =
      this.player.x + this.player.width / 2 - this.canvas.width / 2;

    const maxCameraX = Math.max(0, this.level.width - this.canvas.width);

    const clampedTargetX = Math.max(0, Math.min(targetX, maxCameraX));

    // Плавное движение камеры.
    const smoothing = 1 - Math.pow(0.001, dt * 8);
    this.camera.x += (clampedTargetX - this.camera.x) * smoothing;

    if (Math.abs(clampedTargetX - this.camera.x) < 0.5) {
      this.camera.x = clampedTargetX;
    }

    this.camera.y = 0;
  }

  updateUI() {
    const stateMap = {
      stopped: "остановлено",
      running: "играет",
      paused: "пауза",
      won: "победа",
      lost: "поражение"
    };

    const stateText = stateMap[this.state] || this.state;

    if (this.ui.stateEl) {
      this.ui.stateEl.textContent = `Состояние: ${stateText}`;
    }

    if (this.ui.fishEl) {
      this.ui.fishEl.textContent = `Рыбки: ${this.score}/${this.totalItems}`;
    }

    if (this.ui.bestEl) {
      this.ui.bestEl.textContent = `Рекорд: ${this.bestScore}/${this.totalItems}`;
    }

    if (this.ui.startBtn) {
      this.ui.startBtn.disabled = this.state !== "stopped";
    }

    if (this.ui.pauseBtn) {
      this.ui.pauseBtn.disabled = this.state !== "running";
    }

    if (this.ui.resumeBtn) {
      this.ui.resumeBtn.disabled = this.state !== "paused";
    }

    if (this.ui.restartBtn) {
      this.ui.restartBtn.disabled = false;
    }
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawSunsetBackground(ctx);

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), 0);

    // Сначала лава, потом островки/платформы, чтобы они были над лавой.
    this.drawHazards(ctx);
    this.drawPlatforms(ctx);
    this.drawItems(ctx);
    this.drawFinish(ctx);
    this.player.draw(ctx);

    ctx.restore();

    // Информационная плашка внутри canvas убрана.
    // Остаются только полноэкранные состояния: старт / пауза / победа / поражение.
    this.drawOverlay(ctx);
  }

  drawSunsetBackground(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#1b0d2a");
    sky.addColorStop(0.22, "#4b1d66");
    sky.addColorStop(0.45, "#a33b7a");
    sky.addColorStop(0.66, "#ff7a45");
    sky.addColorStop(0.84, "#ffc34d");
    sky.addColorStop(1, "#ffe29a");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Солнце.
    const sunX = w * 0.78;
    const sunY = h * 0.24;

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(sunX, sunY, h * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(sunX, sunY, h * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#ffe9a8";
    ctx.beginPath();
    ctx.arc(sunX, sunY, h * 0.075, 0, Math.PI * 2);
    ctx.fill();

    this.drawParallaxHills(ctx, this.camera.x);
  }

  drawParallaxHills(ctx, cameraX) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const layers = [
      {
        parallax: 0.16,
        baseY: h * 0.70,
        amplitude: 28,
        frequency: 0.0055,
        color: "rgba(58, 22, 74, 0.42)"
      },
      {
        parallax: 0.32,
        baseY: h * 0.79,
        amplitude: 20,
        frequency: 0.0085,
        color: "rgba(32, 13, 44, 0.62)"
      }
    ];

    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, h);

      const offset = cameraX * layer.parallax;

      for (let x = 0; x <= w; x += 16) {
        const worldX = x + offset;

        const y =
          layer.baseY +
          Math.sin(worldX * layer.frequency) * layer.amplitude +
          Math.sin(worldX * layer.frequency * 2.2 + 1.4) * layer.amplitude * 0.35;

        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawHazards(ctx) {
    for (const h of this.level.hazards) {
      const lavaY = h.y;
      const lavaBottom = this.canvas.height;
      const lavaWidth = h.width;
      const step = 14;

      // Мягкое свечение над лавой.
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.sin(this.lavaTime * 2) * 0.04;
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(h.x, lavaY - 24, lavaWidth, 24);
      ctx.restore();

      // Основная лава.
      const lavaGradient = ctx.createLinearGradient(0, lavaY, 0, lavaBottom);
      lavaGradient.addColorStop(0, "#ff9e00");
      lavaGradient.addColorStop(0.18, "#ff6b35");
      lavaGradient.addColorStop(0.55, "#d62828");
      lavaGradient.addColorStop(1, "#6a040f");

      ctx.fillStyle = lavaGradient;
      ctx.fillRect(h.x, lavaY, lavaWidth, lavaBottom - lavaY);

      // Анимированная поверхность лавы.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(h.x, lavaBottom);

      for (let x = h.x; x <= h.x + lavaWidth; x += step) {
        const wave =
          Math.sin(x * 0.018 + this.lavaTime * 2.1) * 4 +
          Math.sin(x * 0.043 + this.lavaTime * 3.4) * 2;

        ctx.lineTo(x, lavaY + 6 + wave);
      }

      ctx.lineTo(h.x + lavaWidth, lavaBottom);
      ctx.closePath();

      const surfaceGradient = ctx.createLinearGradient(0, lavaY, 0, lavaY + 22);
      surfaceGradient.addColorStop(0, "rgba(255, 230, 120, 0.95)");
      surfaceGradient.addColorStop(0.45, "rgba(255, 140, 50, 0.75)");
      surfaceGradient.addColorStop(1, "rgba(214, 40, 40, 0.0)");

      ctx.fillStyle = surfaceGradient;
      ctx.fill();
      ctx.restore();

      // Яркая кромка лавы.
      ctx.strokeStyle = "rgba(255, 235, 150, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = h.x; x <= h.x + lavaWidth; x += step) {
        const wave =
          Math.sin(x * 0.018 + this.lavaTime * 2.1) * 4 +
          Math.sin(x * 0.043 + this.lavaTime * 3.4) * 2;

        const y = lavaY + 6 + wave;

        if (x === h.x) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Пузырьки лавы.
      ctx.fillStyle = "rgba(255, 225, 150, 0.55)";

      for (let x = h.x + 20; x < h.x + lavaWidth; x += 90) {
        const seed = x * 0.01;
        const bubbleY =
          lavaY + 12 + ((Math.sin(seed + this.lavaTime * 2.5) + 1) * 10);
        const radius = 2 + (Math.sin(seed * 3.1) + 1) * 1.5;

        ctx.beginPath();
        ctx.arc(x, bubbleY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPlatforms(ctx) {
    for (const p of this.level.platforms) {
      if (p.type === "island") {
        // Тень острова.
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.fillRect(p.x + 4, p.y + 6, p.width, p.height);

        // Каменная основа острова.
        ctx.fillStyle = "#43263a";
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Более светлая внутренняя часть.
        ctx.fillStyle = "#5a3550";
        ctx.fillRect(p.x + 4, p.y + 4, p.width - 8, p.height - 4);

        // Верх острова.
        ctx.fillStyle = "#4f7d63";
        ctx.fillRect(p.x, p.y, p.width, 12);

        // Тёплый блик сверху.
        ctx.fillStyle = "rgba(255, 220, 150, 0.28)";
        ctx.fillRect(p.x, p.y, p.width, 3);

        // Рамка.
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
      } else {
        // Тень платформы.
        ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
        ctx.fillRect(p.x + 3, p.y + 4, p.width, p.height);

        // Основа платформы.
        ctx.fillStyle = "#5b3a4a";
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Тёплая верхняя кромка.
        ctx.fillStyle = "#ff9f68";
        ctx.fillRect(p.x, p.y, p.width, 4);

        // Рамка.
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
      }
    }
  }

  drawItems(ctx) {
    for (const item of this.level.items) {
      if (item.collected) continue;

      const bob = Math.sin(this.lavaTime * 3 + item.x * 0.02) * 3;

      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2 + bob;

      ctx.save();

      // Свечение рыбки.
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(cx, cy, item.width * 0.85, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;

      // Тело рыбки.
      ctx.fillStyle = "#ffb703";
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        item.width * 0.45,
        item.height * 0.32,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Хвост рыбки.
      ctx.beginPath();
      ctx.moveTo(cx + item.width * 0.34, cy);
      ctx.lineTo(cx + item.width * 0.62, cy - item.height * 0.28);
      ctx.lineTo(cx + item.width * 0.62, cy + item.height * 0.28);
      ctx.closePath();
      ctx.fill();

      // Глазик.
      ctx.fillStyle = "#1f1f1f";
      ctx.fillRect(cx - item.width * 0.18, cy - item.height * 0.08, 3, 3);

      ctx.restore();
    }
  }

  drawFinish(ctx) {
    const f = this.level.finish;
    const unlocked = this.score === this.totalItems;

    // Шест.
    ctx.fillStyle = unlocked ? "#ffe9a8" : "#8d99ae";
    ctx.fillRect(f.x, f.y, 6, f.height);

    // Основание флага на острове.
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(f.x - 10, f.y + f.height - 4, 26, 4);

    // Флаг.
    ctx.fillStyle = unlocked ? "#7CFF6B" : "#5c677d";
    ctx.beginPath();
    ctx.moveTo(f.x + 6, f.y + 8);
    ctx.lineTo(f.x + 42, f.y + 20);
    ctx.lineTo(f.x + 6, f.y + 32);
    ctx.closePath();
    ctx.fill();

    // Если финиш открыт, добавим маленький блеск.
    if (unlocked) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fillRect(f.x + 14, f.y + 16, 4, 4);
      ctx.fillRect(f.x + 26, f.y + 22, 3, 3);
    }
  }

  drawOverlay(ctx) {
    if (this.state === "running") return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    if (this.state === "won") {
      ctx.fillStyle = "rgba(8, 35, 20, 0.78)";
    } else if (this.state === "lost") {
      ctx.fillStyle = "rgba(45, 8, 20, 0.80)";
    } else if (this.state === "paused") {
      ctx.fillStyle = "rgba(4, 4, 4, 0.72)";
    } else {
      ctx.fillStyle = "rgba(4, 4, 4, 0.82)";
    }

    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.state === "won") {
      ctx.fillStyle = "#b9fbc0";
      ctx.font = "700 40px Montserrat, Arial, sans-serif";
      ctx.fillText("Победа!", w / 2, h / 2 - 62);

      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.font = "400 17px Montserrat, Arial, sans-serif";
      ctx.fillText(this.result.text, w / 2, h / 2 - 18);

      ctx.fillText(`Собрано рыбок: ${this.score}/${this.totalItems}`, w / 2, h / 2 + 12);
      ctx.fillText(`Рекорд: ${this.bestScore}/${this.totalItems}`, w / 2, h / 2 + 40);

      ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
      ctx.font = "400 15px Montserrat, Arial, sans-serif";
      ctx.fillText("Нажми «Заново» или R, чтобы сыграть ещё раз.", w / 2, h / 2 + 76);
    } else if (this.state === "lost") {
      ctx.fillStyle = "#ffccd5";
      ctx.font = "700 40px Montserrat, Arial, sans-serif";
      ctx.fillText("Поражение", w / 2, h / 2 - 62);

      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.font = "400 17px Montserrat, Arial, sans-serif";
      ctx.fillText(this.result.text, w / 2, h / 2 - 18);

      ctx.fillText(`Собрано рыбок: ${this.score}/${this.totalItems}`, w / 2, h / 2 + 12);
      ctx.fillText(`Рекорд: ${this.bestScore}/${this.totalItems}`, w / 2, h / 2 + 40);

      ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
      ctx.font = "400 15px Montserrat, Arial, sans-serif";
      ctx.fillText("Нажми «Заново» или R, чтобы попробовать снова.", w / 2, h / 2 + 76);
    } else if (this.state === "paused") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 34px Montserrat, Arial, sans-serif";
      ctx.fillText("Пауза", w / 2, h / 2 - 34);

      ctx.font = "400 16px Montserrat, Arial, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      ctx.fillText("Вкладка была скрыта, поэтому игра остановилась.", w / 2, h / 2 + 4);
      ctx.fillText("Нажми «Продолжить» или Enter.", w / 2, h / 2 + 32);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 34px Montserrat, Arial, sans-serif";
      ctx.fillText("Платформер готов", w / 2, h / 2 - 54);

      ctx.font = "400 16px Montserrat, Arial, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      ctx.fillText("Нажми «Старт» или Enter, чтобы начать.", w / 2, h / 2 - 14);

      ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
      ctx.font = "400 14px Montserrat, Arial, sans-serif";
      ctx.fillText("Клавиатура: стрелки / A D — движение, Space / W — прыжок.", w / 2, h / 2 + 16);
      ctx.fillText("Телефон: кнопки слева и прыжок справа.", w / 2, h / 2 + 40);
      ctx.fillText("Собери 3 рыбки и добеги до флажка.", w / 2, h / 2 + 64);
    }

    ctx.restore();
  }

  destroy() {
    this.stop();

    if (this.ui.startBtn) {
      this.ui.startBtn.removeEventListener("click", this.onStartClick);
    }

    if (this.ui.pauseBtn) {
      this.ui.pauseBtn.removeEventListener("click", this.onPauseClick);
    }

    if (this.ui.resumeBtn) {
      this.ui.resumeBtn.removeEventListener("click", this.onResumeClick);
    }

    if (this.ui.restartBtn) {
      this.ui.restartBtn.removeEventListener("click", this.onRestartClick);
    }

    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("keydown", this.onGlobalKeyDown);
  }
}