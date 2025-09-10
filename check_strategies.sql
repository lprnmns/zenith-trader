SELECT s.id, s.name, s."walletAddress", s."userId", u.email, u.role
FROM "Strategy" s
JOIN "User" u ON s."userId" = u.id
ORDER BY s."createdAt" DESC;
