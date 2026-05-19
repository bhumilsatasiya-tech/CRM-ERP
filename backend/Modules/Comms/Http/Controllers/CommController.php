<?php

namespace Modules\Comms\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Comms\Models\CommMessage;
use Modules\Comms\Models\CommTemplate;
use Modules\Comms\Services\CommService;

class CommController extends Controller
{
    public function __construct(private CommService $service) {}

    public function sendEmail(Request $request): JsonResponse
    {
        if (! $request->user()?->can('comm.send.email')) abort(403);
        $data = $request->validate([
            'to'           => ['required', 'email'],
            'subject'      => ['required', 'string', 'max:255'],
            'body'         => ['required', 'string'],
            'related_type' => ['nullable', 'string', 'max:191'],
            'related_id'   => ['nullable', 'integer'],
        ]);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $msg = $this->service->sendEmail(
            $data['to'], $data['subject'], $data['body'],
            $companyId, $data['related_type'] ?? null, $data['related_id'] ?? null,
            $request->user()?->id
        );
        return response()->json(['data' => $msg]);
    }

    public function sendWhatsApp(Request $request): JsonResponse
    {
        if (! $request->user()?->can('comm.send.whatsapp')) abort(403);
        $data = $request->validate([
            'to'           => ['required', 'string', 'max:32'],
            'body'         => ['required', 'string'],
            'related_type' => ['nullable', 'string', 'max:191'],
            'related_id'   => ['nullable', 'integer'],
        ]);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $msg = $this->service->sendWhatsApp(
            $data['to'], $data['body'],
            $companyId, $data['related_type'] ?? null, $data['related_id'] ?? null,
            $request->user()?->id
        );
        return response()->json(['data' => $msg]);
    }

    public function messages(Request $request): JsonResponse
    {
        if (! $request->user()?->can('comm.view')) abort(403);
        $perPage = max(1, min((int) $request->input('per_page', 20), 100));
        $rows = CommMessage::query()
            ->when($request->input('channel'), fn($q, $v) => $q->where('channel', $v))
            ->when($request->input('status'), fn($q, $v) => $q->where('status', $v))
            ->when($request->input('related_type'), fn($q, $v) => $q->where('related_type', $v))
            ->when($request->input('related_id'), fn($q, $v) => $q->where('related_id', (int) $v))
            ->orderByDesc('id')
            ->paginate($perPage);
        return response()->json($rows);
    }

    public function templates(Request $request): JsonResponse
    {
        if (! $request->user()?->can('comm.view')) abort(403);
        return response()->json(['data' => CommTemplate::orderBy('channel')->orderBy('code')->get()]);
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        if (! $request->user()?->can('comm.template.manage')) abort(403);
        $companyId = app()->bound('active_company_id') ? app('active_company_id') : 0;
        $data = $request->validate([
            'code'      => ['required', 'string', 'max:64'],
            'name'      => ['required', 'string', 'max:191'],
            'channel'   => ['required', 'string', 'in:email,whatsapp,sms'],
            'subject'   => ['nullable', 'string', 'max:255'],
            'body'      => ['required', 'string'],
            'variables' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $t = CommTemplate::create(array_merge($data, ['company_id' => $companyId]));
        return response()->json(['data' => $t], 201);
    }

    public function updateTemplate(Request $request, CommTemplate $template): JsonResponse
    {
        if (! $request->user()?->can('comm.template.manage')) abort(403);
        $template->fill($request->validate([
            'code'      => ['sometimes', 'string', 'max:64'],
            'name'      => ['sometimes', 'string', 'max:191'],
            'channel'   => ['sometimes', 'string', 'in:email,whatsapp,sms'],
            'subject'   => ['nullable', 'string', 'max:255'],
            'body'      => ['sometimes', 'string'],
            'variables' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]))->save();
        return response()->json(['data' => $template]);
    }

    public function destroyTemplate(Request $request, CommTemplate $template): JsonResponse
    {
        if (! $request->user()?->can('comm.template.manage')) abort(403);
        $template->delete();
        return response()->json(['data' => ['message' => 'Template deleted.']]);
    }
}
