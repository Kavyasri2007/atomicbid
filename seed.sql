USE atomicbid_db;

-- Insert valid users
-- Test passwords: 'password123'
INSERT IGNORE INTO users (id, username, password_hash) VALUES
(1, 'alice', 'scrypt:32768:8:1$K7oD4GZVZz9r5x$c33276878ed705c93c4c95a2d1f1f2e24cfdf04d60da94593e827b55f1ff4bd8183188d8b4dcfe51187d9036c1e95e7d7a76c3e98124409bb86043bc20d7daef'),
(2, 'bob', 'scrypt:32768:8:1$K7oD4GZVZz9r5x$c33276878ed705c93c4c95a2d1f1f2e24cfdf04d60da94593e827b55f1ff4bd8183188d8b4dcfe51187d9036c1e95e7d7a76c3e98124409bb86043bc20d7daef'),
(3, 'charlie', 'scrypt:32768:8:1$K7oD4GZVZz9r5x$c33276878ed705c93c4c95a2d1f1f2e24cfdf04d60da94593e827b55f1ff4bd8183188d8b4dcfe51187d9036c1e95e7d7a76c3e98124409bb86043bc20d7daef');

-- Clean items if needed to prevent duplicates (for dev, optional)
DELETE FROM proxy_bids;
DELETE FROM bids;
DELETE FROM winners;
DELETE FROM items;

-- Insert initial active items
INSERT INTO items (id, user_id, title, description, base_price, current_highest_bid, highest_bidder_id, start_time, end_time, status) VALUES
(1, 1, 'Vintage Rolex Watch', 'A beautiful vintage Rolex submariner in excellent condition.', 5000.00, 5000.00, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 2 HOUR), 'active'),
(2, 2, 'Signed Michael Jordan Jersey', 'Authentic signed jersey with COA.', 1500.00, 1500.00, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'active'),
(3, 3, 'First Edition Harry Potter Book', 'A rare gem. Dust jacket is slightly worn.', 300.00, 300.00, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 5 MINUTE), 'active');
