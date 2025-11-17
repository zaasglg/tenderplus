<?php

namespace App\Console\Commands;

use App\Models\TelegramUser;
use App\Services\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramBotListen extends Command
{
    protected $signature = 'telegram:listen';
    protected $description = 'Listen for Telegram bot commands using long polling';

    private TelegramService $telegramService;
    private int $lastUpdateId = 0;

    public function __construct(TelegramService $telegramService)
    {
        parent::__construct();
        $this->telegramService = $telegramService;
    }

    public function handle()
    {
        $botToken = config('telegram.bot_token');
        
        if (!$botToken) {
            $this->error('Telegram bot token not configured. Please set TELEGRAM_BOT_TOKEN in .env');
            return 1;
        }

        $this->info('Starting Telegram bot listener...');
        $this->info('Press Ctrl+C to stop');
        $this->newLine();

        while (true) {
            try {
                $updates = $this->getUpdates($botToken);
                
                if (!empty($updates)) {
                    foreach ($updates as $update) {
                        $this->processUpdate($update);
                        $this->lastUpdateId = $update['update_id'] + 1;
                    }
                }
                
                sleep(1); // Пауза между запросами
            } catch (\Exception $e) {
                $this->error('Error: ' . $e->getMessage());
                Log::error('Telegram bot listener error: ' . $e->getMessage());
                sleep(5); // Пауза при ошибке
            }
        }

        return 0;
    }

    private function getUpdates(string $botToken): array
    {
        $apiUrl = config('telegram.api_url') . $botToken . '/getUpdates';
        
        $response = Http::timeout(30)->get($apiUrl, [
            'offset' => $this->lastUpdateId,
            'timeout' => 25,
            'allowed_updates' => ['message']
        ]);

        if ($response->successful()) {
            $result = $response->json();
            return $result['result'] ?? [];
        }

        return [];
    }

    private function processUpdate(array $update): void
    {
        if (!isset($update['message'])) {
            return;
        }

        $message = $update['message'];
        $chatId = $message['chat']['id'] ?? null;
        $text = $message['text'] ?? '';
        $from = $message['from'] ?? [];
        $username = $from['username'] ?? 'Unknown';
        $firstName = $from['first_name'] ?? '';

        if (!$chatId) {
            return;
        }

        $this->info("Message from @{$username} ({$firstName}): {$text}");

        // Сохраняем или обновляем пользователя в базе данных
        try {
            $telegramUser = TelegramUser::createOrUpdateFromTelegram($from);
            $this->info("User saved: {$telegramUser->display_name} (ID: {$telegramUser->id})");
        } catch (\Exception $e) {
            $this->error("Failed to save user: {$e->getMessage()}");
            Log::error('Failed to save Telegram user', [
                'error' => $e->getMessage(),
                'user_data' => $from
            ]);
        }

        // Обработка команды /start
        if ($text === '/start') {
            $this->info("Sending welcome message to chat {$chatId}");
            $sent = $this->telegramService->sendWelcomeMessage($chatId);
            
            if ($sent) {
                $this->info('✓ Welcome message sent successfully');
            } else {
                $this->error('✗ Failed to send welcome message');
            }
        }
    }
}
