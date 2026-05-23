import React, { useState, useCallback } from 'react';
import { geminiService } from './services/geminiService';
import { AppState, ChatMessage, Role, ModelMode, Attachment } from './types';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import InputArea from './components/InputArea';
import LiveModeOverlay from './components/LiveModeOverlay';

const DEFAULT_SUPPORT_INSTRUCTION = `You are FairShare, a compassionate but highly strategic expert in Child Support navigation and Family Law.
Your mission is to help non-custodial parents (NCPs) and payers navigate the system fairly, avoid jail, reduce arrears, and ultimately achieve financial stability and peace.

YOUR CORE PROTOCOLS:
1. **LOCATION FIRST**: Laws vary by state. If the user hasn't specified a location, ask for their State/County immediately.
2. **MODIFICATION IS KEY**: Teach users about "Substantial Change in Circumstances". Guide them on how to file a "Motion for Modification" if their income has dropped.
3. **ARREARS MANAGEMENT**:
   - Explain specific state programs for "Compromise of Arrears" (specifically for state-owed debt).
   - Explain how to request a "Payment Plan" to stop license suspension.
4. **JAIL AVOIDANCE**:
   - Educate them on "Ability to Pay" hearings.
   - Explain that jail is for *willful* non-payment. Teach them how to document their inability to pay so they are not held in contempt.
5. **THE "GET OFF" PLAN**:
   - If they want off, explain: Emancipation ages, termination of orders, or engaging in a "Stipulated Agreement" with the other parent to handle support directly (if state allows).
   - Promote "Co-parenting vs. War". Explain that reducing conflict often leads to the other parent being more willing to work outside the system.
6. **LEGAL AID**: Use Google Search to find specific "Legal Aid Society" or "Pro Bono Family Law" resources in their zip code.
7. **TONE**: Empowering, non-judgmental, strategic, and strictly factual. Do not give false hope, but provide a clear path forward.`;

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveModeActive, setLiveModeActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  
  const [appState, setAppState] = useState<AppState>({
    messages: [],
    isThinking: false,
    mode: ModelMode.SMART, // Default to Smart for detailed planning
    systemInstruction: DEFAULT_SUPPORT_INSTRUCTION,
    useGrounding: true // Essential for finding local forms/legal aid
  });

  const handleSendMessage = useCallback(async (text: string, attachments: Attachment[]) => {
    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: Role.USER,
      text,
      attachments,
      timestamp: Date.now()
    };

    setAppState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isThinking: true
    }));

    // 2. Prepare Model Message Stub
    const modelMsgId = (Date.now() + 1).toString();
    
    // 3. Stream Response
    try {
      const stream = geminiService.streamChat(
        appState.messages.concat(userMsg), // Use current history including new message
        text, // Current text
        attachments,
        appState.mode,
        appState.systemInstruction,
        appState.useGrounding
      );

      let fullText = '';
      let collectedGrounding: any[] = [];
      let generatedImageUri: string | undefined;

      for await (const chunk of stream) {
        if (chunk.text) fullText += chunk.text;
        
        if (chunk.grounding) {
            collectedGrounding = [...collectedGrounding, ...chunk.grounding];
        }
        
        if (chunk.generatedImage) {
            generatedImageUri = chunk.generatedImage;
        }

        setAppState(prev => {
           const existingMessages = prev.messages;
           const isLastModel = existingMessages[existingMessages.length - 1]?.id === modelMsgId;
           
           const newMsg: ChatMessage = {
               id: modelMsgId,
               role: Role.MODEL,
               text: fullText,
               timestamp: Date.now(),
               groundingSources: collectedGrounding.length > 0 ? collectedGrounding : undefined,
               isStreaming: true,
               generatedImage: generatedImageUri
           };

           if (isLastModel) {
               // Update existing
               return {
                   ...prev,
                   isThinking: false, // Started streaming, so not just "thinking" anymore
                   messages: [...existingMessages.slice(0, -1), newMsg]
               };
           } else {
               // Append new
               return {
                   ...prev,
                   isThinking: false,
                   messages: [...existingMessages, newMsg]
               };
           }
        });
      }
    } catch (error) {
        console.error(error);
        setAppState(prev => ({
            ...prev,
            isThinking: false,
            messages: [...prev.messages, {
                id: Date.now().toString(),
                role: Role.SYSTEM,
                text: "Error accessing support database. Please check connection.",
                timestamp: Date.now()
            }]
        }));
    }
  }, [appState.messages, appState.mode, appState.systemInstruction, appState.useGrounding]);

  const toggleLiveMode = useCallback(async () => {
     if (liveModeActive) {
         // Stop
         await geminiService.stopLiveSession();
         setLiveModeActive(false);
         setIsModelSpeaking(false);
     } else {
         // Start
         setLiveModeActive(true);
         try {
             await geminiService.startLiveSession(
                 (speaking) => setIsModelSpeaking(speaking),
                 () => setLiveModeActive(false), // On Close
                 (err) => { // On Error
                     console.error(err);
                     setLiveModeActive(false);
                     alert("Voice Coach failed to connect.");
                 }
             );
         } catch (e) {
             setLiveModeActive(false);
         }
     }
  }, [liveModeActive]);

  return (
    <div className="flex h-screen w-full bg-gray-950 overflow-hidden text-gray-100 font-sans">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        currentMode={appState.mode}
        onModeChange={(m) => setAppState(prev => ({...prev, mode: m}))}
        useGrounding={appState.useGrounding}
        onGroundingChange={(g) => setAppState(prev => ({...prev, useGrounding: g}))}
        systemInstruction={appState.systemInstruction}
        onSystemInstructionChange={(s) => setAppState(prev => ({...prev, systemInstruction: s}))}
        onClearHistory={() => setAppState(prev => ({...prev, messages: []}))}
      />

      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold">FairShare</span>
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Chat Area */}
        <ChatInterface 
            messages={appState.messages} 
            isThinking={appState.isThinking}
        />

        {/* Input Area */}
        <InputArea 
            onSendMessage={handleSendMessage} 
            disabled={appState.isThinking || liveModeActive}
            onToggleLive={toggleLiveMode}
            isLiveMode={liveModeActive}
        />

        {/* Live Overlay */}
        {liveModeActive && (
            <LiveModeOverlay 
                onClose={toggleLiveMode}
                isModelSpeaking={isModelSpeaking}
            />
        )}
      </div>
    </div>
  );
};

export default App;