<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index()
    {
        $events = Event::withCount([
            'registrations as registered_count' => function ($q) {
                $q->where('state', '!=', 'cancelled');
            },
            'registrations as checked_in_count' => function ($q) {
                $q->where('state', 'checked-in');
            },
        ])->orderBy('date', 'asc')->get();

        return response()->json($events);
    }

    public function show($id)
    {
        $event = Event::withCount([
            'registrations as registered_count' => function ($q) {
                $q->where('state', '!=', 'cancelled');
            },
            'registrations as checked_in_count' => function ($q) {
                $q->where('state', 'checked-in');
            },
        ])->where('id', $id)->orWhere('code', $id)->firstOrFail();

        return response()->json($event);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string|unique:events,id',
            'code' => 'required|string|unique:events,code',
            'title' => 'required|string',
            'category' => 'nullable|string',
            'date' => 'required|date',
            'end_date' => 'nullable|date',
            'date_label' => 'required|string',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string',
            'city' => 'nullable|string',
            'venue' => 'required|string',
            'map_url' => 'nullable|string',
            'image_url' => 'nullable|string',
            'capacity' => 'nullable|integer',
            'status' => 'nullable|string',
            'organizer' => 'nullable|string',
            'summary' => 'nullable|string',
            'description' => 'nullable|array',
            'partners' => 'nullable|array',
            'partner_list' => 'nullable|array',
            'speakers' => 'nullable|array',
            'agenda' => 'nullable|array',
            'agenda_url' => 'nullable|string',
        ]);

        $event = Event::create($data);
        return response()->json($event, 201);
    }

    public function update(Request $request, $id)
    {
        $event = Event::findOrFail($id);
        $event->update($request->all());
        return response()->json($event);
    }

    public function destroy($id)
    {
        $event = Event::findOrFail($id);
        $event->delete();
        return response()->json(['ok' => true]);
    }
}
