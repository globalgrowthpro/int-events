<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Registration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AttendanceController extends Controller
{
    public function scan(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'scanned_by' => 'nullable|string',
            'gate' => 'nullable|string',
        ]);

        $token = trim($request->token);
        $scannedBy = $request->scanned_by ?? 'QR Scanner';
        $gate = $request->gate ?? 'Main Gate';

        $reg = Registration::with('event')
            ->where('ticket_token', $token)
            ->orWhere('id', $token)
            ->first();

        if (!$reg) {
            return response()->json([
                'valid' => false,
                'status' => 'invalid',
                'message' => 'No registration found for this QR code / badge.',
            ], 404);
        }

        if ($reg->state === 'checked-in') {
            DB::table('attendance_logs')->insert([
                'id' => (string) Str::uuid(),
                'registration_id' => $reg->id,
                'event_id' => $reg->event_id,
                'scanned_by' => $scannedBy,
                'gate' => $gate,
                'scanned_at' => now(),
                'status' => 'duplicate',
                'notes' => 'Attendee was already checked in at ' . ($reg->check_in_time ? $reg->check_in_time->format('h:i A') : 'earlier'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'valid' => false,
                'duplicate' => true,
                'status' => 'duplicate',
                'attendee_name' => $reg->attendee_name,
                'event_title' => $reg->event?->title,
                'check_in_time' => $reg->check_in_time,
                'message' => "ALREADY CHECKED IN: {$reg->attendee_name} was previously scanned.",
            ]);
        }

        // Mark as checked-in
        $reg->update([
            'state' => 'checked-in',
            'check_in_time' => now(),
        ]);

        Event::where('id', $reg->event_id)->increment('checked_in_count');

        DB::table('attendance_logs')->insert([
            'id' => (string) Str::uuid(),
            'registration_id' => $reg->id,
            'event_id' => $reg->event_id,
            'scanned_by' => $scannedBy,
            'gate' => $gate,
            'scanned_at' => now(),
            'status' => 'valid',
            'notes' => 'Successfully checked in via QR scanner.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'valid' => true,
            'status' => 'valid',
            'attendee_name' => $reg->attendee_name,
            'attendee_email' => $reg->attendee_email,
            'company' => $reg->company,
            'job_title' => $reg->job_title,
            'role' => $reg->role,
            'event_title' => $reg->event?->title,
            'registration_id' => $reg->id,
            'ticket_token' => $reg->ticket_token,
            'check_in_time' => $reg->check_in_time,
            'message' => "Welcome, {$reg->attendee_name}! Check-in verified.",
        ]);
    }

    public function logs(Request $request)
    {
        $query = DB::table('attendance_logs')->orderBy('scanned_at', 'desc')->limit(100);

        if ($request->has('event_id')) {
            $query->where('event_id', $request->query('event_id'));
        }

        return response()->json($query->get());
    }
}
