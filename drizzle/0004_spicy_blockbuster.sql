PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`r2_key` text NOT NULL,
	`stream_url` text,
	`artist_id` integer,
	`commune_id` integer NOT NULL,
	`electoral_list_id` integer,
	`rating` real DEFAULT 1200 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`appearances` integer DEFAULT 0 NOT NULL,
	`round2_rating` real DEFAULT 1200 NOT NULL,
	`round2_wins` integer DEFAULT 0 NOT NULL,
	`round2_losses` integer DEFAULT 0 NOT NULL,
	`round2_appearances` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_seed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commune_id`) REFERENCES `communes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`electoral_list_id`) REFERENCES `electoral_lists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tracks`("id", "title", "slug", "r2_key", "stream_url", "artist_id", "commune_id", "electoral_list_id", "rating", "wins", "losses", "appearances", "round2_rating", "round2_wins", "round2_losses", "round2_appearances", "is_active", "is_seed", "created_at") SELECT "id", "title", "slug", "r2_key", "stream_url", "artist_id", "commune_id", "electoral_list_id", "rating", "wins", "losses", "appearances", "round2_rating", "round2_wins", "round2_losses", "round2_appearances", "is_active", "is_seed", "created_at" FROM `tracks`;--> statement-breakpoint
DROP TABLE `tracks`;--> statement-breakpoint
ALTER TABLE `__new_tracks` RENAME TO `tracks`;--> statement-breakpoint
CREATE TABLE `__new_electoral_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`candidate_name` text,
	`photo_url` text,
	`commune_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`commune_id`) REFERENCES `communes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_electoral_lists`("id", "name", "slug", "candidate_name", "photo_url", "commune_id", "created_at")
SELECT
	"id",
	"name",
	lower(replace(replace(replace(replace(trim(coalesce("candidate_name", "name")), '''', ''), ' ', '-'), ',', '-'), '--', '-')),
	"candidate_name",
	NULL,
	"commune_id",
	"created_at"
FROM `electoral_lists`;--> statement-breakpoint
DROP TABLE `electoral_lists`;--> statement-breakpoint
ALTER TABLE `__new_electoral_lists` RENAME TO `electoral_lists`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_slug_unique` ON `tracks` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `electoral_lists_commune_slug_unique` ON `electoral_lists` (`commune_id`,`slug`);
