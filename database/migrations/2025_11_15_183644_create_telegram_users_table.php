<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('telegram_users', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('chat_id')->unique()->comment('Telegram Chat ID');
            $table->string('username')->nullable()->comment('Telegram username');
            $table->string('first_name')->nullable()->comment('Имя пользователя');
            $table->string('last_name')->nullable()->comment('Фамилия пользователя');
            $table->string('language_code')->nullable()->comment('Код языка');
            $table->boolean('is_bot')->default(false)->comment('Является ли ботом');
            $table->boolean('is_active')->default(true)->comment('Активен ли пользователь');
            $table->timestamp('first_interaction_at')->nullable()->comment('Первое взаимодействие');
            $table->timestamp('last_interaction_at')->nullable()->comment('Последнее взаимодействие');
            $table->integer('interactions_count')->default(0)->comment('Количество взаимодействий');
            $table->json('metadata')->nullable()->comment('Дополнительные данные');
            $table->timestamps();
            
            $table->index('chat_id');
            $table->index('username');
            $table->index('is_active');
            $table->index('last_interaction_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('telegram_users');
    }
};
