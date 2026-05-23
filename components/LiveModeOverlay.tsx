import React from 'react';

interface LiveModeOverlayProps {
  onClose: () => void;
  isModelSpeaking: boolean;
}

const LiveModeOverlay: React.FC<LiveModeOverlayProps> = ({ onClose, isModelSpeaking }) => {
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center animate-fadeIn">
      <div className="absolute top-6 right-6">
        <button onClick={onClose} className="p-4 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      <div className="text-center space-y-8">
        <h2 className="text-2xl text-gray-400 tracking-widest uppercase">Live Voice Mode</h2>
        
        {/* Visualizer */}
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Base Circle */}
            <div className="absolute w-32 h-32 bg-accent-600 rounded-full blur-xl opacity-20"></div>
            
            {/* Animated Circles based on state */}
            {isModelSpeaking ? (
                 <>
                    <div className="absolute w-40 h-40 border-2 border-accent-500 rounded-full animate-ping opacity-50"></div>
                    <div className="absolute w-56 h-56 border border-accent-400 rounded-full animate-pulse opacity-30"></div>
                    <div className="relative w-32 h-32 bg-gradient-to-tr from-accent-600 to-purple-600 rounded-full shadow-[0_0_50px_rgba(59,130,246,0.5)] animate-bounce flex items-center justify-center">
                        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.536 8.464a5 5 0 000 7.072m-2.828-9.9a9 9 0 000 12.728M12 12h.01" />
                        </svg>
                    </div>
                 </>
            ) : (
                <div className="relative w-32 h-32 bg-gray-800 rounded-full border-4 border-gray-700 flex items-center justify-center">
                     <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>
            )}
        </div>

        <p className="text-gray-500 text-sm">
            {isModelSpeaking ? "Nexus AI is speaking..." : "Listening..."}
        </p>
      </div>
    </div>
  );
};

export default LiveModeOverlay;