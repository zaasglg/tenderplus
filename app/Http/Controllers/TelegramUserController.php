<?php

namespace App\Http\Controllers;

use App\Models\TelegramUser;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TelegramUserController extends Controller
{
    /**
     * Показать список пользователей Telegram
     */
    public function index(Request $request)
    {
        $query = TelegramUser::query();

        // Фильтр по активности
        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        // Поиск
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('chat_id', 'like', "%{$search}%");
            });
        }

        // Сортировка
        $sortBy = $request->input('sort_by', 'last_interaction_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $users = $query->paginate(20);

        return Inertia::render('telegram-users', [
            'users' => $users,
            'filters' => $request->only(['search', 'active', 'sort_by', 'sort_order']),
            'stats' => [
                'total' => TelegramUser::count(),
                'active' => TelegramUser::active()->count(),
                'recent' => TelegramUser::recentlyActive(7)->count(),
                'total_interactions' => TelegramUser::sum('interactions_count'),
            ],
        ]);
    }

    /**
     * Показать детали пользователя
     */
    public function show(TelegramUser $user)
    {
        return Inertia::render('telegram-user-details', [
            'user' => $user,
        ]);
    }

    /**
     * Деактивировать пользователя
     */
    public function deactivate(TelegramUser $user)
    {
        $user->update(['is_active' => false]);

        return back()->with('success', 'Пользователь деактивирован');
    }

    /**
     * Активировать пользователя
     */
    public function activate(TelegramUser $user)
    {
        $user->update(['is_active' => true]);

        return back()->with('success', 'Пользователь активирован');
    }

    /**
     * Получить статистику по API
     */
    public function stats()
    {
        return response()->json([
            'total_users' => TelegramUser::count(),
            'active_users' => TelegramUser::active()->count(),
            'recent_users' => TelegramUser::recentlyActive(7)->count(),
            'total_interactions' => TelegramUser::sum('interactions_count'),
            'new_today' => TelegramUser::whereDate('created_at', today())->count(),
            'new_this_week' => TelegramUser::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'new_this_month' => TelegramUser::whereMonth('created_at', now()->month)->count(),
        ]);
    }
}
