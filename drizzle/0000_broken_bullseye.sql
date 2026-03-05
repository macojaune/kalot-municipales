CREATE TABLE `artists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`instagram` text,
	`tiktok` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `communes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `communes_name_unique` ON `communes` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `communes_slug_unique` ON `communes` (`slug`);--> statement-breakpoint
CREATE TABLE `electoral_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`candidate_name` text,
	`commune_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`commune_id`) REFERENCES `communes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`r2_key` text NOT NULL,
	`artist_id` integer NOT NULL,
	`commune_id` integer NOT NULL,
	`electoral_list_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commune_id`) REFERENCES `communes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`electoral_list_id`) REFERENCES `electoral_lists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_slug_unique` ON `tracks` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_id` text NOT NULL,
	`username` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_id_unique` ON `users` (`clerk_id`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`winner_track_id` integer NOT NULL,
	`loser_track_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loser_track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action
);
