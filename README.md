<div align="center">
  <img alt="vue3-element-admin" width="80" height="80" src="./src/assets/images/logo.png">
  <h1>个人工具集</h1>

![](https://foruda.gitee.com/images/1708618984641188532/a7cca095_716974.png "rainbow.png")


## 项目简介

[vue3-element-admin](https://gitcode.com/youlai/vue3-element-admin) 基于 Vue3、Vite、TypeScript 和 Element-Plus 搭建的极简开箱即用企业级后台管理前端模板。 配套 Java 后端 [youlai-boot](https://gitee.com/youlaiorg/youlai-boot)、多租户后端 [youlai-boot-tenant](https://gitee.com/youlaiorg/youlai-boot-tenant) 和 Node 后端 [youlai-nest](https://gitee.com/youlaiorg/youlai-nest) 。 提供开发简版[vue3-element-template](https://gitee.com/youlaiorg/vue3-element-template) 和 JS 版本[vue3-element-admin-js](https://gitee.com/youlaiorg/vue3-element-admin) 供开发者快速开发。

## 项目特色

- **简洁易用**：基于 [vue-element-admin](https://gitee.com/panjiachen/vue-element-admin) 升级的 Vue3 版本，无过渡封装 ，易上手。

## 项目源码

| 项目                      | Gitee                                                                      | Github                                                                       | GitCode                                                                   |
| ------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| vue3-element-admin ✅     | [vue3-element-admin](https://gitee.com/youlaiorg/vue3-element-admin)       | [vue3-element-admin](https://github.com/youlaitech/vue3-element-admin)       | [vue3-element-admin](https://gitcode.com/youlai/vue3-element-admin)       |
|                      |                                                              |                                                              |                                                              |

## 项目启动

- **环境准备**

| 环境类型     | 版本要求                                                     | 备注                              |
| ------------ | ------------------------------------------------------------ | --------------------------------- |
| **Node.js**  | `^20.19.0` 或 `>=22.12.0`                                    | 推荐使用 LTS 版本（主版本为偶数） |
| **包管理器** | `pnpm >= 8.0.0`                                              | 项目使用 pnpm 作为包管理器        |
| **开发工具** | [Visual Studio Code](https://code.visualstudio.com/Download) | 推荐安装 Vue、TypeScript 相关插件 |

- **快速开始**

```bash
# 克隆代码
git clone https://github.com/zuimengxinbie/tools.git

# 切换目录
cd tools

# 安装 pnpm
npm install pnpm -g

# 设置镜像源(可忽略)
pnpm config set registry https://registry.npmmirror.com

# 安装依赖
pnpm install

# 启动运行
pnpm run dev
```

## 项目部署

执行 `pnpm run build` 命令后，项目将被打包并生成 `dist` 目录。接下来，将 `dist` 目录下的文件上传到服务器 `/usr/share/nginx/html` 目录下，并配置 Nginx 进行反向代理。

```bash
pnpm run build
```

以下是 Nginx 的配置示例：

```nginx
server {
    listen      80;
    server_name localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    # 反向代理配置
    location /prod-api/ {
        # 请将 api.youlai.tech 替换为您的后端 API 地址，并注意保留后面的斜杠 /
        proxy_pass http://api.youlai.tech/;
    }
}
```

更多详细信息，请参考这篇文章：[Nginx 安装和配置](https://blog.csdn.net/u013737132/article/details/145667694)。

## 本地Mock



## 注意事项

- **自动导入插件自动生成默认关闭**

  模板项目的组件类型声明已自动生成。如果添加和使用新的组件，请按照图示方法开启自动生成。在自动生成完成后，记得将其设置为 `false`，避免重复执行引发冲突。

  ![](https://foruda.gitee.com/images/1687755823137387608/412ea803_716974.png)

- **项目启动浏览器访问空白**

  请升级浏览器尝试，低版本浏览器内核可能不支持某些新的 JavaScript 语法，比如可选链操作符 `?.`。

- **项目同步仓库更新升级**

  项目同步仓库更新升级之后，建议 `pnpm install` 安装更新依赖之后启动 。

- **项目组件、函数和引用爆红**

  重启 VSCode 尝试

- **其他问题**

  如果有其他问题或者建议，建议 [ISSUE](https://gitee.com/youlaiorg/vue3-element-admin/issues/new)

## 提交规范

执行 `pnpm run commit` 唤起 git commit 交互，根据提示完成信息的输入和选择。

![](https://foruda.gitee.com/images/1687755823165218215/c1705416_716974.png)

## Git 推送速查

本仓库已通过 `git config --local` 配置代理与 TLS（仅对当前仓库生效，不影响其他仓库）。失败时按下表排查。

| 场景 | 命令 / 操作 |
| --- | --- |
| 日常推送 | 在仓库目录下执行 `git push` |
| 推送失败先诊断 | `.\check-push.ps1`（仅检查不修改配置） |
| 端口检查失败 | 打开 / 重启 Clash 等代理软件 |
| 代理出口失败（HTTP=000） | Clash 换节点 / 刷新订阅 |
| 完全直连不通 | 改用 SSH：`git remote set-url origin git@github.com:zuimengxinbie/tools.git` |

> 当前仓库 `.git/config` 已写入：`http(s).proxy=http://127.0.0.1:7897`、`http.sslBackend=openssl`、`http.postBuffer=524288000`、`http.version=HTTP/1.1`。
> 全局 `--global` 已清空，对其他项目零影响。

