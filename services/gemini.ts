import { GoogleGenAI } from "@google/genai";

// Helper to get the AI client. 
// IMPORTANT: For High-end models (Veo, Gemini 3 Pro Image), we strictly follow the guide to use window.aistudio
// However, for the initialization in code, we use the process.env.API_KEY if available, 
// but the component layer will handle the interactive key selection flow.

const getClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URL prefix for API
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateImage = async (
  apiKey: string,
  prompt: string,
  size: '1K' | '2K' | '4K',
  aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' = '1:1',
  referenceImageBase64?: string
): Promise<string> => {
  const ai = getClient(apiKey);
  
  // Logic: 
  // If reference image -> Use gemini-2.5-flash-image (Editing/Variation) which supports image input.
  // If no reference -> Use gemini-3-pro-image-preview (High Quality Generation) for pure text-to-image.
  const isEditing = !!referenceImageBase64;
  const model = isEditing ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

  const parts: any[] = [];

  if (isEditing && referenceImageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/png', // Simplification: Assume PNG/JPEG compatible base64
        data: referenceImageBase64,
      },
    });
  }

  parts.push({ text: prompt });

  const config: any = {};
  
  if (isEditing) {
    // gemini-2.5-flash-image supports aspectRatio but not imageSize
    config.imageConfig = { aspectRatio };
  } else {
    // gemini-3-pro-image-preview supports both
    config.imageConfig = {
      aspectRatio: aspectRatio,
      imageSize: size,
    };
  }

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: parts,
    },
    config: config,
  });

  // Parse response
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64EncodeString = part.inlineData.data;
      return `data:image/png;base64,${base64EncodeString}`;
    }
  }
  throw new Error("No image generated.");
};

export const generateVideo = async (
  apiKey: string,
  imageFile: File,
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '9:16'
): Promise<string> => {
  const ai = getClient(apiKey);
  const model = 'veo-3.1-fast-generate-preview';

  // Convert File to Base64
  const base64Data = await fileToBase64(imageFile);
  const mimeType = imageFile.type;

  let operation = await ai.models.generateVideos({
    model,
    prompt: prompt || "Animate this image cinematically",
    image: {
      imageBytes: base64Data,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p', // Veo fast preview usually supports 720p or 1080p
      aspectRatio: aspectRatio
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed");

  // Fetch the actual video bytes to create a blob URL for the browser
  const videoResponse = await fetch(`${videoUri}&key=${apiKey}`);
  const videoBlob = await videoResponse.blob();
  return URL.createObjectURL(videoBlob);
};

export const generateCarouselScript = async (
  apiKey: string,
  topic: string,
  count: number = 7,
  promptTemplate?: string
): Promise<Array<{ title: string; body: string }>> => {
  const ai = getClient(apiKey);
  const model = 'gemini-2.5-flash';

  let prompt = promptTemplate;

  if (!prompt) {
    // Default Persona: Viral Content Creator with Deep Narrative Structure
    prompt = `Role: You are a specialist in creating viral Instagram carousels.
    Task: Create a {{count}}-slide carousel script about: "{{topic}}".

    Narrative Structure:
    1. Slide 1 (The Hook): A curiosity-inducing question, strong statement, or specific promise.
    2. Slide 2 (Context): Situate the problem specifically for the target audience.
    3. Slide 3 (Agitation): Deepen the pain point to create emotional identification.
    4. Slides 4 to {{count}}-1 (The Solution): Actionable steps, frameworks, or specific insights.
    5. Slide {{count}} (CTA): A clear directive to Save, Share, or Comment.

    Style Rules:
    - Tone: Authoritative yet accessible.
    - Mental Triggers: Use curiosity and reciprocity.
    - Visuals: Use emojis intentionally to reinforce the message.
    - Titles: Short & punchy (Max 7 words).
    - Body: Clean & minimalist (Max 30 words). Use <b>bold</b> for key insights.

    Output Format:
    Return ONLY a raw JSON array of objects.
    Each object must have exactly: "title" and "body".
    NO markdown formatting (no \`\`\`json).`;
  }

  // Replace placeholders with actual values
  // We use regex with global flag to replace all instances
  prompt = prompt.replace(/{{topic}}/g, topic).replace(/{{count}}/g, count.toString());

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  const text = response.text || "[]";
  
  try {
    // Clean up if model accidentally wraps in markdown
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON", text);
    throw new Error("Failed to generate valid script.");
  }
};

export const refineText = async (
  apiKey: string,
  text: string,
  type: 'shorten' | 'expand' | 'punchy' | 'fix',
  useEmojis: boolean = true
): Promise<string> => {
  const ai = getClient(apiKey);
  const model = 'gemini-2.5-flash';

  let instruction = "";
  switch (type) {
    case 'shorten': instruction = "Shorten this text significantly while keeping the meaning. Be concise."; break;
    case 'expand': instruction = "Expand this text into multiple paragraphs if necessary. Add detail and context suitable for an educational slide."; break;
    case 'punchy': instruction = "Make this text punchy, impactful, and persuasive. Use strong verbs."; break;
    case 'fix': instruction = "Fix any grammar or spelling errors in this text. Return the corrected text only."; break;
  }

  const emojiInstruction = useEmojis 
    ? "Include relevant emojis to enhance engagement." 
    : "STRICTLY NO EMOJIS.";

  const prompt = `
  Role: Professional Copy Editor.
  
  Task: Rewrite the input text based on the following instruction: "${instruction}"
  
  Constraint Checklist & Confidence Score:
  1. ${emojiInstruction}
  2. Use HTML tags <b>text</b> for bolding key phrases (DO NOT use markdown **).
  3. Use HTML tags <mark>text</mark> for highlighting important words.
  4. Automatically apply bold and highlight to the most important parts for visual hierarchy.
  5. Use \\n (newlines) to separate paragraphs if the text is long.
  
  Input Text: "${text}"
  
  Output (Return ONLY the refined text, no preamble):
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text?.trim() || text;
};

export const generatePostCaption = async (
  apiKey: string,
  slides: Array<{ title: string; body: string }>
): Promise<string> => {
  const ai = getClient(apiKey);
  const model = 'gemini-2.5-flash';

  const slidesContent = slides.map((s, i) => `Slide ${i + 1}: ${s.title} - ${s.body}`).join('\n');

  const prompt = `
    Based on the following carousel slides content, write an engaging Instagram caption.
    
    Slides Content:
    ${slidesContent}
    
    Requirements:
    - Friendly and professional tone.
    - Start with a hook.
    - Include a call to action at the end.
    - Add 5-10 relevant hashtags.
    - Keep it under 150 words.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || "";
};