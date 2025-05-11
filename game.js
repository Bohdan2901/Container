// Конфигурация игры
const CONFIG = {
  MAX_PLAYERS: 8,
  DEFAULT_MONEY: 10000,
  BID_TIMER: 30,
  ITEMS: {
    COMMON: [
      { name: "Золото", value: 500, emoji: "💰", chance: 0.6 },
      { name: "Серебро", value: 300, emoji: "💎", chance: 0.3 }
    ],
    RARE: [
      { name: "Алмаз", value: 1500, emoji: "🔶", chance: 0.08 },
      { name: "Кристалл", value: 1000, emoji: "🔷", chance: 0.02 }
    ]
  }
};

// Состояние игры
let gameState = {
  player: {
    id: generateId(),
    name: "",
    money: CONFIG.DEFAULT_MONEY,
    isHost: false
  },
  currentLobby: null,
  lobbies: [],
  sounds: {
    hover: new Audio('sounds/hover.mp3'),
    click: new Audio('sounds/click.mp3'),
    notification: new Audio('sounds/notification.mp3')
  }
};

// DOM элементы
const elements = {
  startScreen: document.getElementById('start-screen'),
  nicknameInput: document.getElementById('nickname'),
  createLobbyBtn: document.getElementById('create-lobby'),
  joinLobbyBtn: document.getElementById('join-lobby'),
  refreshLobbiesBtn: document.getElementById('refresh-lobbies'),
  lobbyList: document.getElementById('lobby-list'),
  notification: document.getElementById('notification')
};

// Инициализация игры
function initGame() {
  // Настройка звуков
  Object.values(gameState.sounds).forEach(sound => {
    sound.volume = 0.3;
  });

  // Настройка элементов
  setupEventListeners();
  loadLobbies();
  
  // Фокус на поле ввода ника
  elements.nicknameInput.focus();
  
  // Анимация появления
  gsap.from(".logo", { 
    duration: 1, 
    y: -50, 
    opacity: 0, 
    ease: "back.out(1.7)" 
  });
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Кнопки
  elements.createLobbyBtn.addEventListener('click', createLobby);
  elements.joinLobbyBtn.addEventListener('click', showLobbies);
  elements.refreshLobbiesBtn.addEventListener('click', loadLobbies);
  
  // Эффекты наведения
  const interactiveElements = document.querySelectorAll('button, .lobby-item');
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      gameState.sounds.hover.currentTime = 0;
      gameState.sounds.hover.play();
      gsap.to(el, { scale: 1.05, duration: 0.2 });
    });
    
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { scale: 1, duration: 0.2 });
    });
  });
  
  // Ввод ника
  elements.nicknameInput.addEventListener('input', validateNickname);
}

// Валидация ника
function validateNickname() {
  const nickname = elements.nicknameInput.value.trim();
  if (nickname.length >= 2) {
    gameState.player.name = nickname;
    elements.createLobbyBtn.disabled = false;
    elements.joinLobbyBtn.disabled = false;
  } else {
    elements.createLobbyBtn.disabled = true;
    elements.joinLobbyBtn.disabled = true;
  }
}

// Загрузка списка лобби
async function loadLobbies() {
  try {
    // В реальном приложении здесь будет запрос к Firebase
    const mockLobbies = [
      {
        id: "ABC123",
        host: "ProGamer",
        players: [
          { id: "p1", name: "ProGamer", money: CONFIG.DEFAULT_MONEY, isHost: true },
          { id: "p2", name: "Player2", money: CONFIG.DEFAULT_MONEY },
          { id: "p3", name: "Player3", money: CONFIG.DEFAULT_MONEY }
        ],
        settings: {
          containers: 10,
          timer: 20,
          mode: "solo"
        },
        status: "waiting"
      },
      {
        id: "XYZ789",
        host: "AuctionKing",
        players: [
          { id: "p4", name: "AuctionKing", money: CONFIG.DEFAULT_MONEY, isHost: true }
        ],
        settings: {
          containers: 5,
          timer: 15,
          mode: "teams"
        },
        status: "waiting"
      }
    ];
    
    gameState.lobbies = mockLobbies;
    renderLobbies();
    
    // Анимация обновления
    gsap.from(".lobby-item", {
      duration: 0.5,
      y: 20,
      opacity: 0,
      stagger: 0.1
    });
    
    showNotification("Лобби успешно обновлены!");
    
  } catch (error) {
    console.error("Ошибка загрузки лобби:", error);
    showNotification("Ошибка загрузки лобби", "error");
  }
}

// Отображение списка лобби
function renderLobbies() {
  elements.lobbyList.innerHTML = '';
  
  gameState.lobbies.forEach(lobby => {
    const lobbyItem = document.createElement('div');
    lobbyItem.className = 'lobby-item';
    
    lobbyItem.innerHTML = `
      <div class="lobby-info">
        <span class="lobby-id">#${lobby.id}</span>
        <span class="lobby-host">Ведущий: ${lobby.host}</span>
      </div>
      <div class="lobby-stats">
        <span class="players-count">👥 ${lobby.players.length}/${CONFIG.MAX_PLAYERS}</span>
        <span class="lobby-status ${lobby.status}">
          ${getStatusText(lobby.status)}
        </span>
      </div>
      <button class="btn-join">ВОЙТИ</button>
    `;
    
    lobbyItem.querySelector('.btn-join').addEventListener('click', () => {
      joinLobby(lobby.id);
    });
    
    elements.lobbyList.appendChild(lobbyItem);
  });
}

// Создание лобби
function createLobby() {
  if (!gameState.player.name) {
    showNotification("Введите никнейм!", "error");
    return;
  }
  
  // В реальном приложении здесь будет запрос к Firebase
  const newLobby = {
    id: generateLobbyId(),
    host: gameState.player.name,
    players: [{
      ...gameState.player,
      isHost: true
    }],
    settings: {
      containers: 10,
      timer: 20,
      mode: "solo"
    },
    status: "waiting"
  };
  
  gameState.currentLobby = newLobby;
  gameState.player.isHost = true;
  
  // Переход в лобби
  showNotification(`Лобби #${newLobby.id} создано!`);
  setTimeout(() => {
    window.location.href = `lobby.html?id=${newLobby.id}`;
  }, 1000);
}

// Присоединение к лобби
function joinLobby(lobbyId) {
  if (!gameState.player.name) {
    showNotification("Введите никнейм!", "error");
    return;
  }
  
  const lobby = gameState.lobbies.find(l => l.id === lobbyId);
  if (!lobby) {
    showNotification("Лобби не найдено!", "error");
    return;
  }
  
  if (lobby.players.length >= CONFIG.MAX_PLAYERS) {
    showNotification("Лобби заполнено!", "error");
    return;
  }
  
  gameState.currentLobby = lobby;
  gameState.player.isHost = false;
  
  // В реальном приложении здесь будет запрос к Firebase
  lobby.players.push({
    ...gameState.player
  });
  
  showNotification(`Присоединение к лобби #${lobbyId}...`);
  setTimeout(() => {
    window.location.href = `lobby.html?id=${lobbyId}`;
  }, 1000);
}

// Показать уведомление
function showNotification(message, type = "success") {
  const notification = elements.notification;
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  
  gameState.sounds.notification.currentTime = 0;
  gameState.sounds.notification.play();
  
  gsap.fromTo(notification, 
    { y: 50, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.3 }
  );
  
  setTimeout(() => {
    gsap.to(notification, {
      y: 50,
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        notification.classList.remove('show');
      }
    });
  }, 3000);
}

// Вспомогательные функции
function generateId() {
  return Math.random().toString(36).substr(2, 8);
}

function generateLobbyId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function getStatusText(status) {
  const statuses = {
    waiting: "Ожидание...",
    starting: "Начинается...",
    in_progress: "Идет игра",
    finished: "Завершена"
  };
  return statuses[status] || status;
}

// Запуск игры при загрузке страницы
document.addEventListener('DOMContentLoaded', initGame);
