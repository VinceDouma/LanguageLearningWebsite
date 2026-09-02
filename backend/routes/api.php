<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;

/**
 * Call local Ollama /api/chat (same stack as English → Korean translation).
 */
function ollama_chat_content(string $userContent): array
{
    $base = rtrim(env('OLLAMA_BASE_URL', 'http://localhost:11434'), '/');
    $model = env('OLLAMA_MODEL', 'neural-chat');

    $response = Http::timeout(120)->post($base . '/api/chat', [
        'model' => $model,
        'messages' => [
            ['role' => 'user', 'content' => $userContent],
        ],
        'stream' => false,
    ]);

    if (!$response->successful()) {
        $body = $response->body();
        $snippet = strlen($body) > 500 ? substr($body, 0, 500) . '…' : $body;
        throw new RuntimeException('Ollama HTTP ' . $response->status() . ': ' . $snippet);
    }

    $data = $response->json();
    if (!isset($data['message']['content'])) {
        throw new RuntimeException('Unexpected Ollama response: ' . json_encode($data));
    }

    return $data;
}

/**
 * Parse JSON from model output (strip fences; fallback to first {...} block).
 */
function parse_model_json(string $content): ?array
{
    $cleaned = preg_replace('/```json\s*/i', '', $content);
    $cleaned = preg_replace('/```\s*/i', '', $cleaned);
    $cleaned = trim($cleaned);

    $parsed = json_decode($cleaned, true);
    if (is_array($parsed)) {
        return $parsed;
    }

    if (preg_match('/\{[\s\S]*\}/', $cleaned, $m)) {
        $parsed = json_decode($m[0], true);
        if (is_array($parsed)) {
            return $parsed;
        }
    }

    return null;
}

Route::get('/test', function () {
    return [
        'message' => 'API working',
    ];
});

Route::post('/translate/korean', function (Request $request) {
    try {
        $text = $request->input('text');
        $prompt = "Translate the English text to Korean. Return ONLY valid JSON with exactly these keys:\n- \"hangul\": The Korean text in Hangul script\n- \"romanized\": The Korean text romanized (Latin alphabet)\n- \"notes\": A brief usage note IN KOREAN, max 20 words\n- \"notes_english\": The same usage note IN ENGLISH, max 20 words\n\nNo markdown, no backticks, just raw JSON.\n\nEnglish text: " . $text;

        $data = ollama_chat_content($prompt);
        $content = $data['message']['content'];

        \Log::info('Ollama translate content:', ['content' => $content]);

        $parsed = parse_model_json($content);

        if ($parsed) {
            return response()->json($parsed);
        }

        return response()->json(['error' => 'Failed to parse JSON: ' . $content], 500);
    } catch (\Exception $e) {
        \Log::error('Translation Error:', ['error' => $e->getMessage()]);
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::post('/sentence/generate', function (Request $request) {
    try {
        $prompt = $request->input('prompt');
        if (!$prompt || !is_string($prompt)) {
            return response()->json(['error' => 'Missing prompt'], 422);
        }

        $data = ollama_chat_content($prompt);
        $parsed = parse_model_json($data['message']['content']);

        if (!$parsed || empty($parsed['korean']) || empty($parsed['english'])) {
            return response()->json([
                'error' => 'Model did not return valid sentence JSON',
                'raw' => $data['message']['content'] ?? '',
            ], 500);
        }

        return response()->json($parsed);
    } catch (\Exception $e) {
        \Log::error('Sentence generate:', ['error' => $e->getMessage()]);
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::post('/sentence/evaluate', function (Request $request) {
    try {
        $korean = $request->input('korean');
        $english = $request->input('english');
        $userAnswer = $request->input('userAnswer');

        if (!$korean || !$english || $userAnswer === null || $userAnswer === '') {
            return response()->json(['error' => 'Missing korean, english, or userAnswer'], 422);
        }

        $evalPrompt = <<<PROMPT
You are a Korean language teacher evaluating a student's English translation.

Korean sentence: {$korean}
Correct English translation: {$english}
Student's answer: {$userAnswer}

Evaluate the student's translation. Be generous — accept paraphrases, different word orders, and natural variations that preserve the meaning. Only penalise for missing key meaning, wrong tense, or significant errors.

Score 1-5 where:
5 = Perfect or near-perfect
4 = Good, minor differences
3 = Mostly correct, some key parts missing or wrong
2 = Partial understanding, significant errors
1 = Mostly wrong or completely off

Respond ONLY with valid JSON, no markdown:
{"score": 4, "comment": "...brief encouraging feedback in 1-2 sentences..."}
PROMPT;

        $data = ollama_chat_content($evalPrompt);
        $parsed = parse_model_json($data['message']['content']);

        if (!$parsed || !isset($parsed['score'])) {
            return response()->json(['error' => 'Failed to parse evaluation JSON', 'raw' => $data['message']['content'] ?? ''], 500);
        }

        return response()->json($parsed);
    } catch (\Exception $e) {
        \Log::error('Sentence evaluate:', ['error' => $e->getMessage()]);
        return response()->json(['error' => $e->getMessage()], 500);
    }
});
