import { resolveHorizontal, resolveVertical } from "./collision.js";

export default class Player {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;

    this.width = 34;
    this.height = 48;
    this.color = "#151515";

    // Скорость в пикселях в секунду
    this.speed = 240;

    // Гравитация
    this.gravity = 1500;

    // Прыжок вверх
    this.jumpVelocity = -560;

    this.reset(x, y);
  }

  reset(x = this.startX, y = this.startY) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.fallen = false;
  }

  update(dt, input, level) {
    const left = input.isDown("ArrowLeft", "KeyA");
    const right = input.isDown("ArrowRight", "KeyD");

    let vx = 0;

    if (left) {
      vx = -this.speed;
      this.facing = -1;
    }

    if (right) {
      vx = this.speed;
      this.facing = 1;
    }

    // -----------------------
    // Горизонтальное движение
    // -----------------------

    const prevX = this.x;
    const horizontal = resolveHorizontal(
      this,
      prevX,
      this.x + vx * dt,
      level.platforms
    );

    this.x = horizontal.x;

    // Не выходим за границы уровня
    if (this.x < 0) {
      this.x = 0;
    }

    if (this.x + this.width > level.width) {
      this.x = level.width - this.width;
    }

    // -----------------------
    // Вертикальное движение
    // -----------------------

    this.vy += this.gravity * dt;

    const prevY = this.y;
    const vertical = resolveVertical(
      this,
      prevY,
      this.y + this.vy * dt,
      level.platforms
    );

    this.y = vertical.y;
    this.vy = vertical.vy;
    this.onGround = vertical.onGround;

    // Если герой упал за уровень — фиксируем это.
    // Поражение обработает Game.js.
    if (this.y > level.height + 200) {
      this.fallen = true;
    }

    // -----------------------
    // Прыжок
    // -----------------------

    const wantJump = input.takeJump();

    if (wantJump && this.onGround) {
      this.vy = this.jumpVelocity;
      this.onGround = false;
    }
  }

  draw(ctx) {
    const x = this.x;
    const y = this.y;
    const width = this.width;
    const height = this.height;

    // Хвост
    ctx.save();
    ctx.strokeStyle = "#232323";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    const tailBaseX = this.facing === 1 ? x + width - 4 : x + 4;
    const tailDir = this.facing === 1 ? 1 : -1;

    ctx.beginPath();
    ctx.moveTo(tailBaseX, y + 32);
    ctx.quadraticCurveTo(
      tailBaseX + tailDir * 18,
      y + 22,
      tailBaseX + tailDir * 12,
      y + 6
    );
    ctx.stroke();
    ctx.restore();

    // Лёгкая тень тела
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(x + 3, y + 4, width, height);

    // Тело кота
    ctx.fillStyle = this.color;
    ctx.fillRect(x, y, width, height);

    // Животик
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(x + 7, y + 24, width - 14, height - 30);

    // Контур, чтобы кот лучше читался на тёмном фоне
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, width - 1.5, height - 1.5);

    // Уши
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 10, y - 11);
    ctx.lineTo(x + 17, y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + width - 17, y);
    ctx.lineTo(x + width - 10, y - 11);
    ctx.lineTo(x + width - 4, y);
    ctx.closePath();
    ctx.fill();

    // Внутренняя часть ушей
    ctx.fillStyle = "#ff8fab";

    ctx.beginPath();
    ctx.moveTo(x + 7, y - 1);
    ctx.lineTo(x + 10, y - 7);
    ctx.lineTo(x + 14, y - 1);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + width - 14, y - 1);
    ctx.lineTo(x + width - 10, y - 7);
    ctx.lineTo(x + width - 7, y - 1);
    ctx.closePath();
    ctx.fill();

    // Глаза
    const eyeShift = this.facing === 1 ? 2 : -2;

    ctx.fillStyle = "#7CFF6B";
    ctx.fillRect(x + 8 + eyeShift, y + 14, 5, 6);
    ctx.fillRect(x + 21 + eyeShift, y + 14, 5, 6);

    // Зрачки
    ctx.fillStyle = "#111111";
    ctx.fillRect(x + 10 + eyeShift, y + 16, 2, 3);
    ctx.fillRect(x + 23 + eyeShift, y + 16, 2, 3);

    // Нос
    ctx.fillStyle = "#ff5d8f";
    ctx.fillRect(x + 15 + eyeShift, y + 24, 4, 3);

    // Усы
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x + 12 + eyeShift, y + 27);
    ctx.lineTo(x + 2 + eyeShift, y + 25);

    ctx.moveTo(x + 12 + eyeShift, y + 29);
    ctx.lineTo(x + 2 + eyeShift, y + 30);

    ctx.moveTo(x + 22 + eyeShift, y + 27);
    ctx.lineTo(x + 32 + eyeShift, y + 25);

    ctx.moveTo(x + 22 + eyeShift, y + 29);
    ctx.lineTo(x + 32 + eyeShift, y + 30);

    ctx.stroke();
  }
}