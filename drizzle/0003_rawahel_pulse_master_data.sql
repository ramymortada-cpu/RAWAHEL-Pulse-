ALTER TABLE `reports` ADD `periodType` enum('monthly','quarterly','semiannual','annual') DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `audience` enum('internal','donor','board','public') DEFAULT 'internal' NOT NULL;--> statement-breakpoint
CREATE TABLE `strategic_tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(96) NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`descriptionAr` text,
	`color` varchar(32) NOT NULL DEFAULT '#1b2a5e',
	`icon` varchar(64) NOT NULL DEFAULT 'Circle',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategic_tracks_id` PRIMARY KEY(`id`),
	CONSTRAINT `strategic_tracks_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `strategic_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(96) NOT NULL,
	`trackId` int,
	`nameAr` varchar(255) NOT NULL,
	`descriptionAr` text,
	`targetValue` double NOT NULL DEFAULT 0,
	`targetUnit` varchar(64) NOT NULL DEFAULT 'عدد',
	`periodType` enum('yearly','two_years','monthly','custom') NOT NULL DEFAULT 'yearly',
	`startDate` date,
	`endDate` date,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategic_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `strategic_goals_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(96) NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`type` enum('office','institute_online','institute_offline','quran_institute','initiative','campaign','project','unit','department','platform') NOT NULL,
	`descriptionAr` text,
	`ownerName` varchar(255),
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`startDate` date,
	`sortOrder` int NOT NULL DEFAULT 0,
	`color` varchar(32) NOT NULL DEFAULT '#1b2a5e',
	`icon` varchar(64) NOT NULL DEFAULT 'Building2',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entities_id` PRIMARY KEY(`id`),
	CONSTRAINT `entities_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `entity_track_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`trackId` int NOT NULL,
	CONSTRAINT `entity_track_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entity_goal_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`goalId` int NOT NULL,
	`role` enum('owner','contributor','support') NOT NULL DEFAULT 'contributor',
	`weight` double,
	CONSTRAINT `entity_goal_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metric_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(96) NOT NULL,
	`entityId` int,
	`appliesToType` varchar(64),
	`nameAr` varchar(255) NOT NULL,
	`descriptionAr` text,
	`unit` enum('count','percent','currency','hours','days','text_score') NOT NULL DEFAULT 'count',
	`aggregation` enum('sum','avg','latest','max','min') NOT NULL DEFAULT 'sum',
	`direction` enum('higher_is_better','lower_is_better','neutral') NOT NULL DEFAULT 'higher_is_better',
	`aggregationScope` enum('additive','non_additive','latest') NOT NULL DEFAULT 'additive',
	`isCore` boolean NOT NULL DEFAULT false,
	`isDonorFacing` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metric_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metric_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`entityId` int NOT NULL,
	`metricDefinitionId` int NOT NULL,
	`valueNumber` double,
	`valueText` text,
	`notes` text,
	`source` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metric_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`entityId` int,
	`goalId` int,
	`titleAr` varchar(255) NOT NULL,
	`descriptionAr` text,
	`type` enum('image','video','link','document','testimonial','story') NOT NULL DEFAULT 'link',
	`url` varchar(1024) NOT NULL,
	`fileKey` varchar(512),
	`isDonorFacing` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evidence_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`type` enum('pdf','png') NOT NULL,
	`templateKey` varchar(96) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(512),
	`url` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_exports_id` PRIMARY KEY(`id`)
);
