# База данных пользователей Telegram бота

## Что создано

Полная система хранения и управления пользователями Telegram бота.

### Компоненты:

1. **Таблица `telegram_users`** - хранит всех пользователей бота
2. **Модель `TelegramUser`** - для работы с данными
3. **Контроллер `TelegramUserController`** - для просмотра и управления
4. **API endpoints** - для получения статистики

## Структура таблицы

```sql
telegram_users:
- id (primary key)
- chat_id (unique) - Telegram Chat ID
- username - @username пользователя
- first_name - Имя
- last_name - Фамилия
- language_code - Код языка (ru, en, kz)
- is_bot - Является ли ботом
- is_active - Активен ли пользователь
- first_interaction_at - Дата первого взаимодействия
- last_interaction_at - Дата последнего взаимодействия
- interactions_count - Количество взаимодействий
- metadata (JSON) - Дополнительные данные
- created_at - Дата создания записи
- updated_at - Дата обновления записи
```

## Автоматическое сохранение

Пользователи автоматически сохраняются при:
- Отправке команды `/start`
- Любом сообщении боту
- Взаимодействии через webhook

### Что сохраняется:

- ✅ Chat ID
- ✅ Username (@username)
- ✅ Имя и фамилия
- ✅ Язык интерфейса
- ✅ Время первого и последнего взаимодействия
- ✅ Счетчик взаимодействий

## Использование в коде

### Создание/обновление пользователя

```php
use App\Models\TelegramUser;

// Из данных Telegram API
$telegramUser = [
    'id' => 123456789,
    'username' => 'john_doe',
    'first_name' => 'John',
    'last_name' => 'Doe',
    'language_code' => 'ru',
    'is_bot' => false,
];

$user = TelegramUser::createOrUpdateFromTelegram($telegramUser);
```

### Получение пользователей

```php
// Все пользователи
$users = TelegramUser::all();

// Только активные
$activeUsers = TelegramUser::active()->get();

// Активные за последние 7 дней
$recentUsers = TelegramUser::recentlyActive(7)->get();

// Поиск по chat_id
$user = TelegramUser::where('chat_id', 123456789)->first();

// Получить полное имя
echo $user->full_name; // "John Doe"
echo $user->display_name; // "John"
```

### Статистика

```php
// Общее количество
$total = TelegramUser::count();

// Активные пользователи
$active = TelegramUser::active()->count();

// Недавно активные (7 дней)
$recent = TelegramUser::recentlyActive(7)->count();

// Всего взаимодействий
$interactions = TelegramUser::sum('interactions_count');
```

## API Endpoints

### Получить статистику

```bash
GET /api/telegram/users/stats
```

Ответ:
```json
{
    "total_users": 150,
    "active_users": 120,
    "recent_users": 45,
    "total_interactions": 1250,
    "new_today": 5,
    "new_this_week": 23,
    "new_this_month": 67
}
```

## Web интерфейс

Маршруты для просмотра пользователей:

```
GET /telegram-users - Список всех пользователей
GET /telegram-users/{id} - Детали пользователя
POST /telegram-users/{id}/deactivate - Деактивировать
POST /telegram-users/{id}/activate - Активировать
```

### Доступ к интерфейсу

1. Войдите в систему
2. В боковом меню выберите **"Пользователи Telegram"**
3. Вы увидите:
   - Статистику по пользователям
   - Список всех пользователей
   - Поиск по имени, username, Chat ID
   - Возможность активировать/деактивировать пользователей

### Статистика показывает:

- **Всего пользователей** - общее количество
- **Активные** - пользователи со статусом "активен"
- **Активны за 7 дней** - пользователи с активностью за последнюю неделю
- **Всего взаимодействий** - суммарное количество сообщений

## Примеры запросов

### Получить всех пользователей с фильтрами

```php
// Активные пользователи с сортировкой
$users = TelegramUser::active()
    ->orderBy('last_interaction_at', 'desc')
    ->paginate(20);

// Поиск по имени
$users = TelegramUser::where('first_name', 'like', '%John%')
    ->orWhere('username', 'like', '%john%')
    ->get();

// Пользователи за последний месяц
$users = TelegramUser::where('created_at', '>=', now()->subMonth())
    ->get();
```

### Обновить метаданные

```php
$user = TelegramUser::where('chat_id', 123456789)->first();

$user->metadata = [
    'preferences' => [
        'notifications' => true,
        'language' => 'ru',
    ],
    'last_command' => '/start',
];

$user->save();
```

### Деактивировать неактивных пользователей

```php
// Деактивировать пользователей без активности 30+ дней
TelegramUser::where('last_interaction_at', '<', now()->subDays(30))
    ->update(['is_active' => false]);
```

## Миграция выполнена

База данных уже создана и готова к использованию:

```bash
✓ Таблица telegram_users создана
✓ Индексы добавлены
✓ Модель настроена
✓ Автосохранение работает
```

## Проверка работы

### Через командную строку

```bash
# Показать всех пользователей
php artisan telegram:users

# Показать только активных
php artisan telegram:users --active

# Показать активных за последние 3 дня
php artisan telegram:users --recent=3
```

Вывод:
```
Total users: 1

+----+------------+---------------------+-------------------+--------+--------------+-----------------+------------------+
| ID | Chat ID    | Username            | Name              | Active | Interactions | First           | Last             |
+----+------------+---------------------+-------------------+--------+--------------+-----------------+------------------+
| 1  | 8063770361 | erdaulet_toibekov01 | Erdaulet Toibekov | ✓      | 1            | 2025-11-15 18:41| 2025-11-15 18:41 |
+----+------------+---------------------+-------------------+--------+--------------+-----------------+------------------+

Statistics:
Total users: 1
Active users: 1
Recent (7 days): 1
Total interactions: 1
```

### Через tinker

```bash
php artisan tinker

>>> App\Models\TelegramUser::count()
=> 1

>>> App\Models\TelegramUser::latest()->first()
=> App\Models\TelegramUser {
     id: 1,
     chat_id: 8063770361,
     username: "erdaulet_toibekov01",
     first_name: "Erdaulet Toibekov",
     ...
   }
```

## Расширение функционала

### Добавить новые поля

Создайте миграцию:
```bash
php artisan make:migration add_fields_to_telegram_users_table
```

### Добавить связи с другими таблицами

```php
// В модели TelegramUser
public function notifications()
{
    return $this->hasMany(TelegramNotification::class, 'chat_id', 'chat_id');
}

public function subscriptions()
{
    return $this->hasMany(TelegramSubscription::class);
}
```

---

**Готово! Все пользователи бота автоматически сохраняются в базу данных! 🎉**
