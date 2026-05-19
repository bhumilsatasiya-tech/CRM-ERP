<?php

namespace Modules\Documents\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Documents\Models\Document;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 20), 100));
        return Document::query()
            ->when(($filters['attachable_type'] ?? '') !== '', fn(Builder $q) => $q->where('attachable_type', $filters['attachable_type']))
            ->when(($filters['attachable_id']   ?? null), fn(Builder $q, $v) => $q->where('attachable_id', (int) $v))
            ->when(($filters['category']        ?? '') !== '', fn(Builder $q) => $q->where('category', $filters['category']))
            ->when(($filters['search']          ?? '') !== '', fn(Builder $q) => $q->where('original_filename', 'like', '%'.$filters['search'].'%'))
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function upload(int $companyId, UploadedFile $file, string $attachableType, int $attachableId, string $category, ?string $notes, ?int $actorId): Document
    {
        return DB::transaction(function () use ($companyId, $file, $attachableType, $attachableId, $category, $notes, $actorId) {
            $disk = (string) env('SHARED_STORAGE_DRIVER', 'local');
            $folder = sprintf('documents/%d/%s', $companyId, date('Y/m'));
            $path = $file->store($folder, $disk);
            return Document::create([
                'company_id'        => $companyId,
                'attachable_type'   => $attachableType,
                'attachable_id'     => $attachableId,
                'category'          => $category,
                'original_filename' => $file->getClientOriginalName(),
                'disk'              => $disk,
                'path'              => $path,
                'mime_type'         => $file->getMimeType(),
                'size_bytes'        => $file->getSize(),
                'notes'             => $notes,
                'uploaded_by'       => $actorId,
                'created_by'        => $actorId,
                'updated_by'        => $actorId,
            ]);
        });
    }

    public function download(Document $doc): StreamedResponse
    {
        return Storage::disk($doc->disk)->download($doc->path, $doc->original_filename);
    }

    public function delete(Document $doc): void
    {
        DB::transaction(function () use ($doc) {
            Storage::disk($doc->disk)->delete($doc->path);
            $doc->delete();
        });
    }
}
