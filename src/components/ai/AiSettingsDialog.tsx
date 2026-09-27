import { useEffect, useState } from "react";
import {
  AI_PROVIDER_PRESETS,
  getAiProviderPreset,
  testAiConnection,
  type AiProviderKey,
  type TestAiConnectionResult,
} from "@task-orbit/core";
import { useStore } from "../../store/store";
import { Icon } from "../Icon";
import { AiProviderIcon } from "../icons/AiProviderIcon";
import {
  CircularProgress,
  FilledButton,
  IconButton,
  OutlinedButton,
  OutlinedSelect,
  OutlinedTextField,
  SelectOption,
  Slider,
  Switch,
  TextButton,
  eventValue,
} from "../material";
import { Dialog, useSnackbar } from "../ui";

export interface AiSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AiSettingsDialog({ open, onClose }: AiSettingsDialogProps) {
  const store = useStore();
  const { show } = useSnackbar();
  const aiSettings = store.state.aiSettings;

  const [enabled, setEnabled] = useState(aiSettings.enabled);
  const [provider, setProvider] = useState<AiProviderKey>(aiSettings.provider);
  const [baseUrl, setBaseUrl] = useState(aiSettings.baseUrl);
  const [apiKey, setApiKey] = useState(aiSettings.apiKey);
  const [model, setModel] = useState(aiSettings.model);
  const [temperature, setTemperature] = useState(aiSettings.temperature);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestAiConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync draft state with store state when opened
  useEffect(() => {
    if (open) {
      setEnabled(aiSettings.enabled);
      setProvider(aiSettings.provider);
      setBaseUrl(aiSettings.baseUrl);
      setApiKey(aiSettings.apiKey);
      setModel(aiSettings.model);
      setTemperature(aiSettings.temperature);
      setTestResult(null);
      setError(null);
      setShowApiKey(false);
    }
  }, [open, aiSettings]);

  const handleProviderChange = (newProvider: AiProviderKey) => {
    setProvider(newProvider);
    setTestResult(null);
    const preset = getAiProviderPreset(newProvider);
    if (preset && newProvider !== "custom") {
      setBaseUrl(preset.baseUrl);
      setModel(preset.defaultModel);
    }
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setError("请填写接口地址 (Base URL)");
      return;
    }
    if (!model.trim()) {
      setError("请填写模型名称");
      return;
    }
    setError(null);
    setTesting(true);
    setTestResult(null);

    try {
      const res = await testAiConnection({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
      });
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        message: `测试异常：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (enabled && !baseUrl.trim()) {
      setError("启用 AI 助理时必须填写接口地址");
      return;
    }
    if (enabled && !model.trim()) {
      setError("启用 AI 助理时必须填写模型名称");
      return;
    }

    store.updateAiSettings({
      enabled,
      provider,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      temperature,
    });
    show("AI 助理配置已保存");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="AI 助理设置"
      icon="smart_toy"
      wide
      actions={
        <div className="row gap-8">
          <TextButton onClick={onClose}>取消</TextButton>
          <FilledButton onClick={handleSave}>保存配置</FilledButton>
        </div>
      }
    >
      <div className="col gap-16" style={{ minWidth: 460 }}>
        {/* Enable switch */}
        <div className="row items-center justify-between">
          <div>
            <div className="body-md">启用 AI 任务助理</div>
            <div className="body-xs muted">
              允许在收集箱整理、日程排期和效能分析中调用大语言模型进行辅助规划
            </div>
          </div>
          <Switch
            selected={enabled}
            onChange={(e) => {
              const next = (e.target as unknown as { selected: boolean }).selected;
              setEnabled(next);
            }}
          />
        </div>

        {/* Provider preset selector */}
        <div className="field">
          <OutlinedSelect
            label="服务提供商 / 预设"
            value={provider}
            onChange={(e) => handleProviderChange(eventValue(e) as AiProviderKey)}
            menuPositioning="fixed"
          >
            <span slot="leading-icon" style={{ display: "inline-flex", alignItems: "center" }}>
              <AiProviderIcon provider={provider} size={20} />
            </span>
            {AI_PROVIDER_PRESETS.map((p) => (
              <SelectOption key={p.id} value={p.id} selected={provider === p.id}>
                <span
                  slot="start"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <AiProviderIcon provider={p.id} size={20} />
                </span>
                <span slot="headline">{p.name}</span>
              </SelectOption>
            ))}
          </OutlinedSelect>
        </div>

        {/* Base URL */}
        <div className="field">
          <OutlinedTextField
            label="接口地址 (Base URL)"
            value={baseUrl}
            onInput={(e) => {
              setBaseUrl(eventValue(e));
              setError(null);
            }}
            placeholder="例如 https://api.deepseek.com/v1 或 http://localhost:11434/v1"
            supportingText="必须支持 OpenAI /chat/completions 兼容格式"
          />
        </div>

        {/* API Key */}
        <div className="field">
          <div style={{ position: "relative" }}>
            <OutlinedTextField
              label="API Key"
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onInput={(e) => {
                setApiKey(eventValue(e));
                setError(null);
              }}
              placeholder="sk-..."
              supportingText="密钥仅保存在本地设备，导出备份时自动脱敏抹除"
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

        {/* Model name & Temperature */}
        <div className="field__row">
          <div className="field" style={{ flex: 2 }}>
            <OutlinedTextField
              label="模型名称 (Model Name)"
              value={model}
              onInput={(e) => {
                setModel(eventValue(e));
                setError(null);
              }}
              placeholder="例如 deepseek-chat 或 gpt-4o-mini"
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <OutlinedTextField
              label="温度 (Temperature)"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={String(temperature)}
              onInput={(e) => {
                const val = parseFloat(eventValue(e));
                if (!isNaN(val)) setTemperature(val);
              }}
              supportingText="默认 0.7"
            />
          </div>
        </div>

        {/* Error message */}
        {error && <div className="error-text body-sm">{error}</div>}

        {/* Test connection result notice */}
        {testResult && (
          <div
            className={`app-notice ${testResult.ok ? "app-notice--info" : "app-notice--error"}`}
            style={{ position: "relative", top: 0, padding: "8px 12px", borderRadius: 8 }}
          >
            <div className="row items-center gap-8">
              <Icon
                name={testResult.ok ? "check_circle" : "error"}
                size={18}
                style={{ color: testResult.ok ? "var(--md-primary)" : "var(--md-error)" }}
              />
              <span className="body-xs" style={{ flex: 1 }}>
                {testResult.message}
              </span>
            </div>
          </div>
        )}

        {/* Test Connection Button */}
        <div className="row items-center justify-between mt-8">
          <div className="body-xs muted">
            配置修改后，建议点击测试连接验证端点是否可达。
          </div>
          <OutlinedButton onClick={handleTestConnection} disabled={testing}>
            {testing ? (
              <CircularProgress indeterminate style={{ width: 16, height: 16 }} slot="icon" />
            ) : (
              <Icon name="network_check" size={18} slot="icon" />
            )}
            测试连接
          </OutlinedButton>
        </div>
      </div>
    </Dialog>
  );
}
