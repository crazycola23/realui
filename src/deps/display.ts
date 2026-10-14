import { GEO_ENUM_LABELS, GEO_STATUS_LABELS } from '#/api/geo/contracts';

/**
 * GEO 页面共用的中文展示词。
 *
 * 接口仍然使用后端约定的英文编码；页面只在这里做一次展示转换，
 * 避免工作台、复盘和操作记录各自维护一份容易漂移的词表。
 */
export const GEO_PERMISSION_LABELS: Record<string, string> = {
  'geo:action:confirm': '操作确认',
  'geo:audit:export': '导出操作记录',
  'geo:audit:view': '查看操作记录',
  'geo:budget:release': '批准预算使用',
  'geo:budget:view': '费用查看',
  'geo:content:create': '创建内容任务',
  'geo:content:delete': '删除已停用内容任务',
  'geo:content:regenerate': '失败内容重生成',
  'geo:content:view': '内容查看',
  'geo:library:manage': '跨项目图库管理',
  'geo:cost:confirm': '扣费确认',
  'geo:detect:execute': '检测执行',
  'geo:evidence:create': '资料上传',
  'geo:fact:customer:bind': '绑定客户事实到项目',
  'geo:fact:customer:edit': '编辑客户共享事实',
  'geo:fact:customer:view': '查看客户共享事实',
  'geo:fact:edit': '内容要素维护',
  'geo:member:manage': '成员与权限管理',
  'geo:media-catalog:sync': '立即同步媒体目录',
  // T-OPEN-40 独立成码；文案取自 07-权限码与路由清单.md:98 的 label。
  'geo:model-status:view': '模型状态测试',
  'geo:project:archive': '归档项目',
  'geo:project:create': '创建项目',
  'geo:project:delete': '删除项目',
  'geo:project:edit': '编辑项目',
  'geo:project:restore': '恢复项目',
  // T-OPEN-35 / G-28：缺这一条，审计页的权限拒绝记录会显示成「缺少：未知权限」。
  'geo:platform-account:launch': '打开客户平台账号',
  'geo:publish:cancel': '取消发布',
  'geo:publish:confirm': '发布确认',
  'geo:publish:republish': '重新发布',
  'geo:question:enable': '问题启用',
  'geo:report:confirm': '复盘报告确认',
  'geo:report:create': '创建复盘报告',
  'geo:report:external': '报告发送到外部渠道',
};

export const GEO_ACTION_LABELS: Record<string, string> = {
  CONTENT_SCALE_CONFIRMED: '批量生成已确认',
  CONTENT_SLOT_REGENERATED: '内容项已重新生成',
  SCORE_SNAPSHOT_CREATED: '评分记录已创建',
  // T-OPEN-35 / G-28。措辞刻意是「已签发打开动作」而不是「已打开客户平台账号」：
  // GEO 只签发了一个协议链接，既不能保证浏览器真的起来，更不知道用户在平台上
  // 做了什么。把"已签发"说成"已打开"是对外说过头了（05 §17 事实边界）。
  PLATFORM_ACCOUNT_BOUND: '客户平台账号已绑定',
  PLATFORM_ACCOUNT_REBOUND: '客户平台账号绑定已变更',
  PLATFORM_ACCOUNT_UNBOUND: '客户平台账号绑定已解除',
  PLATFORM_ACCOUNT_LAUNCHED: '已签发打开客户平台账号的动作',
};

export const GEO_REFERENCE_TYPE_LABELS: Record<string, string> = {
  ArticleVersion: '文章',
  FactRevision: '资料',
  Project: '项目',
  Question: '问题',
  ReportRevision: '复盘报告',
};

export const GEO_OBJECT_TYPE_LABELS: Record<string, string> = {
  Action: '行动项',
  ArticleVersion: '文章',
  BudgetReservation: '预算预留',
  ContentTask: '内容任务',
  Customer: '客户',
  DetectRecord: '检测结果',
  DetectionAttempt: '检测执行',
  DetectionPlan: '检测计划',
  ExpenseLedgerEntry: '费用台账',
  FactRevision: '资料',
  Project: '项目',
  PublishRecord: '发布记录',
  PublishTarget: '发布目标',
  Question: '问题',
  ReportRevision: '复盘报告',
  ScoreSnapshot: '评分记录',
};

export const GEO_METRIC_LABELS: Record<string, string> = {
  content: '内容生成',
  detection: '检测执行',
  publish: '发布记录',
};

export const GEO_SELECTION_REASON_LABELS: Record<string, string> = {
  high_priority_all: '高优先级全部纳入',
  indexed_all: '收录范围全部纳入',
  low_priority_sampled: '低优先级抽样纳入',
  manual_recheck: '手动补测',
};

export const GEO_AUDIT_SCOPE_LABELS: Record<string, string> = {
  project: '项目范围',
  role: '角色范围',
  tenant: '租户范围',
  unavailable: '范围不可用',
};

export const GEO_CURRENCY_LABELS: Record<string, string> = {
  CNY: '人民币',
  RMB: '人民币',
  USD: '美元',
  EUR: '欧元',
  JPY: '日元',
  GBP: '英镑',
};

/** 渠道变体没有单独的后端枚举；已知编码在展示层落成中文，历史自定义中文值照常保留。 */
export const GEO_CHANNEL_VARIANT_LABELS: Record<string, string> = {
  official_site: '官网渠道',
};

export const GEO_SENSITIVITY_REASON_LABELS: Record<string, string> = {
  credential_or_secret: '疑似凭据或密钥',
  internal_infrastructure: '疑似内部基础设施信息',
};

/**
 * 判断一段文本是否已经包含中文。未知的客户标题、来源原文和平台名称
 * 不能被前端擅自翻译；对于枚举/状态字段则使用中文兜底，避免原始英文泄漏。
 */
export function hasChineseText(value?: null | string) {
  return Boolean(value?.trim() && /\p{Script=Han}/u.test(value));
}

export function geoLabelOrFallback(
  value?: null | string,
  fallback = '未知选项',
) {
  const normalized = value?.trim();
  return normalized && hasChineseText(normalized) ? normalized : fallback;
}

/** 按契约枚举编码取展示名，并兼容历史接口大小写不一致的返回值。 */
export function geoEnumLabel(
  group: keyof typeof GEO_ENUM_LABELS,
  value?: null | string,
  fallback = '未知选项',
) {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  const labels = GEO_ENUM_LABELS[group] as Record<string, string>;
  const exact = labels[normalized];
  if (exact) return exact;
  const entry = Object.entries(labels).find(
    ([code]) => code.toLowerCase() === normalized.toLowerCase(),
  );
  return entry?.[1] ?? geoLabelOrFallback(normalized, fallback);
}

/** 按契约状态编码取展示名，并兼容大小写不一致的旧数据。 */
export function geoStatusLabel(
  group: keyof typeof GEO_STATUS_LABELS,
  value?: null | string,
  fallback = '未知状态',
) {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  const labels = GEO_STATUS_LABELS[group] as Record<string, string>;
  const exact = labels[normalized];
  if (exact) return exact;
  const entry = Object.entries(labels).find(
    ([code]) => code.toLowerCase() === normalized.toLowerCase(),
  );
  return entry?.[1] ?? geoLabelOrFallback(normalized, fallback);
}

/**
 * 媒体目录的同步状态。后端以英文大写在传，页面一律走这里转换，
 * 不得把原始编码渲染给运营（历史问题：媒体管理页直接显示了 SUSPECT）。
 *
 * SUSPECT 的业务含义：媒体方本次全量同步未再返回该媒体，系统暂予保留、
 * 仍允许发布，但需要人工核查是否已下架。因此它的中文要同时表达「仍可用」
 * 和「需核查」，不能简单译成「异常」。
 */
export const GEO_CATALOG_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '可用',
  DEGRADED: '数据暂时降级',
  FAILED: '数据同步失败',
  INACTIVE: '暂不可用',
  NOT_SYNCED: '尚未同步',
  PARTIAL: '数据未完整更新',
  READY: '数据已就绪',
  SUSPECT: '可用（待核查）',
  SYNCING: '数据更新中',
};

/** 目录状态的展示色调；与中文词表一一对应，只参与展示，不参与状态机。 */
export const GEO_CATALOG_STATUS_TONES: Record<string, string> = {
  ACTIVE: 'success',
  DEGRADED: 'warning',
  FAILED: 'error',
  INACTIVE: 'neutral',
  NOT_SYNCED: 'neutral',
  PARTIAL: 'warning',
  READY: 'success',
  SUSPECT: 'warning',
  SYNCING: 'primary',
};

export function geoCatalogStatusLabel(
  value?: null | string,
  fallback = '目录状态未知',
) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return fallback;
  return GEO_CATALOG_STATUS_LABELS[normalized] ?? fallback;
}

export function geoCatalogStatusTone(value?: null | string) {
  const normalized = value?.trim().toUpperCase() ?? '';
  return GEO_CATALOG_STATUS_TONES[normalized] ?? 'neutral';
}

export function geoMetricLabel(value?: null | string) {
  const normalized = value?.trim().toLowerCase();
  return (normalized && GEO_METRIC_LABELS[normalized]) || '业务操作';
}

export function geoSelectionReasonLabel(value?: null | string) {
  const normalized = value?.trim().toLowerCase();
  return (
    (normalized && GEO_SELECTION_REASON_LABELS[normalized]) ||
    geoLabelOrFallback(normalized, '系统筛选')
  );
}

export function geoAuditScopeLabel(value?: null | string) {
  const normalized = value?.trim().toLowerCase();
  return (
    (normalized && GEO_AUDIT_SCOPE_LABELS[normalized]) ||
    geoLabelOrFallback(normalized, '范围待确认')
  );
}

export function geoCurrencyLabel(value?: null | string) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return '—';
  return GEO_CURRENCY_LABELS[normalized] || '未知币种';
}

export function geoChannelVariantLabel(value?: null | string) {
  const normalized = value?.trim().toLowerCase();
  return (
    (normalized && GEO_CHANNEL_VARIANT_LABELS[normalized]) ||
    geoLabelOrFallback(value, '渠道待确认')
  );
}

export function geoSensitivityReasonLabel(value?: null | string) {
  const normalized = value?.trim().toLowerCase();
  return (
    (normalized && GEO_SENSITIVITY_REASON_LABELS[normalized]) ||
    geoLabelOrFallback(normalized, '策略待确认')
  );
}

/**
 * 把第三方/网关常见的英文异常转换成用户能处理的中文提示。
 * 业务正文、来源引用和 Provider/模型名称不走这个函数，避免改变真实数据。
 */
export function geoReadableMessage(
  value?: null | string,
  fallback = '服务暂时异常，请稍后重试。',
) {
  const text = value?.replaceAll(/[\r\n\t]+/g, ' ').trim();
  if (!text) return fallback;
  const normalized = text.toLowerCase();
  if (
    /doubao_submission_failed|page did not confirm submission/.test(normalized)
  ) {
    return '提交结果未确认，请稍后查看。';
  }
  if (/network_error/.test(normalized)) return '连接异常，暂未取得结果。';
  if (/not_collected/.test(normalized)) return '暂无结果';
  // 混合中文与 JSON 的错误不能因含中文就整段透出。
  if (
    /provider\s+result\s+unknown|provider\s*结果未知|providererrorclass\s*=\s*service_unavailable|完成\s*provider\s*状态核查前禁止重试/.test(
      normalized,
    )
  ) {
    return '大模型请求中断，AI 服务结果尚未确认；请先到 AI 服务商后台核查，再决定是否重试。';
  }
  if (
    /geo-42401|上次\s*ai\s*请求结果未确认|provider\s*状态核查后才能重试/.test(
      normalized,
    )
  ) {
    return '上次大模型请求结果尚未确认，请先到 AI 服务商后台核查，再决定是否重试。';
  }
  if (
    /request\s+cancell?ed|http(?:client)?timeoutexception|timed?\s*out|\btimeout\b/.test(
      normalized,
    )
  ) {
    return '请求超时，本次操作的结果尚未确认，请稍后刷新查看。';
  }
  if (
    /failed\s+to\s+fetch|network\s+error|connection\s+refused|i\/o\s+error|rpc\s+(?:exception|error)|service\s+unavailable/.test(
      normalized,
    )
  ) {
    return '服务暂时不可用，请稍后重试。';
  }
  if (
    /provider_empty_data|响应\s*data\s*(?:为空|null)|缺少\s*data\s*数组/.test(
      normalized,
    )
  ) {
    return '媒体方本页没有返回媒体数据，系统已记录并会自动重试；如果仍然失败，请联系技术支持排查。';
  }
  if (/unauthori[sz]ed|forbidden|permission\s+denied/.test(normalized)) {
    return '当前账号没有执行该操作的权限。';
  }
  if (
    /insufficient\s+(?:funds|balance)|balance\s+insufficient/.test(normalized)
  ) {
    return '可用余额不足，请先处理预算后再重试。';
  }
  // 网关与框架层的校验文案是给排障看的，不是给用户看的文案。
  // 「有中文就原样透出」的兜底会让 Spring 的「请求参数格式错误」直接出现在
  // 产品界面上（`G-45`），而用户既看不懂也无法处理，只能刷新或找客服。
  if (
    /请求参数格式错误|参数\s*(?:校验|解析|转换|绑定)?失败|failed\s+to\s+convert|type\s+mismatch|cannot\s+deserialize|invalid\s+format|bad\s+request|http\s+400|\b400\b/.test(
      normalized,
    )
  ) {
    return '请求未能提交，请稍后重试；如果反复出现，请联系技术支持并提供操作时间。';
  }
  if (/\{[\s\S]*"(?:code|message)"\s*:/.test(text)) return fallback;
  return hasChineseText(text) ? text : fallback;
}

/**
 * 将历史页面仍在使用的 Ant Design 颜色名归一为 GEO 的语义标签色。
 * 组件只接收最终的 class，不再把 preset color 直接交给 Antdv，避免
 * blue/green 等固定调色板穿透 GEO 主题。
 */
export type GeoStatusTone =
  | 'error'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning';

const GEO_STATUS_TONE_ALIASES: Record<string, GeoStatusTone> = {
  blue: 'primary',
  cyan: 'primary',
  default: 'neutral',
  error: 'error',
  gold: 'warning',
  geekblue: 'primary',
  green: 'success',
  grey: 'neutral',
  gray: 'neutral',
  info: 'info',
  lime: 'success',
  magenta: 'primary',
  neutral: 'neutral',
  orange: 'warning',
  pink: 'primary',
  processing: 'primary',
  primary: 'primary',
  purple: 'primary',
  red: 'error',
  success: 'success',
  volcano: 'error',
  warning: 'warning',
};

export function geoStatusTagClass(value?: null | string) {
  const normalized = value?.trim().toLowerCase() ?? '';
  const tone = GEO_STATUS_TONE_ALIASES[normalized] ?? 'neutral';
  return `geo-status-tag--${tone}`;
}

/**
 * 事实类型是后端稳定编码，允许 AI 产出新值；页面不得把编码直接展示给用户。
 * 未知的英文编码统一归入“其他事实”，中文自定义值则保留原文。
 */
export const GEO_FACT_TYPE_LABELS: Record<string, string> = {
  applicable_scenario: '适用场景',
  brand_positioning: '品牌定位',
  capability: '产品能力',
  case: '案例',
  case_detail: '案例详情',
  comparison_dimension: '对比维度',
  customer: '客户',
  customer_pain: '客户痛点',
  customer_profile: '客户画像',
  differentiator: '差异化优势',
  example: '示例',
  expert_insight: '专家观点',
  fact: '事实',
  feature: '功能特性',
  integration: '集成能力',
  limitation: '限制说明',
  marketing_claim: '营销说明',
  mechanism: '工作机制',
  objection: '常见疑问',
  performance_claim: '性能说明',
  policy: '策略规则',
  pricing: '价格信息',
  process: '业务流程',
  product: '产品',
  product_capability: '产品能力',
  product_category: '产品分类',
  product_feature: '产品特性',
  product_value: '产品价值',
  quote: '原话引用',
  recommendation: '建议',
  security_test: '安全验证',
  service_capability: '服务能力',
  statistic: '统计数据',
  support: '服务支持',
  target_customer: '目标客户',
  unique_term: '专有术语',
  use_case: '使用场景',
};

export function geoPermissionLabel(
  code?: null | string,
  fallback = '未知权限',
) {
  const normalized = code?.trim().toLowerCase();
  const entry = Object.entries(GEO_PERMISSION_LABELS).find(
    ([value]) => value.toLowerCase() === normalized,
  );
  return entry?.[1] ?? fallback;
}

export function geoActionLabel(code: string, fallback = '未知操作') {
  const normalized = code?.trim().toUpperCase();
  const entry = Object.entries(GEO_ACTION_LABELS).find(
    ([value]) => value.toUpperCase() === normalized,
  );
  return entry?.[1] ?? fallback;
}

export function geoReferenceTypeLabel(
  type?: null | string,
  fallback = '待关联',
) {
  const normalized = type?.trim();
  if (!normalized) return fallback;
  const entry = Object.entries(GEO_REFERENCE_TYPE_LABELS).find(
    ([value]) => value.toLowerCase() === normalized.toLowerCase(),
  );
  return entry?.[1] ?? fallback;
}

export function geoObjectTypeLabel(type?: null | string) {
  const normalized = type?.trim();
  if (!normalized) return '未知对象';
  const entry = Object.entries(GEO_OBJECT_TYPE_LABELS).find(
    ([value]) => value.toLowerCase() === normalized.toLowerCase(),
  );
  return entry?.[1] ?? '未知对象';
}

/** 评分/策略等规则版本号在界面上统一显示为中文。 */
/**
 * 已知规则版本机器标识 → 中文名。
 *
 * <p>这些取值由后端常量直接落库，没有中文也没有「vN」这类可解析的形态
 * （如 `GeoDetectionProperties.ruleVersion = "detect-plan-v1"`、
 * 内容生成任务写入的 `content-generation-task-v1`）。不登记就会落到
 * 「规则版本待确认」兜底，把「已知版本」显示成「未知」。</p>
 */
export const GEO_RULE_VERSION_LABELS: Record<string, string> = {
  'content-generation-task-v1': '内容生成规则第1版',
  'detect-plan-v1': '检测方案第1版',
};

export function geoRuleVersionLabel(value?: null | string) {
  const text = value?.trim();
  if (!text) return '—';
  const scoreMatch = text.match(/^(?:Score\s+v|评分规则\s*v)(\d+)$/i);
  if (scoreMatch) return `评分规则第${scoreMatch[1]}版`;
  const strategyMatch = text.match(/^(?:Strategy\s+v|策略规则\s*v)(\d+)$/i);
  if (strategyMatch) return `策略规则第${strategyMatch[1]}版`;
  const known = GEO_RULE_VERSION_LABELS[text.toLowerCase()];
  if (known) return known;
  return hasChineseText(text)
    ? text
    : geoLabelOrFallback(text, '规则版本待确认');
}

export function geoFactTypeLabel(type?: null | string, fallback = '其他事实') {
  const value = type?.trim();
  if (!value) return fallback;

  const normalized = value.toLowerCase().replaceAll(/[\s-]+/g, '_');
  return (
    GEO_FACT_TYPE_LABELS[normalized] ??
    (/\p{Script=Han}/u.test(value) ? value : fallback)
  );
}
