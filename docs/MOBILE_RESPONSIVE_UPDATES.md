# Mobile Responsive Updates for Zenith Trader

## 1. Explorer Page Mobile Improvements

### Search Bar (Mobile)
```tsx
// Change from flex gap-4 to stack on mobile
<div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
  <Input className="flex-1 h-12" />
  <Button className="h-12 w-full sm:w-auto">Analyze</Button>
</div>
```

### Suggested Wallets Cards (Mobile)
```tsx
// Mobile: Vertical card layout
// Desktop: Table row layout
<div className="block sm:hidden space-y-3">
  {/* Mobile Card View */}
  <div className="bg-slate-800/30 rounded-lg p-4">
    <div className="flex justify-between items-start mb-2">
      <div>
        <div className="font-medium">{wallet.name}</div>
        <div className="text-xs text-slate-400">{truncateAddress(wallet.address)}</div>
      </div>
      <Badge>{wallet.riskLevel}</Badge>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-slate-400">Value:</span>
        <span className="font-bold ml-1">{formatLargeCurrency(wallet.totalValueUsd)}</span>
      </div>
      <div>
        <span className="text-slate-400">Score:</span>
        <span className="font-bold ml-1">{wallet.smartScore}</span>
      </div>
    </div>
    <div className="mt-3 space-y-1">
      <div className="flex justify-between">
        <span className="text-xs text-slate-400">7D PnL</span>
        <span className={pnlColorClass}>{formatPercent(wallet.pnlPercent7d)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-slate-400">30D PnL</span>
        <span className={pnlColorClass}>{formatPercent(wallet.pnlPercent30d)}</span>
      </div>
    </div>
    <Button className="w-full mt-3" size="sm">Analyze</Button>
  </div>
</div>

// Desktop view (hidden on mobile)
<div className="hidden sm:block">
  {/* Current table view */}
</div>
```

### Metrics Cards (Mobile)
```tsx
// Change from 5 columns to 2 columns on mobile, scrollable
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
  {/* Cards with smaller padding on mobile */}
</div>
```

### Chart Container (Mobile)
```tsx
// Make chart responsive height
<div className="h-64 sm:h-80">
  <ResponsiveContainer width="100%" height="100%">
    {/* Chart content */}
  </ResponsiveContainer>
</div>
```

### Position Ledger Table (Mobile)
```tsx
// Add horizontal scroll wrapper
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="min-w-[600px] px-4 sm:px-0">
    <Table>
      {/* Table content */}
    </Table>
  </div>
</div>
```

## 2. Dashboard Page Mobile Improvements

### Stats Cards
```tsx
// Stack on mobile, grid on desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Stat cards */}
</div>
```

### Active Strategies Section
```tsx
// Mobile: Card view
// Desktop: Table view
<div className="block sm:hidden">
  {strategies.map(strategy => (
    <div className="bg-slate-800/30 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium">{strategy.name}</h4>
        <Badge>{strategy.status}</Badge>
      </div>
      <div className="text-sm text-slate-400">
        <div>PnL: {strategy.pnl}</div>
        <div>Trades: {strategy.trades}</div>
      </div>
    </div>
  ))}
</div>
```

## 3. Strategies Page Mobile Improvements

### Unlock Card (Mobile)
```tsx
// Full width on mobile, centered on desktop
<div className="w-full max-w-full sm:max-w-2xl mx-auto">
  <Card>
    {/* Content with responsive padding */}
    <CardContent className="p-4 sm:p-6">
      {/* Feature grid: 1 column mobile, 3 columns desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Features */}
      </div>
    </CardContent>
  </Card>
</div>
```

## 4. Notifications Page Mobile Improvements

### Notification Settings
```tsx
// Stack form elements on mobile
<div className="space-y-4">
  <div className="flex flex-col sm:flex-row gap-3">
    <Input className="flex-1" />
    <Button className="w-full sm:w-auto">Subscribe</Button>
  </div>
</div>
```

## 5. Global Mobile Improvements

### Typography Sizing
```css
/* Mobile-first font sizes */
.heading-1 {
  @apply text-2xl sm:text-3xl lg:text-4xl;
}

.heading-2 {
  @apply text-xl sm:text-2xl lg:text-3xl;
}

.body-text {
  @apply text-sm sm:text-base;
}
```

### Touch Targets
```tsx
// Ensure minimum 44x44px touch targets
<Button className="min-h-[44px] min-w-[44px]">
  {/* Content */}
</Button>
```

### Spacing & Padding
```tsx
// Responsive padding
<div className="p-4 sm:p-6 lg:p-8">
  {/* Content */}
</div>
```

### Modal/Dialog Sizing
```tsx
// Full screen on mobile, centered on desktop
<Dialog>
  <DialogContent className="w-full h-full sm:w-auto sm:h-auto sm:max-w-lg">
    {/* Content */}
  </DialogContent>
</Dialog>
```

## Implementation Priority

1. **High Priority**
   - Explorer page suggested wallets cards
   - Mobile navigation bar
   - Auth pages mobile layout
   - Touch target sizes

2. **Medium Priority**
   - Dashboard responsive grid
   - Table horizontal scrolling
   - Chart responsive sizing
   - Form input stacking

3. **Low Priority**
   - Animation optimizations
   - Gesture support
   - Pull-to-refresh
   - Skeleton loading states