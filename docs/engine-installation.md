# Engine installation / 引擎安装

Settings installation and update actions download native distributions in the Haros server,
verify their published checksums when available, extract them, and run `--version`. Only after
that probe succeeds does Haros save the executable path. Existing Engine credentials and
sessions are not part of installation. Authentication remains a separate Engine action.

设置中的安装、更新按钮由 Haros 后台下载原生发行包、校验发布方提供的摘要、解包并执行
`--version`。验证成功后才保存可执行文件路径。安装不修改引擎已有凭据和会话，登录是独立操作。
操作进度留在当前页面，成功或错误通知在 15 秒后关闭；失败可以再次点击重试。

Codex, Claude, Grok, Droid, Kilo and OpenCode use the exact native package referenced by the
official npm package's latest metadata. No system npm or Node installation is required.
Cursor uses the native release URL in its official installer metadata, without executing
the installer script. Antigravity uses its official native update manifest. Pi is included
in the application and its version is maintained by Haros application updates.

Codex、Claude、Grok、Droid、Kilo、OpenCode 使用官方 npm 元数据指向的原生包，不依赖系统
npm 或 Node。Cursor 读取官方安装脚本中的发行包地址，但不执行该脚本。Antigravity 读取
官方原生更新清单。Pi 随 Haros 应用提供，其版本随应用更新。

## Mirror protocol / 镜像源协议

Set `HARNESSOS_ENGINE_MIRROR_URL` on the Haros server process before starting it. For example,
with a base URL of `https://mirror.example/engines`, Windows x64 Codex requests:

在启动 Haros 服务前设置环境变量 `HARNESSOS_ENGINE_MIRROR_URL`。以
`https://mirror.example/engines` 为例，Windows x64 的 Codex 会请求：

```text
GET https://mirror.example/engines/codex/win32-x64.json
```

```json
{
  "version": "0.154.0",
  "url": "https://mirror.example/engines/codex/codex-0.154.0-win32-x64.tgz",
  "format": "tar.gz",
  "sha256": "<64 hexadecimal characters for the payload SHA-256>"
}
```

Formats: `tar.gz`, `zip`, or `binary`. Archives must contain the complete native distribution,
including its supporting files, and exactly one Engine executable (`codex.exe`, `claude.exe`,
`cursor-agent.cmd`, `agy.exe`, `grok.exe`, `droid.exe`, `kilo.exe`, `opencode.exe` on Windows).
Other platforms omit `.exe`. Publish immutable payload URLs before replacing the version
manifest. Retain required licenses and notices in mirrored distributions. A configured mirror
is authoritative: a failed request or checksum does not silently switch back to an official source.
HTTPS is required except for localhost acceptance tests.

格式支持 `tar.gz`、`zip`、`binary`。压缩包保留完整原生发行目录和附属文件，并包含唯一的
对应引擎可执行文件。先上传不可变的版本资源，再更新清单；镜像应保留上游许可证和声明。
配置镜像后，下载或摘要校验失败会直接显示错误，不会偷偷改用官网源。除本机验收外要求 HTTPS。

## Verification / 验收

```powershell
cd apps/server
node scripts/verify-managed-engine-install.ts codex cursor antigravity
```

The opt-in check downloads real packages into a new temporary directory, probes executables
with isolated homes, and records results in `results.json`. It does not use real Engine credentials.
The mirror unit test covers activation, same-version requests, corrupt payloads and failed probes.

此命令实际下载资源到新的临时目录，用隔离的用户目录验证二进制，将结果写入 `results.json`。
镜像单元测试覆盖版本切换、相同版本请求、资源损坏和验证失败。
