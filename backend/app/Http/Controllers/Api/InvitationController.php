<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InvitationController extends Controller
{
    public function index(Request $request)
    {
        $query = Invitation::query()->orderBy('created_at', 'desc');

        if ($request->has('event_id')) {
            $query->where('event_id', $request->query('event_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->get());
    }

    public function show($id)
    {
        $invitation = Invitation::findOrFail($id);
        return response()->json($invitation);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|string',
            'event_id' => 'nullable|string',
            'event_title' => 'nullable|string',
            'recipient_name' => 'required|string',
            'recipient_email' => 'required|email',
            'company' => 'nullable|string',
            'job_title' => 'nullable|string',
            'phone' => 'nullable|string',
            'source' => 'nullable|string',
            'status' => 'nullable|string',
            'sent_at' => 'nullable|date',
            'error_message' => 'nullable|string',
            'token' => 'nullable|string',
        ]);

        if (empty($data['id'])) {
            $data['id'] = 'INV-' . date('Y') . '-' . rand(10000, 99999);
        }
        if (empty($data['token'])) {
            $data['token'] = 'INV-TKT-' . strtoupper(Str::random(8));
        }
        if (empty($data['status'])) {
            $data['status'] = 'pending';
        }
        if (empty($data['source'])) {
            $data['source'] = 'manual';
        }

        $invitation = Invitation::create($data);
        return response()->json($invitation, 201);
    }

    public function update(Request $request, $id)
    {
        $invitation = Invitation::findOrFail($id);
        $invitation->update($request->all());
        return response()->json($invitation);
    }

    public function destroy($id)
    {
        $invitation = Invitation::findOrFail($id);
        $invitation->delete();
        return response()->json(['ok' => true]);
    }
}
