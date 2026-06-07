/**
 * AnimatedGradientBackground.tsx
 *
 * Gradient background with floating emoji particles instead of blobs.
 * Emojis drift slowly upward with gentle rotation and fade.
 */

import { LinearGradient } from "expo-linear-gradient";
import React, { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

// Word-game themed emojis that float in the background
const FLOATING_EMOJIS = [
  { emoji: "🧩", size: 28, startX: width * 0.08,  delay: 0 },
  { emoji: "📚", size: 22, startX: width * 0.22,  delay: 600 },
  { emoji: "✏️", size: 24, startX: width * 0.55,  delay: 1200 },
  { emoji: "🔤", size: 26, startX: width * 0.75,  delay: 300 },
  { emoji: "💡", size: 20, startX: width * 0.38,  delay: 900 },
  { emoji: "🏆", size: 24, startX: width * 0.88,  delay: 1500 },
  { emoji: "⭐", size: 18, startX: width * 0.15,  delay: 1800 },
  { emoji: "🎯", size: 22, startX: width * 0.65,  delay: 400 },
  { emoji: "🔑", size: 20, startX: width * 0.44,  delay: 2000 },
  { emoji: "📝", size: 22, startX: width * 0.92,  delay: 700 },
];

function FloatingEmoji({
  emoji,
  size,
  startX,
  delay,
}: {
  emoji: string;
  size: number;
  startX: number;
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(height + 50)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 12000 + Math.random() * 6000; // 12–18s per cycle

    const loop = Animated.loop(
      Animated.sequence([
        // Wait before starting (stagger)
        Animated.delay(delay),
        // Rise from bottom to top, fade in then out
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -80,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.55, duration: duration * 0.15, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.45, duration: duration * 0.70, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,    duration: duration * 0.15, useNativeDriver: true }),
          ]),
          Animated.timing(rotate, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
        ]),
        // Reset instantly
        Animated.parallel([
          Animated.timing(translateY, { toValue: height + 50, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0,            duration: 0, useNativeDriver: true }),
          Animated.timing(rotate,     { toValue: 0,            duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, []);

  const spin = rotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ["-15deg", "15deg"],
  });

  return (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: "absolute",
        left: startX,
        fontSize: size,
        opacity,
        transform: [{ translateY }, { rotate: spin }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

export default function AnimatedGradientBackground({ children }: PropsWithChildren) {
  return (
    <View style={styles.root}>
      {/* Base gradient — same as original */}
      <LinearGradient
        colors={["#071B3D", "#0D6E75", "#F59E0B"]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating emoji particles */}
      {FLOATING_EMOJIS.map((item, i) => (
        <FloatingEmoji key={i} {...item} />
      ))}

      {/* Subtle dark scrim so form text is legible */}
      <View style={styles.scrim} />

      {/* Page content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 13, 32, 0.28)",
  },
  content: {
    flex: 1,
  },
});
