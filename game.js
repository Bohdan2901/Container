// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCJuTuxuPhYxCjZXqMZWJTTmLrgxVkTGBY", // Web API Key
  authDomain: "container-auction.firebaseapp.com",
  databaseURL: "https://container-auction.firebaseio.com", // URL базы данных
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
  currentLobby: null
};

// DOM элементы
const elements = {
  startScreen: document.getElementById('start-screen'),
  nicknameInput: document.getElementById('nickname'),
  createLobbyBtn: document.getElementById('create-lobby'),
  joinLobbyBtn: document.getElementById('join-lobby'),
  lobbyList: document.getElementById('lobby-list'),
  notification: document.getElementById('notification')
};

// Инициализация игры
function initGame() {
  setupEventListeners();
  
  // Анонимная аутентификация
  auth.signInAnonymously()
    .then(() => {
      auth.onAuthStateChanged(user => {
        if (user) {
          gameState.currentUser = user;
          console.log("Пользователь вошел:", user.uid);
        }
      });
    })
    .catch(error => {
      showNotification("Ошибка входа: " + error.message, "error");
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Создание лобби
  elements.createLobbyBtn.addEventListener('click', createLobby);
  
  // Показать лобби
  elements.joinLobbyBtn.addEventListener('click', showLobbies);
  
  // Ввод ника
  elements.nicknameInput.addEventListener('input', validateNickname);
}

// Валидация ника
function validateNickname() {
  const nickname = elements.nicknameInput.value.trim();
  if (nickname.length < 2) {
    elements.createLobbyBtn.disabled = true;
    elements.joinLobbyBtn.disabled = true;
  } else {
    elements.createLobbyBtn.disabled = false;
    elements.joinLobbyBtn.disabled = false;
  }
}

// Создание лобби
function createLobby() {
  const nickname = document.getElementById('nickname').value.trim();
  if (!nickname) return;

  const lobbyId = generateLobbyId();
  const playerData = {
    name: nickname,
    money: 10000,
    isHost: true
  };

  // Записываем данные одним атомарным обновлением
  const updates = {};
  updates[`lobbies/${lobbyId}/host`] = auth.currentUser.uid;
  updates[`lobbies/${lobbyId}/players/${auth.currentUser.uid}`] = playerData;
  updates[`lobbies/${lobbyId}/settings`] = {
    maxPlayers: 8,
    timer: 30,
    containers: 10,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };
  updates[`lobbies/${lobbyId}/status`] = "waiting";

  db.ref().update(updates)
    .then(() => {
      window.location.href = `lobby.html?id=${lobbyId}`;
    });
}

  db.ref(`lobbies/${lobbyId}`).update({
    host: gameState.currentUser.uid,
    status: "waiting",
    settings: {
      maxPlayers: 8,
      timer: 20,
      containers: 10
    },
    createdAt: firebase.database.ServerValue.TIMESTAMP
  });

  gameState.currentLobby = lobbyId;
  showNotification(`Лобби #${lobbyId} создано!`);
  setTimeout(() => {
    window.location.href = `lobby.html?id=${lobbyId}`;
  }, 1500);
}

// Загрузка лобби
function showLobbies() {
  const nickname = elements.nicknameInput.value.trim();
  if (!nickname) {
    showNotification("Введите никнейм!", "error");
    return;
  }

  elements.lobbyList.innerHTML = '<p>Загрузка лобби...</p>';
  
  db.ref('lobbies').orderByChild('status').equalTo('waiting').once('value')
    .then(snapshot => {
      const lobbies = [];
      snapshot.forEach(childSnapshot => {
        const lobby = childSnapshot.val();
        lobby.id = childSnapshot.key;
        lobbies.push(lobby);
      });

      renderLobbies(lobbies);
    })
    .catch(error => {
      showNotification("Ошибка загрузки: " + error.message, "error");
    });
}

// Отображение лобби
function renderLobbies(lobbies) {
  if (lobbies.length === 0) {
    elements.lobbyList.innerHTML = '<p>Нет активных лобби. Создайте свое!</p>';
    return;
  }

  elements.lobbyList.innerHTML = '';
  
  lobbies.forEach(lobby => {
    const lobbyItem = document.createElement('div');
    lobbyItem.className = 'lobby-item';
    lobbyItem.innerHTML = `
      <div>
        <strong>Лобби #${lobby.id}</strong>
        <p>Игроков: ${Object.keys(lobby.players || {}).length}/${lobby.settings.maxPlayers}</p>
      </div>
      <button class="btn-join" data-id="${lobby.id}">ВОЙТИ</button>
    `;
    
    lobbyItem.querySelector('.btn-join').addEventListener('click', () => {
      joinLobby(lobby.id);
    });
    
    elements.lobbyList.appendChild(lobbyItem);
  });
}

// Присоединение к лобби
function joinLobby(lobbyId) {
  const nickname = elements.nicknameInput.value.trim();
  if (!nickname) {
    showNotification("Введите никнейм!", "error");
    return;
  }

  const lobbyRef = db.ref(`lobbies/${lobbyId}`);
  const playerRef = db.ref(`lobbies/${lobbyId}/players/${gameState.currentUser.uid}`);

  lobbyRef.transaction(lobby => {
    if (!lobby) return null;
    
    if (Object.keys(lobby.players || {}).length >= lobby.settings.maxPlayers) {
      showNotification("Лобби заполнено!", "error");
      return;
    }
    
    return lobby;
  })
  .then(() => {
    playerRef.set({
      name: nickname,
      money: 10000,
      isHost: false
    });
    
    gameState.currentLobby = lobbyId;
    showNotification(`Вы присоединились к лобби #${lobbyId}`);
    setTimeout(() => {
      window.location.href = `lobby.html?id=${lobbyId}`;
    }, 1500);
  })
  .catch(error => {
    showNotification("Ошибка: " + error.message, "error");
  });
}

// Показать уведомление
function showNotification(message, type = "success") {
  const notification = elements.notification;
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Генератор ID лобби
function generateLobbyId() {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Запуск игры при загрузке
document.addEventListener('DOMContentLoaded', initGame);
