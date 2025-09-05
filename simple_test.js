console.log('🧪 Simple test starting...');

try {
  console.log('📦 Loading zerionService...');
  const zerionService = require('./src/services/zerionService');
  console.log('✅ zerionService loaded successfully');
  console.log('📋 Available functions:', Object.keys(zerionService));
  
  console.log('');
  console.log('🔍 Testing getNewTradesForSignal function...');
  const result = zerionService.getNewTradesForSignal('0x123', new Date());
  console.log('✅ Function call completed');
  console.log('📋 Result:', result);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
