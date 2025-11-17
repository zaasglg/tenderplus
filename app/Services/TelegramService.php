<?php

namespace App\Services;

use App\Models\TelegramUser;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    private string $botToken;
    private string $chatId;
    private bool $enabled;

    public function __construct()
    {
        $this->botToken = config('telegram.bot_token');
        $this->chatId = config('telegram.chat_id');
        $this->enabled = config('telegram.notifications_enabled', false);
    }

    /**
     * Отправить сообщение в Telegram
     */
    public function sendMessage(string $message, array $options = []): bool
    {
        if (!$this->enabled || !$this->botToken) {
            Log::info('Telegram notifications disabled or not configured');
            return false;
        }

        // Для обычных сообщений используем chatId из конфига
        $chatId = $options['chat_id'] ?? $this->chatId;
        
        if (!$chatId) {
            Log::info('Chat ID not provided');
            return false;
        }

        try {
            $url = config('telegram.api_url') . $this->botToken . '/sendMessage';
            
            $data = [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => $options['parse_mode'] ?? 'HTML',
                'disable_web_page_preview' => $options['disable_preview'] ?? false, // Включаем превью для ссылок
            ];

            $response = Http::post($url, $data);

            if ($response->successful()) {
                Log::info('Telegram message sent successfully');
                return true;
            } else {
                Log::error('Failed to send Telegram message', [
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Telegram service error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Отправить приветственное сообщение
     */
    public function sendWelcomeMessage(string $chatId): bool
    {
        $message = "👋 <b>Добро пожаловать в TenderPlus Bot!</b>\n\n";
        $message .= "Я буду присылать вам уведомления о новых тендерах и лотах, которые соответствуют вашим критериям.\n\n";
        $message .= "🔔 <b>Что я умею:</b>\n";
        $message .= "• Отслеживать новые лоты на Goszakup\n";
        $message .= "• Фильтровать по вашим критериям\n";
        $message .= "• Отправлять уведомления в реальном времени\n\n";
        $message .= "⚙️ <b>Настройка:</b>\n";
        $message .= "Для настройки уведомлений перейдите в веб-интерфейс TenderPlus:\n";
        $message .= "🌐 <a href=\"" . config('app.url') . "/settings/telegram\">Настройки → Telegram</a>\n\n";
        $message .= "📋 <b>Ваш Chat ID:</b> <code>{$chatId}</code>\n";
        $message .= "Используйте этот ID в настройках системы.\n\n";
        $message .= "Удачи в тендерах! 🎯";

        return $this->sendMessage($message, ['chat_id' => $chatId]);
    }

    /**
     * Отправить уведомление о новых лотах
     */
    public function sendNewLotsNotification(array $lots): bool
    {
        if (empty($lots)) {
            return false;
        }

        $message = $this->formatLotsMessage($lots);
        
        // Отправляем всем активным пользователям из базы данных
        return $this->sendToAllActiveUsers($message);
    }

    /**
     * Отправить сообщение всем активным пользователям
     */
    public function sendToAllActiveUsers(string $message): bool
    {
        if (!$this->enabled || !$this->botToken) {
            Log::info('Telegram notifications disabled or not configured');
            return false;
        }

        // Получаем всех активных пользователей
        $activeUsers = TelegramUser::active()->get();
        
        if ($activeUsers->isEmpty()) {
            Log::info('No active Telegram users found');
            
            // Если нет пользователей в базе, отправляем на chat_id из конфига (для обратной совместимости)
            if ($this->chatId) {
                return $this->sendMessage($message);
            }
            
            return false;
        }

        $successCount = 0;
        $failCount = 0;

        foreach ($activeUsers as $user) {
            try {
                $sent = $this->sendMessage($message, ['chat_id' => $user->chat_id]);
                
                if ($sent) {
                    $successCount++;
                    Log::info("Message sent to user {$user->display_name} (chat_id: {$user->chat_id})");
                } else {
                    $failCount++;
                    Log::warning("Failed to send message to user {$user->display_name} (chat_id: {$user->chat_id})");
                }
                
                // Небольшая задержка между отправками чтобы не превысить лимиты Telegram API
                usleep(100000); // 0.1 секунды
                
            } catch (\Exception $e) {
                $failCount++;
                Log::error("Error sending message to user {$user->display_name}: {$e->getMessage()}");
            }
        }

        Log::info("Broadcast completed: {$successCount} sent, {$failCount} failed out of {$activeUsers->count()} users");

        // Считаем успешным если хотя бы одно сообщение отправлено
        return $successCount > 0;
    }

    /**
     * Форматировать сообщение о лотах
     */
    private function formatLotsMessage(array $lots): string
    {
        $count = count($lots);
        $message = "🔔 <b>Новые лоты для вас!</b>\n\n";
        $message .= "Найдено <b>{$count}</b> " . $this->pluralize($count, 'новый лот', 'новых лота', 'новых лотов') . ":\n\n";

        foreach (array_slice($lots, 0, 5) as $index => $lot) { // Ограничиваем 5 лотами
            $message .= "📋 <b>" . ($index + 1) . ". " . $this->truncateText($lot['name_ru'], 60) . "</b>\n";
            
            // Добавляем ссылку на лот в Goszakup
            $goszakupUrl = $this->generateGoszakupLotUrl($lot);
            $message .= "� <a href=\"{$goszakupUrl}\">Открыть лот в Goszakup</a>\n";
            
            $message .= "�💰 Сумма: <b>" . $this->formatAmount($lot['amount']) . " ₸</b>\n";
            $message .= "🏢 Заказчик: " . $this->truncateText($lot['customer_name_ru'], 40) . "\n";
            $message .= "📝 Объявление: <code>" . $lot['trd_buy_number_anno'] . "</code>\n";
            $message .= "� Обновлено: " . $this->formatDate($lot['last_update_date']) . "\n";
            
            // Добавляем статус лота если есть
            if (isset($lot['ref_lot_status_id'])) {
                $statusText = $this->getStatusText($lot['ref_lot_status_id']);
                $message .= "📊 Статус: <i>{$statusText}</i>\n";
            }
            
            $message .= "\n";
        }

        if ($count > 5) {
            $message .= "➕ И еще <b>" . ($count - 5) . "</b> " . $this->pluralize($count - 5, 'лот', 'лота', 'лотов') . "...\n\n";
        }

        $message .= "🌐 <a href=\"" . config('app.url') . "/lots\">Посмотреть все лоты в TenderPlus</a>\n";
        $message .= "🔍 <a href=\"https://www.goszakup.gov.kz/ru/search/lots\">Поиск на Goszakup.gov.kz</a>";

        return $message;
    }

    /**
     * Генерировать ссылку на лот в системе Goszakup
     */
    private function generateGoszakupLotUrl(array $lot): string
    {
        // Правильная ссылка на лот по номеру объявления (более надежно)
        if (isset($lot['trd_buy_number_anno'])) {
            $announceNumber = trim($lot['trd_buy_number_anno']);
            return "https://www.goszakup.gov.kz/ru/announce/lots/{$announceNumber}";
        }
        
        // Альтернативная ссылка через ID лота
        if (isset($lot['id'])) {
            return "https://www.goszakup.gov.kz/ru/announce/view/{$lot['id']}";
        }
        
        // Fallback - общий поиск
        return "https://www.goszakup.gov.kz/ru/search/lots";
    }

    /**
     * Получить текстовое описание статуса
     */
    private function getStatusText(int $statusId): string
    {
        $statuses = [
            210 => 'Опубликован',
            220 => 'Прием заявок',
            230 => 'Рассмотрение заявок',
            240 => 'Определение поставщика',
            250 => 'Завершен',
            260 => 'Отменен',
        ];

        return $statuses[$statusId] ?? "Статус {$statusId}";
    }

    /**
     * Форматировать сумму
     */
    private function formatAmount(float $amount): string
    {
        if ($amount >= 1000000000) {
            return number_format($amount / 1000000000, 1, '.', ' ') . ' млрд';
        } elseif ($amount >= 1000000) {
            return number_format($amount / 1000000, 1, '.', ' ') . ' млн';
        } elseif ($amount >= 1000) {
            return number_format($amount / 1000, 0, '.', ' ') . ' тыс';
        }
        
        return number_format($amount, 0, ',', ' ');
    }

    /**
     * Форматировать дату
     */
    private function formatDate(string $date): string
    {
        try {
            $dateTime = new \DateTime($date);
            return $dateTime->format('d.m.Y H:i');
        } catch (\Exception $e) {
            return $date;
        }
    }

    /**
     * Обрезать текст
     */
    private function truncateText(string $text, int $length): string
    {
        if (mb_strlen($text) <= $length) {
            return $text;
        }
        
        return mb_substr($text, 0, $length) . '...';
    }

    /**
     * Склонение слов
     */
    private function pluralize(int $count, string $one, string $few, string $many): string
    {
        $mod10 = $count % 10;
        $mod100 = $count % 100;

        if ($mod100 >= 11 && $mod100 <= 19) {
            return $many;
        }

        if ($mod10 == 1) {
            return $one;
        }

        if ($mod10 >= 2 && $mod10 <= 4) {
            return $few;
        }

        return $many;
    }

    /**
     * Отправить тестовое уведомление всем активным пользователям
     */
    public function sendTestBroadcast(): array
    {
        $message = "🔔 <b>Тестовое уведомление</b>\n\n";
        $message .= "Это тестовое сообщение для проверки рассылки.\n\n";
        $message .= "Вы получаете это сообщение, потому что вы активный пользователь бота.\n\n";
        $message .= "Время отправки: " . now()->format('d.m.Y H:i:s') . "\n\n";
        $message .= "✅ Система уведомлений работает корректно!";

        $activeUsers = TelegramUser::active()->get();
        
        $results = [
            'total' => $activeUsers->count(),
            'success' => 0,
            'failed' => 0,
            'users' => [],
        ];

        foreach ($activeUsers as $user) {
            try {
                $sent = $this->sendMessage($message, ['chat_id' => $user->chat_id]);
                
                if ($sent) {
                    $results['success']++;
                    $results['users'][] = [
                        'chat_id' => $user->chat_id,
                        'name' => $user->display_name,
                        'status' => 'sent',
                    ];
                } else {
                    $results['failed']++;
                    $results['users'][] = [
                        'chat_id' => $user->chat_id,
                        'name' => $user->display_name,
                        'status' => 'failed',
                    ];
                }
                
                usleep(100000); // 0.1 секунды задержка
                
            } catch (\Exception $e) {
                $results['failed']++;
                $results['users'][] = [
                    'chat_id' => $user->chat_id,
                    'name' => $user->display_name,
                    'status' => 'error',
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }
}
