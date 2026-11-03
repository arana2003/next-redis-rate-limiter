-- A row in the daily mart must represent at least one submission.
select *
from {{ ref('fct_daily_submissions') }}
where submissions < 1
