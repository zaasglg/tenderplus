<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TelegramUser extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_id',
        'username',
        'first_name',
        'last_name',
        'language_code',
        'is_bot',
        'is_active',
        'first_interaction_at',
        'last_interaction_at',
        'interactions_count',
        'metadata',
    ];

    protected $casts = [
        'chat_id' => 'integer',
        'is_bot' => 'boolean',
        'is_active' => 'boolean',
        'first_interaction_at' => 'datetime',
        'last_interaction_at' => 'datetime',
        'interactions_count' => 'integer',
        'metadata' => 'array',
    ];

    /**
     * Создать или обновить пользователя Telegram
     */
    public static function createOrUpdateFromTelegram(array $telegramUser): self
    {
        $chatId = $telegramUser['id'];
        $now = now();

        $user = self::firstOrNew(['chat_id' => $chatId]);

        // Если это новый пользователь
        if (!$user->exists) {
            $user->first_interaction_at = $now;
            $user->interactions_count = 0;
        }

        // Обновляем данные
        $user->username = $telegramUser['username'] ?? null;
        $user->first_name = $telegramUser['first_name'] ?? null;
        $user->last_name = $telegramUser['last_name'] ?? null;
        $user->language_code = $telegramUser['language_code'] ?? null;
        $user->is_bot = $telegramUser['is_bot'] ?? false;
        $user->last_interaction_at = $now;
        $user->interactions_count++;

        $user->save();

        return $user;
    }

    /**
     * Получить полное имя пользователя
     */
    public function getFullNameAttribute(): string
    {
        $parts = array_filter([$this->first_name, $this->last_name]);
        return implode(' ', $parts) ?: $this->username ?: "User {$this->chat_id}";
    }

    /**
     * Получить отображаемое имя
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->first_name ?: $this->username ?: "User {$this->chat_id}";
    }

    /**
     * Scope для активных пользователей
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope для недавно активных пользователей
     */
    public function scopeRecentlyActive($query, $days = 7)
    {
        return $query->where('last_interaction_at', '>=', now()->subDays($days));
    }
}
