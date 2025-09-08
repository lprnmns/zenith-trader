require('dotenv').config();

// Test Admin Notification Service
async function testAdminNotifications() {
    console.log('🧪 Testing Admin Notification Service\n');
    console.log('Gmail User:', process.env.GMAIL_USER);
    console.log('App Password:', process.env.GMAIL_APP_PASSWORD ? '***configured***' : 'NOT SET');
    console.log('\n' + '='.repeat(50) + '\n');
    
    const adminNotificationService = require('./src/services/adminNotificationService');
    
    // Wait a moment for transporter to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        console.log('📧 Test 1: Sending test email directly...');
        const result = await adminNotificationService.sendEmail(
            'Test Email from Zenith Trader',
            `
                <h2>🧪 Test Email</h2>
                <p>This is a test email from your Zenith Trader backend.</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p>If you receive this, email notifications are working correctly!</p>
            `
        );
        
        if (result) {
            console.log('✅ Test email sent successfully!\n');
        } else {
            console.log('❌ Failed to send test email\n');
        }
        
        // Test 2: New user notification
        console.log('📧 Test 2: Testing new user notification...');
        await adminNotificationService.notifyNewUser({
            email: 'testuser@example.com',
            role: 'USER',
            googleId: null
        });
        console.log('✅ New user notification sent!\n');
        
        // Test 3: Position detection notification
        console.log('📧 Test 3: Testing position detection notification...');
        await adminNotificationService.notifyPositionDetection({
            walletAddress: '0xc82b2e484b161d20eae386877d57c4e5807b5581',
            type: 'BUY',
            token: 'ETH',
            percentage: 7.38,
            value: 1000.50
        });
        console.log('✅ Position detection notification sent!\n');
        
        // Test 4: Signal execution notification (success)
        console.log('📧 Test 4: Testing successful signal execution notification...');
        await adminNotificationService.notifySignalExecution(
            { token: 'ETH', type: 'BUY', sizeInUsdt: 100 },
            true,
            { orderId: '123456789', balance: 500 }
        );
        console.log('✅ Success signal notification sent!\n');
        
        // Test 5: Signal execution notification (failure)
        console.log('📧 Test 5: Testing failed signal execution notification...');
        await adminNotificationService.notifySignalExecution(
            { token: 'BTC', type: 'SELL', sizeInUsdt: 200 },
            false,
            { error: 'Insufficient balance', balance: 50 }
        );
        console.log('✅ Failed signal notification sent!\n');
        
        console.log('='.repeat(50));
        console.log('\n🎉 All test emails have been sent!');
        console.log('📬 Check your inbox at:', process.env.GMAIL_USER);
        console.log('\nNote: Emails might take a few seconds to arrive.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Make sure 2-factor authentication is enabled on your Gmail');
        console.error('2. App password should be 16 characters (without spaces)');
        console.error('3. Check if "Less secure app access" is disabled (it should be)');
        console.error('4. Try generating a new app password at: https://myaccount.google.com/apppasswords');
    }
    
    // Keep process alive for a moment to ensure emails are sent
    setTimeout(() => {
        console.log('\n✅ Test completed. Exiting...');
        process.exit(0);
    }, 5000);
}

testAdminNotifications();
