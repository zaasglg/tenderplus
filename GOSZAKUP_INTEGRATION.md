# TenderPlus - Dashboard с лотами Гос.закупок

Проект интегрирован с API Государственных закупок Республики Казахстан для отображения информации о лотах.

## Особенности

### ✨ Функционал
- 📊 **Dashboard со статистикой** - отображение ключевых метрик по лотам
- 🔍 **Поиск и фильтрация лотов** - поиск по названию, заказчику, номеру объявления
- 📱 **Адаптивный дизайн** - работает на всех устройствах  
- 🔄 **Пагинация** - удобная навигация по страницам
- ⚡ **Real-time обновления** - актуальные данные из API

### 🛠 Технологии
- **Frontend**: React + TypeScript + Inertia.js
- **Backend**: Laravel 11 + PHP 8.2
- **UI**: TailwindCSS + shadcn/ui
- **API**: Goszakup Open API v3

## Компоненты

### 1. LotsList (`/resources/js/components/lots-list.tsx`)
Основной компонент для отображения списка лотов с возможностями:
- Поиск по различным полям
- Отображение статусов и меток
- Форматирование валют и дат
- Пагинация

### 2. DashboardStats (`/resources/js/components/dashboard-stats.tsx`)
Компонент статистических карточек:
- Количество активных лотов
- Общая сумма лотов
- Количество объявлений
- Количество заказчиков

### 3. API клиенты

#### Прямой клиент (`/resources/js/lib/goszakup-api.ts`)
Прямое обращение к API Гос.закупок:
```typescript
import { goszakupApi } from '@/lib/goszakup-api';

// Получить лоты
const lots = await goszakupApi.getLots(1, 20);

// Поиск по БИН заказчика
const customerLots = await goszakupApi.getLotsByCustomerBin('123456789012');
```

#### Прокси клиент (`/resources/js/lib/goszakup-proxy-api.ts`)
Обращение через Laravel backend (рекомендуется):
```typescript
import { goszakupProxyApi } from '@/lib/goszakup-proxy-api';

// Использование аналогично прямому клиенту
const lots = await goszakupProxyApi.getLots(1, 20);
```

### 4. Hook для работы с лотами (`/resources/js/hooks/use-lots.ts`)
Удобный React Hook:
```typescript
import { useLots } from '@/hooks/use-lots';

function MyComponent() {
    const { 
        lots, 
        loading, 
        error, 
        fetchLots, 
        searchLots 
    } = useLots({
        autoFetch: true,
        pageSize: 20,
        useProxy: true // Использовать Laravel прокси
    });

    const filteredLots = searchLots('поисковый запрос');
    
    // ...
}
```

## Установка и настройка

### 1. Настройка backend

1. Установить зависимости:
```bash
composer install
```

2. API ключ уже настроен в контроллере `GoszakupProxyController.php`

3. Роуты API доступны по адресам:
- `GET /api/goszakup/lots` - список лотов
- `GET /api/goszakup/lots/{id}` - лот по ID
- `GET /api/goszakup/lots/customer/{bin}` - лоты по БИН заказчика
- И другие...

### 2. Настройка frontend

1. Установить зависимости:
```bash
npm install
```

2. Собрать проект:
```bash
npm run build
# или для разработки
npm run dev
```

### 3. Доступ к Dashboard

Перейдите по адресу `/dashboard` после авторизации.

## API Endpoints

### Основные методы Goszakup API v3:

#### Лоты
- `GET /v3/lots` - все лоты
- `GET /v3/lots/{id}` - лот по ID  
- `GET /v3/lots/number-anno/{number}` - лоты по номеру объявления
- `GET /v3/lots/bin/{bin}` - лоты по БИН заказчика

#### Справочники  
- `GET /v3/refs/ref_lots_status` - статусы лотов
- `GET /v3/refs/ref_trade_methods` - способы закупки

#### Участники
- `GET /v3/subject` - список участников
- `GET /v3/subject/biin/{biin}` - участник по БИН/ИИН

## Типы данных

### Lot Interface
```typescript
interface Lot {
    id: number;
    lot_number: number;
    ref_lot_status_id: number;
    name_ru: string;
    name_kz: string;
    customer_name_ru: string;
    customer_bin: string;
    amount: number;
    count: number;
    trd_buy_number_anno: string;
    last_update_date: string;
    // ... другие поля
}
```

### API Response
```typescript
interface GoszakupApiResponse<T> {
    total: number;
    next_page: string | null;
    limit: number;
    data: T[];
}
```

## Особенности API

### Аутентификация
API требует Bearer токен в заголовке:
```
Authorization: Bearer aaef3e09312a34aa05e02c12b49ee7d8
```

### Лимиты
- Максимум 100 записей на страницу
- Рекомендуется использовать пагинацию

### CORS
При прямом обращении к API могут возникнуть проблемы с CORS. 
Рекомендуется использовать Laravel прокси.

## Полезные ссылки

- [Официальная документация API](https://www.goszakup.gov.kz/ru/developer/ows_v3)
- [GraphQL Schema](https://ows.goszakup.gov.kz/help/v3/schema/)
- [Портал Гос.закупок](https://www.goszakup.gov.kz/)

## Поддержка

API токен действует 1 год и может быть обновлен в личном кабинете на портале Гос.закупок.

Для получения доступа к API обратитесь в АО "Центр Электронных Финансов".
