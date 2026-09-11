export interface Memory {
  id: string;
  date: string;
  title: string;
  description: string | null;
  image_url: string;
}

export interface Message {
  id: string;
  created_at: string;
  author: string;
  content: string;
  image_url?: string;
}

export interface LoveNote {
  id: string;
  created_at: string;
  author: string;
  message: string;
}

export type View =
  | "home"
  | "messages"
  | "notes"
  | "gallery"
  | "music"
  | "bucket";