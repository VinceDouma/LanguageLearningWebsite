<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OllamaControllerTest extends TestCase
{
    public function test_translation_endpoint_returns_translategemma_translation(): void
    {
        Http::fake([
            '*' => Http::response([
                'message' => [
                    'content' => '안녕하세요.',
                ],
            ]),
        ]);

        $this->postJson('/api/translate/korean', ['text' => 'Hello'])
            ->assertOk()
            ->assertExactJson([
                'hangul' => '안녕하세요.',
            ]);

        Http::assertSent(fn ($request) => $request['model'] === 'translategemma:4b'
            && $request['messages'][0]['content'] === "You are a professional English (en) to Korean (kr) translator. Your goal is to accurately convey the meaning and nuances of the original English text while adhering to Korean grammar, vocabulary, and cultural sensitivities.\nProduce only the Korean translation, without any additional explanations or commentary. Please translate the following English text into Korean:\n\nHello");
    }

    public function test_sentence_generation_endpoint_returns_model_json(): void
    {
        Http::fake([
            '*' => Http::response([
                'message' => [
                    'content' => '{"korean":"안녕하세요","english":"Hello"}',
                ],
            ]),
        ]);

        $this->postJson('/api/sentence/generate', ['prompt' => 'Generate a sentence'])
            ->assertOk()
            ->assertExactJson([
                'korean' => '안녕하세요',
                'english' => 'Hello',
            ]);

        Http::assertSent(fn ($request) => $request['model'] === 'neural-chat');
    }

    public function test_sentence_evaluation_endpoint_returns_model_json(): void
    {
        Http::fake([
            '*' => Http::response([
                'message' => [
                    'content' => '{"score":5,"comment":"Great work!"}',
                ],
            ]),
        ]);

        $this->postJson('/api/sentence/evaluate', [
            'korean' => '안녕하세요',
            'english' => 'Hello',
            'userAnswer' => 'Hello',
        ])
            ->assertOk()
            ->assertExactJson([
                'score' => 5,
                'comment' => 'Great work!',
            ]);
    }

    public function test_invalid_api_input_returns_an_error_without_calling_ollama(): void
    {
        Http::fake();

        $this->postJson('/api/translate/korean', ['text' => []])
            ->assertUnprocessable()
            ->assertJsonStructure(['error']);

        Http::assertNothingSent();
    }
}
