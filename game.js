// Игровые переменные
let players = [
  { name: "Игрок 1", money: 1000 },
  { name: "Игрок 2", money: 1000 }
];
let currentBid = 0;
let currentPlayer = null;
let timer = 10;
let containerCount = 1;
let gameInterval;

// Элементы интерфейса
const startScreen = document.getElementById('start-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const auctionScreen = document.getElementById('auction-screen');
const resultsScreen = document.getElementById('results-screen');
const playersList = document.getElementById('players-list');
const startBtn = document.getElementById('start-btn');
const startAuctionBtn = document.getElementById('start-auction-btn');
const bidBtn = document.getElementById('bid-btn');
const restartBtn = document.getElementById('restart-btn');
const timerDisplay = document.getElementById('timer');
const currentBidDisplay = document.getElementById('current-bid');
const bidInput = document.getElementById('bid-input');
const containerNumber = document.getElementById('container-number');
const winnerInfo = document.getElementById('winner-info');

// Начало игры
startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
  renderPlayers();
});

// Рендер списка игроков
function renderPlayers() {
  playersList.innerHTML = '';
  players.forEach(player => {
    const playerEl = document.createElement('div');
    playerEl.className = 'player';
    playerEl.textContent = `${player.name} ($${player.money})`;
    playersList.appendChild(playerEl);
  });
}

// Старт аукциона
startAuctionBtn.addEventListener('click', () => {
  lobbyScreen.classList.add('hidden');
  auctionScreen.classList.remove('hidden');
  startAuction();
});

// Логика аукциона
function startAuction() {
  currentBid = 0;
  currentBidDisplay.textContent = currentBid;
  containerNumber.textContent = containerCount;
  timer = 10;
  timerDisplay.textContent = timer;

  gameInterval = setInterval(() => {
    timer--;
    timerDisplay.textContent = timer;

    if (timer <= 0) {
      clearInterval(gameInterval);
      endAuction();
    }
  }, 1000);
}

// Ставка
bidBtn.addEventListener('click', () => {
  const bid = parseInt(bidInput.value);
  if (bid > currentBid && bid <= players[0].money) {
    currentBid = bid;
    currentBidDisplay.textContent = currentBid;
    bidInput.value = '';
    timer = 10; // Сброс таймера при новой ставке
  }
});

// Конец аукциона
function endAuction() {
  containerCount++;
  if (containerCount > 3) { // 3 контейнера для примера
    endGame();
  } else {
    startAuction();
  }
}

// Конец игры
function endGame() {
  auctionScreen.classList.add('hidden');
  resultsScreen.classList.remove('hidden');
  const winner = players.reduce((prev, current) => 
    (prev.money > current.money) ? prev : current
  );
  winnerInfo.textContent = `Победитель: ${winner.name} ($${winner.money})`;
}

// Рестарт
restartBtn.addEventListener('click', () => {
  location.reload();
});
