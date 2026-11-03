# Gateway analytics (dbt + DuckDB)

A small dbt project that models the gateway's audit log. It runs on a local DuckDB file, so it needs no cloud account.

The seed data is synthetic. It has the same shape as the gateway's `User` and `AuditLog` tables in Postgres.

## Layout

- `seeds/`: sample `raw_users` and `raw_audit_logs` (synthetic)
- `models/staging/`: typed views over the raw tables, with `document_id` and `action` pulled out of the JSON payload
- `models/marts/fct_daily_submissions.sql`: one row per day, user, and role, with submission and distinct-document counts
- `tests/`: a singular test, plus column tests for keys, relationships, and accepted values in the `schema.yml` files

## Run

```bash
pip install dbt-core dbt-duckdb
cd analytics
dbt seed --profiles-dir .
dbt run --profiles-dir .
dbt test --profiles-dir .
```

The DuckDB file defaults to `gateway_analytics.duckdb` in this folder. Set `DUCKDB_PATH` to put it elsewhere.

To use real data, export `AuditLog` and `User` from Postgres to CSV and replace the seeds, or point the sources at a Postgres replica.
