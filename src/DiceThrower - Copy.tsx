// DiceThrowerNew.tsx
import { useState, useMemo } from 'react';
import './DiceThrower.css';

type DiceColor = 'blue' | 'yellow' | 'red' | 'brown' | 'grey' | 'black';

interface Dice {
  id: number;
  color: DiceColor;
  value: number | null;
  isAnimating?: boolean;
}

interface RecentPool {
  id: string;           // now canonical count key
  colors: DiceColor[];  // still kept for display
  display: string;
  lastUsed: number;
}

const COLORS: DiceColor[] = ['blue', 'yellow', 'red', 'brown', 'grey', 'black'];

const colorStyles: Record<DiceColor, string> = {
  blue: '#0066ff',
  yellow: '#ffcc00',
  red: '#ff0000',
  brown: '#8B4513',
  grey: '#808080',
  black: '#000000',
};

const colorOrder: Record<DiceColor, number> = {
  blue: 1,
  yellow: 2,
  red: 3,
  brown: 4,
  grey: 5,
  black: 6,
};

const colorNames: Record<DiceColor, string> = {
  blue: 'Blue',
  yellow: 'Yellow',
  red: 'Red',
  brown: 'Brown',
  grey: 'Grey',
  black: 'Black',
};

export default function DiceThrower() {
  const [dicePool, setDicePool] = useState<Dice[]>([]);
  const [isRollingAll, setIsRollingAll] = useState(false);
  const [recentPools, setRecentPools] = useState<RecentPool[]>([]);
  const [nextId, setNextId] = useState(1);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [pressedDiceId, setPressedDiceId] = useState<number | null>(null);

  const addDice = (color: DiceColor) => {
    const currentId = nextId;
    setNextId(prev => prev + 1);
    setDicePool(prev => [...prev, { 
      id: currentId, 
      color, 
      value: null, 
      isAnimating: false 
    }]);
  };

  const removeDice = (id: number) => {
    setDicePool(prev => prev.filter(d => d.id !== id));
  };

  const handleDiceMouseDown = (id: number) => {
    if (isRollingAll) return;
    
    setPressedDiceId(id);
    const timer = window.setTimeout(() => {
      removeDice(id);
      setPressedDiceId(null);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleDiceMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressedDiceId(null);
  };

  const handleDiceMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressedDiceId(null);
  };

  const rerollSingle = (id: number) => {
    if (isRollingAll) return;

    setDicePool(prev =>
      prev.map(d =>
        d.id === id ? { ...d, value: null, isAnimating: true } : d
      )
    );

    setTimeout(() => {
      setDicePool(prev =>
        prev.map(d =>
          d.id === id
            ? { ...d, value: Math.floor(Math.random() * 6) + 1, isAnimating: false }
            : d
        )
      );
    }, 720);
  };

  const rollAll = () => {
    if (dicePool.length === 0 || isRollingAll) return;

    setIsRollingAll(true);

    setDicePool(prev =>
      prev.map(d => ({ ...d, value: null, isAnimating: true }))
    );

    setTimeout(() => {
      setDicePool(prev => {
        const newPool = prev.map(d => ({
          ...d,
          value: Math.floor(Math.random() * 6) + 1,
          isAnimating: false
        }));

        saveToRecent(newPool);

        return newPool;
      });

      setIsRollingAll(false);
    }, 720);
  };

  const saveToRecent = (currentDice: Dice[]) => {
    if (currentDice.length === 0) return;

    // ── Create multiset-aware canonical key ────────────────────────────────
    const counts: Record<DiceColor, number> = {
      blue: 0, yellow: 0, red: 0, brown: 0, grey: 0, black: 0
    };

    currentDice.forEach(d => {
      counts[d.color]++;
    });

    // Sort by color order, only include colors with count > 0
    const keyParts = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => colorOrder[a[0] as DiceColor] - colorOrder[b[0] as DiceColor])
      .map(([color, count]) => `${color}:${count}`);

    const key = keyParts.join(',');

    // ── Sorted colors for display dots ─────────────────────────────────────
    const sortedColors = [...currentDice]
      .sort((a, b) => colorOrder[a.color] - colorOrder[b.color])
      .map(d => d.color);

    const now = Date.now();

    // Build human-readable display string
    const display = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => colorOrder[a[0] as DiceColor] - colorOrder[b[0] as DiceColor])
      .map(([color, count]) => `${count} ${colorNames[color as DiceColor]}`)
      .join(', ');

    setRecentPools(prev => {
      const existingIndex = prev.findIndex(p => p.id === key);

      const newEntry: RecentPool = {
        id: key,
        colors: sortedColors,
        display,
        lastUsed: now,
      };

      if (existingIndex !== -1) {
        // Update timestamp of existing entry - position stays the same
        const poolsCopy = [...prev];
        poolsCopy[existingIndex] = {
          ...poolsCopy[existingIndex],
          lastUsed: now,
        };
        return poolsCopy;
      }

      // Add new entry to the end - maintains existing positions
      if (prev.length < 5) {
        return [...prev, newEntry];
      }

      // Find first empty slot (if any) or replace oldest
      let replaceIndex = prev.length - 1; // Default to last position
      let oldestTime = prev[replaceIndex].lastUsed;

      for (let i = 0; i < prev.length; i++) {
        if (prev[i].lastUsed < oldestTime) {
          oldestTime = prev[i].lastUsed;
          replaceIndex = i;
        }
      }

      const poolsCopy = [...prev];
      poolsCopy[replaceIndex] = newEntry;
      return poolsCopy;
    });
  };

  const loadRecent = (pool: RecentPool) => {
    if (isRollingAll) return;

    const currentId = nextId;
    const newDice: Dice[] = pool.colors.map((color, index) => ({
      id: currentId + index,
      color,
      value: null,
      isAnimating: false
    }));

    setDicePool(newDice);
    setNextId(prev => prev + pool.colors.length);
  };

  const sortedDicePool = useMemo(() => {
    return [...dicePool].sort((a, b) => colorOrder[a.color] - colorOrder[b.color]);
  }, [dicePool]);

  return (
    <div className="dice-app">
      {/* Header / Dice Selector */}
      <div className="color-buttons">
        {COLORS.map(color => (
          <button
            key={color}
            className="color-btn"
            style={{ backgroundColor: colorStyles[color] }}
            onClick={() => addDice(color)}
            title={`Add ${color} die`}
            aria-label={`Add ${colorNames[color]} die`}
          />
        ))}
      </div>

      {/* Recent Dice Pools */}

        <div className="recent-grid">
          {recentPools.map(pool => (
            <button
              key={pool.id}
              className="recent-pool-btn"
              onClick={() => loadRecent(pool)}
              title={`Load: ${pool.display}`}
            >
              <div className="pool-dots">
                {pool.colors.map((color, idx) => (
                  <div
                    key={`${color}-${idx}`}   // ← Improvement #1
                    className="dot"
                    style={{ backgroundColor: colorStyles[color] }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>


      {/* Main Dice Pool */}
      <div className="dice-pool">
        {dicePool.length === 0 ? (
          <div className="empty-message"></div>
        ) : (
          sortedDicePool.map(dice => (
            <div
              key={dice.id}
              className={`dice ${dice.isAnimating ? 'rolling' : ''} ${pressedDiceId === dice.id ? 'pressed' : ''}`}
              style={{ backgroundColor: colorStyles[dice.color] }}
              onClick={() => rerollSingle(dice.id)}
              onMouseDown={() => handleDiceMouseDown(dice.id)}
              onMouseUp={handleDiceMouseUp}
              onMouseLeave={handleDiceMouseLeave}
              onTouchStart={() => handleDiceMouseDown(dice.id)}
              onTouchEnd={handleDiceMouseUp}
              title="Click to (re)roll, long press to remove"
            >
              {dice.value !== null ? dice.value : '?'}
            </div>
          ))
        )}
      </div>

      {dicePool.length > 0 && (
        <div className="controls">
          <button
            className="roll-button"
            onClick={rollAll}
            disabled={isRollingAll}
          >
            {isRollingAll ? 'Rolling...' : 'Roll All'}
          </button>
        </div>
      )}
    </div>
  );
}