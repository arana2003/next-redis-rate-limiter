select
    document_id,
    title,
    jurisdiction
from {{ ref('raw_documents') }}
