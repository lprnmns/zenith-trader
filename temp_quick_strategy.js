// POST /api/strategies/quick - create quick strategy (only admin can create)
router.post('/strategies/quick', requireAuth, async (req, res) => {
  console.log('[API] Quick strategy request - User role:', req.user?.role, 'User ID:', req.user?.userId);
  try {
    const { walletAddress, name } = req.body;
    console.log('[API] Request body:', { walletAddress, name });
    
    if (!walletAddress || !name) {
      console.log('[API] Missing required fields');
      return res.status(400).json({ error: 'Wallet address and name are required' });
    }
    
    // Validate wallet address format
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      console.log('[API] Invalid wallet address format');
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    
    console.log('[API] Checking existing strategy for userId:', req.user.userId, 'walletAddress:', walletAddress);
    
    // Check if wallet address already exists for this user
    const existingStrategy = await prisma.strategy.findFirst({
      where: { 
        walletAddress,
        userId: req.user.userId
      }
    });
    
    console.log('[API] Existing strategy found:', !!existingStrategy);
    
    if (existingStrategy) {
      console.log('[API] Strategy already exists, returning error');
      return res.status(400).json({ error: 'You already have a strategy for this wallet address' });
    }
    
    console.log('[API] Getting encrypted OKX credentials...');
    
    let encryptedCredentials;
    try {
      encryptedCredentials = getEncryptedOKXCredentials();
      console.log('[API] Got encrypted credentials successfully');
    } catch (encryptError) {
      console.error('[API] Encryption error:', encryptError);
      return res.status(500).json({ error: 'Failed to encrypt credentials: ' + encryptError.message });
    }
    
    // Pre-configured quick strategy settings
    const quickStrategyData = {
      name,
      walletAddress,
      exchange: 'OKX',
      copyMode: 'Perpetual',
      leverage: 3,
      sizingMethod: 'Percentage of Wallet\'s Trade',
      positionSize: 100,
      percentageToCopy: 100,
      ...encryptedCredentials,
      userId: req.user.userId,
      lastChecked: new Date() // Şu anki zamandan itibaren sinyal kontrolü yap
    };
    
    console.log('[API] Calling strategyService.createStrategy...');
    
    const strategy = await strategyService.createStrategy(quickStrategyData, req.user.userId);
    
    console.log('[API] Strategy created successfully:', strategy.id);
    
    // Remove sensitive data before sending response
    const { okxApiKey, okxApiSecret, okxPassphrase, ...safeStrategy } = strategy;
    
    res.json(safeStrategy);
  } catch (error) {
    console.error('[API] Quick strategy creation error:', error);
    console.error('[API] Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});
