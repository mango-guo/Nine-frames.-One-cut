# Nine frames. One cut

九宫格分镜裁切器 · A local-first 3×3 storyboard cutter.

导入一张九宫格图片，一键拆分 9 张单帧，逐帧添加备注，再批量下载 ZIP。所有图片处理都在浏览器本地进行，无需账号、API 密钥或云端上传。

## 功能 / Features

- PNG、JPG、WebP 图片导入，点击选择或拖放。
- 3×3 原始像素裁切，从左到右、从上到下编号。
- 自动识别规则白色画框，去除框线与黑色间隔；识别不确定时使用等分裁切。
- 手动设置外边距、格间距。
- 单帧备注和放大预览；备注按原图指纹保存在本机浏览器。
- PNG/JPG 单张下载或 ZIP 批量下载，可选择在图片下方附加备注。
- ZIP 包含 9 张图片、文本备注和 JSON 镜头清单。
- ZH/EN 双语、Light/Dark 主题，自动保存偏好。
- 无第三方运行时依赖，无构建步骤。

## 本地运行 / Run locally

需要 Python 3，或任意静态 HTTP 服务器。

```bash
git clone https://github.com/mango-guo/Nine-frames.-One-cut.git
cd Nine-frames.-One-cut
python3 -m http.server 4311 --bind 127.0.0.1
```

在浏览器打开 **http://127.0.0.1:4311/**。请通过 localhost 或 HTTPS 使用，以支持图片指纹所需的 Web Crypto API。

1. 导入九宫格图片；或点击“试用示例”。
2. 保留默认自动识别；需要时调整外边距与格间距，进入手动模式。
3. 点击“一键裁切 9 帧”，填写每张图片下面的备注。
4. 选择导出格式和是否附加备注，点击“批量下载 ZIP”。

Open the local URL, import a storyboard, crop the nine frames, add notes, then download all frames as a ZIP. The EN button switches the entire interface to English. Images never leave your device.

## 文件 / Files

| File | Purpose |
| --- | --- |
| `index.html` | 页面与控件 / Page structure |
| `style.css` | 响应式布局和主题 / Layout and themes |
| `app.js` | 图片导入、裁切、备注和 ZIP 导出 / Core application |
| `borders.js` | 保守的规则白框识别 / Frame-border detection |
| `i18n.js` | 语言与偏好 / Translations and preferences |

## 限制与数据保存 / Limits and storage

- 单文件最大 40 MB / 6000 万像素；大图内存占用取决于设备。
- 自动识别针对规则的 3×3 白色画框，不是任意不规则分镜识别。为排除 JPEG 边缘残留，框内额外避让 1 像素。
- 手动裁切不会自动删除图像内容中的黑色或白色区域。
- 原图不持久保存。刷新后重新导入同一文件并裁切，可恢复备注。更换浏览器或清除网站数据后可能无法恢复，请下载 ZIP 留档。
- PNG 保留透明度；JPG 使用白底。不保留原始 EXIF 等元数据。
- 备注附图会有意增加白色文字区；不需要时取消勾选。

Notes are stored only in this browser, keyed by the original file hash. Reimport the same file after refreshing to restore them. Export a ZIP for a durable copy. The original image is not stored persistently.

## 验证 / Validation

已在 Chrome 验证导入、九帧裁切、PNG/JPG 下载、ZIP 解压、中文多行备注、备注恢复、边距设置、双语/主题切换与偏好恢复。已检查 375px 布局无横向溢出。

对 2752×1536 的带框参考图验证了 9 张导出图片：去除白框及黑色间隔后保持原始画面像素，无缩放或额外填边。另测试了 1001×605 非整除尺寸的等分覆盖。Safari 及原生移动浏览器未单独验证。
