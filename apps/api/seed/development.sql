PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (id, username, display_name, bio, location, website_url, manually_entered_wallet_address, is_verified, created_at, updated_at) VALUES
('usr_mira', 'mira_pixels', 'Mira Vale', 'Building soft worlds from hard pixels. Digital artist and community host.', 'Brooklyn, NY', 'https://example.com/mira', '0x1111111111111111111111111111111111111111', 0, '2026-07-01T14:00:00.000Z', '2026-07-01T14:00:00.000Z'),
('usr_orbit', 'orbitgarden', 'Orbit Garden', 'A community for experimental art, slow collecting, and shared learning.', 'Internet', 'https://example.com/orbit', '0x2222222222222222222222222222222222222222', 0, '2026-07-02T14:00:00.000Z', '2026-07-02T14:00:00.000Z'),
('usr_lex', 'lex_frames', 'Lex Frames', 'Collecting early experiments and writing about visual culture.', 'Lisbon', 'https://example.com/lex', '0x3333333333333333333333333333333333333333', 0, '2026-07-03T14:00:00.000Z', '2026-07-03T14:00:00.000Z'),
('usr_nova', 'novaforms', 'Nova Forms', 'Generative systems, type, and tiny tools for artists.', 'Toronto', 'https://example.com/nova', '0x4444444444444444444444444444444444444444', 0, '2026-07-04T14:00:00.000Z', '2026-07-04T14:00:00.000Z'),
('usr_sage', 'sage_archive', 'Sage Archive', 'Documenting the beautiful, strange history of internet-native art.', 'London', 'https://example.com/sage', '0x5555555555555555555555555555555555555555', 0, '2026-07-05T14:00:00.000Z', '2026-07-05T14:00:00.000Z'),
('usr_kite', 'kite_social', 'Kite Social', 'Community builder. Better rituals, kinder networks, useful gatherings.', 'Los Angeles, CA', 'https://example.com/kite', '0x6666666666666666666666666666666666666666', 0, '2026-07-06T14:00:00.000Z', '2026-07-06T14:00:00.000Z');

INSERT OR IGNORE INTO accounts (id,primary_email,email_verified_at,status,role,created_at,updated_at) SELECT 'acct_'||id, NULL, NULL, 'active', 'user', created_at, updated_at FROM users WHERE id LIKE 'usr_%';
UPDATE users SET account_id='acct_'||id WHERE id LIKE 'usr_%' AND account_id IS NULL;

INSERT OR IGNORE INTO follows (follower_user_id, followed_user_id, created_at) VALUES
('usr_mira','usr_orbit','2026-07-08T10:00:00.000Z'), ('usr_mira','usr_nova','2026-07-08T10:01:00.000Z'),
('usr_orbit','usr_mira','2026-07-08T10:02:00.000Z'), ('usr_orbit','usr_lex','2026-07-08T10:03:00.000Z'),
('usr_lex','usr_mira','2026-07-08T10:04:00.000Z'), ('usr_lex','usr_sage','2026-07-08T10:05:00.000Z'),
('usr_nova','usr_mira','2026-07-08T10:06:00.000Z'), ('usr_nova','usr_kite','2026-07-08T10:07:00.000Z'),
('usr_sage','usr_orbit','2026-07-08T10:08:00.000Z'), ('usr_sage','usr_nova','2026-07-08T10:09:00.000Z'),
('usr_kite','usr_mira','2026-07-08T10:10:00.000Z'), ('usr_kite','usr_orbit','2026-07-08T10:11:00.000Z');

INSERT OR IGNORE INTO posts (id,user_id,body,repost_of_post_id,reply_to_post_id,created_at,updated_at) VALUES
('post_01','usr_mira','New study: light moving across a room that never existed. I keep returning to the quiet between frames.',NULL,NULL,'2026-07-18T18:00:00.000Z','2026-07-18T18:00:00.000Z'),
('post_02','usr_orbit','Tonight’s salon prompt: what makes a digital object feel cared for? Bring one work and one question.',NULL,NULL,'2026-07-18T17:30:00.000Z','2026-07-18T17:30:00.000Z'),
('post_03','usr_lex','Collecting is most interesting when it becomes attention, not acquisition.',NULL,NULL,'2026-07-18T16:15:00.000Z','2026-07-18T16:15:00.000Z'),
('post_04','usr_nova','Released a small color system for generative sketches. Twelve tones, deliberate constraints, endless combinations.',NULL,NULL,'2026-07-18T15:40:00.000Z','2026-07-18T15:40:00.000Z'),
('post_05','usr_sage','Archive note: interfaces age faster than images. Screenshots are cultural artifacts too.',NULL,NULL,'2026-07-18T14:20:00.000Z','2026-07-18T14:20:00.000Z'),
('post_06','usr_kite','Community is a repeated act, not an audience size.',NULL,NULL,'2026-07-18T13:05:00.000Z','2026-07-18T13:05:00.000Z'),
('post_07','usr_mira','Sketchbooks should be allowed to stay unfinished in public.',NULL,NULL,'2026-07-17T20:00:00.000Z','2026-07-17T20:00:00.000Z'),
('post_08','usr_orbit','We added a monthly critique circle with no pitching and no price talk—just looking closely.',NULL,NULL,'2026-07-17T19:00:00.000Z','2026-07-17T19:00:00.000Z'),
('post_09','usr_lex','The best collection pages feel like essays written with objects.',NULL,NULL,'2026-07-17T18:00:00.000Z','2026-07-17T18:00:00.000Z'),
('post_10','usr_nova','A good constraint is an instrument, not a cage.',NULL,NULL,'2026-07-17T17:00:00.000Z','2026-07-17T17:00:00.000Z'),
('post_11','usr_sage','Preservation begins with naming what would otherwise disappear.',NULL,NULL,'2026-07-17T16:00:00.000Z','2026-07-17T16:00:00.000Z'),
('post_12','usr_kite','Hosting tip: end every gathering with a clear next small action.',NULL,NULL,'2026-07-17T15:00:00.000Z','2026-07-17T15:00:00.000Z'),
('post_13','usr_mira','Trying a slower release rhythm this season: fewer pieces, more process notes.',NULL,NULL,'2026-07-16T20:00:00.000Z','2026-07-16T20:00:00.000Z'),
('post_14','usr_orbit','Public archives are gardens: structure matters, but so does surprise.',NULL,NULL,'2026-07-16T19:00:00.000Z','2026-07-16T19:00:00.000Z'),
('post_15','usr_lex','Today I revisited the first digital work I collected. The memory around it has become part of the piece.',NULL,NULL,'2026-07-16T18:00:00.000Z','2026-07-16T18:00:00.000Z'),
('post_16','usr_nova','Typography for machines can still feel handmade.',NULL,NULL,'2026-07-16T17:00:00.000Z','2026-07-16T17:00:00.000Z'),
('post_17','usr_sage','If you maintain a small art tool, document its quirks. Future historians will thank you.',NULL,NULL,'2026-07-16T16:00:00.000Z','2026-07-16T16:00:00.000Z'),
('post_18','usr_kite','A healthy online space needs exits, pauses, boundaries, and ways back in.',NULL,NULL,'2026-07-16T15:00:00.000Z','2026-07-16T15:00:00.000Z'),
('post_19','usr_lex','Exactly this. Attention is the medium.',NULL,'post_01','2026-07-18T18:10:00.000Z','2026-07-18T18:10:00.000Z'),
('post_20','usr_nova','Would love to bring this question into the next toolmakers circle.',NULL,'post_02','2026-07-18T17:45:00.000Z','2026-07-18T17:45:00.000Z'),
('post_21','usr_kite','Keeping this close.', 'post_06',NULL,'2026-07-18T13:30:00.000Z','2026-07-18T13:30:00.000Z'),
('post_22','usr_sage',NULL,'post_04',NULL,'2026-07-18T16:00:00.000Z','2026-07-18T16:00:00.000Z');

INSERT OR IGNORE INTO likes (user_id,post_id,created_at) VALUES
('usr_orbit','post_01','2026-07-18T18:01:00.000Z'),('usr_lex','post_01','2026-07-18T18:02:00.000Z'),('usr_nova','post_01','2026-07-18T18:03:00.000Z'),
('usr_mira','post_02','2026-07-18T17:31:00.000Z'),('usr_kite','post_02','2026-07-18T17:32:00.000Z'),('usr_sage','post_03','2026-07-18T16:16:00.000Z'),
('usr_mira','post_04','2026-07-18T15:41:00.000Z'),('usr_lex','post_04','2026-07-18T15:42:00.000Z'),('usr_orbit','post_06','2026-07-18T13:06:00.000Z'),
('usr_nova','post_06','2026-07-18T13:07:00.000Z'),('usr_sage','post_08','2026-07-17T19:01:00.000Z'),('usr_mira','post_09','2026-07-17T18:01:00.000Z');

INSERT OR IGNORE INTO notifications (id,recipient_user_id,actor_user_id,type,post_id,read_at,created_at) VALUES
('ntf_01','usr_mira','usr_orbit','like','post_01',NULL,'2026-07-18T18:01:00.000Z'),
('ntf_02','usr_mira','usr_lex','comment','post_19',NULL,'2026-07-18T18:10:00.000Z'),
('ntf_03','usr_orbit','usr_mira','like','post_02','2026-07-18T18:00:00.000Z','2026-07-18T17:31:00.000Z'),
('ntf_04','usr_nova','usr_sage','repost','post_22',NULL,'2026-07-18T16:00:00.000Z'),
('ntf_05','usr_mira','usr_kite','follow',NULL,NULL,'2026-07-08T10:10:00.000Z');

INSERT OR IGNORE INTO auth_identities (id,account_id,provider,provider_subject,provider_email,provider_email_verified) VALUES
('identity_mira_email','acct_usr_mira','email','mira@aura.test','mira@aura.test',1),
('identity_orbit_email','acct_usr_orbit','email','orbit@aura.test','orbit@aura.test',1),
('identity_lex_email','acct_usr_lex','email','lex@aura.test','lex@aura.test',1),
('identity_nova_email','acct_usr_nova','email','nova@aura.test','nova@aura.test',1),
('identity_sage_email','acct_usr_sage','email','sage@aura.test','sage@aura.test',1),
('identity_kite_email','acct_usr_kite','email','kite@aura.test','kite@aura.test',1);

UPDATE accounts SET primary_email = replace(substr(id, 10), 'usr_', '') || '@aura.test', email_verified_at = coalesce(email_verified_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id LIKE 'acct_usr_%' AND primary_email IS NULL;
