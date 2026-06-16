import type { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";

import { PressableScale } from "@/components/animated-primitives";

export const AppColors = {
  green: "#2E7D5B",
  darkGreen: "#25684C",
  amber: "#F59E0B",
  background: "#FAF7F0",
  text: "#1F2933",
  muted: "#64748B",
  card: "#FFFFFF",
};

const brandSymbol = require("../assets/images/brand-symbol.png");

type AppHeroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  showLogo?: boolean;
  onBack?: () => void;
  backLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppHero({
  eyebrow,
  title,
  description,
  children,
  showLogo = true,
  onBack,
  backLabel = "Geri",
  style,
}: AppHeroProps) {
  return (
    <View style={[styles.hero, style]}>
      <View style={styles.heroTopRow}>
        {showLogo ? (
          <View style={styles.logoBox}>
            <Image source={brandSymbol} style={styles.logoImage} contentFit="contain" />
          </View>
        ) : null}

        {onBack ? (
          <PressableScale style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>{"<"} {backLabel}</Text>
          </PressableScale>
        ) : null}
      </View>

      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      {description ? <Text style={styles.heroDescription}>{description}</Text> : null}
      {children ? <View style={styles.heroChildren}>{children}</View> : null}
    </View>
  );
}

type AppCardProps = {
  children: ReactNode;
  tone?: "default" | "soft" | "amber" | "danger";
  style?: StyleProp<ViewStyle>;
};

export function AppCard({ children, tone = "default", style }: AppCardProps) {
  return <View style={[styles.card, toneStyles[tone], style]}>{children}</View>;
}

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "amber";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      style={[
        styles.button,
        buttonStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? AppColors.green : "#fff"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "outline" && styles.outlineButtonText,
          ]}
        >
          {label}
        </Text>
      )}
    </PressableScale>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={AppColors.green} size="large" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <AppCard tone="danger" style={styles.statusCard}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorText}>{message}</Text>
    </AppCard>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AppCard style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} style={styles.emptyButton} />
      ) : null}
    </AppCard>
  );
}

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: AppColors.card,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.1)",
  },
  amber: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  danger: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
});

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: AppColors.green },
  secondary: { backgroundColor: AppColors.darkGreen },
  amber: { backgroundColor: AppColors.amber },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.2)",
  },
});

const styles = StyleSheet.create({
  hero: {
    borderRadius: 30,
    backgroundColor: AppColors.green,
    padding: 22,
    shadowColor: AppColors.green,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  heroTopRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: 54, height: 54 },
  backButton: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  eyebrow: {
    marginTop: 18,
    color: "#F5EBDD",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  heroTitle: {
    marginTop: 12,
    color: "#fff",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  heroDescription: {
    marginTop: 7,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  heroChildren: { marginTop: 15 },
  card: {
    marginTop: 16,
    borderRadius: 28,
    padding: 18,
  },
  button: {
    marginTop: 14,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  outlineButtonText: { color: AppColors.darkGreen },
  disabled: { opacity: 0.7 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.background,
  },
  loadingText: { marginTop: 10, color: AppColors.muted, fontWeight: "800" },
  statusCard: { marginTop: 14 },
  errorTitle: { color: "#B91C1C", fontSize: 15, fontWeight: "900" },
  errorText: {
    marginTop: 4,
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  emptyCard: { alignItems: "center" },
  emptyTitle: { color: AppColors.text, fontSize: 20, fontWeight: "900" },
  emptyText: {
    marginTop: 6,
    color: AppColors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  emptyButton: { alignSelf: "stretch" },
});
