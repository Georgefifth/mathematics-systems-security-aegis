# Stage 5 — Submission Package Evidence: AegisAgent

- **Hackathon**: Mathematics for Systems Security ([Devpost](https://mathematics-systems-security.devpost.com/))
- **Submission Package Location**: `submission/`
- **Submission Preparation Date**: 2026-11-01
- **Status**: Complete Submission Package Ready for Human Submitter

---

## 1. 提交材料目录与素材验证 (Submission Artifacts)

```
submission/
├── fields.md                  # Devpost 完整表单字段（标题、Tagline、完整 Markdown 描述、标签、链接）
├── checklist.md               # 人类提交操作 5 分钟逐项检查清单
└── assets/
    ├── thumbnail.png          # 1200×800 px (3:2 比例), 794 KB, 高清暗黑密码学视觉
    ├── demo.mp4               # 1080p 60fps (95.2s), 完整英文旁白、高亮字幕、音效与背景音乐
    ├── gallery-01-enclave-vault.png
    ├── gallery-02-sidechannel-dudect.png
    ├── gallery-03-agent-gateway.png
    ├── gallery-04-prompt-injection-defense.png
    ├── gallery-05-latex-specifications.png
    └── gallery-06-architecture-topology.png
```

### 素材规格核对

| 文件 | 尺寸 / 比例 | 文件大小 | 格式 | 验证状态 |
|---|---|---|---|---|
| `thumbnail.png` | 1200×800 (3:2) | 794 KB | PNG | ✅ 符合 Devpost 建议比例与 &lt; 5MB 要求 |
| `demo.mp4` | 1920×1080 (16:9) | 13.0 MB | H.264 / AAC | ✅ 1080p 高清，音画字幕同步，可直传 YouTube |
| `gallery-01` ~ `06` | 1200×800 (3:2) | 245 KB ~ 715 KB | PNG | ✅ 均小于 5MB，附英文说明 (&le; 150 字符) |

---

## 2. 公开链接连通性验证 (Link Verification)

| 目标链接 | 作用 | HTTP 状态码 | 真实浏览器验证 |
|---|---|---|---|
| `https://web-eta-bice-53.vercel.app` | 在线交互式 Web 演示应用 | **200 OK** | ✅ Playwright 验证全流程交互正常 |
| `https://github.com/Georgefifth/mathematics-systems-security-aegis` | 官方开源代码仓库 | **200 OK** | ✅ 干净仓库，无敏感信息 |
| `https://mathematics-systems-security.devpost.com/` | Devpost 比赛主页 | **200 OK** | ✅ 提交入口正常开放 |

---

## 3. 核心能力与 Stage 3.5 证据一致性审查 (Consistency Check)

提交材料中的所有指标与技术结论严格与 Stage 3.5 真实世界评测证据对齐：
- **侧信道时延消除**：Aegis-SSS 在 Dudect 双样本测试中实测 $|t| = 0.398 < 4.5$，而主流竞品 `c0dearm/sharks` 实测 $|t| = 27.16 \gg 4.5$ 发生严重缓存泄露；
- **凭据格式兼容性**：在 OpenAI 164-char Project Key、AWS 40-char Key、Gemini、Anthropic、PEM 及 Unicode 等 9 种工业格式中均实现 100% 比特级无损还原；
- **提示词注入防御**：在 OWASP Top 10 及越狱攻击样本下，智能体运行时主密钥泄露量为严格的 **0 Bytes**，瞬态合成窗口 $< 5\mu s$ 并自动执行 `zeroize`。

---

## 4. 人类操作说明 (Human Action Required)

根据 AGENTS.md 规则，AI 不得代为注册或点击 Devpost 提交：
1. 打开 `submission/checklist.md`；
2. 按照清单在 YouTube 上传 `submission/assets/demo.mp4`；
3. 将 `submission/fields.md` 中的内容复制到 Devpost 提交页面；
4. 点击 **Submit** 完成最终参赛提交。
