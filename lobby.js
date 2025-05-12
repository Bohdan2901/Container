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

  // Основная функция инициализации лобби
  async function initLobby() {
    try {
      // Аутентификация
      const userCredential = await auth.signInAnonymously();
      const user = userCredential.user;

      // Создаем частицы фона
      createParticles();

      // Загрузка данных лобби
      const lobbyRef = db.ref(`lobbies/${lobbyId}`);
      lobbyRef.on('value', (snapshot) => {
        const lobby = snapshot.val();
        if (!lobby) {
          showError("Лобби не найдено!");
          setTimeout(() => window.location.href = 'index.html', 2000);
          return;
        }

        updateLobbyUI(lobby, user.uid);
      });

      // Настройка чата
      setupChat(user.uid);

    } catch (error) {
      showError("Ошибка инициализации: " + error.message);
      console.error("Ошибка инициализации:", error);
    }
  }

  // Функция для создания частиц фона
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

  // Обновление интерфейса лобби
  function updateLobbyUI(lobby, currentUserId) {
    // Обновляем заголовок
    document.getElementById('lobby-id').textContent = `#${lobbyId}`;
    
    // Обновляем статус лобби
    document.getElementById('lobby-status-text').textContent = 
      lobby.status === "waiting" ? "Ожидание игроков" : "Игра начинается...";
    
    // Обновляем счетчик игроков
    const playerCount = Object.keys(lobby.players || {}).length;
    const maxPlayers = lobby.settings?.maxPlayers || 8;
    document.getElementById('players-count').textContent = `${playerCount}/${maxPlayers} игроков`;
    
    // Обновляем список игроков
    updatePlayersList(lobby, currentUserId);
    
    // Показываем кнопку "Начать игру" только для ведущего
    const startBtn = document.getElementById('start-game');
    if (lobby.host === currentUserId && lobby.status === "waiting") {
      startBtn.style.display = 'block';
      startBtn.onclick = () => startGame(lobbyId, currentUserId);
    } else {
      startBtn.style.display = 'none';
    }
  }

  // Обновление списка игроков
  function updatePlayersList(lobby, currentUserId) {
    const playersContainer = document.getElementById('players-list');
    playersContainer.innerHTML = '';
    
    const playerCount = Object.keys(lobby.players || {}).length;
    if (playerCount === 0) {
      playersContainer.innerHTML = '<p class="empty-message">Нет игроков в лобби</p>';
      return;
    }
    
    // Сортируем игроков: ведущий первый, затем остальные
    const sortedPlayers = Object.entries(lobby.players).sort((a, b) => {
      if (a[1].isHost) return -1;
      if (b[1].isHost) return 1;
      return 0;
    });
    
    sortedPlayers.forEach(([id, player]) => {
      const playerCard = document.createElement('div');
      playerCard.className = `player-card ${player.isHost ? 'host' : ''} ${id === currentUserId ? 'current-user' : ''}`;
      
      // Добавляем класс команды, если режим командный
      if (lobby.settings?.gameMode?.includes('teams') && player.team !== undefined) {
        const teamColors = ['red', 'blue', 'green', 'yellow'];
        playerCard.classList.add(`team-${teamColors[player.team] || 'red'}`);
      }
      
      // Генерация аватарки
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
          ${id === currentUserId ? '<span class="you-badge">(Вы)</span>' : ''}
        </h3>
        <div class="player-money">
          <i class="fas fa-coins"></i>
          <span>${player.money?.toLocaleString() || '0'} $</span>
        </div>
        ${lobby.settings?.gameMode?.includes('teams') && player.team !== undefined ? 
          `<div class="team-label">${getTeamName(player.team, lobby.settings.gameMode)}</div>` : ''}
      `;
      
      playersContainer.appendChild(playerCard);
    });
  }

  function getTeamName(teamIndex, gameMode) {
    const teamNames = {
      'teams': ['Красные', 'Синие'],
      'teams4': ['Красные', 'Синие', 'Зеленые', 'Желтые']
    };
    
    return teamNames[gameMode]?.[teamIndex] || `Команда ${teamIndex + 1}`;
  }

  // Настройка чата
  function setupChat(currentUserId) {
    const chatRef = db.ref(`chats/${lobbyId}`);
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const emojiPicker = document.getElementById('emoji-picker');
    
    // Разблокируем поле ввода
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatMessages.innerHTML = '';
    
    // Слушаем новые сообщения
    chatRef.limitToLast(100).on('child_added', (snapshot) => {
      const message = snapshot.val();
      displayMessage(message, currentUserId);
      
      // Плавная прокрутка вниз
      setTimeout(() => {
        chatMessages.scrollTo({
          top: chatMessages.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    });
    
    // Обработчики для кнопок смайликов
    emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        sendEmoji(emoji, currentUserId);
      });
    });
    
    // Отправка сообщения
    sendButton.addEventListener('click', () => sendMessage(currentUserId));
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage(currentUserId);
    });
    
    async function sendMessage(userId) {
      const text = chatInput.value.trim();
      if (!text) return;
      
      try {
        // Получаем данные игрока
        const playerSnapshot = await db.ref(`lobbies/${lobbyId}/players/${userId}`).once('value');
        const player = playerSnapshot.val();
        
        // Отправляем сообщение
        await chatRef.push({
          sender: player.name || 'Аноним',
          senderId: userId,
          text: text,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          type: 'text'
        });
        
        // Очищаем поле ввода
        chatInput.value = '';
        
      } catch (error) {
        showError("Ошибка отправки сообщения");
        console.error("Ошибка отправки сообщения:", error);
      }
    }
    
    async function sendEmoji(emoji, userId) {
      try {
        // Получаем данные игрока
        const playerSnapshot = await db.ref(`lobbies/${lobbyId}/players/${userId}`).once('value');
        const player = playerSnapshot.val();
        
        // Отправляем смайлик как сообщение
        await chatRef.push({
          sender: player.name || 'Аноним',
          senderId: userId,
          text: emoji,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          type: 'emoji'
        });
        
        // Обновляем смайлик над аватаркой игрока
        await db.ref(`lobbies/${lobbyId}/players/${userId}`).update({
          emoji: emoji
        });
        
        // Автоматическое удаление смайлика через 5 секунд
        setTimeout(async () => {
          await db.ref(`lobbies/${lobbyId}/players/${userId}/emoji`).remove();
        }, 5000);
        
      } catch (error) {
        showError("Ошибка отправки смайлика");
        console.error("Ошибка отправки смайлика:", error);
      }
    }
    
    function displayMessage(message, currentUserId) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${message.senderId === currentUserId ? 'own-message' : ''}`;
      
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
      
      chatMessages.appendChild(messageElement);
      
      // Удаляем старые сообщения, если их больше 100
      if (chatMessages.children.length > 100) {
        chatMessages.removeChild(chatMessages.children[0]);
      }
    }
  }

  // Начало игры
  async function startGame(lobbyId, userId) {
    const startBtn = document.getElementById('start-game');
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Запуск игры...';
    
    try {
      // Проверяем количество игроков
      const lobbySnapshot = await db.ref(`lobbies/${lobbyId}`).once('value');
      const lobby = lobbySnapshot.val();
      const playerCount = Object.keys(lobby.players || {}).length;
      
      if (playerCount < 2) {
        showError("Для начала игры нужно минимум 2 игрока!");
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> НАЧАТЬ ИГРУ';
        return;
      }
      
      // Обновляем статус лобби
      await db.ref(`lobbies/${lobbyId}`).update({
        status: "starting",
        startTime: firebase.database.ServerValue.TIMESTAMP
      });
      
      // Перенаправляем в игру
      window.location.href = `game.html?id=${lobbyId}`;
      
    } catch (error) {
      showError("Ошибка при запуске игры");
      console.error("Ошибка при запуске игры:", error);
      
      startBtn.disabled = false;
      startBtn.innerHTML = '<i class="fas fa-play"></i> НАЧАТЬ ИГРУ';
    }
  }

  // Показать ошибку
  function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => notification.remove(), 5000);
  }

  // Инициализация лобби
  initLobby();
});
