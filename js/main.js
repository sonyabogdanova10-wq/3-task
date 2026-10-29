import Game from "./Game.js";

const canvas = document.getElementById("game");

const ui = {
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resumeBtn: document.getElementById("resumeBtn"),
  restartBtn: document.getElementById("restartBtn"),
  stateEl: document.getElementById("stateLabel"),
  fishEl: document.getElementById("fishLabel"),
  bestEl: document.getElementById("bestLabel")
};

const game = new Game(canvas, ui);

// Игра стартует не автоматически, а по кнопке "Старт" или Enter.
// Это удобно для сдачи: видны состояния stopped / running / paused / won / lost.