# Рассылка уведомлений всем пользователям Telegram

## ✅ Готово!

Система автоматически отправляет уведомления о новых лотах всем активным пользователям из базы данных.

## Как это работает

### Автоматическая рассылка

Когда система находит новые лоты (каждые 30 минут):

1. **Получает список активных пользователей** из базы данных
2. **Форматирует сообщение** с информацией о новых лотах
3. **Отправляет каждому пользователю** индивидуально
4. **Логирует результаты** - сколько отправлено успешно, сколько с ошибками

### Кто получает уведомления

Уведомления получают только пользователи с:
- ✅ `is_active = true` (активные)
- ✅ Записью в таблице `telegram_users`

### Что отправляется

Пример уведомления:
```
🔔 Новые лоты для вас!

Найдено 3 новых лота:

📋 1. Стиральный порошок автомат "Ариэль"...
💰 Сумма: 1,500,000 ₸
🏢 Заказчик: ТОО "Чистота"...
📝 Объявление: 12345678
🕒 Обновлено: 15.11.2025 12:30

📋 2. Порошок для ручной стирки...
💰 Сумма: 750,000 ₸
🏢 Заказчик: АО "Бытхим"...
📝 Объявление: 87654321
🕒 Обновлено: 15.11.2025 12:25

🔗 Посмотреть все лоты: http://localhost/lots
```

## Тестирование рассылки

### Через командную строку

```bash
# Отправить тестовое сообщение всем активным пользователям
php artisan telegram:test-broadcast
```

Результат:
```
Sending test broadcast to all active users...

Broadcast Results:
Total users: 1
Successfully sent: 1
Failed: 0

+------------+-------------------+------+--------+-------+
| Chat ID    | Name              | Sent | Status | Error |
+------------+-------------------+------+--------+-------+
| 8063770361 | Erdaulet Toibekov | ✓    | sent   | -     |
+------------+-------------------+------+--------+-------+
✓ Test broadcast completed successfully!
```

### Через API

```bash
# POST запрос для тестовой рассылки
curl -X POST http://localhost:8000/api/telegram/broadcast
```

Ответ:
```json
{
    "success": true,
    "results": {
        "total": 1,
        "success": 1,
        "failed": 0,
        "users": [
            {
                "chat_id": 8063770361,
                "name": "Erdaulet Toibekov",
                "status": "sent"
            }
        ]
    },
    "message": "Отправлено 1 из 1 пользователям"
}
```

## Ручная проверка новых лотов

```bash
# Запустить проверку новых лотов вручную
php artisan lots:check-new
```

Это:
1. Проверит новые лоты на Goszakup
2. Отфильтрует по критериям
3. Отправит уведомления всем активным пользователям

## Настройка автоматической проверки

В файле `routes/console.php` уже настроено:

```php
Schedule::command('lots:check-new')
    ->everyThirtyMinutes()
    ->between('8:00', '20:00');
```

Это означает:
- ⏰ Проверка каждые 30 минут
- 🕐 С 8:00 до 20:00
- 📱 Рассылка всем активным пользователям

## Логирование

Все рассылки логируются в `storage/logs/laravel.log`:

```
[2025-11-15 18:45:00] local.INFO: Message sent to user Erdaulet Toibekov (chat_id: 8063770361)
[2025-11-15 18:45:00] local.INFO: Broadcast completed: 1 sent, 0 failed out of 1 users
```

## Управление пользователями

### Деактивировать пользователя

Если пользователь не хочет получать уведомления:

```bash
# Через веб-интерфейс
http://localhost:8000/telegram-users
# Нажать "Деактивировать" напротив пользователя

# Или через код
php artisan tinker
>>> $user = App\Models\TelegramUser::where('chat_id', 8063770361)->first();
>>> $user->update(['is_active' => false]);
```

### Активировать обратно

```php
$user->update(['is_active' => true]);
```

## Защита от спама

Система включает защиту:

1. **Задержка между отправками** - 0.1 секунды между сообщениями
2. **Кеш отправленных лотов** - не отправляет один и тот же лот дважды
3. **Только активные пользователи** - деактивированные не получают уведомления
4. **Лимит времени** - рассылка только с 8:00 до 20:00

## Статистика рассылок

Система сохраняет статистику в кеш:

```php
$stats = Cache::get('notification_stats');
// [
//     '2025-11-15' => ['count' => 5, 'lots' => 23],
//     '2025-11-16' => ['count' => 3, 'lots' => 12],
// ]
```

## Обратная совместимость

Если в базе данных нет пользователей, система отправит уведомление на `TELEGRAM_CHAT_ID` из `.env` файла (старое поведение).

## Добавление новых пользователей

Пользователи добавляются автоматически при:
- Отправке команды `/start` боту
- Любом сообщении боту

Не нужно ничего настраивать вручную!

## Пример использования в коде

### Отправить сообщение всем пользователям

```php
use App\Services\TelegramService;

$telegramService = app(TelegramService::class);

$message = "🔔 Важное уведомление!\n\nТекст сообщения...";
$sent = $telegramService->sendToAllActiveUsers($message);

if ($sent) {
    echo "Сообщение отправлено!";
}
```

### Отправить конкретному пользователю

```php
$telegramService->sendMessage($message, ['chat_id' => 8063770361]);
```

### Получить статистику

```php
use App\Models\TelegramUser;

$total = TelegramUser::count();
$active = TelegramUser::active()->count();
$recent = TelegramUser::recentlyActive(7)->count();

echo "Всего: {$total}, Активных: {$active}, За неделю: {$recent}";
```

## Устранение неполадок

### Сообщения не отправляются

1. Проверьте что бот запущен:
```bash
php artisan telegram:listen
```

2. Проверьте токен в `.env`:
```env
TELEGRAM_BOT_TOKEN=ваш_токен
TELEGRAM_NOTIFICATIONS_ENABLED=true
```

3. Проверьте активных пользователей:
```bash
php artisan telegram:users --active
```

### Пользователь не получает уведомления

1. Проверьте статус пользователя:
```bash
php artisan telegram:users
```

2. Убедитесь что `is_active = true`

3. Проверьте логи:
```bash
Get-Content storage\logs\laravel.log -Tail 50
```

## Расширение функционала

### Добавить персональные настройки

```php
// В миграции добавить поля
$table->json('notification_preferences')->nullable();

// В модели TelegramUser
public function wantsNotifications(string $type): bool
{
    $prefs = $this->notification_preferences ?? [];
    return $prefs[$type] ?? true;
}

// При отправке
foreach ($users as $user) {
    if ($user->wantsNotifications('new_lots')) {
        $this->sendMessage($message, ['chat_id' => $user->chat_id]);
    }
}
```

### Добавить команды бота для управления

```php
// В TelegramBotListen.php
if ($text === '/notifications_off') {
    $user->update(['is_active' => false]);
    $this->telegramService->sendMessage(
        'Уведомления отключены',
        ['chat_id' => $chatId]
    );
}

if ($text === '/notifications_on') {
    $user->update(['is_active' => true]);
    $this->telegramService->sendMessage(
        'Уведомления включены',
        ['chat_id' => $chatId]
    );
}
```

---

**Готово! Все активные пользователи автоматически получают уведомления о новых лотах! 🎉**
