import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen, Card, EmptyState, IconButton, PageScroll } from "@/components/ui";
import { useAppColors } from "@/constants/theme";
import { useAppStore } from "@/store/app-store";

export default function InboxScreen() {
  const colors = useAppColors();
  const { state, addInbox, toggleInbox, removeInbox } = useAppStore();
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<"todo" | "note">("todo");

  const submit = () => {
    if (!content.trim()) return;
    addInbox(kind, content);
    setContent("");
    Keyboard.dismiss();
  };

  return (
    <AppScreen title="收件箱" subtitle={`${state.inboxItems.filter((item) => !item.done).length} 条待整理`}>
      <View style={styles.composerWrap}>
        <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={() => setKind(kind === "todo" ? "note" : "todo")} accessibilityLabel="切换记录类型">
            <Ionicons name={kind === "todo" ? "checkbox-outline" : "document-text-outline"} size={22} color={colors.primary} />
          </Pressable>
          <TextInput
            value={content}
            onChangeText={setContent}
            onSubmitEditing={submit}
            placeholder={kind === "todo" ? "快速添加待办…" : "记录一条备忘…"}
            placeholderTextColor={colors.tabInactive}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="done"
          />
          <IconButton icon="arrow-up" label="添加" onPress={submit} />
        </View>
        <Text style={[styles.hint, { color: colors.textMuted }]}>点击左侧图标切换待办 / 备忘</Text>
      </View>
      <PageScroll>
        {state.inboxItems.length === 0 ? <EmptyState icon="file-tray-outline" title="收件箱是空的" description="把脑海里的事先记下来，之后再慢慢整理。" /> : state.inboxItems.map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <Pressable
              disabled={item.kind === "note"}
              onPress={() => toggleInbox(item.id, !item.done)}
              accessibilityRole={item.kind === "todo" ? "checkbox" : undefined}
              style={styles.check}
            >
              <Ionicons name={item.kind === "note" ? "document-text-outline" : item.done ? "checkmark-circle" : "ellipse-outline"} size={24} color={item.done ? colors.success : colors.primary} />
            </Pressable>
            <View style={styles.itemCopy}>
              <Text style={[styles.itemText, { color: colors.text, textDecorationLine: item.done ? "line-through" : "none", opacity: item.done ? 0.55 : 1 }]}>{item.content}</Text>
              <Text style={[styles.itemMeta, { color: colors.textMuted }]}>{item.kind === "note" ? "备忘" : item.done ? "已完成" : "待办"}</Text>
            </View>
            <IconButton icon="trash-outline" label="删除" onPress={() => removeInbox(item.id)} danger />
          </Card>
        ))}
      </PageScroll>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  composerWrap: { paddingHorizontal: 16, paddingBottom: 12 }, composer: { height: 58, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 16, paddingRight: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, fontSize: 15, height: "100%" }, hint: { fontSize: 11, marginTop: 6, marginLeft: 4 }, itemCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }, check: { padding: 4 }, itemCopy: { flex: 1, gap: 4 }, itemText: { fontSize: 15, lineHeight: 21, fontWeight: "600" }, itemMeta: { fontSize: 11 },
});
