<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn() => response()->json(['service' => 'Cashflow Tax API', 'version' => '1.0']));
