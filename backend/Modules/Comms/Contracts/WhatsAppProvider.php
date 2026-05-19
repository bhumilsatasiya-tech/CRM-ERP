<?php

namespace Modules\Comms\Contracts;

interface WhatsAppProvider
{
    /**
     * Send a WhatsApp message.
     * Returns the provider's message id (used to correlate delivery webhooks later).
     */
    public function send(string $to, string $body): string;
}
