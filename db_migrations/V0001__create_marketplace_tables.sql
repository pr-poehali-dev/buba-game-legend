-- Создаём таблицы для маркетплейса

-- Таблица игроков
CREATE TABLE IF NOT EXISTS t_p9427345_buba_game_legend.players (
    player_id VARCHAR(100) PRIMARY KEY,
    bubix INTEGER NOT NULL DEFAULT 200,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица инвентаря игроков
CREATE TABLE IF NOT EXISTS t_p9427345_buba_game_legend.inventory (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(100) NOT NULL,
    booba_id VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    UNIQUE(player_id, booba_id)
);

-- Таблица маркетплейса (лоты)
CREATE TABLE IF NOT EXISTS t_p9427345_buba_game_legend.marketplace (
    listing_id SERIAL PRIMARY KEY,
    seller_id VARCHAR(100) NOT NULL,
    booba_id VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_inventory_player ON t_p9427345_buba_game_legend.inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON t_p9427345_buba_game_legend.marketplace(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_booba ON t_p9427345_buba_game_legend.marketplace(booba_id);