ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255),
  MODIFY COLUMN `role` enum('super_admin','admin','editor','viewer','user') NOT NULL DEFAULT 'viewer',
  ADD COLUMN `status` enum('active','invited','suspended') NOT NULL DEFAULT 'active';

ALTER TABLE `reports`
  MODIFY COLUMN `status` enum('draft','active','locked','archived','cancelled','generated') NOT NULL DEFAULT 'draft',
  ADD COLUMN `lockedAt` timestamp,
  ADD COLUMN `lockedByUserId` int,
  ADD COLUMN `archivedAt` timestamp,
  ADD COLUMN `archivedByUserId` int,
  ADD COLUMN `cancelledAt` timestamp,
  ADD COLUMN `cancelledByUserId` int,
  ADD COLUMN `cancelReason` text;

ALTER TABLE `metric_values`
  MODIFY COLUMN `submissionStatus` enum('draft','submitted','reviewed','approved','rejected','archived') NOT NULL DEFAULT 'approved',
  ADD COLUMN `approvedAt` timestamp,
  ADD COLUMN `approvedByUserId` int,
  ADD COLUMN `updatedByUserId` int,
  ADD COLUMN `lockedAt` timestamp,
  ADD COLUMN `changeReason` text;

ALTER TABLE `evidence_assets`
  MODIFY COLUMN `submissionStatus` enum('draft','submitted','reviewed','approved','rejected','archived') NOT NULL DEFAULT 'approved',
  ADD COLUMN `isFeatured` boolean NOT NULL DEFAULT false,
  ADD COLUMN `featuredOrder` int;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `foundationName` varchar(255) NOT NULL DEFAULT 'RAWAHEL',
  `displayNameAr` varchar(255) NOT NULL DEFAULT 'نبض رواحل',
  `logoUrl` varchar(1024),
  `primaryColor` varchar(32) NOT NULL DEFAULT '#1b2a5e',
  `accentColor` varchar(32) NOT NULL DEFAULT '#d4a843',
  `reportDisclaimer` text,
  `defaultSubmissionExpiryDays` int NOT NULL DEFAULT 30,
  `externalSubmissionBaseUrl` varchar(1024),
  `localExportFallbackEnabled` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `system_settings_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `actorUserId` int,
  `actorName` varchar(255),
  `actorRole` varchar(64),
  `action` varchar(96) NOT NULL,
  `resourceType` varchar(96) NOT NULL,
  `resourceId` varchar(96),
  `summaryAr` text NOT NULL,
  `metadataJson` json,
  `ipAddress` varchar(96),
  `userAgent` varchar(512),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
