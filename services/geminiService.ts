import { GoogleGenAI, LiveServerMessage, Modality, HarmBlockThreshold, HarmCategory } from "@google/genai";
import { Attachment, ChatMessage, Role, ModelMode, GroundingChunk } from "../types";
import { createPcmBlob, decode, decodeAudioData } from "./audioUtils";

const API_KEY = process.env.API_KEY || '';

class GeminiService {
  private client: GoogleGenAI;
  
  // Live Session State
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private audioSources = new Set<AudioBufferSourceNode>();
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: API_KEY });
  }

  // --- Standard Chat & Image Generation ---

  async *streamChat(
    history: ChatMessage[],
    newMessage: string,
    attachments: Attachment[],
    mode: ModelMode,
    systemInstruction: string,
    useGrounding: boolean
  ): AsyncGenerator<{ text: string; grounding?: GroundingChunk[]; generatedImage?: string }, void, unknown> {
    
    // --- IMAGE GENERATION MODE ---
    if (mode === ModelMode.IMAGE) {
        // Image generation doesn't support chat history or streaming in the same way.
        // We treat it as a single turn request.
        try {
            const response = await this.client.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { text: "Create a simple, high-contrast flowchart or diagram suitable for a legal presentation about: " + newMessage }
                    ]
                },
                config: {
                    imageConfig: {
                        aspectRatio: "16:9",
                        numberOfImages: 1
                    },
                    // Safety settings for image generation
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ]
                }
            });

            // Iterate parts to find the image
            const parts = response.candidates?.[0]?.content?.parts || [];
            let foundImage = false;
            
            for (const part of parts) {
                if (part.inlineData) {
                    const base64String = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    const imageUrl = `data:${mimeType};base64,${base64String}`;
                    yield { text: '', generatedImage: imageUrl };
                    foundImage = true;
                } else if (part.text) {
                     yield { text: part.text };
                }
            }
            
            if (!foundImage && parts.length === 0) {
                 yield { text: "[System: No visualization generated. Try describing the process step-by-step.]" };
            }

        } catch (e: any) {
            console.error("Image Gen Error:", e);
            yield { text: `[System Error: Failed to generate visual. ${e.message}]` };
        }
        return; 
    }

    // --- TEXT / CHAT MODE ---

    // Select Model
    let modelName = 'gemini-2.5-flash';
    if (mode === ModelMode.SMART) {
      modelName = 'gemini-3-pro-preview';
    }

    // 1. Filter out system messages
    const validHistory = history.filter(msg => msg.role === Role.USER || msg.role === Role.MODEL);

    // 2. Repair History (Ensure User -> Model -> User structure)
    const contents: any[] = [];
    let expectingUser = true;
    
    for (const msg of validHistory) {
        // Construct parts carefully
        const attachmentParts = (msg.attachments || []).map(att => ({
            inlineData: { mimeType: att.mimeType, data: att.data }
        }));
        
        const parts: any[] = [...attachmentParts];
        
        // Only add text part if it's not empty OR if there are no other parts
        if (msg.text.trim() !== '' || parts.length === 0) {
            parts.push({ text: msg.text || ' ' }); // Ensure never truly empty
        }

        if (msg.role === Role.USER) {
            if (!expectingUser) {
                // Missing model response for previous user turn
                contents.push({ role: 'model', parts: [{ text: "..." }] });
            }
            contents.push({ role: 'user', parts });
            expectingUser = false; 
        } else if (msg.role === Role.MODEL) {
            if (expectingUser) {
                // Orphan model message at start
                if (contents.length > 0) {
                     contents.push({ role: 'model', parts });
                     expectingUser = true;
                }
            } else {
                contents.push({ role: 'model', parts });
                expectingUser = true;
            }
        }
    }

    // Extract new message from history and Append SEARCH DIRECTIVE if grounding is on
    let messageContent = contents.pop();
    if (!messageContent) {
        // Fallback for new message construction
        const newParts = (attachments || []).map(att => ({
             inlineData: { mimeType: att.mimeType, data: att.data }
        }));
        
        let processedText = newMessage || ' ';
        if (useGrounding) {
            // FORCE SEARCH: Appending this invisible instruction forces the model to use the tool
            processedText += "\n\n[SYSTEM INSTRUCTION: Use Google Search to find specific State Forms, Legal Aid contact info, and recent changes to Child Support Guidelines for the user's location.]";
        }

        if (processedText.trim() !== '' || newParts.length === 0) {
             newParts.push({ text: processedText } as any);
        }
        messageContent = { role: 'user', parts: newParts };
    } else {
        // If message was popped from history, we still need to append the directive to the *current* request
        // The current request is always the last one.
        if (useGrounding) {
            // Find the text part and append
            const parts = messageContent.parts as any[];
            const textPartIndex = parts.findIndex(p => p.text);
            if (textPartIndex !== -1) {
                parts[textPartIndex].text += "\n\n[SYSTEM INSTRUCTION: Use Google Search to find specific State Forms, Legal Aid contact info, and recent changes to Child Support Guidelines for the user's location.]";
            } else {
                parts.push({ text: "\n\n[SYSTEM INSTRUCTION: Use Google Search to find specific State Forms, Legal Aid contact info, and recent changes to Child Support Guidelines for the user's location.]" });
            }
        }
    }

    // Config
    const config: any = {
      systemInstruction: systemInstruction,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    };

    if (mode === ModelMode.SMART) {
       config.thinkingConfig = { thinkingBudget: 1024 }; 
       config.maxOutputTokens = 8192;
    }

    if (useGrounding) {
        config.tools = [{ googleSearch: {} }];
    }

    // Using chat session with repaired history
    const chat = this.client.chats.create({
      model: modelName,
      history: contents,
      config: config
    });

    try {
        const result = await chat.sendMessageStream({
            message: messageContent.parts
        });

        for await (const chunk of result) {
            let text = '';
            let grounding: GroundingChunk[] | undefined;

            try {
                if (chunk.candidates && chunk.candidates.length > 0) {
                    const candidate = chunk.candidates[0];
                    if (candidate.finishReason === 'SAFETY') {
                        text = "\n\n[System: Response blocked by safety filters.]";
                    } else {
                         text = chunk.text || ''; 
                    }
                    grounding = candidate.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
                }
            } catch (e) {
                console.warn("Error accessing chunk text:", e);
            }
            
            if (text || grounding) {
                yield { text, grounding };
            }
        }
    } catch (e: any) {
        console.error("Gemini Stream Error:", e);
        yield { text: `\n\n[System Error: ${e.message || 'Connection failed'}]` };
    }
  }

  // --- Live API ---

  async startLiveSession(
    onAudioData: (isSpeaking: boolean) => void,
    onClose: () => void,
    onError: (err: any) => void
  ) {
    if (this.sessionPromise) return;

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.nextStartTime = 0;

    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: "You are a helpful, non-judgmental child support coach. You help parents practice what to say in court or to a mediator. Keep advice short, encouraging, and focused on de-escalation.",
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    };

    this.sessionPromise = this.client.live.connect({
      model: config.model,
      config: config.config,
      callbacks: {
        onopen: () => {
          console.log("Live session connected");
          this.initializeAudioInputStream();
        },
        onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && this.outputAudioContext) {
                onAudioData(true); // Visual indicator
                
                // Ensure time sync
                this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    this.outputAudioContext
                );

                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                const outputNode = this.outputAudioContext.createGain();
                outputNode.connect(this.outputAudioContext.destination);
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                    this.audioSources.delete(source);
                    if (this.audioSources.size === 0) {
                        onAudioData(false);
                    }
                });

                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.audioSources.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
                this.stopAudioPlayback();
                this.nextStartTime = 0;
            }
        },
        onclose: (e) => {
            console.log("Live session closed", e);
            onClose();
        },
        onerror: (e) => {
            console.error("Live session error", e);
            onError(e);
        }
      }
    });
  }

  private initializeAudioInputStream() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    this.mediaStreamSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        this.sessionPromise?.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
        });
    };

    this.mediaStreamSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private stopAudioPlayback() {
    this.audioSources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    this.audioSources.clear();
  }

  async stopLiveSession() {
    if (this.sessionPromise) {
        const session = await this.sessionPromise;
        session.close();
    }
    
    this.stopAudioPlayback();
    
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.inputAudioContext) await this.inputAudioContext.close();
    if (this.outputAudioContext) await this.outputAudioContext.close();
    
    this.sessionPromise = null;
    this.scriptProcessor = null;
    this.mediaStreamSource = null;
  }
}

export const geminiService = new GeminiService();