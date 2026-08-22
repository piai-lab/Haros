# OmniMind Web Access provider icons

This directory is the shipped, exact-pinned provider-mark owner for OmniMind
Web Access. The 26 runtime provider identities resolve to 25 physical files;
`parallel-mcp` deliberately reuses `parallel.svg` because it is a second
connection method for the same Parallel service.

The runtime provider descriptor is the only identity-to-asset mapping. Server,
Settings, Curator, and Timeline consume its credential-blind projection and do
not maintain another logo table. Every asset is served locally; the product does
not fetch favicons or icon CDNs at runtime. The UI renders these bytes without
theme inversion, recoloring, or filters and uses its own neutral backplate for
contrast.

The colored LobeHub variants and official-origin candidates were promoted
byte-for-byte from the repository research snapshot at commit
`563423d140e0fce6b1833f937f5c0a51ff313fa3`. LobeHub candidates correspond to
the locked `@lobehub/icons-static-svg@1.94.0`; DuckDuckGo exactly matches
`simple-icons@16.28.0`; the remaining candidates are fixed
official-site/app/favicon bytes recorded by that intake. Asset admission means
that the exact local bytes ship in OmniMind; it does not claim ownership,
endorsement, or sponsorship. Provider marks remain the property of their
respective owners and are used only to identify the service selected by the user.

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `anysearch.ico` | 17,014 | `30c4f28070675f7b860d74dae8b378cd197e9c1b88067d803c185070b7a95544` |
| `bocha.svg` | 1,173 | `bf96c5c287da443c310570db48a270121af57d559f849227aea27cc61b86f244` |
| `brave.svg` | 2,883 | `76ec345aefa225be34525da172d62c7a7ae80280bc062dc9776e24187b9d110c` |
| `bright-data.png` | 604 | `c9b3cb09c1cf5f0715fee4cbdfff0316f9cbce636832b3f01fe190ffb2019544` |
| `duckduckgo.svg` | 2,663 | `82648474f6ddd359747a4bdb843b326bca081d6c0fa15230d0fe3451d2316d63` |
| `exa.svg` | 402 | `8d8113b2d6796bc680cccba6578a1487e49407adf08bbe20fccd949b59a8371a` |
| `firecrawl.svg` | 897 | `98993b111d1cb75edd0b1ce3a1e8bd3f85dcf5548072ffb959ac97ffe69ade59` |
| `gemini.svg` | 2,836 | `8ab0a9bafec11f7e69bcb9fc4ffd8f1bc927d1ddcbbb6ff36dee5ae8b5a9d602` |
| `jina.svg` | 404 | `dbb78d6217774ddde8c57a6f5c94a3294c59e99c4a1e6ec786e409648b9bdb84` |
| `kagi.svg` | 900 | `8ce5fee709556d7b37f2194df569c3693578cd864502879e59472dbe2342f9b6` |
| `ollama.svg` | 3,290 | `3a268218fb2e6e81fa31df70f70b51331625047794db81db21d35359428fae7a` |
| `openai.svg` | 1,687 | `a595df6b423920c67a7f8f73c063e4bfb72d415948097b6cac063a2366bb5186` |
| `parallel.svg` | 3,084 | `3a2a862adaa498692933a73503720066a362fb9a14100f9cafec5754a6cd6db0` |
| `perplexity.svg` | 603 | `8353f3ab20822f1a933224b0ea32cc39f0c32d5740f4af8c254b0f418e0a3a70` |
| `querit.png` | 13,945 | `499e5eecc9f201cba297735c4d92e3af0f58e48df8b26b5b4365919ec6a37998` |
| `search1api.svg` | 1,039 | `4cbb94ff861a06d447808d8746f230d244733857d465feaa0a80022ed6339f6e` |
| `searchinfinity.png` | 697 | `5cf994fa84f105c25e93402c5bc538e9baf07bbd6948948b5dff5ce766f0dcf3` |
| `searxng.svg` | 510 | `4a2fec312abb559030f07fd53a3b8e6ffcd93d32ec0f8cf7ad12b79a3cead88f` |
| `serpbase.svg` | 575 | `b6fcc86374275b91eb68b445e6f621523dcfac235af16875ead24c2b3223a58a` |
| `serpdive.png` | 30,257 | `8ba2bc8f2b63c500ce236e36679fa60e3b17d37c045f9d55f1d323da3d185b70` |
| `serper.png` | 1,517 | `ddf56544724514caad2df06e97fcae8507e4fba2ddb94a3ec62345db6aec0a70` |
| `tavily.svg` | 1,092 | `2dec98b9ce5a9dd1edc52d4f8a4de7bbabe82f710dd224931f19c6bf5e3ccaff` |
| `tinyfish.png` | 7,463 | `8be481f16a3c84f43571caa753381fc74a81a898fbe4d310470b341662f05fd9` |
| `valyu.ico` | 15,406 | `edaad19e2231adf18eb9d94c114aac2221b23e0992de1c5a214d37da1fbe86e8` |
| `xai.svg` | 372 | `89eb7de9f0d02a41cfecd9109e253d7fd3529e27467dee4254faa67f3ac21451` |
