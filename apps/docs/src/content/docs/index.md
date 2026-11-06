---
title: agentic-ui-kit
description: 'React components for agent chat UIs: streaming messages, tool calls, inline visuals.'
template: splash
# The page uses its own hero (src/components/Hero.astro). Starlight shows it only when `hero` is set.
hero:
  title: Chat UIs for agents
---

React components for LLM chat and agentic apps: streaming replies with Markdown, math and code; thinking and
tool-call rows; approvals; tools that change the page around the chat. Themed entirely with CSS variables, so it
can take on your app's look.

The defaults are styled after claude.ai. The examples show how to build
[claude.ai's web chat](/examples/claude-ai/) and, with the same components arranged and themed differently,
[chatgpt.com's](/examples/chatgpt-com/).

:::caution[This is AI-written slop. You probably shouldn't use it.]
It isn't reviewed or hardened, the API will change without notice, and it may stop being maintained at
any time. If you still want to try it, pin an exact version, or fork it and treat the code as your own.
:::

![A full chat app built from the kit](/images/app.png)
