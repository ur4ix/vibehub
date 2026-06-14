export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string;
          repository_id: string;
          status: Database["public"]["Enums"]["chat_status"];
          reaction_threshold: number;
          reactions_at_open: number | null;
          opened_at: string | null;
          expires_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          status?: Database["public"]["Enums"]["chat_status"];
          reaction_threshold: number;
          reactions_at_open?: number | null;
          opened_at?: string | null;
          expires_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          status?: Database["public"]["Enums"]["chat_status"];
          reaction_threshold?: number;
          reactions_at_open?: number | null;
          opened_at?: string | null;
          expires_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chats_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: true;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
      forks: {
        Row: {
          id: string;
          original_repository_id: string;
          forked_repository_id: string;
          forked_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          original_repository_id: string;
          forked_repository_id: string;
          forked_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          original_repository_id?: string;
          forked_repository_id?: string;
          forked_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forks_forked_by_fkey";
            columns: ["forked_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forks_forked_repository_id_fkey";
            columns: ["forked_repository_id"];
            isOneToOne: true;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forks_original_repository_id_fkey";
            columns: ["original_repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          id: string;
          repository_id: string;
          seller_id: string;
          status: Database["public"]["Enums"]["listing_status"];
          price_cents: number;
          currency: string;
          title: string | null;
          description: string | null;
          published_at: string | null;
          expires_at: string | null;
          sold_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          seller_id: string;
          status?: Database["public"]["Enums"]["listing_status"];
          price_cents: number;
          currency?: string;
          title?: string | null;
          description?: string | null;
          published_at?: string | null;
          expires_at?: string | null;
          sold_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          seller_id?: string;
          status?: Database["public"]["Enums"]["listing_status"];
          price_cents?: number;
          currency?: string;
          title?: string | null;
          description?: string | null;
          published_at?: string | null;
          expires_at?: string | null;
          sold_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          id: string;
          listing_id: string | null;
          repository_id: string;
          buyer_id: string;
          seller_id: string;
          amount_cents: number;
          currency: string;
          platform_fee_cents: number;
          stripe_payment_intent_id: string | null;
          status: Database["public"]["Enums"]["purchase_status"];
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id?: string | null;
          repository_id: string;
          buyer_id: string;
          seller_id: string;
          amount_cents: number;
          currency?: string;
          platform_fee_cents?: number;
          stripe_payment_intent_id?: string | null;
          status?: Database["public"]["Enums"]["purchase_status"];
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string | null;
          repository_id?: string;
          buyer_id?: string;
          seller_id?: string;
          amount_cents?: number;
          currency?: string;
          platform_fee_cents?: number;
          stripe_payment_intent_id?: string | null;
          status?: Database["public"]["Enums"]["purchase_status"];
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reactions: {
        Row: {
          id: string;
          repository_id: string;
          user_id: string;
          type: Database["public"]["Enums"]["reaction_type"];
          created_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          user_id: string;
          type?: Database["public"]["Enums"]["reaction_type"];
          created_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["reaction_type"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reactions_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      repositories: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          slug: string;
          description: string | null;
          readme: string | null;
          storage_path: string | null;
          github_url: string | null;
          type: Database["public"]["Enums"]["repository_type"];
          price_cents: number | null;
          chat_reaction_threshold: number;
          reaction_count: number;
          fork_count: number;
          average_rating: number;
          review_count: number;
          is_published: boolean;
          published_at: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          slug: string;
          description?: string | null;
          readme?: string | null;
          storage_path?: string | null;
          github_url?: string | null;
          type?: Database["public"]["Enums"]["repository_type"];
          price_cents?: number | null;
          chat_reaction_threshold?: number;
          reaction_count?: number;
          fork_count?: number;
          average_rating?: number;
          review_count?: number;
          is_published?: boolean;
          published_at?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          readme?: string | null;
          storage_path?: string | null;
          github_url?: string | null;
          type?: Database["public"]["Enums"]["repository_type"];
          price_cents?: number | null;
          chat_reaction_threshold?: number;
          reaction_count?: number;
          fork_count?: number;
          average_rating?: number;
          review_count?: number;
          is_published?: boolean;
          published_at?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repositories_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          purchase_id: string;
          repository_id: string;
          reviewer_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          repository_id: string;
          reviewer_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          purchase_id?: string;
          repository_id?: string;
          reviewer_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: true;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          reputation: number;
          seller_deposit_cents: number;
          stripe_customer_id: string | null;
          stripe_connect_account_id: string | null;
          github_username: string | null;
          huggingface_username: string | null;
          x_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          reputation?: number;
          seller_deposit_cents?: number;
          stripe_customer_id?: string | null;
          stripe_connect_account_id?: string | null;
          github_username?: string | null;
          huggingface_username?: string | null;
          x_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          reputation?: number;
          seller_deposit_cents?: number;
          stripe_customer_id?: string | null;
          stripe_connect_account_id?: string | null;
          github_username?: string | null;
          huggingface_username?: string | null;
          x_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          reputation: number;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      expire_repository_chats: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      try_open_repository_chat: {
        Args: {
          p_repository_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      chat_status: "locked" | "active" | "closed" | "expired";
      listing_status:
        | "draft"
        | "active"
        | "paused"
        | "sold"
        | "expired"
        | "cancelled";
      purchase_status:
        | "pending"
        | "processing"
        | "completed"
        | "refunded"
        | "failed"
        | "disputed";
      reaction_type: "like";
      repository_type: "free" | "paid";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;

export type Chat = Tables<"chats">;
export type ChatInsert = TablesInsert<"chats">;
export type ChatUpdate = TablesUpdate<"chats">;

export type Fork = Tables<"forks">;
export type ForkInsert = TablesInsert<"forks">;
export type ForkUpdate = TablesUpdate<"forks">;

export type Listing = Tables<"listings">;
export type ListingInsert = TablesInsert<"listings">;
export type ListingUpdate = TablesUpdate<"listings">;

export type Purchase = Tables<"purchases">;
export type PurchaseInsert = TablesInsert<"purchases">;
export type PurchaseUpdate = TablesUpdate<"purchases">;

export type Reaction = Tables<"reactions">;
export type ReactionInsert = TablesInsert<"reactions">;
export type ReactionUpdate = TablesUpdate<"reactions">;

export type Repository = Tables<"repositories">;
export type RepositoryInsert = TablesInsert<"repositories">;
export type RepositoryUpdate = TablesUpdate<"repositories">;

export type Review = Tables<"reviews">;
export type ReviewInsert = TablesInsert<"reviews">;
export type ReviewUpdate = TablesUpdate<"reviews">;

export type User = Tables<"users">;
export type UserInsert = TablesInsert<"users">;
export type UserUpdate = TablesUpdate<"users">;

export type Profile = Tables<"profiles">;

export type ChatStatus = Enums<"chat_status">;
export type ListingStatus = Enums<"listing_status">;
export type PurchaseStatus = Enums<"purchase_status">;
export type ReactionType = Enums<"reaction_type">;
export type RepositoryType = Enums<"repository_type">;
