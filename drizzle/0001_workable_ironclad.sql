CREATE TABLE `department_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`departmentKey` varchar(64) NOT NULL,
	`metrics` json,
	`achievements` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `department_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`status` enum('draft','generated') NOT NULL DEFAULT 'draft',
	`summary` json,
	`pdfKey` varchar(512),
	`pdfUrl` varchar(512),
	`generatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sheet_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`sheetUrl` varchar(1024) NOT NULL,
	`sheetId` varchar(128),
	`gid` varchar(64),
	`enabled` boolean NOT NULL DEFAULT true,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sheet_config_id` PRIMARY KEY(`id`)
);
