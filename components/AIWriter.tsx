import React, { useState } from 'react';
import { generateCarouselScript } from '../services/gemini';
import { Button } from './ui/Button';
import { PenTool, AlertCircle, FileText, Settings2, RotateCcw } from 'lucide-react';
import { Slide, SlideType } from '../types';

interface AIWriterProps {
  onScriptGenerated: (slides: Slide[]) => void;
}

const DEFAULT_PROMPT_TEMPLATE = `Role: You are a specialist in creating viral Instagram carousels.
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
      const script = await generateCarouselScript(apiKey, topic, 7, promptTemplate); // Defaulting to 7 slides for better narrative depth
      
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
            <p className="text-sm text-gray-400">Draft viral carousels with a structured narrative.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Topic / Target Audience</label>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none resize-none h-24"
            placeholder="e.g. 'Productivity for ADHD Entrepreneurs' or 'How to bake sourdough for beginners'..."
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
                   <p>Use <span className="text-gray-300 font-mono">{`{{topic}}`}</span> to insert your topic and <span className="text-gray-300 font-mono">{`{{count}}`}</span> for slide count.</p>
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
          Generate Narrative
        </Button>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-2 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
            <p>Tip: This generates ~7 slides with a Hook > Context > Solution > CTA structure.</p>
        </div>
      </div>
    </div>
  );
};