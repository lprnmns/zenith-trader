# Zenith Trader - Freemium Model Implementation Plan

## Overview
This plan outlines the implementation of a freemium model for Zenith Trader, transforming it from an admin-only system to a tiered access model with upgrade capabilities.

## Current State Analysis

### Existing Infrastructure
- **User Roles**: ADMIN (full access) and USER (limited access)
- **Navigation**: Role-based sidebar with conditional visibility
- **Authentication**: JWT-based with Google OAuth support
- **Email System**: Gmail SMTP for admin notifications
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React/TypeScript with Zustand state management

### Current Limitations
- Only ADMIN users can access Dashboard and Strategies
- USER users can only access Wallet Explorer
- No upgrade mechanism or subscription management
- Mixed Turkish/English UI text

## Implementation Plan

## Section 1: Role-Based Homepage Redirection

### 1.1 Update App.tsx Routing Logic
**File**: `frontend/project/src/App.tsx`
**Changes**:
- Modify default route redirection based on user role
- ADMIN users → `/dashboard`
- USER users → `/explorer`

### 1.2 Update Auth Store Redirection
**File**: `frontend/project/src/stores/authStore.ts`
**Changes**:
- Add role-based redirection logic after login
- Update login/register methods to redirect appropriately

### 1.3 Update Sidebar Navigation
**File**: `frontend/project/src/components/layout/AppLayout.tsx`
**Changes**:
- Make all three links visible to both roles
- Update navigation items array to include Dashboard, Strategies, and Explorer for all users

## Section 2: Locked Strategies Page Implementation

### 2.1 Create Strategies Access Control Component
**File**: `frontend/project/src/components/strategies/StrategiesAccessControl.tsx`
**Features**:
- Role-based content rendering
- Lock overlay for USER role
- "Request Upgrade" dialog integration

### 2.2 Create Upgrade Request Dialog
**File**: `frontend/project/src/components/strategies/UpgradeRequestDialog.tsx`
**Features**:
- Form with email (pre-filled), contact info, message fields
- POST request to `/api/users/upgrade-request`
- Success/error handling with toast notifications

### 2.3 Update Strategies Page
**File**: `frontend/project/src/pages/StrategiesPage.tsx`
**Changes**:
- Import and use StrategiesAccessControl component
- Maintain existing functionality for ADMIN users
- Show locked interface for USER users

## Section 3: Backend API Implementation

### 3.1 Create Upgrade Request Endpoint
**File**: `src/api/userRoutes.js`
**New Endpoint**: `POST /api/users/upgrade-request`
**Features**:
- Validate authenticated user
- Process upgrade request form data
- Send email notification to admin
- Save request to database

### 3.2 Create Upgrade Request Database Model
**File**: `prisma/schema.prisma`
**New Model**:
```prisma
model UpgradeRequest {
  id            Int      @id @default(autoincrement())
  userId        Int
  email         String
  contactInfo   String?
  message       String?
  status        String   @default("PENDING") // PENDING, APPROVED, REJECTED
  adminNotes    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])

  @@index([userId, status])
  @@index([status, createdAt])
}
```

### 3.3 Create Upgrade Request Service
**File**: `src/services/upgradeRequestService.js`
**Features**:
- Database operations for upgrade requests
- Email notification logic
- Status management

## Section 4: Copy Button Implementation

### 4.1 Add Copy Button to Explorer Page
**File**: `frontend/project/src/pages/ExplorerPage.tsx`
**Changes**:
- Add "Copy" button next to "Portfolio Value" title
- Implement role-based navigation logic
- ADMIN users → Navigate to strategies with pre-filled wallet address
- USER users → Navigate to locked strategies page

### 4.2 Update Strategy Creation Flow
**File**: `frontend/project/src/components/strategies/StrategyWizard.tsx`
**Changes**:
- Add support for pre-filled wallet address from URL parameters
- Modify initialization to check for wallet address in query params

## Section 5: Notification Bell Styling Fix

### 5.1 Fix Notification Bell Component
**File**: `frontend/project/src/components/ui/NotificationBell.tsx`
**Changes**:
- Update CSS classes for proper visibility
- Add tooltip for better UX
- Ensure consistent styling with other icons

## Section 6: UI Text Translation to English

### 6.1 Update Auth Components
**Files**: 
- `frontend/project/src/components/auth/LoginForm.tsx`
- `frontend/project/src/components/auth/RegisterForm.tsx`
- `frontend/project/src/pages/AuthPage.tsx`

**Changes**:
- Translate all Turkish text to English
- Update validation messages
- Update button text and labels

### 6.2 Update Strategy Components
**Files**:
- `frontend/project/src/components/strategies/StrategyWizard.tsx`
- `frontend/project/src/components/strategies/QuickStrategyDialog.tsx`
- `frontend/project/src/pages/StrategiesPage.tsx`

**Changes**:
- Translate all Turkish text to English
- Update form labels and descriptions
- Update button text and validation messages

### 6.3 Update Navigation and Layout
**Files**:
- `frontend/project/src/components/layout/AppLayout.tsx`
- `frontend/project/src/components/layout/ProtectedRoute.tsx`

**Changes**:
- Translate navigation labels
- Update user interface text

## Section 7: Database Schema Updates

### 7.1 Create Migration for Upgrade Requests
**File**: `prisma/migrations/[timestamp]_add_upgrade_requests/migration.sql`
**Changes**:
- Add UpgradeRequest model to database
- Create necessary indexes

### 7.2 Update User Model Relations
**File**: `prisma/schema.prisma`
**Changes**:
- Add relation to UpgradeRequest model
- Update any necessary constraints

## Section 8: Email Template Updates

### 8.1 Create Upgrade Request Email Template
**File**: `src/templates/upgradeRequestEmail.html`
**Features**:
- Professional email template
- Include user information and request details
- Add admin action links

### 8.2 Update Admin Notification Service
**File**: `src/services/adminNotificationService.js`
**Changes**:
- Add method to send upgrade request notifications
- Include email template rendering

## Implementation Order

### Phase 1: Database and Backend
1. Update Prisma schema with UpgradeRequest model
2. Create and run database migration
3. Implement upgrade request service
4. Create upgrade request API endpoint
5. Update admin notification service

### Phase 2: Frontend Components
1. Create UpgradeRequestDialog component
2. Create StrategiesAccessControl component
3. Update StrategiesPage with access control
4. Update App.tsx routing logic
5. Update AppLayout.tsx navigation

### Phase 3: Features and Polish
1. Add copy button to Explorer page
2. Fix notification bell styling
3. Update strategy wizard for pre-filled addresses
4. Translate all UI text to English

### Phase 4: Testing and Refinement
1. Test role-based access control
2. Test upgrade request flow
3. Test email notifications
4. Test copy button functionality
5. Validate all translations

## Files to Modify

### Frontend Files
- `frontend/project/src/App.tsx`
- `frontend/project/src/stores/authStore.ts`
- `frontend/project/src/components/layout/AppLayout.tsx`
- `frontend/project/src/pages/StrategiesPage.tsx`
- `frontend/project/src/pages/ExplorerPage.tsx`
- `frontend/project/src/components/auth/LoginForm.tsx`
- `frontend/project/src/components/auth/RegisterForm.tsx`
- `frontend/project/src/components/strategies/StrategyWizard.tsx`
- `frontend/project/src/components/ui/NotificationBell.tsx`

### Backend Files
- `prisma/schema.prisma`
- `src/api/userRoutes.js`
- `src/services/adminNotificationService.js`
- `src/services/upgradeRequestService.js` (new)

### New Files to Create
- `frontend/project/src/components/strategies/StrategiesAccessControl.tsx`
- `frontend/project/src/components/strategies/UpgradeRequestDialog.tsx`
- `src/templates/upgradeRequestEmail.html`

## Success Criteria

1. ✅ User role-based homepage redirection works correctly
2. ✅ All three navigation links visible to all users
3. ✅ Strategies page shows locked interface for USER role
4. ✅ Upgrade request dialog works and sends emails
5. ✅ Copy button navigates appropriately based on role
6. ✅ Notification bell is visible and styled correctly
7. ✅ All UI text is translated to English
8. ✅ Database properly stores upgrade requests
9. ✅ Email notifications are sent successfully

## Notes

- Each section should be implemented and tested before proceeding to the next
- Use feature branches for each major section
- Test both ADMIN and USER roles thoroughly
- Ensure email notifications work in development environment
- Consider adding rate limiting to upgrade request endpoint
- Plan for future payment integration (Stripe/Paddle)