<?php

namespace App\Console\Commands;

use App\Services\LotMonitoringService;
use Illuminate\Console\Command;

class CheckNewLots extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'lots:check-new';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for new lots and send Telegram notifications';

    /**
     * Execute the console command.
     */
    public function handle(LotMonitoringService $monitoringService): int
    {
        $this->info('Checking for new lots...');
        
        $monitoringService->checkNewLotsForMe();
        
        $this->info('Lot check completed');
        
        return Command::SUCCESS;
    }
}
