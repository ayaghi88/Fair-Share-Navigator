import React, { useState, useRef } from 'react';
import { Attachment } from '../types';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  disabled: boolean;
  onToggleLive: () => void;
  isLiveMode: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, disabled, onToggleLive, isLiveMode }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Explicitly cast to File[] as inference might result in unknown[] depending on TS config
      const files = Array.from(e.target.files) as File[];
      const newAttachments: Attachment[] = [];

      for (const file of files) {
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = (evt) => {
            const result = evt.target?.result as string;
            // result is data:mime;base64,data...
            const [meta, data] = result.split(',');
            const mimeType = meta.split(':')[1].split(';')[0];
            newAttachments.push({ mimeType, data, name: file.name });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative shrink-0">
               <div className="w-16 h-16 bg-gray-700 rounded-md border border-gray-600 flex items-center justify-center overflow-hidden">
                 {att.mimeType.startsWith('image/') ? (
                    <img src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover" />
                 ) : (
                    <span className="text-[10px] text-gray-300 uppercase">{att.mimeType.split('/')[1]}</span>
                 )}
               </div>
               <button 
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
               >
                 &times;
               </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3 max-w-5xl mx-auto">
        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          disabled={disabled}
          title="Add Files/Images"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={handleFileChange}
            accept="image/*,application/pdf,text/*"
        />

        {/* Text Area */}
        <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-700 focus-within:border-accent-500 transition-colors">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Shift+Enter for new line)"
            className="w-full bg-transparent text-white p-3 max-h-40 min-h-[50px] resize-none focus:outline-none scrollbar-hide"
            disabled={disabled}
            rows={1}
            style={{ height: 'auto', minHeight: '52px' }}
          />
        </div>

        {/* Send Button */}
        {text || attachments.length > 0 ? (
             <button
                onClick={handleSend}
                disabled={disabled}
                className="p-3 bg-accent-600 hover:bg-accent-500 text-white rounded-full shadow-lg transition-transform transform active:scale-95 disabled:opacity-50"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        ) : (
            /* Live Mode Button (Only shows when no text to prevent confusion) */
             <button
                onClick={onToggleLive}
                disabled={disabled}
                className={`p-3 rounded-full shadow-lg transition-all transform active:scale-95 ${
                    isLiveMode 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
                title="Start Live Voice Chat"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </button>
        )}
      </div>
    </div>
  );
};

export default InputArea;