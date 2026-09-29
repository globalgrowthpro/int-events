<?php

namespace App\Http\Controllers\Api;

use App\Events\NotificationBroadcasted;
use App\Http\Controllers\Controller;
use App\Models\NotificationFeed;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $audience = $request->query('audience', 'participant');
        $userId = $request->query('user_id');

        $query = NotificationFeed::query()->orderBy('created_at', 'desc')->limit(50);

        if ($userId) {
            $query->where(function ($q) use ($userId, $audience) {
                $q->where('user_id', $userId)
                  ->orWhere('audience', $audience)
                  ->orWhereNull('user_id');
            });
        } else {
            $query->where('audience', $audience)->orWhereNull('user_id');
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string',
            'body' => 'required|string',
            'tone' => 'nullable|string',
            'audience' => 'nullable|string',
            'user_id' => 'nullable|string',
            'link' => 'nullable|string',
            'sender_id' => 'nullable|string',
        ]);

        $notification = NotificationFeed::create($data);

        // Broadcast to WebSocket in real-time
        broadcast(new NotificationBroadcasted($notification))->toOthers();

        return response()->json($notification, 201);
    }

    public function markAllRead(Request $request)
    {
        NotificationFeed::query()->update(['read' => true]);
        return response()->json(['ok' => true]);
    }
}
