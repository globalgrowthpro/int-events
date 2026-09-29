<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'code',
        'title',
        'category',
        'date',
        'end_date',
        'date_label',
        'start_time',
        'end_time',
        'city',
        'venue',
        'map_url',
        'image_url',
        'capacity',
        'registered_count',
        'checked_in_count',
        'status',
        'organizer',
        'summary',
        'description',
        'partners',
        'partner_list',
        'speakers',
        'agenda',
        'agenda_url',
    ];

    protected $casts = [
        'description' => 'array',
        'partners' => 'array',
        'partner_list' => 'array',
        'speakers' => 'array',
        'agenda' => 'array',
        'capacity' => 'integer',
        'registered_count' => 'integer',
        'checked_in_count' => 'integer',
    ];

    public function registrations()
    {
        return $this->hasMany(Registration::class, 'event_id', 'id');
    }
}
