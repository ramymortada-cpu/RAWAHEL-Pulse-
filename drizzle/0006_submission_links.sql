ALTER TABLE `metric_values`
  ADD COLUMN `submissionLinkId` int,
  ADD COLUMN `submittedByName` varchar(255),
  ADD COLUMN `submissionStatus` enum('draft','submitted','reviewed','approved') NOT NULL DEFAULT 'approved',
  ADD COLUMN `reviewedByUserId` int,
  ADD COLUMN `reviewedAt` timestamp;

ALTER TABLE `evidence_assets`
  ADD COLUMN `submissionLinkId` int,
  ADD COLUMN `submissionStatus` enum('draft','submitted','reviewed','approved') NOT NULL DEFAULT 'approved';

CREATE TABLE IF NOT EXISTS `submission_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tokenHash` varchar(128) NOT NULL,
  `reportId` int NOT NULL,
  `entityId` int NOT NULL,
  `managerName` varchar(255) NOT NULL,
  `managerEmail` varchar(320),
  `managerPhone` varchar(64),
  `status` enum('created','opened','draft','submitted','reviewed','approved','revoked','expired','needs_revision') NOT NULL DEFAULT 'created',
  `expiresAt` timestamp NOT NULL,
  `openedAt` timestamp,
  `lastSavedAt` timestamp,
  `submittedAt` timestamp,
  `reviewedAt` timestamp,
  `approvedAt` timestamp,
  `createdByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `submission_links_id` PRIMARY KEY(`id`),
  CONSTRAINT `submission_links_tokenHash_unique` UNIQUE(`tokenHash`)
);
