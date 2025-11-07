-- Add analysis_en column to repositories table
-- Run this if you have an existing database

ALTER TABLE repositories 
ADD COLUMN IF NOT EXISTS analysis_en TEXT;

COMMENT ON COLUMN repositories.analysis_en IS 'English Gemini CLI analysis result (original)';

