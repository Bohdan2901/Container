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

// Получаем ID лобби из URL
const urlParams = new URLSearchParams(window.location.search);
const lobbyId = urlParams.get('id');

// DOM элементы
const elements = {
  winnerCard: document.getElementById('winner-card'),
  winnerName: document.getElementById('winner-name'),
  winnerAmount: document.getElementById('winner-amount'),
  teamInfo: document.getElementById('team-info'),
  teamName: document.getElementById('team-name'),
  resultsTable: document.getElementById('results-table'),
  playAgainBtn: document.getElementById('play-again'),
  mainMenuBtn: document.getElementById('main-menu')
};

// Загрузка результатов
function loadResults() {
  if (!lobbyId) {
    alert("Не указан ID лобби!");
    window.location.href = 'index.html';
    return;
  }

  // Загружаем настройки лобби
  db.ref(`lobbies/${lobbyId}/settings`).once('value').then(snapshot => {
    const settings = snapshot.val();
    const gameMode = settings?.gameMode || 'solo';
    
    // Загружаем игроков
    db.ref(`lobbies/${lobbyId}/players`).once('value').then(snapshot => {
      const players = snapshot.val();
      if (!players) {
        alert("Данные игроков не найдены!");
        window.location.href = 'index.html';
        return;
      }
      
      // Преобразуем объект игроков в массив
      const playersArray = Object.entries(players).map(([id, player]) => {
        return { id, ...player };
      });
      
      // Сортируем игроков по балансу (учитывая командный режим)
      if (gameMode === 'solo') {
        // Одиночный режим - сортируем по деньгам
        playersArray.sort((a, b) => b.money - a.money);
        renderResults(playersArray, gameMode);
      } else {
        // Командный режим - группируем по командам
        const teams = {};
        
        playersArray.forEach(player => {
          const team = player.team || 0;
          if (!teams[team]) {
            teams[team] = {
              totalMoney: 0,
              players: [],
              wins: 0
            };
          }
          
          teams[team].totalMoney += player.money;
          teams[team].players.push(player);
          teams[team].wins += player.wins || 0;
        });
        
        // Преобразуем объект команд в массив и сортируем
        const teamsArray = Object.entries(teams).map(([teamId, team]) => {
          return {
            id: teamId,
            ...team,
            name: getTeamName(teamId, gameMode)
          };
        }).sort((a, b) => b.totalMoney - a.totalMoney);
        
        renderTeamResults(teamsArray, gameMode);
      }
    });
  });
}

// Получение названия команды
function getTeamName(teamId, gameMode) {
  const teamNames = {
    'teams': ['Красные', 'Синие'],
    'teams4': ['Красные', 'Синие', 'Зеленые', 'Желтые']
  };
  
  return teamNames[gameMode]?.[teamId] || `Команда ${parseInt(teamId) + 1}`;
}

// Получение цвета команды
function getTeamColor(teamId) {
  const teamColors = ['red', 'blue', 'green', 'yellow'];
  return teamColors[teamId] || 'red';
}

// Отображение результатов (одиночный режим)
function renderResults(players, gameMode) {
  // Устанавливаем победителя
  const winner = players[0];
  elements.winnerName.textContent = winner.name;
  elements.winnerAmount.textContent = `$${winner.money.toLocaleString()}`;
  
  // Анимация появления победителя
  gsap.from(elements.winnerCard, {
    opacity: 0,
    y: -50,
    duration: 1,
    ease: "back.out(1.7)"
  });
  
  // Заполняем таблицу результатов
  const tableBody = elements.resultsTable.querySelector('tbody');
  tableBody.innerHTML = '';
  
  players.forEach((player, index) => {
    const row = document.createElement('tr');
    
    // Рассчитываем ROI
    const roi = player.totalSpent ? Math.round((player.totalWon - player.totalSpent) / player.totalSpent * 100) : 0;
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
        ${player.name}
        ${player.isHost ? '<i class="fas fa-crown" style="color: var(--accent); margin-left: 5px;"></i>' : ''}
      </td>
      <td>$${player.money.toLocaleString()}</td>
      <td>${player.wins || 0}</td>
      <td>${roi}%</td>
    `;
    
    // Анимация появления строки
    gsap.from(row, {
      opacity: 0,
      x: index % 2 === 0 ? -50 : 50,
      duration: 0.5,
      delay: index * 0.1
    });
    
    tableBody.appendChild(row);
  });
}

// Отображение результатов (командный режим)
function renderTeamResults(teams, gameMode) {
  // Устанавливаем победителя (первую команду)
  const winnerTeam = teams[0];
  const bestPlayer = winnerTeam.players.sort((a, b) => b.money - a.money)[0];
  
  elements.winnerName.textContent = `Команда "${winnerTeam.name}"`;
  elements.winnerAmount.textContent = `$${winnerTeam.totalMoney.toLocaleString()}`;
  elements.teamInfo.style.display = 'block';
  
  // Анимация появления победителя
  gsap.from(elements.winnerCard, {
    opacity: 0,
    y: -50,
    duration: 1,
    ease: "back.out(1.7)"
  });
  
  // Заполняем таблицу результатов
  const tableBody = elements.resultsTable.querySelector('tbody');
  tableBody.innerHTML = '';
  
  teams.forEach((team, index) => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <span class="team-badge team-${getTeamColor(team.id)}">${team.name}</span>
      </td>
      <td>$${team.totalMoney.toLocaleString()}</td>
      <td>${team.wins}</td>
      <td>-</td>
    `;
    
    // Анимация появления строки
    gsap.from(row, {
      opacity: 0,
      x: index % 2 === 0 ? -50 : 50,
      duration: 0.5,
      delay: index * 0.1
    });
    
    tableBody.appendChild(row);
  });
  
  // Добавляем игроков каждой команды
  teams.forEach(team => {
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <td colspan="5" style="text-align: center; background: rgba(255,255,255,0.05); font-weight: bold; color: var(--accent-light);">
        Команда "${team.name}"
      </td>
    `;
    tableBody.appendChild(headerRow);
    
    team.players.sort((a, b) => b.money - a.money).forEach(player => {
      const roi = player.totalSpent ? Math.round((player.totalWon - player.totalSpent) / player.totalSpent * 100) : 0;
      
      const playerRow = document.createElement('tr');
      playerRow.innerHTML = `
        <td></td>
        <td>
          <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
          ${player.name}
          ${player.isHost ? '<i class="fas fa-crown" style="color: var(--accent); margin-left: 5px;"></i>' : ''}
        </td>
        <td>$${player.money.toLocaleString()}</td>
        <td>${player.wins || 0}</td>
        <td>${roi}%</td>
      `;
      tableBody.appendChild(playerRow);
    });
  });
}

// Кнопка "Играть снова"
elements.playAgainBtn.addEventListener('click', () => {
  db.ref(`lobbies/${lobbyId}`).update({
    status: "waiting",
    startTime: null
  }).then(() => {
    window.location.href = `lobby.html?id=${lobbyId}`;
  });
});

// Кнопка "Главное меню"
elements.mainMenuBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Загрузка результатов при старте
document.addEventListener('DOMContentLoaded', loadResults);
