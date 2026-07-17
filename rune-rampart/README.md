# 符文壁垒（Rune Rampart）

一个无框架、无构建步骤的三消 × 塔防浏览器小游戏。

## 开始游戏

直接双击 `index.html`，或在本目录启动静态服务器：

```bash
python3 -m http.server 4173
```

然后访问 <http://localhost:4173>。

## 玩法

- 红曜石：永久提升弩炮战力。
- 蓝晶：积攒奥能；达到 18 后可点击“奥术齐射”或按 `Q`。
- 绿晶：立即修复城墙。
- 铸币：推进锻造进度，完成后自动升级并装备军械。
- 四连、五连和连续坠落会放大本次收益。
- 弩炮自动索敌；敌人抵达城下会扣除城墙耐久。
- 顶部音符按钮可随时关闭或开启音效。
- 每名敌人都有姓名、攻击、防御和生命属性；战场左上角显示当前最近的威胁。
- 敌人防御会实际降低弩炮和奥术齐射伤害，装备升级会触发卡片高光、粒子、横幅和钟鸣。

## 音效资源

游戏使用少量本地音效，并通过 Web Audio 叠加连锁升调与战场反馈。所有外部音效来自 Kenney，采用 Creative Commons CC0 许可：

- [Kenney UI Audio](https://kenney.nl/assets/ui-audio)
- [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds)

原始许可文本保存在 `assets/audio/ui/License.txt` 与 `assets/audio/impact/License.txt`。

## 文件

- `index.html`：页面结构与游戏界面。
- `styles.css`：响应式布局、战场插画和动画。
- `game.js`：三消、资源、装备、波次和战斗逻辑。
- `tests/browser_smoke.js`：Playwright 浏览器冒烟测试。
