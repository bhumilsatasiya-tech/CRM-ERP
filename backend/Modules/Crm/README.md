# Module 2.1 — CRM (Partners)

**Menu position:** #3 — CRM
**Folder:** `backend/Modules/Crm`
**Frontend twin:** `frontend/src/modules/04-crm`
**Depends on:** Auth, Companies, Settings

## Why this module is critical

Every transactional record in the rest of the ERP — Quotation, Sales Order, Invoice, Payment, IRM, Purchase Order, GRN, Inter-Company billing — has a FK to `partners.id`. Get the data model right here and the next 18 modules slot in cleanly.

## Tables owned

| Table | Purpose |
|---|---|
| `partners` | Master entity. One row per company-or-individual we transact with. `type` discriminator: `client` / `supplier` / `manufacturer` / `employee` / `other` |
| `partner_contacts` | Multiple human contacts per partner (sales contact, accounts contact, …) |
| `partner_addresses` | Billing / shipping / registered / branch — multi-row, with primary flag |
| `partner_bank_accounts` | Bank accounts (used by supplier payments + IRM closure) |

Document storage (KYC, agreements, GST cert, etc.) is handled later by Module 6.1 (polymorphic `documents` table).

## Multi-company

`partners` uses `BelongsToCompany`. Each partner belongs to ONE company. Switching companies in the topbar filters the list automatically. If you need the same vendor for both Company A and Company B, create two rows (or, in a future extension, a shared "global vendor" registry).

## Key fields on `partners`

| Group | Fields |
|---|---|
| Identity | `code`, `name`, `legal_name`, `is_company`, `type` |
| Contact | `email`, `phone`, `website` |
| Tax | `gst_no`, `pan_no`, `tax_treatment` (registered / unregistered / composition / sez / overseas) |
| Business | `industry`, `customer_segment` (B2B / B2C / Distributor) |
| Finance | `currency`, `credit_limit`, `credit_days`, `opening_balance`, `opening_balance_type` (debit/credit), `default_payment_terms_days` |
| Defaults | `default_warehouse_id` (FK), `default_billing_address_id`, `default_shipping_address_id` |
| Flags | `is_active`, `is_blacklisted`, `blacklist_reason` |

## API endpoints (`/api/v1`)

```
GET    /partners                           list  (filter type, segment, active, search)
POST   /partners                           create
GET    /partners/{partner}                 show (with all relations)
PUT    /partners/{partner}                 update
DELETE /partners/{partner}                 soft-delete

# Nested resources
GET    /partners/{partner}/contacts        list
POST   /partners/{partner}/contacts        create
PUT    /partner-contacts/{contact}         update
DELETE /partner-contacts/{contact}         delete

GET    /partners/{partner}/addresses       list
POST   /partners/{partner}/addresses       create
PUT    /partner-addresses/{address}        update
DELETE /partner-addresses/{address}        delete

GET    /partners/{partner}/bank-accounts   list
POST   /partners/{partner}/bank-accounts   create
PUT    /partner-bank-accounts/{bank}       update
DELETE /partner-bank-accounts/{bank}       delete

# Lookup (autosuggest used by quotations / SOs / POs / etc.)
GET    /lookup/partners?q=&type=&limit=    typeahead
```
