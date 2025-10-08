# NanoBanana Image Generation Model Setup

## Overview

Added "NanoBanana" as a new model option for image generation using Gemini 2.5 Flash with image generation capabilities.

## Changes Made

### 1. Model Configuration (`lib/ai/models.ts`)

- Renamed "Gemini Flash" → "Tsukiyo"
- Renamed "Gemini Thinking" → "Jacana"
- Added new model: "NanoBanana" (chat-model-image)

### 2. Provider Configuration (`lib/ai/providers.ts`)

- Added `chat-model-image` using `gemini-2.5-flash` model
- Configured to work alongside existing Gemini models

### 3. Schema Updates (`app/(chat)/api/chat/schema.ts`)

- Updated `selectedChatModel` enum to include "chat-model-image"

### 4. Prompts (`lib/ai/prompts.ts`)

- Added `imageGenerationPrompt` for NanoBanana model
- Updated `systemPrompt` function to use image generation prompt when NanoBanana is selected
- Configured to accept image uploads and generate images as artifacts

### 5. Image Artifact Handler (`artifacts/image/server.ts`)

- Created new server-side handler for image generation
- Uses `experimental_generateImage` from AI SDK
- Generates images using the `imagen-3.0-generate-001` model
- Returns base64-encoded images
- Supports both creation and updates

### 6. Artifact System (`lib/artifacts/server.ts`)

- Added "image" to `artifactKinds` array
- Imported and registered `imageDocumentHandler`

## How It Works

1. **User selects NanoBanana** from the model selector
2. **User provides image description** or uploads an image for reference
3. **Model processes the request** using the image generation prompt
4. **createDocument tool is called** with `kind: "image"`
5. **Image is generated** using Imagen 3.0
6. **Image appears as artifact** in the artifact panel (base64-encoded)

## Features

- **Text-to-Image**: Generate images from text descriptions
- **Image Upload Support**: Accept image uploads for reference or editing
- **Artifact Display**: Images appear in the artifact panel
- **Version History**: Track different versions of generated images
- **Copy to Clipboard**: Built-in action to copy images

## Model Details

- **Model ID**: `chat-model-image`
- **Display Name**: NanoBanana
- **Backend Model**: `gemini-2.5-flash`
- **Image Generator**: `imagen-3.0-generate-001`
- **Capabilities**:
  - Text-to-image generation
  - Image upload and processing
  - Multimodal understanding

## Usage Example

1. Select "NanoBanana" from the model selector
2. Type: "Create an image of a serene mountain landscape at sunset"
3. The model will generate the image and display it in the artifact panel
4. You can then ask for variations or modifications

## Notes

- Images are generated as base64-encoded PNG data
- The image artifact client (`artifacts/image/client.tsx`) was already configured
- Image uploads are supported through the existing multimodal input system
- The model uses the same tools (createDocument, updateDocument) as other artifact types
