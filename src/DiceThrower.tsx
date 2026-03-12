// DiceThrowerNew.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import './DiceThrower.css';

// Pure dice color names
const DICE_COLORS = ['blue', 'yellow', 'red', 'brown', 'gray', 'black'] as const;

type DiceColor = typeof DICE_COLORS[number];

interface Dice {
  id: number;
  color: DiceColor;
  value: number | null;
  isAnimating?: boolean;
}

interface RecentPool {
  id: string;           // canonical count key
  colors: DiceColor[];  // dice configuration
  lastUsed: number;
}

const COLORS = DICE_COLORS;

const colorOrder: Record<DiceColor, number> = {
  blue: 1,
  yellow: 2,
  red: 3,
  brown: 4,
  gray: 5,
  black: 6,
};

export default function DiceThrower() {
  const [dicePool, setDicePool] = useState<Dice[]>([]);
  const [isRollingAll, setIsRollingAll] = useState(false);
  const [recentPools, setRecentPools] = useState<RecentPool[]>([]);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [pressedDiceId, setPressedDiceId] = useState<number | null>(null);
  const [pressedPoolId, setPressedPoolId] = useState<string | null>(null);

  // Use ref for stable, synchronous ID generation
  const nextIdRef = useRef(1);

  // Preload all dice images at startup
  useEffect(() => {
    DICE_COLORS.forEach(color => {
      for (let i = 1; i <= 6; i++) {
        const img = new Image();
        img.src = `${import.meta.env.BASE_URL}img/${color}${i}.png`;
      }
    });
  }, []);

  const addDice = (color: DiceColor) => {
    const id = nextIdRef.current++;
    setDicePool(prev => [...prev, { 
      id, 
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

  const handleDiceMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressedDiceId(null);
    // Only prevent default if this was a long press (timer was cleared)
    if (!longPressTimer) {
      e.preventDefault();
    }
  };

  const handleDiceMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressedDiceId(null);
  };

  const handleDiceContextMenu = (e: React.MouseEvent) => {
    // Prevent context menu on right click/long press
    e.preventDefault();
    return false;
  };

  const handlePoolMouseDown = (id: string) => {
    setPressedPoolId(id);
    const timer = window.setTimeout(() => {
      removeRecentPool(id);
      setPressedPoolId(null);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handlePoolMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressedPoolId(null);
    // Only prevent default if this was a long press (timer was cleared)
    if (!longPressTimer) {
      e.preventDefault();
    }
  };

  const handlePoolMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressedPoolId(null);
  };

  const removeRecentPool = (id: string) => {
    setRecentPools(prev => prev.filter(pool => pool.id !== id));
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
    }, 1000);
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
    }, 1000);
  };

  const saveToRecent = (currentDice: Dice[]) => {
    if (currentDice.length === 0) return;

    const counts: Record<DiceColor, number> = Object.fromEntries(
      DICE_COLORS.map(color => [color, 0])
    ) as Record<DiceColor, number>;

    currentDice.forEach(d => {
      counts[d.color]++;
    });

    const keyParts = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => colorOrder[a[0] as DiceColor] - colorOrder[b[0] as DiceColor])
      .map(([color, count]) => `${color}:${count}`);

    const key = keyParts.join(',');

    const sortedColors = [...currentDice]
      .sort((a, b) => colorOrder[a.color] - colorOrder[b.color])
      .map(d => d.color);

    const now = Date.now();

    setRecentPools(prev => {
      const newPool: RecentPool = {
        id: key,
        colors: sortedColors,
        lastUsed: now,
      };

      if (prev.findIndex(p => p.id === key) !== -1) {
        const poolsCopy = [...prev];
        const existingIndex = prev.findIndex(p => p.id === key);
        poolsCopy[existingIndex] = {
          ...poolsCopy[existingIndex],
          lastUsed: now,
        };
        return poolsCopy;
      }

      if (prev.length < 5) {
        return [...prev, newPool];
      }

      let replaceIndex = prev.length - 1;
      let oldestTime = prev[replaceIndex].lastUsed;

      for (let i = 0; i < prev.length; i++) {
        if (prev[i].lastUsed < oldestTime) {
          oldestTime = prev[i].lastUsed;
          replaceIndex = i;
        }
      }

      const poolsCopy = [...prev];
      poolsCopy[replaceIndex] = newPool;
      return poolsCopy;
    });
  };

  const loadRecent = (pool: RecentPool) => {
    if (isRollingAll) return;

    const startId = nextIdRef.current;
    const newDice: Dice[] = pool.colors.map((color, index) => ({
      id: startId + index,
      color,
      value: null,
      isAnimating: false
    }));

    nextIdRef.current += pool.colors.length;

    setDicePool(newDice);
    
    setTimeout(() => {
      rollAll();
    }, 100);
  };

  const sortedDicePool = useMemo(() => {
    return [...dicePool].sort((a, b) => colorOrder[a.color] - colorOrder[b.color]);
  }, [dicePool]);

  return (
    <div className="dice-app">
      <div className="selector-bar">
        <div className="color-buttons">
          {COLORS.map(color => (
            <button
              key={color}
              className={`color-btn ${color}`}
              onClick={() => addDice(color)}
            />
          ))}
        </div>
      </div>

      <div className="recent-grid">
        {recentPools.map(pool => (
          <button
            key={pool.id}
            className={`recent-pool-btn ${pressedPoolId === pool.id ? 'pressed' : ''}`}
            onClick={() => loadRecent(pool)}
            onMouseDown={() => handlePoolMouseDown(pool.id)}
            onMouseUp={handlePoolMouseUp}
            onMouseLeave={handlePoolMouseLeave}
            onTouchStart={() => handlePoolMouseDown(pool.id)}
            onTouchEnd={handlePoolMouseUp}
          >
            <div className="pool-dots">
              {pool.colors.map((color, idx) => (
                <div
                  key={`${color}-${idx}`}
                  className={`dot ${color}`}
                />
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="dice-pool">
        {dicePool.length === 0 ? (
          <div className="empty-message"></div>
        ) : (
          sortedDicePool.map(dice => (
            <div
              key={dice.id}
              className={`dice ${dice.color} ${dice.isAnimating ? 'rolling' : ''} ${pressedDiceId === dice.id ? 'pressed' : ''}`}
              onClick={() => rerollSingle(dice.id)}
              onMouseDown={() => !dice.isAnimating && handleDiceMouseDown(dice.id)}
              onMouseUp={handleDiceMouseUp}
              onMouseLeave={handleDiceMouseLeave}
              onTouchStart={() => !dice.isAnimating && handleDiceMouseDown(dice.id)}
              onTouchEnd={handleDiceMouseUp}
              onContextMenu={handleDiceContextMenu}
            >
              {dice.value !== null ? (
                <img 
                  src={`${import.meta.env.BASE_URL}img/${dice.color}${dice.value}.png`}
                />
              ) : (
                <span className="question-mark">?</span>
              )}
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
            🎲
          </button>
          <button
            className="clear-button"
            onClick={() => setDicePool([])}
            disabled={isRollingAll}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}