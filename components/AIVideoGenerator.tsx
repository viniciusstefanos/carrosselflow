import React, { useState } from 'react';
import { generateVideo } from '../services/gemini';
import { Button } from './ui/Button';
import { Video, Upload, Play, AlertCircle, Film } from 'lucide-react';

interface AIVideoGeneratorProps {
    onAssetGenerated: (url: string) => void;
}

export const AIVideoGenerator: React.FC<AIVideoGeneratorProps> = ({ onAssetGenerated }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setVideoUrl(null);
    }
  };

  const handleGenerate = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);

    try {
      // Veo requires paid key
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
        }
      }

      const apiKey = process.env.API_KEY; 
      if (!apiKey) throw new Error("API Key required for Veo.");

      const url = await generateVideo(apiKey, imageFile, prompt, aspectRatio);
      setVideoUrl(url);
      onAssetGenerated(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate video.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
         <div className="p-2 bg-pink-500/20 rounded-lg">
            <Film className="w-6 h-6 text-pink-400" />
         </div>
         <div>
            <h3 className="text-lg font-semibold text-white">Veo Animator</h3>
            <p className="text-sm text-gray-400">Bring images to life with Veo.</p>
         </div>
      </div>

      <div className="space-y-4">
        {/* Image Upload */}
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-pink-500 transition-colors relative">
           <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
           />
           {imagePreview ? (
             <img src={imagePreview} alt="Preview" className="mx-auto max-h-48 rounded shadow-md" />
           ) : (
             <div className="flex flex-col items-center text-gray-400">
                <Upload className="w-8 h-8 mb-2" />
                <p className="text-sm">Click to upload a reference image</p>
             </div>
           )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Prompt (Optional)</label>
          <input
            type="text"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
            placeholder="e.g., A cinematic pan, sparkling lights..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
            <div className="flex gap-2">
                <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 py-2 rounded-lg text-sm border ${aspectRatio === '9:16' ? 'bg-pink-600 border-pink-600 text-white' : 'border-gray-700 text-gray-400'}`}
                >
                    Portrait (9:16)
                </button>
                <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex-1 py-2 rounded-lg text-sm border ${aspectRatio === '16:9' ? 'bg-pink-600 border-pink-600 text-white' : 'border-gray-700 text-gray-400'}`}
                >
                    Landscape (16:9)
                </button>
            </div>
        </div>

        <Button 
            onClick={handleGenerate} 
            isLoading={loading} 
            disabled={!imageFile}
            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
            icon={<Video className="w-4 h-4" />}
        >
          Generate Video
        </Button>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-2 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {videoUrl && (
          <div className="mt-6">
            <p className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                <Play className="w-4 h-4" /> Video Generated
            </p>
            <video controls src={videoUrl} className="w-full rounded-lg border border-gray-700 shadow-lg" />
            <a href={videoUrl} download="veo-generation.mp4" className="block mt-2 text-center text-sm text-pink-400 hover:text-pink-300 underline">
                Download MP4
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
