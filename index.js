// index.js
document.addEventListener('DOMContentLoaded', () => {
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
  let nickname = "";

  // DOM элементы
  const elements = {
    nicknameInput: document.getElementById('nickname'),
    createLobbyBtn: document.getElementById('create-lobby'),
    joinLobbyBtn: document.getElementById('join-lobby'),
    lobbyList: document.getElementById('lobby-list'),
    lobbyStatus: document.getElementById('lobby-status'),
    notification: document.getElementById('notification')
  };

  // Инициализация приложения
  async function initApp() {
    try {
      // Аутентификация пользователя
      const userCredential = await auth.signInAnonymously();
      currentUser = userCredential.user;
      
      // Загружаем сохраненный никнейм
      nickname = localStorage.getItem('auction_nickname') || "";
      if (nickname) {
        elements.nicknameInput.value = nickname;
        updateButtonsState();
      }
      
      // Настройка обработчиков
      setupEventListeners();
      
    } catch (error) {
      showNotification("Ошибка инициализации: " + error.message, "error");
      console.error("Ошибка инициализации:", error);
    }
  }

  // Настройка обработчиков событий
  function setupEventListeners() {
    // Ввод ника
    elements.nicknameInput.addEventListener('input', () => {
      nickname = elements.nicknameInput.value.trim();
      localStorage.setItem('auction_nickname', nickname);
      updateButtonsState();
    });

    // Создание лобби
    elements.createLobbyBtn.addEventListener('click', createLobby);
    
    // Показать список лобби
    elements.joinLobbyBtn.addEventListener('click', loadLobbies);
  }

  // Обновление состояния кнопок
  function updateButtonsState() {
    const isValid = nickname.length >= 2 && nickname.length <= 30;
    elements.createLobbyBtn.disabled = !isValid;
    elements.joinLobbyBtn.disabled = !isValid;
  }

  // Создание нового лобби
  async function createLobby() {
    if (!validateNickname()) return;
  
    try {
      const lobbyId = generateLobbyId();
      const playerData = {
        name: nickname,
        money: 10000,
        isHost: true,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      };
  
      // Создаем лобби в базе данных
      await db.ref(`lobbies/${lobbyId}`).set({
        host: currentUser.uid,
        players: {
          [currentUser.uid]: playerData
        },
        settings: {
          maxPlayers: 8,
          startMoney: 10000,
          gameMode: "solo"
        },
        status: "waiting",
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      showNotification(`Лобби #${lobbyId} создано!`, "success");
      
      // Переход в лобби
      window.location.href = `lobby.html?id=${lobbyId}`;
      
    } catch (error) {
      showNotification("Ошибка при создании лобби: " + error.message, "error");
      console.error("Ошибка при создании лобби:", error);
    }
  }

  // Загрузка списка лобби
  async function loadLobbies() {
    if (!validateNickname()) return;
  
    try {
      elements.lobbyStatus.textContent = "Загрузка лобби...";
      elements.lobbyList.innerHTML = '';
      
      const snapshot = await db.ref('lobbies')
        .orderByChild('status')
        .equalTo('waiting')
        .once('value');
      
      if (!snapshot.exists()) {
        elements.lobbyStatus.textContent = "Нет доступных лобби";
        showNotification("Нет доступных лобби", "info");
        return;
      }
      
      elements.lobbyStatus.textContent = "Доступные лобби:";
      
      snapshot.forEach((childSnapshot) => {
        const lobby = childSnapshot.val();
        const lobbyId = childSnapshot.key;
        const hostPlayer = lobby.players[lobby.host];
        const hostName = hostPlayer?.name || "Неизвестно";
        const playerCount = Object.keys(lobby.players || {}).length;
        const maxPlayers = lobby.settings?.maxPlayers || 8;
        
        const lobbyItem = document.createElement('div');
        lobbyItem.className = 'lobby-item';
        lobbyItem.innerHTML = `
          <div class="lobby-info">
            <div class="lobby-id">Лобби #${lobbyId}</div>
            <div class="lobby-players">Игроков: ${playerCount}/${maxPlayers}</div>
            <div class="lobby-host">Ведущий: ${hostName}</div>
          </div>
          <i class="fas fa-chevron-right"></i>
        `;
        
        lobbyItem.addEventListener('click', () => {
          joinLobby(lobbyId);
        });
        
        elements.lobbyList.appendChild(lobbyItem);
      });
      
    } catch (error) {
      elements.lobbyStatus.textContent = "Ошибка загрузки лобби";
      showNotification("Ошибка загрузки лобби: " + error.message, "error");
      console.error("Ошибка загрузки лобби:", error);
    }
  }

  // Подключение к лобби
  async function joinLobby(lobbyId) {
    if (!validateNickname()) return;
  
    try {
      // Проверяем существует ли лобби
      const lobbySnapshot = await db.ref(`lobbies/${lobbyId}`).once('value');
      const lobby = lobbySnapshot.val();
      
      if (!lobby || !lobby.players) {
        showNotification("Лобби не найдено или повреждено!", "error");
        return;
      }
      
      // Проверяем есть ли место в лобби
      const playerCount = Object.keys(lobby.players).length;
      const maxPlayers = lobby.settings?.maxPlayers || 8;
      
      if (playerCount >= maxPlayers) {
        showNotification("Лобби заполнено!", "error");
        return;
      }
  
      // Добавляем игрока в лобби
      await db.ref(`lobbies/${lobbyId}/players/${currentUser.uid}`).set({
        name: nickname,
        money: lobby.settings?.startMoney || 10000,
        isHost: false,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      showNotification(`Вы присоединились к лобби #${lobbyId}`, "success");
      
      // Переход в лобби
      window.location.href = `lobby.html?id=${lobbyId}`;
      
    } catch (error) {
      showNotification("Ошибка при подключении: " + error.message, "error");
      console.error("Ошибка при подключении:", error);
    }
  }

  // Валидация никнейма
  function validateNickname() {
    if (!nickname || nickname.length < 2 || nickname.length > 30) {
      showNotification("Никнейм должен быть от 2 до 30 символов", "error");
      return false;
    }
    return true;
  }

  // Показать уведомление
  function showNotification(message, type = "success") {
    const notification = elements.notification;
    notification.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  // Генератор ID лобби
  function generateLobbyId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Запуск приложения
  initApp();
});
