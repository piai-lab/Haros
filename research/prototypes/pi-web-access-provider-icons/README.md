# OmniMind Web Access Provider icon candidates

> 保存日期：2026-08-22
> 范围：`pi-web-access@0.24.1`的26个resolved Provider identity
> 性质：研究/视觉原型候选资产，不是production asset registry，也不授权随App分发

本目录把此前只嵌在临时HTML中的Provider图标拆成可复核的本地文件，避免下一会话重新搜索。26个Provider identity映射到25份物理文件；`parallel-mcp`有意复用`parallel.svg`，因为它是同一Parallel品牌的另一连接方式，不应制造第二份品牌资产。

这些文件不得被Web或fork直接批量导入。production admission仍需逐项闭合exact source URL/revision、文件hash、license与trademark disposition，再把获准资产复制进`@harnessos/om-web-access`的shipped asset owner。未闭合项使用中性provider fallback；能力级`Web search`继续使用OmniMind现有`globe`。

## 来源分组

- `@lobehub/icons-static-svg`候选：SearXNG、OpenAI、Exa、Brave、Search1API、Tavily、Firecrawl、Jina、Kagi、Bocha、Ollama、Perplexity、Gemini、xAI。当前OmniMind Web锁定`@lobehub/icons-static-svg@1.94.0`；实施时必须把候选字节重新匹配到该exact artifact并复核上游品牌边界，不能把本目录当依赖替代品。
- Simple Icons候选：DuckDuckGo。实施时固定exact package/version、license和品牌规则。
- 官方站点/app/favicon候选：Parallel、TinyFish、Searchinfinity、Querit、SERPdive、AnySearch、Bright Data、SerpBase、Serper、Valyu。当前只保存已接受视觉的字节和hash；除已单独记录的Bright Data限制外，exact asset URL与再分发权仍待production intake重新固定。
- Bright Data官方guideline要求logo使用取得书面同意；`bright-data.png`只供内部原型比较，未获可审计许可前不得进入shipped bytes。

两个identity细节必须在production intake中显式复核，不能靠“看起来像”带过：`xai.svg`候选文件内部title为`Grok`，需确认xAI Provider应使用公司mark还是Grok产品mark；`searchinfinity.png`来自Searchinfinity/BytePlus关联页面，需确认最终普通用户display name与mark归属一致。复核只影响presentation，不改变上游runtime Provider ID。

## 固定字节清单

| Provider ID | Candidate file | Bytes | SHA-256 | 备注 |
| --- | --- | ---: | --- | --- |
| `anysearch` | `anysearch.ico` | 17,014 | `30c4f28070675f7b860d74dae8b378cd197e9c1b88067d803c185070b7a95544` | official-origin candidate |
| `bocha` | `bocha.svg` | 1,173 | `bf96c5c287da443c310570db48a270121af57d559f849227aea27cc61b86f244` | Lobe candidate |
| `brave` | `brave.svg` | 2,883 | `76ec345aefa225be34525da172d62c7a7ae80280bc062dc9776e24187b9d110c` | Lobe candidate |
| `bright-data` | `bright-data.png` | 604 | `c9b3cb09c1cf5f0715fee4cbdfff0316f9cbce636832b3f01fe190ffb2019544` | research-only；书面同意前不分发 |
| `duckduckgo` | `duckduckgo.svg` | 2,663 | `82648474f6ddd359747a4bdb843b326bca081d6c0fa15230d0fe3451d2316d63` | Simple Icons candidate |
| `exa` | `exa.svg` | 402 | `8d8113b2d6796bc680cccba6578a1487e49407adf08bbe20fccd949b59a8371a` | Lobe candidate |
| `firecrawl` | `firecrawl.svg` | 897 | `98993b111d1cb75edd0b1ce3a1e8bd3f85dcf5548072ffb959ac97ffe69ade59` | Lobe candidate |
| `gemini` | `gemini.svg` | 2,836 | `8ab0a9bafec11f7e69bcb9fc4ffd8f1bc927d1ddcbbb6ff36dee5ae8b5a9d602` | Lobe candidate |
| `jina` | `jina.svg` | 404 | `dbb78d6217774ddde8c57a6f5c94a3294c59e99c4a1e6ec786e409648b9bdb84` | Lobe candidate |
| `kagi` | `kagi.svg` | 900 | `8ce5fee709556d7b37f2194df569c3693578cd864502879e59472dbe2342f9b6` | Lobe candidate |
| `ollama` | `ollama.svg` | 3,290 | `3a268218fb2e6e81fa31df70f70b51331625047794db81db21d35359428fae7a` | Lobe candidate |
| `openai` | `openai.svg` | 1,687 | `a595df6b423920c67a7f8f73c063e4bfb72d415948097b6cac063a2366bb5186` | Lobe candidate |
| `parallel` | `parallel.svg` | 3,084 | `3a2a862adaa498692933a73503720066a362fb9a14100f9cafec5754a6cd6db0` | official-origin candidate |
| `parallel-mcp` | `parallel.svg` | 3,084 | `3a2a862adaa498692933a73503720066a362fb9a14100f9cafec5754a6cd6db0` | alias of `parallel`，不重复字节 |
| `perplexity` | `perplexity.svg` | 603 | `8353f3ab20822f1a933224b0ea32cc39f0c32d5740f4af8c254b0f418e0a3a70` | Lobe candidate |
| `querit` | `querit.png` | 13,945 | `499e5eecc9f201cba297735c4d92e3af0f58e48df8b26b5b4365919ec6a37998` | official-origin candidate |
| `search1api` | `search1api.svg` | 1,039 | `4cbb94ff861a06d447808d8746f230d244733857d465feaa0a80022ed6339f6e` | Lobe candidate |
| `searchinfinity` | `searchinfinity.png` | 697 | `5cf994fa84f105c25e93402c5bc538e9baf07bbd6948948b5dff5ce766f0dcf3` | official-origin candidate |
| `searxng` | `searxng.svg` | 510 | `4a2fec312abb559030f07fd53a3b8e6ffcd93d32ec0f8cf7ad12b79a3cead88f` | Lobe candidate |
| `serpbase` | `serpbase.svg` | 575 | `b6fcc86374275b91eb68b445e6f621523dcfac235af16875ead24c2b3223a58a` | official-origin candidate |
| `serpdive` | `serpdive.png` | 30,257 | `8ba2bc8f2b63c500ce236e36679fa60e3b17d37c045f9d55f1d323da3d185b70` | official-origin candidate |
| `serper` | `serper.png` | 1,517 | `ddf56544724514caad2df06e97fcae8507e4fba2ddb94a3ec62345db6aec0a70` | official-origin candidate |
| `tavily` | `tavily.svg` | 1,092 | `2dec98b9ce5a9dd1edc52d4f8a4de7bbabe82f710dd224931f19c6bf5e3ccaff` | Lobe candidate |
| `tinyfish` | `tinyfish.png` | 7,463 | `8be481f16a3c84f43571caa753381fc74a81a898fbe4d310470b341662f05fd9` | official-origin candidate |
| `valyu` | `valyu.ico` | 15,406 | `edaad19e2231adf18eb9d94c114aac2221b23e0992de1c5a214d37da1fbe86e8` | official-origin candidate |
| `xai` | `xai.svg` | 372 | `89eb7de9f0d02a41cfecd9109e253d7fd3529e27467dee4254faa67f3ac21451` | Lobe candidate |

## 已做的机械检查

- 26个Provider ID全部有映射，25份物理文件；唯一复用是`parallel-mcp → parallel.svg`。
- SVG候选不包含`script`、外部`image`、`javascript:`或远程asset引用；`xmlns`声明不是运行时网络依赖。
- raster/ICO均可由本机`file`识别，目录总量约172 KiB。
- 本检查只证明当前字节可解析与自包含，不证明视觉、无障碍、商标许可或production rendering已经验收。
