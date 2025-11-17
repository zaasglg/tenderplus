<?php

use App\Http\Controllers\Api\GoszakupProxyController;
use App\Http\Controllers\Api\ParticipationController;
use App\Http\Controllers\Api\TelegramWebhookController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Configuration routes
Route::get('/config', function () {
    return response()->json([
        'default_supplier_bin' => config('app.default_supplier_bin')
    ]);
});

// Goszakup API Proxy Routes
Route::prefix('goszakup')->group(function () {
    // Лоты
    Route::get('/lots', [GoszakupProxyController::class, 'getLots']);
    Route::get('/lots/all', [GoszakupProxyController::class, 'getAllLots']); // Новый маршрут для всех лотов
    Route::get('/lots/{id}', [GoszakupProxyController::class, 'getLotById']);
    Route::get('/lots/announcement/{number}', [GoszakupProxyController::class, 'getLotsByAnnouncement']);
    Route::get('/lots/customer/{bin}', [GoszakupProxyController::class, 'getLotsByCustomer']);
    
    // Справочники
    Route::get('/refs/lot-statuses', [GoszakupProxyController::class, 'getLotStatuses']);
    Route::get('/refs/trade-methods', [GoszakupProxyController::class, 'getTradeMethods']);
    
    // Участники
    Route::get('/subjects', [GoszakupProxyController::class, 'getSubjects']);
    Route::get('/subjects/{biin}', [GoszakupProxyController::class, 'getSubjectByBiin']);
    
    // Объявления
    Route::get('/announcements', [GoszakupProxyController::class, 'getAnnouncements']);
    
    // Договоры
    Route::get('/contracts', [GoszakupProxyController::class, 'getContracts']);
    
    // ИИ анализ и советы
    Route::post('/ai/analyze', [GoszakupProxyController::class, 'analyzeAndAdvise']);
    Route::post('/ai/analyze-lot', [GoszakupProxyController::class, 'analyzeLot']);
});

// Участие в тендерах
Route::prefix('participations')->group(function () {
    Route::get('/', [ParticipationController::class, 'getParticipations']);
    Route::get('/{id}', [ParticipationController::class, 'getParticipationDetails']);
    Route::get('/stats/overview', [ParticipationController::class, 'getParticipationStats']);
    Route::post('/search', [ParticipationController::class, 'searchParticipations']);
});

// Мониторинг лотов - исправленная версия
Route::post('/lots/check-new', function (Request $request, App\Services\LotMonitoringService $monitoringService) {
    try {
        $monitoringService->checkNewLotsForMe();
        
        return response()->json([
            'success' => true,
            'message' => 'Проверка новых лотов выполнена. Если найдены новые лоты, уведомления отправлены в Telegram.'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Ошибка при проверке новых лотов: ' . $e->getMessage()
        ], 500);
    }
});

// Telegram тестирование
Route::post('/telegram/test', function (Request $request, App\Services\TelegramService $telegramService) {
    $message = $request->input('message', 'Тестовое сообщение от TenderPlus!');
    $sent = $telegramService->sendMessage($message);
    
    return response()->json([
        'success' => $sent,
        'message' => $sent ? 'Сообщение отправлено' : 'Ошибка отправки'
    ]);
});

// Telegram рассылка всем пользователям
Route::post('/telegram/broadcast', function (Request $request, App\Services\TelegramService $telegramService) {
    $results = $telegramService->sendTestBroadcast();
    
    return response()->json([
        'success' => $results['success'] > 0,
        'results' => $results,
        'message' => "Отправлено {$results['success']} из {$results['total']} пользователям"
    ]);
});

// Telegram Webhook
Route::post('/telegram/webhook', [TelegramWebhookController::class, 'handle']);

// Telegram Users Stats
Route::get('/telegram/users/stats', [\App\Http\Controllers\TelegramUserController::class, 'stats']);
