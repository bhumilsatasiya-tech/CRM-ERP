# Module 2.2 — Products + Categories + Units

**Menu position:** #4 — Product Management
**Folder:** `backend/Modules/Products`
**Frontend twin:** `frontend/src/modules/05-products`
**Depends on:** Auth, Companies, Settings

## Tables

| Table | Purpose |
|---|---|
| `product_units` | UoM (kg, g, L, ml, pcs, drum, …) with type (weight/volume/count) and conversion to base unit |
| `product_categories` | Hierarchical (self-FK `parent_id`) — Pharma > API > Active Compounds |
| `products` | Master SKU table — HSN, tax%, pricing, costing, inventory flags |
| `product_uom_conversions` | Per-product alternate UoMs (e.g. "1 drum = 50 kg") |

## Key product fields

| Group | Fields |
|---|---|
| Identity | `code` (SKU), `barcode`, `name`, `description` |
| Classification | `category_id`, `type` (raw / finished / packaging / consumable / service), `is_company_made` |
| UoM | `unit_id` (default), conversions table for alternates |
| Tax | `hsn_code`, `tax_rate` (default %) |
| Costing | `standard_cost`, `last_purchase_cost`, `opening_stock_value` |
| Selling | `standard_price`, `mrp`, `currency` |
| Inventory | `reorder_level`, `reorder_qty`, `lead_time_days`, `shelf_life_days`, `min_stock`, `max_stock`, `has_batches`, `has_expiry`, `has_serials` |
| Defaults | `default_warehouse_id` |
| Flags | `is_active`, `is_purchasable`, `is_sellable`, `is_stockable` |
| Media | `image_path` |

## Pre-seeded units (per company)

```
weight: kg, g, mg
volume: L, ml
count:  pcs, dozen, box, bag, drum
length: m, cm
```

## API endpoints

```
GET    /products                       list
POST   /products                       create
GET    /products/{product}             show (with category, unit, conversions)
PUT    /products/{product}             update
DELETE /products/{product}             soft-delete

GET    /product-categories             list (tree)
POST   /product-categories             create
PUT    /product-categories/{cat}       update
DELETE /product-categories/{cat}       delete

GET    /product-units                  list
POST   /product-units                  create
PUT    /product-units/{unit}           update
DELETE /product-units/{unit}           delete

GET    /products/{product}/uom-conversions    list
POST   /products/{product}/uom-conversions    create
PUT    /product-uom-conversions/{conv}        update
DELETE /product-uom-conversions/{conv}        delete

# Lookup
GET    /lookup/products?q=&type=&category_id=&limit=
```
