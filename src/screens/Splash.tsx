import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

type Props = {
  onAnimationComplete?: () => void;
};

// Slowly floating background element for premium parallax ambiance
function FloatingElement({
  emoji,
  delay,
  startX,
  startY,
}: {
  emoji: string;
  delay: number;
  startX: number;
  startY: number;
}) {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.12, { duration: 600 }));
    scale.value = withDelay(delay, withSpring(1));

    // Slow horizontal/vertical floating loops
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-12, { duration: 2500 }),
          withTiming(12, { duration: 2500 })
        ),
        -1,
        true
      )
    );

    rotate.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 3000 }),
          withTiming(8, { duration: 3000 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.Text
      style={[styles.floatingEmoji, { left: startX, top: startY }, animatedStyle]}
    >
      {emoji}
    </Animated.Text>
  );
}

// Letter Tile dropping snappily
function Tile({ letter, delay }: { letter: string; delay: number }) {
  const scale = useSharedValue(0);
  const y = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 250 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 90 }));
    y.value = withDelay(delay, withSpring(0, { damping: 10, stiffness: 90 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.tile, style]}>
      <Text style={styles.tileText}>{letter}</Text>
    </Animated.View>
  );
}

// Explosive star sparkle that bursts out from center
function Sparkle({ delay, angle }: { delay: number; angle: number }) {
  const distance = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 500 }))
    );
    distance.value = withDelay(delay, withTiming(85, { duration: 550 }));
    scale.value = withDelay(delay, withTiming(1.3, { duration: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const rad = (angle * Math.PI) / 180;
    const tx = Math.cos(rad) * distance.value;
    const ty = Math.sin(rad) * distance.value;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.Text style={[styles.sparkle, animatedStyle]}>
      ✨
    </Animated.Text>
  );
}

export default function SplashScreen({ onAnimationComplete }: Props) {
  const clueOpacity = useSharedValue(0);
  const xpOpacity = useSharedValue(0);
  const xpScale = useSharedValue(0.3);
  const taglineOpacity = useSharedValue(0);

  const word1 = ["W", "O", "R", "D"];
  const word2 = ["W", "A", "L", "A"];
  const sparkleAngles = [0, 60, 120, 180, 240, 300];

  useEffect(() => {
    clueOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));

    // XP Pop-up scale & opacity springs
    xpOpacity.value = withDelay(1550, withTiming(1, { duration: 300 }));
    xpScale.value = withDelay(1550, withSpring(1, { damping: 9, stiffness: 100 }));

    taglineOpacity.value = withDelay(2100, withTiming(1, { duration: 500 }));

    const t = setTimeout(() => {
      onAnimationComplete?.();
    }, 3600);

    return () => clearTimeout(t);
  }, []);

  const clueStyle = useAnimatedStyle(() => ({ opacity: clueOpacity.value }));

  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ scale: xpScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <LinearGradient colors={["#031120", "#0b203a", "#031120"]} style={styles.container}>
      {/* Hanging Monkey Lottie Animation */}
      <View style={styles.monkeyContainer}>
        <LottieView
          source={require("@/assets/lottie/HangingMonkey.json")}
          autoPlay
          loop
          style={styles.monkeyLottie}
        />
      </View>

      {/* Background Parallax Category Emojis (Nature, Animals, Desi Life) */}
      <FloatingElement emoji="🦁" delay={0} startX={40} startY={80} />
      <FloatingElement emoji="🦚" delay={150} startX={width - 80} startY={140} />
      <FloatingElement emoji="🍎" delay={300} startX={30} startY={height - 240} />
      <FloatingElement emoji="🪔" delay={450} startX={width - 70} startY={height - 300} />
      <FloatingElement emoji="🚗" delay={100} startX={width / 2 - 120} startY={height / 2 - 160} />
      <FloatingElement emoji="🏏" delay={250} startX={width / 2 + 80} startY={height / 2 + 150} />

      {/* Clue/Hint Question */}
      <Animated.Text style={[styles.clue, clueStyle]}>
        Hint: "Every morning you want to drink.... ☕"
      </Animated.Text>

      {/* Letter Grid Container (SHABD & KHEL stacked) */}
      <View style={styles.logoContainer}>
        {/* Row 1: SHABD */}
        <View style={styles.row}>
          {word1.map((l, i) => (
            <Tile key={`w1_${i}`} letter={l} delay={600 + i * 85} />
          ))}
        </View>

        {/* Row 2: KHEL */}
        <View style={[styles.row, { marginTop: 12 }]}>
          {word2.map((l, i) => (
            <Tile key={`w2_${i}`} letter={l} delay={600 + (word1.length + i) * 85} />
          ))}
        </View>

        {/* Sparkle explosion emitting from the center of the tiles */}
        <View style={styles.explosionCenter}>
          {sparkleAngles.map((angle, idx) => (
            <Sparkle key={idx} delay={1500} angle={angle} />
          ))}
        </View>
      </View>

      {/* Correct XP Award Pop-up */}
      <Animated.Text style={[styles.xp, xpStyle]}>
        +100 XP 🎉
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, taglineStyle]}>
        READ CLUE • MAKE WORD
      </Animated.Text>

      <Text style={styles.loading}>UNSCRAMBLING WORDS...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    position: "relative",
  },
  monkeyContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 460,
    height: 460,
    zIndex: 10,
  },
  monkeyLottie: {
    width: "100%",
    height: "100%",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  floatingEmoji: {
    position: "absolute",
    fontSize: 28,
    zIndex: 0,
  },
  clue: {
    color: "#ffd166",
    fontSize: 18,
    marginBottom: 40,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: width - 20,
    position: "relative",
  },
  tile: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(23, 56, 95, 0.85)",
    borderWidth: 2,
    borderColor: "#4cc9f0",
    justifyContent: "center",
    alignItems: "center",
    margin: 4,
    shadowColor: "#4cc9f0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  tileText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "Duplet-semibold",
  },
  explosionCenter: {
    position: "absolute",
    left: "50%",
    top: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  sparkle: {
    position: "absolute",
    fontSize: 20,
  },
  xp: {
    color: "#8cff66",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 30,
    textShadowColor: "rgba(140, 255, 102, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  tagline: {
    color: "#fff",
    fontSize: 14,
    letterSpacing: 3,
    marginTop: 22,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  loading: {
    position: "absolute",
    bottom: 50,
    color: "#9db4d1",
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.7,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});
