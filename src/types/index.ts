export interface VideoItem {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoUrl: string;
  duration?: string;
  category?: string;
  date?: string;
  lyrics?: string;
}

export interface BookItem {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverUrl?: string;
  fileUrl: string;
  format: 'pdf' | 'epub' | 'markdown';
  date?: string;
}

export interface AudioVersion {
  label: string;
  url: string;
}

export interface HymnItem {
  id: string;
  title: string;
  author?: string;
  category?: string;
  lyrics?: string;
  audioUrl?: string;
  audioVersions?: AudioVersion[];
  coverUrl?: string;
  date?: string;
}

export interface DailyBibleDay {
  day: number;
  date: string;
  title: string;
  audioUrl: string;
  contentUrl: string;
}

export interface DailyBibleMonth {
  month: number;
  name: string;
  days: DailyBibleDay[];
}

export interface GospelArticle {
  id: string;
  title: string;
  author?: string;
  folder?: string;
  summary?: string;
  contentUrl: string;
  audioUrl?: string;
  coverUrl?: string;
  date?: string;
}

export interface GospelFolder {
  id: string;
  name: string;
  description?: string;
}

export interface Manifest {
  videos?: VideoItem[];
  books?: BookItem[];
  hymns?: HymnItem[];
  dailyBible?: DailyBibleMonth[];
  gospelArticles?: GospelArticle[];
}
