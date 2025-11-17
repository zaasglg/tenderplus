<?php

namespace App\Console\Commands;

use App\Services\TelegramService;
use Illuminate\Console\Command;

class TestTelegramBroadcast extends Command
{
    protected $signature = 'telegram:test-broadcast';
    protected $description = 'Send test broadcast message to all active Telegram users';

    private TelegramService $telegramService;

    public function __construct(TelegramService $telegramService)
    {
        parent::__construct();
        $this->telegramService = $telegramService;
    }

    public function handle()
    {
        $this->info('Sending test broadcast to all active users...');
        $this->newLine();

        $results = $this->telegramService->sendTestBroadcast();

        $this->info("Broadcast Results:");
        $this->line("Total users: {$results['total']}");
        $this->line("Successfully sent: {$results['success']}");
        $this->line("Failed: {$results['failed']}");
        $this->newLine();

        if (!empty($results['users'])) {
            $tableData = array_map(function($user) {
                return [
                    $user['chat_id'],
                    $user['name'],
                    $user['status'] === 'sent' ? '✓' : '✗',
                    $user['status'],
                    $user['error'] ?? '-',
                ];
            }, $results['users']);

            $this->table(
                ['Chat ID', 'Name', 'Sent', 'Status', 'Error'],
                $tableData
            );
        }

        if ($results['success'] > 0) {
            $this->info('✓ Test broadcast completed successfully!');
            return 0;
        } else {
            $this->error('✗ Test broadcast failed!');
            return 1;
        }
    }
}
