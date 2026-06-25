import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, PanResponder, Animated, StyleSheet, Dimensions, Text } from 'react-native';
import SwipeCard from './SwipeCard';
import { BRAND } from '../lib/theme';

const { width: SW } = Dimensions.get('window');
const SWIPE_THRESHOLD = SW * 0.3;
const SWIPE_SPEED = 250;
const MAX_VISIBLE = 3;

function SwipeStack({ cards, onSwipe, myLanguage, emptyComponent }, ref) {
  const [topIndex, setTopIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SW / 2, 0, SW / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = position.x.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const superOpacity = position.y.interpolate({ inputRange: [-100, -40], outputRange: [1, 0], extrapolate: 'clamp' });

  const animateOut = useCallback((direction, onDone) => {
    const toX = direction === 'right' ? SW * 1.5 : direction === 'left' ? -SW * 1.5 : 0;
    const toY = direction === 'super' ? -SW * 1.5 : 0;
    Animated.timing(position, {
      toValue: { x: toX, y: toY },
      duration: SWIPE_SPEED,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onDone?.();
    });
  }, [position]);

  const handleSwipe = useCallback((direction) => {
    const card = cards[topIndex];
    if (!card) return;
    animateOut(direction, () => {
      setTopIndex((i) => i + 1);
      onSwipe?.(card, direction);
    });
  }, [cards, topIndex, animateOut, onSwipe]);

  useImperativeHandle(ref, () => ({
    swipeLeft: () => handleSwipe('left'),
    swipeRight: () => handleSwipe('right'),
    swipeSuper: () => handleSwipe('super'),
  }), [handleSwipe]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -SWIPE_THRESHOLD) {
          handleSwipe('super');
        } else if (g.dx > SWIPE_THRESHOLD) {
          handleSwipe('right');
        } else if (g.dx < -SWIPE_THRESHOLD) {
          handleSwipe('left');
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 5 }).start();
        }
      },
    })
  ).current;

  const remaining = cards.slice(topIndex, topIndex + MAX_VISIBLE);

  if (!remaining.length) {
    return emptyComponent || (
      <View style={s.empty}>
        <Text style={s.emptyEmoji}>🌍</Text>
        <Text style={s.emptyTitle}>No more profiles</Text>
        <Text style={s.emptySub}>Check back later for new people</Text>
      </View>
    );
  }

  return (
    <View style={s.stack}>
      {remaining.map((card, i) => {
        const reverseIndex = remaining.length - 1 - i;
        if (reverseIndex === remaining.length - 1) {
          // top card — interactive
          const animStyle = {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
            zIndex: 100,
          };
          return (
            <SwipeCard
              key={card.phone || card.id}
              profile={card}
              myLanguage={myLanguage}
              likeOpacity={likeOpacity}
              nopeOpacity={nopeOpacity}
              superOpacity={superOpacity}
              style={animStyle}
              {...panResponder.panHandlers}
            />
          );
        }
        // background cards
        const scale = 1 - reverseIndex * 0.04;
        const translateY = reverseIndex * -10;
        return (
          <SwipeCard
            key={card.phone || card.id}
            profile={card}
            myLanguage={myLanguage}
            style={{
              transform: [{ scale }, { translateY }],
              zIndex: reverseIndex,
              opacity: 0.85,
            }}
          />
        );
      })}
    </View>
  );
}

export default forwardRef(SwipeStack);

const s = StyleSheet.create({
  stack: { flex: 1, position: 'relative' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});
