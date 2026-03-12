PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_communes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`region` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_communes` (`id`, `region`, `name`, `slug`, `created_at`)
SELECT
	`id`,
	CASE
		WHEN `name` IN (
			'L''Ajoupa-Bouillon',
			'Basse-Pointe',
			'Bellefontaine',
			'Case-Pilote',
			'Ducos',
			'Fonds-Saint-Denis',
			'Fort-de-France',
			'Grand''Riviere',
			'Gros-Morne',
			'Les Anses-d''Arlet',
			'Les Trois-Ilets',
			'La Trinite',
			'Le Lamentin',
			'Le Carbet',
			'Le Diamant',
			'Le Francois',
			'Le Lorrain',
			'Le Marigot',
			'Le Marin',
			'Le Morne-Rouge',
			'Le Morne-Vert',
			'Le Precheur',
			'Le Robert',
			'Sainte-Marie',
			'Saint-Esprit',
			'Saint-Joseph',
			'Saint-Pierre',
			'Schoelcher',
			'Macouba',
			'Riviere-Salee',
			'Riviere-Pilote',
			'Sainte-Luce',
			'Le Vauclin'
		) THEN 'martinique'
		WHEN `name` IN (
			'Apatou',
			'Awala-Yalimapo',
			'Camopi',
			'Cayenne',
			'Grand-Santi',
			'Iracoubo',
			'Kourou',
			'Macouria',
			'Mana',
			'Maripasoula',
			'Matoury',
			'Montsinery-Tonnegrande',
			'Ouanary',
			'Papaichton',
			'Regina',
			'Remire-Montjoly',
			'Sinnamary',
			'Roura',
			'Saint-Elie',
			'Saint-Georges',
			'Saint-Laurent-du-Maroni',
			'Saul'
		) THEN 'guyane'
		ELSE 'guadeloupe'
	END,
	`name`,
	`slug`,
	`created_at`
FROM `communes`
WHERE `name` <> 'Sainte-Anne';--> statement-breakpoint
INSERT INTO `__new_communes` (`id`, `region`, `name`, `slug`, `created_at`)
SELECT `id`, 'guadeloupe', `name`, `slug`, `created_at`
FROM `communes`
WHERE `name` = 'Sainte-Anne';--> statement-breakpoint
INSERT INTO `__new_communes` (`region`, `name`, `slug`, `created_at`)
SELECT 'martinique', `name`, `slug`, `created_at`
FROM `communes`
WHERE `name` = 'Sainte-Anne'
LIMIT 1;--> statement-breakpoint
UPDATE `electoral_lists`
SET `commune_id` = (
	SELECT `id`
	FROM `__new_communes`
	WHERE `region` = 'martinique'
		AND `name` = 'Sainte-Anne'
	LIMIT 1
)
WHERE `commune_id` = (
	SELECT `id`
	FROM `communes`
	WHERE `name` = 'Sainte-Anne'
	LIMIT 1
)
AND `slug` IN (
	'belon-marie-stephanie',
	'anglio-gerard',
	'gemieux-jean-michel',
	'ferdinand-jeremie'
);--> statement-breakpoint
UPDATE `tracks`
SET `commune_id` = (
	SELECT `id`
	FROM `__new_communes`
	WHERE `region` = 'martinique'
		AND `name` = 'Sainte-Anne'
	LIMIT 1
)
WHERE `commune_id` = (
	SELECT `id`
	FROM `communes`
	WHERE `name` = 'Sainte-Anne'
	LIMIT 1
)
AND `electoral_list_id` IN (
	SELECT `id`
	FROM `electoral_lists`
	WHERE `commune_id` = (
		SELECT `id`
		FROM `__new_communes`
		WHERE `region` = 'martinique'
			AND `name` = 'Sainte-Anne'
		LIMIT 1
	)
);--> statement-breakpoint
UPDATE `vote_sessions`
SET `commune_id` = (
	SELECT `id`
	FROM `__new_communes`
	WHERE `region` = 'martinique'
		AND `name` = 'Sainte-Anne'
	LIMIT 1
)
WHERE `commune_id` = (
	SELECT `id`
	FROM `communes`
	WHERE `name` = 'Sainte-Anne'
	LIMIT 1
)
AND (
	`current_champion_track_id` IN (
		SELECT `id`
		FROM `tracks`
		WHERE `commune_id` = (
			SELECT `id`
			FROM `__new_communes`
			WHERE `region` = 'martinique'
				AND `name` = 'Sainte-Anne'
			LIMIT 1
		)
	)
	OR `current_challenger_track_id` IN (
		SELECT `id`
		FROM `tracks`
		WHERE `commune_id` = (
			SELECT `id`
			FROM `__new_communes`
			WHERE `region` = 'martinique'
				AND `name` = 'Sainte-Anne'
			LIMIT 1
		)
	)
);--> statement-breakpoint
UPDATE `votes`
SET `commune_id` = (
	SELECT `id`
	FROM `__new_communes`
	WHERE `region` = 'martinique'
		AND `name` = 'Sainte-Anne'
	LIMIT 1
)
WHERE `commune_id` = (
	SELECT `id`
	FROM `communes`
	WHERE `name` = 'Sainte-Anne'
	LIMIT 1
)
AND (
	`left_track_id` IN (
		SELECT `id`
		FROM `tracks`
		WHERE `commune_id` = (
			SELECT `id`
			FROM `__new_communes`
			WHERE `region` = 'martinique'
				AND `name` = 'Sainte-Anne'
			LIMIT 1
		)
	)
	OR `right_track_id` IN (
		SELECT `id`
		FROM `tracks`
		WHERE `commune_id` = (
			SELECT `id`
			FROM `__new_communes`
			WHERE `region` = 'martinique'
				AND `name` = 'Sainte-Anne'
			LIMIT 1
		)
	)
	OR `winner_track_id` IN (
		SELECT `id`
		FROM `tracks`
		WHERE `commune_id` = (
			SELECT `id`
			FROM `__new_communes`
			WHERE `region` = 'martinique'
				AND `name` = 'Sainte-Anne'
			LIMIT 1
		)
	)
	OR `loser_track_id` IN (
		SELECT `id`
		FROM `tracks`
		WHERE `commune_id` = (
			SELECT `id`
			FROM `__new_communes`
			WHERE `region` = 'martinique'
				AND `name` = 'Sainte-Anne'
			LIMIT 1
		)
	)
);--> statement-breakpoint
UPDATE `round1_commune_winners`
SET `commune_id` = (
	SELECT `id`
	FROM `__new_communes`
	WHERE `region` = 'martinique'
		AND `name` = 'Sainte-Anne'
	LIMIT 1
)
WHERE `commune_id` = (
	SELECT `id`
	FROM `communes`
	WHERE `name` = 'Sainte-Anne'
	LIMIT 1
)
AND `winning_track_id` IN (
	SELECT `id`
	FROM `tracks`
	WHERE `commune_id` = (
		SELECT `id`
		FROM `__new_communes`
		WHERE `region` = 'martinique'
			AND `name` = 'Sainte-Anne'
		LIMIT 1
	)
);--> statement-breakpoint
DROP TABLE `communes`;--> statement-breakpoint
ALTER TABLE `__new_communes` RENAME TO `communes`;--> statement-breakpoint
CREATE UNIQUE INDEX `communes_region_name_unique` ON `communes` (`region`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `communes_region_slug_unique` ON `communes` (`region`,`slug`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
