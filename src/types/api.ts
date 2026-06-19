export type PromptKey = "claude" | "convert";

export interface Artwork {
  id: string;
  userId: string;
  prompt: string;
  size: number;
  provider: string;
  pixel_data: string[][];
  is_public: boolean;
  token_cost: number;
  edited_by_human: boolean;
  created_at: string;
}

export interface WishlistItem extends Artwork {
  folder_id: string | null;
}

export interface WishlistFolder {
  id: string;
  name: string;
  created_at: string;
  count?: number;
}
