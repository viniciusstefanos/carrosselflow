import React, { forwardRef } from 'react';
import { Slide, SlideType, UserProfile, CarouselSettings } from '../types';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

interface CarouselSlideProps {
  slide: Slide;
  user: UserProfile;
  settings: CarouselSettings;
  index: number;
  total: number;
  scale?: number;
}

export const CarouselSlide = forwardRef<HTMLDivElement, CarouselSlideProps>(
  ({ slide, user, settings, index, total }, ref) => {
    
    const isDark = settings.darkMode;
    // Use global background color if set, otherwise fallback to black/white based on mode
    // Individual slide background overrides everything
    const defaultBg = settings.globalBackgroundColor || (isDark ? '#000000' : '#ffffff');
    const bgColor = slide.backgroundColor || defaultBg;
    
    const textColor = isDark ? 'text-white' : 'text-black';
    const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
    const accentColor = settings.accentColor || '#6366f1'; // Default indigo-500
    
    // The container fixed at 1080x1350
    const WIDTH = 1080;
    const HEIGHT = 1350;

    // Helper to render text with formatting (Bold <b>, Highlight <mark>, Newline \n)
    const renderFormattedText = (text: string) => {
      if (!text) return null;
      return text.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>
          {line.split(/(<b>.*?<\/b>|<mark>.*?<\/mark>)/g).map((part, j) => {
            if (part.startsWith('<b>') && part.endsWith('</b>')) {
              return (
                <strong 
                  key={j} 
                  className="font-extrabold"
                  style={{ color: accentColor }}
                >
                  {part.slice(3, -4)}
                </strong>
              );
            }
            if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
              return (
                <span 
                  key={j} 
                  className="px-1 mx-0.5 rounded-sm box-decoration-clone"
                  style={{ 
                    backgroundColor: `${accentColor}33`, // 20% opacity hex
                    color: isDark ? '#fff' : '#000',
                    border: `1px solid ${accentColor}66`
                  }}
                >
                  {part.slice(6, -7)}
                </span>
              );
            }
            return <span key={j}>{part}</span>;
          })}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ));
    };

    return (
      <div
        ref={ref}
        className="relative overflow-hidden flex flex-col items-center"
        style={{
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          backgroundColor: bgColor,
          backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: isDark ? 'white' : 'black',
          flexShrink: 0,
        }}
      >
        {/* Dark Overlay if bg image exists */}
        {slide.backgroundImage && (
          <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-white/40'} backdrop-blur-[2px]`} />
        )}

        {/* Main Content Container - 1080x1080 Centered Vertically */}
        <div className="absolute top-[135px] w-[1080px] h-[1080px] flex flex-col p-16 z-10 box-border">
          
          {/* Header */}
          {user.showOnSlides && (
            <div className="flex items-center justify-between mb-12 w-full">
              <div className="flex items-center gap-6">
                <img 
                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                  alt={user.name} 
                  crossOrigin="anonymous"
                  className="w-20 h-20 rounded-full border-4 border-white/20 object-cover shadow-lg"
                />
                <div className="flex flex-col items-start">
                  <span className={`text-3xl font-bold leading-tight ${textColor}`}>{user.name}</span>
                  <span className={`text-2xl ${subTextColor}`}>@{user.username}</span>
                </div>
              </div>
              {/* No Icon here */}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 flex flex-col justify-center relative">
            
            {slide.type === SlideType.COVER && (
              <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                 <div 
                    className="w-32 h-2 rounded-full mb-4" 
                    style={{ backgroundColor: accentColor }}
                 />
                 <h1 className={`text-9xl font-black tracking-tighter leading-[0.9] ${textColor} drop-shadow-sm`}>
                  {renderFormattedText(slide.title)}
                 </h1>
                 <p className={`text-5xl font-medium leading-tight ${subTextColor} max-w-3xl`}>
                   {renderFormattedText(slide.body)}
                 </p>
              </div>
            )}

            {slide.type === SlideType.CONTENT && (
               <div className="flex flex-col gap-8">
                <h2 className={`text-7xl font-bold tracking-tight ${textColor}`}>
                  {renderFormattedText(slide.title)}
                </h2>
                <div className={`text-4xl font-normal leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                  {renderFormattedText(slide.body)}
                </div>
               </div>
            )}

            {slide.type === SlideType.QUOTE && (
               <div className="flex flex-col items-center text-center gap-12 px-10">
                 <span 
                    className="text-9xl opacity-50 font-serif"
                    style={{ color: accentColor }}
                 >
                    "
                 </span>
                 <h2 className={`text-6xl font-serif italic font-semibold leading-tight ${textColor}`}>
                   {renderFormattedText(slide.title)}
                 </h2>
                 <div 
                    className="w-20 h-1 opacity-50" 
                    style={{ backgroundColor: accentColor }}
                 />
                 <p className={`text-3xl uppercase tracking-[0.2em] font-bold ${subTextColor}`}>
                    {renderFormattedText(slide.body)}
                 </p>
               </div>
            )}

            {slide.type === SlideType.END && (
               <div className="flex flex-col items-center justify-center text-center gap-12 h-full">
                 <img 
                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                  alt={user.name} 
                  crossOrigin="anonymous"
                  className="w-56 h-56 rounded-full border-8 shadow-2xl object-cover"
                  style={{ borderColor: accentColor }}
                />
                 <h2 className={`text-7xl font-bold ${textColor}`}>
                   {renderFormattedText(slide.title || "Thanks for reading!")}
                 </h2>
                 <div className="flex gap-12 mt-8">
                    <Heart className={`w-16 h-16 ${textColor}`} />
                    <MessageCircle className={`w-16 h-16 ${textColor}`} />
                    <Send className={`w-16 h-16 ${textColor}`} />
                    <Bookmark className={`w-16 h-16 ${textColor}`} />
                 </div>
                 <p className={`text-4xl mt-6 ${subTextColor}`}>
                    {renderFormattedText(slide.body || "Save this post for later")}
                 </p>
               </div>
            )}

          </div>

          {/* Footer */}
          <div className="mt-auto flex justify-between items-end pt-10 border-t border-opacity-20" style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}}>
              <span className={`text-3xl font-medium font-mono opacity-50 ${textColor}`}>
                 {index + 1}/{total}
              </span>
              <div className="flex items-center gap-4 opacity-70">
                  <span className={`text-2xl font-bold tracking-widest uppercase ${textColor}`}>
                    Swipe
                  </span>
                  <div 
                    className={`animate-pulse text-3xl`}
                    style={{ color: accentColor }}
                  >
                     →
                  </div>
              </div>
          </div>

        </div>
      </div>
    );
  }
);

CarouselSlide.displayName = "CarouselSlide";