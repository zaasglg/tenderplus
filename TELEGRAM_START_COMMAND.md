# Команда /start для Telegram бота

## Что было добавлено

Теперь любой пользователь может написать боту команду `/start` и получить приветственное сообщение с полезной информацией.

## Приветственное сообщение включает:

- 👋 Приветствие
- 🔔 Описание возможностей бота
- ⚙️ Ссылку на настройки
- 📋 Chat ID пользователя для настройки системы

## Как это работает

1. **Webhook** - бот получает все сообщения через webhook endpoint
2. **Обработка команд** - контроллер `TelegramWebhookController` обрабатывает команду `/start`
3. **Отправка приветствия** - метод `sendWelcomeMessage()` отправляет персонализированное сообщение

## Установка

### Вариант 1: Long Polling (для локальной разработки)

```bash
# Запустите слушатель бота
php artisan telegram:listen
```

Это запустит бота в режиме long polling - он будет постоянно проверять новые сообщения.

### Вариант 2: Webhook (для продакшена с HTTPS)

```bash
# Установите webhook
php artisan telegram:setup-webhook
```

**Для локальной разработки с webhook используйте ngrok:**

```bash
# Установите ngrok
ngrok http 8000

# Обновите APP_URL в .env на ngrok URL
APP_URL=https://your-ngrok-url.ngrok.io

# Установите webhook
php artisan telegram:setup-webhook
```

### Проверка работы

1. Откройте вашего бота в Telegram
2. Отправьте команду `/start`
3. Получите приветственное сообщение с вашим Chat ID

### Используйте Chat ID

Скопируйте Chat ID из сообщения и используйте его в настройках системы:
- Веб-интерфейс: **Настройки → Telegram**
- Или в `.env` файле: `TELEGRAM_CHAT_ID=ваш_chat_id`

## Управление

### Остановить long polling

Нажмите `Ctrl+C` в терминале где запущен `telegram:listen`

### Удалить webhook

```bash
php artisan telegram:setup-webhook --remove
```

## Файлы

- `app/Http/Controllers/Api/TelegramWebhookController.php` - обработка webhook
- `app/Services/TelegramService.php` - метод `sendWelcomeMessage()`
- `app/Console/Commands/SetupTelegramWebhook.php` - команда настройки webhook
- `routes/api.php` - маршрут `/api/telegram/webhook`

## Расширение функционала

Вы можете легко добавить другие команды в `TelegramWebhookController`:

```php
// Обработка других команд
if ($text === '/help') {
    $this->telegramService->sendHelpMessage($chatId);
}

if ($text === '/status') {
    $this->telegramService->sendStatusMessage($chatId);
}
```
