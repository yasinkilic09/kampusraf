import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { shouldShowAdsForPlan } from "@/lib/monetization";

const GREEN = "#2E7D5B";
const TEXT = "#1F2933";
const MUTED = "#64748B";

type SponsorSlotProps = {
  planType?: string | null;
  compact?: boolean;
  title?: string;
};

export function SponsorSlot({
  planType,
  compact = false,
  title = "KampusRaf sponsor alani",
}: SponsorSlotProps) {
  if (!shouldShowAdsForPlan(planType)) return null;

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={styles.topRow}>
        <Text style={styles.label}>Reklam</Text>
        <Text style={styles.adFree}>Plus ile reklamsiz</Text>
      </View>

      <View style={[styles.previewBox, compact && styles.previewBoxCompact]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          Ucretsiz planda akisi bolmeyen sponsor alanlari gosterilir. Ucretli paketlerde web ve mobil deneyim reklamsiz olur.
        </Text>
      </View>

      {!compact ? (
        <Pressable style={styles.button} onPress={() => router.push("/profile" as never)}>
          <Text style={styles.buttonText}>Paketimi Kontrol Et</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  compactCard: {
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#B45309",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  adFree: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
  },
  previewBox: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(46,125,91,0.18)",
    backgroundColor: "#FAF7F0",
    padding: 16,
  },
  previewBoxCompact: {
    padding: 14,
  },
  title: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    marginTop: 6,
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  button: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: GREEN,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
