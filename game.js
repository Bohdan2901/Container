// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCJuTuxuPhYxCjZXqMZWJTTmLrgxVkTGBY",
  authDomain: "container-auction.firebaseapp.com",
  databaseURL: "https://container-auction-default-rtdb.firebaseio.com",
  projectId: "container-auction",
  storageBucket: "container-auction.appspot.com",
  messagingSenderId: "907236645178",
  appId: "1:907236645178:web:7d5393a8592fbb81b7c442"
};

// Инициализация Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Состояние игры
const gameState = {
  currentUser: null,
  lobbyId: null,
  currentContainer: 1,
  totalContainers: 10,
  timer: 30,
  timerInterval: null,
  currentBid: 0,
  currentBidder: null,
  currentBidderName: null,
  isContainerOpen: false,
  containerItems: []
};

// DOM элементы
const elements = {
  lobbyId: document.getElementById('lobby-id'),
  containerCounter: document.getElementById('container-counter'),
  container: document.getElementById('container'),
  containerItems: document.getElementById('container-items'),
  timer: document.getElementById('timer'),
  currentBid: document.getElementById('current-bid'),
  bidAmount: document.getElementById('bid-amount'),
  placeBid: document.getElementById('place-bid'),
  playerList: document.getElementById('player-list'),
  notification: document.getElementById('notification'),
  particles: document.getElementById('particles')
};

// Инициализация игры
function initGame() {
  // Получаем ID лобби из URL
  const urlParams = new URLSearchParams(window.location.search);
  gameState.lobbyId = urlParams.get('id');
  
  if (!gameState.lobbyId) {
    showNotification("Не указан ID лобби!", "error");
    setTimeout(() => window.location.href = 'index.html', 2000);
    return;
  }
  
  // Создаем частицы фона
  createParticles();
  
  // Аутентификация
  auth.signInAnonymously()
    .then((userCredential) => {
      gameState.currentUser = userCredential.user;
      setupEventListeners();
      loadGameData();
    })
    .catch((error) => {
      showNotification("Ошибка входа: " + error.message, "error");
    });
}

// Создание частиц фона
function createParticles() {
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    const size = Math.random() * 10 + 5;
    const posX = Math.random() * 100;
    const delay = Math.random() * 15;
    const duration = 15 + Math.random() * 30;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}%`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.opacity = Math.random() * 0.5 + 0.1;
    
    elements.particles.appendChild(particle);
  }
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Сделать ставку
  elements.placeBid.addEventListener('click', placeBid);
  
  // Нажатие Enter в поле ставки
  elements.bidAmount.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') placeBid();
  });
  
  // Клик по контейнеру для открытия
  elements.container.addEventListener('click', () => {
    if (gameState.isContainerOpen) {
      openContainer();
    }
  });
}

// Загрузка данных игры
function loadGameData() {
  // Загружаем информацию о лобби
  db.ref(`lobbies/${gameState.lobbyId}`).on('value', (snapshot) => {
    const lobby = snapshot.val();
    if (!lobby) {
      showNotification("Лобби не найдено!", "error");
      setTimeout(() => window.location.href = 'index.html', 2000);
      return;
    }
    
    gameState.totalContainers = lobby.settings?.containers || 10;
    updateLobbyInfo();
    
    // Загружаем текущий контейнер
    loadCurrentContainer();
  });
  
  // Загружаем список игроков
  db.ref(`lobbies/${gameState.lobbyId}/players`).on('value', (snapshot) => {
    renderPlayers(snapshot.val());
  });
}

// Загрузка текущего контейнера
function loadCurrentContainer() {
  db.ref(`containers/${gameState.lobbyId}/current`).on('value', (snapshot) => {
    const container = snapshot.val();
    if (!container) {
      // Если контейнера нет, создаем новый
      startNewRound();
      return;
    }
    
    gameState.currentBid = container.topBid || 0;
    gameState.currentBidder = container.topBidder || null;
    gameState.currentBidderName = container.topBidderName || null;
    gameState.containerItems = container.items || [];
    
    updateBidInfo();
    
    // Если контейнер открыт
    if (container.isOpen) {
      gameState.isContainerOpen = true;
      openContainer();
    } else {
      // Запускаем таймер только если контейнер не открыт
      if (!gameState.timerInterval) {
        startTimer();
      }
    }
  });
}

// Обновление информации о лобби
function updateLobbyInfo() {
  elements.lobbyId.textContent = `Лобби #${gameState.lobbyId}`;
  elements.containerCounter.textContent = `Контейнер ${gameState.currentContainer}/${gameState.totalContainers}`;
}

// Обновление информации о ставке
function updateBidInfo() {
  const bidAmountEl = elements.currentBid.querySelector('.bid-amount');
  const bidderNameEl = elements.currentBid.querySelector('.bidder-name');
  
  bidAmountEl.textContent = `$${gameState.currentBid.toLocaleString()}`;
  bidderNameEl.textContent = gameState.currentBidderName || 'Нет';
  
  // Подсветка если ставка текущего пользователя
  if (gameState.currentBidder === gameState.currentUser.uid) {
    bidAmountEl.style.color = 'var(--accent)';
    bidderNameEl.style.color = 'var(--accent)';
  } else {
    bidAmountEl.style.color = '';
    bidderNameEl.style.color = '';
  }
}

// Отображение игроков
function renderPlayers(players) {
  if (!players) return;
  
  elements.playerList.innerHTML = '';
  
  // Сортируем игроков: ведущий первый, затем по деньгам
  const sortedPlayers = Object.entries(players).sort((a, b) => {
    if (a[1].isHost) return -1;
    if (b[1].isHost) return 1;
    return b[1].money - a[1].money;
  });
  
  sortedPlayers.forEach(([id, player]) => {
    const playerEl = document.createElement('div');
    playerEl.className = `player-card ${id === gameState.currentUser.uid ? 'current' : ''} ${player.isHost ? 'host' : ''}`;
    
    // Аватарка из первой буквы имени
    const firstLetter = player.name ? player.name.charAt(0).toUpperCase() : '?';
    
    // Рассчитываем ROI (окупаемость)
    const roi = player.totalSpent ? Math.round((player.totalWon - player.totalSpent) / player.totalSpent * 100) : 0;
    
    playerEl.innerHTML = `
      <div class="player-avatar">${firstLetter}</div>
      <div class="player-info">
        <div class="player-name">
          ${player.name}
          ${id === gameState.currentUser.uid ? '<span class="you-badge">Вы</span>' : ''}
          ${player.isHost ? '<i class="fas fa-crown" style="color: var(--accent); font-size: 0.8rem;"></i>' : ''}
        </div>
        <div class="player-money">
          <i class="fas fa-coins" style="color: var(--accent-light);"></i>
          $${player.money.toLocaleString()}
        </div>
        <div class="player-roi">ROI: ${roi}%</div>
      </div>
    `;
    
    elements.playerList.appendChild(playerEl);
  });
}

// Запуск таймера
function startTimer() {
  clearInterval(gameState.timerInterval);
  gameState.timer = 30;
  updateTimer();
  
  gameState.timerInterval = setInterval(() => {
    gameState.timer--;
    updateTimer();
    
    if (gameState.timer <= 0) {
      clearInterval(gameState.timerInterval);
      endBidding();
    }
  }, 1000);
}

// Обновление таймера
function updateTimer() {
  elements.timer.textContent = gameState.timer;
  
  // Меняем цвет при низком времени
  if (gameState.timer <= 10) {
    elements.timer.style.color = 'var(--primary)';
    elements.timer.style.animation = 'pulse 0.5s infinite alternate';
  } else {
    elements.timer.style.color = 'var(--accent)';
    elements.timer.style.animation = 'pulse 1s infinite alternate';
  }
}

// Размещение ставки
function placeBid() {
  const bidAmount = parseInt(elements.bidAmount.value);
  
  if (!bidAmount || bidAmount <= 0) {
    showNotification("Введите корректную сумму ставки!", "error");
    return;
  }
  
  if (bidAmount <= gameState.currentBid) {
    showNotification(`Ставка должна быть больше текущей ($${gameState.currentBid})!`, "error");
    return;
  }
  
  // Проверяем баланс игрока
  db.ref(`lobbies/${gameState.lobbyId}/players/${gameState.currentUser.uid}`).once('value')
    .then((snapshot) => {
      const player = snapshot.val();
      
      if (bidAmount > player.money) {
        showNotification("Недостаточно средств!", "error");
        return;
      }
      
      // Обновляем текущую ставку
      db.ref(`containers/${gameState.lobbyId}/current`).update({
        topBid: bidAmount,
        topBidder: gameState.currentUser.uid,
        topBidderName: player.name,
        lastBidTime: firebase.database.ServerValue.TIMESTAMP
      });
      
      // Сбрасываем таймер
      clearInterval(gameState.timerInterval);
      gameState.timer = 30;
      startTimer();
      
      // Очищаем поле ввода
      elements.bidAmount.value = '';
      
      showNotification(`Ставка $${bidAmount} принята!`, "success");
    })
    .catch((error) => {
      showNotification("Ошибка: " + error.message, "error");
    });
}

// Завершение торгов
function endBidding() {
  db.ref(`containers/${gameState.lobbyId}/current`).once('value')
    .then((snapshot) => {
      const container = snapshot.val();
      
      if (container.topBidder) {
        // Обновляем деньги победителя
        db.ref(`lobbies/${gameState.lobbyId}/players/${container.topBidder}/money`)
          .transaction((money) => money - container.topBid);
          
        // Обновляем общую сумму потраченного
        db.ref(`lobbies/${gameState.lobbyId}/players/${container.topBidder}/totalSpent`)
          .transaction((total) => (total || 0) + container.topBid);
          
        // Открываем контейнер
        db.ref(`containers/${gameState.lobbyId}/current`).update({
          isOpen: true
        });
        
        // Анимация открытия
        openContainer();
      } else {
        // Если ставок не было, переходим к следующему контейнеру
        nextContainer();
      }
    });
}

// Открытие контейнера
function openContainer() {
  if (gameState.isContainerOpen) return;
  
  gameState.isContainerOpen = true;
  elements.container.classList.add('open');
  
  // Показываем содержимое контейнера
  renderContainerItems();
  
  // Через 5 секунд переходим к следующему контейнеру
  setTimeout(() => {
    nextContainer();
  }, 5000);
}

// Отображение содержимого контейнера
function renderContainerItems() {
  elements.containerItems.innerHTML = '';
  
  if (gameState.containerItems.length === 0) {
    elements.containerItems.innerHTML = '<p>Контейнер пуст!</p>';
    return;
  }
  
  // Считаем общую стоимость
  const totalValue = gameState.containerItems.reduce((sum, item) => sum + item.value, 0);
  
  // Добавляем заголовок с общей стоимостью
  const totalEl = document.createElement('div');
  totalEl.className = 'item';
  totalEl.style.background = 'var(--primary)';
  totalEl.style.fontWeight = 'bold';
  totalEl.textContent = `Общая стоимость: $${totalValue}`;
  elements.containerItems.appendChild(totalEl);
  
  // Добавляем предметы
  gameState.containerItems.forEach((item) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'item';
    itemEl.textContent = `${item.name} ($${item.value})`;
    elements.containerItems.appendChild(itemEl);
  });
  
  // Если есть победитель, обновляем его статистику
  if (gameState.currentBidder) {
    db.ref(`lobbies/${gameState.lobbyId}/players/${gameState.currentBidder}/totalWon`)
      .transaction((total) => (total || 0) + totalValue);
  }
}

// Следующий контейнер
function nextContainer() {
  gameState.currentContainer++;
  
  if (gameState.currentContainer > gameState.totalContainers) {
    // Игра окончена
    window.location.href = `endgame.html?id=${gameState.lobbyId}`;
  } else {
    // Начинаем новый раунд
    startNewRound();
  }
}

// Начало нового раунда
function startNewRound() {
  gameState.isContainerOpen = false;
  elements.container.classList.remove('open');
  
  // Генерируем случайные предметы для контейнера
  const items = generateRandomItems();
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  
  // Создаем новый контейнер
  db.ref(`containers/${gameState.lobbyId}/current`).set({
    topBid: 0,
    topBidder: null,
    topBidderName: null,
    isOpen: false,
    items: items,
    totalValue: totalValue
  });
  
  // Обновляем счетчик контейнеров
  updateLobbyInfo();
  
  // Запускаем таймер
  startTimer();
}

// Генерация случайных предметов
function generateRandomItems() {
  const items = [];
  const itemCount = Math.floor(Math.random() * 3) + 3; // 3-5 предметов
  
  const possibleItems = [
    { name: "Золотые слитки", baseValue: 5000 },
    { name: "Антикварная ваза", baseValue: 3000 },
    { name: "Электроника", baseValue: 2000 },
    { name: "Драгоценности", baseValue: 1500 },
    { name: "Редкие монеты", baseValue: 1000 },
    { name: "Художественные картины", baseValue: 4000 },
    { name: "Вино премиум класса", baseValue: 800 },
    { name: "Коллекционные предметы", baseValue: 1200 }
  ];
  
  for (let i = 0; i < itemCount; i++) {
    const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
    const value = Math.round(randomItem.baseValue * (0.8 + Math.random() * 0.4)); // +/- 20% от базовой стоимости
    
    items.push({
      name: randomItem.name,
      value: value
    });
  }
  
  return items;
}

// В функции loadGameData()
db.ref(`lobbies/${gameState.lobbyId}/status`).on('value', (snapshot) => {
  const status = snapshot.val();
  if (status === "starting") {
    // Убедимся, что все игроки перешли в игру
    setTimeout(() => {
      db.ref(`lobbies/${gameState.lobbyId}`).update({
        status: "in-progress"
      });
    }, 3000);
  }
});

// Показать уведомление
function showNotification(message, type = "success") {
  const notification = elements.notification;
  notification.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;
  notification.className = `notification ${type} show`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Запуск игры при загрузке
document.addEventListener('DOMContentLoaded', initGame);
