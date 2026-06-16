import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

const brandSymbol = require("../assets/images/brand-symbol.png");

type AppLaunchScreenProps = {
  visible: boolean;
  onFinish: () => void;
};

export function AppLaunchScreen({ visible, onFinish }: AppLaunchScreenProps) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.84)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shelfWidth = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(12)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 13,
          stiffness: 120,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(shelfWidth, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(760),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 360,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      pulseLoop.stop();
      if (finished) {
        onFinish();
      }
    });

    return () => {
      pulseLoop.stop();
    };
  }, [
    containerOpacity,
    logoOpacity,
    logoScale,
    onFinish,
    pulse,
    shelfWidth,
    textOpacity,
    textTranslate,
    visible,
  ]);

  if (!visible) return null;

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 0.08],
  });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <View style={styles.glowGreen} />
      <View style={styles.glowAmber} />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.pulse,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoCard,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image source={brandSymbol} style={styles.logo} contentFit="contain" />
        </Animated.View>

        <Animated.View
          style={[styles.shelfLine, { transform: [{ scaleX: shelfWidth }] }]}
        />

        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslate }],
            },
          ]}
        >
          <Text style={styles.brandText}>
            Kampüs<Text style={styles.brandTextAmber}>Raf</Text>
          </Text>
          <Text style={styles.tagline}>Kitaplar paylaşılır, fikirler büyür.</Text>
        </Animated.View>

        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingFill,
              {
                opacity: textOpacity,
                transform: [{ scaleX: shelfWidth }],
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#FAF7F0",
  },
  glowGreen: {
    position: "absolute",
    top: -120,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(46, 125, 91, 0.12)",
  },
  glowAmber: {
    position: "absolute",
    bottom: -110,
    left: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(245, 158, 11, 0.16)",
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  pulse: {
    position: "absolute",
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: "#2E7D5B",
  },
  logoCard: {
    width: 136,
    height: 136,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 42,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  logo: {
    width: 106,
    height: 106,
  },
  shelfLine: {
    width: "72%",
    height: 8,
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: "#2E7D5B",
  },
  textBlock: {
    marginTop: 28,
    alignItems: "center",
  },
  brandText: {
    color: "#1F2933",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  brandTextAmber: {
    color: "#F59E0B",
  },
  tagline: {
    marginTop: 10,
    color: "#2E7D5B",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.8,
    textAlign: "center",
    textTransform: "uppercase",
  },
  loadingTrack: {
    width: "58%",
    height: 5,
    marginTop: 34,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46, 125, 91, 0.12)",
  },
  loadingFill: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#F59E0B",
  },
});
