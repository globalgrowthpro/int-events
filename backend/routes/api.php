<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// 1. Public Auth
Route::post('/login', [AuthController::class, 'login'])->name('login');

// 2. Events CRUD (Full API endpoints)
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{id}', [EventController::class, 'show']);
Route::post('/events', [EventController::class, 'store']);
Route::put('/events/{id}', [EventController::class, 'update']);
Route::delete('/events/{id}', [EventController::class, 'destroy']);

// 3. Registrations & Attendance CRUD
Route::get('/registrations', [RegistrationController::class, 'index']);
Route::get('/registrations/check', [RegistrationController::class, 'check']);
Route::get('/registrations/{id}', [RegistrationController::class, 'show']);
Route::post('/registrations', [RegistrationController::class, 'store']);
Route::put('/registrations/{id}', [RegistrationController::class, 'update']);
Route::delete('/registrations/{id}', [RegistrationController::class, 'destroy']);
Route::post('/attendance/scan', [AttendanceController::class, 'scan']);
Route::get('/attendance/logs', [AttendanceController::class, 'logs']);

// 4. Chat & Realtime
Route::get('/messages', [ChatController::class, 'index']);
Route::post('/messages', [ChatController::class, 'store']);

// 5. Notifications
Route::get('/notifications', [NotificationController::class, 'index']);
Route::post('/notifications', [NotificationController::class, 'store']);
Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);

// 6. File Uploads (replaces Supabase storage)
Route::post('/upload', [UploadController::class, 'upload']);

// 7. Authenticated User Endpoints
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
