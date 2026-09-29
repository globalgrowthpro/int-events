<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add profile fields to users table (replaces supabase auth.users + public.profiles)
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 30)->default('client')->index(); // admin, client, vendor, employee
            $table->string('status', 30)->default('active')->index(); // active, pending, suspended
            $table->string('gender', 10)->nullable(); // Male, Female
            $table->string('company')->nullable();
            $table->string('job_title')->nullable();
            $table->string('phone')->nullable();
            $table->string('country')->default('Egypt')->nullable();
            $table->string('city')->default('Cairo')->nullable();
            $table->string('industry')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->text('avatar_url')->nullable();
            $table->boolean('can_chat')->default(true);
            $table->string('id_type')->default('National ID')->nullable();
            $table->string('id_number')->nullable();
            $table->text('document_url')->nullable();
            $table->string('id_doc_name')->nullable();
        });

        // 1. Events Table
        Schema::create('events', function (Blueprint $table) {
            $table->string('id')->primary(); // code or slug or uuid
            $table->string('code')->unique();
            $table->string('title');
            $table->string('category')->default('Summit');
            $table->date('date');
            $table->date('end_date')->nullable();
            $table->string('date_label');
            $table->string('start_time')->default('09:00 AM');
            $table->string('end_time')->default('05:00 PM');
            $table->string('city')->default('Cairo, Egypt');
            $table->string('venue');
            $table->text('map_url')->nullable();
            $table->text('image_url')->nullable();
            $table->integer('capacity')->default(250);
            $table->integer('registered_count')->default(0);
            $table->integer('checked_in_count')->default(0);
            $table->string('status')->default('upcoming'); // open, upcoming, almost-full, completed, cancelled
            $table->string('organizer')->default('Integrated Technics');
            $table->text('summary')->nullable();
            $table->json('description')->nullable();
            $table->json('partners')->nullable();
            $table->json('partner_list')->nullable();
            $table->json('speakers')->nullable();
            $table->json('agenda')->nullable();
            $table->text('agenda_url')->nullable();
            $table->timestamps();
        });

        // 2. Registrations Table
        Schema::create('registrations', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('event_id')->index();
            $table->foreign('event_id')->references('id')->on('events')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('attendee_name');
            $table->string('attendee_email')->index();
            $table->string('gender', 10)->nullable();
            $table->string('phone')->nullable();
            $table->string('company')->nullable();
            $table->string('job_title')->nullable();
            $table->string('role')->default('client');
            $table->string('ticket_token')->unique();
            $table->string('state')->default('registered'); // registered, checked-in, cancelled, no-show
            $table->boolean('is_primary')->default(true);
            $table->string('delegation_leader_id')->nullable()->index();
            $table->string('dates_attending')->nullable();
            $table->string('sector')->nullable();
            $table->boolean('travel_required')->default(false);
            $table->text('check_in_details')->nullable();
            $table->text('check_out_details')->nullable();
            $table->text('considerations')->nullable();
            $table->timestamp('check_in_time')->nullable();
            $table->string('id_type')->nullable();
            $table->string('id_number')->nullable();
            $table->text('document_url')->nullable();
            $table->string('id_doc_name')->nullable();
            $table->text('national_id_front_url')->nullable();
            $table->text('national_id_back_url')->nullable();
            $table->text('passport_url')->nullable();
            $table->timestamps();
        });

        // 3. Vendors Table
        Schema::create('vendors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('contact_person');
            $table->string('gender', 10)->nullable();
            $table->string('email')->index();
            $table->string('phone')->nullable();
            $table->string('category')->default('Security & AI');
            $table->string('website')->nullable();
            $table->text('address')->nullable();
            $table->text('logo_url')->nullable();
            $table->integer('reps_count')->default(0);
            $table->integer('approved_events_count')->default(0);
            $table->text('products_summary')->nullable();
            $table->boolean('has_partnership')->default(false);
            $table->string('state')->default('pending'); // approved, pending, rejected
            $table->timestamps();
        });

        // 4. Attendance Logs Table
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('registration_id')->index();
            $table->string('event_id')->index();
            $table->string('scanned_by')->nullable();
            $table->string('gate')->default('Main Entrance');
            $table->timestamp('scanned_at')->useCurrent();
            $table->string('status')->default('valid'); // valid, duplicate, invalid
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 5. Notifications Table
        Schema::create('notifications_feed', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('user_id')->nullable()->index();
            $table->string('title');
            $table->text('body');
            $table->string('tone')->default('info'); // info, success, warning, destructive, critical, chat
            $table->string('audience')->default('participant'); // participant, admin
            $table->boolean('read')->default(false);
            $table->string('link')->nullable();
            $table->string('sender_id')->nullable();
            $table->timestamps();
        });

        // 6. Messages Table (Chat)
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('sender_id')->index();
            $table->string('sender_name');
            $table->string('recipient_id')->index();
            $table->text('content')->nullable();
            $table->string('file_url')->nullable();
            $table->string('file_name')->nullable();
            $table->boolean('read')->default(false);
            $table->timestamps();
        });

        // 7. Invitations Table
        Schema::create('invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_id')->nullable()->index();
            $table->string('event_title')->nullable();
            $table->string('recipient_name');
            $table->string('recipient_email')->index();
            $table->string('company')->nullable();
            $table->string('job_title')->nullable();
            $table->string('phone')->nullable();
            $table->string('source')->default('manual'); // accounts, excel, manual
            $table->string('status')->default('pending'); // pending, sending, sent, failed
            $table->timestamp('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->string('token')->nullable()->index();
            $table->timestamps();
        });

        // 8. SMTP Settings & Email Logs Table
        Schema::create('smtp_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('host');
            $table->integer('port')->default(587);
            $table->string('encryption')->default('tls'); // tls, ssl, none
            $table->string('username');
            $table->text('password');
            $table->string('from_email');
            $table->string('from_name');
            $table->string('reply_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('email_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('recipient_email')->index();
            $table->string('template_name')->nullable();
            $table->string('subject');
            $table->string('status')->default('pending'); // sent, pending, failed
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        // 9. Email Templates Table
        Schema::create('email_templates', function (Blueprint $table) {
            $table->string('id')->primary(); // badge, default, registration, thankyou
            $table->string('name');
            $table->json('config');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_templates');
        Schema::dropIfExists('email_logs');
        Schema::dropIfExists('smtp_settings');
        Schema::dropIfExists('invitations');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('notifications_feed');
        Schema::dropIfExists('attendance_logs');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('registrations');
        Schema::dropIfExists('events');
        
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role', 'status', 'gender', 'company', 'job_title', 'phone', 
                'country', 'city', 'industry', 'linkedin_url', 'avatar_url', 
                'can_chat', 'id_type', 'id_number', 'document_url', 'id_doc_name'
            ]);
        });
    }
};
