import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface AIProvider {
  name: string;
  priority: number; // Lower = higher priority (1 = first to try)
  enabled: boolean;
  maxRetries: number;
  timeout: number; // milliseconds
}

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  latency: number;
}

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);
  private providers: AIProvider[] = [];

  constructor(private configService: ConfigService) {
    this.initializeProviders();
  }

  /**
   * Initialize AI providers in priority order
   */
  private initializeProviders() {
    this.providers = [
      {
        name: 'openrouter',
        priority: 1,
        enabled: !!this.configService.get('OPENROUTER_API_KEY'),
        maxRetries: 2,
        timeout: 10000,
      },
      {
        name: 'ollama',
        priority: 2,
        enabled: true, // Always available (local)
        maxRetries: 1,
        timeout: 30000,
      },
    ].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Main router method - tries providers in order with fallback
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const errors: Record<string, string> = {};

    // Try each provider in priority order
    for (const provider of this.providers.filter((p) => p.enabled)) {
      try {
        const response = await this.callProvider(provider, request);
        const latency = Date.now() - startTime;

        return {
          ...response,
          latency,
        };
      } catch (error) {
        const errorMsg = error.message || 'Unknown error';
        errors[provider.name] = errorMsg;
        this.logger.warn(
          `❌ Provider ${provider.name} failed: ${errorMsg}`,
        );
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(
      `All AI providers failed. Errors: ${JSON.stringify(errors)}`,
    );
  }

  /**
   * Call specific provider with retry logic
   */
  private async callProvider(
    provider: AIProvider,
    request: AIRequest,
  ): Promise<Omit<AIResponse, 'latency'>> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= provider.maxRetries; attempt++) {
      try {
        switch (provider.name) {
          case 'openrouter':
            return await this.callOpenRouter(request, provider.timeout);
          case 'ollama':
            return await this.callOllama(request, provider.timeout);
          default:
            throw new Error(`Unknown provider: ${provider.name}`);
        }
      } catch (error) {
        lastError = error;
        if (attempt < provider.maxRetries) {
          const backoff = attempt * 1000; // Exponential backoff
          this.logger.warn(
            `Retry ${attempt}/${provider.maxRetries} for ${provider.name} after ${backoff}ms`,
          );
          await this.sleep(backoff);
        }
      }
    }

    throw lastError || new Error('Unknown error in provider call');
  }

  /**
   * OpenRouter API call
   */
  private async callOpenRouter(
    request: AIRequest,
    timeout: number,
  ): Promise<Omit<AIResponse, 'latency'>> {
    const apiKey = this.configService.get('OPENROUTER_API_KEY');
    const model =
      this.configService.get('OPENROUTER_MODEL') ||
      'anthropic/claude-3-haiku'; // Cheap, fast model

    const response = await axios.post<any>(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          ...(request.systemPrompt
            ? [{ role: 'system', content: request.systemPrompt }]
            : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 500,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://your-dating-app.com',
          'X-Title': 'Dating App AI',
        },
        timeout,
      },
    );

    return {
      text: response.data.choices[0].message.content,
      provider: 'openrouter',
      model,
      tokensUsed: response.data.usage?.total_tokens,
    };
  }

  /**
   * Ollama API call (local, always available)
   */
  private async callOllama(
    request: AIRequest,
    timeout: number,
  ): Promise<Omit<AIResponse, 'latency'>> {
    const ollamaUrl =
      this.configService.get('OLLAMA_URL') || 'http://localhost:11434';
    const model = this.configService.get('OLLAMA_MODEL') || 'llama3.2:1b';

    const prompt = request.systemPrompt
      ? `${request.systemPrompt}\n\n${request.prompt}`
      : request.prompt;

    const response = await axios.post<any>(
      `${ollamaUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 500,
        },
      },
      { timeout },
    );

    return {
      text: response.data.response,
      provider: 'ollama',
      model,
    };
  }

  /**
   * Get status of all providers
   */
  async healthCheck(): Promise<
    Record<string, { available: boolean; latency?: number; error?: string }>
  > {
    const status: Record<
      string,
      { available: boolean; latency?: number; error?: string }
    > = {};

    for (const provider of this.providers) {
      if (!provider.enabled) {
        status[provider.name] = { available: false, error: 'Disabled' };
        continue;
      }

      const startTime = Date.now();
      try {
        await this.callProvider(provider, {
          prompt: 'Hello',
          maxTokens: 10,
        });
        status[provider.name] = {
          available: true,
          latency: Date.now() - startTime,
        };
      } catch (error) {
        status[provider.name] = {
          available: false,
          latency: Date.now() - startTime,
          error: error.message,
        };
      }
    }

    return status;
  }

  /**
   * Force use specific provider (for testing)
   */
  async generateWithProvider(
    providerName: string,
    request: AIRequest,
  ): Promise<AIResponse> {
    const provider = this.providers.find((p) => p.name === providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    if (!provider.enabled) {
      throw new Error(`Provider ${providerName} is disabled`);
    }

    const startTime = Date.now();
    const response = await this.callProvider(provider, request);

    return {
      ...response,
      latency: Date.now() - startTime,
    };
  }

  /**
   * Helper: Sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
