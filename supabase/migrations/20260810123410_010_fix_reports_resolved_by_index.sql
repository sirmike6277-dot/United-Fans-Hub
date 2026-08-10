-- Performance advisor flagged reports.resolved_by as an FK without a covering
-- index. Adding it for consistency with reporter_id/target_type,target_id.
create index reports_resolved_by_idx on public.reports (resolved_by);