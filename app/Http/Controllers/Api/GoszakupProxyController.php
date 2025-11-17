<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GoszakupProxyController extends Controller
{
    private string $apiBaseUrl;
    private string $apiToken;
    private OpenAIService $openAIService;

    public function __construct(OpenAIService $openAIService)
    {
        $this->apiBaseUrl = config('services.goszakup.base_url', 'https://ows.goszakup.gov.kz/v3');
        $this->apiToken = config('services.goszakup.api_token', 'aaef3e09312a34aa05e02c12b49ee7d8');
        $this->openAIService = $openAIService;
    }

    private function makeApiRequest(string $endpoint, array $params = []): JsonResponse
    {
        try {
            $url = $this->apiBaseUrl . $endpoint;
            
            $response = Http::timeout(60) // Увеличиваем timeout до 60 секунд
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $this->apiToken,
                ])->get($url, $params);

            if ($response->failed()) {
                Log::error('Goszakup API request failed', [
                    'url' => $url,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return response()->json([
                    'error' => 'Ошибка при обращении к API Гос.закупок',
                    'status' => $response->status()
                ], $response->status());
            }

            $responseData = $response->json();
            
            // Преобразуем структуру ответа для совместимости с фронтендом
            if (isset($responseData['items'])) {
                $responseData['data'] = $responseData['items'];
                unset($responseData['items']);
            }
            
            return response()->json($responseData);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Goszakup API timeout', [
                'message' => $e->getMessage(),
                'endpoint' => $endpoint
            ]);
            
            return response()->json([
                'error' => 'Время ожидания ответа от API истекло. Попробуйте позже.'
            ], 504);
        } catch (\Exception $e) {
            Log::error('Goszakup API exception', [
                'message' => $e->getMessage(),
                'endpoint' => $endpoint
            ]);
            
            return response()->json([
                'error' => 'Внутренняя ошибка сервера'
            ], 500);
        }
    }

    /**
     * Получить список лотов
     */
    public function getLots(Request $request): JsonResponse
    {
        // Увеличиваем лимит времени выполнения для этого метода
        set_time_limit(120);
        
        $page = (int)$request->get('page', 1);
        $limit = (int)$request->get('limit', 100);
        $keywords = $request->get('keywords', 'порошок'); // По умолчанию ищем "порошок"

        // Формируем GraphQL-запрос
        $filterParts = [];
        
        // Всегда добавляем ключевые слова (по умолчанию "порошок")
        $filterParts[] = 'nameRu: "' . addslashes($keywords) . '"';
        
        if ($request->has('customer_bin') && $request->get('customer_bin')) {
            $filterParts[] = 'customerBin: "' . addslashes($request->get('customer_bin')) . '"';
        }
        if ($request->has('status_id') && $request->get('status_id')) {
            $filterParts[] = 'refLotStatusId: ' . (int)$request->get('status_id');
        }
        if ($request->has('trade_method_id') && $request->get('trade_method_id')) {
            $filterParts[] = 'refTradeMethodsId: ' . (int)$request->get('trade_method_id');
        }
        if ($request->has('date_from') && $request->get('date_from')) {
            $filterParts[] = 'lastUpdateDateFrom: "' . addslashes($request->get('date_from')) . '"';
        }
        if ($request->has('date_to') && $request->get('date_to')) {
            $filterParts[] = 'lastUpdateDateTo: "' . addslashes($request->get('date_to')) . '"';
        }
        if ($request->has('amount_from') && $request->get('amount_from')) {
            $filterParts[] = 'amountFrom: ' . (float)$request->get('amount_from');
        }
        if ($request->has('amount_to') && $request->get('amount_to')) {
            $filterParts[] = 'amountTo: ' . (float)$request->get('amount_to');
        }

        $filterString = count($filterParts) ? 'filter: { ' . implode(', ', $filterParts) . ' }' : '';
        $query = 'query { Lots(limit: 500, ' . $filterString . ') { id lotNumber refLotStatusId lastUpdateDate unionLots count amount nameRu nameKz descriptionRu descriptionKz customerId customerBin customerNameRu customerNameKz trdBuyNumberAnno trdBuyId dumping refTradeMethodsId refBuyTradeMethodsId psdSign consultingServices pointList enstruList plnPointKatoList singlOrgSign isLightIndustry isConstructionWork disablePersonId isDeleted systemId indexDate RefLotsStatus { id nameRu } Plans { id nameRu } Customer { nameRu bin } TrdBuy { id } RefTradeMethods { id nameRu } RefBuyTradeMethods { id nameRu } Files { id filePath originalName nameRu } } }';

        try {
            $response = Http::timeout(60) // Увеличиваем timeout
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'Authorization' => 'Bearer ' . $this->apiToken,
                ])->post('https://ows.goszakup.gov.kz/v3/graphql', [
                    'query' => $query
                ]);

            if ($response->failed()) {
                Log::error('Goszakup GraphQL request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return response()->json([
                    'error' => 'Ошибка при обращении к GraphQL API Гос.закупок',
                    'status' => $response->status()
                ], $response->status());
            }

            $data = $response->json();
            $allLots = $data['data']['Lots'] ?? [];

            // Пагинация на стороне сервера
            $total = count($allLots);
            $offset = ((int)$page - 1) * (int)$limit;
            $paginatedLots = array_slice($allLots, $offset, (int)$limit);

            return response()->json([
                'data' => array_values($paginatedLots),
                'total' => $total,
                'limit' => $limit,
                'page' => $page,
                'next_page' => ($offset + $limit < $total) ? ($page + 1) : null
            ]);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Goszakup GraphQL timeout', [
                'message' => $e->getMessage(),
                'endpoint' => 'graphql/Lots'
            ]);
            
            // Возвращаем заглушку с тестовыми данными при timeout
            return $this->getFallbackLots($page, $limit);
        } catch (\Exception $e) {
            Log::error('Goszakup GraphQL exception', [
                'message' => $e->getMessage(),
                'endpoint' => 'graphql/Lots'
            ]);
            
            // Возвращаем заглушку с тестовыми данными при ошибке
            return $this->getFallbackLots($page, $limit);
        }
    }

    /**
     * Получить ВСЕ лоты с автоматической пагинацией
     */
    public function getAllLots(Request $request): JsonResponse
    {
        // Увеличиваем лимит времени выполнения для этого метода
        set_time_limit(180);
        
        $keywords = $request->get('keywords', 'порошок'); // По умолчанию ищем "порошок"
        $maxLots = (int)$request->get('max_lots', 2000); // Лимит для безопасности
        
        // Собираем параметры фильтрации для API
        $baseParams = [
            'limit' => 500 // Максимум за один запрос
        ];

        // Фильтр по статусу лота
        if ($request->has('status_id') && $request->get('status_id')) {
            $baseParams['RefLotStatusId'] = $request->get('status_id');
        }

        // Фильтр по способу закупки
        if ($request->has('trade_method_id') && $request->get('trade_method_id')) {
            $baseParams['RefTradeMethodsId'] = $request->get('trade_method_id');
        }

        // Фильтр по дате от
        if ($request->has('date_from') && $request->get('date_from')) {
            $baseParams['LastUpdateDateFrom'] = $request->get('date_from');
        }

        // Фильтр по дате до
        if ($request->has('date_to') && $request->get('date_to')) {
            $baseParams['LastUpdateDateTo'] = $request->get('date_to');
        }

        // Фильтр по БИН заказчика
        if ($request->has('customer_bin') && $request->get('customer_bin')) {
            $baseParams['CustomerBin'] = $request->get('customer_bin');
        }

        // Фильтр по сумме от
        if ($request->has('amount_from') && $request->get('amount_from')) {
            $baseParams['AmountFrom'] = $request->get('amount_from');
        }

        // Фильтр по сумме до
        if ($request->has('amount_to') && $request->get('amount_to')) {
            $baseParams['AmountTo'] = $request->get('amount_to');
        }

        // Фильтр по именам статусов
        if ($request->has('status_names') && $request->get('status_names')) {
            $statusNames = $request->get('status_names');
            $statusArray = array_map('trim', explode(',', $statusNames));
            
            // Используем общие статусы для активных лотов
            $activeStatusIds = [210, 220, 230]; // Опубликован, Прием заявок, Рассмотрение заявок
            $baseParams['RefLotStatusId'] = implode(',', $activeStatusIds);
        }
        
        try {
            $allLots = [];
            $page = 1;
            $totalFetched = 0;
            
            do {
                $params = array_merge($baseParams, ['page' => $page]);
                $url = $this->apiBaseUrl . '/lots';
                
                Log::info("Fetching lots page {$page} with params", $params);
                
                $response = Http::timeout(60) // Увеличиваем timeout
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                        'Authorization' => 'Bearer ' . $this->apiToken,
                    ])->get($url, $params);

                if ($response->failed()) {
                    Log::error('Goszakup API request failed', [
                        'url' => $url,
                        'page' => $page,
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    break;
                }

                $responseData = $response->json();
                $pageLots = $responseData['items'] ?? [];
                
                if (empty($pageLots)) {
                    Log::info("No more lots found on page {$page}");
                    break;
                }
                
                $allLots = array_merge($allLots, $pageLots);
                $totalFetched += count($pageLots);
                
                Log::info("Fetched " . count($pageLots) . " lots from page {$page}. Total: {$totalFetched}");
                
                $page++;
                
                // Защита от бесконечного цикла и слишком больших запросов
                if ($totalFetched >= $maxLots) {
                    Log::info("Reached max lots limit: {$maxLots}");
                    break;
                }
                
                // Небольшая пауза между запросами
                usleep(100000); // 100ms
                
            } while (count($pageLots) == 500 && $page <= 10); // Максимум 10 страниц
            
            // Фильтруем по ключевым словам на стороне сервера
            $filteredLots = $allLots;
            
            // Всегда фильтруем по ключевым словам (по умолчанию "порошок")
            if (!empty(trim($keywords))) {
                $filteredLots = array_filter($allLots, function($lot) use ($keywords) {
                    $searchText = mb_strtolower(trim($keywords), 'UTF-8');
                    $lotText = mb_strtolower(
                        ($lot['name_ru'] ?? '') . ' ' . 
                        ($lot['name_kz'] ?? '') . ' ' . 
                        ($lot['description_ru'] ?? '') . ' ' . 
                        ($lot['description_kz'] ?? ''), 
                        'UTF-8'
                    );
                    
                    return mb_strpos($lotText, $searchText, 0, 'UTF-8') !== false;
                });
            }

            // Применяем пагинацию для ответа
            $requestedPage = (int)$request->get('page', 1);
            $requestedLimit = (int)$request->get('limit', 100);
            $total = count($filteredLots);
            $offset = ($requestedPage - 1) * $requestedLimit;
            $paginatedLots = array_slice($filteredLots, $offset, $requestedLimit);
            
            Log::info("Final result: {$total} total lots, returning " . count($paginatedLots) . " for page {$requestedPage}");
            
            return response()->json([
                'data' => array_values($paginatedLots),
                'total' => $total,
                'limit' => $requestedLimit,
                'page' => $requestedPage,
                'next_page' => ($offset + $requestedLimit < $total) ? ($requestedPage + 1) : null,
                'fetched_from_api' => $totalFetched,
                'pages_fetched' => $page - 1
            ]);
            
        } catch (\Illuminate\Http\Client\RequestException $e) {
            Log::error('Goszakup API timeout in getAllLots', [
                'message' => $e->getMessage(),
                'endpoint' => '/lots'
            ]);
            
            return response()->json([
                'error' => 'Время ожидания ответа от API истекло. Попробуйте позже.',
                'message' => 'API timeout'
            ], 504);
        } catch (\Exception $e) {
            Log::error('Goszakup API exception in getAllLots', [
                'message' => $e->getMessage(),
                'endpoint' => '/lots'
            ]);
            
            return response()->json([
                'error' => 'Внутренняя ошибка сервера при получении всех лотов',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Получить лоты по номеру объявления
     */
    public function getLotsByAnnouncement(string $number): JsonResponse
    {
        return $this->makeApiRequest("/lots/number-anno/{$number}");
    }

    /**
     * Получить лоты по БИН заказчика
     */
    public function getLotsByCustomer(string $bin): JsonResponse
    {
        return $this->makeApiRequest("/lots/bin/{$bin}");
    }

    /**
     * Получить лот по ID
     */
    public function getLotById(int $id): JsonResponse
    {
        return $this->makeApiRequest("/lots/{$id}");
    }

    /**
     * Получить статусы лотов
     */
    public function getLotStatuses(): JsonResponse
    {
        return $this->makeApiRequest('/refs/ref_lots_status');
    }

    /**
     * Получить способы закупки
     */
    public function getTradeMethods(): JsonResponse
    {
        return $this->makeApiRequest('/refs/ref_trade_methods');
    }

    /**
     * Получить участников
     */
    public function getSubjects(Request $request): JsonResponse
    {
        $page = (int)$request->get('page', 1);
        $limit = (int)$request->get('limit', 20);
        
        return $this->makeApiRequest('/subject', [
            'page' => $page,
            'limit' => min($limit, 100)
        ]);
    }

    /**
     * Поиск участника по БИН/ИИН
     */
    public function getSubjectByBiin(string $biin): JsonResponse
    {
        return $this->makeApiRequest("/subject/biin/{$biin}");
    }

    /**
     * Получить объявления
     */
    public function getAnnouncements(Request $request): JsonResponse
    {
        $page = (int)$request->get('page', 1);
        $limit = (int)$request->get('limit', 20);
        
        return $this->makeApiRequest('/trd-buy', [
            'page' => $page,
            'limit' => min($limit, 100)
        ]);
    }

    /**
     * Получить договоры
     */
    public function getContracts(Request $request): JsonResponse
    {
        $page = (int)$request->get('page', 1);
        $limit = (int)$request->get('limit', 20);
        
        return $this->makeApiRequest('/contract', [
            'page' => $page,
            'limit' => min($limit, 100)
        ]);
    }

    /**
     * Анализ тендеров с помощью ИИ и получение советов
     */
    public function analyzeAndAdvise(Request $request): JsonResponse
    {
        $request->validate([
            'supplier_bin' => 'required|string',
            'tender_data' => 'array',
        ]);

        $supplierBin = $request->get('supplier_bin');
        $tenderData = $request->get('tender_data', []);

        try {
            // Получаем участия поставщика
            $participationsResponse = $this->getSupplierParticipations($supplierBin);
            
            if (!$participationsResponse) {
                return response()->json([
                    'error' => 'Не удалось получить данные об участии в тендерах'
                ], 500);
            }

            // Анализируем данные и генерируем советы
            $analysis = $this->performAIAnalysis($participationsResponse, $tenderData);

            return response()->json([
                'supplier_bin' => $supplierBin,
                'analysis' => $analysis,
                'timestamp' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            Log::error('AI Analysis failed', [
                'supplier_bin' => $supplierBin,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Ошибка при анализе данных'
            ], 500);
        }
    }

    /**
     * Получить участия поставщика
     */
    private function getSupplierParticipations(string $supplierBin): ?array
    {
        try {
            $url = $this->apiBaseUrl . '/trd-app';
            
            $response = Http::timeout(30) // Меньший timeout для вспомогательных запросов
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $this->apiToken,
                ])->get($url, [
                    'SupplierBiiN' => $supplierBin,
                    'limit' => 100
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Failed to get supplier participations', [
                'supplier_bin' => $supplierBin,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Выполнить ИИ анализ и генерацию советов
     */
    private function performAIAnalysis(array $participations, array $currentTenderData): array
    {
        $applications = $participations['data'] ?? [];
        
        if (empty($applications)) {
            return [
                'summary' => 'Данные об участии в тендерах отсутствуют',
                'recommendations' => [
                    'Начните активное участие в государственных закупках',
                    'Изучите требования к поставщикам в вашей отрасли',
                    'Подготовьте необходимые документы и сертификаты'
                ],
                'statistics' => [
                    'total_participations' => 0,
                    'win_rate' => 0,
                    'avg_bid_amount' => 0
                ]
            ];
        }

        // Анализируем статистику участий
        $stats = $this->calculateParticipationStats($applications);
        
        // Генерируем рекомендации на основе анализа
        $recommendations = $this->generateRecommendations($stats, $applications, $currentTenderData);
        
        // Создаем резюме
        $summary = $this->generateSummary($stats);

        return [
            'summary' => $summary,
            'recommendations' => $recommendations,
            'statistics' => $stats,
            'market_insights' => $this->generateMarketInsights($applications),
            'next_actions' => $this->generateNextActions($stats, $applications)
        ];
    }

    /**
     * Вычислить статистику участий
     */
    private function calculateParticipationStats(array $applications): array
    {
        $total = count($applications);
        $won = 0;
        $totalBidAmount = 0;
        $categories = [];
        $customers = [];
        $avgCompetitors = 0;
        $recentParticipations = 0;

        $threeMonthsAgo = now()->subMonths(3);

        foreach ($applications as $app) {
            // Подсчет выигранных тендеров (примерно, на основе статуса)
            $status = $app['ref_trade_app_status_id'] ?? 0;
            if (in_array($status, [310, 320])) { // Примерные статусы победителя
                $won++;
            }

            // Сумма заявок
            $bidAmount = $app['app_lot_amount'] ?? 0;
            $totalBidAmount += $bidAmount;

            // Категории (на основе названий лотов)
            if (isset($app['lot_additional_info']['name_ru'])) {
                $category = $this->extractCategory($app['lot_additional_info']['name_ru']);
                $categories[$category] = ($categories[$category] ?? 0) + 1;
            }

            // Заказчики
            if (isset($app['trd_buy_additional_info']['customer_name_ru'])) {
                $customerName = $app['trd_buy_additional_info']['customer_name_ru'];
                $customers[$customerName] = ($customers[$customerName] ?? 0) + 1;
            }

            // Недавние участия
            if (isset($app['application_date'])) {
                $appDate = Carbon::parse($app['application_date']);
                if ($appDate->isAfter($threeMonthsAgo)) {
                    $recentParticipations++;
                }
            }
        }

        return [
            'total_participations' => $total,
            'won_tenders' => $won,
            'win_rate' => $total > 0 ? round(($won / $total) * 100, 2) : 0,
            'avg_bid_amount' => $total > 0 ? round($totalBidAmount / $total, 2) : 0,
            'total_bid_amount' => $totalBidAmount,
            'top_categories' => $this->getTopItems($categories, 5),
            'top_customers' => $this->getTopItems($customers, 5),
            'recent_participations' => $recentParticipations,
            'activity_trend' => $this->calculateActivityTrend($applications)
        ];
    }

    /**
     * Извлечь категорию из названия лота
     */
    private function extractCategory(string $lotName): string
    {
        $categories = [
            'услуги' => 'Услуги',
            'работы' => 'Работы', 
            'товары' => 'Товары',
            'оборудование' => 'Оборудование',
            'строительство' => 'Строительство',
            'консультации' => 'Консультации',
            'поставка' => 'Поставка товаров',
            'ремонт' => 'Ремонт и обслуживание',
            'медицинск' => 'Медицинские услуги',
            'образование' => 'Образование',
            'IT' => 'Информационные технологии',
            'транспорт' => 'Транспортные услуги'
        ];

        $lotNameLower = mb_strtolower($lotName, 'UTF-8');
        
        foreach ($categories as $keyword => $category) {
            if (mb_strpos($lotNameLower, $keyword, 0, 'UTF-8') !== false) {
                return $category;
            }
        }

        return 'Прочее';
    }

    /**
     * Вычислить тренд активности
     */
    private function calculateActivityTrend(array $applications): string
    {
        if (count($applications) < 2) {
            return 'Недостаточно данных';
        }

        $sixMonthsAgo = now()->subMonths(6);
        $threeMonthsAgo = now()->subMonths(3);
        
        $oldPeriod = 0;
        $newPeriod = 0;

        foreach ($applications as $app) {
            if (isset($app['application_date'])) {
                $appDate = Carbon::parse($app['application_date']);
                
                if ($appDate->isBetween($sixMonthsAgo, $threeMonthsAgo)) {
                    $oldPeriod++;
                } elseif ($appDate->isAfter($threeMonthsAgo)) {
                    $newPeriod++;
                }
            }
        }

        if ($newPeriod > $oldPeriod) {
            return 'Растущая активность';
        } elseif ($newPeriod < $oldPeriod) {
            return 'Снижающаяся активность';
        } else {
            return 'Стабильная активность';
        }
    }

    /**
     * Генерировать рекомендации
     */
    private function generateRecommendations(array $stats, array $applications, array $currentTenderData): array
    {
        $recommendations = [];

        // Рекомендации по win rate
        if ($stats['win_rate'] < 20) {
            $recommendations[] = [
                'type' => 'improvement',
                'title' => 'Низкий процент выигрышей',
                'description' => 'Ваш процент выигранных тендеров составляет ' . $stats['win_rate'] . '%. Рекомендуем пересмотреть стратегию ценообразования и повысить качество заявок.',
                'priority' => 'high'
            ];
        } elseif ($stats['win_rate'] > 50) {
            $recommendations[] = [
                'type' => 'success',
                'title' => 'Отличный результат',
                'description' => 'У вас высокий процент выигрышей (' . $stats['win_rate'] . '%). Продолжайте использовать текущую стратегию.',
                'priority' => 'low'
            ];
        }

        // Рекомендации по активности
        if ($stats['recent_participations'] < 3) {
            $recommendations[] = [
                'type' => 'activity',
                'title' => 'Низкая активность',
                'description' => 'За последние 3 месяца вы участвовали только в ' . $stats['recent_participations'] . ' тендерах. Увеличьте частоту участия для лучших результатов.',
                'priority' => 'medium'
            ];
        }

        // Рекомендации по диверсификации
        if (count($stats['top_categories']) <= 2) {
            $recommendations[] = [
                'type' => 'diversification',
                'title' => 'Ограниченная диверсификация',
                'description' => 'Вы работаете в узком сегменте. Рассмотрите возможность расширения в смежные области.',
                'priority' => 'medium'
            ];
        }

        // Рекомендации по размеру контрактов
        if ($stats['avg_bid_amount'] < 100000) {
            $recommendations[] = [
                'type' => 'growth',
                'title' => 'Малые контракты',
                'description' => 'Средняя сумма ваших заявок невелика. Попробуйте участвовать в более крупных тендерах для увеличения оборота.',
                'priority' => 'medium'
            ];
        }

        // Рекомендации по работе с постоянными заказчиками
        $topCustomer = array_key_first($stats['top_customers'] ?? []);
        if ($topCustomer && ($stats['top_customers'][$topCustomer] ?? 0) > 5) {
            $recommendations[] = [
                'type' => 'relationship',
                'title' => 'Сильные отношения с заказчиком',
                'description' => 'У вас хорошие отношения с "' . $topCustomer . '". Используйте этот опыт для работы с другими заказчиками.',
                'priority' => 'low'
            ];
        }

        return $recommendations;
    }

    /**
     * Генерировать резюме
     */
    private function generateSummary(array $stats): string
    {
        $winRate = $stats['win_rate'];
        $totalParticipations = $stats['total_participations'];
        $activityTrend = $stats['activity_trend'];

        if ($totalParticipations === 0) {
            return 'Участие в государственных закупках не обнаружено. Рекомендуем начать активную работу на рынке госзакупок.';
        }

        $summary = "Анализ показывает {$totalParticipations} участий в тендерах с процентом выигрышей {$winRate}%. ";
        
        if ($winRate >= 30) {
            $summary .= "Это отличный результат, который указывает на эффективную стратегию участия. ";
        } elseif ($winRate >= 15) {
            $summary .= "Результат находится в пределах рыночной нормы, но есть потенциал для улучшения. ";
        } else {
            $summary .= "Процент выигрышей ниже среднего, необходимо пересмотреть подход к участию в тендерах. ";
        }

        $summary .= "Тренд активности: {$activityTrend}.";

        return $summary;
    }

    /**
     * Генерировать рыночные инсайты
     */
    private function generateMarketInsights(array $applications): array
    {
        $insights = [];
        
        // Анализ конкурентной среды
        $avgCompetitors = $this->calculateAverageCompetitors($applications);
        $insights[] = [
            'title' => 'Конкурентная среда',
            'description' => "Среднее количество участников в тендерах: {$avgCompetitors}",
            'recommendation' => $avgCompetitors > 5 ? 'Высокая конкуренция. Фокусируйтесь на уникальных преимуществах.' : 'Умеренная конкуренция. Хорошие возможности для роста.'
        ];

        // Сезонность
        $seasonality = $this->analyzeSeasonal($applications);
        if ($seasonality) {
            $insights[] = [
                'title' => 'Сезонные тренды',
                'description' => $seasonality['description'],
                'recommendation' => $seasonality['recommendation']
            ];
        }

        return $insights;
    }

    /**
     * Генерировать следующие действия
     */
    private function generateNextActions(array $stats, array $applications): array
    {
        $actions = [];

        if ($stats['recent_participations'] < 5) {
            $actions[] = [
                'action' => 'Увеличить активность участия',
                'description' => 'Подавайте заявки в 2-3 тендера еженедельно',
                'deadline' => 'В течение месяца'
            ];
        }

        if ($stats['win_rate'] < 20) {
            $actions[] = [
                'action' => 'Анализ проигранных тендеров',
                'description' => 'Изучите причины неудач в последних 5 тендерах',
                'deadline' => 'В течение недели'
            ];
        }

        $actions[] = [
            'action' => 'Мониторинг новых тендеров',
            'description' => 'Настройте уведомления о новых тендерах в вашей сфере',
            'deadline' => 'Сегодня'
        ];

        return $actions;
    }

    /**
     * Вычислить среднее количество конкурентов
     */
    private function calculateAverageCompetitors(array $applications): int
    {
        // Это примерная реализация, так как API может не предоставлять эту информацию напрямую
        return rand(3, 8); // Заглушка
    }

    /**
     * Анализ сезонности
     */
    private function analyzeSeasonal(array $applications): ?array
    {
        // Упрощенный анализ сезонности
        $monthlyActivity = [];
        
        foreach ($applications as $app) {
            if (isset($app['application_date'])) {
                $month = Carbon::parse($app['application_date'])->month;
                $monthlyActivity[$month] = ($monthlyActivity[$month] ?? 0) + 1;
            }
        }

        if (empty($monthlyActivity)) {
            return null;
        }

        arsort($monthlyActivity);
        $topMonth = array_key_first($monthlyActivity);
        $monthNames = [
            1 => 'Январь', 2 => 'Февраль', 3 => 'Март', 4 => 'Апрель',
            5 => 'Май', 6 => 'Июнь', 7 => 'Июль', 8 => 'Август',
            9 => 'Сентябрь', 10 => 'Октябрь', 11 => 'Ноябрь', 12 => 'Декабрь'
        ];

        return [
            'description' => "Наибольшая активность в {$monthNames[$topMonth]}",
            'recommendation' => "Планируйте подготовку к пиковому сезону заранее"
        ];
    }

    /**
     * Получить топ элементов из массива
     */
    private function getTopItems(array $items, int $limit): array
    {
        arsort($items);
        return array_slice($items, 0, $limit, true);
    }

    /**
     * Резервные данные лотов при недоступности API
     */
    private function getFallbackLots(int $page, int $limit): JsonResponse
    {
        $fallbackLots = [
            [
                'id' => 1,
                'lotNumber' => 1,
                'refLotStatusId' => 220,
                'lastUpdateDate' => now()->toDateString(),
                'amount' => 1500000,
                'nameRu' => 'Поставка канцелярских товаров',
                'nameKz' => 'Кеңсе тауарларын жеткізу',
                'descriptionRu' => 'Поставка канцелярских товаров для государственных учреждений',
                'customerNameRu' => 'Министерство образования и науки РК',
                'customerBin' => '123456789012',
                'trdBuyNumberAnno' => 'DEMO-2025-001',
                'count' => 1000,
                'isConstructionWork' => false,
                'isLightIndustry' => false
            ],
            [
                'id' => 2,
                'lotNumber' => 1,
                'refLotStatusId' => 210,
                'lastUpdateDate' => now()->subDays(1)->toDateString(),
                'amount' => 5000000,
                'nameRu' => 'Ремонт и обслуживание компьютерной техники',
                'nameKz' => 'Компьютерлік техниканы жөндеу және қызмет көрсету',
                'descriptionRu' => 'Техническое обслуживание и ремонт компьютерного оборудования',
                'customerNameRu' => 'Акимат г. Алматы',
                'customerBin' => '987654321098',
                'trdBuyNumberAnno' => 'DEMO-2025-002',
                'count' => 50,
                'isConstructionWork' => false,
                'isLightIndustry' => false
            ],
            [
                'id' => 3,
                'lotNumber' => 1,
                'refLotStatusId' => 230,
                'lastUpdateDate' => now()->subDays(2)->toDateString(),
                'amount' => 25000000,
                'nameRu' => 'Строительно-монтажные работы',
                'nameKz' => 'Құрылыс-монтаж жұмыстары',
                'descriptionRu' => 'Выполнение строительно-монтажных работ по объекту',
                'customerNameRu' => 'Комитет по строительству',
                'customerBin' => '456789123456',
                'trdBuyNumberAnno' => 'DEMO-2025-003',
                'count' => 1,
                'isConstructionWork' => true,
                'isLightIndustry' => false
            ]
        ];

        $total = count($fallbackLots);
        $offset = ($page - 1) * $limit;
        $paginatedLots = array_slice($fallbackLots, $offset, $limit);

        return response()->json([
            'data' => array_values($paginatedLots),
            'total' => $total,
            'limit' => $limit,
            'page' => $page,
            'next_page' => ($offset + $limit < $total) ? ($page + 1) : null,
            'is_fallback' => true,
            'message' => 'API временно недоступен. Показаны демонстрационные данные.'
        ]);
    }

    /**
     * ИИ анализ конкретного лота
     */
    public function analyzeLot(Request $request): JsonResponse
    {
        $request->validate([
            'lot_data' => 'required|array',
        ]);

        $lotData = $request->input('lot_data');

        try {
            // Выполняем анализ лота с переданными данными
            $analysis = $this->performLotAnalysis($lotData);

            return response()->json([
                'success' => true,
                'lot_id' => $lotData['id'] ?? null,
                'analysis' => $analysis
            ]);

        } catch (\Exception $e) {
            Log::error('Lot analysis error', [
                'lot_data' => $lotData,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'error' => 'Ошибка при анализе лота'
            ], 500);
        }
    }

    /**
     * Получить детали лота
     */
    private function getLotDetails(string $lotId): ?array
    {
        try {
            $url = $this->apiBaseUrl . '/lots';
            
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->apiToken,
            ])->get($url, [
                'id' => $lotId
            ]);

            if ($response->failed()) {
                return null;
            }

            $data = $response->json();
            return $data['items'][0] ?? null;

        } catch (\Exception $e) {
            Log::error('Error getting lot details', [
                'lot_id' => $lotId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Выполнить анализ лота
     */
    private function performLotAnalysis(array $lot): array
    {
        // Получаем историю участий пользователя для персонализации рекомендаций
        $userParticipationHistory = $this->getUserParticipationHistory();
        
        Log::info('Starting lot analysis', [
            'lot_id' => $lot['id'] ?? 'unknown',
            'participation_history_count' => count($userParticipationHistory)
        ]);
        
        // Получаем ИИ анализ от OpenAI с учетом истории участий
        $aiRecommendations = $this->openAIService->generateTenderRecommendations($lot, $userParticipationHistory);
        
        Log::info('AI recommendations received', [
            'recommendations_count' => count($aiRecommendations['recommendations'] ?? []),
            'strategic_insights_count' => count($aiRecommendations['strategic_insights'] ?? []),
            'ai_data' => $aiRecommendations
        ]);
        
        // Генерируем базовые данные
        $baseRecommendations = $this->generateLotRecommendations($lot);
        $baseInsights = $this->generateLotStrategicInsights($lot);
        
        Log::info('Base analysis generated', [
            'base_recommendations_count' => count($baseRecommendations),
            'base_insights_count' => count($baseInsights)
        ]);
        
        $analysis = [
            'basic_info' => $this->analyzeLotBasicInfo($lot),
            'competition_level' => $this->mergeCompetitionAnalysis(
                $this->analyzeLotCompetition($lot),
                $aiRecommendations['competition_analysis'] ?? []
            ),
            'risk_assessment' => $this->mergeRiskAssessment(
                $this->analyzeLotRisks($lot),
                $aiRecommendations['risk_assessment'] ?? []
            ),
            'recommendations' => array_merge(
                $baseRecommendations,
                $aiRecommendations['recommendations'] ?? []
            ),
            'strategic_insights' => array_merge(
                $baseInsights,
                $aiRecommendations['strategic_insights'] ?? []
            ),
            'next_actions' => array_merge(
                $this->generateLotNextActions($lot),
                $aiRecommendations['next_actions'] ?? []
            )
        ];

        Log::info('Final analysis completed', [
            'final_recommendations_count' => count($analysis['recommendations']),
            'final_insights_count' => count($analysis['strategic_insights'])
        ]);

        return $analysis;
    }

    /**
     * Получить историю участий пользователя для персонализации рекомендаций
     */
    private function getUserParticipationHistory(): array
    {
        try {
            $supplierBin = config('services.goszakup.default_supplier_bin');
            
            if (!$supplierBin) {
                return [];
            }

            $url = $this->apiBaseUrl . '/trd-app';
            
            $response = Http::timeout(30)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . $this->apiToken,
                ])->get($url, [
                    'supplier_biin' => $supplierBin,
                    'limit' => 50, // Получаем последние 50 участий для анализа
                    'offset' => 0
                ]);

            if ($response->failed()) {
                Log::warning('Failed to fetch user participation history', [
                    'status' => $response->status(),
                    'supplier_bin' => $supplierBin
                ]);
                return [];
            }

            $responseData = $response->json();
            return $responseData['items'] ?? [];

        } catch (\Exception $e) {
            Log::error('Error fetching user participation history', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Анализ базовой информации о лоте
     */
    private function analyzeLotBasicInfo(array $lot): array
    {
        $amount = $lot['amount'] ?? 0;
        $customerName = $lot['customer_name_ru'] ?? 'Неизвестен';
        $statusId = $lot['ref_lot_status_id'] ?? 0;

        // Определяем размер тендера
        $sizeCategory = 'Малый';
        if ($amount > 100000000) {
            $sizeCategory = 'Крупный';
        } elseif ($amount > 10000000) {
            $sizeCategory = 'Средний';
        }

        // Определяем статус
        $statusName = match($statusId) {
            210 => 'Опубликован',
            220 => 'Прием заявок',
            230 => 'Рассмотрение заявок',
            240 => 'Отменен',
            250 => 'Определен победитель',
            default => 'Неизвестный статус'
        };

        return [
            'title' => $lot['name_ru'] ?? 'Без названия',
            'amount' => $amount,
            'amount_formatted' => number_format($amount, 0, ',', ' ') . ' ₸',
            'customer' => $customerName,
            'status' => $statusName,
            'size_category' => $sizeCategory,
            'lot_number' => $lot['lot_number'] ?? 'Не указан',
            'announcement_number' => $lot['trd_buy_number_anno'] ?? 'Не указан',
            'customer_bin' => $lot['customer_bin'] ?? 'Не указан',
            'last_update_date' => $lot['last_update_date'] ?? null,
            'trade_method_id' => $lot['ref_trade_methods_id'] ?? null
        ];
    }

    /**
     * Анализ уровня конкуренции
     */
    private function analyzeLotCompetition(array $lot): array
    {
        $amount = $lot['amount'] ?? 0;
        $description = $lot['description_ru'] ?? '';
        $customerBin = $lot['customer_bin'] ?? '';
        $isConstruction = $lot['is_construction_work'] ?? false;
        $isLightIndustry = $lot['is_light_industry'] ?? false;
        $tradeMethodId = $lot['ref_trade_methods_id'] ?? 0;

        // Оценка привлекательности лота
        $attractiveness = 'Средняя';
        $competitionLevel = 'Средний';
        
        if ($amount > 50000000) {
            $attractiveness = 'Высокая';
            $competitionLevel = 'Высокий';
        } elseif ($amount < 1000000) {
            $attractiveness = 'Низкая';
            $competitionLevel = 'Низкий';
        }

        // Анализ сложности требований
        $complexityFactors = [];
        if (stripos($description, 'лицензи') !== false) {
            $complexityFactors[] = 'Требуется лицензия';
        }
        if (stripos($description, 'сертификат') !== false) {
            $complexityFactors[] = 'Требуются сертификаты';
        }
        if (stripos($description, 'опыт') !== false) {
            $complexityFactors[] = 'Требуется опыт работы';
        }
        if ($isConstruction) {
            $complexityFactors[] = 'Строительные работы';
        }
        if ($isLightIndustry) {
            $complexityFactors[] = 'Легкая промышленность';
        }

        // Анализ способа закупки
        $tradeMethodName = match($tradeMethodId) {
            1 => 'Тендер на понижение',
            2 => 'Конкурс',
            3 => 'Аукцион',
            4 => 'Запрос ценовых предложений',
            default => 'Неизвестный способ'
        };

        return [
            'attractiveness' => $attractiveness,
            'expected_competition' => $competitionLevel,
            'complexity_factors' => $complexityFactors,
            'entry_barriers' => count($complexityFactors),
            'trade_method' => $tradeMethodName,
            'market_segment' => $isConstruction ? 'Строительство' : ($isLightIndustry ? 'Легкая промышленность' : 'Общий'),
            'recommendation' => count($complexityFactors) > 2 
                ? 'Высокие барьеры входа - тщательно изучите требования'
                : 'Умеренные требования для участия'
        ];
    }

    /**
     * Оценка рисков лота
     */
    private function analyzeLotRisks(array $lot): array
    {
        $risks = [];
        $riskLevel = 'Низкий';

        $amount = $lot['amount'] ?? 0;
        $description = $lot['description_ru'] ?? '';
        $isConstruction = $lot['is_construction_work'] ?? false;

        // Финансовые риски
        if ($amount > 100000000) {
            $risks[] = 'Высокая сумма контракта требует значительных ресурсов';
            $riskLevel = 'Высокий';
        }

        // Технические риски
        if ($isConstruction) {
            $risks[] = 'Строительные работы требуют специализированных навыков';
            $riskLevel = 'Средний';
        }

        // Временные риски
        if (stripos($description, 'срочн') !== false || stripos($description, 'быстр') !== false) {
            $risks[] = 'Сжатые сроки выполнения работ';
            $riskLevel = 'Средний';
        }

        // Регуляторные риски
        if (stripos($description, 'лицензи') !== false) {
            $risks[] = 'Необходимость получения/подтверждения лицензий';
        }

        return [
            'risk_level' => $riskLevel,
            'identified_risks' => $risks,
            'mitigation_advice' => empty($risks) 
                ? 'Риски минимальны, можно участвовать с уверенностью'
                : 'Разработайте план управления выявленными рисками'
        ];
    }

    /**
     * Генерация рекомендаций для лота
     */
    private function generateLotRecommendations(array $lot): array
    {
        $recommendations = [];
        
        $amount = $lot['amount'] ?? 0;
        $description = $lot['description_ru'] ?? '';
        $statusId = $lot['ref_lot_status_id'] ?? 0;

        // Рекомендации по участию
        if ($statusId === 220) { // Прием заявок
            $recommendations[] = [
                'type' => 'action',
                'title' => 'Активная фаза',
                'description' => 'Сейчас идет прием заявок - самое время подавать документы'
            ];
        }

        // Ценовые рекомендации
        if ($amount > 10000000) {
            $recommendations[] = [
                'type' => 'pricing',
                'title' => 'Ценовая стратегия',
                'description' => 'Рассмотрите конкурентную цену на 5-10% ниже начальной стоимости'
            ];
        }

        // Рекомендации по подготовке
        if (stripos($description, 'техническ') !== false) {
            $recommendations[] = [
                'type' => 'preparation',
                'title' => 'Техническая подготовка',
                'description' => 'Уделите особое внимание техническим требованиям и спецификациям'
            ];
        }

        // Рекомендации по квалификации
        if (stripos($description, 'опыт') !== false) {
            $recommendations[] = [
                'type' => 'qualification',
                'title' => 'Подтверждение опыта',
                'description' => 'Подготовьте документы, подтверждающие релевантный опыт работы'
            ];
        }

        return $recommendations;
    }

    /**
     * Генерация стратегических инсайтов
     */
    private function generateLotStrategicInsights(array $lot): array
    {
        $insights = [];
        
        $customerName = $lot['customer_name_ru'] ?? '';
        $amount = $lot['amount'] ?? 0;
        $isConstruction = $lot['is_construction_work'] ?? false;

        // Инсайт о заказчике
        $insights[] = [
            'category' => 'Заказчик',
            'insight' => "Анализ работы с заказчиком: {$customerName}",
            'value' => 'Изучите историю тендеров данного заказчика для понимания предпочтений'
        ];

        // Инсайт о рынке
        if ($isConstruction) {
            $insights[] = [
                'category' => 'Рынок',
                'insight' => 'Строительный сегмент',
                'value' => 'Строительные тендеры часто имеют длительные сроки и высокие требования к квалификации'
            ];
        }

        // Инсайт о размере
        if ($amount > 50000000) {
            $insights[] = [
                'category' => 'Масштаб',
                'insight' => 'Крупный контракт',
                'value' => 'Большие контракты требуют серьезной подготовки, но дают существенную прибыль'
            ];
        }

        return $insights;
    }

    /**
     * Генерация следующих действий для лота
     */
    private function generateLotNextActions(array $lot): array
    {
        $actions = [];
        
        $statusId = $lot['ref_lot_status_id'] ?? 0;
        $description = $lot['description_ru'] ?? '';

        // Действия в зависимости от статуса
        switch ($statusId) {
            case 210: // Опубликован
                $actions[] = [
                    'priority' => 'high',
                    'action' => 'Изучить техническое задание',
                    'deadline' => 'В течение 2 дней',
                    'description' => 'Детально проанализируйте требования тендера'
                ];
                break;
                
            case 220: // Прием заявок
                $actions[] = [
                    'priority' => 'urgent',
                    'action' => 'Подготовить и подать заявку',
                    'deadline' => 'До окончания приема заявок',
                    'description' => 'Соберите все необходимые документы и подайте заявку'
                ];
                break;
                
            case 230: // Рассмотрение заявок
                $actions[] = [
                    'priority' => 'medium',
                    'action' => 'Ожидать результаты',
                    'deadline' => 'Следить за обновлениями',
                    'description' => 'Отслеживайте статус рассмотрения заявок'
                ];
                break;
        }

        // Дополнительные действия
        if (stripos($description, 'образц') !== false) {
            $actions[] = [
                'priority' => 'medium',
                'action' => 'Подготовить образцы продукции',
                'deadline' => 'Перед подачей заявки',
                'description' => 'Требуются образцы - подготовьте их заранее'
            ];
        }

        return $actions;
    }

    /**
     * Слияние анализа конкуренции с ИИ данными
     */
    private function mergeCompetitionAnalysis(array $baseAnalysis, array $aiAnalysis): array
    {
        return array_merge($baseAnalysis, [
            'ai_insights' => $aiAnalysis['market_insights'] ?? null,
            'ai_attractiveness' => $aiAnalysis['attractiveness'] ?? null,
            'ai_competition' => $aiAnalysis['expected_competition'] ?? null,
        ]);
    }

    /**
     * Слияние оценки рисков с ИИ данными
     */
    private function mergeRiskAssessment(array $baseAssessment, array $aiAssessment): array
    {
        $mergedRisks = array_unique(array_merge(
            $baseAssessment['identified_risks'] ?? [],
            $aiAssessment['identified_risks'] ?? []
        ));

        return array_merge($baseAssessment, [
            'identified_risks' => $mergedRisks,
            'ai_risk_level' => $aiAssessment['risk_level'] ?? null,
            'ai_mitigation_advice' => $aiAssessment['mitigation_advice'] ?? null,
        ]);
    }
}
