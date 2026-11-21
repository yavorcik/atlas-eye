# Rule-impact demo analytics

The public demo sends up to three events per page load to the existing AtlasEye owner-activity collector: a page view, a narrated start, and an audio-ended completion. A completion means the narration reached its end; it is not proof every second was watched. Replaying in the same loaded page is not counted again. A reload can count again. Do Not Track and Global Privacy Control are honored. This is not a count of unique people or a visitor identification system.

The collector stores an event ID, site, timestamp, event type and a controlled path. Path shape is /rule-impact/<view|start|complete>/<linkedin|facebook|other>/, based only on allowlisted utm_source values. Direct navigation, unknown sources and other channels are grouped as other. No name, email, persistent visitor ID, choices, full URL, referrer or other query value is sent by the demo. Do not infer identities from these statistics.

In the owner-only Supabase SQL editor, use:
```sql
select split_part(path, '/', 3) as event,
       split_part(path, '/', 4) as source,
       count(*) as events
from public.owner_activity_events
where site = 'atlas-eye'
  and path ~ '^/rule-impact/(view|start|complete)/(linkedin|facebook|other)/$'
group by 1, 2
order by 1, 2;
```

The existing all-site activity digest may include these events in AtlasEye totals; it does not break out this demo or its source buckets. If named leads are later desired, use an optional, explicitly consented contact or feedback form and keep it separate from passive analytics.
