# Strategy Creation Wizard - Functional Requirements

## Overview
This document outlines the functional requirements and technical specifications for improving the strategy creation wizard in Zenith Trader. The improvements focus on removing redundancy, enhancing user experience, and integrating with existing systems.

## Current System Analysis

### Existing Implementation
- **Location**: `frontend/project/src/components/strategies/StrategyWizard.tsx`
- **Technology**: React with TypeScript, Zod validation, React Hook Form
- **Current Steps**: 7-step wizard (Basic Info, Exchange, Futures Config, Position Sizing, Symbol Filters, Execution, Review)
- **Issues**: Poor UI, redundant quick create option, no pre-filled credentials

### Integration Points
- **User Authentication**: JWT-based authentication system
- **API Integration**: RESTful API for strategy CRUD operations
- **OKX Integration**: Trading API connectivity
- **State Management**: Zustand stores for application state

## Functional Requirements

### 1. Remove Redundant Quick Create
**Requirement**: Eliminate the "Quick Create" option from the strategies page

**Acceptance Criteria**:
- [ ] Remove "Quick Create" button from StrategiesPage.tsx
- [ ] Remove CreateStrategyDialog component and its usage
- [ ] Update empty state to only show "Advanced Wizard" option
- [ ] Update all references and documentation
- [ ] Ensure no breaking changes to existing strategies

**Technical Implementation**:
```typescript
// Remove from StrategiesPage.tsx
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

// Remove from JSX
<Button onClick={() => setIsCreateDialogOpen(true)}>Quick Create</Button>
<CreateStrategyDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
```

### 2. Pre-filled OKX Credentials
**Requirement**: Automatically populate OKX API credentials from user profile

**Acceptance Criteria**:
- [ ] Fetch user's saved OKX credentials from profile
- [ ] Pre-fill API key, secret, and passphrase in exchange step
- [ ] Show masked credentials with reveal/hide functionality
- [ ] Allow users to override pre-filled values
- [ ] Validate credential format before submission
- [ ] Show credential status (valid/invalid/expired)

**Technical Implementation**:
```typescript
// New component for credential management
interface OKXCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  isValid: boolean;
  lastValidated?: Date;
}

// API endpoint to fetch user credentials
GET /api/user/exchange-credentials
```

### 3. Modern UI/UX Implementation
**Requirement**: Implement modern, clean design with proper contrast and readability

**Acceptance Criteria**:
- [ ] Apply consistent color scheme with proper contrast ratios
- [ ] Implement modern form components with proper styling
- [ ] Add visual step progress indicator
- [ ] Ensure mobile responsiveness across all device sizes
- [ ] Add loading states and error handling
- [ ] Implement smooth transitions between steps

**Technical Implementation**:
```typescript
// Modern form component structure
const ModernFormInput = ({ label, error, helperText, ...props }) => (
  <div className="space-y-1">
    <Label className="text-sm font-medium">{label}</Label>
    <Input 
      className={cn(
        "transition-colors",
        error && "border-red-500 focus:border-red-500"
      )}
      {...props}
    />
    {error && <p className="text-red-500 text-xs">{error}</p>}
    {helperText && <p className="text-gray-500 text-xs">{helperText}</p>}
  </div>
);
```

### 4. Enhanced Form Validation
**Requirement**: Improve real-time validation with clear error messages

**Acceptance Criteria**:
- [ ] Real-time validation on all form fields
- [ ] Clear, actionable error messages
- [ ] Visual indication of validation states
- [ ] Debounced validation for better performance
- [ ] Cross-field validation where necessary
- [ ] Prevent navigation to next step with invalid data

**Technical Implementation**:
```typescript
// Enhanced validation schema with custom messages
const strategySchema = z.object({
  name: z.string()
    .min(1, 'Strategy name is required')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Only letters, numbers, spaces, and hyphens allowed'),
  
  walletAddress: z.string()
    .min(42, 'Invalid wallet address')
    .max(42, 'Invalid wallet address')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  
  // ... other fields with specific validation
});
```

### 5. Improved Step Navigation
**Requirement**: Enhance step navigation with better UX patterns

**Acceptance Criteria**:
- [ ] Visual progress indicator showing all steps
- [ ] Clickable step navigation for quick access
- [ ] Save draft functionality with auto-save
- [ ] Confirmation dialog on exit with unsaved changes
- [ ] Keyboard navigation support (arrow keys, tab)
- [ ] Step validation before navigation

**Technical Implementation**:
```typescript
// Step navigation component
const StepNavigation = ({ currentStep, steps, onStepClick }) => (
  <nav className="flex items-center justify-between mb-8">
    {steps.map((step, index) => (
      <button
        key={step.id}
        onClick={() => onStepClick(index)}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
          currentStep === index && "bg-primary text-primary-foreground",
          currentStep > index && "text-green-500",
          currentStep < index && "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          currentStep === index && "bg-primary text-primary-foreground",
          currentStep > index && "bg-green-500 text-white",
          currentStep < index && "bg-muted text-muted-foreground"
        )}>
          {currentStep > index ? "✓" : index + 1}
        </span>
        <span className="hidden sm:block">{step.title}</span>
      </button>
    ))}
  </nav>
);
```

## Technical Specifications

### Architecture Overview
```
StrategyWizard (Main Component)
├── StepNavigation (Progress indicator)
├── FormProvider (React Hook Form)
├── Step Components
│   ├── BasicInfoStep
│   ├── ExchangeStep (with OKX credentials)
│   ├── FuturesConfigStep
│   ├── PositionSizingStep
│   ├── SymbolFiltersStep
│   ├── ExecutionStep
│   └── ReviewStep
├── ValidationService
├── CredentialService
└── DraftService
```

### Data Flow
1. **Initialization**: Fetch user credentials and draft data
2. **Form Rendering**: Render current step with validation
3. **User Input**: Real-time validation and state updates
4. **Navigation**: Step validation and data persistence
5. **Submission**: API call with error handling
6. **Completion**: Success handling and cleanup

### API Integration

#### Endpoints Required
```typescript
// User credentials
GET /api/user/exchange-credentials
POST /api/user/exchange-credentials
PUT /api/user/exchange-credentials

// Strategy operations
POST /api/strategies
PUT /api/strategies/:id
GET /api/strategies/validate

// Draft operations
POST /api/strategies/draft
GET /api/strategies/draft/:id
DELETE /api/strategies/draft/:id
```

#### Request/Response Models
```typescript
interface StrategyRequest {
  name: string;
  walletAddress: string;
  exchange: 'OKX' | 'Binance' | 'Bybit';
  copyMode: 'Perpetual' | 'Spot';
  leverage: number;
  marginMode: 'cross' | 'isolated';
  sizingMethod: 'Fixed Amount' | 'Percentage of Wallet\'s Trade';
  positionSize: number;
  amountPerTrade?: number;
  percentageToCopy?: number;
  stopLoss?: number;
  dailyLimit?: number;
  allowedTokens: string[];
  minTradeSize?: number;
  maxTradeSize?: number;
  executionDelay: number;
  maxSlippage: number;
  retryAttempts: number;
  enablePartialFills: boolean;
  autoAdjustPosition: boolean;
  enableLiquidationProtection: boolean;
  enableTradeNotifications: boolean;
  enableErrorNotifications: boolean;
  enableDailyReports: boolean;
}

interface StrategyResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  totalPnL: number;
  currentPnL: number;
  tradesCount: number;
  // ... other fields from request
}
```

### State Management
```typescript
interface WizardState {
  currentStep: number;
  isSubmitting: boolean;
  draftSaved: boolean;
  formData: Partial<StrategyFormData>;
  validationErrors: Record<string, string>;
  okxCredentials: OKXCredentials | null;
  isLoadingCredentials: boolean;
}

interface Actions {
  setCurrentStep: (step: number) => void;
  updateFormData: (data: Partial<StrategyFormData>) => void;
  setValidationErrors: (errors: Record<string, string>) => void;
  submitForm: () => Promise<void>;
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
}
```

### Error Handling
```typescript
interface WizardError {
  type: 'validation' | 'network' | 'server' | 'credential';
  message: string;
  field?: string;
  details?: any;
}

const errorHandlers = {
  validation: (error: ZodError) => {
    // Convert Zod validation errors to user-friendly messages
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
  },
  
  network: (error: NetworkError) => {
    // Handle network connectivity issues
    return {
      type: 'network',
      message: 'Network connection error. Please check your internet connection.'
    };
  },
  
  server: (error: ApiError) => {
    // Handle server-side errors
    return {
      type: 'server',
      message: error.response?.data?.message || 'Server error occurred'
    };
  },
  
  credential: (error: CredentialError) => {
    // Handle credential validation errors
    return {
      type: 'credential',
      message: 'Invalid API credentials. Please check your OKX API settings.'
    };
  }
};
```

## Performance Requirements

### Load Time Targets
- **Initial Load**: < 1 second
- **Step Transitions**: < 300ms
- **Form Validation**: < 100ms
- **API Responses**: < 2 seconds

### Memory Usage
- **Component Memory**: < 5MB
- **State Management**: < 1MB
- **Form Data**: < 500KB

### Bundle Size Impact
- **Additional JavaScript**: < 50KB gzipped
- **CSS**: < 20KB gzipped
- **No new dependencies** - use existing libraries

## Security Requirements

### Data Protection
- [ ] Encrypt sensitive credential data at rest
- [ ] Use HTTPS for all API communications
- [ ] Implement proper authentication headers
- [ ] Sanitize all user inputs
- [ ] Prevent XSS attacks

### Credential Security
- [ ] Never expose full API keys in client-side code
- [ ] Use environment variables for sensitive configuration
- [ ] Implement proper credential rotation
- [ ] Log credential validation attempts
- [ ] Revoke invalid credentials automatically

## Testing Requirements

### Unit Tests
- [ ] Form validation logic (95% coverage)
- [ ] Step navigation logic (100% coverage)
- [ ] Credential management (90% coverage)
- [ ] State management (90% coverage)

### Integration Tests
- [ ] API integration tests
- [ ] Form submission flow
- [ ] Credential validation
- [ ] Draft save/load functionality

### E2E Tests
- [ ] Complete wizard flow
- [ ] Mobile responsiveness
- [ ] Error scenarios
- [ ] Accessibility validation

### Performance Tests
- [ ] Load testing with concurrent users
- [ ] Memory leak testing
- [ ] Bundle size analysis
- [ ] Mobile performance testing

## Accessibility Requirements

### WCAG 2.1 Compliance
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Focus indicators
- [ ] ARIA labels and descriptions
- [ ] Responsive design for all screen sizes

### Screen Reader Support
- [ ] Proper form labeling
- [ ] Error announcement
- [ ] Status updates
- [ ] Progress indication
- [ ] Interactive element identification

## Browser Support

### Target Browsers
- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions
- **Mobile Safari**: iOS 14+
- **Mobile Chrome**: Android 8+

### Fallback Support
- [ ] Graceful degradation for older browsers
- [ ] Proper error handling for unsupported features
- [ ] Basic functionality without JavaScript
- [ ] Mobile-first responsive design