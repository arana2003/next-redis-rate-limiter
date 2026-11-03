-- Incremental: one row per day and document. Each run recomputes the most
-- recent day in full (so late-arriving rows for that day are picked up), and
-- the unique key makes the upsert idempotent.
{{ config(
    materialized='incremental',
    unique_key=['submission_date', 'document_id']
) }}

select
    cast(l.created_at as date) as submission_date,
    l.document_id,
    d.title,
    d.jurisdiction,
    count(*) as actions,
    count(distinct l.user_id) as operators
from {{ ref('stg_audit_logs') }} l
join {{ ref('stg_documents') }} d on d.document_id = l.document_id
{% if is_incremental() %}
where cast(l.created_at as date) >= (select coalesce(max(submission_date), date '1900-01-01') from {{ this }})
{% endif %}
group by 1, 2, 3, 4
