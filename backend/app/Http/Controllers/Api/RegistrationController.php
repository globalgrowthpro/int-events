<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Registration;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RegistrationController extends Controller
{
    public function index(Request $request)
    {
        $query = Registration::with('event')->orderBy('created_at', 'desc');

        if ($request->has('event_id')) {
            $query->where('event_id', $request->query('event_id'));
        }

        if ($request->has('email')) {
            $query->whereRaw('LOWER(attendee_email) = ?', [strtolower(trim($request->query('email')))]);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        return response()->json($query->get());
    }

    public function show($id)
    {
        $reg = Registration::with('event')
            ->where('id', $id)
            ->orWhere('ticket_token', $id)
            ->firstOrFail();

        return response()->json($reg);
    }

    public function check(Request $request)
    {
        $eventId = $request->query('event_id');
        $email = $request->query('email');
        $userId = $request->query('user_id');

        if (!$eventId || (!$email && !$userId)) {
            return response()->json(['isRegistered' => false]);
        }

        $query = Registration::where('event_id', $eventId)->where('state', '!=', 'cancelled');

        if ($email) {
            $query->whereRaw('LOWER(attendee_email) = ?', [strtolower(trim($email))]);
        } elseif ($userId) {
            $query->where('user_id', $userId);
        }

        $reg = $query->first();

        if ($reg) {
            return response()->json([
                'isRegistered' => true,
                'ticketToken' => $reg->ticket_token,
                'registration' => $reg,
            ]);
        }

        return response()->json(['isRegistered' => false]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'event_id' => 'required|exists:events,id',
            'attendee_name' => 'required|string',
            'attendee_email' => 'required|email',
            'user_id' => 'nullable',
            'gender' => 'nullable|string',
            'phone' => 'nullable|string',
            'company' => 'nullable|string',
            'job_title' => 'nullable|string',
            'role' => 'nullable|string',
            'dates_attending' => 'nullable|string',
            'sector' => 'nullable|string',
            'travel_required' => 'nullable|boolean',
            'check_in_details' => 'nullable|string',
            'check_out_details' => 'nullable|string',
            'considerations' => 'nullable|string',
            'id_type' => 'nullable|string',
            'id_number' => 'nullable|string',
            'document_url' => 'nullable|string',
            'id_doc_name' => 'nullable|string',
            'national_id_front_url' => 'nullable|string',
            'national_id_back_url' => 'nullable|string',
            'passport_url' => 'nullable|string',
        ]);

        // Duplicate check
        $exists = Registration::where('event_id', $data['event_id'])
            ->whereRaw('LOWER(attendee_email) = ?', [strtolower(trim($data['attendee_email']))])
            ->where('state', '!=', 'cancelled')
            ->first();

        if ($exists) {
            return response()->json([
                'success' => false,
                'duplicate' => true,
                'ticketToken' => $exists->ticket_token,
                'message' => 'Attendee is already registered for this event.',
            ], 422);
        }

        $regId = 'INT-EVT-' . rand(100000, 999999);
        $token = 'TKT-' . strtoupper(Str::random(10));

        $reg = Registration::create(array_merge($data, [
            'id' => $regId,
            'ticket_token' => $token,
            'state' => 'registered',
            'is_primary' => true,
        ]));

        // Increment event registered count
        Event::where('id', $data['event_id'])->increment('registered_count');

        return response()->json([
            'success' => true,
            'id' => $reg->id,
            'ticketToken' => $reg->ticket_token,
            'registration' => $reg,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $reg = Registration::findOrFail($id);
        $reg->update($request->all());
        return response()->json($reg);
    }

    public function destroy($id)
    {
        $reg = Registration::findOrFail($id);
        $reg->delete();
        return response()->json(['ok' => true]);
    }
}
