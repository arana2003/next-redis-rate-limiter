-- Every document-day in the activity mart must have at least one action and one operator.
select *
from {{ ref('fct_document_activity') }}
where actions < 1 or operators < 1
