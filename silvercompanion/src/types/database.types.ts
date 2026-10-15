/**
 * Supabase database types for 銀髮伴 SilverCompanion.
 *
 * Shape follows `supabase gen types typescript --local` so it plugs straight
 * into `createClient<Database>()`. Text columns guarded by CHECK constraints in
 * supabase/migrations are narrowed to literal unions here; keep them in sync
 * when the migration changes.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'seeker' | 'provider'
export type ServiceType = 'chat' | 'medical' | 'walk' | 'tech' | 'read' | 'clean' | 'custom'
export type Mobility = '可自理' | '需攙扶' | '需輪椅' | '臥床'
export type HealthSource = 'manual' | 'device'
export type PaymentMethod = 'linepay' | 'credit_card' | 'cash'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'
export type OrderStatus = 'pending' | 'accepted' | 'navigating' | 'in_progress' | 'completed' | 'cancelled'
export type Mood = 'happy' | 'neutral' | 'sad'
export type SosStatus = 'triggered' | 'resolved'
export type SosLocationSource = 'gps' | 'last_known' | 'home'
export type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'rejected'
export type NotificationType =
  | 'order_new'
  | 'order_paid'
  | 'order_accepted'
  | 'order_declined'
  | 'order_cancelled'
  | 'order_navigating'
  | 'order_arrived'
  | 'order_completed'
  | 'order_refunded'
  | 'rating'
  | 'withdrawal'
  | 'sos'
  | 'system'

/** `{"2026-10-15": ["09:00", "10:00"]}` — whole-hour start times per date. */
export type AvailabilitySlots = Record<string, string[]>

type OrderRow = {
  id: string
  seeker_id: string
  provider_id: string | null
  recipient_id: number
  service_type: ServiceType
  service_date: string
  start_time: string
  end_time: string
  hours: number
  location_address: string
  location_lat: number | null
  location_lng: number | null
  is_online: boolean
  notes: string | null
  hourly_rate: number
  total_amount: number
  platform_fee: number
  provider_earning: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  linepay_transaction_id: string | null
  order_status: OrderStatus
  cancel_reason: string | null
  cancelled_by: string | null
  paid_at: string | null
  accepted_at: string | null
  navigation_started_at: string | null
  arrived_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

type CareLogRow = {
  id: string
  order_id: string
  mood: Mood
  message: string
  photos: string[]
  seeker_rating: number | null
  seeker_tags: string[]
  seeker_comment: string | null
  rated_at: string | null
  created_at: string
}

type ProviderPublicRow = {
  provider_id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  hourly_rate: number
  service_types: ServiceType[]
  tags: string[]
  service_switch_is_online: boolean
  youtube_video_id: string | null
  is_verified: boolean
  rating_avg: number
  review_count: number
  completed_orders: number
  city: string | null
  districts: string[]
  offers_online: boolean
  availability_slots: AvailabilitySlots
  member_since: string
}

type WithdrawalRow = {
  id: string
  provider_id: string
  amount: number
  month: string
  bank_code: string
  bank_account: string
  account_name: string
  status: WithdrawalStatus
  created_at: string
  processed_at: string | null
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          nickname: string | null
          phone: string
          avatar_url: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name: string
          nickname?: string | null
          phone: string
          avatar_url?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          full_name?: string
          nickname?: string | null
          phone?: string
          avatar_url?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_details: {
        Row: {
          provider_id: string
          bio: string | null
          hourly_rate: number
          service_types: ServiceType[]
          tags: string[]
          service_switch_is_online: boolean
          youtube_video_id: string | null
          is_verified: boolean
          rating_avg: number
          review_count: number
          bank_code: string | null
          bank_account: string | null
          available_balance: number
          last_withdraw_month: string | null
          availability_slots: AvailabilitySlots
          city: string | null
          districts: string[]
          offers_online: boolean
          completed_orders: number
          updated_at: string
        }
        Insert: {
          provider_id: string
          bio?: string | null
          hourly_rate?: number
          service_types?: ServiceType[]
          tags?: string[]
          service_switch_is_online?: boolean
          youtube_video_id?: string | null
          is_verified?: boolean
          rating_avg?: number
          review_count?: number
          bank_code?: string | null
          bank_account?: string | null
          available_balance?: number
          last_withdraw_month?: string | null
          availability_slots?: AvailabilitySlots
          city?: string | null
          districts?: string[]
          offers_online?: boolean
          completed_orders?: number
          updated_at?: string
        }
        Update: {
          provider_id?: string
          bio?: string | null
          hourly_rate?: number
          service_types?: ServiceType[]
          tags?: string[]
          service_switch_is_online?: boolean
          youtube_video_id?: string | null
          is_verified?: boolean
          rating_avg?: number
          review_count?: number
          bank_code?: string | null
          bank_account?: string | null
          available_balance?: number
          last_withdraw_month?: string | null
          availability_slots?: AvailabilitySlots
          city?: string | null
          districts?: string[]
          offers_online?: boolean
          completed_orders?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'provider_details_provider_id_fkey'
            columns: ['provider_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      kinship_recipients: {
        Row: {
          id: number
          seeker_id: string
          name: string
          nickname: string | null
          age: number
          mobility: Mobility
          chronic_diseases: string[]
          notes: string | null
          address: string
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          seeker_id: string
          name: string
          nickname?: string | null
          age: number
          mobility: Mobility
          chronic_diseases?: string[]
          notes?: string | null
          address: string
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          seeker_id?: string
          name?: string
          nickname?: string | null
          age?: number
          mobility?: Mobility
          chronic_diseases?: string[]
          notes?: string | null
          address?: string
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kinship_recipients_seeker_id_fkey'
            columns: ['seeker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      health_logs: {
        Row: {
          id: string
          seeker_id: string
          recipient_id: number | null
          bp_high: number | null
          bp_low: number | null
          heart_rate: number | null
          temperature: number | null
          steps: number | null
          weight: number | null
          source: HealthSource
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          seeker_id: string
          recipient_id?: number | null
          bp_high?: number | null
          bp_low?: number | null
          heart_rate?: number | null
          temperature?: number | null
          steps?: number | null
          weight?: number | null
          source?: HealthSource
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          seeker_id?: string
          recipient_id?: number | null
          bp_high?: number | null
          bp_low?: number | null
          heart_rate?: number | null
          temperature?: number | null
          steps?: number | null
          weight?: number | null
          source?: HealthSource
          recorded_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'health_logs_seeker_id_fkey'
            columns: ['seeker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'health_logs_recipient_fk'
            columns: ['recipient_id', 'seeker_id']
            isOneToOne: false
            referencedRelation: 'kinship_recipients'
            referencedColumns: ['id', 'seeker_id']
          },
        ]
      }
      orders: {
        Row: OrderRow
        Insert: {
          id?: string
          seeker_id: string
          provider_id?: string | null
          recipient_id: number
          service_type: ServiceType
          service_date: string
          start_time: string
          end_time: string
          location_address: string
          location_lat?: number | null
          location_lng?: number | null
          is_online?: boolean
          notes?: string | null
          /** Ignored for assigned orders — the database uses the companion's current rate. */
          hourly_rate?: number
          total_amount?: number
          platform_fee?: number
          provider_earning?: number
          payment_method: PaymentMethod
        }
        Update: Partial<OrderRow>
        Relationships: [
          {
            foreignKeyName: 'orders_seeker_id_fkey'
            columns: ['seeker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_provider_id_fkey'
            columns: ['provider_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_recipient_fk'
            columns: ['recipient_id', 'seeker_id']
            isOneToOne: false
            referencedRelation: 'kinship_recipients'
            referencedColumns: ['id', 'seeker_id']
          },
        ]
      }
      care_logs: {
        Row: CareLogRow
        Insert: {
          id?: string
          order_id: string
          mood: Mood
          message: string
          photos?: string[]
          seeker_rating?: number | null
          seeker_tags?: string[]
          seeker_comment?: string | null
          rated_at?: string | null
          created_at?: string
        }
        Update: {
          seeker_rating?: number | null
          seeker_tags?: string[]
          seeker_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'care_logs_order_id_fkey'
            columns: ['order_id']
            isOneToOne: true
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: number
          sender_id: string
          receiver_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: never
          sender_id: string
          receiver_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_receiver_id_fkey'
            columns: ['receiver_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sos_alerts: {
        Row: {
          id: string
          user_id: string
          lat: number
          lng: number
          accuracy_m: number | null
          location_source: SosLocationSource
          order_id: string | null
          status: SosStatus
          notified_at: string | null
          notify_channel: string | null
          notify_error: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lat: number
          lng: number
          accuracy_m?: number | null
          location_source?: SosLocationSource
          order_id?: string | null
          status?: SosStatus
          created_at?: string
        }
        Update: {
          status?: SosStatus
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sos_alerts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      withdrawals: {
        Row: WithdrawalRow
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'withdrawals_provider_id_fkey'
            columns: ['provider_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: number
          user_id: string
          type: NotificationType
          title: string
          body: string | null
          order_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: never
        Update: {
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      order_dismissals: {
        Row: {
          order_id: string
          provider_id: string
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: {
      provider_public: {
        Row: ProviderPublicRow
        Relationships: []
      }
      provider_reviews: {
        Row: {
          id: string
          provider_id: string
          service_type: ServiceType
          rating: number
          tags: string[]
          comment: string | null
          rated_at: string
          reviewer: string
        }
        Relationships: []
      }
      order_details: {
        Row: OrderRow & {
          seeker_name: string
          seeker_avatar_url: string | null
          provider_name: string | null
          provider_avatar_url: string | null
          recipient_name: string
          recipient_nickname: string | null
          recipient_age: number
          recipient_mobility: Mobility
          recipient_chronic_diseases: string[]
          recipient_notes: string | null
          care_log_id: string | null
          care_log_mood: Mood | null
          seeker_rating: number | null
        }
        Relationships: []
      }
      care_log_details: {
        Row: CareLogRow & {
          seeker_id: string
          provider_id: string
          service_type: ServiceType
          service_date: string
          start_time: string
          end_time: string
          recipient_id: number
          provider_name: string
          provider_avatar_url: string | null
          recipient_name: string
          recipient_nickname: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_order: { Args: { p_order_id: string }; Returns: OrderRow }
      decline_order: { Args: { p_order_id: string; p_reason?: string }; Returns: OrderRow }
      cancel_order: { Args: { p_order_id: string; p_reason?: string }; Returns: OrderRow }
      start_navigation: { Args: { p_order_id: string }; Returns: OrderRow }
      mark_arrived: { Args: { p_order_id: string }; Returns: OrderRow }
      submit_care_log: {
        Args: { p_order_id: string; p_mood: Mood; p_message: string; p_photos?: string[] }
        Returns: CareLogRow
      }
      request_withdrawal: { Args: Record<PropertyKey, never>; Returns: WithdrawalRow }
      get_booked_slots: {
        Args: { p_provider_id: string; p_from: string; p_to: string }
        Returns: { service_date: string; start_time: string; end_time: string }[]
      }
      search_providers: {
        Args: {
          p_service?: ServiceType
          p_city?: string
          p_district?: string
          p_online?: boolean
          p_date?: string
          p_hour?: number
          p_max_rate?: number
        }
        Returns: ProviderPublicRow[]
        SetofOptions: {
          from: '*'
          to: 'provider_public'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_provider_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          order_id: string
          is_open: boolean
          seeker_name: string
          service_type: ServiceType
          service_date: string
          start_time: string
          end_time: string
          hours: number
          hourly_rate: number
          total_amount: number
          provider_earning: number
          payment_method: PaymentMethod
          payment_status: PaymentStatus
          is_online: boolean
          notes: string | null
          area: string
          location_address: string | null
          approx_lat: number | null
          approx_lng: number | null
          recipient_name: string
          recipient_age: number
          recipient_mobility: Mobility
          recipient_chronic_diseases: string[]
          created_at: string
        }[]
      }
      get_order_contact: {
        Args: { p_order_id: string }
        Returns: { user_id: string; display_name: string; phone: string; avatar_url: string | null }[]
      }
      get_conversations: {
        Args: Record<PropertyKey, never>
        Returns: {
          partner_id: string
          partner_name: string
          partner_avatar: string | null
          partner_role: UserRole
          last_message: string | null
          last_message_at: string | null
          last_sender_id: string | null
          unread_count: number
          active_order_id: string | null
        }[]
      }
      get_provider_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          month_hours: number
          month_orders: number
          month_earning: number
          total_orders: number
          available_balance: number
          last_withdraw_month: string | null
          rating_avg: number
          review_count: number
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row']
export type FunctionReturns<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Returns']
