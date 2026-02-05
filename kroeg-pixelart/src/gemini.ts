import fs from 'node:fs/promises';
import path from 'node:path';
import mime from 'mime';

export interface GeminiClientOptions {
  apiKey?: string;
}

export interface GeminiGenerationRequest {
  renderPath: string;
  stylePath?: string;
  prompt: string;
  outputPath: string;
}

export interface GeminiGenerationResult {
  outputPath: string;
  size: number;
}

interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

interface TextPart {
  text: string;
}

type Part = ImagePart | TextPart;

async function loadImageAsBase64(filePath: string): Promise<{ mimeType: string; data: string }> {
  const buffer = await fs.readFile(filePath);
  const mimeType = mime.getType(filePath) || 'application/octet-stream';
  return {
    mimeType,
    data: buffer.toString('base64'),
  };
}

export async function generateWithGemini(
  request: GeminiGenerationRequest,
  options: GeminiClientOptions = {}
): Promise<GeminiGenerationResult> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to use Gemini AI.');
  }

  // Dynamic import to avoid requiring the package if not using Gemini
  const { GoogleGenAI } = await import('@google/genai');

  const ai = new GoogleGenAI({ apiKey });

  const config = {
    responseModalities: ['IMAGE', 'TEXT'],
  };

  const model = 'gemini-2.0-flash-preview-image-generation';

  const parts: Part[] = [];

  // Add render image
  const renderData = await loadImageAsBase64(request.renderPath);
  parts.push({ inlineData: renderData });

  // Add style reference image if provided
  if (request.stylePath) {
    const styleData = await loadImageAsBase64(request.stylePath);
    parts.push({ inlineData: styleData });
  }

  // Add prompt
  parts.push({ text: request.prompt });

  const contents = [
    {
      role: 'user' as const,
      parts,
    },
  ];

  const response = await ai.models.generateContent({
    model,
    config,
    contents,
  });

  // Extract image from response
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('Gemini returned no candidates.');
  }

  const content = candidates[0].content;
  if (!content || !content.parts) {
    throw new Error('Gemini response missing content.');
  }

  // Find the image part in the response
  for (const part of content.parts) {
    if ('inlineData' in part && part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      await fs.mkdir(path.dirname(request.outputPath), { recursive: true });
      await fs.writeFile(request.outputPath, buffer);

      return {
        outputPath: request.outputPath,
        size: buffer.byteLength,
      };
    }
  }

  throw new Error('Gemini response did not contain an image.');
}
