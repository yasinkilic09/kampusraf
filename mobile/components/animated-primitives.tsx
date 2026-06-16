import type { ReactNode } from "react";
import type { PressableProps, StyleProp, ViewProps, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type AnimatedAppearProps = ViewProps & {
  children: ReactNode;
  delay?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedAppear({ children, delay = 0, style, ...props }: AnimatedAppearProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(420)}
      layout={Layout.springify().damping(18)}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

type PressableScaleProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PressableScale({ children, style, onPressIn, onPressOut, disabled, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(scale.value, { duration: 120 }) }],
  }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          scale.value = 0.975;
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = 1;
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
