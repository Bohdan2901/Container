// lobby.js
document.addEventListener('DOMContentLoaded', () => {
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

  // Получаем ID лобби из URL
  const urlParams = new URLSearchParams(window.location.search);
  const lobbyId = urlParams.get('id');
  
  if (!lobbyId) {
    alert("Ошибка: не указан ID лобби!");
    window.location.href = 'index.html';
    return;
  }

  // DOM элементы
  const elements = {
    lobbyId: document.getElementById('lobby-id'),
    lobbyStatus: document.getElementById('lobby-status-text'),
    playersCount: document.getElementById('players-count'),
    playersList: document.getElementById('players-list'),
    startGameBtn: document.getElementById('start-game'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendMessageBtn: document.getElementById('send-message'),
    emojiPicker: document.getElementById('emoji-picker'),
    settingsToggle: document.getElementById('settings-toggle'),
    settingsPanel: document.getElementById('settings-panel'),
    closeSettingsBtn: document.getElementById('close-settings'),
    saveSettingsBtn: document.getElementById('save-settings'),
    closeLobbyBtn: document.getElementById('close-lobby')
  };

  // Основная функция инициализации
  async function initLobby() {
    try {
      // Создаем частицы фона
      createParticles();
      
      // Аутентификация
      const userCredential = await auth.signInAnonymously();
      const user = userCredential.user;
      
      // Загрузка данных лобби
      const lobbyRef = db.ref(`lobbies/${lobbyId}`);
      lobbyRef.on('value', (snapshot) => {
        const lobby = snapshot.val();
        
        if (!lobby) {
          showError("Лобби не найдено!");
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
          return;
        }
        
        updateLobbyUI(lobby, user.uid);
        
        // Проверяем статус игры
        if (lobby.status === "starting" || lobby.status === "in-progress") {
          window.location.href = `game.html?id=${lobbyId}`;
        }
      });
      
      // Настройка чата
      setupChat(user.uid);
      
      // Настройка кнопки "Начать игру"
      elements.startGameBtn.addEventListener('click', startGame);
      
      // Настройка панели настроек
      setupSettingsPanel(user.uid);
      
      // Удаление игрока при выходе
      db.ref(`lobbies/${lobbyId}/players/${user.uid}`).onDisconnect().remove();
      
    } catch (error) {
      showError("Ошибка инициализации: " + error.message);
      console.error("Ошибка инициализации:", error);
    }
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

  // Обновление интерфейса лобби
  function updateLobbyUI(lobby, currentUserId) {
    // Обновляем заголовок
    elements.lobbyId.textContent = `#${lobbyId}`;
    
    // Обновляем статус лобби
    elements.lobbyStatus.textContent = 
      lobby.status === "waiting" ? "Ожидание игроков" : "Игра начинается...";
    
    // Обновляем счетчик игроков
    const playerCount = Object.keys(lobby.players || {}).length;
    const maxPlayers = lobby.settings?.maxPlayers || 8;
    elements.playersCount.textContent = `${playerCount}/${maxPlayers} игроков`;
    
    // Обновляем список игроков
    updatePlayersList(lobby, currentUserId);
    
    // Показываем кнопку "Начать игру" только для ведущего
    if (lobby.host === currentUserId && lobby.status === "waiting") {
      elements.startGameBtn.style.display = 'block';
    } else {
      elements.startGameBtn.style.display = 'none';
    }
  }

  // Обновление списка игроков
  function updatePlayersList(lobby, currentUserId) {
    elements.playersList.innerHTML = '';
    
    if (!lobby.players || Object.keys(lobby.players).length === 0) {
      elements.playersList.innerHTML = '<p>Нет игроков в лобби</p>';
      return;
    }
    
    // Сортируем игроков: ведущий первый, затем остальные
    const sortedPlayers = Object.entries(lobby.players).sort((a, b) => {
      if (a[1].isHost) return -1;
      if (b[1].isHost) return 1;
      return 0;
    });
    
    // Определяем команды для игроков
    const teamColors = ['red', 'blue', 'green', 'yellow'];
    const teamNames = {
      'teams': ['Красные', 'Синие'],
      'teams4': ['Красные', 'Синие', 'Зеленые', 'Желтые']
    };
    
    sortedPlayers.forEach(([id, player]) => {
      const playerCard = document.createElement('div');
      playerCard.className = `player-card ${player.isHost ? 'host' : ''} ${id === currentUserId ? 'current-user' : ''}`;
      
      // Добавляем класс команды, если режим командный
      if (lobby.settings?.gameMode?.includes('teams') && player.team !== undefined) {
        playerCard.classList.add(`team-${teamColors[player.team] || 'red'}`);
      }
      
      // Генерация аватарки по первой букве имени
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
          `<div class="team-label">${teamNames[lobby.settings.gameMode]?.[player.team] || `Команда ${player.team + 1}`}</div>` : ''}
      `;
      
      // Добавляем обработчик для выбора команды (только для ведущего)
      if (lobby.settings?.gameMode?.includes('teams') && lobby.host === currentUserId && id !== currentUserId && lobby.status === "waiting") {
        playerCard.style.cursor = 'pointer';
        playerCard.title = 'Нажмите для смены команды';
        
        playerCard.addEventListener('click', async () => {
          try {
            // Получаем текущую команду игрока
            const playerSnapshot = await db.ref(`lobbies/${lobbyId}/players/${id}`).once('value');
            const currentTeam = playerSnapshot.val().team || 0;
            
            // Определяем следующую команду
            let nextTeam = currentTeam + 1;
            if (lobby.settings.gameMode === "teams" && nextTeam > 1) nextTeam = 0;
            if (lobby.settings.gameMode === "teams4" && nextTeam > 3) nextTeam = 0;
            
            // Обновляем команду игрока
            await db.ref(`lobbies/${lobbyId}/players/${id}`).update({
              team: nextTeam
            });
            
            showSuccess(`Игрок ${player.name} теперь в команде ${teamNames[lobby.settings.gameMode]?.[nextTeam] || `Команда ${nextTeam + 1}`}`);
          } catch (error) {
            showError("Ошибка изменения команды");
            console.error("Ошибка изменения команды:", error);
          }
        });
      }
      
      elements.playersList.appendChild(playerCard);
    });
  }

  // Настройка чата
  function setupChat(currentUserId) {
    const chatRef = db.ref(`chats/${lobbyId}`);
    
    // Разблокируем поле ввода
    elements.chatInput.disabled = false;
    elements.sendMessageBtn.disabled = false;
    elements.chatMessages.innerHTML = '';
    
    // Слушаем новые сообщения
    chatRef.limitToLast(100).on('child_added', (snapshot) => {
      const message = snapshot.val();
      displayMessage(message, currentUserId);
      
      // Плавная прокрутка вниз
      setTimeout(() => {
        elements.chatMessages.scrollTo({
          top: elements.chatMessages.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    });
    
    // Обработчики для кнопок смайликов
    elements.emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        sendEmoji(emoji, currentUserId);
      });
    });
    
    // Отправка сообщения
    elements.sendMessageBtn.addEventListener('click', () => sendMessage(currentUserId));
    elements.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage(currentUserId);
    });
  }

  // Отправка сообщения
  async function sendMessage(currentUserId) {
    const text = elements.chatInput.value.trim();
    if (!text) return;
    
    try {
      // Получаем данные игрока
      const playerSnapshot = await db.ref(`lobbies/${lobbyId}/players/${currentUserId}`).once('value');
      const player = playerSnapshot.val();
      
      // Отправляем сообщение
      await db.ref(`chats/${lobbyId}`).push({
        sender: player.name || 'Аноним',
        senderId: currentUserId,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'text'
      });
      
      // Очищаем поле ввода
      elements.chatInput.value = '';
      
    } catch (error) {
      showError("Ошибка отправки сообщения");
      console.error("Ошибка отправки сообщения:", error);
    }
  }

  // Отправка смайлика
  async function sendEmoji(emoji, currentUserId) {
    try {
      // Получаем данные игрока
      const playerSnapshot = await db.ref(`lobbies/${lobbyId}/players/${currentUserId}`).once('value');
      const player = playerSnapshot.val();
      
      // Отправляем смайлик как сообщение
      await db.ref(`chats/${lobbyId}`).push({
        sender: player.name || 'Аноним',
        senderId: currentUserId,
        text: emoji,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'emoji'
      });
      
      // Обновляем смайлик над аватаркой игрока
      await db.ref(`lobbies/${lobbyId}/players/${currentUserId}`).update({
        emoji: emoji
      });
      
      // Автоматическое удаление смайлика через 5 секунд
      setTimeout(async () => {
        await db.ref(`lobbies/${lobbyId}/players/${currentUserId}/emoji`).remove();
      }, 5000);
      
    } catch (error) {
      showError("Ошибка отправки смайлика");
      console.error("Ошибка отправки смайлика:", error);
    }
  }

  // Отображение сообщения
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
    
    elements.chatMessages.appendChild(messageElement);
    
    // Удаляем старые сообщения, если их больше 100
    if (elements.chatMessages.children.length > 100) {
      elements.chatMessages.removeChild(elements.chatMessages.children[0]);
    }
  }

  // Настройка панели настроек
  function setupSettingsPanel(currentUserId) {
    // Переключение панели настроек
    elements.settingsToggle.addEventListener('click', () => {
      elements.settingsPanel.classList.toggle('active');
    });
    
    // Закрытие панели настроек
    elements.closeSettingsBtn.addEventListener('click', () => {
      elements.settingsPanel.classList.remove('active');
    });
    
    // Сохранение настроек
    elements.saveSettingsBtn.addEventListener('click', async () => {
      try {
        // Проверяем, является ли пользователь ведущим
        const lobbySnapshot = await db.ref(`lobbies/${lobbyId}`).once('value');
        const lobby = lobbySnapshot.val();
        
        if (lobby.host !== currentUserId) {
          showError("Только ведущий может изменять настройки!");
          return;
        }
        
        // Получаем значения настроек
        const settings = {
          maxPlayers: parseInt(document.getElementById('max-players').value),
          startMoney: parseInt(document.getElementById('start-money').value),
          gameMode: document.getElementById('game-mode').value,
          hostPlays: document.getElementById('host-plays').checked,
          randomEvents: document.getElementById('random-events').checked,
          specialContainers: document.getElementById('special-containers').checked,
          timeLimits: document.getElementById('time-limits').checked
        };
        
        // Сохраняем настройки
        await db.ref(`lobbies/${lobbyId}/settings`).update(settings);
        
        showSuccess("Настройки сохранены!");
        elements.settingsPanel.classList.remove('active');
        
      } catch (error) {
        showError("Ошибка сохранения настроек");
        console.error("Ошибка сохранения настроек:", error);
      }
    });
    
    // Закрытие лобби
    elements.closeLobbyBtn.addEventListener('click', async () => {
      if (confirm("Вы уверены, что хотите закрыть лобби? Все игроки будут вынуждены выйти.")) {
        try {
          // Проверяем, является ли пользователь ведущим
          const lobbySnapshot = await db.ref(`lobbies/${lobbyId}`).once('value');
          const lobby = lobbySnapshot.val();
          
          if (lobby.host !== currentUserId) {
            showError("Только ведущий может закрыть лобби!");
            return;
          }
          
          // Удаляем лобби из базы данных
          await db.ref(`lobbies/${lobbyId}`).remove();
          
          // Перенаправляем ведущего на главную страницу
          window.location.href = 'index.html';
          
        } catch (error) {
          showError("Ошибка закрытия лобби");
          console.error("Ошибка закрытия лобби:", error);
        }
      }
    });
  }

  // Начало игры
  async function startGame() {
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
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
  
  // Показать успешное уведомление
  function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Запуск при загрузке
  initLobby();
});
