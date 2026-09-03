import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AppScreen,
  AssistChip,
  Card,
  EmptyState,
  IconButton,
  MD3Checkbox,
  PageScroll,
} from "@/components/ui";
import { MD3Shape, MD3Typography, useAppColors } from "@/constants/theme";
import { useAppStore } from "@/store/app-store";

export default function InboxScreen() {
  const colors = useAppColors();
  const { state, addInbox, toggleInbox, removeInbox } = useAppStore();
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<"todo" | "note">("todo");
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusProgress = useRef(new Animated.Value(0)).current;
  const noteExpanded = kind === "note" && inputFocused;

  useEffect(() => {
    Animated.timing(focusProgress, {
      toValue: inputFocused ? 1 : 0,
      duration: inputFocused ? 180 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focusProgress, inputFocused]);

  const submit = () => {
    if (!content.trim()) return;
    addInbox(kind, content);
    setContent("");
    Keyboard.dismiss();
  };

  const toggleKind = () => {
    const nextKind = kind === "todo" ? "note" : "todo";
    setKind(nextKind);
    if (nextKind === "note") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const pendingCount = state.inboxItems.filter((item) => !item.done).length;

  return (
    <AppScreen title="收件箱" subtitle={`${pendingCount} 条待整理`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        style={styles.content}
      >
        <View style={[styles.composerWrap, noteExpanded && styles.expandedComposerWrap]}>
          <View
            style={[
              styles.composer,
              noteExpanded && styles.expandedComposer,
              { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
            ]}
          >
            <Animated.View
              style={[
                styles.composerFocusOutline,
                noteExpanded && styles.expandedComposerFocusOutline,
                { borderColor: colors.primary, opacity: focusProgress },
              ]}
            />
            <Pressable onPress={toggleKind} accessibilityLabel="切换记录类型" style={styles.kindButton}>
              <Ionicons
                name={kind === "todo" ? "checkbox" : "document-text"}
                size={22}
                color={colors.primary}
              />
            </Pressable>
            <TextInput
              ref={inputRef}
              accessibilityLabel={kind === "todo" ? "待办内容" : "备忘内容"}
              value={content}
              onChangeText={setContent}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={kind === "todo" ? submit : undefined}
              placeholder={kind === "todo" ? "快速添加待办…" : "记录一条备忘…"}
              placeholderTextColor={colors.onSurfaceVariant}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              multiline={kind === "note"}
              scrollEnabled={noteExpanded}
              textAlignVertical={kind === "note" ? "top" : "center"}
              style={[styles.input, noteExpanded && styles.expandedInput, { color: colors.onSurface }]}
              returnKeyType={kind === "todo" ? "done" : "default"}
            />
            <View style={noteExpanded ? styles.submitDock : undefined}>
              <IconButton icon="arrow-up" label="添加" onPress={submit} variant="filled" />
            </View>
          </View>
          {!noteExpanded ? (
            <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>点击左侧图标切换待办 / 备忘</Text>
          ) : null}
        </View>

        {!noteExpanded ? (
          <PageScroll>
            {state.inboxItems.length === 0 ? (
              <EmptyState
                icon="file-tray-outline"
                title="收件箱是空的"
                description="把脑海里的事先记下来，之后再慢慢整理。"
              />
            ) : (
              state.inboxItems.map((item) => (
                <Card key={item.id} variant="elevated" style={styles.itemCard}>
                  {item.kind === "todo" ? (
                    <MD3Checkbox
                      checked={item.done}
                      onPress={() => toggleInbox(item.id, !item.done)}
                    />
                  ) : (
                    <View style={styles.noteIconWrap}>
                      <Ionicons name="document-text" size={20} color={colors.secondary} />
                    </View>
                  )}
                  <View style={styles.itemCopy}>
                    <Text
                      style={[
                        styles.itemText,
                        {
                          color: colors.onSurface,
                          textDecorationLine: item.done ? "line-through" : "none",
                          opacity: item.done ? 0.55 : 1,
                        },
                      ]}
                    >
                      {item.content}
                    </Text>
                    <View style={styles.metaRow}>
                      <AssistChip
                        label={item.kind === "note" ? "备忘" : item.done ? "已完成" : "待办"}
                        color={item.done ? colors.success : undefined}
                      />
                    </View>
                  </View>
                  <IconButton
                    icon="trash-outline"
                    label="删除"
                    onPress={() => removeInbox(item.id)}
                    danger
                    variant="standard"
                  />
                </Card>
              ))
            )}
          </PageScroll>
        ) : null}
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  composerWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  expandedComposerWrap: { flex: 1, paddingBottom: 0 },
  composer: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: MD3Shape.large,
    paddingLeft: 12,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  composerFocusOutline: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "none",
    borderWidth: 2,
    borderRadius: MD3Shape.large,
  },
  expandedComposer: {
    flex: 1,
    alignItems: "flex-start",
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  kindButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedComposerFocusOutline: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 52,
    paddingVertical: 0,
  },
  expandedInput: {
    alignSelf: "stretch",
    minHeight: 0,
    paddingTop: 8,
  },
  submitDock: { alignSelf: "flex-end" },
  hint: {
    ...MD3Typography.bodySmall,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 6,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: MD3Shape.medium,
  },
  noteIconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: { flex: 1, gap: 4 },
  itemText: {
    ...MD3Typography.bodyLarge,
    fontWeight: "500",
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
});
