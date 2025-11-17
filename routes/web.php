<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\LotController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    
    Route::get('lots', function () {
        return Inertia::render('lots');
    })->name('lots');
    
    Route::get('lots/{id}', [LotController::class, 'show'])->name('lots.show');
    
    Route::get('participants', function () {
        return Inertia::render('participants');
    })->name('participants');
    
    Route::get('announcements', function () {
        return Inertia::render('announcements');
    })->name('announcements');
    
    Route::get('participations', function () {
        return Inertia::render('participations');
    })->name('participations');
    
    Route::get('ai-analysis', function () {
        return Inertia::render('ai-analysis');
    })->name('ai-analysis');
    
    // Telegram пользователи
    Route::get('telegram-users', [\App\Http\Controllers\TelegramUserController::class, 'index'])->name('telegram-users');
    Route::get('telegram-users/{user}', [\App\Http\Controllers\TelegramUserController::class, 'show'])->name('telegram-users.show');
    Route::post('telegram-users/{user}/deactivate', [\App\Http\Controllers\TelegramUserController::class, 'deactivate'])->name('telegram-users.deactivate');
    Route::post('telegram-users/{user}/activate', [\App\Http\Controllers\TelegramUserController::class, 'activate'])->name('telegram-users.activate');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
