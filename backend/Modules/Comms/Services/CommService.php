<?php

namespace Modules\Comms\Services;

use Illuminate\Support\Facades\Mail;
use Modules\Comms\Contracts\WhatsAppProvider;
use Modules\Comms\Models\CommMessage;
use Modules\Comms\Models\CommTemplate;
use RuntimeException;
use Throwable;

class CommService
{
    public function __construct(private WhatsAppProvider $whatsapp) {}

    public function sendEmail(string $to, string $subject, string $body, int $companyId, ?string $relatedType = null, ?int $relatedId = null, ?int $actorId = null): CommMessage
    {
        $msg = CommMessage::create([
            'company_id' => $companyId,
            'direction' => 'outbound', 'channel' => 'email',
            'to_addr' => $to, 'from_addr' => env('MAIL_FROM_ADDRESS'),
            'subject' => $subject, 'body' => $body,
            'status' => CommMessage::STATUS_QUEUED,
            'related_type' => $relatedType, 'related_id' => $relatedId,
            'created_by' => $actorId,
        ]);
        try {
            Mail::raw($body, function ($mail) use ($to, $subject) {
                $mail->to($to)->subject($subject);
            });
            $msg->forceFill([
                'status' => CommMessage::STATUS_SENT,
                'attempted_at' => now(),
                'delivered_at' => now(),
            ])->save();
        } catch (Throwable $e) {
            $msg->forceFill([
                'status' => CommMessage::STATUS_FAILED,
                'attempted_at' => now(),
                'error' => substr($e->getMessage(), 0, 1000),
            ])->save();
        }
        return $msg;
    }

    public function sendWhatsApp(string $to, string $body, int $companyId, ?string $relatedType = null, ?int $relatedId = null, ?int $actorId = null): CommMessage
    {
        $msg = CommMessage::create([
            'company_id' => $companyId,
            'direction' => 'outbound', 'channel' => 'whatsapp',
            'to_addr' => $to,
            'body' => $body,
            'status' => CommMessage::STATUS_QUEUED,
            'related_type' => $relatedType, 'related_id' => $relatedId,
            'created_by' => $actorId,
        ]);
        try {
            $providerMessageId = $this->whatsapp->send($to, $body);
            $msg->forceFill([
                'status' => CommMessage::STATUS_SENT,
                'provider_message_id' => $providerMessageId,
                'attempted_at' => now(),
            ])->save();
        } catch (Throwable $e) {
            $msg->forceFill([
                'status' => CommMessage::STATUS_FAILED,
                'attempted_at' => now(),
                'error' => substr($e->getMessage(), 0, 1000),
            ])->save();
        }
        return $msg;
    }

    public function applyTemplate(string $code, array $vars, int $companyId): array
    {
        $tpl = CommTemplate::where('company_id', $companyId)->where('code', $code)->where('is_active', true)->first();
        if (! $tpl) throw new RuntimeException("Template '{$code}' not found.");
        $subject = $this->fill($tpl->subject ?? '', $vars);
        $body    = $this->fill($tpl->body, $vars);
        return ['subject' => $subject, 'body' => $body, 'channel' => $tpl->channel];
    }

    private function fill(string $tpl, array $vars): string
    {
        return preg_replace_callback('/\{\{\s*(\w+)\s*\}\}/', function ($m) use ($vars) {
            return (string) ($vars[$m[1]] ?? $m[0]);
        }, $tpl);
    }
}
