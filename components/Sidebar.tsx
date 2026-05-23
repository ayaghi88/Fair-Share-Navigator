import React from 'react';
import { ModelMode } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ModelMode;
  onModeChange: (mode: ModelMode) => void;
  useGrounding: boolean;
  onGroundingChange: (val: boolean) => void;
  systemInstruction: string;
  onSystemInstructionChange: (val: string) => void;
  onClearHistory: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen, onClose, currentMode, onModeChange,
  useGrounding, onGroundingChange,
  systemInstruction, onSystemInstructionChange,
  onClearHistory
}) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}
      
      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-gray-900 border-r border-gray-800 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static flex flex-col h-full`}>
        {/* Header */}
        <div className="p-6 pb-2">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">FairShare</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Support Navigator</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-8 custom-scrollbar">
            {/* Modes */}
            <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Strategy Mode</h3>
                <div className="space-y-2">
                    <button 
                        onClick={() => onModeChange(ModelMode.FAST)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${currentMode === ModelMode.FAST ? 'bg-accent-600/20 border-accent-500 text-white' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-750'}`}
                    >
                        <div className="font-medium">Quick Guidance</div>
                        <div className="text-[10px] opacity-70">Licensing, Garnishment rules</div>
                    </button>
                    <button 
                        onClick={() => onModeChange(ModelMode.SMART)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${currentMode === ModelMode.SMART ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-750'}`}
                    >
                        <div className="font-medium">Exit Strategy</div>
                        <div className="text-[10px] opacity-70">Deep planning, Arrears reduction</div>
                    </button>
                    <button 
                        onClick={() => onModeChange(ModelMode.IMAGE)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${currentMode === ModelMode.IMAGE ? 'bg-pink-600/20 border-pink-500 text-white' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-750'}`}
                    >
                        <div className="font-medium">Process Maps</div>
                        <div className="text-[10px] opacity-70">Visual guides for court processes</div>
                    </button>
                </div>
            </div>

            {/* Grounding Toggle */}
            <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Resources</h3>
                <label className="flex items-center justify-between p-3 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-750 border border-gray-700">
                    <span className="text-sm text-gray-200">Locate Local Aide</span>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${useGrounding ? 'bg-accent-500' : 'bg-gray-600'}`}>
                       <input type="checkbox" checked={useGrounding} onChange={(e) => onGroundingChange(e.target.checked)} className="hidden" />
                       <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${useGrounding ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                </label>
                <p className="text-[10px] text-gray-500 mt-2 px-1">
                    Searches for state-specific forms, local legal aid offices, and pro bono lawyers in your area.
                </p>
            </div>

            {/* Custom Instruction */}
            <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">My Situation</h3>
                <textarea 
                    className="w-full bg-gray-800 text-sm text-gray-200 p-3 rounded-xl border border-gray-700 focus:border-accent-500 focus:outline-none resize-none h-32"
                    placeholder="e.g., 'I live in Texas, owe $5k in arrears, and my license is suspended. I just lost my job.'"
                    value={systemInstruction}
                    onChange={(e) => onSystemInstructionChange(e.target.value)}
                />
            </div>
        </div>

        {/* Footer (Fixed at bottom) */}
        <div className="p-6 border-t border-gray-800 bg-gray-900 space-y-3 z-10">
             <button 
                onClick={onClose}
                className="w-full bg-accent-600 hover:bg-accent-500 text-white font-medium py-3 rounded-xl transition-colors shadow-lg active:scale-95 transform"
            >
                Update Strategy
            </button>

            <button 
                onClick={onClearHistory}
                className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 py-2 hover:bg-red-900/20 rounded-lg transition-colors text-xs"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Clear Session
            </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;