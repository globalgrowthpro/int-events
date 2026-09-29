<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:20480', // 20MB limit
            'folder' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $folder = $request->input('folder', 'documents');

        $cleanName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $extension = $file->getClientOriginalExtension();
        $fileName = time() . '_' . Str::random(6) . '_' . $cleanName . '.' . $extension;

        $path = $file->storeAs("public/{$folder}", $fileName);
        $url = asset("storage/{$folder}/{$fileName}");

        return response()->json([
            'success' => true,
            'url' => $url,
            'name' => $file->getClientOriginalName(),
            'path' => $path,
        ]);
    }
}
