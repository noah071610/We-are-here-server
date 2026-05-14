DELETE FROM `analytics_event`
WHERE `id` IN (
  SELECT `id` FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `couple_id`, `content_id`
        ORDER BY `created_at` ASC, `id` ASC
      ) AS `rn`
    FROM `analytics_event`
    WHERE `event_type` = 'CONTENT_COMPLETED_BOTH'
      AND `couple_id` IS NOT NULL
      AND `content_id` IS NOT NULL
  ) AS `dedupe`
  WHERE `dedupe`.`rn` > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_event_completed_both_unique`
ON `analytics_event` (`couple_id`, `content_id`)
WHERE `event_type` = 'CONTENT_COMPLETED_BOTH';
