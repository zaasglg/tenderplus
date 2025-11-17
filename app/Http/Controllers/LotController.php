<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class LotController extends Controller
{
    /**
     * Показать детальную страницу лота
     */
    public function show($id)
    {
        return Inertia::render('LotDetails', [
            'id' => $id
        ]);
    }
}
