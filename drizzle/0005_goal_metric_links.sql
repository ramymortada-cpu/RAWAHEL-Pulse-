CREATE TABLE IF NOT EXISTS `goal_metric_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `goalId` int NOT NULL,
  `metricDefinitionId` int NOT NULL,
  `entityId` int,
  `weight` double,
  `contributionType` enum('sum','avg','latest') NOT NULL DEFAULT 'sum',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `goal_metric_links_id` PRIMARY KEY(`id`)
);
