CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`action` text NOT NULL,
	`summary` text NOT NULL,
	`at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ae_entity_idx` ON `audit_events` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `ae_at_idx` ON `audit_events` (`at`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`kind` text NOT NULL,
	`original_name` text NOT NULL,
	`stored_name` text NOT NULL,
	`mime` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `material_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `doc_profile_idx` ON `documents` (`profile_id`);--> statement-breakpoint
CREATE TABLE `field_provenance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`field` text NOT NULL,
	`origin` text NOT NULL,
	`source_id` integer,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `material_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fp_profile_field_uq` ON `field_provenance` (`profile_id`,`field`);--> statement-breakpoint
CREATE TABLE `imports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`idempotency_key` text NOT NULL,
	`schema_version` text NOT NULL,
	`payload_hash` text NOT NULL,
	`status` text NOT NULL,
	`channel` text DEFAULT 'api' NOT NULL,
	`source_kind` text,
	`source_reference` text,
	`confidence` text,
	`payload` text NOT NULL,
	`issues` text DEFAULT '[]' NOT NULL,
	`result` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `imp_key_uq` ON `imports` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `imp_status_idx` ON `imports` (`status`);--> statement-breakpoint
CREATE TABLE `material_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`manufacturer` text NOT NULL,
	`brand` text,
	`product_name` text NOT NULL,
	`product_type` text,
	`sku` text,
	`material_family` text NOT NULL,
	`material_name_raw` text,
	`color_name` text,
	`color_code` text,
	`color_hex` text,
	`color_description` text,
	`transparency` text,
	`finish` text,
	`effect` text,
	`diameter_mm` real,
	`diameter_tolerance_mm` real,
	`net_weight_g` real,
	`gross_weight_g` real,
	`spool_empty_weight_g` real,
	`spool_material` text,
	`spool_dimensions` text,
	`spool_recyclable` text,
	`description` text,
	`features` text,
	`use_cases` text,
	`recommended_uses` text,
	`not_recommended_uses` text,
	`mechanical_props` text,
	`thermal_props` text,
	`chemical_props` text,
	`uv_outdoor_props` text,
	`flexibility` text,
	`shrinkage` text,
	`impact_resistance` text,
	`layer_adhesion` text,
	`surface_quality` text,
	`nozzle_requirement` text,
	`abrasive` integer,
	`build_plate` text,
	`adhesive` text,
	`enclosure` text,
	`ventilation_notes` text,
	`nozzle_temp_min_c` real,
	`nozzle_temp_max_c` real,
	`bed_temp_min_c` real,
	`bed_temp_max_c` real,
	`chamber_temp_min_c` real,
	`chamber_temp_max_c` real,
	`print_speed_min_mms` real,
	`print_speed_max_mms` real,
	`flow_ratio` real,
	`fan_min_pct` real,
	`fan_max_pct` real,
	`retract_direct_mm` real,
	`retract_bowden_mm` real,
	`retract_speed_mms` real,
	`max_volumetric_flow_mm3s` real,
	`layer_height_min_mm` real,
	`layer_height_max_mm` real,
	`slicer_notes` text,
	`drying_temp_c` real,
	`drying_time_h` real,
	`storage_notes` text,
	`compatibility` text,
	`datasheet_url` text,
	`tds_url` text,
	`sds_url` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mp_manufacturer_idx` ON `material_profiles` (`manufacturer`);--> statement-breakpoint
CREATE INDEX `mp_family_idx` ON `material_profiles` (`material_family`);--> statement-breakpoint
CREATE INDEX `mp_sku_idx` ON `material_profiles` (`sku`);--> statement-breakpoint
CREATE INDEX `mp_name_idx` ON `material_profiles` (`product_name`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`body` text NOT NULL,
	`noted_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `material_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notes_profile_idx` ON `notes` (`profile_id`);--> statement-breakpoint
CREATE TABLE `print_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`name` text NOT NULL,
	`slicer` text,
	`printer` text,
	`nozzle_diameter_mm` real,
	`nozzle_material` text,
	`version` text,
	`settings` text DEFAULT '{}' NOT NULL,
	`origin` text DEFAULT 'own' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `material_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pp_profile_idx` ON `print_profiles` (`profile_id`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`profile_id` integer NOT NULL,
	`variant` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` real,
	`shipping_share` real,
	`discount_share` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `material_profiles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `pi_purchase_idx` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `pi_profile_idx` ON `purchase_items` (`profile_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchased_at` text,
	`seller` text,
	`order_reference` text,
	`currency` text DEFAULT 'HUF' NOT NULL,
	`shipping_total` real,
	`discount_total` real,
	`order_total` real,
	`source_kind` text DEFAULT 'manual' NOT NULL,
	`source_reference` text,
	`import_id` integer,
	`notes` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pu_date_idx` ON `purchases` (`purchased_at`);--> statement-breakpoint
CREATE INDEX `pu_seller_idx` ON `purchases` (`seller`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`url` text,
	`title` text,
	`source_type` text NOT NULL,
	`retrieved_at` text,
	`fields` text DEFAULT '[]' NOT NULL,
	`excerpt` text,
	`import_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `material_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `src_profile_idx` ON `sources` (`profile_id`);--> statement-breakpoint
CREATE TABLE `spool_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spool_id` integer NOT NULL,
	`type` text NOT NULL,
	`at` text NOT NULL,
	`delta_g` real,
	`remaining_g` real,
	`is_estimate` integer DEFAULT false NOT NULL,
	`dry_temp_c` real,
	`dry_hours` real,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`spool_id`) REFERENCES `spools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `se_spool_idx` ON `spool_events` (`spool_id`,`at`);--> statement-breakpoint
CREATE TABLE `spools` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`profile_id` integer NOT NULL,
	`purchase_item_id` integer,
	`status` text DEFAULT 'sealed' NOT NULL,
	`initial_weight_g` real,
	`remaining_g` real,
	`remaining_origin` text,
	`received_at` text,
	`opened_at` text,
	`last_measured_at` text,
	`location` text,
	`storage_method` text,
	`moisture_state` text,
	`notes` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `material_profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sp_code_uq` ON `spools` (`code`);--> statement-breakpoint
CREATE INDEX `sp_profile_idx` ON `spools` (`profile_id`);--> statement-breakpoint
CREATE INDEX `sp_status_idx` ON `spools` (`status`);--> statement-breakpoint
CREATE TABLE `technical_specs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`value_num` real,
	`value_text` text,
	`unit` text,
	`test_method` text,
	`origin` text,
	`source_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `material_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ts_profile_idx` ON `technical_specs` (`profile_id`);--> statement-breakpoint
CREATE INDEX `ts_key_idx` ON `technical_specs` (`key`);