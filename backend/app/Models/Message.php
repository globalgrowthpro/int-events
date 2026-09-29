<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'sender_id',
        'sender_name',
        'recipient_id',
        'content',
        'file_url',
        'file_name',
        'read',
    ];

    protected $casts = [
        'read' => 'boolean',
    ];
}
