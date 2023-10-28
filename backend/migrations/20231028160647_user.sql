-- Add migration script here
CREATE TABLE IF NOT EXISTS users
(
    id       UUID Primary Key,
    username TEXT NOT NULL,
    email    TEXT NOT NULL,
    password TEXT NOT NULL
);