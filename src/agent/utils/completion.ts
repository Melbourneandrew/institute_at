import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { z } from 'zod';
import { createLLMClient } from "llm-polyglot";
import Instructor from "@instructor-ai/instructor";
import { zodResponseFormat } from "openai/helpers/zod";

const apiKeyMap: Record<string, string | undefined> = {
    'https://api.openai.com/v1': process.env.OPENAI_API_KEY,
    'https://api.anthropic.com/v1/messages': process.env.ANTHROPIC_API_KEY,
    'https://generativelanguage.googleapis.com/v1beta/openai': process.env.GEMINI_API_KEY,
    'https://api.deepseek.com': process.env.DEEPSEEK_API_KEY,
    'https://api.mistral.ai/v1': process.env.MISTRAL_API_KEY,
    'https://api.groq.com/openai/v1': process.env.GROQ_API_KEY,
}

// Map URLs to their respective structured completion functions
const providerMap: Record<string, Function> = {
    'https://api.openai.com/v1': getStructuredCompletionOpenAI,
    'https://api.anthropic.com/v1/messages': getStructuredCompletionAnthropic,
    'https://generativelanguage.googleapis.com/v1beta/openai': getStructuredCompletionOpenAI,
    'https://api.deepseek.com': getStructuredCompletionOpenAI,
    'https://api.mistral.ai/v1': getStructuredCompletionOpenAI,
    'https://api.groq.com/openai/v1': getStructuredCompletionGroq,
    'default': getStructuredCompletionOpenAI
};

export async function getStructuredCompletion<T extends z.ZodType>(
    messages: ChatCompletionMessageParam[],
    schema: T,
    model: string,
    baseUrl: string,
    schemaName: string = "structured_output"
): Promise<z.infer<T>> {
    console.log('🔍 Getting structured completion for:', baseUrl);

    const apiKey = apiKeyMap[baseUrl];
    if (!apiKey) {
        throw new Error(`No API key found for URL: ${baseUrl}`);
    }

    const provider = providerMap[baseUrl] || providerMap.default;
    return provider(messages, schema, model, baseUrl, apiKey, schemaName);
}

async function getStructuredCompletionAnthropic<T extends z.ZodType>(
    messages: ChatCompletionMessageParam[],
    schema: T,
    model: string,
    baseUrl: string,
    apiKey: string,
    schemaName: string
): Promise<z.infer<T>> {
    const anthropicClient = createLLMClient({
        provider: "anthropic",
        apiKey
    });
    const client = Instructor<typeof anthropicClient>({
        client: anthropicClient,
        mode: "TOOLS"
    });

    const completion = await client.chat.completions.create({
        model,
        messages,
        response_model: {
            schema: schema as unknown as z.ZodObject<any>,
            name: schemaName
        },
        max_tokens: 2000,
    });

    return completion;
}

async function getStructuredCompletionGroq<T extends z.ZodType>(
    messages: ChatCompletionMessageParam[],
    schema: T,
    model: string,
    baseUrl: string,
    apiKey: string,
    schemaName: string
): Promise<z.infer<T>> {
    const openai = new OpenAI({
        baseURL: baseUrl,
        apiKey,
    });
    const client = Instructor({
        client: openai,
        mode: "TOOLS"
    });

    const completion = await client.chat.completions.create({
        model,
        messages,
        response_model: {
            schema: schema as unknown as z.ZodObject<any>,
            name: schemaName
        },
        max_tokens: 2000,
    });

    return completion;
}

async function getStructuredCompletionOpenAI<T extends z.ZodType>(
    messages: ChatCompletionMessageParam[],
    schema: T,
    model: string,
    baseUrl: string,
    apiKey: string,
    schemaName: string
): Promise<z.infer<T>> {
    const openai = new OpenAI({
        apiKey,
        baseURL: baseUrl,
    });

    const completion = await openai.beta.chat.completions.parse({
        model,
        messages,
        response_format: zodResponseFormat(schema, schemaName),
    });

    return completion.choices[0].message.parsed;
}