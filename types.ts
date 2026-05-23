import { Modality } from "@google/genai";

export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export enum ModelMode {
  FAST = 'fast',      // gemini-2.5-flash
  SMART = 'smart',    // gemini-3-pro-preview (Reasoning)
  IMAGE = 'image',    // gemini-2.5-flash-image (Generation)
  LIVE = 'live',      // gemini-2.5-flash-native-audio-preview
}

export interface Attachment {
  mimeType: string;
  data: string; // base64
  name?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
  groundingSources?: GroundingChunk[];
  thinking?: boolean;
  generatedImage?: string; // data uri
}

export interface AppState {
  messages: ChatMessage[];
  isThinking: boolean;
  mode: ModelMode;
  systemInstruction: string;
  useGrounding: boolean; // Search
}