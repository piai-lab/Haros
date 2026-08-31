local mode = "website"
local scope = "all"

local function chapter_in_scope(base)
  -- README owns Preface as the first reading-order document. It must remain in
  -- every edition before numeric chapter filtering sees its 00- filename.
  if base == "README" or base == "00-preface" then
    return true
  end
  if base:match("^appendix%-[a-h]%-") then
    return scope == "all" or scope == "run5"
  end
  local chapter = base:match("^(%d+)-")
  if not chapter or scope == "all" then
    return true
  end
  if scope == "pilot" then
    local number = tonumber(chapter)
    return number ~= nil and ((number >= 1 and number <= 15) or number == 37)
  end
  if scope == "run2" then
    local number = tonumber(chapter)
    return number ~= nil and number >= 1 and number <= 15
  end
  if scope == "run3" then
    local number = tonumber(chapter)
    return number ~= nil and number >= 1 and number <= 34
  end
  if scope == "run4" then
    local number = tonumber(chapter)
    return number ~= nil and number >= 1 and number <= 46
  end
  if scope == "run5" then
    local number = tonumber(chapter)
    return number ~= nil and number >= 1 and number <= 50
  end
  return true
end

local function basename_without_md(path)
  local name = path:match("([^/]+)%.md$")
  return name or path
end

local function rewrite_link(link)
  local path, fragment = link.target:match("^([^#]+)(#.*)$")
  if not path then
    path = link.target
    fragment = ""
  end
  if not path:match("%.md$") then
    return link
  end

  local base = basename_without_md(path)
  if not chapter_in_scope(base) then
    return link.content
  end
  if mode == "website" then
    if base == "README" then
      base = "index"
    end
    link.target = base .. ".html" .. fragment
    return link
  end

  if fragment ~= "" then
    link.target = fragment
  elseif base == "README" then
    link.target = "#haros-guidebook"
  elseif base == "00-preface" then
    link.target = "#preface"
  else
    local chapter = base:match("^(%d+)-")
    local appendix = base:match("^appendix%-([a-h])%-")
    link.target = chapter and ("#chapter-" .. chapter)
      or appendix and ("#appendix-" .. appendix)
      or "#haros-guidebook"
  end
  return link
end

-- Pandoc applies inline filters before metadata handlers when both live in one
-- filter table. Two explicit passes make link-mode available before any Link
-- is rewritten.
return {
  {
    Meta = function(meta)
      if meta["link-mode"] then
        mode = pandoc.utils.stringify(meta["link-mode"])
      end
      if meta["edition-scope"] then
        scope = pandoc.utils.stringify(meta["edition-scope"])
      end
      return meta
    end,
  },
  { Link = rewrite_link },
}
