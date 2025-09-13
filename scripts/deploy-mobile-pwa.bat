@echo off
echo ========================================
echo Zenith Trader - Mobile & PWA Deployment
echo ========================================
echo.

cd /d D:\projeler\zenith-trader\frontend\project

echo [1/5] Installing dependencies...
call npm install

echo.
echo [2/5] Building production bundle...
call npm run build

echo.
echo [3/5] Checking build output...
if exist dist (
    echo Build successful! Output in dist folder.
) else (
    echo Build failed! No dist folder found.
    exit /b 1
)

echo.
echo [4/5] Git operations...
cd /d D:\projeler\zenith-trader
git add .
git commit -m "feat: Complete mobile responsiveness and PWA support - Fixed PWA installation prompt - Added profile to bottom navigation - Removed hamburger menu - Created mobile wallet cards - Improved mobile layouts - Fixed notification system - Added proper icon support"

echo.
echo [5/5] Pushing to remote...
git push origin main

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo.
echo Vercel will automatically deploy from GitHub.
echo Check deployment at: https://zenithtrader.alperenmanas.app
echo.
pause