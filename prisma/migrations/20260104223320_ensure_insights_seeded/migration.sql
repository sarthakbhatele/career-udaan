-- Insert placeholder insights for domains without insights
INSERT INTO "IndustryInsight" (
  id, 
  industry, 
  "salaryRanges", 
  "growthRate", 
  "demandLevel", 
  "topSkills", 
  "marketOutlook", 
  "keyTrends", 
  "recommendedSkills", 
  "lastUpdated", 
  "nextUpdate", 
  "generationStatus", 
  "lastAttemptAt"
)
SELECT 
  gen_random_uuid(),
  ud.industry,
  ARRAY[]::jsonb[],
  0,
  'Medium',
  ARRAY[]::text[],
  'Neutral',
  ARRAY[]::text[],
  ARRAY[]::text[],
  NOW(),
  NOW() + INTERVAL '7 days',
  'pending',
  NOW()
FROM (SELECT DISTINCT industry FROM "UserDomain") ud
WHERE ud.industry NOT IN (SELECT industry FROM "IndustryInsight")
ON CONFLICT (industry) DO NOTHING;