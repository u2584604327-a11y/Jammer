# Jammer Privacy Policy

**Effective date: October 2, 2026**

Jammer is a local-first browser extension for network ad blocking and optional page-ad cleanup. This policy describes what Jammer stores, what permissions it can use, and what it does not collect or transmit.

[简体中文](#简体中文) · [English](#english)

---

## English

### 1. Data collection

Jammer does **not** collect, sell, rent, upload, or transmit personal data to a Jammer-operated server.

Jammer has no:
- account system;
- analytics service;
- telemetry endpoint;
- advertising SDK;
- cloud synchronization service;
- remote configuration service; or
- runtime filter-list download service.

### 2. Data stored locally

Jammer stores the following settings in the browser's local extension storage under the `jammerSettings` key:

- whether Jammer protection is enabled;
- whether network ad blocking is enabled;
- whether page-ad cleanup is enabled;
- interface language preference: Auto, 中文, or English; and
- domains the user manually adds to the allowlist.

These settings stay in the browser profile on the user's device unless the browser itself synchronizes or backs up extension data outside Jammer's control.

Jammer does not intentionally store browsing history, complete visited URLs, page text, form contents, passwords, cookies, search history, or account credentials.

### 3. Network ad blocking

Jammer uses Chromium's `declarativeNetRequest` API to apply packaged network-blocking rules.

The filtering rules are generated at build time from pinned and verified EasyList sources. Jammer does not download EasyList or other filter lists while the extension is running.

Network blocking is performed by the browser. Jammer does not send a log of blocked or allowed requests to a Jammer server.

### 4. Optional page-ad cleanup

Page-ad cleanup is optional and disabled by default.

When the user enables it, Jammer requests:
- the optional `scripting` permission; and
- optional access to `http://*/*` and `https://*/*`.

These permissions are used to register packaged CSS-only cosmetic-filtering resources that hide identified ad containers.

Jammer does not use this feature to intentionally read or collect page text, form contents, passwords, browsing history, or cookies.

When page-ad cleanup is disabled, Jammer unregisters its cosmetic filtering and requests removal of the optional website-access permission.

### 5. Allowlist

The allowlist contains domain names manually entered by the user. Jammer stores those domains locally and uses them to exclude matching sites from blocking or cosmetic filtering.

The allowlist is not uploaded to a Jammer server.

### 6. External network communication

The packaged Jammer extension is configured with the extension-page Content Security Policy:

`connect-src 'none'`

Jammer's popup and Options code do not use `fetch`, XMLHttpRequest, WebSocket, EventSource, analytics, or telemetry services.

Normal websites opened by the user may still make their own network requests. Jammer's purpose is to block some of those requests; it does not control every request made by every website or by the browser itself.

### 7. Third-party filter sources

Jammer's build process uses EasyList-derived filtering data. Source provenance and third-party notices are included in product builds.

This use happens during the build process. The installed extension does not contact EasyList to update rules at runtime.

### 8. Retention and deletion

Because Jammer does not operate a backend database for extension users, Jammer has no server-side user-data retention period.

Local Jammer settings remain in the browser profile until the user:
- changes or removes them;
- clears extension/browser storage; or
- uninstalls the extension.

### 9. Permissions summary

Required:
- `declarativeNetRequest`
- `storage`

Optional, only for page-ad cleanup:
- `scripting`
- `http://*/*`
- `https://*/*`

Jammer does not request `tabs`, `history`, `cookies`, `webRequest`, `debugger`, `downloads`, or `nativeMessaging`.

### 10. Changes to this policy

If Jammer's data handling or permission model changes, this policy should be updated before the changed version is distributed.

### 11. Contact

Questions or privacy concerns can be submitted through the public Jammer repository:

https://github.com/u2584604327-a11y/Jammer/issues

---

## 简体中文

### 1. 数据收集

Jammer **不会**向Jammer运营的服务器收集、出售、出租、上传或传输个人数据。

Jammer没有：
- 用户账号系统；
- 统计分析服务；
- 遥测接口；
- 广告SDK；
- 云同步服务；
- 远程配置服务；
- 运行时过滤列表下载服务。

### 2. 本地保存的数据

Jammer使用浏览器扩展本地存储中的 `jammerSettings` 保存以下设置：

- Jammer总保护是否启用；
- 网络广告拦截是否启用；
- 页面广告清理是否启用；
- 界面语言偏好：自动、中文或English；
- 用户手动加入白名单的域名。

这些设置保存在用户设备的浏览器配置中。若浏览器自身提供扩展数据同步或备份，该行为不由Jammer控制。

Jammer不会主动保存浏览历史、完整访问URL、网页正文、表单内容、密码、Cookie、搜索历史或账号凭据。

### 3. 网络广告拦截

Jammer使用Chromium的 `declarativeNetRequest` API应用随扩展打包的网络过滤规则。

规则在构建阶段根据固定并校验过的EasyList来源生成。扩展运行时不会下载EasyList或其他过滤列表。

网络拦截由浏览器执行。Jammer不会把“哪些请求被拦截或允许”的日志发送到Jammer服务器。

### 4. 可选的页面广告清理

“页面广告清理”为可选功能，默认关闭。

用户启用后，Jammer会请求：
- 可选的 `scripting` 权限；
- 可选的 `http://*/*` 与 `https://*/*` 网站访问权限。

这些权限仅用于注册扩展内置的CSS页面广告隐藏规则。

Jammer不会利用该功能主动读取或收集网页正文、表单内容、密码、浏览历史或Cookie。

关闭“页面广告清理”后，Jammer会注销页面广告清理规则，并请求移除对应的可选网站访问权限。

### 5. 白名单

白名单只包含用户手动输入的域名。Jammer将这些域名保存在本地，用于在相应网站上排除网络过滤或页面广告清理。

白名单不会上传到Jammer服务器。

### 6. 外部网络通信

Jammer扩展页面使用以下Content Security Policy：

`connect-src 'none'`

Jammer的Popup与Options代码不使用 `fetch`、XMLHttpRequest、WebSocket、EventSource、统计分析或遥测服务。

用户正常访问的网站仍可能发起自身的网络请求。Jammer会尝试拦截其中部分广告请求，但不会控制网站或浏览器自身的全部网络行为。

### 7. 第三方过滤来源

Jammer构建过程会使用EasyList衍生的过滤数据。产品构建中包含来源记录和第三方声明。

该过程发生在构建阶段，安装后的扩展不会在运行时连接EasyList更新规则。

### 8. 保留与删除

Jammer不运营用于保存扩展用户数据的后端数据库，因此不存在Jammer服务器端的用户数据保留周期。

本地设置会保留在浏览器配置中，直到用户：
- 修改或删除相关设置；
- 清理浏览器/扩展存储；
- 卸载Jammer。

### 9. 权限摘要

必须权限：
- `declarativeNetRequest`
- `storage`

仅用于“页面广告清理”的可选权限：
- `scripting`
- `http://*/*`
- `https://*/*`

Jammer不请求 `tabs`、`history`、`cookies`、`webRequest`、`debugger`、`downloads` 或 `nativeMessaging`。

### 10. 政策变更

如果Jammer的数据处理方式或权限模型发生变化，应在分发相关新版本之前同步更新本隐私政策。

### 11. 联系方式

隐私相关问题可以通过Jammer公开仓库提交：

https://github.com/u2584604327-a11y/Jammer/issues
