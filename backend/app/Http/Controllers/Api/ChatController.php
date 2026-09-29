<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->query('user_id');

        $query = Message::query()->orderBy('created_at', 'desc')->limit(50);

        if ($userId) {
            $query->where(function ($q) use ($userId) {
                $q->where('recipient_id', $userId)
                  ->orWhere('sender_id', $userId);
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sender_id' => 'required|string',
            'sender_name' => 'required|string',
            'recipient_id' => 'required|string',
            'content' => 'nullable|string',
            'file_url' => 'nullable|string',
            'file_name' => 'nullable|string',
        ]);

        $message = Message::create($data);

        // Broadcast to WebSocket in real-time
        broadcast(new MessageSent($message))->toOthers();

        return response()->json($message, 201);
    }
}
