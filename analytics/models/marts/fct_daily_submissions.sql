-- One row per day, user, and role: how many audit-logged submissions
-- each user made, and how many distinct documents they touched.
select
    cast(l.created_at as date) as submission_date,
    u.user_id,
    u.role,
    count(*) as submissions,
    count(distinct l.document_id) as distinct_documents
from {{ ref('stg_audit_logs') }} l
join {{ ref('stg_users') }} u on u.user_id = l.user_id
group by 1, 2, 3
