-- Add analysis_zh column to repositories table
-- Run this if you have an existing database

ALTER TABLE repositories 
ADD COLUMN IF NOT EXISTS analysis_zh TEXT;

COMMENT ON COLUMN repositories.analysis_zh IS 'Chinese translation of Gemini CLI analysis result';

