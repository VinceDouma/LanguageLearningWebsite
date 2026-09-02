<?php

use Illuminate\Support\Facades\Route;

// Serve React app
Route::get('/', function () {
    return file_get_contents(public_path('dist/index.html'));
});

// Catch-all route for client-side routing
Route::fallback(function () {
    return file_get_contents(public_path('dist/index.html'));
});