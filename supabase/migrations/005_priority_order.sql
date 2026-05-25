-- Add a stored generated column that maps priority to a sortable integer.
-- Lower value = higher urgency (critical = 1, high = 2, medium = 3, low = 4).
alter table public.tickets
  add column if not exists priority_order integer
    generated always as (
      case priority
        when 'critical' then 1
        when 'high'     then 2
        when 'medium'   then 3
        when 'low'      then 4
        else 5
      end
    ) stored;
