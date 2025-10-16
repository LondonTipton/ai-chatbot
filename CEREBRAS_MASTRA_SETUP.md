# Cerebras + Mastra Integration Setup

This document explains how DeepCounsel has been configured to use Cerebras as the default AI provider through Mastra's agent system.

## Overview

The system now uses:

- **Cerebras Llama models** as the primary AI provider (ultra-fast inference)
- **Mastra agents** for enhanced legal AI capabilities
- **Load balancing** across multiple Cerebras API keys
- **Google Gemini** as fallback for image generation

## Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# Primary Cerebras API key (optional)
CEREBRAS_API_KEY=your_cerebras_api_key_here

# Cerebras keys for load balancing (at least one required)
CEREBRAS_API_KEY_85=your_key_1
CEREBRAS_API_KEY_86=your_key_2
CEREBRAS_API_KEY_87=your_key_3
CEREBRAS_API_KEY_88=your_key_4
CEREBRAS_API_KEY_89=your_key_5

# Google API key (for image generation only)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# Tavily for web search
TAVILY_API_KEY=your_tavily_api_key
```

### Get API Keys

1. **Cerebras**: Visit [https://inference.cerebras.ai/](https://inference.cerebras.ai/)
2. **Google AI Studio**: Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
3. **Tavily**: Visit [https://tavily.com](https://tavily.com)

## Model Configuration

### Cerebras Models Used

- **llama3.1-8b**: Fast general chat and simple tasks
- **llama3.1-70b**: Complex legal reasoning and analysis
- **llama3.2-11b-vision**: Document analysis with vision capabilities

### Model Assignments

- `chat-model`: Llama 3.1 8B (general chat)
- `chat-model-reasoning`: Llama 3.1 70B (advanced reasoning)
- `chat-model-image`: Llama 3.2 11B Vision (multimodal)
- `title-model`: Llama 3.1 8B (title generation)
- `artifact-model`: Llama 3.1 8B (artifact creation)

## Mastra Agents

Three specialized agents are configured:

### 1. Legal Research Agent

- **Model**: Llama 3.1 8B
- **Purpose**: General legal research and case law analysis
- **Tools**: Tavily web search

### 2. Advanced Legal Analysis Agent

- **Model**: Llama 3.1 70B
- **Purpose**: Complex constitutional analysis, multi-jurisdictional comparisons
- **Tools**: Tavily web search

### 3. Document Analysis Agent

- **Model**: Llama 3.2 11B Vision
- **Purpose**: Contract review, document analysis, OCR
- **Tools**: Tavily web search

## Key Features

### Load Balancing

- Automatic rotation across multiple API keys
- Intelligent failover when keys hit rate limits
- Cooldown periods for failed keys

### Performance Benefits

- **Ultra-fast inference**: Up to 1000+ tokens/second with Cerebras
- **Cost-effective**: Competitive pricing for high-volume usage
- **High availability**: Multiple key support prevents downtime

### Legal AI Capabilities

- Specialized legal research and analysis
- Current legal information through web search
- Document analysis with vision capabilities
- Multi-step reasoning for complex legal scenarios

## Usage

The system automatically selects the appropriate agent based on:

- Task complexity (general vs advanced)
- Content type (text vs documents)
- Keywords in user messages

No changes needed in your application code - the integration is transparent.

## Monitoring

Check the console logs for:

- `[Cerebras Balancer]` - Key rotation and health
- `[Providers]` - Provider initialization
- `[Mastra Integration]` - Agent execution

## Fallback Strategy

If Cerebras is unavailable:

1. System falls back to direct Cerebras provider
2. Google Gemini remains available for image generation
3. Error handling ensures graceful degradation

## Benefits for Legal AI

1. **Speed**: Ultra-fast responses for real-time legal consultation
2. **Accuracy**: Specialized legal agents with domain expertise
3. **Current Information**: Web search integration for up-to-date legal data
4. **Scalability**: Load balancing supports high-volume usage
5. **Cost-Effective**: Optimized model selection based on task complexity

## Troubleshooting

### Common Issues

#### "Unsupported JSON schema fields: {'maximum', 'minimum', 'format'}"

- **Fixed**: Removed `.min()`, `.max()`, and `.url()` constraints from Zod schemas
- **Solution**: Validation now happens in the execute functions with proper error handling
- **Note**: Cerebras has strict JSON schema requirements - avoid format validators like `.url()`, `.email()`, `.uuid()`

#### "No Cerebras API keys found"

- **Cause**: Missing API keys in environment
- **Solution**: Add at least one key (CEREBRAS_API_KEY or CEREBRAS_API_KEY_85-89)

#### "No output generated"

- **Cause**: API key issues or model unavailability
- **Solution**: Check API key validity and Cerebras service status

### Debug Logs

Monitor these log prefixes:

- `[Cerebras Balancer]` - Key rotation and health status
- `[Providers]` - Provider initialization success/failure
- `[DEBUG]` - Model usage and response details

### API Key Testing

Test your keys manually:

```bash
curl -X POST https://api.cerebras.ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1-8b","messages":[{"role":"user","content":"Hello"}]}'
```
