<?php

namespace App\Console\Commands;

use App\Models\TelegramUser;
use Illuminate\Console\Command;

class ShowTelegramUsers extends Command
{
    protected $signature = 'telegram:users {--active : Show only active users} {--recent= : Show users active in last N days}';
    protected $description = 'Show Telegram bot users';

    public function handle()
    {
        $query = TelegramUser::query();

        if ($this->option('active')) {
            $query->active();
        }

        if ($days = $this->option('recent')) {
            $query->recentlyActive((int) $days);
        }

        $users = $query->orderBy('last_interaction_at', 'desc')->get();

        if ($users->isEmpty()) {
            $this->info('No users found.');
            return 0;
        }

        $this->info("Total users: {$users->count()}");
        $this->newLine();

        $tableData = $users->map(function ($user) {
            return [
                $user->id,
                $user->chat_id,
                $user->username ?: '-',
                $user->display_name,
                $user->is_active ? '✓' : '✗',
                $user->interactions_count,
                $user->first_interaction_at?->format('Y-m-d H:i') ?: '-',
                $user->last_interaction_at?->format('Y-m-d H:i') ?: '-',
            ];
        })->toArray();

        $this->table(
            ['ID', 'Chat ID', 'Username', 'Name', 'Active', 'Interactions', 'First', 'Last'],
            $tableData
        );

        // Статистика
        $this->newLine();
        $this->info('Statistics:');
        $this->line("Total users: " . TelegramUser::count());
        $this->line("Active users: " . TelegramUser::active()->count());
        $this->line("Recent (7 days): " . TelegramUser::recentlyActive(7)->count());
        $this->line("Total interactions: " . TelegramUser::sum('interactions_count'));

        return 0;
    }
}
