<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Verified Demo Accounts
        $accounts = [
            [
                'name' => 'Hafez Rahim',
                'email' => 'admin@integratedtechnics.com',
                'password' => Hash::make('Admin@INT2026!'),
                'company' => 'Integrated Technics',
                'job_title' => 'Executive Director',
                'role' => 'admin',
                'status' => 'active',
                'avatar_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
                'country' => 'Egypt',
                'city' => 'Cairo',
            ],
            [
                'name' => 'Ahmed Mohamed',
                'email' => 'client@intevents.com',
                'password' => Hash::make('Client@INT2026!'),
                'company' => 'ABC Corporation',
                'job_title' => 'IT Director',
                'role' => 'client',
                'status' => 'active',
                'avatar_url' => 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80',
                'country' => 'Egypt',
                'city' => 'Cairo',
            ],
            [
                'name' => 'Sarah Klein',
                'email' => 'vendor@genetec.com',
                'password' => Hash::make('Vendor@INT2026!'),
                'company' => 'Genetec',
                'job_title' => 'Regional Partner Manager',
                'role' => 'vendor',
                'status' => 'active',
                'avatar_url' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                'country' => 'Egypt',
                'city' => 'Cairo',
            ],
            [
                'name' => 'Omar Ali',
                'email' => 'employee@integratedtechnics.com',
                'password' => Hash::make('Employee@INT2026!'),
                'company' => 'Integrated Technics',
                'job_title' => 'Operations Officer',
                'role' => 'employee',
                'status' => 'active',
                'avatar_url' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
                'country' => 'Egypt',
                'city' => 'Cairo',
            ],
        ];

        foreach ($accounts as $acc) {
            User::updateOrCreate(['email' => $acc['email']], $acc);
        }

        // 2. Seed Default Flagship Event
        Event::updateOrCreate(
            ['code' => 'INT-SEC-2026'],
            [
                'id' => 'integrated-technics-showcase-event-its2026',
                'code' => 'INT-SEC-2026',
                'title' => 'INT Security Technology Summit 2026',
                'category' => 'Summit',
                'date' => '2026-10-15',
                'end_date' => '2026-10-16',
                'date_label' => 'Oct 15 - 16, 2026',
                'start_time' => '09:00 AM',
                'end_time' => '05:00 PM',
                'city' => 'Cairo, Egypt',
                'venue' => 'InterContinental Citystars Cairo',
                'map_url' => 'https://maps.google.com',
                'image_url' => 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
                'capacity' => 500,
                'registered_count' => 0,
                'checked_in_count' => 0,
                'status' => 'open',
                'organizer' => 'Integrated Technics',
                'summary' => 'Premier technology and enterprise security gathering showcasing AI-driven surveillance, access control, and mission-critical communications.',
                'description' => [
                    'Join industry leaders, system integrators, and security professionals for the annual Integrated Technics Showcase.',
                    'Featuring live technology zones, partner exhibits, and keynote presentations.'
                ],
                'partners' => ['Genetec', 'Milestone', 'HID', 'Axis Communications'],
                'speakers' => [
                    [
                        'name' => 'Hafez Rahim',
                        'position' => 'Executive Director',
                        'company' => 'Integrated Technics',
                        'bio' => 'Keynote speaker on next-generation physical security architecture.'
                    ]
                ],
                'agenda' => [
                    [
                        'time' => '09:00 AM',
                        'title' => 'Registration & Welcome Coffee',
                        'detail' => 'Badge collection at main gate.'
                    ],
                    [
                        'time' => '10:00 AM',
                        'title' => 'Opening Keynote: AI in Physical Security',
                        'detail' => 'Transforming enterprise surveillance with edge computing.'
                    ]
                ]
            ]
        );
    }
}
