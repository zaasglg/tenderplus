<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Планировщик задач
Schedule::command('lots:check-new')
    ->everyThirtyMinutes()
    ->between('8:00', '20:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/lot-monitoring.log'));
