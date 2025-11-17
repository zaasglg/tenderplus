# Web интерфейс для пользователей Telegram

## ✅ Готово!

Добавлен полноценный интерфейс для просмотра и управления пользователями Telegram бота.

## Что добавлено

### 1. Пункт меню в боковой панели

В навигации появился новый пункт:
- 📱 **Пользователи Telegram** - с иконкой MessageCircle

### 2. Страница со статистикой

Показывает 4 карточки с метриками:
- **Всего пользователей** - общее количество
- **Активные** - процент активных пользователей
- **Активны за 7 дней** - недавняя активность
- **Всего взаимодействий** - среднее количество на пользователя

### 3. Поиск пользователей

Можно искать по:
- Имени (first_name, last_name)
- Username (@username)
- Chat ID

### 4. Таблица пользователей

Отображает:
- ID записи
- Chat ID (для настройки уведомлений)
- Username (с символом @)
- Полное имя
- Статус (Активен/Неактивен)
- Количество взаимодействий
- Дата первого взаимодействия
- Дата последнего взаимодействия
- Кнопки действий

### 5. Управление пользователями

Для каждого пользователя доступны действия:
- **Деактивировать** - отключить пользователя
- **Активировать** - включить обратно

### 6. Пагинация

Автоматическая пагинация по 20 пользователей на странице.

## Как использовать

### Открыть интерфейс

1. Войдите в систему: http://127.0.0.1:8000/login
2. В боковом меню нажмите **"Пользователи Telegram"**
3. Откроется страница: http://127.0.0.1:8000/telegram-users

### Найти пользователя

1. Введите в поле поиска:
   - Имя: `Erdaulet`
   - Username: `erdaulet_toibekov01`
   - Chat ID: `8063770361`
2. Нажмите **"Найти"**
3. Для сброса нажмите **"Сбросить"**

### Деактивировать пользователя

1. Найдите пользователя в таблице
2. Нажмите кнопку **"Деактивировать"**
3. Статус изменится на "Неактивен"
4. Пользователь больше не будет получать уведомления

### Активировать обратно

1. Найдите деактивированного пользователя
2. Нажмите кнопку **"Активировать"**
3. Статус изменится на "Активен"

## Структура данных

### Карточка пользователя показывает:

```
ID: 1
Chat ID: 8063770361
Username: @erdaulet_toibekov01
Имя: Erdaulet Toibekov
Статус: Активен
Взаимодействий: 5
Первое взаимодействие: 15.11.2025 18:41
Последнее взаимодействие: 15.11.2025 19:30
```

## API для получения данных

### Статистика

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

## Файлы

### Backend:
- `app/Http/Controllers/TelegramUserController.php` - контроллер
- `app/Models/TelegramUser.php` - модель
- `routes/web.php` - маршруты

### Frontend:
- `resources/js/pages/telegram-users.tsx` - страница
- `resources/js/components/app-sidebar.tsx` - меню

## Возможности расширения

### Добавить фильтры

```typescript
// В компоненте telegram-users.tsx
const [filters, setFilters] = useState({
    active: true,
    language: 'ru',
    dateFrom: null,
    dateTo: null,
});
```

### Добавить экспорт в CSV

```php
// В TelegramUserController
public function export()
{
    $users = TelegramUser::all();
    
    return response()->streamDownload(function () use ($users) {
        $csv = fopen('php://output', 'w');
        fputcsv($csv, ['ID', 'Chat ID', 'Username', 'Name', 'Active', 'Interactions']);
        
        foreach ($users as $user) {
            fputcsv($csv, [
                $user->id,
                $user->chat_id,
                $user->username,
                $user->full_name,
                $user->is_active ? 'Yes' : 'No',
                $user->interactions_count,
            ]);
        }
        
        fclose($csv);
    }, 'telegram-users.csv');
}
```

### Добавить детальную страницу

```php
// Маршрут уже есть
Route::get('telegram-users/{user}', [TelegramUserController::class, 'show']);

// Создайте страницу
resources/js/pages/telegram-user-details.tsx
```

### Добавить графики активности

Используйте библиотеку Chart.js или Recharts для визуализации:
- График регистраций по дням
- График активности по часам
- Распределение по языкам

## Безопасность

### Доступ только для авторизованных

Все маршруты защищены middleware `auth`:

```php
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('telegram-users', ...);
});
```

### Права доступа (опционально)

Можно добавить проверку прав:

```php
Route::middleware(['auth', 'can:manage-telegram-users'])->group(function () {
    Route::get('telegram-users', ...);
});
```

---

**Готово! Теперь вы можете управлять пользователями Telegram через удобный веб-интерфейс! 🎉**
