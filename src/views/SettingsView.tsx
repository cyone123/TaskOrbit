import { useEffect, useRef, useState } from "react";
import {
  AI_PROVIDER_PRESETS,
  BUILTIN_PROVIDER_CANDIDATE_MODELS,
  fetchAiModels,
  getAiProviderPreset,
  testAiConnection,
  todayISO,
  type AiProviderConfig,
  type AiProviderKey,
  type CustomAiProvider,
  type TestAiConnectionResult,
  type WebDavSettings,
} from "@task-orbit/core";
import { Icon } from "../components/Icon";
import {
  CircularProgress,
  FilledButton,
  IconButton,
  OutlinedButton,
  OutlinedSelect,
  OutlinedTextField,
  PrimaryTab,
  SelectOption,
  Switch,
  Tabs,
  TextButton,
  TonalButton,
  eventValue,
} from "../components/material";
import { ConfirmDialog, Dialog, useSnackbar } from "../components/ui";
import { useStore } from "../store/store";

type SettingsTab = "all" | "appearance" | "calendar" | "pomodoro" | "ai" | "data";

const TABS: { key: SettingsTab; label: string; icon: string }[] = [
  { key: "all", label: "全部", icon: "tune" },
  { key: "appearance", label: "外观偏好", icon: "palette" },
  { key: "calendar", label: "日历显示", icon: "calendar_month" },
  { key: "pomodoro", label: "专注番茄", icon: "timer" },
  { key: "ai", label: "AI 助理", icon: "smart_toy" },
  { key: "data", label: "数据与同步", icon: "cloud_sync" },
];

interface AiModelComboboxProps {
  value: string;
  onChange: (val: string) => void;
  baseUrl: string;
  apiKey: string;
  provider: string;
  onNotice?: (msg: string) => void;
}

function AiModelCombobox({
  value,
  onChange,
  baseUrl,
  apiKey,
  provider,
  onNotice,
}: AiModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFetchedModels([]);
    setFetchError(null);
  }, [provider]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleFetchModels = async () => {
    if (!baseUrl.trim()) {
      setFetchError("请先填写接口地址 (Base URL)");
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetchAiModels({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
      });
      if (res.ok) {
        setFetchedModels(res.models);
        onNotice?.(res.message);
      } else {
        setFetchError(res.message);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  };

  const presetCandidates = BUILTIN_PROVIDER_CANDIDATE_MODELS[provider] ?? [];
  const allCandidates = Array.from(new Set([...fetchedModels, ...presetCandidates]));

  const query = value.trim().toLowerCase();
  const filteredCandidates = query
    ? allCandidates.filter((m) => m.toLowerCase().includes(query))
    : allCandidates;

  return (
    <div className="model-combobox" ref={containerRef}>
      <div style={{ position: "relative" }}>
        <OutlinedTextField
          label="模型名称 (Model Name)"
          value={value}
          onInput={(e) => {
            onChange(eventValue(e));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="可直接输入或展开下拉选择，例如 deepseek-chat"
          supportingText="支持手动输入与搜索，展开列表可在线获取服务商支持的模型"
          style={{ width: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            zIndex: 2,
          }}
        >
          <IconButton
            onClick={() => setOpen((prev) => !prev)}
            title={open ? "收起模型列表" : "展开模型列表"}
            aria-label={open ? "收起模型列表" : "展开模型列表"}
          >
            <Icon name={open ? "arrow_drop_up" : "arrow_drop_down"} size={22} />
          </IconButton>
        </div>
      </div>

      {open && (
        <div className="model-combobox__dropdown">
          <div className="model-combobox__actions">
            <span className="body-xs muted">
              {fetchedModels.length > 0
                ? `已获取 ${fetchedModels.length} 个在线模型`
                : "可点击右侧按钮在线拉取："}
            </span>
            <button
              type="button"
              className="model-combobox__actions-btn"
              onClick={handleFetchModels}
              disabled={fetching || !baseUrl.trim()}
              title={!baseUrl.trim() ? "请先填写 Base URL" : "调用 /models 接口拉取可用模型"}
            >
              {fetching ? (
                <CircularProgress indeterminate style={{ width: 14, height: 14 }} />
              ) : (
                <Icon name="sync" size={16} />
              )}
              {fetching ? "正在获取..." : "获取在线模型"}
            </button>
          </div>

          {fetchError && (
            <div
              className="settings-notice settings-notice--error"
              style={{ margin: "4px 8px", padding: "4px 8px" }}
            >
              <Icon name="error" size={16} />
              <span className="body-xs">{fetchError}</span>
            </div>
          )}

          <div className="model-combobox__list">
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((m) => {
                const isSelected = m === value;
                const isOnline = fetchedModels.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    className={`model-combobox__item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      onChange(m);
                      setOpen(false);
                    }}
                  >
                    <span>{m}</span>
                    <div className="row items-center gap-4">
                      {isOnline && (
                        <span className="model-combobox__item-badge">在线</span>
                      )}
                      {isSelected && <Icon name="check" size={16} />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="model-combobox__empty">
                {allCandidates.length === 0 ? (
                  <span>暂无候选模型。可点击上方「获取在线模型」，或直接在输入框手动填写。</span>
                ) : (
                  <span>未找到匹配模型，可直接按回车或保留当前输入作为自定义模型。</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsView() {
  const store = useStore();
  const { state, updateSettings, updateAiSettings, updateWebDavSettings } = store;
  const { show } = useSnackbar();

  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);
  const activeTab = TABS[activeTabIdx]?.key ?? "all";

  // ---------------------------------------------------------------------------
  // 1. Appearance Settings
  // ---------------------------------------------------------------------------
  const currentTheme = state.settings.theme;
  const isSysDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const handleThemeChange = (mode: "light" | "dark" | "system") => {
    updateSettings({ theme: mode });
    const labelMap = { light: "浅色模式", dark: "深色模式", system: "跟随系统" };
    show(`外观偏好已切换为「${labelMap[mode]}」`);
  };

  // ---------------------------------------------------------------------------
  // 2. Calendar Settings
  // ---------------------------------------------------------------------------
  const cal = state.settings;
  const [weekDetailStartHour, setWeekDetailStartHour] = useState<number>(cal.weekDetailStartHour ?? 6);
  const [weekDetailEndHour, setWeekDetailEndHour] = useState<number>(cal.weekDetailEndHour ?? 24);
  const [dayStartHour, setDayStartHour] = useState<number>(cal.dayStartHour ?? 6);
  const [dayEndHour, setDayEndHour] = useState<number>(cal.dayEndHour ?? 24);
  const [monthMaxTaskTracks, setMonthMaxTaskTracks] = useState<number>(cal.monthMaxTaskTracks ?? 3);
  const [monthMaxDailyPlans, setMonthMaxDailyPlans] = useState<number>(cal.monthMaxDailyPlans ?? 4);
  const [calError, setCalError] = useState<string>("");

  useEffect(() => {
    setWeekDetailStartHour(cal.weekDetailStartHour ?? 6);
    setWeekDetailEndHour(cal.weekDetailEndHour ?? 24);
    setDayStartHour(cal.dayStartHour ?? 6);
    setDayEndHour(cal.dayEndHour ?? 24);
    setMonthMaxTaskTracks(cal.monthMaxTaskTracks ?? 3);
    setMonthMaxDailyPlans(cal.monthMaxDailyPlans ?? 4);
  }, [
    cal.weekDetailStartHour,
    cal.weekDetailEndHour,
    cal.dayStartHour,
    cal.dayEndHour,
    cal.monthMaxTaskTracks,
    cal.monthMaxDailyPlans,
  ]);

  const handleResetCalendar = () => {
    setWeekDetailStartHour(6);
    setWeekDetailEndHour(24);
    setDayStartHour(6);
    setDayEndHour(24);
    setMonthMaxTaskTracks(3);
    setMonthMaxDailyPlans(4);
    setCalError("");
    updateSettings({
      weekDetailStartHour: 6,
      weekDetailEndHour: 24,
      dayStartHour: 6,
      dayEndHour: 24,
      monthMaxTaskTracks: 3,
      monthMaxDailyPlans: 4,
    });
    show("日历显示设置已恢复默认");
  };

  const handleSaveCalendar = () => {
    if (weekDetailEndHour <= weekDetailStartHour) {
      setCalError("周视图结束时间必须晚于起始时间");
      return;
    }
    if (dayEndHour <= dayStartHour) {
      setCalError("日视图结束时间必须晚于起始时间");
      return;
    }
    setCalError("");
    updateSettings({
      weekDetailStartHour,
      weekDetailEndHour,
      dayStartHour,
      dayEndHour,
      monthMaxTaskTracks,
      monthMaxDailyPlans,
    });
    show("日历显示设置已保存");
  };

  // ---------------------------------------------------------------------------
  // 3. Pomodoro Settings
  // ---------------------------------------------------------------------------
  const pomo = state.settings;
  const [focusMinutes, setFocusMinutes] = useState(String(pomo.focusMinutes ?? 25));
  const [shortBreakMinutes, setShortBreakMinutes] = useState(String(pomo.shortBreakMinutes ?? 5));
  const [longBreakMinutes, setLongBreakMinutes] = useState(String(pomo.longBreakMinutes ?? 15));
  const [longBreakInterval, setLongBreakInterval] = useState(String(pomo.longBreakInterval ?? 4));
  const [pomoError, setPomoError] = useState("");

  useEffect(() => {
    setFocusMinutes(String(pomo.focusMinutes ?? 25));
    setShortBreakMinutes(String(pomo.shortBreakMinutes ?? 5));
    setLongBreakMinutes(String(pomo.longBreakMinutes ?? 15));
    setLongBreakInterval(String(pomo.longBreakInterval ?? 4));
  }, [pomo.focusMinutes, pomo.shortBreakMinutes, pomo.longBreakMinutes, pomo.longBreakInterval]);

  const applyPomoPreset = (f: number, s: number, l: number, i: number) => {
    setFocusMinutes(String(f));
    setShortBreakMinutes(String(s));
    setLongBreakMinutes(String(l));
    setLongBreakInterval(String(i));
    setPomoError("");
    updateSettings({
      focusMinutes: f,
      shortBreakMinutes: s,
      longBreakMinutes: l,
      longBreakInterval: i,
    });
    show("番茄钟预设已应用并保存");
  };

  const handleSavePomodoro = () => {
    const f = Number(focusMinutes);
    const s = Number(shortBreakMinutes);
    const l = Number(longBreakMinutes);
    const i = Number(longBreakInterval);
    if (!f || !s || !l || !i || f < 1 || s < 1 || l < 1 || i < 1) {
      setPomoError("所有时长与间隔必须是大于 0 的有效整数");
      return;
    }
    setPomoError("");
    updateSettings({
      focusMinutes: Math.round(f),
      shortBreakMinutes: Math.round(s),
      longBreakMinutes: Math.round(l),
      longBreakInterval: Math.round(i),
    });
    show("番茄钟设置已保存");
  };

  const handleResetPomodoro = () => {
    applyPomoPreset(25, 5, 15, 4);
  };

  // ---------------------------------------------------------------------------
  // 4. AI Assistant Settings
  // ---------------------------------------------------------------------------
  const ai = state.aiSettings;
  const [aiEnabled, setAiEnabled] = useState(ai.enabled);
  const [aiProvider, setAiProvider] = useState<string>(ai.provider);
  const [aiBaseUrl, setAiBaseUrl] = useState(ai.baseUrl);
  const [aiApiKey, setAiApiKey] = useState(ai.apiKey);
  const [aiModel, setAiModel] = useState(ai.model);
  const [aiTemperature, setAiTemperature] = useState(ai.temperature);
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<TestAiConnectionResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Custom providers list
  const [customProviders, setCustomProviders] = useState<CustomAiProvider[]>(
    () => ai.customProviders ?? [],
  );

  // Independent provider configs memory
  const [providerConfigs, setProviderConfigs] = useState<Record<string, AiProviderConfig>>(() => {
    const init: Record<string, AiProviderConfig> = { ...(ai.providersConfig ?? {}) };
    if (ai.provider) {
      init[ai.provider] = {
        baseUrl: ai.baseUrl,
        apiKey: ai.apiKey,
        model: ai.model,
        temperature: ai.temperature,
      };
    }
    return init;
  });

  // Modal dialog states for custom providers
  const [addCustomDialogOpen, setAddCustomDialogOpen] = useState(false);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomBaseUrl, setNewCustomBaseUrl] = useState("");
  const [newCustomModel, setNewCustomModel] = useState("");

  const [renameCustomDialogOpen, setRenameCustomDialogOpen] = useState(false);
  const [renameCustomTarget, setRenameCustomTarget] = useState<CustomAiProvider | null>(null);
  const [renameCustomName, setRenameCustomName] = useState("");

  const [deleteCustomTarget, setDeleteCustomTarget] = useState<CustomAiProvider | null>(null);

  const currentCustomProvider = customProviders.find((cp) => cp.id === aiProvider);

  useEffect(() => {
    setAiEnabled(ai.enabled);
    setAiProvider(ai.provider);
    setAiBaseUrl(ai.baseUrl);
    setAiApiKey(ai.apiKey);
    setAiModel(ai.model);
    setAiTemperature(ai.temperature);
    if (ai.customProviders) setCustomProviders(ai.customProviders);
    if (ai.providersConfig) setProviderConfigs(ai.providersConfig);
  }, [ai]);

  const handleAiProviderChange = (newProviderId: string) => {
    // 1. 暂存当前正在编辑的提供商配置，防止切换后被冲掉
    const updatedConfigs: Record<string, AiProviderConfig> = {
      ...providerConfigs,
      [aiProvider]: {
        baseUrl: aiBaseUrl,
        apiKey: aiApiKey,
        model: aiModel,
        temperature: aiTemperature,
      },
    };
    setProviderConfigs(updatedConfigs);

    // 若当前正在编辑某自定义提供商，也同步暂存回 customProviders
    setCustomProviders((prev) =>
      prev.map((cp) =>
        cp.id === aiProvider
          ? {
              ...cp,
              baseUrl: aiBaseUrl,
              apiKey: aiApiKey,
              model: aiModel,
              temperature: aiTemperature,
            }
          : cp,
      ),
    );

    // 2. 切换当前 provider ID
    setAiProvider(newProviderId);
    setAiTestResult(null);
    setAiError(null);

    // 3. 读取目标提供商的历史暂存/已存值（优先读取，绝对不覆盖用户输入）
    const savedTarget = updatedConfigs[newProviderId];
    if (savedTarget && (savedTarget.baseUrl || savedTarget.apiKey || savedTarget.model)) {
      setAiBaseUrl(savedTarget.baseUrl);
      setAiApiKey(savedTarget.apiKey);
      setAiModel(savedTarget.model);
      if (typeof savedTarget.temperature === "number") {
        setAiTemperature(savedTarget.temperature);
      }
      return;
    }

    // 4. 若为 customProviders 列表里的自定义提供商且暂无 config 缓存
    const customItem = customProviders.find((cp) => cp.id === newProviderId);
    if (customItem) {
      setAiBaseUrl(customItem.baseUrl);
      setAiApiKey(customItem.apiKey);
      setAiModel(customItem.model);
      setAiTemperature(customItem.temperature);
      return;
    }

    // 5. 若为内置预设且未曾配置过，读取预设默认值
    const preset = getAiProviderPreset(newProviderId as AiProviderKey);
    if (preset && newProviderId !== "custom") {
      setAiBaseUrl(preset.baseUrl);
      setAiModel(preset.defaultModel);
      setAiApiKey("");
      setAiTemperature(0.7);
    } else if (newProviderId === "custom") {
      setAiBaseUrl("");
      setAiApiKey("");
      setAiModel("");
      setAiTemperature(0.7);
    }
  };

  const handleAddCustomProvider = () => {
    const name = newCustomName.trim();
    if (!name) return;
    const newId = `custom_${Date.now()}`;
    const newProvider: CustomAiProvider = {
      id: newId,
      name,
      baseUrl: newCustomBaseUrl.trim(),
      apiKey: "",
      model: newCustomModel.trim(),
      temperature: 0.7,
    };

    // 1. 暂存当前正在编辑的提供商，同时加入新提供商配置
    const nextConfigs: Record<string, AiProviderConfig> = {
      ...providerConfigs,
      [aiProvider]: {
        baseUrl: aiBaseUrl,
        apiKey: aiApiKey,
        model: aiModel,
        temperature: aiTemperature,
      },
      [newId]: {
        baseUrl: newProvider.baseUrl,
        apiKey: "",
        model: newProvider.model,
        temperature: 0.7,
      },
    };

    const nextCustomProviders = [
      ...customProviders.map((cp) =>
        cp.id === aiProvider
          ? {
              ...cp,
              baseUrl: aiBaseUrl,
              apiKey: aiApiKey,
              model: aiModel,
              temperature: aiTemperature,
            }
          : cp,
      ),
      newProvider,
    ];

    setCustomProviders(nextCustomProviders);
    setProviderConfigs(nextConfigs);

    // 2. 立即切换到新添加的自定义提供商
    setAiProvider(newId);
    setAiBaseUrl(newProvider.baseUrl);
    setAiApiKey("");
    setAiModel(newProvider.model);
    setAiTemperature(0.7);
    setAiTestResult(null);
    setAiError(null);

    setAddCustomDialogOpen(false);
    setNewCustomName("");
    setNewCustomBaseUrl("");
    setNewCustomModel("");

    show(`已添加自定义服务商「${name}」`);
  };

  const handleRenameCustomProvider = () => {
    if (!renameCustomTarget || !renameCustomName.trim()) return;
    const newName = renameCustomName.trim();
    setCustomProviders((prev) =>
      prev.map((cp) => (cp.id === renameCustomTarget.id ? { ...cp, name: newName } : cp)),
    );
    setRenameCustomDialogOpen(false);
    setRenameCustomTarget(null);
    setRenameCustomName("");
    show(`自定义服务商已重命名为「${newName}」`);
  };

  const handleDeleteCustomProvider = (target: CustomAiProvider) => {
    const nextCustom = customProviders.filter((cp) => cp.id !== target.id);
    const nextConfigs = { ...providerConfigs };
    delete nextConfigs[target.id];

    setCustomProviders(nextCustom);
    setProviderConfigs(nextConfigs);
    setDeleteCustomTarget(null);

    if (aiProvider === target.id) {
      setAiProvider("deepseek");
      const dsConfig = nextConfigs["deepseek"];
      if (dsConfig) {
        setAiBaseUrl(dsConfig.baseUrl);
        setAiApiKey(dsConfig.apiKey);
        setAiModel(dsConfig.model);
        setAiTemperature(dsConfig.temperature ?? 0.7);
      } else {
        const preset = getAiProviderPreset("deepseek");
        setAiBaseUrl(preset?.baseUrl ?? "");
        setAiApiKey("");
        setAiModel(preset?.defaultModel ?? "");
        setAiTemperature(0.7);
      }
    }
    show(`已删除自定义服务商「${target.name}」`);
  };

  const handleTestAiConnection = async () => {
    if (!aiBaseUrl.trim()) {
      setAiError("请填写接口地址 (Base URL)");
      return;
    }
    if (!aiModel.trim()) {
      setAiError("请填写模型名称");
      return;
    }
    setAiError(null);
    setAiTesting(true);
    setAiTestResult(null);

    try {
      const res = await testAiConnection({
        baseUrl: aiBaseUrl.trim(),
        apiKey: aiApiKey.trim(),
        model: aiModel.trim(),
      });
      setAiTestResult(res);
      if (res.ok) {
        show("AI 服务连通测试成功！");
      }
    } catch (err) {
      setAiTestResult({
        ok: false,
        message: `测试异常：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setAiTesting(false);
    }
  };

  const handleSaveAi = () => {
    if (aiEnabled && !aiBaseUrl.trim()) {
      setAiError("启用 AI 助理时必须填写接口地址");
      return;
    }
    if (aiEnabled && !aiModel.trim()) {
      setAiError("启用 AI 助理时必须填写模型名称");
      return;
    }
    setAiError(null);

    const updatedCustomProviders = customProviders.map((cp) =>
      cp.id === aiProvider
        ? {
            ...cp,
            baseUrl: aiBaseUrl.trim(),
            apiKey: aiApiKey.trim(),
            model: aiModel.trim(),
            temperature: aiTemperature,
          }
        : cp,
    );

    const updatedConfigs: Record<string, AiProviderConfig> = {
      ...providerConfigs,
      [aiProvider]: {
        baseUrl: aiBaseUrl.trim(),
        apiKey: aiApiKey.trim(),
        model: aiModel.trim(),
        temperature: aiTemperature,
      },
    };

    setCustomProviders(updatedCustomProviders);
    setProviderConfigs(updatedConfigs);

    updateAiSettings({
      enabled: aiEnabled,
      provider: aiProvider,
      baseUrl: aiBaseUrl.trim(),
      apiKey: aiApiKey.trim(),
      model: aiModel.trim(),
      temperature: aiTemperature,
      customProviders: updatedCustomProviders,
      providersConfig: updatedConfigs,
    });
    show("AI 助理配置已保存");
  };

  // ---------------------------------------------------------------------------
  // 5. Data Management & WebDAV Settings
  // ---------------------------------------------------------------------------
  const webDav = state.webDavSettings;
  const [davServerUrl, setDavServerUrl] = useState(webDav.serverUrl);
  const [davUsername, setDavUsername] = useState(webDav.username);
  const [davPassword, setDavPassword] = useState(webDav.password);
  const [davRemoteDir, setDavRemoteDir] = useState(webDav.remoteDir);
  const [davEnabled, setDavEnabled] = useState(webDav.enabled);
  const [davAutoSync, setDavAutoSync] = useState(webDav.autoSync);
  const [davTesting, setDavTesting] = useState(false);
  const [davTestResult, setDavTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [davSyncing, setDavSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; raw: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    setDavServerUrl(webDav.serverUrl);
    setDavUsername(webDav.username);
    setDavPassword(webDav.password);
    setDavRemoteDir(webDav.remoteDir);
    setDavEnabled(webDav.enabled);
    setDavAutoSync(webDav.autoSync);
  }, [webDav]);

  const saveWebDavConfig = (overrides: Partial<WebDavSettings> = {}) => {
    const patch: Partial<WebDavSettings> = {
      serverUrl: davServerUrl,
      username: davUsername,
      password: davPassword,
      remoteDir: davRemoteDir,
      enabled: davEnabled,
      autoSync: davAutoSync,
      ...overrides,
    };
    updateWebDavSettings(patch);
    show("WebDAV 配置已保存");
  };

  const handleTestWebDav = async () => {
    setDavTesting(true);
    setDavTestResult(null);
    try {
      const res = await store.testWebDavConnection({
        ...webDav,
        serverUrl: davServerUrl,
        username: davUsername,
        password: davPassword,
        remoteDir: davRemoteDir,
        enabled: davEnabled,
        autoSync: davAutoSync,
      });
      setDavTestResult(res);
      if (res.success) {
        show("WebDAV 连接测试成功！");
      }
    } catch (e) {
      setDavTestResult({
        success: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setDavTesting(false);
    }
  };

  const handleSyncNow = async () => {
    saveWebDavConfig();
    setDavSyncing(true);
    try {
      const res = await store.syncNow();
      if (res.success) {
        show(res.hasChanges ? "同步成功，数据已合并更新" : "数据已是最新状态");
      } else {
        show(`同步未完成：${res.message ?? "未知错误"}`);
      }
    } finally {
      setDavSyncing(false);
    }
  };

  const formatLastSyncTime = (timestamp: number | null) => {
    if (!timestamp) return "从未同步";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const exportData = () => {
    const blob = new Blob([store.exportSnapshot()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `task-orbit-backup-${todayISO()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    show("数据已导出为 JSON 快照");
  };

  const chooseImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      setPendingImport({ name: file.name, raw: await file.text() });
    } catch (readError) {
      setImportError(`无法读取文件：${readError instanceof Error ? readError.message : String(readError)}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = () => {
    const pending = pendingImport;
    if (!pending) return;
    setPendingImport(null);
    void store.importSnapshot(pending.raw).then(
      () => {
        show("数据导入成功，已整体替换当前工作区");
      },
      (err) => {
        setImportError(err instanceof Error ? err.message : String(err));
      },
    );
  };

  const handleResetAll = async () => {
    setResetDialogOpen(false);
    try {
      await store.resetAll();
      show("已清空所有本地数据，工作区已恢复初始状态");
    } catch (err) {
      show(`清空失败：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Section visibility checks based on active Tab
  const showAppearance = activeTab === "all" || activeTab === "appearance";
  const showCalendar = activeTab === "all" || activeTab === "calendar";
  const showPomodoro = activeTab === "all" || activeTab === "pomodoro";
  const showAi = activeTab === "all" || activeTab === "ai";
  const showData = activeTab === "all" || activeTab === "data";

  return (
    <div className="settings-view">
      {/* Category Tabs */}
      <div className="settings-nav-tabs">
        <Tabs
          activeTabIndex={activeTabIdx}
          onChange={(e) => setActiveTabIdx((e.target as unknown as { activeTabIndex: number }).activeTabIndex)}
        >
          {TABS.map((t) => (
            <PrimaryTab key={t.key}>
              <Icon name={t.icon} size={18} slot="icon" />
              {t.label}
            </PrimaryTab>
          ))}
        </Tabs>
      </div>

      {/* =====================================================================
          1. 外观偏好
          ===================================================================== */}
      {showAppearance && (
        <section className="settings-section">
          <div className="settings-card">
            <div className="settings-card__header">
              <div className="settings-card__header-info">
                <div className="settings-card__header-icon">
                  <Icon name="palette" size={20} />
                </div>
                <div className="settings-card__header-text">
                  <h3>界面外观</h3>
                  <p>切换亮色/深色主题，或根据操作系统自动调整色彩</p>
                </div>
              </div>
            </div>

            <div className="theme-options-grid">
              {/* Light mode */}
              <button
                type="button"
                className={`theme-card ${currentTheme === "light" ? "is-active" : ""}`}
                onClick={() => handleThemeChange("light")}
              >
                <div className="theme-card__icon">
                  <Icon name="light_mode" size={20} />
                </div>
                <span className="theme-card__name">浅色模式</span>
                <span className="theme-card__desc">始终保持明亮清晰的视觉界面</span>
              </button>

              {/* Dark mode */}
              <button
                type="button"
                className={`theme-card ${currentTheme === "dark" ? "is-active" : ""}`}
                onClick={() => handleThemeChange("dark")}
              >
                <div className="theme-card__icon">
                  <Icon name="dark_mode" size={20} />
                </div>
                <span className="theme-card__name">深色模式</span>
                <span className="theme-card__desc">低光环境下舒适护眼，降低视疲劳</span>
              </button>

              {/* Follow system */}
              <button
                type="button"
                className={`theme-card ${currentTheme === "system" ? "is-active" : ""}`}
                onClick={() => handleThemeChange("system")}
              >
                <div className="theme-card__icon">
                  <Icon name="brightness_auto" size={20} />
                </div>
                <span className="theme-card__name">跟随系统</span>
                <span className="theme-card__desc">
                  自动匹配系统外观（当前检测为：{isSysDark ? "深色" : "浅色"}）
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          2. 日历显示设置
          ===================================================================== */}
      {showCalendar && (
        <section className="settings-section">
          <div className="settings-card">
            <div className="settings-card__header">
              <div className="settings-card__header-info">
                <div className="settings-card__header-icon">
                  <Icon name="calendar_month" size={20} />
                </div>
                <div className="settings-card__header-text">
                  <h3>日历视图显示设置</h3>
                  <p>自定义周视图与日视图的有效时间轴范围，以及月视图的显示上限</p>
                </div>
              </div>
            </div>

            <div className="col gap-12">
              <div>
                <div className="label-lg mb-8">周视图时间轴（每日计划详表）</div>
                <div className="field__row">
                  <div className="field">
                    <OutlinedSelect
                      label="起始时间"
                      value={String(weekDetailStartHour)}
                      onChange={(e) => {
                        setWeekDetailStartHour(Number(eventValue(e)));
                        setCalError("");
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectOption key={i} value={String(i)} selected={weekDetailStartHour === i}>
                          <span slot="headline">
                            {`${String(i).padStart(2, "0")}:00`}{i === 6 ? "（默认）" : ""}
                          </span>
                        </SelectOption>
                      ))}
                    </OutlinedSelect>
                  </div>
                  <div className="field">
                    <OutlinedSelect
                      label="结束时间"
                      value={String(weekDetailEndHour)}
                      onChange={(e) => {
                        setWeekDetailEndHour(Number(eventValue(e)));
                        setCalError("");
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                        <SelectOption key={i} value={String(i)} selected={weekDetailEndHour === i}>
                          <span slot="headline">
                            {`${String(i).padStart(2, "0")}:00`}{i === 24 ? "（默认）" : ""}
                          </span>
                        </SelectOption>
                      ))}
                    </OutlinedSelect>
                  </div>
                </div>
              </div>

              <div>
                <div className="label-lg mb-8">日视图时间轴</div>
                <div className="field__row">
                  <div className="field">
                    <OutlinedSelect
                      label="起始时间"
                      value={String(dayStartHour)}
                      onChange={(e) => {
                        setDayStartHour(Number(eventValue(e)));
                        setCalError("");
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectOption key={i} value={String(i)} selected={dayStartHour === i}>
                          <span slot="headline">
                            {`${String(i).padStart(2, "0")}:00`}{i === 6 ? "（默认）" : ""}
                          </span>
                        </SelectOption>
                      ))}
                    </OutlinedSelect>
                  </div>
                  <div className="field">
                    <OutlinedSelect
                      label="结束时间"
                      value={String(dayEndHour)}
                      onChange={(e) => {
                        setDayEndHour(Number(eventValue(e)));
                        setCalError("");
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                        <SelectOption key={i} value={String(i)} selected={dayEndHour === i}>
                          <span slot="headline">
                            {`${String(i).padStart(2, "0")}:00`}{i === 24 ? "（默认）" : ""}
                          </span>
                        </SelectOption>
                      ))}
                    </OutlinedSelect>
                  </div>
                </div>
              </div>

              <div>
                <div className="label-lg mb-8">月视图显示上限</div>
                <div className="field__row">
                  <div className="field">
                    <OutlinedSelect
                      label="最大任务轨道数"
                      value={String(monthMaxTaskTracks)}
                      onChange={(e) => setMonthMaxTaskTracks(Number(eventValue(e)))}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                        <SelectOption key={num} value={String(num)} selected={monthMaxTaskTracks === num}>
                          <span slot="headline">
                            {num} 轨{num === 3 ? "（默认）" : ""}
                          </span>
                        </SelectOption>
                      ))}
                    </OutlinedSelect>
                  </div>
                  <div className="field">
                    <OutlinedSelect
                      label="最大每日计划数"
                      value={String(monthMaxDailyPlans)}
                      onChange={(e) => setMonthMaxDailyPlans(Number(eventValue(e)))}
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                        <SelectOption key={num} value={String(num)} selected={monthMaxDailyPlans === num}>
                          <span slot="headline">
                            {num} 项{num === 4 ? "（默认）" : ""}
                          </span>
                        </SelectOption>
                      ))}
                    </OutlinedSelect>
                  </div>
                </div>
              </div>

              {calError && <div className="settings-notice settings-notice--error">{calError}</div>}

              <div className="settings-card__actions">
                <TextButton onClick={handleResetCalendar}>恢复默认</TextButton>
                <FilledButton onClick={handleSaveCalendar}>
                  <Icon name="check" size={18} slot="icon" />
                  保存日历设置
                </FilledButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          3. 专注番茄钟设置
          ===================================================================== */}
      {showPomodoro && (
        <section className="settings-section">
          <div className="settings-card">
            <div className="settings-card__header">
              <div className="settings-card__header-info">
                <div className="settings-card__header-icon">
                  <Icon name="timer" size={20} />
                </div>
                <div className="settings-card__header-text">
                  <h3>专注番茄钟设置</h3>
                  <p>设置单次专注时长、休息时长与长休息间隔</p>
                </div>
              </div>
            </div>

            <div className="col gap-12">
              <div>
                <div className="label-sm muted mb-8">快速应用节奏预设：</div>
                <div className="preset-chips-row">
                  <OutlinedButton onClick={() => applyPomoPreset(25, 5, 15, 4)}>
                    <Icon name="speed" size={16} slot="icon" /> 经典番茄 (25m / 5m / 15m / 4轮)
                  </OutlinedButton>
                  <OutlinedButton onClick={() => applyPomoPreset(50, 10, 30, 3)}>
                    <Icon name="hourglass_bottom" size={16} slot="icon" /> 深度专注 (50m / 10m / 30m / 3轮)
                  </OutlinedButton>
                  <OutlinedButton onClick={() => applyPomoPreset(15, 3, 10, 4)}>
                    <Icon name="bolt" size={16} slot="icon" /> 敏捷冲刺 (15m / 3m / 10m / 4轮)
                  </OutlinedButton>
                </div>
              </div>

              <div className="field__row">
                <div className="field">
                  <OutlinedTextField
                    label="专注时长（分钟）"
                    type="number"
                    min="1"
                    value={focusMinutes}
                    onInput={(e) => {
                      setFocusMinutes(eventValue(e));
                      setPomoError("");
                    }}
                  />
                </div>
                <div className="field">
                  <OutlinedTextField
                    label="短休息（分钟）"
                    type="number"
                    min="1"
                    value={shortBreakMinutes}
                    onInput={(e) => {
                      setShortBreakMinutes(eventValue(e));
                      setPomoError("");
                    }}
                  />
                </div>
              </div>

              <div className="field__row">
                <div className="field">
                  <OutlinedTextField
                    label="长休息（分钟）"
                    type="number"
                    min="1"
                    value={longBreakMinutes}
                    onInput={(e) => {
                      setLongBreakMinutes(eventValue(e));
                      setPomoError("");
                    }}
                  />
                </div>
                <div className="field">
                  <OutlinedTextField
                    label="长休息触发间隔（专注轮次）"
                    type="number"
                    min="1"
                    value={longBreakInterval}
                    onInput={(e) => {
                      setLongBreakInterval(eventValue(e));
                      setPomoError("");
                    }}
                  />
                </div>
              </div>

              {pomoError && <div className="settings-notice settings-notice--error">{pomoError}</div>}

              <div className="settings-card__actions">
                <TextButton onClick={handleResetPomodoro}>恢复默认</TextButton>
                <FilledButton onClick={handleSavePomodoro}>
                  <Icon name="check" size={18} slot="icon" />
                  保存番茄钟设置
                </FilledButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          4. AI 任务助理设置
          ===================================================================== */}
      {showAi && (
        <section className="settings-section">
          <div className="settings-card">
            <div className="settings-card__header">
              <div className="settings-card__header-info">
                <div className="settings-card__header-icon">
                  <Icon name="smart_toy" size={20} />
                </div>
                <div className="settings-card__header-text">
                  <h3>AI 任务助理配置</h3>
                  <p>接入兼容 OpenAI 标准格式的大语言模型，赋能任务整理、智能排期与反思总结</p>
                </div>
              </div>
              <Switch
                selected={aiEnabled}
                onChange={(e) => {
                  const next = (e.target as unknown as { selected: boolean }).selected;
                  setAiEnabled(next);
                  updateAiSettings({ enabled: next });
                  show(next ? "已启用 AI 任务助理" : "已停用 AI 任务助理");
                }}
              />
            </div>

            <div className="col gap-12">
              <div className="field">
                <div className="row items-center gap-8">
                  <div style={{ flex: 1 }}>
                    <OutlinedSelect
                      label="服务提供商 / 快捷预设"
                      value={aiProvider}
                      onChange={(e) => handleAiProviderChange(eventValue(e))}
                      style={{ width: "100%" }}
                    >
                      {AI_PROVIDER_PRESETS.map((p) => (
                        <SelectOption key={p.id} value={p.id} selected={aiProvider === p.id}>
                          <span slot="headline">{p.name}</span>
                        </SelectOption>
                      ))}
                      {customProviders.map((cp) => (
                        <SelectOption key={cp.id} value={cp.id} selected={aiProvider === cp.id}>
                          <span slot="headline">{cp.name} (自定义)</span>
                        </SelectOption>
                      ))}
                    </OutlinedSelect>
                  </div>
                  <TonalButton
                    type="button"
                    onClick={() => {
                      setNewCustomName("");
                      setNewCustomBaseUrl("");
                      setNewCustomModel("");
                      setAddCustomDialogOpen(true);
                    }}
                    title="添加自定义服务提供商"
                  >
                    <Icon name="add" size={18} slot="icon" />
                    添加服务商
                  </TonalButton>
                  {currentCustomProvider && (
                    <>
                      <IconButton
                        type="button"
                        title="重命名服务商"
                        aria-label="重命名服务商"
                        onClick={() => {
                          setRenameCustomTarget(currentCustomProvider);
                          setRenameCustomName(currentCustomProvider.name);
                          setRenameCustomDialogOpen(true);
                        }}
                      >
                        <Icon name="edit" size={18} />
                      </IconButton>
                      <IconButton
                        type="button"
                        title="删除服务商"
                        aria-label="删除服务商"
                        onClick={() => setDeleteCustomTarget(currentCustomProvider)}
                      >
                        <Icon name="delete" size={18} />
                      </IconButton>
                    </>
                  )}
                </div>
              </div>

              <div className="field">
                <OutlinedTextField
                  label="接口地址 (Base URL)"
                  value={aiBaseUrl}
                  onInput={(e) => {
                    setAiBaseUrl(eventValue(e));
                    setAiError(null);
                  }}
                  placeholder="例如 https://api.deepseek.com/v1 或 http://localhost:11434/v1"
                  supportingText="必须支持 OpenAI /chat/completions 兼容格式"
                />
              </div>

              <div className="field">
                <div style={{ position: "relative" }}>
                  <OutlinedTextField
                    label="API Key"
                    type={showApiKey ? "text" : "password"}
                    value={aiApiKey}
                    onInput={(e) => {
                      setAiApiKey(eventValue(e));
                      setAiError(null);
                    }}
                    placeholder={aiProvider === "ollama" ? "本地模型无需填写（或留空）" : "sk-..."}
                    supportingText="密钥仅加密保存在本地设备，导出备份时自动脱敏抹除"
                    style={{ width: "100%" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 8,
                      zIndex: 2,
                    }}
                  >
                    <IconButton
                      onClick={() => setShowApiKey((v) => !v)}
                      title={showApiKey ? "隐藏密钥" : "显示密钥"}
                      aria-label={showApiKey ? "隐藏密钥" : "显示密钥"}
                    >
                      <Icon name={showApiKey ? "visibility_off" : "visibility"} size={20} />
                    </IconButton>
                  </div>
                </div>
              </div>

              <div className="field__row">
                <div className="field" style={{ flex: 2 }}>
                  <AiModelCombobox
                    value={aiModel}
                    onChange={(val) => {
                      setAiModel(val);
                      setAiError(null);
                    }}
                    baseUrl={aiBaseUrl}
                    apiKey={aiApiKey}
                    provider={aiProvider}
                    onNotice={show}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <OutlinedTextField
                    label="温度 (Temperature)"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={String(aiTemperature)}
                    onInput={(e) => {
                      const val = parseFloat(eventValue(e));
                      if (!isNaN(val)) setAiTemperature(val);
                    }}
                    supportingText="数值越小越严谨，推荐 0.7"
                  />
                </div>
              </div>

              {aiTestResult && (
                <div
                  className={`settings-notice ${
                    aiTestResult.ok ? "settings-notice--success" : "settings-notice--error"
                  }`}
                >
                  <Icon
                    name={aiTestResult.ok ? "check_circle" : "error"}
                    size={18}
                  />
                  <span>
                    {aiTestResult.ok
                      ? `连接成功！响应延迟约 ${aiTestResult.latencyMs ?? 0}ms`
                      : `测试失败：${aiTestResult.message ?? "未知错误"}`}
                  </span>
                </div>
              )}

              {aiError && <div className="settings-notice settings-notice--error">{aiError}</div>}

              <div className="settings-card__actions">
                <OutlinedButton onClick={handleTestAiConnection} disabled={aiTesting || !aiBaseUrl.trim()}>
                  {aiTesting ? (
                    <CircularProgress indeterminate style={{ width: 16, height: 16 }} slot="icon" />
                  ) : (
                    <Icon name="network_check" size={18} slot="icon" />
                  )}
                  测试连通性
                </OutlinedButton>
                <FilledButton onClick={handleSaveAi}>
                  <Icon name="save" size={18} slot="icon" />
                  保存 AI 配置
                </FilledButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          5. 数据管理与云端同步设置
          ===================================================================== */}
      {showData && (
        <section className="settings-section">
          {/* WebDAV Cloud Sync */}
          <div className="settings-card">
            <div className="settings-card__header">
              <div className="settings-card__header-info">
                <div className="settings-card__header-icon">
                  <Icon name="cloud_sync" size={20} />
                </div>
                <div className="settings-card__header-text">
                  <h3>WebDAV 云端同步</h3>
                  <p>通过自建或公共 WebDAV 服务器跨设备自动对账与双向同步</p>
                </div>
              </div>
              <Switch
                selected={davEnabled}
                onChange={(e) => {
                  const next = (e.target as unknown as { selected: boolean }).selected;
                  setDavEnabled(next);
                  saveWebDavConfig({ enabled: next });
                }}
              />
            </div>

            <div className="col gap-12">
              <div className="field">
                <OutlinedTextField
                  label="WebDAV 服务器地址"
                  placeholder="https://dav.example.com/webdav/"
                  value={davServerUrl}
                  onInput={(e) => setDavServerUrl((e.target as HTMLInputElement).value)}
                  onBlur={() => saveWebDavConfig()}
                />
              </div>

              <div className="field__row">
                <div className="field">
                  <OutlinedTextField
                    label="用户名"
                    value={davUsername}
                    onInput={(e) => setDavUsername((e.target as HTMLInputElement).value)}
                    onBlur={() => saveWebDavConfig()}
                  />
                </div>
                <div className="field">
                  <OutlinedTextField
                    label="密码 / 应用授权码"
                    type="password"
                    value={davPassword}
                    onInput={(e) => setDavPassword((e.target as HTMLInputElement).value)}
                    onBlur={() => saveWebDavConfig()}
                  />
                </div>
              </div>

              <div className="field">
                <OutlinedTextField
                  label="云端工作目录"
                  placeholder="/taskorbit"
                  value={davRemoteDir}
                  onInput={(e) => setDavRemoteDir((e.target as HTMLInputElement).value)}
                  onBlur={() => saveWebDavConfig()}
                  supportingText="多设备填写相同目录即可实现协同对账"
                />
              </div>

              <div className="settings-item">
                <div className="settings-item__info">
                  <span className="settings-item__title">后台自动同步</span>
                  <span className="settings-item__description">
                    应用启动时拉取最新状态，本地修改后静默推送对账
                  </span>
                </div>
                <div className="settings-item__control">
                  <Switch
                    selected={davAutoSync}
                    onChange={(e) => {
                      const next = (e.target as unknown as { selected: boolean }).selected;
                      setDavAutoSync(next);
                      saveWebDavConfig({ autoSync: next });
                    }}
                  />
                </div>
              </div>

              {davTestResult && (
                <div
                  className={`settings-notice ${
                    davTestResult.success ? "settings-notice--success" : "settings-notice--error"
                  }`}
                >
                  <Icon
                    name={davTestResult.success ? "check_circle" : "error"}
                    size={18}
                  />
                  <span>{davTestResult.message}</span>
                </div>
              )}

              {store.syncErrorMessage && (
                <div className="settings-notice settings-notice--error">
                  <Icon name="warning" size={18} />
                  <span>同步异常：{store.syncErrorMessage}</span>
                </div>
              )}

              <div className="row items-center justify-between mt-8">
                <div className="body-xs muted">
                  上次同步：{formatLastSyncTime(store.lastSyncAt)}
                  {store.syncStatus === "syncing" && " (正在同步...)"}
                </div>
                <div className="row gap-8">
                  <OutlinedButton onClick={handleTestWebDav} disabled={davTesting || davSyncing}>
                    {davTesting ? (
                      <CircularProgress indeterminate style={{ width: 16, height: 16 }} slot="icon" />
                    ) : (
                      <Icon name="network_check" size={18} slot="icon" />
                    )}
                    测试连接
                  </OutlinedButton>
                  <FilledButton onClick={handleSyncNow} disabled={davSyncing || davTesting || !davServerUrl.trim()}>
                    {davSyncing ? (
                      <CircularProgress indeterminate style={{ width: 16, height: 16 }} slot="icon" />
                    ) : (
                      <Icon name="sync" size={18} slot="icon" />
                    )}
                    立即同步
                  </FilledButton>
                </div>
              </div>
            </div>
          </div>

          {/* Local Snapshot Backup */}
          <div className="settings-card">
            <div className="settings-card__header">
              <div className="settings-card__header-info">
                <div className="settings-card__header-icon">
                  <Icon name="backup" size={20} />
                </div>
                <div className="settings-card__header-text">
                  <h3>本地快照与迁移</h3>
                  <p>导出完整工作区 JSON 快照用于离线归档，或导入备份进行恢复</p>
                </div>
              </div>
            </div>

            <div className="col gap-12">
              <div className="body-sm muted">
                导出时会自动脱敏密钥等敏感信息。导入前系统会自动保存当前状态作为安全备份。
              </div>

              <div className="row gap-8">
                <TonalButton onClick={exportData}>
                  <Icon name="download" size={18} slot="icon" /> 导出 JSON 快照
                </TonalButton>
                <OutlinedButton onClick={() => fileInputRef.current?.click()}>
                  <Icon name="upload" size={18} slot="icon" /> 导入 JSON 快照
                </OutlinedButton>
              </div>

              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept=".json,application/json"
                onChange={(event) => void chooseImportFile(event.target.files?.[0])}
              />

              {importError && (
                <div className="settings-notice settings-notice--error">
                  <Icon name="error" size={18} />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone: Reset workspace */}
          <div className="settings-card settings-card--danger">
            <div className="settings-card__header">
              <div className="settings-card__header-info">
                <div className="settings-card__header-icon">
                  <Icon name="warning" size={20} />
                </div>
                <div className="settings-card__header-text">
                  <h3>危险区域</h3>
                  <p>清空全部本地数据并恢复到空工作区</p>
                </div>
              </div>
            </div>

            <div className="row items-center justify-between">
              <div className="body-sm muted">
                此操作将永久清空当前工作区的所有项目、任务、计划和番茄记录，且无法撤销。
              </div>
              <FilledButton
                className="material-button--danger"
                onClick={() => setResetDialogOpen(true)}
              >
                <Icon name="delete_forever" size={18} slot="icon" />
                清空数据并重置
              </FilledButton>
            </div>
          </div>
        </section>
      )}

      {/* Import Confirmation Dialog */}
      <ConfirmDialog
        open={pendingImport !== null}
        title="确认导入工作区数据"
        message={`将从「${pendingImport?.name ?? "快照文件"}」导入完整数据。当前工作区将被整体替换，正在运行的番茄钟会被清空。是否继续？`}
        confirmLabel="导入并替换"
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmImport}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={resetDialogOpen}
        title="危险操作：清空所有数据"
        message="确定要清空全部工作区数据并重新开始吗？该操作不可逆，请确保已有本地快照或云端备份！"
        confirmLabel="确认清空并重置"
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => void handleResetAll()}
      />

      {/* 添加自定义服务商弹窗 */}
      <Dialog
        open={addCustomDialogOpen}
        onClose={() => setAddCustomDialogOpen(false)}
        title="添加自定义 AI 服务商"
        icon="add_circle"
        actions={
          <div className="row items-center gap-8">
            <TextButton onClick={() => setAddCustomDialogOpen(false)}>取消</TextButton>
            <FilledButton
              disabled={!newCustomName.trim()}
              onClick={handleAddCustomProvider}
            >
              <Icon name="check" size={18} slot="icon" />
              添加并切换
            </FilledButton>
          </div>
        }
      >
        <div className="col gap-12" style={{ minWidth: 320, paddingTop: 8 }}>
          <OutlinedTextField
            label="服务商名称"
            value={newCustomName}
            onInput={(e) => setNewCustomName(eventValue(e))}
            placeholder="例如 Groq、通义千问、公司内网大模型"
            required
            autoFocus
          />
          <OutlinedTextField
            label="接口地址 (Base URL)"
            value={newCustomBaseUrl}
            onInput={(e) => setNewCustomBaseUrl(eventValue(e))}
            placeholder="例如 https://api.groq.com/openai/v1"
            supportingText="必须支持 OpenAI /chat/completions 兼容格式"
          />
          <OutlinedTextField
            label="默认模型名称 (可选)"
            value={newCustomModel}
            onInput={(e) => setNewCustomModel(eventValue(e))}
            placeholder="例如 llama-3.3-70b-versatile"
          />
        </div>
      </Dialog>

      {/* 重命名自定义服务商弹窗 */}
      <Dialog
        open={renameCustomDialogOpen}
        onClose={() => {
          setRenameCustomDialogOpen(false);
          setRenameCustomTarget(null);
          setRenameCustomName("");
        }}
        title="重命名自定义服务商"
        icon="edit"
        actions={
          <div className="row items-center gap-8">
            <TextButton
              onClick={() => {
                setRenameCustomDialogOpen(false);
                setRenameCustomTarget(null);
                setRenameCustomName("");
              }}
            >
              取消
            </TextButton>
            <FilledButton
              disabled={!renameCustomName.trim()}
              onClick={handleRenameCustomProvider}
            >
              <Icon name="check" size={18} slot="icon" />
              保存
            </FilledButton>
          </div>
        }
      >
        <div className="col gap-12" style={{ minWidth: 320, paddingTop: 8 }}>
          <OutlinedTextField
            label="服务商名称"
            value={renameCustomName}
            onInput={(e) => setRenameCustomName(eventValue(e))}
            placeholder="请输入服务商名称"
            required
            autoFocus
          />
        </div>
      </Dialog>

      {/* 删除自定义服务商确认弹窗 */}
      <ConfirmDialog
        open={deleteCustomTarget !== null}
        title="删除自定义服务商"
        message={`确定要删除自定义服务商「${deleteCustomTarget?.name ?? ""}」吗？其已保存的接口地址与密钥配置也将被移除。`}
        confirmLabel="确认删除"
        danger
        icon="delete"
        onCancel={() => setDeleteCustomTarget(null)}
        onConfirm={() => {
          if (deleteCustomTarget) {
            handleDeleteCustomProvider(deleteCustomTarget);
          }
        }}
      />
    </div>
  );
}
