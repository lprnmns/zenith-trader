-- Check users
SELECT id, email, role, "googleId", "googleEmail", "createdAt" FROM "User" ORDER BY "createdAt" DESC;

-- Check strategies
SELECT id, name, "walletAddress", "userId", exchange, "copyMode", "isActive", "createdAt" FROM "Strategy" ORDER BY "createdAt" DESC;

-- Check strategies for specific wallet address
SELECT id, name, "walletAddress", "userId", "createdAt" FROM "Strategy" WHERE "walletAddress" = '0xc82b2e484b161d20eae386877d57c4e5807b5581';

-- Check if admin user exists and has strategies
SELECT u.id, u.email, u.role, COUNT(s.id) as strategy_count 
FROM "User" u 
LEFT JOIN "Strategy" s ON u.id = s."userId" 
WHERE u.email = 'manasalperen@gmail.com' 
GROUP BY u.id, u.email, u.role;
