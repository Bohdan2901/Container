// Инициализация
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://container-auction-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Запись данных
function createLobby(lobbyId, hostData) {
  set(ref(db, 'lobbies/' + lobbyId), {
    host: hostData.name,
    players: {
      [hostData.uid]: {
        name: hostData.name,
        money: 10000
      }
    },
    status: "waiting"
  });
}

// Чтение данных в реальном времени
function listenToLobby(lobbyId) {
  const lobbyRef = ref(db, 'lobbies/' + lobbyId);
  onValue(lobbyRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Данные лобби:", data);
  });
}
