<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Registration extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'event_id',
        'user_id',
        'attendee_name',
        'attendee_email',
        'gender',
        'phone',
        'company',
        'job_title',
        'role',
        'ticket_token',
        'state',
        'is_primary',
        'delegation_leader_id',
        'dates_attending',
        'sector',
        'travel_required',
        'check_in_details',
        'check_out_details',
        'considerations',
        'check_in_time',
        'id_type',
        'id_number',
        'document_url',
        'id_doc_name',
        'national_id_front_url',
        'national_id_back_url',
        'passport_url',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'travel_required' => 'boolean',
        'check_in_time' => 'datetime',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class, 'event_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
