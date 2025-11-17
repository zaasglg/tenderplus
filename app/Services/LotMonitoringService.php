<?php

namespace App\Services;

use App\Http\Controllers\Api\GoszakupProxyController;
use App\Services\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class LotMonitoringService
{
    private TelegramService $telegramService;
    private GoszakupProxyController $goszakupController;

    public function __construct(TelegramService $telegramService, OpenAIService $openAIService)
    {
        $this->telegramService = $telegramService;
        $this->goszakupController = new GoszakupProxyController($openAIService);
    }

    /**
     * Проверить новые лоты "для меня"
     */
    public function checkNewLotsForMe(): void
    {
        try {
            Log::info('Starting lot monitoring check');

            // Создаем запрос с фильтрами "Лоты для меня" 
            // Ищем релевантные лоты по нескольким ключевым словам
            $request = new Request([
                'keywords' => 'программное обеспечение,разработка,ПО,софт,автоматизация,IT,система,информационная,техническое,консультационные,услуги,обслуживание',
                'status_names' => 'опубликован,прием заявок,рассмотрение заявок',
                'amount_from' => 500000, // Минимум 500к тенге
                'max_lots' => 1500, // Получаем больше лотов для мониторинга
                'limit' => 50, // Ограничиваем результат для уведомлений
                'page' => 1
            ]);

            // Получаем ВСЕ лоты через новый контроллер
            $response = $this->goszakupController->getAllLots($request);
            $responseData = $response->getData(true);

            if (!isset($responseData['data']) || !is_array($responseData['data'])) {
                Log::warning('No data received from Goszakup API');
                return;
            }

            $currentLots = $responseData['data'];
            
            // Обогащаем данные лотов дополнительной информацией
            $enrichedLots = $this->enrichLotsData($currentLots);
            
            // Получаем ID ранее отправленных лотов из кеша
            $sentLotIds = Cache::get('sent_lot_ids', []);
            
            // Фильтруем только новые лоты
            $newLots = array_filter($enrichedLots, function($lot) use ($sentLotIds) {
                return !in_array($lot['id'], $sentLotIds);
            });

            if (!empty($newLots)) {
                Log::info('Found ' . count($newLots) . ' new lots');
                
                // Сортируем лоты по сумме (сначала крупные)
                usort($newLots, function($a, $b) {
                    return $b['amount'] <=> $a['amount'];
                });
                
                // Отправляем уведомление
                $sent = $this->telegramService->sendNewLotsNotification($newLots);
                
                if ($sent) {
                    // Сохраняем ID отправленных лотов в кеш на 24 часа
                    $newLotIds = array_column($newLots, 'id');
                    $allSentIds = array_merge($sentLotIds, $newLotIds);
                    
                    // Ограничиваем размер кеша (храним только последние 1000 ID)
                    if (count($allSentIds) > 1000) {
                        $allSentIds = array_slice($allSentIds, -1000);
                    }
                    
                    Cache::put('sent_lot_ids', $allSentIds, now()->addHours(24));
                    Log::info('Notification sent and cache updated');
                    
                    // Сохраняем статистику
                    $this->saveNotificationStats(count($newLots));
                }
            } else {
                Log::info('No new lots found');
            }

        } catch (\Exception $e) {
            Log::error('Lot monitoring error: ' . $e->getMessage());
            
            // Отправляем уведомление об ошибке админу
            $this->telegramService->sendMessage(
                "⚠️ <b>Ошибка мониторинга лотов</b>\n\n" .
                "Время: " . now()->format('d.m.Y H:i:s') . "\n" .
                "Ошибка: " . $e->getMessage()
            );
        }
    }

    /**
     * Обогащение данных лотов дополнительной информацией
     */
    private function enrichLotsData(array $lots): array
    {
        return array_map(function($lot) {
            // Добавляем вычисляемые поля
            $lot['amount_formatted'] = $this->formatAmount($lot['amount'] ?? 0);
            $lot['is_large_purchase'] = ($lot['amount'] ?? 0) > 10000000; // Больше 10 млн
            $lot['days_since_update'] = $this->getDaysSinceUpdate($lot['last_update_date'] ?? null);
            
            return $lot;
        }, $lots);
    }

    /**
     * Форматировать сумму
     */
    private function formatAmount(float $amount): string
    {
        if ($amount >= 1000000000) {
            return number_format($amount / 1000000000, 1, '.', ' ') . ' млрд ₸';
        } elseif ($amount >= 1000000) {
            return number_format($amount / 1000000, 1, '.', ' ') . ' млн ₸';
        } elseif ($amount >= 1000) {
            return number_format($amount / 1000, 0, '.', ' ') . ' тыс ₸';
        }
        
        return number_format($amount, 0, ',', ' ') . ' ₸';
    }

    /**
     * Получить количество дней с последнего обновления
     */
    private function getDaysSinceUpdate(?string $date): int
    {
        if (!$date) {
            return 0;
        }

        try {
            $updateDate = new \DateTime($date);
            $now = new \DateTime();
            $diff = $now->diff($updateDate);
            return $diff->days;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Сохранить статистику уведомлений
     */
    private function saveNotificationStats(int $lotsCount): void
    {
        $today = now()->format('Y-m-d');
        $stats = Cache::get('notification_stats', []);
        
        if (!isset($stats[$today])) {
            $stats[$today] = ['count' => 0, 'lots' => 0];
        }
        
        $stats[$today]['count']++;
        $stats[$today]['lots'] += $lotsCount;
        
        // Храним статистику за последние 30 дней
        $stats = array_slice($stats, -30, null, true);
        
        Cache::put('notification_stats', $stats, now()->addDays(30));
    }
}
