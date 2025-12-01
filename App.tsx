import React, { useState, useRef, useEffect } from 'react';
import { CarouselSlide } from './components/CarouselSlide';
import { AIImageGenerator } from './components/AIImageGenerator';
import { AIVideoGenerator } from './components/AIVideoGenerator';
import { AIWriter } from './components/AIWriter';
import { Button } from './components/ui/Button';
import { Slide, SlideType, UserProfile, CarouselSettings, InstagramUser, PublishStatus } from './types';
import { generatePostCaption, refineText } from './services/gemini';
import { loginToInstagram, publishCarouselToInstagram, MOCK_USER_ID } from './services/meta';
import { toBlob, toPng } from 'html-to-image';
import { 
  Plus, Trash2, Download, Image as ImageIcon, 
  Sun, Moon, Layout, Wand2, MonitorPlay, PenTool, Menu, Upload, Palette,
  Sparkles, Copy, Instagram, Share, CheckCircle2, Loader2, AlertCircle, Rocket, Settings2,
  Minimize2, Maximize2, Zap, Bold, Highlighter, Smile
} from 'lucide-react';

// Default Data
const INITIAL_SLIDES: Slide[] = [
  { id: '1', type: SlideType.COVER, title: 'Stop <b>Guessing</b>', body: 'The secret to viral content is not luck, it\'s <mark>psychology</mark>.' },
  { id: '2', type: SlideType.CONTENT, title: 'The Problem', body: 'Most creators focus on visuals but ignore the <b>narrative arc</b>.\n\nThis leads to high impressions but low conversion.' },
  { id: '3', type: SlideType.CONTENT, title: 'The Solution', body: 'Use the <b>H.I.T. Framework</b>:\n\n1. Hook\n2. Insight\n3. Takeaway\n\nStructure creates <mark>retention</mark>.' },
  { id: '4', type: SlideType.END, title: 'Try it out!', body: 'Save this template and start creating.' },
];

const INITIAL_USER: UserProfile = {
  name: 'Alex Designer',
  username: 'alex_ux',
  avatarUrl: '', // Will use placeholder
  showOnSlides: true,
};

const EMOJIS = ['😀', '😂', '😍', '🔥', '❤️', '👍', '🙌', '✨', '💡', '🚀', '💰', '📈', '🛑', '✅', '❌', '⭐', '🎁', '📅', '👋', '🤔'];

export default function App() {
  // State
  const [slides, setSlides] = useState<Slide[]>(INITIAL_SLIDES);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [settings, setSettings] = useState<CarouselSettings>({
    darkMode: true,
    globalBackgroundColor: '#000000',
    accentColor: '#6366f1',
  });
  const [activeTab, setActiveTab] = useState<'editor' | 'ai-writer' | 'ai-image' | 'ai-video' | 'publish'>('editor');
  const [selectedSlideId, setSelectedSlideId] = useState<string>(INITIAL_SLIDES[0].id);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  // Caption State
  const [caption, setCaption] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  
  // Text Refinement State
  const [isRefining, setIsRefining] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [useEmojis, setUseEmojis] = useState(true);
  
  // Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Instagram State
  const [fbAppId, setFbAppId] = useState(process.env.REACT_APP_FB_APP_ID || '');
  const [instagramUser, setInstagramUser] = useState<InstagramUser | null>(null);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Refs for Export - These point to the invisible full-scale elements
  const exportRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Refs for Preview Scrolling
  const previewRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Effect: Scroll to center when selectedSlideId changes
  useEffect(() => {
    const el = previewRefs.current[selectedSlideId];
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [selectedSlideId]);

  // Handlers
  const updateSlide = (id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      type: SlideType.CONTENT,
      title: 'New Slide',
      body: 'Add your content here.',
    };
    setSlides(prev => [...prev, newSlide]);
    setSelectedSlideId(newSlide.id);
  };

  const removeSlide = (id: string) => {
    if (slides.length > 1) {
      setSlides(prev => prev.filter(s => s.id !== id));
      if (selectedSlideId === id) {
        setSelectedSlideId(slides[0].id);
      }
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setUser(prev => ({ ...prev, avatarUrl: ev.target.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          updateSlide(selectedSlideId, { backgroundImage: ev.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTheme = () => {
    const newMode = !settings.darkMode;
    setSettings(s => ({
      ...s,
      darkMode: newMode,
      // Automatically switch background color based on mode
      globalBackgroundColor: newMode ? '#000000' : '#ffffff'
    }));
  };

  const handleFormatText = (tag: 'b' | 'mark') => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedSlide.body;
    
    // If no text selected, just append tag? No, better to wrap nothing or return
    if (start === end) return;

    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;
    
    const newText = `${before}${openTag}${selection}${closeTag}${after}`;
    updateSlide(selectedSlideId, { body: newText });

    // Restore focus
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + openTag.length, end + openTag.length);
    }, 0);
  };

  const handleInsertEmoji = (emoji: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedSlide.body;

    const newText = text.substring(0, start) + emoji + text.substring(end);
    updateSlide(selectedSlideId, { body: newText });
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + emoji.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleRefineText = async (type: 'shorten' | 'expand' | 'punchy' | 'fix') => {
    // Robust selection
    const selectedSlide = slides.find(s => s.id === selectedSlideId);
    if (!selectedSlide || !selectedSlide.body) return;
    
    setIsRefining(true);
    try {
        const apiKey = process.env.API_KEY;
        if(!apiKey) {
            alert("API Key needed for AI tools.");
            return;
        }
        // Pass useEmojis state
        const newText = await refineText(apiKey, selectedSlide.body, type, useEmojis);
        updateSlide(selectedSlide.id, { body: newText });
    } catch(e) {
        console.error("Text refinement failed", e);
        alert("Failed to refine text. Try again.");
    } finally {
        setIsRefining(false);
    }
  };

  const handleGenerateCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key required");
      
      const genCaption = await generatePostCaption(apiKey, slides);
      setCaption(genCaption);
    } catch (error) {
      console.error(error);
      alert("Failed to generate caption");
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleExport = async (singleId?: string) => {
    const idsToExport = singleId ? [singleId] : slides.map(s => s.id);
    
    for (const id of idsToExport) {
      const el = exportRefs.current[id]; // Use the full-scale hidden ref
      if (el) {
        try {
          const dataUrl = await toPng(el, { 
            cacheBust: true, 
            pixelRatio: 1, 
            width: 1080, 
            height: 1350,
            backgroundColor: settings.globalBackgroundColor
          });
          
          const link = document.createElement('a');
          link.download = `carousel-slide-${id}.png`;
          link.href = dataUrl;
          link.click();
        } catch (err) {
          console.error("Export failed for slide " + id, err);
        }
      }
    }
  };

  const handleAssetGenerated = (url: string) => {
     // Immediate update, no confirm dialog to avoid issues
     updateSlide(selectedSlideId, { backgroundImage: url });
  };

  const handleScriptGenerated = (newSlides: Slide[]) => {
      setSlides(newSlides);
      if (newSlides.length > 0) {
        setSelectedSlideId(newSlides[0].id);
      }
      setActiveTab('editor');
  };

  const handleConnectInstagram = async () => {
    try {
      // Pass the user-provided App ID to the service
      const user = await loginToInstagram(fbAppId);
      setInstagramUser(user);
    } catch (e) {
      console.error(e);
      alert("Failed to connect Instagram. Check console for details.");
    }
  };

  const handlePublish = async () => {
    if (!instagramUser) return;
    setPublishStatus('rendering');
    setStatusMessage('Rendering high-quality slides...');
    
    try {
      // 1. Generate Blobs for all slides
      const blobs: Blob[] = [];
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        setStatusMessage(`Rendering slide ${i+1} of ${slides.length}...`);
        const el = exportRefs.current[slide.id];
        if (el) {
          const blob = await toBlob(el, { 
            cacheBust: true, 
            pixelRatio: 1, 
            width: 1080, 
            height: 1350,
            backgroundColor: settings.globalBackgroundColor
          });
          if (blob) blobs.push(blob);
        }
      }

      setPublishStatus('uploading');
      
      // 2. Publish via Service with progress callback
      await publishCarouselToInstagram(instagramUser, blobs, caption, (msg) => {
         setStatusMessage(msg);
      });
      
      setPublishStatus('success');
      setStatusMessage('Your carousel is now live!');
      setTimeout(() => {
        setPublishStatus('idle');
        setStatusMessage('');
      }, 4000);

    } catch (e) {
      console.error(e);
      setPublishStatus('error');
      setStatusMessage('An error occurred during publication.');
      setTimeout(() => {
        setPublishStatus('idle');
        setStatusMessage('');
      }, 4000);
    }
  };

  // Robust selection
  const selectedSlide = slides.find(s => s.id === selectedSlideId) || slides[0];

  return (
    <div className="h-screen bg-black text-gray-100 flex flex-col md:flex-row overflow-hidden font-sans relative">
      
      {/* Publishing Overlay */}
      {publishStatus !== 'idle' && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center space-y-4">
              {publishStatus === 'rendering' && <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />}
              {publishStatus === 'uploading' && <Upload className="w-12 h-12 text-indigo-500 animate-bounce" />}
              {publishStatus === 'success' && <CheckCircle2 className="w-12 h-12 text-green-500" />}
              {publishStatus === 'error' && <AlertCircle className="w-12 h-12 text-red-500" />}

              <div>
                <h3 className="text-xl font-bold text-white">
                  {publishStatus === 'rendering' && 'Preparing Content'}
                  {publishStatus === 'uploading' && 'Publishing to Instagram'}
                  {publishStatus === 'success' && 'Published!'}
                  {publishStatus === 'error' && 'Failed to Publish'}
                </h3>
                <p className="text-gray-400 text-sm mt-2">
                   {statusMessage}
                </p>
                {publishStatus === 'success' && (
                  <p className="text-xs text-gray-500 mt-4 italic">
                    (Note: Images were mocked due to no backend, but the API call was real)
                  </p>
                )}
              </div>
           </div>
        </div>
      )}

      {/* Sidebar Navigation / Controls */}
      <aside className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-96 bg-gray-900 border-r border-gray-800 h-1/2 md:h-full z-30 shadow-2xl transition-all duration-300 absolute md:relative`}>
        <div className="p-4 md:p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg shadow-lg"></div>
            <h1 className="font-bold text-lg md:text-xl tracking-tight text-white">CarouselFlow</h1>
          </div>
          <button className="md:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
             ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-1 bg-gray-950 m-4 rounded-lg border border-gray-800 shrink-0">
           <button onClick={() => setActiveTab('editor')} className={`flex-1 py-2 text-xs font-medium rounded-md flex flex-col items-center gap-1 transition-all ${activeTab === 'editor' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              <Layout className="w-4 h-4" /> Editor
           </button>
           <button onClick={() => setActiveTab('ai-writer')} className={`flex-1 py-2 text-xs font-medium rounded-md flex flex-col items-center gap-1 transition-all ${activeTab === 'ai-writer' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              <PenTool className="w-4 h-4" /> Text
           </button>
           <button onClick={() => setActiveTab('ai-image')} className={`flex-1 py-2 text-xs font-medium rounded-md flex flex-col items-center gap-1 transition-all ${activeTab === 'ai-image' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              <Wand2 className="w-4 h-4" /> Image
           </button>
           <button onClick={() => setActiveTab('ai-video')} className={`flex-1 py-2 text-xs font-medium rounded-md flex flex-col items-center gap-1 transition-all ${activeTab === 'ai-video' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
              <MonitorPlay className="w-4 h-4" /> Veo
           </button>
           <button onClick={() => setActiveTab('publish')} className={`flex-1 py-2 text-xs font-medium rounded-md flex flex-col items-center gap-1 transition-all ${activeTab === 'publish' ? 'bg-pink-900/40 text-pink-100 shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <Rocket className="w-4 h-4" /> Publish
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'editor' ? (
            <div className="p-6 space-y-8 pb-20">
              
              {/* Global Settings */}
              <div className="space-y-4">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Theme & Colors
                 </h3>
                 
                 {/* Dark Mode Toggle */}
                 <div className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                   <span className="text-xs text-gray-300">Color Mode</span>
                   <button onClick={toggleTheme} className="flex items-center gap-2 text-xs font-medium text-gray-300 hover:text-white bg-gray-700 px-3 py-1.5 rounded-md transition-colors">
                      {settings.darkMode ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                      {settings.darkMode ? 'Dark' : 'Light'}
                   </button>
                 </div>

                 {/* Color Pickers */}
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Background</label>
                        <div className="flex items-center gap-2">
                             <input 
                                type="color" 
                                value={settings.globalBackgroundColor} 
                                onChange={(e) => setSettings({...settings, globalBackgroundColor: e.target.value})}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" 
                             />
                             <span className="text-xs text-gray-400 font-mono">{settings.globalBackgroundColor}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Accent</label>
                        <div className="flex items-center gap-2">
                             <input 
                                type="color" 
                                value={settings.accentColor} 
                                onChange={(e) => setSettings({...settings, accentColor: e.target.value})}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" 
                             />
                             <span className="text-xs text-gray-400 font-mono">{settings.accentColor}</span>
                        </div>
                    </div>
                 </div>
              </div>

              <hr className="border-gray-800" />

              {/* User Profile Section */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Profile Info</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Show on slides</span>
                        <button 
                            onClick={() => setUser(u => ({...u, showOnSlides: !u.showOnSlides}))} 
                            className={`w-8 h-4 rounded-full p-0.5 transition-colors relative ${user.showOnSlides ? 'bg-indigo-600' : 'bg-gray-700'}`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${user.showOnSlides ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                   <div>
                     <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                     <input 
                      value={user.name} 
                      onChange={(e) => setUser({...user, name: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                      placeholder="e.g. Alex"
                     />
                   </div>
                   <div>
                     <label className="block text-xs text-gray-500 mb-1">Handle (@)</label>
                     <input 
                      value={user.username} 
                      onChange={(e) => setUser({...user, username: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                      placeholder="e.g. alex_design"
                     />
                   </div>
                   <div>
                      <label className="block text-xs text-gray-500 mb-1">Avatar</label>
                      <div className="flex gap-2">
                          <input 
                              value={user.avatarUrl} 
                              onChange={(e) => setUser({...user, avatarUrl: e.target.value})}
                              placeholder="https://..."
                              className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                          <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white p-2 rounded flex items-center justify-center w-10 transition-colors">
                              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                              <Upload className="w-4 h-4" />
                          </label>
                      </div>
                   </div>
                 </div>
              </div>

              <hr className="border-gray-800" />

              {/* Slide Editor */}
              <div className="space-y-4">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Slide Content</h3>
                 
                 {/* Slide Selector */}
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                   {slides.map((s, i) => (
                     <button 
                      key={s.id} 
                      onClick={() => setSelectedSlideId(s.id)}
                      className={`flex-shrink-0 w-10 h-10 rounded flex items-center justify-center text-sm font-medium border transition-all ${selectedSlideId === s.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/50 shadow-sm' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                     >
                       {i + 1}
                     </button>
                   ))}
                   <button onClick={addSlide} className="flex-shrink-0 w-10 h-10 rounded flex items-center justify-center border border-dashed border-gray-600 text-gray-500 hover:text-white hover:border-gray-400 transition-colors">
                     <Plus className="w-4 h-4" />
                   </button>
                 </div>

                 {/* Type Selector */}
                 <div className="grid grid-cols-4 gap-2">
                   {Object.values(SlideType).map((t) => (
                     <button
                        key={t}
                        onClick={() => updateSlide(selectedSlide.id, { type: t })}
                        className={`py-1 px-1 text-[10px] md:text-xs rounded border uppercase tracking-wider truncate ${selectedSlide.type === t ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                        title={t}
                     >
                       {t}
                     </button>
                   ))}
                 </div>

                 {/* Inputs */}
                 <div className="space-y-4">
                   {/* Title Input */}
                   <div className="group">
                     <label className="block text-xs text-gray-500 font-medium mb-1.5 ml-1 group-focus-within:text-indigo-400 transition-colors">
                        {selectedSlide.type === SlideType.END ? 'Main Message' : 'Title'}
                     </label>
                     <input 
                      value={selectedSlide.title} 
                      onChange={(e) => updateSlide(selectedSlide.id, { title: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all placeholder-gray-600"
                      placeholder="Enter slide title..."
                     />
                   </div>
                   
                   {/* Enhanced Body Editor */}
                   <div className="space-y-2">
                     <label className="block text-xs text-gray-500 font-medium ml-1">
                        {selectedSlide.type === SlideType.END ? 'Sub Message' : 'Body Text'}
                     </label>
                     
                     <div className={`relative rounded-xl border transition-all duration-200 bg-gray-800/50 ${isRefining ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-gray-700 hover:border-gray-600 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50'}`}>
                        
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-900/30 border-b border-gray-700/50 rounded-t-xl">
                           
                           {/* Format Group */}
                           <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleFormatText('b')}
                                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                title="Bold"
                              >
                                <Bold className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleFormatText('mark')}
                                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                title="Highlight"
                              >
                                <Highlighter className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Emoji Picker */}
                              <div className="relative">
                                <button 
                                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                  className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${showEmojiPicker ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                                  title="Insert Emoji"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                                {showEmojiPicker && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)}></div>
                                    <div className="absolute top-full left-0 mt-2 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 w-48 grid grid-cols-5 gap-1">
                                      {EMOJIS.map(emoji => (
                                        <button 
                                          key={emoji} 
                                          onClick={() => handleInsertEmoji(emoji)}
                                          className="p-1 hover:bg-gray-700 rounded text-lg"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                           </div>

                           <div className="w-px h-4 bg-gray-700 mx-1"></div>

                           {/* AI Tools Group */}
                           <div className="flex items-center gap-1">
                              
                              {/* Emoji Toggle for AI */}
                              <button
                                onClick={() => setUseEmojis(!useEmojis)}
                                className={`p-1.5 rounded-md transition-all ${useEmojis ? 'text-yellow-400 hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-700/50'}`}
                                title={useEmojis ? "AI Emojis: ON" : "AI Emojis: OFF"}
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>

                              <div className="w-px h-3 bg-gray-700 mx-1"></div>

                              <button 
                                  onClick={() => handleRefineText('punchy')} 
                                  disabled={isRefining || !selectedSlide.body}
                                  className="group/btn relative p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                                  title="Make Punchy"
                              >
                                  <Zap className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                  onClick={() => handleRefineText('shorten')} 
                                  disabled={isRefining || !selectedSlide.body}
                                  className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                                  title="Shorten"
                              >
                                  <Minimize2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                  onClick={() => handleRefineText('expand')} 
                                  disabled={isRefining || !selectedSlide.body}
                                  className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                                  title="Expand"
                              >
                                  <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-3 bg-gray-700 mx-1"></div>
                              <button 
                                  onClick={() => handleRefineText('fix')} 
                                  disabled={isRefining || !selectedSlide.body}
                                  className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-purple-300 disabled:opacity-30 transition-all"
                                  title="Fix Grammar"
                              >
                                  <Sparkles className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        </div>

                        {/* Text Area */}
                        <div className="relative">
                            <textarea 
                              ref={textAreaRef}
                              value={selectedSlide.body} 
                              onChange={(e) => updateSlide(selectedSlide.id, { body: e.target.value })}
                              rows={6}
                              className="w-full bg-transparent border-none p-3 text-sm text-gray-100 placeholder-gray-600 focus:ring-0 resize-none leading-relaxed font-normal"
                              placeholder="Enter your slide content..."
                            />
                            
                            {/* Loading Overlay */}
                            {isRefining && (
                                <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-indigo-400">
                                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                    <span className="text-xs font-medium">Refining...</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-1.5 bg-gray-900/20 border-t border-white/5 flex justify-between items-center rounded-b-xl">
                           <span className="text-[10px] text-gray-500 font-medium">
                              Supports &lt;b&gt;bold&lt;/b&gt; and &lt;mark&gt;highlight&lt;/mark&gt;
                           </span>
                           <span className={`text-[10px] font-mono font-medium ${selectedSlide.body.length > 150 ? 'text-orange-400' : 'text-gray-500'}`}>
                              {selectedSlide.body.length} / 200
                           </span>
                        </div>
                     </div>
                   </div>
                   
                   {/* Background Input */}
                   <div>
                      <label className="block text-xs text-gray-500 mb-1">Background Image</label>
                      <div className="flex gap-2">
                          <input 
                              value={selectedSlide.backgroundImage || ''} 
                              onChange={(e) => updateSlide(selectedSlide.id, { backgroundImage: e.target.value })}
                              placeholder="URL"
                              className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                           <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white px-3 rounded flex items-center justify-center transition-colors" title="Upload from computer">
                              <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                              <Upload className="w-4 h-4" />
                          </label>
                          <Button variant="secondary" size="sm" onClick={() => setActiveTab('ai-image')} icon={<Wand2 className="w-3 h-3" />} title="Generate with AI" />
                      </div>
                   </div>

                 </div>

                 <div className="pt-4">
                    <Button variant="danger" size="sm" onClick={() => removeSlide(selectedSlide.id)} icon={<Trash2 className="w-3 h-3" />} className="w-full opacity-80 hover:opacity-100">
                      Delete Slide
                    </Button>
                 </div>
              </div>

              {/* Export */}
              <div className="pt-4 border-t border-gray-800">
                <Button onClick={() => handleExport()} className="w-full" icon={<Download className="w-4 h-4" />}>
                  Download All Slides
                </Button>
              </div>

            </div>
          ) : activeTab === 'ai-writer' ? (
            <div className="p-4">
              <AIWriter onScriptGenerated={handleScriptGenerated} />
            </div>
          ) : activeTab === 'ai-image' ? (
            <div className="p-4">
              <AIImageGenerator onAssetGenerated={handleAssetGenerated} />
            </div>
          ) : activeTab === 'ai-video' ? (
            <div className="p-4">
              <AIVideoGenerator onAssetGenerated={handleAssetGenerated} />
            </div>
          ) : (
            // PUBLISH TAB
            <div className="p-6 space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-pink-500/20 rounded-lg">
                      <Rocket className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                      <h3 className="text-lg font-semibold text-white">Publishing Studio</h3>
                      <p className="text-sm text-gray-400">Finalize and post to Instagram.</p>
                  </div>
                </div>

                {/* Step 1: Connect */}
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">1. Connect Account</h3>
                      <Settings2 className="w-4 h-4 text-gray-600" />
                   </div>
                   
                   {/* APP ID INPUT - Essential for Real Connection */}
                   <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 mb-2">
                       <label className="block text-xs text-gray-500 mb-1">Facebook App ID (Required for Real Auth)</label>
                       <input 
                           type="text" 
                           value={fbAppId} 
                           onChange={(e) => setFbAppId(e.target.value)}
                           placeholder="Enter App ID (e.g., 123456...)"
                           className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                       />
                       <p className="text-[10px] text-gray-500 mt-1">
                          Leave empty to use <b>Simulation Mode</b> for testing UI.
                       </p>
                   </div>
                   
                   {/* Simulation Warning Badge */}
                   {instagramUser && instagramUser.id === MOCK_USER_ID && fbAppId && (
                     <div className="bg-yellow-900/30 border border-yellow-700/50 rounded p-2 mb-2 text-xs text-yellow-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Simulation Mode Active (HTTPS required for real auth)</span>
                     </div>
                   )}

                   <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      {instagramUser ? (
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <img src={instagramUser.profile_picture_url || ''} alt="Profile" className="w-10 h-10 rounded-full bg-gray-600" />
                                  <div className="flex flex-col">
                                      <span className="text-sm font-bold text-white">@{instagramUser.username}</span>
                                      <span className="text-xs text-green-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Connected
                                      </span>
                                  </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => setInstagramUser(null)} className="text-red-400 hover:text-red-300">
                                Unlink
                              </Button>
                          </div>
                      ) : (
                          <div className="text-center py-2 space-y-3">
                              <p className="text-sm text-gray-400">Connect your Instagram Business account to publish directly.</p>
                              <Button variant="primary" size="md" onClick={handleConnectInstagram} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 border-0" icon={<Instagram className="w-4 h-4" />}>
                                 {fbAppId ? 'Connect Instagram (Real)' : 'Connect Instagram (Demo)'}
                              </Button>
                          </div>
                      )}
                   </div>
                </div>

                {/* Step 2: Caption */}
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">2. Caption & Hashtags</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigator.clipboard.writeText(caption)} 
                        disabled={!caption}
                        title="Copy Caption"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                   </div>
                   
                   <textarea 
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write your caption here..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none h-40"
                   />
                   
                   <Button 
                        onClick={handleGenerateCaption} 
                        isLoading={isGeneratingCaption}
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        icon={<Sparkles className="w-3 h-3" />}
                    >
                        Generate with AI
                    </Button>
                </div>

                {/* Step 3: Action */}
                <div className="space-y-2 pt-4 border-t border-gray-800">
                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">3. Launch</h3>
                   <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400">Slides Ready:</span>
                      <span className="text-xs font-bold text-white bg-gray-800 px-2 py-0.5 rounded">{slides.length}</span>
                   </div>
                   <Button 
                        onClick={handlePublish} 
                        disabled={!instagramUser}
                        className={`w-full h-12 text-base ${instagramUser ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg shadow-pink-900/20' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                        icon={<Share className="w-4 h-4" />}
                    >
                        {instagramUser ? 'Publish Carousel Now' : 'Connect Account to Publish'}
                    </Button>
                    {!instagramUser && <p className="text-[10px] text-gray-500 text-center">Login required to use the API.</p>}
                </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 bg-[#0a0a0a] relative flex flex-col h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
        
        {/* Top Bar */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-8 z-10 bg-black/50 backdrop-blur-sm flex-shrink-0">
           <div className="flex items-center gap-4">
              <button className="md:hidden text-white" onClick={() => setSidebarOpen(true)}>
                 <Menu className="w-6 h-6" />
              </button>
              <span className="text-gray-400 text-sm hidden md:inline">Preview Mode</span>
              <span className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-300">1080 x 1350</span>
           </div>
           <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleExport(selectedSlideId)}>
                 Download Current
              </Button>
           </div>
        </div>

        {/* Preview Canvas */}
        {/* Improved scrolling logic: min-w-fit allow content to grow beyond screen. m-auto centers it if smaller. */}
        <div className="flex-1 overflow-auto p-4 md:p-10 relative bg-black/20">
             <div className="min-h-full min-w-fit flex items-center gap-6 md:gap-10 m-auto px-10 py-10">
                {slides.map((slide, i) => {
                   const isSelected = slide.id === selectedSlideId;
                   return (
                     <div 
                        key={slide.id} 
                        ref={(el) => { previewRefs.current[slide.id] = el; }}
                        className={`transition-all duration-500 transform ${isSelected ? 'scale-100 opacity-100 z-10 grayscale-0' : 'scale-95 opacity-40 hover:opacity-70 hover:scale-95 cursor-pointer grayscale'}`}
                        onClick={() => setSelectedSlideId(slide.id)}
                     >
                         <div 
                            style={{ 
                                width: '360px', 
                                height: '450px', 
                            }}
                            className={`relative shadow-2xl rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-indigo-500 ring-8 ring-indigo-500/10' : 'border-gray-800'}`}
                         >
                             {/* Scaling wrapper */}
                             <div className="origin-top-left transform scale-[0.3333333] bg-white">
                                 <CarouselSlide 
                                     slide={slide} 
                                     user={user} 
                                     settings={settings} 
                                     index={i} 
                                     total={slides.length}
                                 />
                             </div>
                             
                             {/* Click overlay for inactive slides */}
                             {!isSelected && <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />}
                         </div>
                         
                         <div className={`mt-4 text-center transition-all duration-300 ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                            <span className="inline-block px-3 py-1 rounded-full bg-gray-800 text-indigo-300 text-xs font-bold uppercase tracking-wide">
                                {slide.type}
                            </span>
                         </div>
                     </div>
                   );
                })}
            </div>
        </div>
      </main>

      {/* Hidden Export Zone: Opacity 0 instead of visibility hidden for better capture compatibility */}
      <div 
          style={{ 
              position: 'fixed', 
              top: 0, 
              left: -10000, 
              opacity: 0, 
              pointerEvents: 'none',
              zIndex: -1
          }}
      >
          {slides.map((slide, i) => (
             <div 
                key={`export-${slide.id}`} 
                ref={(el) => { exportRefs.current[slide.id] = el; }}
                style={{ width: 1080, height: 1350 }} // Explicit size for wrapper
             >
                <CarouselSlide 
                    slide={slide} 
                    user={user} 
                    settings={settings} 
                    index={i} 
                    total={slides.length}
                />
             </div>
          ))}
      </div>

    </div>
  );
}