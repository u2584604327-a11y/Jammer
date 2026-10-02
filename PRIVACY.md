# Jammer Privacy Policy

**Effective date: October 2, 2026**

Jammer is a local-first Manifest V3 browser extension for network ad blocking, tracker blocking, known-phishing navigation blocking, optional HTTPS navigation upgrade, page-ad cleanup, and opt-in local content filtering.

[简体中文](#简体中文) · [English](#english)

---

## English

### 1. Data collection

Jammer does **not** collect, sell, rent, upload, or transmit personal data to a Jammer-operated server.

Jammer has no account system, analytics service, telemetry endpoint, advertising SDK, cloud synchronization service, remote configuration service, or runtime filter-list download service.

### 2. Data stored locally

Jammer stores configuration under the browser extension's local `jammerSettings` key, including:

- whether Jammer protection is enabled;
- whether network ad blocking is enabled;
- whether Privacy / tracker blocking is enabled;
- whether known-phishing navigation blocking is enabled;
- whether optional HTTPS navigation upgrade is enabled;
- whether page-ad cleanup is enabled;
- whether content filtering is enabled;
- which content categories are selected;
- interface language preference;
- ad-block allowlist domains;
- content-filter exceptions; and
- domains manually added to the dangerous-site block list.

These settings remain in the local browser profile unless the browser itself synchronizes or backs up extension data outside Jammer's control.

Jammer does not intentionally store browsing history, complete visited URLs, page text, form contents, passwords, cookies, search history, or account credentials. When content filtering is enabled, bounded visible page text is **processed transiently** for local matching and is not stored as browsing history.

### 3. Network ad and ad-script blocking

Jammer uses Chromium's `declarativeNetRequest` API and packaged EasyList-derived rules to block known ad servers plus broader banner, path, script, image, frame, stylesheet, XHR, and related ad requests.

The rules are generated at build time from pinned and verified sources. Jammer **does not download EasyList** or replacement filter lists while the installed extension is running.

The browser performs request blocking. Jammer does not send blocked-request logs to a Jammer server.

### 4. Privacy / tracker blocking

Privacy / tracker blocking uses a separate packaged `declarativeNetRequest` ruleset compiled at build time from a pinned EasyPrivacy source.

When enabled, Chromium can block known tracking endpoints used for scripts, pixels/images, XMLHttpRequest, pings, embedded frames, WebSocket, and similar resource requests.

Jammer does not download EasyPrivacy at runtime and does not upload tracker-blocking logs.

### 5. Known-phishing navigation blocking

Known-phishing navigation blocking uses a packaged ruleset compiled from a pinned active-domain snapshot from Phishing-Database/Phishing.Database.

The feature is enabled by default and can be disabled independently. It blocks top-level and embedded navigation to domains in the packaged snapshot, including redirects that land on a listed domain.

The phishing snapshot is fetched and verified only during the project build process. The installed extension does not download or query the phishing service at runtime and does not report visited domains to it.

No blocklist is complete or continuously current. Jammer does not claim to identify every phishing, fraud, malware, or malicious website.

### 6. Dangerous-site block list

The user can manually add domains to a local dangerous-site block list. Jammer converts those entries into local DNR rules that block top-level and embedded navigation to those domains.

The list is stored locally and is not uploaded to a Jammer server.

Jammer **does not directly inspect DNS** answers. If an otherwise allowed hostname is resolved to an attacker-controlled IP while the hostname remains unchanged, Jammer cannot reliably detect that DNS-poisoning condition. Browser or operating-system Secure DNS / DNS-over-HTTPS remains a separate protection layer.

### 7. Optional HTTPS navigation upgrade

HTTPS navigation upgrade is optional and disabled by default.

If the user enables it, Jammer requests optional access to:

- `http://*/*`
- `https://*/*`

Jammer then installs a local `upgradeScheme` DNR rule limited to top-level and embedded page navigation. It upgrades `http://` navigation to `https://` before loading where Chromium can apply the rule.

This feature does not inspect DNS answers, does not provide certificate validation beyond the browser's normal HTTPS checks, and can make legacy HTTP-only sites unavailable until the feature is disabled.

### 8. Optional page-ad cleanup

Page-ad cleanup is optional and disabled by default.

When enabled, Jammer requests:

- optional `scripting`; and
- optional `http://*/*` and `https://*/*` site access.

These permissions register packaged CSS-only cosmetic-filtering resources that hide identified ad containers. Jammer does not use page-ad cleanup to intentionally read form values, passwords, browsing history, or cookies.

### 9. Optional content filtering

Content filtering is optional and disabled by default. Every category is also disabled by default.

When enabled, Jammer locally evaluates a bounded amount of title, description, heading, accessibility/image-label, and visible body text against packaged weighted rules for:

- gambling / betting promotion;
- explicit sexual material;
- graphic violence;
- scam-like promotion; and
- clickbait / nuisance content.

When a selected category crosses its threshold, Jammer hides only the matched content block and inserts a local placeholder with the category, matched signals, reveal control, leave-page control, and site exception control.

The classifier is heuristic, not an AI security service. False positives and false negatives are possible.

Jammer does **not upload scanned page text** or matched terms to a Jammer server. It does not intentionally read form input values, password values, cookies, or browser history for this feature.

### 10. Allowlists and exceptions

The ad-block allowlist contains domains manually entered by the user and excludes matching sites from ad blocking or page-ad cleanup.

Content-filter exceptions are stored separately and suppress local content masking for matching sites.

The dangerous-site block list is also separate. These local lists are not uploaded to a Jammer server.

### 11. External network communication

Jammer extension pages use this Content Security Policy:

`connect-src 'none'`

The popup, Options page, and content-filter runtime do not use `fetch`, XMLHttpRequest, WebSocket, EventSource, analytics, or telemetry endpoints.

Build scripts may retrieve pinned third-party rule sources while producing a release. That build-time activity is not performed by the installed extension.

### 12. Third-party filter sources

Product builds may include rules derived from pinned snapshots of:

- EasyList for advertisements and ad-related network requests;
- EasyPrivacy for tracking endpoints; and
- Phishing-Database/Phishing.Database for known active phishing domains.

The build verifies pinned source identity and includes provenance/third-party notices. The installed extension does not remotely update these packaged lists at runtime.

### 13. Retention and deletion

Jammer operates no backend user database, so it has no Jammer server-side user-data retention period.

Local Jammer settings remain until the user changes them, clears browser/extension storage, or uninstalls Jammer.

### 14. Permissions summary

Required:
- `declarativeNetRequest`
- `storage`

Optional:
- `scripting` — used only for page-ad cleanup or content filtering;
- `http://*/*` and `https://*/*` — used when page-ad cleanup/content filtering needs site access, or when the user explicitly enables HTTPS navigation upgrade.

Jammer does not request `tabs`, `history`, `cookies`, `webRequest`, `webRequestBlocking`, `debugger`, `downloads`, or `nativeMessaging`.

### 15. Changes to this policy

If Jammer's data handling or permission model changes, this policy should be updated before the changed version is distributed.

### 16. Contact

Questions or privacy concerns can be submitted through the public Jammer repository:

https://github.com/u2584604327-a11y/Jammer/issues

---

## 简体中文

### 1. 数据收集

Jammer **不会**向Jammer运营的服务器收集、出售、出租、上传或传输个人数据。

Jammer没有用户账号系统、统计分析服务、遥测接口、广告SDK、云同步服务、远程配置服务或运行时过滤列表下载服务。

### 2. 本地保存的数据

Jammer在浏览器扩展本地 `jammerSettings` 中保存：

- Jammer总保护状态；
- 网络广告 / 广告脚本拦截状态；
- 隐私 / 跟踪器拦截状态；
- 已知钓鱼网站拦截状态；
- 可选HTTPS导航升级状态；
- 页面广告清理状态；
- 内容过滤状态与所选类别；
- 界面语言偏好；
- 广告拦截白名单域名；
- 内容过滤例外域名；
- 用户手动加入危险网站拦截列表的域名。

这些设置保存在用户设备的浏览器配置中。浏览器自身的同步或备份行为不由Jammer控制。

Jammer不会主动保存浏览历史、完整访问URL、网页正文、表单内容、密码、Cookie、搜索历史或账号凭据。启用内容过滤时，只会临时处理有限范围的网页可见文字进行本地匹配，不会把它保存为浏览记录。

### 3. 网络广告与广告脚本拦截

Jammer使用Chromium的 `declarativeNetRequest` API以及随扩展打包的EasyList衍生规则，拦截已知广告域名及更广泛的横幅、路径、广告脚本、图片、框架、样式、XHR等广告请求。

规则在构建阶段从固定并校验过的来源生成。安装后的扩展运行时不会下载EasyList或替代过滤列表。

### 4. 隐私 / 跟踪器拦截

独立的EasyPrivacy衍生规则用于阻止已知跟踪脚本、跟踪像素/图片、XHR、Ping、嵌入框架、WebSocket等请求。

Jammer运行时不会下载EasyPrivacy，也不会上传跟踪器拦截日志。

### 5. 已知钓鱼网站拦截

Jammer产品构建会从固定并校验过的Phishing-Database/Phishing.Database活跃域名快照生成钓鱼导航拦截规则。

该功能默认启用，也可单独关闭。它会禁止把名单中的域名作为顶层网页或嵌入页面打开，因此跳转最终落到已知钓鱼域名时也可被阻止。

已安装扩展不会在运行时连接该数据源，也不会把用户访问过的域名上报给数据源。

任何名单都不可能完整或实时覆盖全部威胁；Jammer不声称可以识别所有钓鱼、诈骗、恶意软件或恶意网站。

### 6. 危险网站拦截列表

用户可手动把域名加入本地危险网站拦截列表。Jammer将这些域名转换成本地DNR规则，禁止相应顶层网页或嵌入页面导航。

该名单只保存在本地，不会上传。

Jammer**不会直接检查DNS解析结果**。如果一个允许的主机名在DNS层被污染并解析到攻击者控制的IP，而主机名本身没有改变，Jammer无法可靠发现。浏览器或操作系统的安全DNS / DNS-over-HTTPS仍属于独立保护层。

### 7. 可选HTTPS导航升级

HTTPS导航升级默认关闭。

用户主动启用后，Jammer会请求可选网站访问权限：

- `http://*/*`
- `https://*/*`

随后Jammer仅针对顶层页面和嵌入页面导航安装本地 `upgradeScheme` DNR规则，把可处理的 `http://` 导航升级为 `https://`。

该功能不读取DNS答案，也不替代浏览器正常的HTTPS证书验证。只支持HTTP的旧网站可能在启用后无法访问。

### 8. 可选页面广告清理

页面广告清理默认关闭。

启用后，Jammer会请求：

- 可选 `scripting` 权限；
- 可选 `http://*/*` 与 `https://*/*` 网站访问权限。

这些权限用于注册扩展内置CSS页面广告隐藏规则。页面广告清理不会被用于主动读取表单值、密码、浏览历史或Cookie。

### 9. 可选内容过滤

内容过滤及每个类别默认都关闭。

启用后，Jammer会在本机对有限范围的网页标题、描述、标题文字、辅助/图片标签以及可见正文进行加权匹配，类别包括：

- 赌博 / 博彩推广；
- 露骨色情内容；
- 血腥 / 严重暴力内容；
- 疑似诈骗诱导；
- 标题党 / 诱导内容。

达到阈值时，只隐藏命中的网页内容块，并在原位置提供类别、匹配信号、“显示这段内容”、“退出此网页”和站点例外控制。

该分类器是启发式规则，不是AI安全服务，可能误判或漏判。

Jammer不会把扫描到的网页正文或匹配词上传到Jammer服务器，也不会为了该功能主动读取表单输入值、密码值、Cookie或浏览历史。

### 10. 白名单与例外

广告白名单、内容过滤例外和危险网站拦截列表彼此独立，均只保存在浏览器本地，不会上传到Jammer服务器。

### 11. 外部网络通信

Jammer扩展页面使用：

`connect-src 'none'`

Popup、Options和内容过滤运行时代码不使用 `fetch`、XMLHttpRequest、WebSocket、EventSource、统计分析或遥测接口。

构建脚本在制作版本时会下载并校验固定的第三方规则来源；这是构建阶段行为，不由安装后的扩展执行。

### 12. 第三方过滤来源

产品构建可能包含来自以下固定快照的规则：

- EasyList：广告及广告相关网络请求；
- EasyPrivacy：跟踪端点；
- Phishing-Database/Phishing.Database：已知活跃钓鱼域名。

构建过程验证来源身份并写入provenance/第三方声明。安装后的扩展不会在运行时远程更新这些列表。

### 13. 保留与删除

Jammer不运营扩展用户后端数据库，因此没有Jammer服务器端用户数据保留周期。

本地设置会保留到用户修改、清理浏览器/扩展存储或卸载Jammer为止。

### 14. 权限摘要

必须权限：
- `declarativeNetRequest`
- `storage`

可选权限：
- `scripting`：仅用于页面广告清理或内容过滤；
- `http://*/*` 与 `https://*/*`：页面广告清理/内容过滤需要站点访问时使用，或用户主动启用HTTPS导航升级时使用。

Jammer不请求 `tabs`、`history`、`cookies`、`webRequest`、`webRequestBlocking`、`debugger`、`downloads` 或 `nativeMessaging`。

### 15. 政策变更

如果Jammer的数据处理方式或权限模型发生变化，应在分发相关版本之前同步更新本政策。

### 16. 联系方式

隐私问题可通过Jammer公开仓库提交：

https://github.com/u2584604327-a11y/Jammer/issues
