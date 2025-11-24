import React, { useState } from 'react';
import { generateCarouselScript } from '../services/gemini';
import { Button } from './ui/Button';
import { PenTool, AlertCircle, FileText, Settings2, RotateCcw } from 'lucide-react';
import { Slide, SlideType } from '../types';

interface AIWriterProps {
  onScriptGenerated: (slides: Slide[]) => void;
}

const DEFAULT_PROMPT_TEMPLATE = `You are a social media expert. Create a {{count}}-slide Instagram carousel about: "{{topic}}".

Rules:
1. Slide 1 must be a hook/cover.
2. The last slide must be a call to action.
3. Keep titles short (max 5 words).
4. Keep body text punchy and minimal (max 20 words).

Return ONLY a JSON array of objects. Each object must have exactly two properties: "title" and "body".
Do not wrap in markdown code blocks. Just return the raw JSON string.`;

export const AIWriter: React.FC<AIWriterProps> = ({ onScriptGenerated }) => {
  const [topic, setTopic] = useState('');
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT_TEMPLATE);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setError(null);

    try {
      const apiKey = process.env.API_KEY; 
      if (!apiKey) throw new Error("API Key not found.");

      // Pass the custom prompt template to the service
      const script = await generateCarouselScript(apiKey, topic, 5, promptTemplate);
      
      // Convert script to slides
      const newSlides: Slide[] = script.map((item, index) => {
          let type = SlideType.CONTENT;
          if (index === 0) type = SlideType.COVER;
          if (index === script.length - 1) type = SlideType.END;
          
          return {
              id: Date.now().toString() + index,
              type,
              title: item.title,
              body: item.body,
          };
      });

      onScriptGenerated(newSlides);

    } catch (err: any) {
      setError(err.message || "Failed to generate script.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-green-500/20 rounded-lg">
            <PenTool className="w-6 h-6 text-green-400" />
        </div>
        <div>
            <h3 className="text-lg font-semibold text-white">AI Writer</h3>
            <p className="text-sm text-gray-400">Draft your carousel from a simple topic.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Topic or Rough Draft</label>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none resize-none h-24"
            placeholder="e.g. 5 tips for better sleep, or paste a rough paragraph here..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        {/* Settings Toggle */}
        <div className="border-t border-gray-800 pt-2">
           <button 
             onClick={() => setShowSettings(!showSettings)}
             className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors py-2"
           >
              <Settings2 className="w-3 h-3" />
              {showSettings ? 'Hide Instruction Settings' : 'Customize AI Instructions'}
           </button>

           {showSettings && (
             <div className="mt-2 p-3 bg-gray-800/50 border border-gray-700 rounded-lg space-y-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 font-medium">Prompt Template</label>
                    <button 
                        onClick={() => setPromptTemplate(DEFAULT_PROMPT_TEMPLATE)}
                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300"
                        title="Reset to default"
                    >
                        <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                </div>
                <textarea
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    className="w-full h-48 bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 font-mono focus:ring-1 focus:ring-green-500 focus:outline-none resize-y"
                />
                <div className="text-[10px] text-gray-500 leading-relaxed">
                   <p>Use <span className="text-gray-300 font-mono">{`{{topic}}`}</span> to insert your topic and <span className="text-gray-300 font-mono">{`{{count}}`}</span> for slide count (5).</p>
                   <p className="mt-1 text-orange-400/80">⚠️ Warning: Do not remove the JSON formatting instructions, or the app will fail to create slides.</p>
                </div>
             </div>
           )}
        </div>

        <Button 
            onClick={handleGenerate} 
            isLoading={loading} 
            disabled={!topic}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            icon={<FileText className="w-4 h-4" />}
        >
          Generate Content
        </Button>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-2 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
            <p>Tip: This will replace your current slides. Be sure to export any existing work first.</p>
        </div>
      </div>
    </div>
  );
};