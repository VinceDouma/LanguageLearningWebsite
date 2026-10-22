<?php

use App\Http\Controllers\OllamaController;
use Illuminate\Support\Facades\Route;

Route::get('/test', [OllamaController::class, 'test']);
Route::post('/translate/korean', [OllamaController::class, 'translateKorean']);
Route::post('/sentence/generate', [OllamaController::class, 'generateSentence']);
Route::post('/sentence/evaluate', [OllamaController::class, 'evaluateSentence']);
