import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ||
  "https://ztjuhekmqnonpfnfbmho.supabase.co";
const supabaseAnonKey =
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0anVoZWttcW5vbnBmbmZibWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDM5OTYsImV4cCI6MjEwMjkxOTk5Nn0.n4Co-UgvJh9YI8gGX7AUZFfkk59vv5opDeft3jNiH9M";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          gender: "Male" | "Female" | null;
          company: string | null;
          job_title: string | null;
          phone: string | null;
          country: string | null;
          city: string | null;
          industry: string | null;
          linkedin_url: string | null;
          role: "admin" | "client" | "vendor" | "employee";
          status: "active" | "pending" | "suspended";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      events: {
        Row: {
          id: string;
          code: string;
          title: string;
          category: string;
          date: string;
          date_label: string;
          start_time: string;
          end_time: string;
          city: string;
          venue: string;
          image_url: string | null;
          capacity: number;
          registered_count: number;
          checked_in_count: number;
          status: "open" | "upcoming" | "almost-full" | "completed" | "cancelled";
          organizer: string;
          summary: string | null;
          description: string[];
          partners: string[];
          speakers: Array<{ name: string; position: string; company: string; bio: string }>;
          agenda: Array<{ time: string; title: string; detail?: string }>;
          created_at: string;
          updated_at: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          user_id: string | null;
          attendee_name: string;
          attendee_email: string;
          gender: "Male" | "Female" | null;
          phone: string | null;
          company: string | null;
          job_title: string | null;
          role: string;
          ticket_token: string;
          state: "registered" | "checked-in" | "cancelled" | "no-show";
          is_primary: boolean;
          delegation_leader_id: string | null;
          dates_attending: string;
          sector: string | null;
          travel_required: boolean;
          check_in_details: string | null;
          check_out_details: string | null;
          considerations: string | null;
          check_in_time: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          contact_person: string;
          gender: "Male" | "Female" | null;
          email: string;
          phone: string | null;
          category: string;
          website: string | null;
          address: string | null;
          logo_url: string | null;
          reps_count: number;
          approved_events_count: number;
          products_summary: string | null;
          has_partnership: boolean;
          state: "approved" | "pending" | "rejected";
          created_at: string;
          updated_at: string;
        };
      };
      attendance_logs: {
        Row: {
          id: string;
          registration_id: string;
          event_id: string;
          scanned_by: string | null;
          gate: string;
          scanned_at: string;
          status: "valid" | "duplicate" | "invalid";
          notes: string | null;
        };
      };
      certificates: {
        Row: {
          id: string;
          registration_id: string | null;
          event_id: string;
          user_id: string | null;
          recipient_name: string;
          issue_date: string;
          verification_hash: string;
          state: "issued" | "claimed" | "revoked";
          created_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          tone: "info" | "success" | "warning" | "destructive";
          read: boolean;
          link: string | null;
          created_at: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          event_id: string;
          event_title: string | null;
          recipient_name: string;
          recipient_email: string;
          company: string | null;
          job_title: string | null;
          phone: string | null;
          source: "accounts" | "excel" | "manual";
          status: "pending" | "sending" | "sent" | "failed";
          sent_at: string | null;
          error_message: string | null;
          token: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      smtp_settings: {
        Row: {
          id: string;
          host: string;
          port: number;
          encryption: "tls" | "ssl" | "none";
          username: string;
          password_encrypted: string;
          from_email: string;
          from_name: string;
          reply_to: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          recipient_email: string;
          template_name: string;
          subject: string;
          status: "sent" | "pending" | "failed";
          error_message: string | null;
          sent_at: string;
          created_at: string;
        };
      };
    };
  };
};
