export enum SlideType {
  COVER = 'COVER',
  CONTENT = 'CONTENT',
  QUOTE = 'QUOTE',
  END = 'END'
}

export interface Slide {
  id: string;
  type: SlideType;
  title: string;
  body: string;
  backgroundImage?: string; // URL or Base64
  backgroundColor?: string;
}

export interface UserProfile {
  name: string;
  username: string;
  avatarUrl: string;
  showOnSlides: boolean;
}

export interface CarouselSettings {
  darkMode: boolean;
  globalBackgroundColor: string;
  accentColor: string;
}

export enum AIModelType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export interface GeneratedAsset {
  id: string;
  type: AIModelType;
  url: string;
  createdAt: Date;
}

export interface InstagramUser {
  id: string;
  name: string;
  username: string;
  profile_picture_url?: string;
  accessToken: string;
}

export type PublishStatus = 'idle' | 'rendering' | 'uploading' | 'publishing' | 'success' | 'error';