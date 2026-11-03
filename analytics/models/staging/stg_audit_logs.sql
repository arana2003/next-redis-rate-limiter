select
    id as audit_log_id,
    "userId" as user_id,
    endpoint,
    json_extract_string(payload, '$.documentId') as document_id,
    json_extract_string(payload, '$.action') as action,
    cast("createdAt" as timestamp) as created_at
from {{ ref('raw_audit_logs') }}
