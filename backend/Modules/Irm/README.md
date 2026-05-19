# Module 4.6 — IRM + Bank Closure

For each export invoice in foreign currency, RBI requires an Inward Remittance Message (IRM) tracking when the foreign-currency payment lands and gets converted to INR. **Bank Closure** marks the realization (commission, TDS, net INR) and closes the IRM.

## Tables
- `irms` — header (code, EI link, FCY amount + rate + INR, status: received/allocated/closed/cancelled).
- `irm_allocations` — pivot ready for future multi-EI splits; v1 always single allocation.
- `bank_realizations` — closure detail (commission, TDS, net INR).

## Workflow
```
Create IRM (auto-allocates 100% to its EI; EI.paid_amount += INR; status -> allocated)
   ↓
Close (record bank realization; status -> closed)
   ↓
Cancel anytime before close → reverses INR effect on EI
```

## Endpoints
```
GET|POST|PATCH|DELETE /api/v1/irms[/{irm}]
POST /api/v1/irms/{irm}/close      ← create bank realization, mark IRM closed
POST /api/v1/irms/{irm}/cancel
```

## Permissions
`irm.view`, `irm.create`, `irm.update`, `irm.delete`, `irm.close`.

## Side effects
- `IrmService::create` calls `ExportInvoiceService::applyPaymentInr($ei, $inr)` → updates EI status to partially_paid / paid.
- `IrmService::cancel` reverses that via `reversePaymentInr`.
- `closeWithRealization` does not touch the EI further; commission/TDS are captured for reporting only (Finance Module 5.1 will subscribe to journal them).
