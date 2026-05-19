<?php

namespace Modules\Comms\Providers;

use Modules\Comms\Contracts\WhatsAppProvider;

/**
 * Placeholder WhatsApp provider — pretends to send and returns a fake id.
 * Swap with a real provider (Vonage, Twilio, etc.) by binding WhatsAppProvider
 * to a different concrete class via WHATSAPP_PROVIDER env var.
 */
class PlaceholderWhatsAppProvider implements WhatsAppProvider
{
    public function send(string $to, string $body): string
    {
        return 'placeholder-' . substr(md5($to . $body . microtime(true)), 0, 16);
    }
}
