// Элементы
const startScreen = document.getElementById('start-screen');
const nicknameInput = document.getElementById('nickname');
const createLobbyBtn = document.getElementById('create-lobby');
const joinLobbyBtn = document.getElementById('join-lobby');
const lobbyList = document.getElementById('lobby-list');

// Тестовые данные (замени на Firebase)
const testLobbies = [
  { id: "ABC123", players: 3, host: "Ведущий_1" },
  { id: "XYZ789", players: 1, host: "Ведущий_2" }
];

// Загрузка лобби
function loadLobbies() {
  lobbyList.innerHTML = '';
  testLobbies.forEach(lobby => {
    const lobbyItem = document.createElement('div');
    lobbyItem.className = 'lobby-item';
    lobbyItem.innerHTML = `
      Лобби ${lobby.id} | Игроков: ${lobby.players} | Ведущий: ${lobby.host}
    `;
    lobbyItem.addEventListener('click', () => joinLobby(lobby.id));
    lobbyList.appendChild(lobbyItem);
  });
}

// Создать лобби
createLobbyBtn.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();
  if (nickname.length < 2) {
    alert('Никнейм должен быть от 2 символов!');
    return;
  }
  alert(`Лобби создано! (Ник: ${nickname})`);
  // Здесь будет переход в lobby.html
});

// Присоединиться
joinLobbyBtn.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();
  if (nickname.length < 2) {
    alert('Введите никнейм!');
    return;
  }
  loadLobbies();
});

// Загрузка при старте
window.addEventListener('load', () => {
  nicknameInput.focus();
});
