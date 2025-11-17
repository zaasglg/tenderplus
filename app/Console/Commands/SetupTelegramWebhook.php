<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SetupTelegramWebhook extends Command
{
    protected $signature = 'telegram:setup-webhook {--remove : Remove webhook instead of setting it}';
    protected $description = 'Setup or remove Telegram webhook for bot commands';

    public function handle()
    {
        $botToken = config('telegram.bot_token');
        
        if (!$botToken) {
            $this->error('Telegram bot token not configured. Please set TELEGRAM_BOT_TOKEN in .env');
            return 1;
        }

        if ($this->option('remove')) {
            return $this->removeWebhook($botToken);
        }

        return $this->setupWebhook($botToken);
    }

    private function setupWebhook(string $botToken): int
    {
        $webhookUrl = config('app.url') . '/api/telegram/webhook';
        $apiUrl = config('telegram.api_url') . $botToken . '/setWebhook';

        $this->info("Setting up webhook...");
        $this->info("Webhook URL: {$webhookUrl}");

        try {
            $response = Http::post($apiUrl, [
                'url' => $webhookUrl,
                'allowed_updates' => ['message']
            ]);

            if ($response->successful()) {
                $result = $response->json();
                
                if ($result['ok'] ?? false) {
                    $this->info('✓ Webhook successfully set!');
                    $this->info('Description: ' . ($result['description'] ?? 'N/A'));
                    return 0;
                } else {
                    $this->error('Failed to set webhook: ' . ($result['description'] ?? 'Unknown error'));
                    return 1;
                }
            } else {
                $this->error('HTTP Error: ' . $response->status());
                $this->error('Response: ' . $response->body());
                return 1;
            }
        } catch (\Exception $e) {
            $this->error('Exception: ' . $e->getMessage());
            return 1;
        }
    }

    private function removeWebhook(string $botToken): int
    {
        $apiUrl = config('telegram.api_url') . $botToken . '/deleteWebhook';

        $this->info("Removing webhook...");

        try {
            $response = Http::post($apiUrl);

            if ($response->successful()) {
                $result = $response->json();
                
                if ($result['ok'] ?? false) {
                    $this->info('✓ Webhook successfully removed!');
                    return 0;
                } else {
                    $this->error('Failed to remove webhook: ' . ($result['description'] ?? 'Unknown error'));
                    return 1;
                }
            } else {
                $this->error('HTTP Error: ' . $response->status());
                return 1;
            }
        } catch (\Exception $e) {
            $this->error('Exception: ' . $e->getMessage());
            return 1;
        }
    }
}
