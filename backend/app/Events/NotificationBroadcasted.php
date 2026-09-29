<?php

namespace App\Events;

use App\Models\NotificationFeed;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationBroadcasted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;

    public function __construct(NotificationFeed $notification)
    {
        $this->notification = $notification;
    }

    public function broadcastOn(): array
    {
        $channels = [new Channel('notifications-global')];

        if ($this->notification->user_id) {
            $channels[] = new Channel('notifications.' . $this->notification->user_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }
}
