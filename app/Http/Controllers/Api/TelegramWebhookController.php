<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TelegramUser;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    private TelegramService $telegramService;

    public function __construct(TelegramService $telegramService)
    {
        $this->telegramService = $telegramService;
    }

    /**
     * Обработка webhook от Telegram
     */
    public function handle(Request $request)
    {
        try {
            $update = $request->all();
            
            Log::info('Telegram webhook received', ['update' => $update]);

            // Проверяем наличие сообщения
            if (!isset($update['message'])) {
                return response()->json(['ok' => true]);
            }

            $message = $update['message'];
            $chatId = $message['chat']['id'] ?? null;
            $text = $message['text'] ?? '';
            $from = $message['from'] ?? [];

            if (!$chatId) {
                return response()->json(['ok' => true]);
            }

            // Сохраняем или обновляем пользователя в базе данных
            try {
                TelegramUser::createOrUpdateFromTelegram($from);
            } catch (\Exception $e) {
                Log::error('Failed to save Telegram user from webhook', [
                    'error' => $e->getMessage(),
                    'user_data' => $from
                ]);
            }

            // Обработка команды /start
            if ($text === '/start') {
                $this->telegramService->sendWelcomeMessage($chatId);
            }

            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            Log::error('Telegram webhook error: ' . $e->getMessage());
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
