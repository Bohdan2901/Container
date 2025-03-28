// Функция для получения количества заявок с одного устройства
function getSubmissionCount() {
    return localStorage.getItem('submissionCount') || 0;
}

// Функция для увеличения счетчика
function incrementSubmissionCount() {
    let count = getSubmissionCount();
    localStorage.setItem('submissionCount', parseInt(count) + 1);
}

// Проверка, можно ли отправить заявку
function canSubmitForm() {
    let count = getSubmissionCount();
    return count < 20;
}

// Функция отправки данных в Discord через вебхук
function sendToDiscord(data, webhookURL, type) {
    let color = type === 'family' ? 0x3498db : 0x2ecc71; // Синий для семьи, зеленый для барыг

    fetch(webhookURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            embeds: [{
                title: type === 'family' ? '📜 Новая заявка в семью' : '💰 Новая заявка в барыги',
                color: color,
                description: '📥 **Подана новая заявка!**\n**Детали ниже:**',
                fields: data.map(item => ({
                    name: `📌 ${item.name}`,
                    value: item.value || '*Не указано*',
                    inline: false
                })),
                footer: {
                    text: 'Система заявок',
                    icon_url: 'https://cdn-icons-png.flaticon.com/512/3523/3523884.png'
                },
                timestamp: new Date()
            }]
        })
    });
}

// Показать форму регистрации в семью
document.getElementById('familyBtn').addEventListener('click', function() {
    document.getElementById('familyForm').classList.remove('hidden');
    document.getElementById('barygaForm').classList.add('hidden');
});

// Показать форму регистрации в барыги
document.getElementById('barygaBtn').addEventListener('click', function() {
    document.getElementById('barygaForm').classList.remove('hidden');
    document.getElementById('familyForm').classList.add('hidden');
});

// Отправить регистрацию в семью
document.getElementById('submitFamily').addEventListener('click', function() {
    if (!canSubmitForm()) {
        alert('Вы уже отправили 2 заявок!');
        return;
    }

    let nickname = document.getElementById('familyNickname').value;
    let history = document.getElementById('familyHistory').value;
    let punishHistory = document.getElementById('familyPunishHistory').value;
    let uid = document.getElementById('familyUID').value;
    let assets = document.getElementById('familyAssets').value;
    let friends = document.getElementById('familyFriends').value;
    let age = document.getElementById('familyAge').value;
    let reputation = document.getElementById('familyReputation').value;
    let cs = document.getElementById('familyCS').value;
    let bans = document.getElementById('familyBans').value;
    let reason = document.getElementById('familyReason').value;

    let data = [
        { name: 'Никнейм', value: nickname },
        { name: 'История ников', value: history },
        { name: 'История наказаний', value: punishHistory },
        { name: 'UID', value: uid },
        { name: 'Оценка имущества', value: assets },
        { name: 'Знакомые в семье', value: friends },
        { name: 'Возраст', value: age },
        { name: 'Репутация', value: reputation },
        { name: 'ЧСП/ЧСС', value: cs },
        { name: 'Баны за ИЗП', value: bans },
        { name: 'Причина', value: reason }
    ];

    // Отправляем данные в Discord
    sendToDiscord(data, 'https://discord.com/api/webhooks/1355254098957570178/yF20UNGgrjoEjGzpGiV2o4lkaSK9w2ub7dCvRSQ9gLYyKZ6GvOamqg1O0DfFheXUmcUn', 'family');

    incrementSubmissionCount();
    document.getElementById('familyConfirmation').style.display = 'block';
});

// Отправить регистрацию в барыги
document.getElementById('submitBaryga').addEventListener('click', function() {
    if (!canSubmitForm()) {
        alert('Вы уже отправили 2 заявок!');
        return;
    }

    let nickname = document.getElementById('barygaNickname').value;
    let business = document.getElementById('barygaBusiness').value;
    let punishHistory = document.getElementById('barygaPunishHistory').value;
    let uid = document.getElementById('barygaUID').value;
    let reputation = document.getElementById('barygaReputation').value;
    let cs = document.getElementById('barygaCS').value;
    let bans = document.getElementById('barygaBans').value;
    let reason = document.getElementById('barygaReason').value;

    let data = [
        { name: 'Никнейм', value: nickname },
        { name: 'Бизнесы', value: business },
        { name: 'История наказаний', value: punishHistory },
        { name: 'UID', value: uid },
        { name: 'Репутация', value: reputation },
        { name: 'ЧСП/ЧСС', value: cs },
        { name: 'Баны за ИЗП', value: bans },
        { name: 'Причина', value: reason }
    ];

    // Отправляем данные в Discord
    sendToDiscord(data, 'https://discord.com/api/webhooks/1354156657097052381/RgyQQhCadsRiyeLE0ByC0evRPoCnuzIf-OJsTinvKzhv_JZFno1JeMKm7xqTVvhLZq-M', 'baryga');

    incrementSubmissionCount();
    document.getElementById('barygaConfirmation').style.display = 'block';
});
