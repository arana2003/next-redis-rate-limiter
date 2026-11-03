select
    id as user_id,
    email,
    role,
    cast("createdAt" as timestamp) as created_at
from {{ ref('raw_users') }}
