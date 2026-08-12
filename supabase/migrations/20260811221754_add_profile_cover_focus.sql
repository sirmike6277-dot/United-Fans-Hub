-- Lets a fan reposition their cover photo within the (now taller) banner
-- instead of a fixed centre-crop — "adjust the picture frame on the top
-- banner to fit" (previously object-position was hardcoded to centre, so a
-- portrait or off-centre photo could crop out exactly the part someone
-- wanted to show). Stored as a percentage (0 = top of the image visible,
-- 100 = bottom), applied as `object-position: center {value}%` — CSS's own
-- native, well-understood repositioning axis, not a custom crop rectangle.
alter table public.profiles
  add column cover_focus_y smallint not null default 50
  check (cover_focus_y between 0 and 100);
