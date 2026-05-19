export type DocumentCategory = 'kyc' | 'coa' | 'msds' | 'photo' | 'contract' | 'invoice_pdf' | 'other';

export interface DocumentRow {
  id: number;
  company_id: number;
  attachable_type: string;
  attachable_id: number;
  category: DocumentCategory;
  original_filename: string;
  disk: string;
  path: string;
  mime_type?: string | null;
  size_bytes: number;
  notes?: string | null;
  uploaded_by?: number | null;
  created_at?: string;
}
