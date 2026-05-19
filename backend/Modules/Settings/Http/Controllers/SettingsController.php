<?php

namespace Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Modules\Settings\Http\Requests\StoreSettingRequest;
use Modules\Settings\Http\Requests\UpdateSettingRequest;
use Modules\Settings\Http\Resources\SettingResource;
use Modules\Settings\Models\Setting;
use Modules\Settings\Services\SettingService;

class SettingsController extends Controller
{
    public function __construct(private SettingService $settings)
    {
        $this->authorizeResource(Setting::class, 'setting');
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = Setting::query()
            ->when($request->filled('scope'), fn($q) => $q->where('scope', $request->string('scope')))
            ->when($request->filled('scope_id'), fn($q) => $q->where('scope_id', $request->integer('scope_id')))
            ->when($request->filled('group'), fn($q) => $q->where('group', $request->string('group')))
            ->when($request->filled('search'), fn($q) => $q->where(function ($qq) use ($request) {
                $term = '%'.$request->string('search').'%';
                $qq->where('key', 'like', $term)->orWhere('label', 'like', $term);
            }))
            ->orderBy('group')->orderBy('key')
            ->get();
        return SettingResource::collection($rows);
    }

    public function store(StoreSettingRequest $request): JsonResponse
    {
        $setting = $this->settings->set(
            $request->validated()['scope'],
            $request->validated()['scope_id'] ?? null,
            $request->validated()['key'],
            $request->validated()['value'] ?? null,
            $request->user()?->id
        );
        // Update meta fields
        $setting->fill($request->only(['group', 'type', 'label', 'description', 'options', 'is_public']))->save();
        return (new SettingResource($setting))->response()->setStatusCode(201);
    }

    public function show(Setting $setting): SettingResource
    {
        return new SettingResource($setting);
    }

    public function update(UpdateSettingRequest $request, Setting $setting): SettingResource
    {
        $value = $request->validated()['value'] ?? null;
        $this->settings->set($setting->scope, $setting->scope_id, $setting->key, $value, $request->user()?->id);
        $setting->fill($request->only(['label', 'description', 'options', 'is_public']));
        $setting->updated_by = $request->user()?->id;
        $setting->save();
        return new SettingResource($setting->fresh());
    }

    public function destroy(Setting $setting): JsonResponse
    {
        $this->settings->delete($setting);
        return response()->json(['data' => ['message' => 'Setting deleted.']]);
    }

    /** GET /me/settings — public globals + the current user's user-scoped settings */
    public function mySettings(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        $rows = Setting::query()
            ->where(function ($q) use ($userId) {
                $q->where(fn($qq) => $qq->where('scope', 'global')->where('is_public', true))
                  ->orWhere(fn($qq) => $qq->where('scope', 'user')->where('scope_id', $userId));
            })
            ->orderBy('group')->orderBy('key')
            ->get();
        return response()->json(['data' => SettingResource::collection($rows)]);
    }
}
