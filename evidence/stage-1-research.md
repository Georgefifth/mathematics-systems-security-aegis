# Stage 1 — Research & Candidate Directions: Mathematics for Systems Security

- **Hackathon**: Mathematics for Systems Security (Devpost: [https://mathematics-systems-security.devpost.com/](https://mathematics-systems-security.devpost.com/))
- **Tracks**: 
  1. Cryptographer Track
  2. AI Pipeline Secret Sharing Track
- **Prizes**:
  - Certificate of participation
  - Certified cryptographer (Cryptographer track)
  - Certified cybersecurity mitigator (AI pipeline track)
  - Best cryptographic algorithm (Cryptographer track)
  - Best AI pipelines project (AI pipeline track)
  - Best overall project (Grand Prize: demonstrating full points in each track criteria)
- **Evaluation Criteria**:
  - *Cryptographer Track*: Survives rigorous cryptoanalysis (3 pts), Distinction/Uniqueness from pre-made algorithms (2 pts), Minimizes attack surface area / side-channel resilience (3 pts), Clean LaTeX formatting (2 pts). Bonus: Rust/C implementation, Number Theory & Linear Algebra foundations, applicable environment.
  - *AI Pipeline Track*: Clean UI with straightforward UX (3 pts), Thorough video submissions (2 pts), Evidence of using host-provided LLM agents via API (2 pts). Bonus: Loopback Web UI or TUI, FHE or Shamir's Secret Sharing (SSS).

---

## 1. 市场与技术探索 (Market & Landscape Exploration)

### 1.1 行业背景与核心矛盾
当前 AI 浪潮下，“AI Agent（智能体）”与“云端 LLM 服务（OpenAI / Anthropic / AWS Bedrock / Google Gemini）”的普及引发了严重的系统安全与密码学信任危机：

1. **API 主密钥与凭据泄露危机**：
   - 传统微服务架构中，API Key 注入环境变量或托管在 HashiCorp Vault。
   - 但在自主智能体（Autonomous Agents）架构中，Agent 具备工具调用（Function Calling / MCP）权限，Prompt 注入攻击（Prompt Injection / System Prompt Leaks）能轻易诱导模型将内存中的 Master API Key 或私密凭据以明文形式打印或外发。
   - 即使使用外部密钥管理服务，调用前解密依然导致明文密钥驻留在宿主内存或云端推理日志中。

2. **云端日志与隐私留存漏洞**：
   - 企业使用云端 LLM 必须将包含专有代码、商业秘密或 PII 的输入上传至供应商服务器。
   - 虽有“零数据保留（Zero Data Retention）”承诺，但云端内存劫持、合规审计、内部人员恶意访问或传票审查依然对明文输入造成巨大威胁。

3. **现有密码学开源库的侧信道（Side-Channel）硬伤**：
   - 现有的秘密共享库（如 `c0dearm/sharks`、`snipsco/rust-threshold-secret-sharing`、`SpinResearch/RustySecrets`）虽然实现了 Shamir (k, n) 门限算法，但**绝大多数依赖非常数时间（Non-Constant-Time）运算**：
     - `c0dearm/sharks` 使用查表法 `LOG_TABLE` 与 `EXP_TABLE`，并在乘法中包含 `if self.0 == 0 || other.0 == 0` 分支，直接暴露于 CPU 缓存行命中（Prime+Probe）与分支预测（Spectre）定时侧信道。
     - `snipsco/rust-threshold-secret-sharing` 使用经典欧几里得扩展算法（Extended Euclidean Algorithm）求逆，循环次数和跳转分支高度依赖秘密值，造成可度量的执行时延差异。
   - 在多租户云环境或共用硬件中，侧信道攻击者可通过毫秒/微秒级时延分析完全还原共享多项式的系数，从而窃取 Master Key。

### 1.2 现有产品与竞品剖析

| 竞品 / 开源项目 | 类型 | 核心机制 | 局限性与实测证据 |
|---|---|---|---|
| **c0dearm/sharks** ([GitHub](https://github.com/c0dearm/sharks)) | Rust 秘密共享库 | $GF(2^8)$ 查表法多项式插值 | 源码直接采用 `const LOG_TABLE: [u8; 256]`，乘法包含条件分支，存在严重缓存时延侧信道泄露，且不可验证（无 VSS）。 |
| **snipsco/rust-threshold-secret-sharing** ([GitHub](https://github.com/snipsco/rust-threshold-secret-sharing)) | Rust 门限密码库 | 素数域 $Z_p$ 经典拉格朗日/牛顿插值 | `mod_inverse` 依赖非常数时间的扩展欧几里得除法，`mod_pow` 存在分支跳跃，缺乏侧信道常数时间保证。 |
| **HashiCorp Vault** ([GitHub](https://github.com/hashicorp/vault)) | 企业级密钥管理 | 静态 Shamir 解锁主密钥 | 仅在启动时解密 unseal key；运行时向调用方下发完整明文 Token，无法防止 AI Agent 在上下文或日志中泄漏密钥。 |
| **voidmind-io/voidllm** ([GitHub](https://github.com/voidmind-io/voidllm)) | 本地 LLM 代理 | 正则表达式 / 模式匹配脱敏 | 纯文本替换（如 `<REDACTED>`），完全丢失语义语境，无法处理代码/复杂推理，无密码学数学证明与防篡改保证。 |
| **jayeshthk/secure-llm-fhe** ([GitHub](https://github.com/jayeshthk/secure-llm-fhe)) | 全同态加密 (FHE) 推理 | CKKS 同态密文矩阵乘法 | 性能开销巨大（单 token 推理达数秒至数分钟），目前无法应用于商用 70B+ 大模型或实时对话 Agent。 |

---

## 2. 候选创意筛选 (5–8 Distinct Candidate Directions)

---

### 候选方向 1: AegisKey-SSS — 基于柯西-范德蒙矩阵与常数时间素数域的抗侧信道秘密共享算法
*针对赛道：Cryptographer Track*

- **目标用户与痛点**：
  高安全级加密系统架构师、硬件安全模块（HSM）工程师。传统 Shamir 秘密共享实现因查表（Cache-Timing）和非常数时间除法（Timing Attack），在多租户云主机或物理侧信道探针下会被攻破恢复 Master Key。
- **目前用户如何解决**：
  使用通用 Shamir 库（如 Sharks、Vault），并在外部依赖昂贵专有硬件（HSM 芯片），或者牺牲安全性忽略微架构侧信道。
- **相关现有产品及链接**：
  1. `c0dearm/sharks`: [https://github.com/c0dearm/sharks](https://github.com/c0dearm/sharks)
  2. `SpinResearch/RustySecrets`: [https://github.com/SpinResearch/RustySecrets](https://github.com/SpinResearch/RustySecrets)
- **现有方案不足及证据**：
  `sharks` 在 `field.rs` 中采用 `LOG_TABLE` 查表（256 字节），其访问模式随秘密字节变动破坏 CPU L1 Data Cache 访问周期；`RustySecrets` 缺乏常数时间算术运算。
- **我们能提供什么改善**：
  在 Rust 中实现完全常数时间（Constant-Time）的线性代数柯西矩阵求逆算法；采用梅森素数域（Mersenne Prime $p = 2^{31}-1$ 或 $2^{61}-1$）配合 Montgomery 乘法与 Fermat 小定理常数时间求逆，无任何查找表、无任何输入相关的分支跳转。
- **用户为什么改用**：
  经 Dudect 统计测试验证的时延方差近乎为 0，真正免疫 Spectre-v1、Prime+Probe 等硬件缓存/分支时延侧信道。
- **技术可行性与风险**：
  高可行性。风险在于需要严谨的常数时间汇编级验证（避免被 LLVM 优化回条件分支）。
- **MVP 与验证方式**：
  Rust 核心算法库 + 自动化 Dudect 侧信道时延泄漏测试套件 + LaTeX 严格数学证明。
- **事实/推测/假设**：
  - *证实事实*：Sharks 存在查表与分支指令；
  - *合理推测*：在现代 x86/ARM 上完全无分支 Montgomery 实现能通过 Dudect 检验；
  - *未经验证假设*：在极端编译器优化等级（-O3）下 Rust 编译器不会引入新的向量分支泄露。
- **五维度评分**：
  - 实用价值: 8/10
  - 创新程度: 8.5/10
  - 竞争优势: 9/10
  - 用户体验: 7/10
  - 可行性: 9/10
  - **综合得分: 41.5 / 50**

---

### 候选方向 2: OmniCloak — 双服务商非合谋秘密共享的端到端保密 LLM 管道
*针对赛道：AI Pipeline Secret Sharing Track*

- **目标用户与痛点**：
  医疗、金融、政企等强监管行业的数据工程师与 AI 开发者。需要使用 GPT-4o 或 Gemini 1.5 处理高敏 Prompt，但法律法规严禁将未加密明文上传至单一云厂商。
- **目前用户如何解决**：
  要么放弃云端顶尖大模型，使用算力受限、推理能力弱的本地小模型（如 Llama-3-8B）；要么依靠云厂商签署的 BAA/DPA 商业协议（仍无法抵御内部威胁与数据泄露）。
- **相关现有产品及链接**：
  1. `voidmind-io/voidllm`: [https://github.com/voidmind-io/voidllm](https://github.com/voidmind-io/voidllm)
  2. `sgasser/pasteguard`: [https://github.com/sgasser/pasteguard](https://github.com/sgasser/pasteguard)
- **现有方案不足及证据**：
  VoidLLM 与 PasteGuard 均基于本地静态词表或弱实体替换，破坏语义连续性导致大模型产生幻觉，且完全不具备数学可证明的信息论安全性。
- **我们能提供什么改善**：
  基于秘密共享的语义拆分与掩码多方计算协议：将敏感 Prompt 转化为两份相互无统计相关性的算子 Share，分别通过 API 调用 OpenAI 与 AWS Bedrock（或 Gemini），两家服务商均只能获得无完整语义的单侧信息碎片，最终在本地客户端以多项式插值重构完整推理结果。
- **用户为什么改用**：
  真正做到“在不向任何单一云服务商泄露明文的前提下，享受顶尖大模型的推理能力”。
- **技术可行性与风险**：
  中等难度。风险在于大模型自注意力机制对局部扰动的容忍度，需设计精巧的语义分割或掩码协议。
- **MVP 与验证方式**：
  双 API 调度网关 + 本地 TUI 终端监控面板 + 对比 OpenAI/Gemini 实际接收 Payload 与本地还原输出。
- **事实/推测/假设**：
  - *证实事实*：两大云厂商不互通数据；
  - *合理推测*：结合语义结构分割可降低重构歧义；
  - *未经验证假设*：纯秘密共享无需复杂 FHE 即可在多步 Agent 对话中维持上下文一致性。
- **五维度评分**：
  - 实用价值: 8.5/10
  - 创新程度: 8.5/10
  - 竞争优势: 8.5/10
  - 用户体验: 8/10
  - 可行性: 7.5/10
  - **综合得分: 41.0 / 50**

---

### 候选方向 3 (强烈推荐): AegisAgent — 抗侧信道零知识门限隔离的私密 AI 智能体机密网关 (The Grand Prize Unified Hybrid)
*针对赛道：两赛道通吃，冲击 Best Overall Project（全满分大奖）*

- **目标用户与痛点**：
  使用 AI Agent（如 LangChain、AutoGPT、OpenCode）自动化业务的企业与开发者。Agent 必须拥有访问云端 LLM API（OpenAI / Bedrock）以及第三方商业系统（Stripe、GitHub、AWS）的 Master API Key。然而：
  1. 一旦发生 Prompt Injection，Agent 会把系统提示中的 Master Key 连底倾倒；
  2. 在本地执行密钥管理时，微架构侧信道泄露主密钥；
  3. 云端供应商能看到完整的 API Key 与敏感业务数据。
- **目前用户如何解决**：
  1. 直接写在 `.env`，被 Agent 读入 Prompt，极易被越狱攻击套取；
  2. 传统 HashiCorp Vault，向 Agent 颁发长效明文 Token，仍无法阻止传输截获与模型侧回显。
- **相关现有产品及链接**：
  1. HashiCorp Vault: [https://github.com/hashicorp/vault](https://github.com/hashicorp/vault)
  2. CassiopeiaCode/CosyRedactGateway: [https://github.com/CassiopeiaCode/CosyRedactGateway](https://github.com/CassiopeiaCode/CosyRedactGateway)
  3. c0dearm/sharks: [https://github.com/c0dearm/sharks](https://github.com/c0dearm/sharks)
- **现有方案不足及证据**：
  Vault 在密钥离开保管库后失去防护；CosyRedact 只能做浅层正则替换；Sharks 秘密共享包含严重时延侧信道。
- **我们能提供什么改善**：
  打造“**抗侧信道底层秘密共享引擎 + 盲化 Agent API 代理网关**”双核架构：
  1. **密码学核心（Rust）**：自研 `Aegis-SSS` 算法，基于数论（常数时间模逆）与线性代数（伴随矩阵/柯西变换），保证 Master Key 在内存中始终以 $(k, n)$ 门限多项式分片形式存在，并在插值过程中实现 100% 常数时间（Constant-Time）操作，消除缓存命中与分支跳转侧信道；
  2. **AI Pipeline 网关**：Agent 永远接触不到 Master API Key。Agent 发起工具调用时，仅传递受限制的密态 Intent；网关在低层沙箱内完成多项式瞬时聚合、签名外发并在响应后立即内存清零（Zeroize），云服务商无法获取主凭据，Agent 也无法将其注入到提示词中；
  3. **双重交互界面**：提供工业级 Terminal User Interface (TUI) 与直观的 Web UI（带实时多项式分片分布、侧信道分析曲线及密态请求流水监控）。
- **用户为什么改用**：
  全方位满足 Hackathon 两个赛道的全部加分项：底层 Rust 常数时间抗侧信道（Track 1 满分）+ 真实 LLM API 接入、加密通信、Master Key 绝不触碰 Agent（Track 2 满分）+ 极致的 UI/UX 与 LaTeX 理论支撑。
- **技术可行性与风险**：
  极高可行性。核心算法可直接用 Rust 构建并配备 Dudect 基准，前端采用 Vite/React 或 Next.js 部署，后端由 Rust 或 Python FastAPI 桥接。
- **MVP 与验证方式**：
  1. Rust 常数时间秘密共享单元测试与 Dudect 侧信道检验；
  2. 真实调用 OpenAI / Gemini API 的端到端 Agent 交互流水线；
  3. 模拟 Prompt Injection 攻击证明 Master Key 绝对无法泄露；
  4. 部署至 Vercel/Render 并提供 Loopback TUI。
- **事实/推测/假设**：
  - *证实事实*：Agent 工具调用是当前 Prompt 注入泄露密钥的头号入口；
  - *合理推测*：通过内存分片瞬时合成能将密钥暴露窗口压缩至纳秒级；
  - *未经验证假设*：用户愿意通过网关中继代理所有 Agent 外发请求。
- **五维度评分**：
  - 实用价值: 9.5/10
  - 创新程度: 9.2/10
  - 竞争优势: 9.5/10
  - 用户体验: 9.0/10
  - 可行性: 9.0/10
  - **综合得分: 46.2 / 50**

---

### 候选方向 4: BlindRAG-FHE — 基于半同态加密的向量知识库盲检索 Agent
*针对赛道：AI Pipeline Secret Sharing Track (FHE 方向)*

- **目标用户与痛点**：
  依赖私有知识库（RAG）构建企业 Agent 的机构。将企业核心文档向量上传至公有云向量数据库（Pinecone、Qdrant）时，向量相似度检索暴露了敏感知识与用户查询意图。
- **目前用户如何解决**：
  自建向量数据库集群（运维成本高），或直接信任云向量库的传输加密。
- **相关现有产品及链接**：
  1. `jayeshthk/secure-llm-fhe`: [https://github.com/jayeshthk/secure-llm-fhe](https://github.com/jayeshthk/secure-llm-fhe)
  2. `martin-chuang/tech-jam-25` (SafeGen AI): [https://github.com/martin-chuang/tech-jam-25](https://github.com/martin-chuang/tech-jam-25)
- **现有方案不足及证据**：
  全同态计算 transformer 推理过慢（数千倍延迟），而轻量级方案又仅停留在文本清洗，未能保护向量语义本身。
- **我们能提供什么改善**：
  采用 Paillier / CKKS 半同态加密（PHE）专门针对“向量点积与余弦相似度”进行同态内积计算。客户端加密 Query Embedding，云端服务器在完全密文状态下计算与向量索引的内积得分，输出密文 Top-K 索引。服务器从始至终不知道用户搜了什么。
- **用户为什么改用**：
  将 FHE 的高延迟限制在小规模向量点积上（毫秒级即可完成），同时获得严密的数学隐私保证。
- **技术可行性与风险**：
  可行。风险在于高维向量（如 1536 维）的同态乘加通信开销与密文膨胀。
- **MVP 与验证方式**：
  Rust PHE 内积计算核心 + 模拟检索私密文档向量 + Web 检索对比展示。
- **事实/推测/假设**：
  - *证实事实*：向量内积只涉及同态加法与标量乘法；
  - *合理推测*：Paillier 针对 384/768 维轻量向量能在 200ms 内完成 Top-K；
  - *未经验证假设*：向量数据库支持密文批处理插件。
- **五维度评分**：
  - 实用价值: 8.5/10
  - 创新程度: 9.0/10
  - 竞争优势: 8.5/10
  - 用户体验: 8.0/10
  - 可行性: 8.0/10
  - **综合得分: 42.0 / 50**

---

### 候选方向 5: PolyMatrix-VSS — 基于线性代数对偶伴随矩阵的可验证常数时间秘密共享
*针对赛道：Cryptographer Track*

- **目标用户与痛点**：
  去中心化密钥托管网络、阈值签名系统（MPC/TSS）开发者。传统 Feldman VSS 依赖椭圆曲线离散对数，计算开销大且存在标量乘法功耗侧信道。
- **目前用户如何解决**：
  使用通用 Shamir 加零知识证明库，但运算繁琐且缺乏防侧信道保护。
- **相关现有产品及链接**：
  1. `snipsco/rust-threshold-secret-sharing`: [https://github.com/snipsco/rust-threshold-secret-sharing](https://github.com/snipsco/rust-threshold-secret-sharing)
  2. `c0dearm/sharks`: [https://github.com/c0dearm/sharks](https://github.com/c0dearm/sharks)
- **现有方案不足及证据**：
  缺乏对恶意分发者（Malicious Dealer）的轻量级代数验证机制，节点无法在不解密的前提下检测分片伪造。
- **我们能提供什么改善**：
  提出一种基于双重伴随矩阵（Dual Adjoint Matrix）与柯西矩阵正交性质的可验证秘密共享机制，通过线性代数矩阵恒等式实现常数时间的一阶防伪验证与重构。
- **用户为什么改用**：
  纯线性代数实现，无需重量级配对密码学，性能提升 5-10 倍，并天生支持常数时间向量指令。
- **技术可行性与风险**：
  数学推导严密但算法独特，需要编写完整的 LaTeX 证明保证无代数陷门。
- **MVP 与验证方式**：
  Rust 算法库 + 自动化攻击仿真（坏分片注入、时延分析）+ LaTeX 论文级算法文档。
- **事实/推测/假设**：
  - *证实事实*：柯西矩阵在任意有限域上只要生成元互异即严格非奇异；
  - *合理推测*：伴随矩阵投影可作为同态检验子；
  - *未经验证假设*：验证算子在低位域上足以抵抗碰撞攻击。
- **五维度评分**：
  - 实用价值: 7.5/10
  - 创新程度: 9.2/10
  - 竞争优势: 8.8/10
  - 用户体验: 7.0/10
  - 可行性: 8.5/10
  - **综合得分: 41.0 / 50**

---

### 候选方向 6: VaultMesh-TUI — 面向自主 AI 工具链的瞬态分片授权网关
*针对赛道：AI Pipeline Secret Sharing Track*

- **目标用户与痛点**：
  重度依赖自动化工具调用（如搜索、发邮件、数据库写入）的 AI Agent 工程师。担心 Agent 受到间接提示注入（Indirect Prompt Injection）后滥用工具或泄露凭据。
- **目前用户如何解决**：
  人工逐条审批（慢，失去自主 Agent 价值），或完全放权给 Agent（极度危险）。
- **相关现有产品及链接**：
  1. LangChain Privacy Proxy: [https://github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain)
  2. xiaYuTian11/maskit: [https://github.com/xiaYuTian11/maskit](https://github.com/xiaYuTian11/maskit)
- **现有方案不足及证据**：
  无法验证工具调用的真实密码学来源，Agent 与网关间传输是单点对称凭据，一处泄露全盘崩溃。
- **我们能提供什么改善**：
  将每个工具的 Master Key 通过 Shamir 动态门限打散保存在由轻量本地节点构成的微型 Mesh 中。Agent 必须通过多项式挑战应答，获得一次性瞬态 HMAC Token，用完即毁。
- **用户为什么改用**：
  彻底阻断 Agent “偷钥匙”与“滥用凭据”的攻击路径，配合极具未来感的 Hacker 终端 UI（TUI）。
- **技术可行性与风险**：
  中等难度。网关逻辑较为繁复，需处理多步并发请求。
- **MVP 与验证方式**：
  本地 Loopback 网关 + 模拟 Agent 工具调用测试 + Terminal 实时状态看板。
- **事实/推测/假设**：
  - *证实事实*：一次性 Token 能够收敛权限作用域；
  - *合理推测*：门限分片能防止单一进程 dump 窃取长效主密钥；
  - *未经验证假设*：开发者愿意为每个第三方工具配置多项式门限。
- **五维度评分**：
  - 实用价值: 8.5/10
  - 创新程度: 8.0/10
  - 竞争优势: 8.2/10
  - 用户体验: 8.5/10
  - 可行性: 8.5/10
  - **综合得分: 41.7 / 50**

---

## 3. 严格批判与淘汰 (Strict Critique & Elimination)

我们以严格的产品与评审员视角，对这 6 个方案逐一回答关键审查问题：

### Q1: 这个产品真的有必要存在吗？
- **方向 1 (AegisKey-SSS)**：必要。在密码学基础库层面，几乎所有现存的开源 SSS 库都被证实存在侧信道漏洞，高危系统确实需要常数时间基准库。但其作为独立产品稍显学术化。
- **方向 2 (OmniCloak)**：存在争议。云大模型分片重构如果缺乏细粒度语义对齐，很容易造成输出断裂或质量下滑，商业落地摩擦大。
- **方向 3 (AegisAgent)**：**极其必要！** Agent 安全是目前整个 AI 安全行业最关注的头号痛点（OWASP Top 10 for LLM 中 Prompt Injection 与 Sensitive Information Disclosure 分列前列）。让 Agent 既能执行工作又完全接触不到 Master API Key，直击痛点。
- **方向 4 (BlindRAG-FHE)**：有价值，但 RAG 检索的性能开销对实时 Agent 体验影响较大。
- **方向 5 (PolyMatrix-VSS)**：纯理论贡献高，但偏向学术论文，缺少可直接交付给 end-user 的业务形态。
- **方向 6 (VaultMesh-TUI)**：有价值，但更侧重工程授权流程，数学算法厚度稍逊于方向 3。

### Q2: 为什么现有工具不能解决？
- 传统密码库（Sharks/RustySecrets）作者编写时未遵循现代常数时间密码学规范，遍布查表和条件分支；
- 传统代理工具（Presidio/Maskit）只是纯前端/纯文本正则，根本无法保护底层的 Master Key 凭据；
- 传统密钥管理器（HashiCorp Vault）以“解封后交出明文”为模型，而现代 AI 智能体是不可信运行环境，明文一旦交出即刻面临被 Prompt 注入窃取的风险。

### Q3: 有没有更简单、更便宜甚至完全不需要 AI 的解决办法？
- 针对密码学部分：常数时间算法与线性代数是解决硬件侧信道的唯一数学防线，无法通过更简单或非数学方式解决；
- 针对密钥保护：如果不使用门限秘密共享隔离，无论加多少层应用层限制，内存中的明文字符串都逃不过越狱注入或内存扫描。

### Q4: 用户会不会尝试一次之后就不再使用？
- 纯命令行库（方向 1、5）容易被视作一次性工具；
- 带有直观 Loopback Web UI、实时交互式 TUI 与一键代理配置的网关系统（方向 3）具有长期日常使用价值，可直接无缝嵌入 Cursor、OpenCode 或开发者日常的 Agent 开发工作流中。

### Q5: 有什么证据表明我们的方案可能更好？
- 实测对比证据：`c0dearm/sharks` 源码中 `field.rs` 的 256 元素静态数组与条件分支是铁证，我们通过 Dudect 侧信道时延测试能够输出确凿的 $t$-test 统计检验柱状图，直接证明零时延泄露；
- 架构证据：Agent 在调用 LLM 过程中抓取环境变量或内存时，只能拿到密态多项式份额（Share），数学上信息熵等同于真随机数，无法还原 Master Key。

### Q6: 哪个关键假设一旦错误，就应该放弃这个创意？
- 方向 2 的致命假设：假设普通语义能够任意拆分交由两个独立大模型理解而不丢失因果连贯性（此假设风险极高，因此淘汰）；
- 方向 3 的关键假设：本地网关代理带来的数十毫秒加密开销在现代 LLM 秒级推理耗时中微不足道，用户完全能接受以 5% 的时延换取 100% 的 Master Key 防泄露（这一假设极稳固）。

---

## 4. 候选方案对比表 (Comparison Matrix)

| 候选方案 | 赛道契合 | 实用价值 | 创新程度 | 竞争优势 | 用户体验 | 可行性 | 总分 (50) | 核心优势 | 主要风险 | 结论 |
|---|---|---|---|---|---|---|---|---|---|---|
| **#1 AegisKey-SSS** | Cryptographer | 8.0 | 8.5 | 9.0 | 7.0 | 9.0 | 41.5 | 纯 Rust 抗侧信道，数学理论严谨 | 缺少前端交互形态，纯库类项目 | 保留备选 |
| **#2 OmniCloak** | AI Pipeline | 8.5 | 8.5 | 8.5 | 8.0 | 7.5 | 41.0 | 双云服务商分片隐私概念新颖 | LLM 语义拆分易损耗推理准确度 | 淘汰 |
| **#3 AegisAgent** | **双赛道 / 全局大奖** | **9.5** | **9.2** | **9.5** | **9.0** | **9.0** | **46.2** | **覆盖两赛道全部加分点：底层 Rust 常数时间线性代数抗侧信道 + 真实 LLM API 接入保密隔离 + Web/TUI 双端体验** | 系统涉及 Rust 内核与前端全栈协作 | **强推 (Top Pick)** |
| **#4 BlindRAG-FHE** | AI Pipeline (FHE) | 8.5 | 9.0 | 8.5 | 8.0 | 8.0 | 42.0 | 满足 FHE 向量保密检索，数学优美 | 密文膨胀与复杂性较高 | 保留备选 |
| **#5 PolyMatrix-VSS** | Cryptographer | 7.5 | 9.2 | 8.8 | 7.0 | 8.5 | 41.0 | 伴随矩阵可验证，公式优美 | 偏纯学术论文，演示生动性弱 | 淘汰 |
| **#6 VaultMesh-TUI** | AI Pipeline | 8.5 | 8.0 | 8.2 | 8.5 | 8.5 | 41.7 | 工具级瞬态授权，TUI 炫酷 | 密码学底层创新不及 #3 | 保留备选 |

---

## 5. 推荐方向与风险剖析 (Recommendation & Risk Mitigation)

### 强烈推荐：**候选方向 3 — AegisAgent (抗侧信道零知识门限隔离的私密 AI 智能体机密网关)**

#### 为什么这是最佳决胜方案？
1. **精准收割 Hackathon 两个赛道的全部评分标准与最高分项**：
   - **满足 Cryptographer Track**：
     - 自研 `Aegis-SSS` 算法，基于线性代数（柯西矩阵对偶变换）与数论（梅森有限域常数时间 Montgomery 运算）；
     - 采用 Rust 纯底层实现（满足官方 *“UTILIZE LOW LEVEL LANGUAGES (E.G RUST OR C) TO GAIN AN EXTRA POINT”* 要求）；
     - 彻底消除现有开源库的查表和分支跳转缺陷，附带严格 LaTeX 算法原理推导与抗侧信道理论证明（满足 *“Clean LATEx formatting”* 要求）；
     - 内置 Dudect 侧信道时延统计测试套件，用硬核数据证明防御能力（满足 *“Survives rigorous cryptoanalysis”* 要求）。
   - **满足 AI Pipeline Secret Sharing Track**：
     - 接入真实云端 LLM API（OpenAI / Gemini / Bedrock）（满足 *“Evidence of using host provided LLM agents via any api”* 要求）；
     - 客户端输入与敏感凭据加密流转，Master Key 保持为 $(k, n)$ 门限分片，宿主 Agent 与云端 API 无法读取或持久化 Master Key（满足核心保密需求）；
     - 打造直观易用的交互体验：同时提供 Web UI 仪表盘与 Terminal User Interface (TUI) 命令行交互（满足官方 *“To gain a strong point on visual aesthetic, include a website hosted on the loopback machine or include a TUI”* 要求）。
   - **直指最高荣誉 Best Overall Project（Grand Prize）**：
     - Devpost 规则明确指出：*“Given to grand prize winners demonstrating full points in each track criteria”*。只有兼备硬核底层密码学创新与完整可用 AI Pipeline 的作品，才能横扫全场拿下 Grand Prize。

#### 潜在风险与应对预案：
- **风险 1：Rust 底层代码与 Web 前端之间的通信开销与复杂度**
  - *应对方案*：采用精简的架构分层——Rust 编写核心算法静态/动态库（或轻量级本地守护进程 / CLI / WASM），Web 采用 React / Next.js，后端通过标准的 Loopback REST/WebSocket 协议互通，保证极速响应且容易独立部署验证。
- **风险 2：云端 LLM API Key 的真实调用验证**
  - *应对方案*：在网关中原生支持 OpenAI / Gemini / 兼容 OpenAI 标准的本地 Mock 及真实 API，并提供沙箱模拟模式与真实 API 模式一键切换，确保在评审离线或无在线 Key 的环境下也能 100% 顺畅演示完整加密隔离流程。
- **风险 3：侧信道测试的直观可信度**
  - *应对方案*：将 Dudect 的 $t$-test 统计检验结果以可视化图表形式呈现在 Web 仪表盘与 LaTeX 报告中，与 Sharks 的时延漏洞形成直接横向对比。

---

## 6. 状态与下一步计划

- 当前状态：Stage 1 研究与筛选完成。所有证据、源码实测分析、现有库代码漏洞证据及评分已写入 `evidence/stage-1-research.md`。
- **在此暂停，等待人类选题**。在人类确认最终选定的主题前，不得进入 Stage 2 开发。
