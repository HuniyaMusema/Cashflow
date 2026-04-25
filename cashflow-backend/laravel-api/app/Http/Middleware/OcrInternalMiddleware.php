<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class OcrInternalMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->header('X-OCR-Token');

        if ($token !== config('services.ocr.internal_token')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
