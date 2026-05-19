export type CommChannel = 'email' | 'whatsapp' | 'sms';
export type CommStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export interface CommMessage {
  id: number;
  company_id: number;
  direction: 'outbound' | 'inbound';
  channel: CommChannel;
  to_addr: string;
  from_addr?: string | null;
  subject?: string | null;
  body: string;
  status: CommStatus;
  provider_message_id?: string | null;
  attempted_at?: string | null;
  delivered_at?: string | null;
  error?: string | null;
  related_type?: string | null;
  related_id?: number | null;
  created_at?: string;
}

export interface CommTemplate {
  id: number;
  code: string;
  name: string;
  channel: CommChannel;
  subject?: string | null;
  body: string;
  variables?: string[];
  is_active: boolean;
}
