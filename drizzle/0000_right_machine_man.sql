CREATE TABLE `analytics_event` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text DEFAULT 'COUPLE_MATCHED' NOT NULL,
	`couple_id` text,
	`actor_user_id` text,
	`content_id` text,
	`session_id` text,
	`payload` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couple`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`thumbnail_url` text,
	`content` text NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_analysis_result` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`content_id` text NOT NULL,
	`summary` text,
	`result` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couple`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `content_play_session` (
	`id` text PRIMARY KEY NOT NULL,
	`couple_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content_id` text NOT NULL,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`last_question_id` text,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`responses` text DEFAULT '[]' NOT NULL,
	`result` text,
	`score` integer,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`abandoned_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`couple_id`) REFERENCES `couple`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `content_tag` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `couple` (
	`id` text PRIMARY KEY NOT NULL,
	`member_one_user_id` text NOT NULL,
	`member_two_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`member_one_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_two_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`inviter_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`redeemed_by_user_id` text,
	`couple_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`redeemed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`couple_id`) REFERENCES `couple`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_code_unique` ON `invitation` (`code`);--> statement-breakpoint
CREATE TABLE `profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`country_code` text,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`name` text,
	`role` text DEFAULT 'USER' NOT NULL,
	`is_anonymous` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
