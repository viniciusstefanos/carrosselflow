import React, { useState } from 'react';
import { generateImage, fileToBase64 } from '../services/gemini';
import { Button } from './ui/Button';
import { Image as ImageIcon, Download, Copy, AlertCircle, Sparkles, Upload, X, Check } from 'lucide-react';

interface AIImageGeneratorProps {
  onAssetGenerated: (url: string) => void;
}

export const AIImageGenerator: React.FC<AIImageGeneratorProps> = ({ onAssetGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Reference Image State
  const [refImageFile, setRefImageFile] = useState<File | null>(null);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRefImageFile(file);
      setRefImagePreview(URL.createObjectURL(file));
    }
  };

  const clearRefImage = () => {
    setRefImageFile(null);
    setRefImagePreview(null);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);

    try {
      // Check for API Key selection for high-end models
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
        }
      }

      const apiKey = process.env.API_KEY; 
      if (!apiKey) {
          throw new Error("API Key not available. Please select a paid API key.");
      }

      let refBase64: string | undefined = undefined;
      if (refImageFile) {
          refBase64 = await fileToBase64(refImageFile);
      }

      const url = await generateImage(apiKey, prompt, size, '1:1', refBase64);
      setGeneratedUrl(url);
      
      // Removed auto-call, user must explicitly click "Use as Background" to avoid overwriting accidentally
    } catch (err: any) {
      setError(err.message || "Failed to generate image.");
      if (err.message?.includes("Requested entity was not found") && window.aistudio) {
          // Reset key flow
          await window.aistudio.openSelectKey();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
            <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        <div>
            <h3 className="text-lg font-semibold text-white">AI Image Studio</h3>
            <p className="text-sm text-gray-400">Generate (Pro) or Edit (Flash) images.</p>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* Reference Image Upload */}
        <div>
           <label className="block text-sm font-medium text-gray-300 mb-2">Reference / Edit Image (Optional)</label>
           {refImagePreview ? (
             <div className="relative rounded-lg overflow-hidden border border-gray-700 w-full h-32 group">
                <img src={refImagePreview} alt="Reference" className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <button onClick={clearRefImage} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
             </div>
           ) : (
             <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-purple-500 transition-colors relative cursor-pointer group">
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center text-gray-400 group-hover:text-purple-400 transition-colors">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs">Upload image to edit</span>
                </div>
             </div>
           )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
             {refImageFile ? 'Editing Instructions' : 'Prompt'}
          </label>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none h-24"
            placeholder={refImageFile ? "E.g., Add a futuristic neon city background..." : "Describe the image you want..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {!refImageFile && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Resolution (Pro Model)</label>
            <div className="flex gap-2">
              {(['1K', '2K', '4K'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    size === s
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button 
            onClick={handleGenerate} 
            isLoading={loading} 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            icon={<ImageIcon className="w-4 h-4" />}
        >
          {refImageFile ? 'Edit Image' : 'Generate Image'}
        </Button>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-2 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
            {error.includes("API Key") && (
                 <button 
                    onClick={() => window.aistudio?.openSelectKey()} 
                    className="underline ml-2 hover:text-white"
                 >
                    Select Key
                 </button>
            )}
          </div>
        )}

        {generatedUrl && (
          <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative group rounded-lg overflow-hidden border border-gray-700">
              <img src={generatedUrl} alt="Generated" className="w-full h-auto" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                 <Button size="sm" variant="secondary" onClick={() => window.open(generatedUrl, '_blank')}>
                    View Full
                 </Button>
              </div>
            </div>
            <div className="flex gap-2">
                 <Button size="sm" variant="outline" className="flex-1 border-purple-500 text-purple-300 hover:bg-purple-900/20" onClick={() => onAssetGenerated(generatedUrl)}>
                    <Check className="w-4 h-4 mr-2" />
                    Use as Background
                 </Button>
                 <a href={generatedUrl} download={`generated-${Date.now()}.png`} className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 w-full flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                 </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};