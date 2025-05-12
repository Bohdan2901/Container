// lobby.js
document.addEventListener('DOMContentLoaded', () => {
  const lobbyId = new URLSearchParams(window.location.search).get('id');
  if (!lobbyId) {
    alert("Не указан ID лобби!");
    window.location.href = 'index.html';
    return;
  }

  // Инициализация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCJuTuxuPhYxCjZXqMZWJTTmLrgxVkTGBY",
  authDomain: "container-auction.firebaseapp.com",
  databaseURL: "https://container-auction-default-rtdb.firebaseio.com",
  projectId: "container-auction",
  storageBucket: "container-auction.appspot.com",
  messagingSenderId: "907236645178",
  appId: "1:907236645178:web:7d5393a8592fbb81b7c442"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Основные переменные
let currentUser = null;
let lobbyId = null;
let lobbyData = null;

// DOM элементы
const elements = {
  lobbyId: document.getElementById('lobby-id'),
  playersCount: document.getElementById('players-count'),
  playersList: document.getElementById('players-list'),
  startGameBtn: document.getElementById('start-game'),
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  sendMessageBtn: document.getElementById('send-message'),
  emojiPicker: document.getElementById('emoji-picker'),
  settingsToggle: document.getElementById('settings-toggle'),
  settingsPanel: document.getElementById('settings-panel')
};

// Инициализация лобби
function initLobby() {
  lobbyId = new URLSearchParams(window.location.search).get('id');
  if (!lobbyId) {
    alert("Не указан ID лобби!");
    window.location.href = 'index.html';
    return;
  }

  createParticles();
  
  auth.signInAnonymously()
    .then(userCredential => {
      currentUser = userCredential.user;
      setupLobby();
      setupChat();
      setupEventListeners();
    })
    .catch(error => {
      console.error("Ошибка аутентификации:", error);
      alert("Ошибка входа в лобби!");
    });
}

// Настройка лобби
function setupLobby() {
  const lobbyRef = db.ref(`lobbies/${lobbyId}`);
  
  lobbyRef.on('value', snapshot => {
    lobbyData = snapshot.val();
    
    if (!lobbyData) {
      alert("Лобби не найдено!");
      window.location.href = 'index.html';
      return;
    }
    
    updateLobbyInfo();
    updatePlayersList();
    
    // Проверка статуса игры
    if (lobbyData.status === "starting" || lobbyData.status === "in-progress") {
      window.location.href = `game.html?id=${lobbyId}`;
    }
  });
  
  // Удаление игрока при выходе
  db.ref(`lobbies/${lobbyId}/players/${currentUser.uid}`).onDisconnect().remove();
}

// Обновление информации о лобби
function updateLobbyInfo() {
  elements.lobbyId.textContent = `#${lobbyId}`;
  elements.playersCount.textContent = `${Object.keys(lobbyData.players || {}).length}/${lobbyData.settings.maxPlayers} игроков`;
  
  // Показываем кнопку "Начать игру" только для ведущего
  elements.startGameBtn.style.display = lobbyData.host === currentUser.uid ? 'block' : 'none';
}

// Обновление списка игроков
function updatePlayersList() {
  elements.playersList.innerHTML = '';
  
  if (!lobbyData.players || Object.keys(lobbyData.players).length === 0) {
    elements.playersList.innerHTML = '<p>Нет игроков в лобби</p>';
    return;
  }
  
  const teamColors = ['red', 'blue', 'green', 'yellow'];
  const teamNames = {
    'teams': ['Красные', 'Синие'],
    'teams4': ['Красные', 'Синие', 'Зеленые', 'Желтые']
  };
  
  Object.entries(lobbyData.players).forEach(([id, player]) => {
    const playerCard = document.createElement('div');
    playerCard.className = `player-card ${player.isHost ? 'host' : ''} ${id === currentUser.uid ? 'current-user' : ''}`;
    
    // Добавляем класс команды
    if (lobbyData.settings.gameMode !== 'solo' && player.team !== undefined) {
      playerCard.classList.add(`team-${teamColors[player.team] || 'red'}`);
    }
    
    // Аватарка
    const firstLetter = player.name ? player.name.charAt(0).toUpperCase() : '?';
    const avatarColors = ['#FF5722', '#2196F3', '#4CAF50', '#9C27B0', '#607D8B'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    
    playerCard.innerHTML = `
      <div class="player-avatar" style="background: ${randomColor}">
        ${firstLetter}
        ${player.emoji ? `<div class="player-emoji">${player.emoji}</div>` : ''}
      </div>
      <h3 class="player-name">
        ${player.name || 'Без имени'}
        ${id === currentUser.uid ? '<span class="you-badge">(Вы)</span>' : ''}
      </h3>
      <div class="player-money">
        <i class="fas fa-coins"></i>
        <span>${player.money?.toLocaleString() || '0'} $</span>
      </div>
      ${lobbyData.settings.gameMode !== 'solo' && player.team !== undefined ? 
        `<div class="team-label">${teamNames[lobbyData.settings.gameMode]?.[player.team] || `Команда ${player.team + 1}`}</div>` : ''}
    `;
    
    // Обработчик смены команды (только для ведущего)
    if (lobbyData.host === currentUser.uid && id !== currentUser.uid && lobbyData.settings.gameMode !== 'solo') {
      playerCard.style.cursor = 'pointer';
      playerCard.addEventListener('click', () => changePlayerTeam(id, player.team || 0));
    }
    
    elements.playersList.appendChild(playerCard);
  });
}

// Смена команды игрока
function changePlayerTeam(playerId, currentTeam) {
  let nextTeam = currentTeam + 1;
  const maxTeams = lobbyData.settings.gameMode === 'teams' ? 1 : 3;
  
  if (nextTeam > maxTeams) nextTeam = 0;
  
  db.ref(`lobbies/${lobbyId}/players/${playerId}/team`).set(nextTeam)
    .then(() => showNotification(`Команда игрока изменена`, 'success'))
    .catch(error => showNotification(`Ошибка: ${error.message}`, 'error'));
}

// Настройка чата
function setupChat() {
  const chatRef = db.ref(`chats/${lobbyId}`);
  
  // Слушаем новые сообщения
  chatRef.limitToLast(100).on('child_added', snapshot => {
    const message = snapshot.val();
    displayMessage(message);
    
    // Автопрокрутка
    setTimeout(() => {
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }, 100);
  });
  
  // Обработчики смайликов
  elements.emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      sendEmoji(emoji);
    });
  });
}

// Отправка сообщения
function sendMessage() {
  const text = elements.chatInput.value.trim();
  if (!text) return;
  
  const message = {
    sender: lobbyData.players[currentUser.uid]?.name || 'Аноним',
    senderId: currentUser.uid,
    text: text,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    type: 'text'
  };
  
  db.ref(`chats/${lobbyId}`).push(message)
    .then(() => {
      elements.chatInput.value = '';
    })
    .catch(error => {
      showNotification(`Ошибка отправки: ${error.message}`, 'error');
    });
}

// Отправка смайлика
function sendEmoji(emoji) {
  // Обновляем смайлик игрока
  db.ref(`lobbies/${lobbyId}/players/${currentUser.uid}/emoji`).set(emoji)
    .then(() => {
      // Автоматическое удаление через 5 секунд
      setTimeout(() => {
        db.ref(`lobbies/${lobbyId}/players/${currentUser.uid}/emoji`).remove();
      }, 5000);
      
      // Отправляем в чат
      const message = {
        sender: lobbyData.players[currentUser.uid]?.name || 'Аноним',
        senderId: currentUser.uid,
        text: emoji,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'emoji'
      };
      
      return db.ref(`chats/${lobbyId}`).push(message);
    })
    .catch(error => {
      showNotification(`Ошибка отправки: ${error.message}`, 'error');
    });
}

// Отображение сообщения
function displayMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${message.senderId === currentUser.uid ? 'own-message' : ''}`;
  
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  if (message.type === 'emoji') {
    messageElement.innerHTML = `
      <span class="message-sender">${message.sender}:</span>
      <span class="emoji-message">${message.text}</span>
      <span class="message-time">${time}</span>
    `;
  } else {
    messageElement.innerHTML = `
      <span class="message-sender">${message.sender}:</span>
      <span>${message.text}</span>
      <span class="message-time">${time}</span>
    `;
  }
  
  elements.chatMessages.appendChild(messageElement);
  
  // Удаляем старые сообщения
  if (elements.chatMessages.children.length > 100) {
    elements.chatMessages.removeChild(elements.chatMessages.children[0]);
  }
}

// Начало игры
function startGame() {
  if (Object.keys(lobbyData.players).length < 2) {
    showNotification("Нужно минимум 2 игрока!", "error");
    return;
  }
  
  elements.startGameBtn.disabled = true;
  elements.startGameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Запуск...';
  
  db.ref(`lobbies/${lobbyId}`).update({
    status: "starting",
    startTime: firebase.database.ServerValue.TIMESTAMP
  })
  .then(() => {
    window.location.href = `game.html?id=${lobbyId}`;
  })
  .catch(error => {
    showNotification(`Ошибка: ${error.message}`, "error");
    elements.startGameBtn.disabled = false;
    elements.startGameBtn.innerHTML = '<i class="fas fa-play"></i> НАЧАТЬ ИГРУ';
  });
}

// Создание частиц фона
function createParticles() {
  const particlesContainer = document.getElementById('particles');
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
    
    particlesContainer.appendChild(particle);
  }
}

// Показать уведомление
function showNotification(message, type = "success") {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Отправка сообщения
  elements.sendMessageBtn.addEventListener('click', sendMessage);
  elements.chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });
  
  // Начало игры
  elements.startGameBtn.addEventListener('click', startGame);
  
  // Настройки
  elements.settingsToggle.addEventListener('click', () => {
    elements.settingsPanel.classList.toggle('active');
  });
}

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', initLobby);
