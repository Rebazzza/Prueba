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

export interface SilentPromise {
  id: string;
  author: string;
  promise_text: string;
  created_at: string;
}

export interface Dream {
  id: string;
  author: string;
  dream_text: string;
  is_achieved: boolean;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  item_name: string;
  category: string;
  is_acquired: boolean;
  created_at: string;
}

export interface PlaylistSong {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  created_at: string;
}

export type View =
  | "home"
  | "messages"
  | "notes"
  | "gallery"
  | "music"
  | "bucket"
  | "reasons"
  | "promises"
  | "dreams"
  | "wishlist";