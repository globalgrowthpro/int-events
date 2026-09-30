<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    public function getSmtp()
    {
        $smtp = DB::table('smtp_settings')->first();
        return response()->json($smtp);
    }

    public function getTemplate($id)
    {
        $tpl = DB::table('email_templates')->where('id', $id)->first();
        if (!$tpl) {
            $tpl = DB::table('email_templates')->first();
        }
        if ($tpl && isset($tpl->config) && is_string($tpl->config)) {
            $tpl->config = json_decode($tpl->config, true);
        }
        return response()->json($tpl);
    }

    public function getAccounts()
    {
        $users = DB::table('users')
            ->select('id', 'name as full_name', 'email', 'company', 'job_title', 'phone', 'role', 'status')
            ->orderBy('name', 'asc')
            ->get();
        return response()->json($users);
    }

    public function logEmail(Request $request)
    {
        $data = $request->validate([
            'recipient_email' => 'required|email',
            'template_name' => 'nullable|string',
            'subject' => 'nullable|string',
            'status' => 'nullable|string',
            'error_message' => 'nullable|string',
        ]);

        $uuid = (string) \Illuminate\Support\Str::uuid();
        DB::table('email_logs')->insert([
            'id' => $uuid,
            'recipient_email' => $data['recipient_email'],
            'template_name' => $data['template_name'] ?? 'event_invitation',
            'subject' => $data['subject'] ?? 'Notification',
            'status' => $data['status'] ?? 'sent',
            'error_message' => $data['error_message'] ?? null,
            'sent_at' => ($data['status'] ?? 'sent') === 'sent' ? now() : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'id' => $uuid]);
    }
}
