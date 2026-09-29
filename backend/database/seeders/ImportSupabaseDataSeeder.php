<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ImportSupabaseDataSeeder extends Seeder
{
    public function run(): void
    {
        $jsonPath = base_path('../supabase_exported_data.json');
        if (!file_exists($jsonPath)) {
            $this->command->error("Export file not found: $jsonPath");
            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        if (!$data) {
            $this->command->error("Could not parse JSON.");
            return;
        }

        // 1. Users / Profiles
        if (!empty($data['profiles'])) {
            $this->command->info("Importing profiles (" . count($data['profiles']) . ")...");
            foreach ($data['profiles'] as $p) {
                // Determine a safe password hash (using standard demo credentials if none)
                $defaultPass = 'Client@INT2026!';
                if ($p['role'] === 'admin') $defaultPass = 'Admin@INT2026!';
                elseif ($p['role'] === 'vendor') $defaultPass = 'Vendor@INT2026!';
                elseif ($p['role'] === 'employee') $defaultPass = 'Employee@INT2026!';

                DB::table('users')->updateOrInsert(
                    ['email' => $p['email']],
                    [
                        'name' => $p['full_name'] ?? explode('@', $p['email'])[0],
                        'password' => Hash::make($defaultPass),
                        'role' => $p['role'] ?? 'client',
                        'status' => $p['status'] ?? 'active',
                        'gender' => $p['gender'] ?? null,
                        'company' => $p['company'] ?? null,
                        'job_title' => $p['job_title'] ?? null,
                        'phone' => $p['phone'] ?? null,
                        'country' => $p['country'] ?? 'Egypt',
                        'city' => $p['city'] ?? 'Cairo',
                        'industry' => $p['industry'] ?? null,
                        'linkedin_url' => $p['linkedin_url'] ?? null,
                        'avatar_url' => $p['avatar_url'] ?? null,
                        'can_chat' => $p['can_chat'] ?? true,
                        'id_type' => $p['id_type'] ?? null,
                        'id_number' => $p['id_number'] ?? null,
                        'document_url' => $p['document_url'] ?? null,
                        'id_doc_name' => $p['id_doc_name'] ?? null,
                        'created_at' => $p['created_at'] ?? now(),
                        'updated_at' => $p['updated_at'] ?? now(),
                    ]
                );
            }
        }

        // 2. Events
        if (!empty($data['events'])) {
            $this->command->info("Importing events (" . count($data['events']) . ")...");
            foreach ($data['events'] as $e) {
                DB::table('events')->updateOrInsert(
                    ['id' => $e['id']],
                    [
                        'code' => $e['code'],
                        'title' => $e['title'],
                        'category' => $e['category'] ?? 'Summit',
                        'date' => $e['date'],
                        'end_date' => $e['end_date'] ?? $e['date'],
                        'date_label' => $e['date_label'] ?? $e['date'],
                        'start_time' => $e['start_time'] ?? '09:00 AM',
                        'end_time' => $e['end_time'] ?? '05:00 PM',
                        'city' => $e['city'] ?? 'Cairo, Egypt',
                        'venue' => $e['venue'] ?? 'InterContinental Cairo',
                        'map_url' => $e['map_url'] ?? null,
                        'image_url' => $e['image_url'] ?? null,
                        'capacity' => $e['capacity'] ?? 250,
                        'registered_count' => $e['registered_count'] ?? 0,
                        'checked_in_count' => $e['checked_in_count'] ?? 0,
                        'status' => $e['status'] ?? 'open',
                        'organizer' => $e['organizer'] ?? 'Integrated Technics',
                        'summary' => $e['summary'] ?? null,
                        'description' => isset($e['description']) ? json_encode($e['description']) : null,
                        'partners' => isset($e['partners']) ? json_encode($e['partners']) : null,
                        'partner_list' => isset($e['partner_list']) ? json_encode($e['partner_list']) : null,
                        'speakers' => isset($e['speakers']) ? json_encode($e['speakers']) : null,
                        'agenda' => isset($e['agenda']) ? json_encode($e['agenda']) : null,
                        'agenda_url' => $e['agenda_url'] ?? null,
                        'created_at' => $e['created_at'] ?? now(),
                        'updated_at' => $e['updated_at'] ?? now(),
                    ]
                );
            }
        }

        // 3. Registrations
        if (!empty($data['registrations'])) {
            $this->command->info("Importing registrations (" . count($data['registrations']) . ")...");
            foreach ($data['registrations'] as $r) {
                DB::table('registrations')->updateOrInsert(
                    ['id' => $r['id']],
                    [
                        'event_id' => $r['event_id'],
                        'user_id' => null, // decouple Supabase UUID user_id
                        'attendee_name' => $r['attendee_name'],
                        'attendee_email' => $r['attendee_email'],
                        'gender' => $r['gender'] ?? null,
                        'phone' => $r['phone'] ?? null,
                        'company' => $r['company'] ?? null,
                        'job_title' => $r['job_title'] ?? null,
                        'role' => $r['role'] ?? 'client',
                        'ticket_token' => $r['ticket_token'] ?? ('TKT-' . rand(100000, 999999)),
                        'state' => $r['state'] ?? 'registered',
                        'is_primary' => $r['is_primary'] ?? true,
                        'delegation_leader_id' => $r['delegation_leader_id'] ?? null,
                        'dates_attending' => $r['dates_attending'] ?? null,
                        'sector' => $r['sector'] ?? null,
                        'travel_required' => $r['travel_required'] ?? false,
                        'check_in_details' => $r['check_in_details'] ?? null,
                        'check_out_details' => $r['check_out_details'] ?? null,
                        'considerations' => $r['considerations'] ?? null,
                        'check_in_time' => $r['check_in_time'] ?? null,
                        'id_type' => $r['id_type'] ?? null,
                        'id_number' => $r['id_number'] ?? null,
                        'document_url' => $r['document_url'] ?? null,
                        'id_doc_name' => $r['id_doc_name'] ?? null,
                        'national_id_front_url' => $r['national_id_front_url'] ?? null,
                        'national_id_back_url' => $r['national_id_back_url'] ?? null,
                        'passport_url' => $r['passport_url'] ?? null,
                        'created_at' => $r['created_at'] ?? now(),
                        'updated_at' => $r['updated_at'] ?? now(),
                    ]
                );
            }
        }

        // 4. Vendors
        if (!empty($data['vendors'])) {
            $this->command->info("Importing vendors (" . count($data['vendors']) . ")...");
            foreach ($data['vendors'] as $v) {
                DB::table('vendors')->updateOrInsert(
                    ['id' => $v['id']],
                    [
                        'name' => $v['name'],
                        'contact_person' => $v['contact_person'] ?? $v['name'],
                        'gender' => $v['gender'] ?? null,
                        'email' => $v['email'],
                        'phone' => $v['phone'] ?? null,
                        'category' => $v['category'] ?? 'Security & AI',
                        'website' => $v['website'] ?? null,
                        'address' => $v['address'] ?? null,
                        'logo_url' => $v['logo_url'] ?? null,
                        'reps_count' => $v['reps_count'] ?? 0,
                        'approved_events_count' => $v['approved_events_count'] ?? 0,
                        'products_summary' => $v['products_summary'] ?? null,
                        'has_partnership' => $v['has_partnership'] ?? false,
                        'state' => $v['state'] ?? 'approved',
                        'created_at' => $v['created_at'] ?? now(),
                        'updated_at' => $v['updated_at'] ?? now(),
                    ]
                );
            }
        }

        // 5. Invitations
        if (!empty($data['invitations'])) {
            $this->command->info("Importing invitations (" . count($data['invitations']) . ")...");
            foreach ($data['invitations'] as $inv) {
                DB::table('invitations')->updateOrInsert(
                    ['id' => $inv['id']],
                    [
                        'event_id' => $inv['event_id'] ?? null,
                        'event_title' => $inv['event_title'] ?? null,
                        'recipient_name' => $inv['recipient_name'],
                        'recipient_email' => $inv['recipient_email'],
                        'company' => $inv['company'] ?? null,
                        'job_title' => $inv['job_title'] ?? null,
                        'phone' => $inv['phone'] ?? null,
                        'source' => $inv['source'] ?? 'accounts',
                        'status' => $inv['status'] ?? 'pending',
                        'sent_at' => $inv['sent_at'] ?? null,
                        'error_message' => $inv['error_message'] ?? null,
                        'token' => $inv['token'] ?? null,
                        'created_at' => $inv['created_at'] ?? now(),
                        'updated_at' => $inv['updated_at'] ?? now(),
                    ]
                );
            }
        }

        // 6. SMTP Settings
        if (!empty($data['smtp_settings'])) {
            $this->command->info("Importing SMTP settings...");
            foreach ($data['smtp_settings'] as $smtp) {
                DB::table('smtp_settings')->updateOrInsert(
                    ['id' => $smtp['id']],
                    [
                        'host' => $smtp['host'],
                        'port' => $smtp['port'] ?? 587,
                        'encryption' => $smtp['encryption'] ?? 'tls',
                        'username' => $smtp['username'],
                        'password' => $smtp['password_encrypted'] ?? $smtp['password'] ?? '',
                        'from_email' => $smtp['from_email'],
                        'from_name' => $smtp['from_name'],
                        'reply_to' => $smtp['reply_to'] ?? null,
                        'is_active' => $smtp['is_active'] ?? true,
                        'created_at' => $smtp['created_at'] ?? now(),
                        'updated_at' => $smtp['updated_at'] ?? now(),
                    ]
                );
            }
        }

        // 7. Email Templates
        if (!empty($data['email_templates'])) {
            $this->command->info("Importing email templates...");
            foreach ($data['email_templates'] as $tpl) {
                DB::table('email_templates')->updateOrInsert(
                    ['id' => $tpl['id']],
                    [
                        'name' => $tpl['name'] ?? $tpl['id'],
                        'config' => is_array($tpl['config']) ? json_encode($tpl['config']) : ($tpl['config'] ?? '{}'),
                        'created_at' => $tpl['created_at'] ?? now(),
                        'updated_at' => $tpl['updated_at'] ?? now(),
                    ]
                );
            }
        }

        // 8. Email Logs
        if (!empty($data['email_logs'])) {
            $this->command->info("Importing email logs (" . count($data['email_logs']) . ")...");
            foreach ($data['email_logs'] as $log) {
                DB::table('email_logs')->updateOrInsert(
                    ['id' => $log['id']],
                    [
                        'recipient_email' => $log['recipient_email'],
                        'template_name' => $log['template_name'] ?? null,
                        'subject' => $log['subject'] ?? 'Notification',
                        'status' => $log['status'] ?? 'sent',
                        'error_message' => $log['error_message'] ?? null,
                        'sent_at' => $log['sent_at'] ?? null,
                        'created_at' => $log['created_at'] ?? now(),
                        'updated_at' => $log['updated_at'] ?? now(),
                    ]
                );
            }
        }

        $this->command->info("All Supabase live data imported successfully into PostgreSQL!");
    }
}
