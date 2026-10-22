<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

class OllamaController extends Controller
{
    public function test(): array
    {
        return [
            'message' => 'API working',
        ];
    }

    public function translateKorean(Request $request): JsonResponse
    {
        $input = $this->validateInput($request, [
            'text' => ['required', 'string'],
        ]);

        if ($input instanceof JsonResponse) {
            return $input;
        }

        try {
            $prompt = "You are a professional English (en) to Korean (kr) translator. Your goal is to accurately convey the meaning and nuances of the original English text while adhering to Korean grammar, vocabulary, and cultural sensitivities.\n"
                ."Produce only the Korean translation, without any additional explanations or commentary. Please translate the following English text into Korean:\n\n"
                .$input['text'];

            $data = $this->ollamaChatContent($prompt, env('OLLAMA_TRANSLATION_MODEL', 'translategemma:4b'));
            $translation = trim($data['message']['content']);

            Log::info('Ollama translate content:', ['content' => $translation]);

            if ($translation === '') {
                return response()->json(['error' => 'TranslateGemma returned an empty translation'], 500);
            }

            return response()->json(['hangul' => $translation]);
        } catch (\Exception $e) {
            Log::error('Translation Error:', ['error' => $e->getMessage()]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function generateSentence(Request $request): JsonResponse
    {
        $input = $this->validateInput($request, [
            'prompt' => ['required', 'string'],
        ]);

        if ($input instanceof JsonResponse) {
            return $input;
        }

        try {
            $data = $this->ollamaChatContent($input['prompt']);
            $parsed = $this->parseModelJson($data['message']['content']);

            if (! $parsed || empty($parsed['korean']) || empty($parsed['english'])) {
                return response()->json([
                    'error' => 'Model did not return valid sentence JSON',
                    'raw' => $data['message']['content'] ?? '',
                ], 500);
            }

            return response()->json($parsed);
        } catch (\Exception $e) {
            Log::error('Sentence generate:', ['error' => $e->getMessage()]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function evaluateSentence(Request $request): JsonResponse
    {
        $input = $this->validateInput($request, [
            'korean' => ['required', 'string'],
            'english' => ['required', 'string'],
            'userAnswer' => ['required', 'string'],
        ]);

        if ($input instanceof JsonResponse) {
            return $input;
        }

        try {
            $evalPrompt = <<<PROMPT
You are a Korean language teacher evaluating a student's English translation.

Korean sentence: {$input['korean']}
Correct English translation: {$input['english']}
Student's answer: {$input['userAnswer']}

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

            $data = $this->ollamaChatContent($evalPrompt);
            $parsed = $this->parseModelJson($data['message']['content']);

            if (! $parsed || ! isset($parsed['score'])) {
                return response()->json([
                    'error' => 'Failed to parse evaluation JSON',
                    'raw' => $data['message']['content'] ?? '',
                ], 500);
            }

            return response()->json($parsed);
        } catch (\Exception $e) {
            Log::error('Sentence evaluate:', ['error' => $e->getMessage()]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function validateInput(Request $request, array $rules): array|JsonResponse
    {
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors()->first(),
            ], 422);
        }

        return $validator->validated();
    }

    private function ollamaChatContent(string $userContent, ?string $model = null): array
    {
        $base = rtrim(env('OLLAMA_BASE_URL', 'http://localhost:11434'), '/');
        $model = $model ?? env('OLLAMA_MODEL', 'neural-chat');

        $response = Http::timeout(120)->post($base.'/api/chat', [
            'model' => $model,
            'messages' => [
                ['role' => 'user', 'content' => $userContent],
            ],
            'stream' => false,
        ]);

        if (! $response->successful()) {
            $body = $response->body();
            $snippet = strlen($body) > 500 ? substr($body, 0, 500).'…' : $body;
            throw new RuntimeException('Ollama HTTP '.$response->status().': '.$snippet);
        }

        $data = $response->json();
        if (! isset($data['message']['content'])) {
            throw new RuntimeException('Unexpected Ollama response: '.json_encode($data));
        }

        return $data;
    }

    private function parseModelJson(string $content): ?array
    {
        $cleaned = preg_replace('/```json\s*/i', '', $content);
        $cleaned = preg_replace('/```\s*/', '', $cleaned);
        $cleaned = trim($cleaned);

        $parsed = json_decode($cleaned, true);
        if (is_array($parsed)) {
            return $parsed;
        }

        if (preg_match('/\{[\s\S]*\}/', $cleaned, $matches)) {
            $parsed = json_decode($matches[0], true);
            if (is_array($parsed)) {
                return $parsed;
            }
        }

        return null;
    }
}
