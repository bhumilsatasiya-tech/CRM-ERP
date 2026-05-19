# Module 2.3 — Formula + Costing

Bill of Materials (BOM) per finished product. Versioned. One **active** formula per target product per company at a time.

## Tables
- `formulas` — header (target_product, output_qty, version, status: draft/active/inactive).
- `formula_components` — lines (product, qty per recipe yield, wastage %).

## Endpoints
```
GET    /api/v1/formulas
POST   /api/v1/formulas
GET    /api/v1/formulas/{formula}
PATCH  /api/v1/formulas/{formula}
DELETE /api/v1/formulas/{formula}
POST   /api/v1/formulas/{formula}/activate
GET    /api/v1/formulas-scale?target_product_id=&qty=        ← used by Production batch UI
```

## Production hook
`/formulas-scale` returns the scaled input lines (qty multiplied by `target / output_qty * (1 + wastage/100)`, rate from `Product->standard_cost`). Production batch form's "Use formula" button calls this and prefills the inputs editor.

## Permissions
`formula.view`, `formula.create`, `formula.update`, `formula.delete`, `formula.activate`.
