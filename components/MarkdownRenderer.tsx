import React from 'react';

interface Props {
  content: string;
}

const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  // Very basic parser to handle code blocks and paragraphs
  // Splitting by triple backticks for code blocks
  const parts = content.split(/```(\w+)?\n([\s\S]*?)```/g);

  return (
    <div className="text-gray-100 leading-relaxed space-y-2">
      {parts.map((part, index) => {
        if (index % 3 === 1) {
          // This is the language tag, we ignore it for now or use it for styling if we had a highlighter
          return null;
        }
        if (index % 3 === 2) {
          // This is the code content
          const language = parts[index - 1] || 'text';
          return (
            <div key={index} className="relative group my-4 rounded-md overflow-hidden bg-gray-950 border border-gray-700">
               <div className="bg-gray-800 px-4 py-1 text-xs text-gray-400 font-mono uppercase border-b border-gray-700 flex justify-between">
                  <span>{language}</span>
                  <span className="text-gray-500">Code Block</span>
               </div>
              <pre className="p-4 overflow-x-auto text-sm font-mono text-green-400">
                <code>{part}</code>
              </pre>
            </div>
          );
        }
        // This is regular text
        // Split by newlines to handle paragraphs
        const lines = part.split('\n');
        return (
            <div key={index}>
                {lines.map((line, i) => {
                    // Simple bold parsing
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    if (line.trim() === '') return <div key={i} className="h-2"></div>;
                    
                    return (
                        <p key={i} className="min-h-[1.5em]">
                            {parts.map((p, j) => (
                                j % 2 === 1 ? <strong key={j} className="text-white font-bold">{p}</strong> : p
                            ))}
                        </p>
                    )
                })}
            </div>
        )
      })}
    </div>
  );
};

export default MarkdownRenderer;
