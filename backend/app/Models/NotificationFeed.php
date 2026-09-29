<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationFeed extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'notifications_feed';

    protected $fillable = [
        'id',
        'user_id',
        'title',
        'body',
        'tone',
        'audience',
        'read',
        'link',
        'sender_id',
    ];

    protected $casts = [
        'read' => 'boolean',
    ];
}
