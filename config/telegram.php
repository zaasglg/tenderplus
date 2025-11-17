<?php

return [
    'bot_token' => env('TELEGRAM_BOT_TOKEN'),
    'chat_id' => env('TELEGRAM_CHAT_ID'),
    'notifications_enabled' => env('TELEGRAM_NOTIFICATIONS_ENABLED', false),
    'api_url' => 'https://api.telegram.org/bot',
];
