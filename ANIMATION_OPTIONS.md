# Text Scramble Animation Customization Options

## Available Parameters

### AnimatedPrice Component Props

The `AnimatedPrice` component accepts these props that you can customize:

```typescript
<AnimatedPrice
  value={number}                    // The price value to display
  format={(val) => string}          // Custom formatting function
  duration={0.6}                    // Animation duration in seconds (default: 0.6)
  speed={0.03}                      // Step speed in seconds (default: 0.03)
  className="..."                   // CSS classes for styling
  prefix="+"                        // Text before the number (e.g., "+", "$")
  suffix="¢"                        // Text after (currently moved outside)
/>
```

### TextScramble Component Props (Advanced)

For direct `TextScramble` usage, you also have:

```typescript
<TextScramble
  duration={0.8}                    // Total animation duration
  speed={0.04}                      // Speed of each step
  characterSet="ABC123..."          // Characters to scramble with
  trigger={boolean}                 // When to start animation
  onScrambleComplete={() => {}}     // Callback when done
/>
```

## Customization Examples

### 1. Faster Animation (Quick & Snappy)
```typescript
<AnimatedPrice
  value={price}
  duration={0.3}    // Half the default time
  speed={0.015}     // Faster steps
/>
```

### 2. Slower, More Dramatic Animation
```typescript
<AnimatedPrice
  value={price}
  duration={1.2}    // Longer duration
  speed={0.05}      // Slower steps
/>
```

### 3. Ultra-Fast (Barely Noticeable)
```typescript
<AnimatedPrice
  value={price}
  duration={0.2}
  speed={0.01}
/>
```

### 4. Smooth & Gentle
```typescript
<AnimatedPrice
  value={price}
  duration={1.0}
  speed={0.02}
/>
```

### 5. Custom Character Set (Numbers Only)
```typescript
// In AnimatedPrice.tsx, you can pass characterSet to TextScramble
// For numbers-only scrambling:
characterSet="0123456789"
```

### 6. Different Animations for Different Contexts

You could create variants:

```typescript
// Fast for buttons
<AnimatedPrice value={price} duration={0.4} speed={0.02} />

// Medium for chart
<AnimatedPrice value={price} duration={0.6} speed={0.03} />

// Slow for important displays
<AnimatedPrice value={price} duration={1.0} speed={0.04} />
```

## Current Settings

Right now, all prices use:
- **duration**: `0.6` seconds
- **speed**: `0.03` seconds per step

This creates a balanced animation that's noticeable but not distracting.

## Where to Modify

1. **Global settings**: Edit the default values in `components/AnimatedPrice.tsx` (lines 22-23)

2. **Individual instances**: Change the `duration` and `speed` props on specific `AnimatedPrice` components

3. **Different contexts**: Create wrapper components for different animation styles

## Advanced: Custom Character Sets

To customize which characters appear during scrambling:

```typescript
// Numbers only
const numbersOnly = "0123456789"

// Numbers + basic symbols
const withSymbols = "0123456789+-$"

// Hex characters (cool effect)
const hexChars = "0123456789ABCDEF"
```

You'd need to modify `AnimatedPrice` to pass `characterSet` through to `TextScramble`.

## Animation Style Ideas

1. **Trading Terminal Style**: Very fast (0.2s), numbers-only characters
2. **Casual/Branded**: Medium speed (0.6s), includes letters for fun
3. **Premium/Luxury**: Slow (1.2s), smooth and deliberate
4. **Gaming/Crypto**: Fast (0.3s), hex characters for tech feel

