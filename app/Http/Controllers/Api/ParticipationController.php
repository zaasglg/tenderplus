<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ParticipationController extends Controller
{
    private function makeGoszakupRequest($endpoint, $params = [])
    {
        try {
            $baseUrl = config('services.goszakup.base_url');
            $token = config('services.goszakup.api_token');
            
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json',
            ])->get($baseUrl . $endpoint, $params);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Goszakup API error', [
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            return ['data' => []];
        } catch (\Exception $e) {
            Log::error('Goszakup API exception', [
                'endpoint' => $endpoint,
                'error' => $e->getMessage()
            ]);
            return ['data' => []];
        }
    }

    /**
     * Получить заявки поставщика по БИН/ИИН
     */
    public function getParticipations(Request $request)
    {
        $supplierBin = $request->input('supplier_bin');
        $page = $request->input('page', 1);
        $limit = $request->input('limit', 20);

        if (!$supplierBin) {
            return response()->json([
                'success' => false,
                'message' => 'Не указан БИН/ИИН поставщика'
            ], 400);
        }

        // Получаем заявки с фильтром по БИН/ИИН
        $params = [
            'supplier_bin_iin' => $supplierBin,
            'page' => 1,
            'limit' => 1000 // Получаем больше данных для фильтрации
        ];

        $response = $this->makeGoszakupRequest('/trd-app', $params);

        if (!isset($response['items'])) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка получения данных'
            ], 500);
        }

        // Фильтруем заявки по БИН/ИИН на стороне сервера
        $filteredApplications = array_filter($response['items'], function($app) use ($supplierBin) {
            return isset($app['supplier_bin_iin']) && $app['supplier_bin_iin'] === $supplierBin;
        });

        // Применяем пагинацию
        $total = count($filteredApplications);
        $offset = ($page - 1) * $limit;
        $paginatedApplications = array_slice($filteredApplications, $offset, $limit);
        
        // Обогащаем данные информацией о тендерах
        $enrichedApplications = [];
        
        foreach ($paginatedApplications as $app) {
            $buyId = $app['buy_id'] ?? null;
            
            if ($buyId) {
                // Получаем информацию о тендере
                $tenderResponse = $this->makeGoszakupRequest("/trd-buy/{$buyId}");
                $tender = $tenderResponse['data'] ?? null;
                
                if ($tender) {
                    $app['tender_info'] = $tender;
                } else {
                    $app['tender_info'] = null;
                }
            }
            
            $enrichedApplications[] = $app;
        }

        return response()->json([
            'success' => true,
            'data' => $enrichedApplications,
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ]);
    }

    /**
     * Получить детальную информацию о заявке
     */
    public function getParticipationDetails(Request $request, $applicationId)
    {
        // Получаем детальную информацию о заявке
        $response = $this->makeGoszakupRequest("/trd-app/{$applicationId}");

        if (!isset($response['data'])) {
            return response()->json([
                'success' => false,
                'message' => 'Заявка не найдена'
            ], 404);
        }

        $application = $response['data'];
        $buyId = $application['buy_id'] ?? null;

        // Получаем информацию о тендере
        if ($buyId) {
            $tenderResponse = $this->makeGoszakupRequest("/trd-buy/{$buyId}");
            $application['tender_info'] = $tenderResponse['data'] ?? null;
        }

        // Получаем информацию о лотах заявки
        if (isset($application['app_lots']) && is_array($application['app_lots'])) {
            foreach ($application['app_lots'] as &$appLot) {
                $lotId = $appLot['lot_id'] ?? null;
                if ($lotId) {
                    $lotResponse = $this->makeGoszakupRequest("/lots/{$lotId}");
                    $appLot['lot_info'] = $lotResponse['data'] ?? null;
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $application
        ]);
    }

    /**
     * Получить статистику участий
     */
    public function getParticipationStats(Request $request)
    {
        $supplierBin = $request->input('supplier_bin');

        if (!$supplierBin) {
            return response()->json([
                'success' => false,
                'message' => 'Не указан БИН/ИИН поставщика'
            ], 400);
        }

        // Получаем все заявки поставщика для подсчета статистики
        $response = $this->makeGoszakupRequest('/trd-app', [
            'supplier_bin_iin' => $supplierBin,
            'limit' => 1000 // Получаем больше данных для статистики
        ]);

        $allApplications = $response['items'] ?? [];
        
        // Фильтруем заявки по БИН/ИИН
        $applications = array_filter($allApplications, function($app) use ($supplierBin) {
            return isset($app['supplier_bin_iin']) && $app['supplier_bin_iin'] === $supplierBin;
        });
        
        $stats = [
            'total_applications' => count($applications),
            'won_applications' => 0,
            'lost_applications' => 0,
            'pending_applications' => 0,
            'total_amount_bid' => 0,
            'total_amount_won' => 0,
            'recent_applications' => []
        ];

        foreach ($applications as $app) {
            // Подсчитываем статистику по статусам
            if (isset($app['app_lots']) && is_array($app['app_lots'])) {
                foreach ($app['app_lots'] as $lot) {
                    $statusId = $lot['status_id'] ?? null;
                    $amount = $lot['amount'] ?? 0;
                    
                    $stats['total_amount_bid'] += $amount;
                    
                    // Статусы заявок:
                    // 1 - Подана
                    // 2 - Допущена 
                    // 3 - Не допущена
                    // 4 - Победитель
                    // 5 - Отклонена
                    switch ($statusId) {
                        case 4: // Победитель
                            $stats['won_applications']++;
                            $stats['total_amount_won'] += $amount;
                            break;
                        case 3:
                        case 5: // Не допущена или отклонена
                            $stats['lost_applications']++;
                            break;
                        case 1:
                        case 2: // Подана или допущена
                            $stats['pending_applications']++;
                            break;
                    }
                }
            }
        }

        // Получаем последние заявки
        $stats['recent_applications'] = array_slice($applications, 0, 5);

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Поиск участий в тендерах
     */
    public function searchParticipations(Request $request)
    {
        $supplierBin = $request->input('supplier_bin');
        $query = $request->input('query');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $status = $request->input('status');
        $page = $request->input('page', 1);
        $limit = $request->input('limit', 20);

        if (!$supplierBin) {
            return response()->json([
                'success' => false,
                'message' => 'Не указан БИН/ИИН поставщика'
            ], 400);
        }

        $params = [
            'supplier_bin_iin' => $supplierBin,
            'page' => 1,
            'limit' => 1000 // Получаем больше данных для фильтрации
        ];

        // Добавляем фильтры если они указаны
        if ($dateFrom) {
            $params['date_apply_from'] = $dateFrom;
        }
        if ($dateTo) {
            $params['date_apply_to'] = $dateTo;
        }

        $response = $this->makeGoszakupRequest('/trd-app', $params);
        $applications = $response['items'] ?? [];

        // Сначала фильтруем по БИН/ИИН
        $applications = array_filter($applications, function($app) use ($supplierBin) {
            return isset($app['supplier_bin_iin']) && $app['supplier_bin_iin'] === $supplierBin;
        });

        // Обогащаем данные информацией о тендерах
        $enrichedApplications = [];
        foreach ($applications as $app) {
            $buyId = $app['buy_id'] ?? null;
            
            if ($buyId) {
                $tenderResponse = $this->makeGoszakupRequest("/trd-buy/{$buyId}");
                $tender = $tenderResponse['data'] ?? null;
                if ($tender) {
                    $app['tender_info'] = $tender;
                }
            }
            $enrichedApplications[] = $app;
        }

        // Применяем дополнительные фильтры
        $filteredApplications = [];
        
        foreach ($enrichedApplications as $app) {
            $include = true;

            // Фильтр по тексту
            if ($query && $include) {
                $searchText = strtolower($query);
                $appText = strtolower(
                    ($app['tender_info']['name_ru'] ?? '') . ' ' .
                    ($app['tender_info']['name_kz'] ?? '') . ' ' .
                    ($app['tender_info']['number_anno'] ?? '')
                );
                
                if (strpos($appText, $searchText) === false) {
                    $include = false;
                }
            }

            // Фильтр по статусу
            if ($status && $include) {
                $hasStatus = false;
                if (isset($app['app_lots']) && is_array($app['app_lots'])) {
                    foreach ($app['app_lots'] as $lot) {
                        if (($lot['status_id'] ?? null) == $status) {
                            $hasStatus = true;
                            break;
                        }
                    }
                }
                if (!$hasStatus) {
                    $include = false;
                }
            }

            if ($include) {
                $filteredApplications[] = $app;
            }
        }

        // Применяем пагинацию
        $total = count($filteredApplications);
        $offset = ($page - 1) * $limit;
        $paginatedApplications = array_slice($filteredApplications, $offset, $limit);

        return response()->json([
            'success' => true,
            'data' => $paginatedApplications,
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ]);
    }
}
