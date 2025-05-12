import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, serverTimestamp } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

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
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Защита от XSS - санитизация ввода
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Создание лобби с защитой от инъекций
async function createLobby(lobbyId, hostData) {
  if (!lobbyId || !hostData?.uid || !hostData?.name) {
    throw new Error('Неверные данные для создания лобби');
  }

  const sanitizedName = sanitizeInput(hostData.name);
  if (sanitizedName.length < 2 || sanitizedName.length > 30) {
    throw new Error('Имя должно быть от 2 до 30 символов');
  }

  const lobbyRef = ref(db, `lobbies/${lobbyId}`);
  
  const lobbyData = {
    host: hostData.uid,
    players: {
      [hostData.uid]: {
        name: sanitizedName,
        money: 10000,
        isHost: true,
        joinedAt: serverTimestamp()
      }
    },
    settings: {
      maxPlayers: 8,
      startMoney: 10000,
      timer: 30,
      containers: 10,
      gameMode: "solo"
    },
    status: "waiting",
    createdAt: serverTimestamp()
  };

  await set(lobbyRef, lobbyData);
  return lobbyId;
}

// Подключение к лобби с проверками
async function joinLobby(lobbyId, playerData) {
  if (!lobbyId || !playerData?.uid || !playerData?.name) {
    throw new Error('Неверные данные для подключения');
  }

  const sanitizedName = sanitizeInput(playerData.name);
  if (sanitizedName.length < 2 || sanitizedName.length > 30) {
    throw new Error('Имя должно быть от 2 до 30 символов');
  }

  const lobbyRef = ref(db, `lobbies/${lobbyId}`);
  const playerRef = ref(db, `lobbies/${lobbyId}/players/${playerData.uid}`);

  // Проверка существования лобби
  const snapshot = await get(lobbyRef);
  if (!snapshot.exists()) {
    throw new Error('Лобби не найдено');
  }

  const lobby = snapshot.val();
  
  // Проверка статуса лобби
  if (lobby.status !== "waiting") {
    throw new Error('Лобби уже началось');
  }

  // Проверка количества игроков
  const playerCount = Object.keys(lobby.players || {}).length;
  if (playerCount >= (lobby.settings?.maxPlayers || 8)) {
    throw new Error('Лобби заполнено');
  }

  // Добавление игрока
  await update(playerRef, {
    name: sanitizedName,
    money: lobby.settings?.startMoney || 10000,
    isHost: false,
    joinedAt: serverTimestamp()
  });

  return lobbyId;
}

// Прослушивание изменений в лобби с обработкой ошибок
function listenToLobby(lobbyId, callback) {
  const lobbyRef = ref(db, `lobbies/${lobbyId}`);
  
  const errorHandler = (error) => {
    console.error('Ошибка при прослушивании лобби:', error);
    callback({ error: error.message });
  };

  return onValue(lobbyRef, (snapshot) => {
    try {
      const data = snapshot.val();
      if (!data) {
        throw new Error('Лобби не найдено');
      }
      callback(data);
    } catch (error) {
      errorHandler(error);
    }
  }, errorHandler);
}

export { 
  db, 
  auth,
  signInAnonymously,
  createLobby,
  joinLobby,
  listenToLobby,
  sanitizeInput
};
