-- Check the demo strategy details
SELECT s.*, u.email as owner_email
FROM "Strategy" s
JOIN "User" u ON s."userId" = u.id
WHERE s."walletAddress" = '0xc82b2e484b161d20eae386877d57c4e5807b5581';

-- Check all users with ADMIN role
SELECT id, email, role, "createdAt" 
FROM "User" 
WHERE role = 'ADMIN' 
ORDER BY "createdAt" DESC;
