# Nine frames. One cut

九宫格分镜裁切器 · A local-first 3×3 storyboard cutter.

导入一张九宫格图片，一键拆分 9 张单帧，逐帧添加备注，再批量下载 ZIP。所有图片处理都在浏览器本地进行，无需账号、API 密钥或云端上传。

**在线使用 / Live:** https://mango-guo.github.io/Nine-frames.-One-cut/

## 功能 / Features

- PNG、JPG、WebP 导入：点击选择、拖放到页面任意位置，或直接 ⌘V / Ctrl+V 粘贴。
- 3×3 原始像素裁切，从左到右、从上到下编号；原图上实时显示裁切框与被裁掉的区域。
- 自动识别规则白色画框，去除框线与黑色间隔；识别不确定时使用等分裁切。
- 手动设置外边距、格间距。
- 单帧备注；放大预览支持 ← → 切换镜头并直接编辑备注。备注按原图指纹保存在本机浏览器。
- PNG/JPG 单张下载或 ZIP 批量下载（带进度），可选择在图片下方附加备注。
- ZIP 包含 9 张图片、文本备注和 JSON 镜头清单。
- ZH/EN 双语（首次访问按浏览器语言），浅色/深色主题（默认跟随系统），自动保存偏好。
- 手机端底部固定操作栏：导入 → 裁切 → 下载，一个按钮走完流程。
- 无第三方运行时依赖、无网络字体、无构建步骤。

## v3 更新 / What's new in v3

**稳定性 / Stability**
- 画框识别改为分条扫描（每条约 400 万像素），不再一次性创建整张大画布：内存占用可控，避开 iOS Safari 1670 万像素的画布上限，大图不再卡死页面；后台标签页中也能正常完成。
- 预览只保留 ≤1600 px 的缩略图，下载时再从原图按原始像素绘制；不再同时常驻 9 张全尺寸画布。
- 非 HTTPS 环境（如局域网 IP）缺少 Web Crypto 时，自动改用 FNV 指纹，导入不再失败。
- ZIP 使用查表 CRC32（大幅加快打包），写入真实修改时间。
- 备注写入防抖、离开页面时立即保存；只保留最近 40 张图片的备注，避免本地存储无限增长。
- 英文备注按单词换行，不再在单词中间断开；中文仍按字换行。
- 文件类型缺失时按扩展名判断；HEIC 给出明确提示；导入、裁切期间锁定相关控件，避免重复操作。
- 翻译改为基于 key 的方式，不再依赖文本匹配。

**设计 / Design**
- 新视觉方向“暗房印样”：浅色为暖纸色，深色为暗房黑，唯一强调色为安全灯红。
- 只用系统字体（衬线标题 + 等宽技术标签），国内访问不受 Google Fonts 影响。
- 步骤条随实际进度变化；印样式镜头卡片，入场有错落动画；支持 `prefers-reduced-motion`。
- 移动优先：375 px 起单列横向卡片，560 px 两列，1280 px 真正的 3×3 印样；桌面端左侧设置栏吸顶。
- 触控目标 ≥ 44 px，移动端输入框 16 px（避免 iOS 自动缩放）。

## 本地运行 / Run locally

需要 Python 3，或任意静态 HTTP 服务器。

```bash
git clone https://github.com/mango-guo/Nine-frames.-One-cut.git
cd Nine-frames.-One-cut
python3 -m http.server 4311 --bind 127.0.0.1
```

在浏览器打开 **http://127.0.0.1:4311/**。

1. 导入九宫格图片；或点击“试用示例”。
2. 保留默认自动识别；需要时调整外边距与格间距，进入手动模式。
3. 点击“裁切 9 帧”，填写每张图片下面的备注。
4. 选择导出格式和是否附加备注，点击“下载 ZIP”。

Open the local URL, import a storyboard, crop the nine frames, add notes, then download all frames as a ZIP. Images never leave your device.

## 文件 / Files

| File | Purpose |
| --- | --- |
| `index.html` | 页面与控件 / Page structure |
| `style.css` | 设计令牌、响应式布局和主题 / Tokens, layout and themes |
| `app.js` | 导入、裁切、备注、预览和 ZIP 导出 / Core application |
| `borders.js` | 分条扫描的规则白框识别 / Strip-based frame-border detection |
| `i18n.js` | 语言、主题与偏好 / Translations and preferences |

## 限制与数据保存 / Limits and storage

- 单文件最大 40 MB / 6000 万像素；大图内存占用取决于设备。
- 自动识别针对规则的 3×3 白色画框，不是任意不规则分镜识别。为排除 JPEG 边缘残留，框内额外避让 1 像素。
- 手动裁切不会自动删除图像内容中的黑色或白色区域。
- 原图不持久保存。刷新后重新导入同一文件，可恢复备注。更换浏览器或清除网站数据后无法恢复，请下载 ZIP 留档。
- PNG 保留透明度；JPG 使用白底。不保留原始 EXIF 等元数据。

## 验证 / Validation

v3 已在 Chrome（桌面 1440 px 与 375 px 移动视口）验证：示例图自动识别 9 帧并去除白框与间隔；ZIP 共 11 个文件，CRC 全部校验通过；附加中英文多行备注；单帧预览与左右切换；浅色/深色、中英文切换；错误文件类型、HEIC、损坏图片、过大边距的提示；Web Crypto 不可用时的指纹回退；1001×605 非整除尺寸等分完整覆盖；3450 万像素图片导入与识别约 0.2 秒；375 px 无横向溢出。Safari 与原生移动浏览器尚未单独验证。
