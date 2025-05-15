function getOnline($server_id = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://backend.arizona-rp.com/server/get-all");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Referer: https://arizona-rp.com/',
    ]);

    $response = curl_exec($ch);
    $response = json_decode($response);

    curl_close($ch);
    
    if ($server_id !== null) {
        return $response[$server_id]->players ?? null;
    }
    
    return $response;
}

// В коде бота (например, при использовании библиотеки TelegramBotPHP)
$telegram = new Telegram('7760179850:AAHkidd3zlkpbexNXPC_dC47Wj_Jgkw8k-M');

$text = $telegram->Text();
$chat_id = $telegram->ChatID();

if ($text == '/online') {
    $servers = getOnline();
    
    if (!$servers) {
        $message = "Не удалось получить данные о серверах";
    } else {
        $message = "📊 Онлайн серверов Arizona-RP:\n\n";
        
        foreach ($servers as $server) {
            $message .= "🔹 {$server->name}: {$server->players}/{$server->maxplayers} игроков\n";
        }
        
        $message .= "\n🔄 Обновлено: " . date('H:i:s');
    }
    
    $content = ['chat_id' => $chat_id, 'text' => $message];
    $telegram->sendMessage($content);
}
