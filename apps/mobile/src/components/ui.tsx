import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState, type PropsWithChildren, type ReactElement } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  MD3Duration,
  MD3Easing,
  MD3Elevation,
  MD3Shape,
  MD3Spring,
  MD3Typography,
  useAppColors,
  useAppTheme,
} from "@/constants/theme";
import { useAppStore } from "@/store/app-store";

/* ==========================================================================
   Screen & App Bar
   ========================================================================== */

export function AppScreen({
  title,
  subtitle,
  leading,
  action,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  leading?: ReactElement | null;
  action?: ReactElement | null;
}>) {
  const colors = useAppColors();
  const { preference } = useAppTheme();
  const { ready, error, notice, clearNotice, updateTheme } = useAppStore();
  const nextTheme = preference === "system" ? "light" : preference === "light" ? "dark" : "system";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <View style={styles.topAppBar}>
          {leading as any}
          <View style={styles.topAppBarCopy}>
            <Text style={[styles.appBarTitle, { color: colors.onSurface }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.appBarSubtitle, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action as any}
          <IconButton
            icon={preference === "dark" ? "moon" : preference === "light" ? "sunny" : "contrast"}
            label={`切换主题，当前：${preference === "system" ? "跟随系统" : preference === "light" ? "浅色" : "深色"}`}
            onPress={() => updateTheme(nextTheme)}
            variant="tonal"
          />
        </View>

        {error ? <Banner text={error} danger /> : null}
        {notice ? <Banner text={notice} onClose={clearNotice} /> : null}

        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>正在读取本地数据…</Text>
          </View>
        ) : (
          <>{children as ReactElement | ReactElement[] | null}</>
        )}
      </SafeAreaView>
    </View>
  );
}

export function PageScroll({
  children,
  scrollEnabled = true,
}: PropsWithChildren<{ scrollEnabled?: boolean }>) {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      scrollEnabled={scrollEnabled}
    >
      {children as any}
    </ScrollView>
  );
}

/* ==========================================================================
   Banner / Alert
   ========================================================================== */

export function Banner({ text, danger, onClose }: { text: string; danger?: boolean; onClose?: () => void }) {
  const colors = useAppColors();
  const bgColor = danger ? colors.errorContainer : colors.primaryContainer;
  const textColor = danger ? colors.onErrorContainer : colors.onPrimaryContainer;
  const iconColor = textColor;

  return (
    <Pressable onPress={onClose} style={[styles.banner, { backgroundColor: bgColor }]}>
      <Ionicons name={danger ? "alert-circle" : "checkmark-circle"} size={20} color={iconColor} />
      <Text style={[styles.bannerText, { color: textColor }]}>{text}</Text>
      {onClose ? <Ionicons name="close" size={18} color={textColor} /> : null}
    </Pressable>
  );
}

/* ==========================================================================
   Cards (MD3 Elevated, Filled, Outlined)
   ========================================================================== */

/* ==========================================================================
   Motion Primitives (AnimatedPressable)
   ========================================================================== */

export function AnimatedPressable({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.965,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityState,
}: PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  scaleTo?: number;
  accessibilityRole?: "button" | "checkbox" | "radio" | "tab";
  accessibilityLabel?: string;
  accessibilityState?: { checked?: boolean; selected?: boolean };
}>) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const handlePressIn = () => {
    if (disabled) return;
    setPressed(true);
    Animated.timing(scale, {
      toValue: scaleTo,
      duration: MD3Duration.short2,
      easing: MD3Easing.standard,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    setPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      tension: MD3Spring.press.tension,
      friction: MD3Spring.press.friction,
      useNativeDriver: true,
    }).start();
  };

  const resolvedStyle = typeof style === "function" ? style({ pressed }) : style;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={resolvedStyle}
      >
        {typeof children === "function" ? (children as any)({ pressed }) : children}
      </Pressable>
    </Animated.View>
  );
}

export function Card({
  children,
  style,
  variant = "filled",
  onPress,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  variant?: "elevated" | "filled" | "outlined";
  onPress?(): void;
}>) {
  const colors = useAppColors();

  const variantStyle: ViewStyle =
    variant === "elevated"
      ? {
          backgroundColor: colors.surfaceContainerLow,
          ...MD3Elevation.level1,
        }
      : variant === "outlined"
      ? {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
        }
      : {
          backgroundColor: colors.surfaceContainer,
        };

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} scaleTo={0.98} style={[styles.card, variantStyle, style]}>
        {children as any}
      </AnimatedPressable>
    );
  }

  return <View style={[styles.card, variantStyle, style]}>{children as any}</View>;
}

/* ==========================================================================
   Buttons (MD3 Filled, Tonal, Outlined, Text, Icon)
   ========================================================================== */

export function IconButton({
  icon,
  label,
  onPress,
  danger,
  variant = "standard",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
  danger?: boolean;
  variant?: "standard" | "filled" | "tonal" | "outlined";
}) {
  const colors = useAppColors();
  const iconColor = danger ? colors.error : colors.primary;

  const containerBg =
    variant === "filled"
      ? danger
        ? colors.error
        : colors.primary
      : variant === "tonal"
      ? colors.surfaceContainerHigh
      : "transparent";

  const resolvedIconColor =
    variant === "filled" ? colors.onPrimary : iconColor;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.92}
      style={({ pressed }) => [
        styles.iconButtonWrapper,
        {
          backgroundColor: containerBg,
          borderColor: variant === "outlined" ? colors.outlineVariant : "transparent",
          borderWidth: variant === "outlined" ? 1 : 0,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={resolvedIconColor} />
    </AnimatedPressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  secondary,
  disabled,
}: {
  label: string;
  onPress(): void;
  icon?: keyof typeof Ionicons.glyphMap;
  secondary?: boolean;
  disabled?: boolean;
}) {
  if (secondary) {
    return <TonalButton label={label} onPress={onPress} icon={icon} disabled={disabled} />;
  }
  return <FilledButton label={label} onPress={onPress} icon={icon} disabled={disabled} />;
}

export function FilledButton({
  label,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  onPress(): void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const colors = useAppColors();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.965}
      style={({ pressed }) => [
        styles.md3Button,
        {
          backgroundColor: colors.primary,
          opacity: disabled ? 0.38 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.onPrimary} /> : null}
      <Text style={[styles.md3ButtonLabel, { color: colors.onPrimary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function TonalButton({
  label,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  onPress(): void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const colors = useAppColors();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.965}
      style={({ pressed }) => [
        styles.md3Button,
        {
          backgroundColor: colors.secondaryContainer,
          opacity: disabled ? 0.38 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.onSecondaryContainer} /> : null}
      <Text style={[styles.md3ButtonLabel, { color: colors.onSecondaryContainer }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function OutlinedButton({
  label,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  onPress(): void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const colors = useAppColors();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.965}
      style={({ pressed }) => [
        styles.md3Button,
        {
          backgroundColor: "transparent",
          borderColor: colors.outlineVariant,
          borderWidth: 1,
          opacity: disabled ? 0.38 : pressed ? 0.88 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
      <Text style={[styles.md3ButtonLabel, { color: colors.primary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function TextButton({
  label,
  onPress,
  icon,
  disabled,
  danger,
}: {
  label: string;
  onPress(): void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  danger?: boolean;
}) {
  const colors = useAppColors();
  const textColor = danger ? colors.error : colors.primary;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.96}
      style={({ pressed }) => [
        styles.textButton,
        {
          backgroundColor: pressed ? `${textColor}12` : "transparent",
          opacity: disabled ? 0.38 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
      <Text style={[styles.md3ButtonLabel, { color: textColor }]}>{label}</Text>
    </AnimatedPressable>
  );
}

/* ==========================================================================
   Floating Action Button (FAB & Extended FAB)
   ========================================================================== */

export function FAB({
  icon,
  label,
  onPress,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useAppColors();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.93}
      style={({ pressed }) => [
        styles.fab,
        MD3Elevation.level3,
        {
          backgroundColor: colors.primaryContainer,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={24} color={colors.onPrimaryContainer} />
    </AnimatedPressable>
  );
}

export function ExtendedFAB({
  icon,
  label,
  onPress,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useAppColors();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.94}
      style={({ pressed }) => [
        styles.extendedFab,
        MD3Elevation.level3,
        {
          backgroundColor: colors.primaryContainer,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.onPrimaryContainer} />
      <Text style={[styles.extendedFabLabel, { color: colors.onPrimaryContainer }]}>{label}</Text>
    </AnimatedPressable>
  );
}

/* ==========================================================================
   Selection Controls (Checkbox & Radio)
   ========================================================================== */

export function MD3Checkbox({
  checked,
  onPress,
  disabled,
  color,
}: {
  checked: boolean;
  onPress?(): void;
  disabled?: boolean;
  color?: string;
}) {
  const colors = useAppColors();
  const activeColor = color ?? colors.primary;

  const scale = useRef(new Animated.Value(checked ? 1 : 0.8)).current;
  const checkOpacity = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    if (checked) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: MD3Spring.pop.tension,
          friction: MD3Spring.pop.friction,
          useNativeDriver: true,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: MD3Duration.short3,
          easing: MD3Easing.standardDecelerate,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.8,
          duration: MD3Duration.short2,
          easing: MD3Easing.standardAccelerate,
          useNativeDriver: true,
        }),
        Animated.timing(checkOpacity, {
          toValue: 0,
          duration: MD3Duration.short2,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [checked]);

  return (
    <AnimatedPressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.92}
      style={styles.checkboxTouch}
    >
      <View
        style={[
          styles.checkboxBox,
          checked
            ? { backgroundColor: activeColor, borderColor: activeColor }
            : { backgroundColor: "transparent", borderColor: colors.outline, borderWidth: 2 },
          disabled && { opacity: 0.38 },
        ]}
      >
        <Animated.View style={{ opacity: checkOpacity, transform: [{ scale }] }}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
}

export function MD3Radio({
  selected,
  onPress,
  disabled,
  color,
}: {
  selected: boolean;
  onPress?(): void;
  disabled?: boolean;
  color?: string;
}) {
  const colors = useAppColors();
  const activeColor = color ?? colors.primary;

  const dotScale = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    if (selected) {
      Animated.spring(dotScale, {
        toValue: 1,
        tension: MD3Spring.pop.tension,
        friction: MD3Spring.pop.friction,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(dotScale, {
        toValue: 0,
        duration: MD3Duration.short2,
        easing: MD3Easing.standardAccelerate,
        useNativeDriver: true,
      }).start();
    }
  }, [selected]);

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.92}
      style={styles.radioTouch}
    >
      <View
        style={[
          styles.radioOuter,
          { borderColor: selected ? activeColor : colors.outline },
          disabled && { opacity: 0.38 },
        ]}
      >
        <Animated.View
          style={[
            styles.radioInner,
            { backgroundColor: activeColor, transform: [{ scale: dotScale }] },
          ]}
        />
      </View>
    </AnimatedPressable>
  );
}

/* ==========================================================================
   Chips (Assist, Filter)
   ========================================================================== */

export function AssistChip({
  label,
  icon,
  onPress,
  color,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?(): void;
  color?: string;
}) {
  const colors = useAppColors();
  const Content = (
    <View
      style={[
        styles.chip,
        {
          borderColor: colors.outlineVariant,
          backgroundColor: color ? `${color}14` : "transparent",
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={color ?? colors.onSurfaceVariant} /> : null}
      <Text style={[styles.chipLabel, { color: color ?? colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} scaleTo={0.96}>
        {Content}
      </AnimatedPressable>
    );
  }
  return Content;
}

export function FilterChip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useAppColors();
  const iconScale = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(iconScale, {
      toValue: selected ? 1 : 0,
      tension: MD3Spring.pop.tension,
      friction: MD3Spring.pop.friction,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      scaleTo={0.96}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.secondaryContainer : "transparent",
          borderColor: selected ? colors.secondaryContainer : colors.outlineVariant,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {selected ? (
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons name="checkmark" size={15} color={colors.onSecondaryContainer} />
        </Animated.View>
      ) : icon ? (
        <Ionicons name={icon} size={15} color={colors.onSurfaceVariant} />
      ) : null}
      <Text
        style={[
          styles.chipLabel,
          {
            color: selected ? colors.onSecondaryContainer : colors.onSurfaceVariant,
            fontWeight: selected ? "600" : "500",
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/* ==========================================================================
   Empty State
   ========================================================================== */

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  const colors = useAppColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name={icon} size={32} color={colors.onPrimaryContainer} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.onSurfaceVariant }]}>{description}</Text>
    </View>
  );
}

/* ==========================================================================
   Bottom Sheet (MD3 FormModal)
   ========================================================================== */

export function FormModal({
  visible,
  title,
  onClose,
  onSubmit,
  submitLabel = "保存",
  children,
  canSubmit = true,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose(): void;
  onSubmit(): void;
  submitLabel?: string;
  canSubmit?: boolean;
}>) {
  const colors = useAppColors();
  const [renderModal, setRenderModal] = useState(visible);
  const sheetY = useRef(new Animated.Value(600)).current;
  const scrimAnim = useRef(new Animated.Value(0)).current;

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scrimAnim, {
        toValue: 0,
        duration: MD3Duration.short3,
        easing: MD3Easing.standardAccelerate,
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: 600,
        duration: MD3Duration.medium1,
        easing: MD3Easing.standardAccelerate,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRenderModal(false);
      onClose();
    });
  };

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
      sheetY.setValue(500);
      Animated.parallel([
        Animated.timing(scrimAnim, {
          toValue: 1,
          duration: MD3Duration.medium2,
          easing: MD3Easing.standardDecelerate,
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: 0,
          duration: MD3Duration.medium2,
          easing: MD3Easing.emphasizedDecelerate,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (renderModal) {
      Animated.parallel([
        Animated.timing(scrimAnim, {
          toValue: 0,
          duration: MD3Duration.short3,
          easing: MD3Easing.standardAccelerate,
          useNativeDriver: true,
        }),
        Animated.timing(sheetY, {
          toValue: 600,
          duration: MD3Duration.medium1,
          easing: MD3Easing.standardAccelerate,
          useNativeDriver: true,
        }),
      ]).start(() => setRenderModal(false));
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 4,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          sheetY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 120 || gesture.vy > 0.5) {
          handleDismiss();
        } else {
          Animated.spring(sheetY, {
            toValue: 0,
            tension: MD3Spring.sheet.tension,
            friction: MD3Spring.sheet.friction,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!renderModal) return null;

  return (
    <Modal visible={renderModal} animationType="none" transparent onRequestClose={handleDismiss}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.42)",
              opacity: scrimAnim,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.surfaceContainerLow,
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <SafeAreaView edges={["bottom"]}>
            <View {...panResponder.panHandlers} style={styles.dragHandleWrap}>
              <View style={[styles.dragHandle, { backgroundColor: colors.outlineVariant }]} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>{title}</Text>
              <IconButton icon="close" label="关闭" onPress={handleDismiss} variant="standard" />
            </View>
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
            >
              {children as any}
            </ScrollView>
            <View style={styles.modalFooter}>
              <FilledButton label={submitLabel} onPress={onSubmit} disabled={!canSubmit} />
            </View>
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ==========================================================================
   Text Fields (Outlined & Search)
   ========================================================================== */

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText(value: string): void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const colors = useAppColors();
  const [focused, setFocused] = useState(false);
  const focusProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusProgress, {
      toValue: focused ? 1 : 0,
      duration: focused ? 180 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focusProgress, focused]);

  return (
    <View style={styles.fieldWrap}>
      <View
        style={[
          styles.fieldOutline,
          multiline && styles.multilineOutline,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.focusedFieldOutline,
            multiline && styles.multilineOutline,
            { borderColor: colors.primary, opacity: focusProgress },
          ]}
        />
        <Text
          style={[
            styles.floatingLabel,
            {
              color: focused ? colors.primary : colors.onSurfaceVariant,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {label}
        </Text>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          multiline={multiline}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          style={[styles.fieldInput, multiline && styles.multilineInput, { color: colors.onSurface }]}
        />
      </View>
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText(value: string): void;
  placeholder: string;
}) {
  const colors = useAppColors();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.searchBar,
        {
          backgroundColor: colors.surfaceContainerHigh,
        },
      ]}
    >
      <Ionicons name="search" size={20} color={focused ? colors.primary : colors.onSurfaceVariant} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        style={[styles.searchInput, { color: colors.onSurface }]}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText("")}
          accessibilityRole="button"
          accessibilityLabel="清除搜索"
          style={styles.clearSearch}
        >
          <Ionicons name="close-circle" size={19} color={colors.onSurfaceVariant} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ==========================================================================
   Choice Row & Segmented Control
   ========================================================================== */

export function ChoiceRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; color?: string }[];
  value: string;
  onChange(value: string): void;
}) {
  const colors = useAppColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <AnimatedPressable
              key={option.value}
              onPress={() => onChange(option.value)}
              scaleTo={0.95}
              style={[
                styles.choiceChip,
                {
                  backgroundColor: active ? colors.secondaryContainer : colors.surface,
                  borderColor: active ? colors.secondaryContainer : colors.outlineVariant,
                },
              ]}
            >
              {option.color ? <View style={[styles.colorDot, { backgroundColor: option.color }]} /> : null}
              {active ? <Ionicons name="checkmark" size={15} color={colors.onSecondaryContainer} /> : null}
              <Text
                style={{
                  color: active ? colors.onSecondaryContainer : colors.onSurfaceVariant,
                  fontWeight: active ? "600" : "500",
                  fontSize: 13,
                }}
              >
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: string;
  onChange(value: string): void;
}) {
  const colors = useAppColors();
  const [containerWidth, setContainerWidth] = useState(0);

  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );

  const pillTranslateX = useRef(new Animated.Value(0)).current;
  const segmentWidth = containerWidth > 0 ? (containerWidth - 6) / options.length : 0;

  useEffect(() => {
    if (segmentWidth > 0) {
      Animated.spring(pillTranslateX, {
        toValue: selectedIndex * segmentWidth,
        tension: MD3Spring.pill.tension,
        friction: MD3Spring.pill.friction,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedIndex, segmentWidth]);

  return (
    <View
      style={[styles.segmented, { borderColor: colors.outlineVariant }]}
      accessibilityRole="tablist"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.segmentPill,
            {
              width: segmentWidth,
              backgroundColor: colors.secondaryContainer,
              transform: [{ translateX: pillTranslateX }],
            },
          ]}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={styles.segment}
          >
            {selected ? (
              <Ionicons name="checkmark" size={15} color={colors.onSecondaryContainer} />
            ) : option.icon ? (
              <Ionicons name={option.icon} size={15} color={colors.onSurfaceVariant} />
            ) : null}
            <Text
              style={{
                color: selected ? colors.onSecondaryContainer : colors.onSurface,
                fontWeight: selected ? "600" : "500",
                fontSize: 12,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ==========================================================================
   Progress (Linear Progress)
   ========================================================================== */

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const colors = useAppColors();
  const normalized = Math.min(100, Math.max(0, value));
  const animatedWidth = useRef(new Animated.Value(normalized)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: normalized,
      duration: MD3Duration.medium2,
      easing: MD3Easing.standardDecelerate,
      useNativeDriver: false,
    }).start();
  }, [normalized]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHighest }]}>
      <Animated.View
        style={[
          styles.progressFill,
          { width: widthInterpolation, backgroundColor: color ?? colors.primary },
        ]}
      />
    </View>
  );
}

export const LinearProgress = ProgressBar;

/* ==========================================================================
   Styles
   ========================================================================== */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },

  // Top App Bar
  topAppBar: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 60,
  },
  topAppBarCopy: { flex: 1 },
  appBarTitle: { ...MD3Typography.headlineSmall, letterSpacing: -0.2 },
  appBarSubtitle: { ...MD3Typography.bodySmall, marginTop: 1 },

  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    gap: 12,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { ...MD3Typography.bodyMedium },

  banner: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: MD3Shape.medium,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerText: { flex: 1, ...MD3Typography.bodySmall, lineHeight: 18 },

  // Card
  card: {
    borderRadius: MD3Shape.medium,
    padding: 16,
  },

  // Icon Button
  iconButtonWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // MD3 Buttons
  md3Button: {
    minHeight: 40,
    borderRadius: MD3Shape.full,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  md3ButtonLabel: {
    ...MD3Typography.labelLarge,
    fontWeight: "600",
  },
  textButton: {
    minHeight: 40,
    borderRadius: MD3Shape.full,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  // FAB
  fab: {
    width: 56,
    height: 56,
    borderRadius: MD3Shape.large,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 16,
    bottom: 20,
    zIndex: 10,
  },
  extendedFab: {
    minHeight: 56,
    borderRadius: MD3Shape.large,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    position: "absolute",
    right: 16,
    bottom: 20,
    zIndex: 10,
  },
  extendedFabLabel: {
    ...MD3Typography.labelLarge,
    fontWeight: "600",
  },

  // Selection Controls
  checkboxTouch: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: MD3Shape.extraSmall / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioTouch: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Chips
  chip: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: MD3Shape.small,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipLabel: {
    ...MD3Typography.labelMedium,
  },

  // Empty State
  empty: { paddingVertical: 56, paddingHorizontal: 24, alignItems: "center" },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: MD3Shape.large,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { ...MD3Typography.titleMedium, fontWeight: "600" },
  emptyDescription: { ...MD3Typography.bodyMedium, textAlign: "center", lineHeight: 20, marginTop: 8 },

  // Bottom Sheet (Modal)
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.38)", justifyContent: "flex-end" },
  modalSheet: {
    height: "90%",
    maxHeight: "90%",
    borderTopLeftRadius: MD3Shape.extraLarge,
    borderTopRightRadius: MD3Shape.extraLarge,
  },
  dragHandleWrap: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { ...MD3Typography.titleLarge },
  formScroll: { flex: 1 },
  form: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  modalFooter: { paddingHorizontal: 20, paddingVertical: 14 },

  // Fields
  fieldWrap: { paddingTop: 6 },
  fieldLabel: { ...MD3Typography.labelMedium, marginBottom: 6 },
  fieldOutline: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: MD3Shape.small,
    justifyContent: "center",
  },
  focusedFieldOutline: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "none",
    zIndex: 1,
    borderWidth: 2,
    borderRadius: MD3Shape.small,
  },
  multilineOutline: { minHeight: 104, justifyContent: "flex-start" },
  floatingLabel: {
    position: "absolute",
    zIndex: 2,
    top: -9,
    left: 10,
    paddingHorizontal: 4,
    ...MD3Typography.bodySmall,
    fontWeight: "500",
  },
  fieldInput: { zIndex: 2, minHeight: 52, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16 },
  multilineInput: { minHeight: 100, paddingTop: 14, textAlignVertical: "top" },

  // Search Bar
  searchBar: {
    height: 56,
    borderRadius: MD3Shape.extraLarge,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchInput: { flex: 1, height: "100%", fontSize: 16 },
  clearSearch: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  // Choices & Segmented
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: MD3Shape.small,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },

  segmented: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: MD3Shape.full,
    flexDirection: "row",
    position: "relative",
    padding: 3,
  },
  segmentPill: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: MD3Shape.full,
  },
  segment: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: MD3Shape.full,
    zIndex: 1,
  },

  // Progress Bar
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
});

