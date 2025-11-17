<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TelegramNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'lot_id',
        'message',
        'sent',
        'sent_at'
    ];

    protected $casts = [
        'sent' => 'boolean',
        'sent_at' => 'datetime'
    ];
}
