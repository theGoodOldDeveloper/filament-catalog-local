CREATE TABLE `dryer_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`name` text,
	`min_c` real,
	`max_c` real,
	`zones` integer,
	`capacity_spools` integer,
	`power_w` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `printer_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`name` text,
	`max_nozzle_c` real,
	`max_bed_c` real,
	`enclosed` integer,
	`heated_chamber` integer,
	`max_chamber_c` real,
	`heated_toolheads` integer,
	`hardened_nozzle` integer,
	`build_volume` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
