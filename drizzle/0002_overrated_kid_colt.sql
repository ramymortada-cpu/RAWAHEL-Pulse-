CREATE TABLE `department_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`departmentKey` varchar(64) NOT NULL,
	`itemKey` varchar(64) NOT NULL,
	`itemNameAr` varchar(255) NOT NULL,
	`itemType` varchar(48) NOT NULL,
	`metrics` json,
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `department_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sheet_config` ADD `autoSync` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sheet_config` ADD `scheduleCronTaskUid` varchar(65);