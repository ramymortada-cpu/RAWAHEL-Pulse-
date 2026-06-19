ALTER TABLE `users`
  MODIFY COLUMN `role` enum('admin','editor','viewer','user') NOT NULL DEFAULT 'viewer';
