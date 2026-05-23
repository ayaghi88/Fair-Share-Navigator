import React, { useRef, useEffect } from 'react';
import { ChatMessage, Role, GroundingChunk } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isThinking: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isThinking }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 px-4 text-center">
           <svg className="w-24 h-24 mb-4 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           <p className="text-lg font-medium text-gray-300">FairShare Navigator</p>
           <h2 className="text-2xl font-bold text-white mt-1 mb-2">Build Your Plan. Protect Your Rights.</h2>
           <p className="text-sm max-w-md">
               Tell me your state, your arrears amount, or your current struggle. We will build a step-by-step plan to get you back on track, avoid jail, and find peace.
           </p>
           <p className="text-xs mt-4 text-gray-600 uppercase tracking-widest">
               Private • Strategic • Non-Judgmental
           </p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex w-full ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-lg ${
              msg.role === Role.USER
                ? 'bg-accent-600 text-white rounded-br-none'
                : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
            }`}
          >
            {/* Attachments */}
            {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {msg.attachments.map((att, i) => (
                        <div key={i} className="relative group">
                            {att.mimeType.startsWith('image/') ? (
                                <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-32 h-32 object-cover rounded-lg border border-gray-600" />
                            ) : (
                                <div className="w-32 h-32 bg-gray-700 flex items-center justify-center rounded-lg border border-gray-600">
                                    <span className="text-xs uppercase text-gray-400 font-mono">{att.mimeType.split('/')[1]}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Generated Image */}
            {msg.generatedImage && (
                <div className="mb-4">
                    <img 
                        src={msg.generatedImage} 
                        alt="Generated Content" 
                        className="w-full h-auto rounded-lg border border-gray-600 shadow-md" 
                    />
                    <div className="mt-2 text-xs text-gray-400 italic text-right">Process Visualization</div>
                </div>
            )}

            {/* Message Content */}
            {msg.text && (
                <div className="prose prose-invert max-w-none text-sm md:text-base">
                   <MarkdownRenderer content={msg.text} />
                </div>
            )}

            {/* Grounding Sources */}
            {msg.groundingSources && msg.groundingSources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600/50">
                    <p className="text-xs text-gray-400 mb-1 font-semibold flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Legal Resources & Forms
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {msg.groundingSources.map((source, idx) => {
                            if (!source.web?.uri) return null;
                            return (
                                <a 
                                    key={idx} 
                                    href={source.web.uri} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs bg-gray-900/50 hover:bg-gray-900 text-accent-500 px-2 py-1 rounded transition-colors truncate max-w-[200px]"
                                >
                                    {source.web.title || new URL(source.web.uri).hostname}
                                </a>
                            )
                        })}
                    </div>
                </div>
            )}
          </div>
        </div>
      ))}

      {isThinking && (
        <div className="flex justify-start w-full">
            <div className="bg-gray-800 rounded-2xl rounded-bl-none p-4 border border-gray-700 flex items-center gap-3">
                <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse delay-150"></div>
                <span className="text-xs text-gray-400 font-mono">BUILDING STRATEGY</span>
            </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatInterface;